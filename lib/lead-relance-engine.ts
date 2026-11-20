import { cache } from "react"
import { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { calculateMarketplaceFinancials, calculateLeadCreditCost } from "@/lib/marketplace-pricing"
import { renderInstallerLeadTeaserEmail, buildLeadEmailSubject } from "@/lib/email-templates/installer-lead-teaser"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import {
  doesSurfaceMatchPreference,
  getEffectivePartnerSegment,
  getPartnerNotificationMode,
  OPTOUT_ALL_MARKER,
  OPTOUT_RELANCES_MARKER,
} from "@/lib/partner-notification-prefs"
import { buildPartnerNotificationUrls } from "@/lib/partner-notification-tokens"
import { B2C_EXCLUSIVE_CREDIT_COST, calculateOrderFinancials } from "@/lib/credit-pricing"
import { createRecurringLeadPayment, getMollieClient, getValidMollieMandate } from "@/lib/mollie"
import { fulfillPaidLeadDirectPurchase } from "@/lib/mollie-fulfillment"
import { sendLeadAssignedEmail } from "@/lib/notify-installateur"
import { sendAdminLeadSaleNotification, type LeadSaleBuyerSummary } from "@/lib/admin-sales-emails"
import { sendProspectExclusiveMatchEmail } from "@/lib/prospect-exclusive-match-email"
import { sendProspectReconfirmEmail } from "@/lib/prospect-reconfirm-email"
import { sendProspectReferralEmail } from "@/lib/prospect-referral-email"
import { getLeadImages, getPrimaryLeadImageItem } from "@/lib/lead-images"
import b2cOptoutEmails from "@/lib/data/b2c-optout-emails.json"

// ==============================================================================
// 1. CONFIGURATION & CONSTANTES MÉTIER
// ==============================================================================

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

/** Quotas de vente stricts */
export const MAX_SLOTS_B2C = 3 // Partagé 3 installateurs max
export const MAX_SLOTS_B2B = 1 // Exclusivité 100%

/** Cooldowns en heures ouvrées réelles (Europe/Brussels) */
export const COOLDOWN_WAVE_1_TO_2_MS = 6 * 60 * 60 * 1000 // 6 heures ouvrées après Vague 1
export const COOLDOWN_WAVE_2_TO_3_MS = 24 * 60 * 60 * 1000 // 24 heures ouvrées après Vague 2 (~J+2 / J+3)
export const RECONFIRM_PROTOCOL_AGE_MS = 72 * 60 * 60 * 1000 // Reconfirmation prospect 1-clic à H+72h après publication si 0 achat
export const STALE_PARTIAL_CLOSE_AGE_MS = 168 * 60 * 60 * 1000 // 7 jours avant clôture d'un B2C partiel (1/3 ou 2/3)
export const STALE_PARTIAL_LAST_BUY_GRACE_MS = 48 * 60 * 60 * 1000 // Délai de grâce 48 h après le dernier achat réel
export const REFERRAL_WON_STABILIZATION_MS = 24 * 60 * 60 * 1000 // Délai anti-misclick 24 h après passage en 'won'
const REFERRAL_WON_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000

const REFERRAL_OPTOUT_EMAIL_SET = new Set(
  (Array.isArray(b2cOptoutEmails) ? b2cOptoutEmails : [])
    .map((e) => (typeof e === "string" ? e.toLowerCase().trim() : ""))
    .filter(Boolean)
)

export interface PartialCloseCheckInput {
  segment?: string | null
  createdAtMs: number
  publishedAtMs?: number | null
  reconfirmedAtMs?: number | null
  takenSlots: number
  maxSlots: number
  lastPurchaseAtMs?: number | null
  nowMs?: number
}

/**
 * Retourne le timestamp (ms) effectif de mise en ligne d'un lead sur la marketplace :
 * priorité à `republished_at`, puis `published_at`, avec repli sur `created_at`.
 */
export function getLeadPublishedAtMs(lead: {
  created_at?: string | null
  qualification_metadata?: unknown
}): number {
  const meta =
    lead.qualification_metadata && typeof lead.qualification_metadata === "object"
      ? (lead.qualification_metadata as Record<string, unknown>)
      : null

  const candidates = [meta?.republished_at, meta?.published_at, lead.created_at]
  for (const raw of candidates) {
    if (typeof raw === "string" && raw.trim()) {
      const ts = new Date(raw).getTime()
      if (Number.isFinite(ts)) return ts
    }
  }
  return Date.now()
}

/**
 * Détermine si un dossier B2C partiellement vendu (1/3 ou 2/3) doit être clôturé proprement.
 * Exige >= 7 jours d'ancienneté (depuis publication ou reconfirmation) ET >= 48 h de calme depuis le dernier achat.
 */
export function shouldAutoClosePartialLead(input: PartialCloseCheckInput): boolean {
  if ((input.segment || "").toUpperCase() !== "B2C") return false
  if (input.takenSlots < 1 || input.takenSlots >= input.maxSlots) return false

  const now = input.nowMs ?? Date.now()
  const effectiveStartMs =
    typeof input.publishedAtMs === "number" && Number.isFinite(input.publishedAtMs)
      ? input.publishedAtMs
      : input.createdAtMs
  const referenceStartMs = Math.max(effectiveStartMs, input.reconfirmedAtMs ?? 0)
  if (!Number.isFinite(referenceStartMs) || now - referenceStartMs < STALE_PARTIAL_CLOSE_AGE_MS) {
    return false
  }

  if (input.lastPurchaseAtMs && now - input.lastPurchaseAtMs < STALE_PARTIAL_LAST_BUY_GRACE_MS) {
    return false
  }

  return true
}

/** Limites anti-spam par installateur */
export const MAX_NOTIFICATIONS_PER_LEAD_PER_PARTNER = 2 // Max 2 relances pour un même dossier
export const MAX_DAILY_NOTIFICATIONS_PER_PARTNER = 4 // Max 4 notifications lead par jour au total

/** Tailles cibles élargies des vagues de dispatch */
export const WAVE_TARGET_COUNTS = {
  B2C: {
    wave1: 12, // Installateurs locaux chauds Tier 1
    wave2: 18, // Élargissement limitrophe Tier 2
    wave3: 25, // Élargissement régional global Tier 3
  },
  B2B: {
    wave1: 6, // Spécialistes tertiaires Tier 1
    wave2: 10, // Élargissement PME/Tertiaire Tier 2
    wave3: 15, // Réseau d'ingénierie élargi
  },
} as const

/**
 * Matrice de contiguïté des provinces belges (pour élargissement intelligent Vague 2)
 */
export const PROVINCE_NEIGHBORS: Record<string, string[]> = {
  liege: ["liege", "namur", "luxembourg", "brabant_wallon", "flandre_limbourg"],
  namur: ["namur", "liege", "hainaut", "brabant_wallon", "luxembourg"],
  hainaut: ["hainaut", "namur", "brabant_wallon", "bruxelles", "flandre_occidentale"],
  brabant_wallon: ["brabant_wallon", "bruxelles", "namur", "hainaut", "liege", "flandre_brabant_flamand"],
  luxembourg: ["luxembourg", "namur", "liege"],
  bruxelles: ["bruxelles", "brabant_wallon", "hainaut", "flandre_brabant_flamand"],
  flandre_anvers: ["flandre_anvers", "flandre_limbourg", "flandre_orientale", "flandre_brabant_flamand", "bruxelles"],
  flandre_limbourg: ["flandre_limbourg", "liege", "flandre_anvers", "flandre_brabant_flamand"],
  flandre_occidentale: ["flandre_occidentale", "flandre_orientale", "hainaut"],
  flandre_orientale: ["flandre_orientale", "flandre_occidentale", "flandre_anvers", "flandre_brabant_flamand", "hainaut"],
  flandre_brabant_flamand: ["flandre_brabant_flamand", "bruxelles", "brabant_wallon", "flandre_anvers", "flandre_orientale", "flandre_limbourg"],
}

export type MatchingTier = "tier_1" | "tier_2" | "tier_3"

export interface PartnerMatchingScore {
  partnerId: string
  score: number
  tier: MatchingTier
  isExactProvince: boolean
  isNeighborProvince: boolean
  hasEnoughCredits: boolean
  segmentMatch: boolean
  behavioralBoost?: number
  hasInspectedLead?: boolean
  inspectedDurationMs?: number
  zoomedRoof?: boolean
  unlockIntent?: boolean
}

// ==============================================================================
// 2. CONTRÔLE DES HEURES OUVRÉES (BUSINESS HOURS — EUROPE/BRUSSELS)
// ==============================================================================

const BRUSSELS_PARTS_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Brussels",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

function getBrusselsParts(ms: number): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  dayOfWeek: number
} {
  const parts = BRUSSELS_PARTS_FORMATTER.formatToParts(new Date(ms))
  let year = 1970
  let month = 1
  let day = 1
  let hour = 0
  let minute = 0
  let second = 0

  for (const part of parts) {
    const val = Number(part.value)
    if (part.type === "year") year = val
    else if (part.type === "month") month = val
    else if (part.type === "day") day = val
    else if (part.type === "hour") hour = val % 24
    else if (part.type === "minute") minute = val
    else if (part.type === "second") second = val
  }

  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return { year, month, day, hour, minute, second, dayOfWeek }
}

function brusselsLocalToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0
): number {
  const targetUtcLike = Date.UTC(year, month - 1, day, hour, minute, second)
  const p1 = getBrusselsParts(targetUtcLike)
  const offset1 =
    Date.UTC(p1.year, p1.month - 1, p1.day, p1.hour, p1.minute, p1.second) - targetUtcLike
  const c1 = targetUtcLike - offset1
  const p2 = getBrusselsParts(c1)
  const offset2 =
    Date.UTC(p2.year, p2.month - 1, p2.day, p2.hour, p2.minute, p2.second) - c1
  return targetUtcLike - offset2
}

function getBrusselsBusinessWindowForDate(
  year: number,
  month: number,
  day: number
): { startMs: number; endMs: number } | null {
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  if (dayOfWeek === 0) return null // Dimanche fermé

  if (dayOfWeek === 6) {
    // Samedi : 09:00 - 13:00
    return {
      startMs: brusselsLocalToUtcMs(year, month, day, 9, 0, 0),
      endMs: brusselsLocalToUtcMs(year, month, day, 13, 0, 0),
    }
  }

  // Lundi au vendredi : 08:00 - 19:30
  return {
    startMs: brusselsLocalToUtcMs(year, month, day, 8, 0, 0),
    endMs: brusselsLocalToUtcMs(year, month, day, 19, 30, 0),
  }
}

export function getStartOfBrusselsDayIso(nowMs = Date.now()): string {
  const p = getBrusselsParts(nowMs)
  return new Date(brusselsLocalToUtcMs(p.year, p.month, p.day, 0, 0, 0)).toISOString()
}

/**
 * Vérifie si le moment actuel est approprié pour un envoi de relance automatique (Europe/Brussels).
 * Lun–Ven : 08:00–19:30 · Sam : 09:00–13:00 · Dim : fermé.
 */
export function isWithinBusinessHours(date = new Date()): boolean {
  const ms = date.getTime()
  if (!Number.isFinite(ms)) return false
  const p = getBrusselsParts(ms)
  const win = getBrusselsBusinessWindowForDate(p.year, p.month, p.day)
  return win !== null && ms >= win.startMs && ms < win.endMs
}

/**
 * Calcule le nombre exact de millisecondes ouvrées (Europe/Brussels) écoulées entre startMs et endMs.
 */
export function getBusinessMsBetween(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0
  }

  const startParts = getBrusselsParts(startMs)
  const endParts = getBrusselsParts(endMs)
  let dayCursor = Date.UTC(startParts.year, startParts.month - 1, startParts.day)
  const endDayUtc = Date.UTC(endParts.year, endParts.month - 1, endParts.day)

  let totalMs = 0
  let guard = 0
  while (dayCursor <= endDayUtc && guard < 3650) {
    const dt = new Date(dayCursor)
    const win = getBrusselsBusinessWindowForDate(
      dt.getUTCFullYear(),
      dt.getUTCMonth() + 1,
      dt.getUTCDate()
    )
    if (win) {
      const overlapStart = Math.max(startMs, win.startMs)
      const overlapEnd = Math.min(endMs, win.endMs)
      if (overlapEnd > overlapStart) {
        totalMs += overlapEnd - overlapStart
      }
    }
    dayCursor += 86_400_000
    guard++
  }

  return totalMs
}

/**
 * Ajoute `durationMs` ouvrées (Europe/Brussels) à partir de `startMs`.
 * Si `durationMs <= 0`, retourne `startMs` s'il est dans une plage ouvrée ou l'ouverture suivante.
 */
export function addBusinessMs(startMs: number, durationMs: number): number {
  let cursor = Number.isFinite(startMs) ? startMs : Date.now()
  let remaining = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0

  const startParts = getBrusselsParts(cursor)
  let dayCursor = Date.UTC(startParts.year, startParts.month - 1, startParts.day)

  for (let guard = 0; guard < 3650; guard++) {
    const dt = new Date(dayCursor)
    const win = getBrusselsBusinessWindowForDate(
      dt.getUTCFullYear(),
      dt.getUTCMonth() + 1,
      dt.getUTCDate()
    )

    if (win && cursor < win.endMs) {
      const effectiveStart = Math.max(cursor, win.startMs)
      const available = win.endMs - effectiveStart
      if (remaining < available) {
        return effectiveStart + remaining
      }
      remaining -= available
      cursor = win.endMs
    }

    dayCursor += 86_400_000
  }

  return cursor + remaining
}

// ==============================================================================
// 3. ALGORITHME DE SCORING ET MATCHING INSTALLATEURS
// ==============================================================================

/**
 * Normalise les clés de provinces pour comparaison insensible à la casse
 */
function normalizeProvinceKey(val: string | null | undefined): string {
  if (!val) return "wallonie"
  const s = val.toLowerCase().trim().replace(/[\s-]/g, "_")
  if (s.includes("liege") || s.includes("liège")) return "liege"
  if (s.includes("namur")) return "namur"
  if (s.includes("hainaut")) return "hainaut"
  if (s.includes("luxembourg")) return "luxembourg"
  if (s.includes("brabant") && s.includes("wallon")) return "brabant_wallon"
  if (s.includes("bruxelles")) return "bruxelles"
  return s
}

/**
 * Calcule la note de pertinence d'un installateur pour un lead donné (0 à 100 points)
 */
export function calculatePartnerMatchScore(
  partner: {
    id: string
    email?: string | null
    credits: number
    segment: string | null
    target_provinces?: string[] | null
    target_surfaces?: string[] | null
    min_facture?: number | null
  },
  lead: {
    segment: string
    province: string
    surface_type: string
    annual_electricity_bill: number
    credit_cost: number
  }
): PartnerMatchingScore {
  let score = 0
  const leadSegment = (lead.segment || "B2B").toUpperCase()
  const partnerSegment = getEffectivePartnerSegment(partner)

  // 1. FILTRE ÉLIMINATOIRE : Segment
  const segmentMatch =
    partnerSegment === "BOTH" ||
    partnerSegment === leadSegment

  if (!segmentMatch) {
    return {
      partnerId: partner.id,
      score: 0,
      tier: "tier_3",
      isExactProvince: false,
      isNeighborProvince: false,
      hasEnoughCredits: false,
      segmentMatch: false,
    }
  }
  score += 20 // Base d'adéquation de segment

  // 2. CRITÈRE GÉOGRAPHIQUE (40 points max)
  const leadProv = normalizeProvinceKey(lead.province)
  const partnerProvs = (partner.target_provinces || []).map(normalizeProvinceKey)

  const isNational =
    partnerProvs.length === 0 ||
    partnerProvs.some((p) => p.includes("toute") || p.includes("belgique") || p.includes("all"))

  const isExactProvince = partnerProvs.includes(leadProv) || isNational
  const neighbors = PROVINCE_NEIGHBORS[leadProv] || []
  const isNeighborProvince = partnerProvs.some((p) => neighbors.includes(p))

  if (isExactProvince) {
    score += 40
  } else if (isNeighborProvince) {
    score += 22
  } else {
    score += 5 // Couverture éloignée
  }

  // 3. DISPONIBILITÉ FINANCIÈRE & CRÉDITS (25 points max)
  const hasEnoughCredits = (partner.credits || 0) >= lead.credit_cost
  if (hasEnoughCredits) {
    score += 25 // Peut débloquer instantanément en 1 clic
  } else if ((partner.credits || 0) > 0) {
    score += 12
  } else {
    score += 5
  }

  // 4. SPÉCIFICATIONS TECHNIQUES & SURFACE (15 points max)
  const partnerSurfaces = (partner.target_surfaces || []).filter(
    (s) => s !== OPTOUT_ALL_MARKER && s !== OPTOUT_RELANCES_MARKER
  )
  if (
    partnerSurfaces.length === 0 ||
    doesSurfaceMatchPreference(lead.surface_type, partnerSurfaces)
  ) {
    score += 15
  } else {
    score += 5
  }

  // Classification en Tiers
  let tier: MatchingTier = "tier_3"
  if (score >= 70) {
    tier = "tier_1"
  } else if (score >= 45) {
    tier = "tier_2"
  }

  return {
    partnerId: partner.id,
    score,
    tier,
    isExactProvince,
    isNeighborProvince,
    hasEnoughCredits,
    segmentMatch,
  }
}

// ==============================================================================
// 4. SÉLECTION ET FILTRAGE DES DESTINATAIRES PAR VAGUE
// ==============================================================================

export interface EligiblePartnerForDispatch {
  partner: any
  scoreInfo: PartnerMatchingScore
  isTest?: boolean
}

export interface PartnerVelocityStats {
  recentPurchases30d: number
  recentPurchases7d: number
  dispatches30d: number
  clicks30d: number
}

export interface PreloadedRelanceWaveData {
  allPartners?: any[]
  purchasesByLeadId?: Map<string, any[]>
  dispatchesByLeadId?: Map<string, { partner_id: string; wave_number: number }[]>
  dailyDispatchCountsByPartnerId?: Map<string, number>
  telemetryByLeadId?: Map<string, any[]>
  velocityByPartnerId?: Map<string, PartnerVelocityStats>
}

export async function loadPartnerVelocityMap(
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<Map<string, PartnerVelocityStats>> {
  const velocityMap = new Map<string, PartnerVelocityStats>()
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since7dMs = Date.now() - 7 * 24 * 60 * 60 * 1000

  const ensure = (partnerId: string): PartnerVelocityStats => {
    let row = velocityMap.get(partnerId)
    if (!row) {
      row = {
        recentPurchases30d: 0,
        recentPurchases7d: 0,
        dispatches30d: 0,
        clicks30d: 0,
      }
      velocityMap.set(partnerId, row)
    }
    return row
  }

  try {
    const [purchasesRes, dispatchesRes, eventsRes] = await Promise.all([
      supabase
        .from("lead_purchases")
        .select("partner_id, purchased_at")
        .gte("purchased_at", since30d),
      supabase
        .from("lead_relance_dispatches")
        .select("partner_id")
        .gte("sent_at", since30d),
      Promise.resolve(
        supabase
          .from("partner_activity_events")
          .select("partner_id")
          .gte("created_at", since30d)
      ).catch(() => ({ data: [] as any[], error: null })),
    ])

    for (const row of purchasesRes.data || []) {
      if (!row.partner_id) continue
      const stats = ensure(String(row.partner_id))
      stats.recentPurchases30d++
      if (row.purchased_at && new Date(row.purchased_at).getTime() >= since7dMs) {
        stats.recentPurchases7d++
      }
    }

    for (const row of dispatchesRes.data || []) {
      if (!row.partner_id) continue
      ensure(String(row.partner_id)).dispatches30d++
    }

    for (const row of (eventsRes as any)?.data || []) {
      if (!row.partner_id) continue
      ensure(String(row.partner_id)).clicks30d++
    }
  } catch {
    // Non bloquant
  }

  return velocityMap
}

/**
 * Sélectionne la liste ordonnée des installateurs éligibles pour une vague donnée
 */
export async function getEligiblePartnersForWave(
  supabase: ReturnType<typeof createServiceRoleClient>,
  lead: any,
  waveNumber: number,
  preloaded?: PreloadedRelanceWaveData
): Promise<EligiblePartnerForDispatch[]> {
  const maxSlots =
    typeof lead.max_slots === "number"
      ? lead.max_slots
      : lead.segment === "B2B"
        ? MAX_SLOTS_B2B
        : MAX_SLOTS_B2C
  const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)

  // 1. Récupérer les achats existants pour ce lead (filtrer les comptes de test)
  let purchases: any[] = []
  if (preloaded?.purchasesByLeadId) {
    purchases = preloaded.purchasesByLeadId.get(lead.id) || []
  } else {
    const { data: fetchedPurchases } = await supabase
      .from("lead_purchases")
      .select("partner_id, partners(is_test, company_name)")
      .eq("lead_id", lead.id)
    purchases = fetchedPurchases || []
  }

  const realPurchases = purchases.filter((p: any) => {
    const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
    return !partnerObj?.is_test && !partnerObj?.company_name?.toLowerCase().includes("test")
  })
  const realPurchasedPartnerIds = new Set(realPurchases.map((p) => p.partner_id))
  const allPurchasedPartnerIds = new Set(purchases.map((p) => p.partner_id))

  // Si le lead est déjà plein pour les vrais installateurs, aucun partenaire n'est éligible
  if (realPurchasedPartnerIds.size >= maxSlots) {
    return []
  }

  // 2. Récupérer l'historique des relances déjà envoyées pour ce lead
  let alreadySentForThisLead: { partner_id: string; wave_number: number }[] = []
  if (preloaded?.dispatchesByLeadId) {
    alreadySentForThisLead = preloaded.dispatchesByLeadId.get(lead.id) || []
  } else {
    try {
      const { data: dispatches } = await supabase
        .from("lead_relance_dispatches")
        .select("partner_id, wave_number")
        .eq("lead_id", lead.id)

      alreadySentForThisLead = dispatches || []
    } catch {
      // Tolérance si la table n'est pas encore migrée
    }
  }

  const partnersWhoReceivedThisWave = new Set(
    alreadySentForThisLead.filter((d) => d.wave_number === waveNumber).map((d) => d.partner_id)
  )

  const partnerNotificationCounts = new Map<string, number>()
  for (const d of alreadySentForThisLead) {
    partnerNotificationCounts.set(d.partner_id, (partnerNotificationCounts.get(d.partner_id) || 0) + 1)
  }

  // 2a. Récupérer le compteur journalier de notifications par partenaire (Europe/Brussels)
  let dailyDispatchCounts = preloaded?.dailyDispatchCountsByPartnerId
  if (!dailyDispatchCounts) {
    dailyDispatchCounts = new Map<string, number>()
    try {
      const { data: todayDispatches } = await supabase
        .from("lead_relance_dispatches")
        .select("partner_id")
        .gte("sent_at", getStartOfBrusselsDayIso())

      for (const row of todayDispatches || []) {
        if (!row.partner_id) continue
        const pId = String(row.partner_id)
        dailyDispatchCounts.set(pId, (dailyDispatchCounts.get(pId) || 0) + 1)
      }
    } catch {
      // Tolérance si la table n'est pas encore migrée
    }
  }

  // 2b. Récupérer la télémétrie comportementale sur ce lead (consultations, durée d'étude, zoom, intention)
  type LeadEngagementAgg = {
    hasInspected: boolean
    totalDurationMs: number
    zoomedRoof: boolean
    unlockIntent: boolean
  }
  const engagementByPartnerId = new Map<string, LeadEngagementAgg>()
  const engagementByEmail = new Map<string, LeadEngagementAgg>()

  try {
    let telemetryRows: any[] = []
    if (preloaded?.telemetryByLeadId) {
      telemetryRows = preloaded.telemetryByLeadId.get(lead.id) || []
    } else {
      const { data: fetchedTelemetry } = await supabase
        .from("partner_activity_events")
        .select("partner_id, partner_email, event_type, duration_ms")
        .eq("lead_id", lead.id)
      telemetryRows = fetchedTelemetry || []
    }

    for (const ev of telemetryRows) {
      const pId = ev.partner_id ? String(ev.partner_id) : null
      const pEmail = ev.partner_email ? String(ev.partner_email).toLowerCase().trim() : null

      const applyEvent = (agg: LeadEngagementAgg) => {
        if (
          ev.event_type === "lead_inspect_open" ||
          ev.event_type === "email_deep_link" ||
          ev.event_type === "lead_inspect_duration" ||
          ev.event_type === "roof_photo_zoom" ||
          ev.event_type === "unlock_intent"
        ) {
          agg.hasInspected = true
        }
        if (ev.event_type === "lead_inspect_duration") {
          agg.totalDurationMs += Number(ev.duration_ms) || 0
        } else if (Number(ev.duration_ms) > agg.totalDurationMs) {
          agg.totalDurationMs = Number(ev.duration_ms) || 0
        }
        if (ev.event_type === "roof_photo_zoom") {
          agg.zoomedRoof = true
        }
        if (ev.event_type === "unlock_intent") {
          agg.unlockIntent = true
        }
      }

      if (pId) {
        const cur = engagementByPartnerId.get(pId) || {
          hasInspected: false,
          totalDurationMs: 0,
          zoomedRoof: false,
          unlockIntent: false,
        }
        applyEvent(cur)
        engagementByPartnerId.set(pId, cur)
      }
      if (pEmail) {
        const cur = engagementByEmail.get(pEmail) || {
          hasInspected: false,
          totalDurationMs: 0,
          zoomedRoof: false,
          unlockIntent: false,
        }
        applyEvent(cur)
        engagementByEmail.set(pEmail, cur)
      }
    }
  } catch {
    // Tolérance si la table partner_activity_events n'est pas encore migrée
  }

  // 3. Récupérer tous les partenaires actifs
  let allPartners: any[] = []
  if (preloaded?.allPartners) {
    allPartners = preloaded.allPartners
  } else {
    const { data: fetchedPartners, error: partnersErr } = await supabase
      .from("partners")
      .select("id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture, is_test, email_notifications_enabled, email_relances_enabled")

    if (partnersErr || !fetchedPartners || fetchedPartners.length === 0) {
      return []
    }
    allPartners = fetchedPartners
  }

  if (allPartners.length === 0) {
    return []
  }

  const activePartners = allPartners.filter((p) => !isUnreachableMockEmail(p.email))
  const realPartners = activePartners.filter((p) => !isDevTestPartner(p))
  const devTestPartners = activePartners.filter((p) => isDevTestPartner(p))
  const velocityMap =
    preloaded?.velocityByPartnerId ?? (await loadPartnerVelocityMap(supabase))

  // 4. Calculer le score (avec Vélocité & Comportement) et filtrer les candidats réels
  const scoredCandidates: EligiblePartnerForDispatch[] = []

  for (const partner of realPartners) {
    // Exclure si déjà acheteur
    if (allPurchasedPartnerIds.has(partner.id)) continue

    // Exclure si a déjà reçu cette vague précise
    if (partnersWhoReceivedThisWave.has(partner.id)) continue

    // Exclure si a déjà reçu le maximum de relances autorisées pour ce lead
    const countForLead = partnerNotificationCounts.get(partner.id) || 0
    if (countForLead >= MAX_NOTIFICATIONS_PER_LEAD_PER_PARTNER) continue

    // Exclure si le plafond journalier anti-spam est atteint pour ce partenaire
    const dailyCount = dailyDispatchCounts.get(partner.id) || 0
    if (dailyCount >= MAX_DAILY_NOTIFICATIONS_PER_PARTNER) continue

    // Respecter les préférences de fréquence d'alertes e-mail de l'installateur
    const notifMode = getPartnerNotificationMode(partner)
    if (notifMode === "none") continue
    if (notifMode === "new_only" && (waveNumber > 1 || countForLead >= 1)) continue

    // Vérifier l'adresse e-mail
    if (!partner.email || !partner.email.includes("@")) continue

    const scoreInfo = calculatePartnerMatchScore(partner, {
      segment: lead.segment,
      province: lead.province,
      surface_type: lead.surface_type,
      annual_electricity_bill: lead.annual_electricity_bill,
      credit_cost: creditCost,
    })

    if (scoreInfo.score === 0 || !scoreInfo.segmentMatch) continue

    // Bonus d'intérêt comportemental (Behavioral Boost) sur Vagues 2 & 3
    const partnerEmailLower = String(partner.email || "").toLowerCase().trim()
    const engagement =
      engagementByPartnerId.get(partner.id) ||
      (partnerEmailLower ? engagementByEmail.get(partnerEmailLower) : undefined)

    let behavioralBoost = 0
    if (engagement?.hasInspected) {
      behavioralBoost += 10
      if (engagement.totalDurationMs >= 10000) behavioralBoost += 15
      if (engagement.zoomedRoof) behavioralBoost += 10
      if (engagement.unlockIntent) behavioralBoost += 15
    }

    if (behavioralBoost > 0) {
      scoreInfo.score = Math.min(130, scoreInfo.score + behavioralBoost)
      if (behavioralBoost >= 20) {
        scoreInfo.tier = "tier_1"
      }
    }

    // Score de Vélocité Acheteur (30 jours) : favorise les acheteurs actifs et pénalise les comptes dormants (>= 10 alertes sans aucun clic)
    const velocity = velocityMap.get(partner.id)
    if (velocity) {
      if (velocity.recentPurchases7d >= 1) {
        scoreInfo.score = Math.min(145, scoreInfo.score + 35)
      } else if (velocity.recentPurchases30d >= 1) {
        scoreInfo.score = Math.min(140, scoreInfo.score + 20)
      }
      if (velocity.clicks30d >= 1) {
        scoreInfo.score = Math.min(145, scoreInfo.score + 15)
      }
      if (
        velocity.dispatches30d >= 10 &&
        velocity.recentPurchases30d === 0 &&
        velocity.clicks30d === 0
      ) {
        scoreInfo.score = Math.max(10, scoreInfo.score - 30)
      }
    }

    scoreInfo.behavioralBoost = behavioralBoost
    scoreInfo.hasInspectedLead = Boolean(engagement?.hasInspected)
    scoreInfo.inspectedDurationMs = engagement?.totalDurationMs || 0
    scoreInfo.zoomedRoof = Boolean(engagement?.zoomedRoof)
    scoreInfo.unlockIntent = Boolean(engagement?.unlockIntent)

    // Filtrage par vague (Waterfall Cascade) :
    // Vague 1 : Priorité absolue aux installateurs du Tier 1 (Score >= 70, même province)
    if (waveNumber === 1 && scoreInfo.tier !== "tier_1") {
      continue
    }

    // Vague 2 : Tier 1 (qui n'ont pas encore acheté) + Tier 2 (provinces limitrophes)
    if (waveNumber === 2 && scoreInfo.tier === "tier_3") {
      continue
    }

    // Vague 3 : Tous les Tiers restants (Tier 1, Tier 2, Tier 3)
    scoredCandidates.push({ partner, scoreInfo, isTest: false })
  }

  // 5. Trier par intérêt comportemental chaud, crédits disponibles, puis score décroissant
  scoredCandidates.sort((a, b) => {
    const aHot = (a.scoreInfo.behavioralBoost || 0) >= 20
    const bHot = (b.scoreInfo.behavioralBoost || 0) >= 20
    if (aHot !== bHot) {
      return aHot ? -1 : 1
    }
    // Priorité 2 : Solde de crédits suffisant
    if (a.scoreInfo.hasEnoughCredits !== b.scoreInfo.hasEnoughCredits) {
      return a.scoreInfo.hasEnoughCredits ? -1 : 1
    }
    // Priorité 3 : Score de pertinence global
    return b.scoreInfo.score - a.scoreInfo.score
  })

  // 6. Limiter le nombre de destinataires selon la jauge cible de la vague (sans compter DEV TEST !)
  const isB2B = lead.segment === "B2B"
  const targetCount = isB2B
    ? waveNumber === 1
      ? WAVE_TARGET_COUNTS.B2B.wave1
      : waveNumber === 2
      ? WAVE_TARGET_COUNTS.B2B.wave2
      : WAVE_TARGET_COUNTS.B2B.wave3
    : waveNumber === 1
    ? WAVE_TARGET_COUNTS.B2C.wave1
    : waveNumber === 2
    ? WAVE_TARGET_COUNTS.B2C.wave2
    : WAVE_TARGET_COUNTS.B2C.wave3

  const selectedCandidates = scoredCandidates.slice(0, targetCount)

  // 7. Inclure les comptes DEV TEST / ADMIN en observateurs sans consommer de place dans le quota réel
  for (const devPartner of devTestPartners) {
    if (devPartner && devPartner.email && devPartner.email.includes("@")) {
      const hasAlreadyReceivedThisWave = partnersWhoReceivedThisWave.has(devPartner.id)
      if (!hasAlreadyReceivedThisWave) {
        const devScoreInfo: PartnerMatchingScore = {
          partnerId: devPartner.id,
          score: 95,
          tier: "tier_1",
          isExactProvince: true,
          isNeighborProvince: false,
          hasEnoughCredits: (devPartner.credits || 0) >= creditCost,
          segmentMatch: true,
        }
        selectedCandidates.push({
          partner: devPartner,
          scoreInfo: devScoreInfo,
          isTest: true,
        })
      }
    }
  }

  return selectedCandidates
}

// ==============================================================================
// 5. EXÉCUTION D'UNE VAGUE DE RELANCE (DISPATCH WAVE)
// ==============================================================================

export interface DispatchWaveResult {
  success: boolean
  leadId: string
  waveNumber: number
  sentCount: number
  recipients: { email: string; companyName: string; score: number; tier: string; isTest?: boolean }[]
  takenSlots: number
  maxSlots: number
  isFullySold: boolean
  message: string
}

/**
 * Envoie une vague de relance e-mail pour un lead spécifique
 */
export async function dispatchLeadWave(
  leadId: string,
  waveNumber = 1,
  force = false
): Promise<DispatchWaveResult> {
  const supabase = createServiceRoleClient()

  // 1. Récupérer le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    throw new Error(`Lead introuvable (#${leadId})`)
  }

  const isB2B = lead.segment === "B2B"
  const maxSlots =
    typeof lead.max_slots === "number"
      ? lead.max_slots
      : isB2B
        ? MAX_SLOTS_B2B
        : MAX_SLOTS_B2C

  // 2. Vérifier les achats réels enregistrés (hors comptes de test)
  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("id, partner_id, partners(is_test, company_name)")
    .eq("lead_id", leadId)

  const realPurchases = (purchases || []).filter(
    (p: any) => !p.partners?.is_test && !p.partners?.company_name?.toLowerCase().includes("test")
  )
  const takenSlots = realPurchases.length

  // 3. Vérifier si le lead est épuisé ou non disponible
  if (takenSlots >= maxSlots) {
    if (lead.marketplace_status !== "sold_out") {
      await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", leadId)
    }
    return {
      success: false,
      leadId,
      waveNumber,
      sentCount: 0,
      recipients: [],
      takenSlots,
      maxSlots,
      isFullySold: true,
      message: `Tous les créneaux pour ce lead sont déjà pourvus (${takenSlots}/${maxSlots}). Aucune relance envoyée.`,
    }
  }

  if (lead.marketplace_status !== "available" && !force) {
    return {
      success: false,
      leadId,
      waveNumber,
      sentCount: 0,
      recipients: [],
      takenSlots,
      maxSlots,
      isFullySold: false,
      message: `Le lead est actuellement en statut '${lead.marketplace_status}'. Seuls les leads 'available' peuvent recevoir des relances.`,
    }
  }

  // 4. Calculer les estimations financières du projet
  const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)
  const financials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea: lead.surface_area_m2 || lead.surface_area,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: lead.annual_bill_eur || lead.annual_electricity_bill,
    creditCost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details || lead.message,
    qualificationMetadata: lead.qualification_metadata,
  })

  // 5. Sélectionner les partenaires éligibles
  const candidates = await getEligiblePartnersForWave(supabase, lead, waveNumber)

  if (candidates.length === 0) {
    return {
      success: true,
      leadId,
      waveNumber,
      sentCount: 0,
      recipients: [],
      takenSlots,
      maxSlots,
      isFullySold: false,
      message: `Aucun installateur éligible restant pour la Vague ${waveNumber} (tous ont déjà été notifiés ou ont atteint leurs limites).`,
    }
  }

  // 6. Envoi des e-mails via Resend et journalisation
  const resend = resendApiKey ? new Resend(resendApiKey) : null
  const dispatchedRecipients: { email: string; companyName: string; score: number; tier: string; isTest?: boolean }[] = []
  const pendingSmsPromises: Promise<unknown>[] = []

  for (const candidate of candidates) {
    const partner = candidate.partner
    if (isUnreachableMockEmail(partner.email)) continue
    const scoreInfo = candidate.scoreInfo

    const emailData = {
      partner: {
        id: partner.id,
        companyName: partner.company_name,
        contactName: partner.first_name ? `${partner.first_name} ${partner.last_name || ""}` : null,
        credits: partner.credits || 0,
      },
      lead: {
        id: lead.id,
        segment: lead.segment,
        province: lead.province,
        provinceFreeText: lead.province_free_text,
        postalCode: lead.postal_code,
        city: lead.city,
        surfaceType: lead.surface_type,
        surfaceArea: lead.surface_area_m2 || lead.surface_area || 0,
        roofMaterial: lead.roof_material,
        annualElectricityBill: lead.annual_bill_eur || lead.annual_electricity_bill || 0,
        estimatedPowerKwc: financials.estimatedPowerKwc,
        timeframe: lead.timeframe,
        ownershipStatus: lead.ownership_status,
        projectDriver: lead.project_driver,
        projectDetails: lead.project_details || lead.message,
        contactPreference:
          lead.contact_preference ||
          (lead.qualification_metadata?.contactPreference as string | null) ||
          null,
        phone: lead.phone || null,
        firstName: lead.first_name,
        lastName: lead.last_name,
        grd: lead.grd,
        roofImageUrl: getPrimaryLeadImageItem(lead)?.url ?? null,
        roofImagesCount: getLeadImages(lead).length,
        roofImageIsAiProjection: Boolean(getPrimaryLeadImageItem(lead)?.isAiProjection),
        phoneVerified: Boolean(lead.phone_verified),
        phoneVerificationMethod: lead.phone_verification_method ?? null,
        phoneCarrier: lead.phone_carrier ?? null,
        phoneLineType: lead.phone_line_type ?? null,
        emailVerified: Boolean(lead.email_verified),
        emailDeliveryStatus: lead.email_delivery_status ?? null,
        qualificationMetadata: lead.qualification_metadata ?? null,
        createdAt: lead.created_at,
      },
      waveNumber,
      takenSlots,
      maxSlots,
      creditCost,
      financials,
      engagement: {
        hasInspected: Boolean(scoreInfo.hasInspectedLead),
        inspectedDurationMs: scoreInfo.inspectedDurationMs || 0,
        zoomedRoof: Boolean(scoreInfo.zoomedRoof),
        unlockIntent: Boolean(scoreInfo.unlockIntent),
      },
    }

    const { subject, text, html } = renderInstallerLeadTeaserEmail(emailData)
    const siteBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
    const notifUrls = buildPartnerNotificationUrls(siteBaseUrl, partner.id, partner.email)

    if (resend) {
      try {
        const { error: sendErr } = await resend.emails.send({
          from: fromEmail,
          to: partner.email,
          replyTo: replyToEmail,
          subject,
          text,
          html,
          headers: {
            "List-Unsubscribe": `<${notifUrls.muteAllUrl}>, <mailto:contact@aegissolaire.com?subject=Desabonnement%20alertes>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        })

        if (sendErr) {
          console.error(`[Lead Relance] Échec d'envoi à ${partner.email}:`, sendErr)
          continue
        }
      } catch (sendException) {
        console.error(`[Lead Relance] Exception d'envoi à ${partner.email}:`, sendException)
        continue
      }
    } else {
      console.log(`[Lead Relance DEV] Envoi simulé à ${partner.email} — Objet: ${subject}`)
    }

    // Alerte SMS optionnelle (strictement activée uniquement si TWILIO_* est configuré en prod)
    if (waveNumber === 1 && scoreInfo.tier === "tier_1" && partner.phone && !candidate.isTest) {
      pendingSmsPromises.push(
        sendOptionalSmsUrgencyAlert({
          toPhone: partner.phone,
          city: lead.city || lead.province || "Wallonie",
          segment: lead.segment || "B2C",
          powerKwc: financials.estimatedPowerKwc,
          creditCost,
        }).catch(() => undefined)
      )
    }

    // Journalisation dans lead_relance_dispatches
    try {
      await supabase.from("lead_relance_dispatches").insert({
        lead_id: lead.id,
        partner_id: partner.id,
        wave_number: waveNumber,
        email_to: partner.email,
        email_subject: subject,
        matching_score: scoreInfo.score,
        matching_tier: scoreInfo.tier,
        credits_at_send: partner.credits || 0,
        sent_at: new Date().toISOString(),
      })
    } catch (insertErr) {
      // Tolérance si la table SQL est en attente
    }

    dispatchedRecipients.push({
      email: partner.email,
      companyName: partner.company_name,
      score: scoreInfo.score,
      tier: scoreInfo.tier,
      isTest: Boolean(candidate.isTest || partner.is_test || partner.company_name?.toLowerCase().includes("test")),
    })
  }

  if (pendingSmsPromises.length > 0) {
    await Promise.allSettled(pendingSmsPromises)
  }

  // 7. Mettre à jour l'état de relance sur le lead
  try {
    await supabase
      .from("leads")
      .update({
        relance_wave: waveNumber,
        last_relance_at: new Date().toISOString(),
      })
      .eq("id", lead.id)
  } catch (updateErr) {
    // Non bloquant
  }

  const realSentCount = dispatchedRecipients.filter((r) => !r.isTest).length
  const devIncluded = dispatchedRecipients.some((r) => r.isTest)

  return {
    success: true,
    leadId,
    waveNumber,
    sentCount: dispatchedRecipients.length,
    recipients: dispatchedRecipients,
    takenSlots,
    maxSlots,
    isFullySold: false,
    message: `Vague ${waveNumber} envoyée avec succès à ${realSentCount} installateur(s)${devIncluded ? " (+ compte DEV TEST)" : ""}.`,
  }
}

export interface DispatchSpecificOptions {
  waveNumber?: number
  touchWave?: boolean // Par défaut false : n'altère pas la vague du lead (Vague 1, 2, 3)
}

/**
 * Envoie un lead par e-mail à une sélection manuelle d'installateurs partenaires
 * Par défaut (touchWave = false), cet envoi direct n'affecte pas le cycle de vagues du lead.
 */
export async function dispatchLeadToSpecificPartners(
  leadId: string,
  partnerIds: string[],
  optionsOrWaveNumber: number | DispatchSpecificOptions = { touchWave: false }
): Promise<DispatchWaveResult> {
  if (!partnerIds || partnerIds.length === 0) {
    throw new Error("Aucun installateur sélectionné.")
  }

  const options: DispatchSpecificOptions =
    typeof optionsOrWaveNumber === "number"
      ? { waveNumber: optionsOrWaveNumber, touchWave: false }
      : optionsOrWaveNumber

  const waveNumber = options.waveNumber ?? 1
  const touchWave = options.touchWave === true

  const supabase = createServiceRoleClient()

  // 1. Récupérer le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    throw new Error(`Lead introuvable (#${leadId})`)
  }

  const isB2B = lead.segment === "B2B"
  const maxSlots =
    typeof lead.max_slots === "number"
      ? lead.max_slots
      : isB2B
        ? MAX_SLOTS_B2B
        : MAX_SLOTS_B2C

  // 2. Vérifier les achats existants
  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("id, partner_id, partners(is_test, company_name)")
    .eq("lead_id", leadId)

  const realPurchases = (purchases || []).filter(
    (p: any) => !p.partners?.is_test && !p.partners?.company_name?.toLowerCase().includes("test")
  )
  const takenSlots = realPurchases.length

  // 3. Récupérer les partenaires cibles
  const { data: selectedPartners, error: partnersErr } = await supabase
    .from("partners")
    .select("id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture, is_test, email_notifications_enabled, email_relances_enabled")
    .in("id", partnerIds)

  if (partnersErr || !selectedPartners || selectedPartners.length === 0) {
    throw new Error("Les installateurs sélectionnés sont introuvables.")
  }

  // 4. Calculer les estimations financières du projet
  const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)
  const financials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea: lead.surface_area_m2 || lead.surface_area,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: lead.annual_bill_eur || lead.annual_electricity_bill,
    creditCost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details || lead.message,
    qualificationMetadata: lead.qualification_metadata,
  })

  // 5. Récupérer l'éventuelle télémétrie sur ce lead pour personnaliser l'accroche
  const manualEngagementByPartnerId = new Map<
    string,
    { hasInspected: boolean; totalDurationMs: number; zoomedRoof: boolean; unlockIntent: boolean }
  >()
  try {
    const { data: telemetryRows } = await supabase
      .from("partner_activity_events")
      .select("partner_id, event_type, duration_ms")
      .eq("lead_id", leadId)
      .in("partner_id", partnerIds)

    for (const ev of telemetryRows || []) {
      if (!ev.partner_id) continue
      const cur = manualEngagementByPartnerId.get(ev.partner_id) || {
        hasInspected: false,
        totalDurationMs: 0,
        zoomedRoof: false,
        unlockIntent: false,
      }
      if (
        ev.event_type === "lead_inspect_open" ||
        ev.event_type === "email_deep_link" ||
        ev.event_type === "lead_inspect_duration" ||
        ev.event_type === "roof_photo_zoom" ||
        ev.event_type === "unlock_intent"
      ) {
        cur.hasInspected = true
      }
      if (ev.event_type === "lead_inspect_duration") {
        cur.totalDurationMs += Number(ev.duration_ms) || 0
      } else if (Number(ev.duration_ms) > cur.totalDurationMs) {
        cur.totalDurationMs = Number(ev.duration_ms) || 0
      }
      if (ev.event_type === "roof_photo_zoom") cur.zoomedRoof = true
      if (ev.event_type === "unlock_intent") cur.unlockIntent = true
      manualEngagementByPartnerId.set(ev.partner_id, cur)
    }
  } catch {
    // Non bloquant
  }

  // 6. Envoi des e-mails via Resend et journalisation
  const resend = resendApiKey ? new Resend(resendApiKey) : null
  const dispatchedRecipients: { email: string; companyName: string; score: number; tier: string; isTest?: boolean }[] = []

  for (const partner of selectedPartners) {
    if (!partner.email || !partner.email.includes("@") || isUnreachableMockEmail(partner.email)) continue
    if (getPartnerNotificationMode(partner) === "none") continue

    const effectiveSegment = getEffectivePartnerSegment(partner)
    const leadSegmentUpper = (lead.segment || "B2B").toUpperCase()
    if (effectiveSegment !== "BOTH" && effectiveSegment !== leadSegmentUpper) {
      continue
    }

    const partnerEngagement = manualEngagementByPartnerId.get(partner.id)

    const emailData = {
      partner: {
        id: partner.id,
        companyName: partner.company_name,
        contactName: null,
        credits: partner.credits || 0,
      },
      lead: {
        id: lead.id,
        segment: lead.segment,
        province: lead.province,
        provinceFreeText: lead.province_free_text,
        postalCode: lead.postal_code,
        city: lead.city,
        surfaceType: lead.surface_type,
        surfaceArea: lead.surface_area_m2 || lead.surface_area || 0,
        roofMaterial: lead.roof_material,
        annualElectricityBill: lead.annual_bill_eur || lead.annual_electricity_bill || 0,
        estimatedPowerKwc: financials.estimatedPowerKwc,
        timeframe: lead.timeframe,
        ownershipStatus: lead.ownership_status,
        projectDriver: lead.project_driver,
        projectDetails: lead.project_details || lead.message,
        contactPreference:
          lead.contact_preference ||
          (lead.qualification_metadata?.contactPreference as string | null) ||
          null,
        phone: lead.phone || null,
        firstName: lead.first_name,
        lastName: lead.last_name,
        grd: lead.grd,
        roofImageUrl: getPrimaryLeadImageItem(lead)?.url ?? null,
        roofImagesCount: getLeadImages(lead).length,
        roofImageIsAiProjection: Boolean(getPrimaryLeadImageItem(lead)?.isAiProjection),
        phoneVerified: Boolean(lead.phone_verified),
        phoneVerificationMethod: lead.phone_verification_method ?? null,
        phoneCarrier: lead.phone_carrier ?? null,
        phoneLineType: lead.phone_line_type ?? null,
        emailVerified: Boolean(lead.email_verified),
        emailDeliveryStatus: lead.email_delivery_status ?? null,
        qualificationMetadata: lead.qualification_metadata ?? null,
        createdAt: lead.created_at,
      },
      waveNumber,
      takenSlots,
      maxSlots,
      creditCost,
      financials,
      engagement: partnerEngagement
        ? {
            hasInspected: partnerEngagement.hasInspected,
            inspectedDurationMs: partnerEngagement.totalDurationMs,
            zoomedRoof: partnerEngagement.zoomedRoof,
            unlockIntent: partnerEngagement.unlockIntent,
          }
        : undefined,
    }

    const { subject, text, html } = renderInstallerLeadTeaserEmail(emailData)
    const siteBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
    const notifUrls = buildPartnerNotificationUrls(siteBaseUrl, partner.id, partner.email)

    if (resend) {
      try {
        const { error: sendErr } = await resend.emails.send({
          from: fromEmail,
          to: partner.email,
          replyTo: replyToEmail,
          subject,
          text,
          html,
          headers: {
            "List-Unsubscribe": `<${notifUrls.muteAllUrl}>, <mailto:contact@aegissolaire.com?subject=Desabonnement%20alertes>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        })
        if (sendErr) {
          console.error(`[Manual Dispatch] Échec d'envoi à ${partner.email}:`, sendErr)
          continue
        }
      } catch (sendException) {
        console.error(`[Manual Dispatch] Exception d'envoi à ${partner.email}:`, sendException)
        continue
      }
    } else {
      console.log(`[Manual Dispatch DEV] Envoi simulé à ${partner.email} — Objet: ${subject}`)
    }

    // Journalisation dans lead_relance_dispatches
    try {
      await supabase.from("lead_relance_dispatches").insert({
        lead_id: lead.id,
        partner_id: partner.id,
        wave_number: touchWave ? waveNumber : (lead.relance_wave || 0),
        email_to: partner.email,
        email_subject: subject,
        matching_score: 100,
        matching_tier: "manual_selection",
        credits_at_send: partner.credits || 0,
        sent_at: new Date().toISOString(),
      })
    } catch (insertErr) {
      console.warn("[Manual Dispatch] log dispatch warning:", insertErr)
    }

    dispatchedRecipients.push({
      email: partner.email,
      companyName: partner.company_name,
      score: 100,
      tier: "manual_selection",
      isTest: Boolean(partner.is_test || partner.company_name?.toLowerCase().includes("test")),
    })
  }

  // Mettre à jour l'état de relance sur le lead UNIQUEMENT si touchWave === true
  if (touchWave) {
    try {
      await supabase
        .from("leads")
        .update({
          relance_wave: Math.max(lead.relance_wave || 0, waveNumber),
          last_relance_at: new Date().toISOString(),
        })
        .eq("id", lead.id)
    } catch (updateErr) {
      // Non bloquant
    }
  }

  return {
    success: true,
    leadId,
    waveNumber,
    sentCount: dispatchedRecipients.length,
    recipients: dispatchedRecipients,
    takenSlots,
    maxSlots,
    isFullySold: takenSlots >= maxSlots,
    message: `${dispatchedRecipients.length} e-mail(s) envoyé(s) avec succès !`,
  }
}

// ==============================================================================
// 6. PROCESSUS DE RELANCES AUTOMATIQUES EN TÂCHE DE FOND (CRON / WORKER)
// ==============================================================================

export interface CronRelanceSummary {
  processedLeads: number
  triggeredWaves: { leadId: string; waveNumber: number; sentCount: number }[]
  skippedLeadsCount: number
  autoClosedStalePartialCount?: number
  reconfirmEmailsSentCount?: number
  referralEmailsSentCount?: number
}

/**
 * Envoie les e-mails d'invitation au partage ("l'astuce propriétaire") aux prospects
 * dont le dossier est resté en statut CRM `won` (Devis signé) pendant au moins 24 h
 * sans correction (protection anti-misclick installateur).
 */
export async function processPendingProspectReferralEmails(
  supabase: ReturnType<typeof createServiceRoleClient>,
  nowMs = Date.now()
): Promise<number> {
  const stabilizedBeforeIso = new Date(nowMs - REFERRAL_WON_STABILIZATION_MS).toISOString()
  const lookbackAfterIso = new Date(nowMs - REFERRAL_WON_LOOKBACK_MS).toISOString()
  const nowIso = new Date(nowMs).toISOString()

  let sentCount = 0
  const processedLeadIds = new Set<string>()

  try {
    const { data: wonPurchases, error } = await supabase
      .from("lead_purchases")
      .select(
        `
          id,
          lead_id,
          partner_id,
          pipeline_status,
          updated_at,
          partners(id, company_name, email, is_test),
          leads(id, first_name, last_name, email, city, province, segment, estimated_power_kwc, qualification_metadata)
        `
      )
      .eq("pipeline_status", "won")
      .lte("updated_at", stabilizedBeforeIso)
      .gte("updated_at", lookbackAfterIso)
      .order("updated_at", { ascending: true })

    if (error || !wonPurchases || wonPurchases.length === 0) {
      return 0
    }

    for (const purchase of wonPurchases as any[]) {
      if (purchase.pipeline_status !== "won") continue

      const partner = Array.isArray(purchase.partners) ? purchase.partners[0] : purchase.partners
      const lead = Array.isArray(purchase.leads) ? purchase.leads[0] : purchase.leads

      if (!lead || !lead.id || !lead.email) continue
      if (processedLeadIds.has(lead.id)) continue

      if (
        isDevTestPartner({
          is_test: partner?.is_test,
          company_name: partner?.company_name,
          email: partner?.email,
        })
      ) {
        continue
      }

      const prospectEmail = String(lead.email).toLowerCase().trim()
      if (
        !prospectEmail ||
        !prospectEmail.includes("@") ||
        isUnreachableMockEmail(prospectEmail) ||
        REFERRAL_OPTOUT_EMAIL_SET.has(prospectEmail)
      ) {
        continue
      }

      const meta =
        lead.qualification_metadata && typeof lead.qualification_metadata === "object"
          ? (lead.qualification_metadata as Record<string, unknown>)
          : {}

      if (meta.referral_invite_sent_at) {
        continue
      }

      processedLeadIds.add(lead.id)

      const sendRes = await sendProspectReferralEmail({
        email: prospectEmail,
        firstName: lead.first_name,
        lastName: lead.last_name,
        leadId: lead.id,
        city: lead.city,
        province: lead.province,
        segment: lead.segment,
        estimatedPowerKwc: lead.estimated_power_kwc,
        partnerCompany: partner?.company_name || null,
      })

      if (sendRes.sent) {
        sentCount++
        const { error: updateErr } = await supabase
          .from("leads")
          .update({
            qualification_metadata: {
              ...meta,
              referral_invite_sent_at: nowIso,
              referral_trigger_purchase_id: purchase.id,
            },
          })
          .eq("id", lead.id)

        if (updateErr) {
          console.warn(
            `[Cron Parrainage] Impossible d'horodater referral_invite_sent_at sur le lead #${lead.id}:`,
            updateErr.message
          )
        }
      }
    }
  } catch (err) {
    console.error("[Cron Parrainage] Erreur lors du traitement des recommandations:", err)
  }

  return sentCount
}

/**
 * Scanne tous les leads disponibles, applique le Protocole Qualité (clôture B2C partielle
 * après 7 jours + 48 h de grâce, reconfirmation prospect à 72 h après publication)
 * et déclenche les Vagues 2 et 3 selon les cooldowns en heures ouvrées (+6 h / +24 h).
 */
export async function processPendingLeadRelances(): Promise<CronRelanceSummary> {
  // Respecter les plages horaires de courtoisie professionnelle
  if (!isWithinBusinessHours()) {
    return {
      processedLeads: 0,
      triggeredWaves: [],
      skippedLeadsCount: 0,
      autoClosedStalePartialCount: 0,
      reconfirmEmailsSentCount: 0,
      referralEmailsSentCount: 0,
    }
  }

  const supabase = createServiceRoleClient()
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const referralEmailsSentCount = await processPendingProspectReferralEmails(supabase, now)

  // 1. Récupérer tous les leads actuellement "available" (avec repli si colonnes 202611180001 pas encore migrées)
  let availableLeads: any[] = []
  const primaryLeadsRes = await supabase
    .from("leads")
    .select(
      "id, segment, marketplace_status, relance_wave, last_relance_at, created_at, max_slots, first_name, email, city, province, reconfirmed_at, reconfirm_sent_at, qualification_metadata"
    )
    .eq("marketplace_status", "available")
    .order("created_at", { ascending: false })

  if (
    primaryLeadsRes.error &&
    (primaryLeadsRes.error.code === "42703" ||
      primaryLeadsRes.error.message?.includes("reconfirm"))
  ) {
    const fallbackRes = await supabase
      .from("leads")
      .select(
        "id, segment, marketplace_status, relance_wave, last_relance_at, created_at, max_slots, first_name, email, city, province, qualification_metadata"
      )
      .eq("marketplace_status", "available")
      .order("created_at", { ascending: false })
    availableLeads = fallbackRes.data || []
  } else {
    availableLeads = primaryLeadsRes.data || []
  }

  if (availableLeads.length === 0) {
    return {
      processedLeads: 0,
      triggeredWaves: [],
      skippedLeadsCount: 0,
      autoClosedStalePartialCount: 0,
      reconfirmEmailsSentCount: 0,
      referralEmailsSentCount,
    }
  }

  // Batch-fetch achats réels et historique des vagues (zéro N+1)
  const leadIds = availableLeads.map((l) => l.id)
  const realTakenByLead = new Map<string, number>()
  const lastRealBuyAtByLead = new Map<string, number>()
  const maxDispatchedWaveByLead = new Map<string, number>()
  const lastDispatchAtByLead = new Map<string, number>()

  try {
    const [purchaseRes, dispatchRes] = await Promise.all([
      supabase
        .from("lead_purchases")
        .select("lead_id, purchased_at, partners(is_test, company_name)")
        .in("lead_id", leadIds),
      supabase
        .from("lead_relance_dispatches")
        .select("lead_id, wave_number, sent_at")
        .in("lead_id", leadIds)
        .in("wave_number", [1, 2, 3]),
    ])

    for (const row of (purchaseRes.data as any[]) || []) {
      const pRel = Array.isArray(row.partners) ? row.partners[0] : row.partners
      const isTest =
        pRel?.is_test === true ||
        (typeof pRel?.company_name === "string" && pRel.company_name.toLowerCase().includes("test"))
      if (!isTest) {
        realTakenByLead.set(row.lead_id, (realTakenByLead.get(row.lead_id) || 0) + 1)
        const buyTs = row.purchased_at ? new Date(row.purchased_at).getTime() : 0
        if (buyTs > (lastRealBuyAtByLead.get(row.lead_id) || 0)) {
          lastRealBuyAtByLead.set(row.lead_id, buyTs)
        }
      }
    }

    for (const row of (dispatchRes.data as any[]) || []) {
      const wave = Number(row.wave_number) || 0
      if (wave > (maxDispatchedWaveByLead.get(row.lead_id) || 0)) {
        maxDispatchedWaveByLead.set(row.lead_id, wave)
      }
      const sentTs = row.sent_at ? new Date(row.sent_at).getTime() : 0
      if (sentTs > (lastDispatchAtByLead.get(row.lead_id) || 0)) {
        lastDispatchAtByLead.set(row.lead_id, sentTs)
      }
    }
  } catch {
    // Non bloquant
  }

  const triggeredWaves: { leadId: string; waveNumber: number; sentCount: number }[] = []
  let skippedCount = 0
  let autoClosedStalePartialCount = 0
  let reconfirmEmailsSentCount = 0

  for (const lead of availableLeads) {
    const takenSlots = realTakenByLead.get(lead.id) || 0
    const maxSlots =
      typeof lead.max_slots === "number"
        ? lead.max_slots
        : lead.segment === "B2B"
          ? MAX_SLOTS_B2B
          : MAX_SLOTS_B2C
    const createdAtMs = new Date(lead.created_at).getTime()
    const publishedAtMs = getLeadPublishedAtMs(lead)
    const publishedAgeMs = Math.max(0, now - publishedAtMs)
    const reconfirmedAtMs = lead.reconfirmed_at ? new Date(lead.reconfirmed_at).getTime() : null
    const lastRealBuyAtMs = lastRealBuyAtByLead.get(lead.id) || null

    // 1. Clôture douce des B2C partiels uniquement après 7 jours (depuis publication/reconfirmation) ET >= 48 h de calme depuis le dernier achat
    if (
      shouldAutoClosePartialLead({
        segment: lead.segment,
        createdAtMs,
        publishedAtMs,
        reconfirmedAtMs,
        takenSlots,
        maxSlots,
        lastPurchaseAtMs: lastRealBuyAtMs,
        nowMs: now,
      })
    ) {
      const { error: closeErr } = await supabase
        .from("leads")
        .update({
          marketplace_status: "sold_out",
          stale_closed_at: nowIso,
        })
        .eq("id", lead.id)
      if (closeErr && (closeErr.code === "42703" || closeErr.message?.includes("stale_closed_at"))) {
        await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", lead.id)
      }
      autoClosedStalePartialCount++
      continue
    }

    // 2. À H+72h après publication sans aucun achat (0/3), envoyer l'e-mail de reconfirmation prospect en 1 clic
    if (publishedAgeMs >= RECONFIRM_PROTOCOL_AGE_MS) {
      const meta =
        lead.qualification_metadata && typeof lead.qualification_metadata === "object"
          ? (lead.qualification_metadata as Record<string, unknown>)
          : {}
      const alreadySentReconfirm = Boolean(lead.reconfirm_sent_at || meta.reconfirm_sent_at)

      if (takenSlots === 0 && !alreadySentReconfirm && lead.email) {
        const resReconfirm = await sendProspectReconfirmEmail({
          leadId: lead.id,
          email: lead.email,
          firstName: lead.first_name,
          city: lead.city,
          province: lead.province,
        })
        if (resReconfirm.sent) {
          reconfirmEmailsSentCount++
        }
        const { error: recErr } = await supabase
          .from("leads")
          .update({
            reconfirm_sent_at: nowIso,
            qualification_metadata: { ...meta, reconfirm_sent_at: nowIso },
          })
          .eq("id", lead.id)
        if (recErr && (recErr.code === "42703" || recErr.message?.includes("reconfirm_sent_at"))) {
          await supabase
            .from("leads")
            .update({
              qualification_metadata: { ...meta, reconfirm_sent_at: nowIso },
            })
            .eq("id", lead.id)
        }
      }
    }

    const currentWave = Math.max(
      Number(lead.relance_wave) || 0,
      maxDispatchedWaveByLead.get(lead.id) || 0
    )
    const lastRelanceTime = Math.max(
      lead.last_relance_at ? new Date(lead.last_relance_at).getTime() : 0,
      lastDispatchAtByLead.get(lead.id) || 0,
      publishedAtMs
    )

    const businessElapsedMs = getBusinessMsBetween(lastRelanceTime, now)

    // Vérifier si une relance doit être déclenchée (cascade en heures ouvrées T+0 / +6h / +24h) :
    let nextWave = 0

    if (currentWave === 0) {
      // Vague 1 initiale n'a jamais été envoyée
      nextWave = 1
    } else if (currentWave === 1 && businessElapsedMs >= COOLDOWN_WAVE_1_TO_2_MS) {
      // 6 heures ouvrées écoulées depuis la Vague 1 -> Vague 2
      nextWave = 2
    } else if (currentWave === 2 && businessElapsedMs >= COOLDOWN_WAVE_2_TO_3_MS) {
      // 24 heures ouvrées écoulées depuis la Vague 2 -> Vague 3 (~J+2 / J+3)
      nextWave = 3
    }

    if (nextWave > 0 && nextWave <= 3) {
      try {
        const result = await dispatchLeadWave(lead.id, nextWave)
        if (result.success && result.sentCount > 0) {
          triggeredWaves.push({
            leadId: lead.id,
            waveNumber: nextWave,
            sentCount: result.sentCount,
          })
        }
      } catch (waveErr) {
        console.error(`[Cron Relances] Erreur sur le lead #${lead.id}:`, waveErr)
      }
    } else {
      skippedCount++
    }
  }

  return {
    processedLeads: availableLeads.length,
    triggeredWaves,
    skippedLeadsCount: skippedCount,
    autoClosedStalePartialCount,
    reconfirmEmailsSentCount,
    referralEmailsSentCount,
  }
}

// ==============================================================================
// 7. FONCTIONS DE SUPERVISION DASHBOARD : PLANNING, HISTORIQUE ET STATISTIQUES
// ==============================================================================

/**
 * Exclut les domaines fictifs / de démonstration sans serveur mail (ex. @aegissolaire-pro.be)
 * afin d'éviter les bounce/delivery_delayed sur Resend.
 */
export function isUnreachableMockEmail(email: string | null | undefined): boolean {
  const normalized = (email || "").toLowerCase().trim()
  if (!normalized || !normalized.includes("@")) return true
  const domain = normalized.split("@")[1] || ""
  return (
    domain === "aegissolaire-pro.be" ||
    domain === "example.com" ||
    domain === "example.org" ||
    domain === "example.net" ||
    domain === "test.com" ||
    domain.endsWith(".local") ||
    domain.endsWith(".invalid")
  )
}

/**
 * Détermine avec certitude si un partenaire ou un envoi relève des tests internes / DEV TEST
 */
export function isDevTestPartner(p: {
  is_test?: boolean
  isTest?: boolean
  company_name?: string | null
  companyName?: string | null
  email?: string | null
  emailTo?: string | null
} | null | undefined): boolean {
  if (!p) return false
  if (p.is_test || p.isTest) return true
  const company = (p.company_name || p.companyName || "").toLowerCase().trim()
  if (
    company.includes("test") ||
    company.includes("dev test") ||
    company.includes("mega solar") ||
    company.startsWith("dev-")
  ) return true
  const email = (p.email || p.emailTo || "").toLowerCase().trim()
  const testEmailEnv = (process.env.TEST_PARTNER_EMAIL || "").toLowerCase().trim()
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
  if (
    (testEmailEnv && email === testEmailEnv) ||
    adminEmails.includes(email) ||
    email === "fabrice.remacle@gmail.com" ||
    email === "mrnathanrem@gmail.com" ||
    email.includes("+test") ||
    email.startsWith("test@") ||
    email.endsWith("@test.com")
  ) {
    return true
  }
  return false
}

export interface UpcomingRelanceItem {
  id: string
  leadId: string
  lead: {
    id: string
    segment: string
    province: string | null
    city: string | null
    postalCode: string | null
    surfaceArea: number | null
    surfaceType: string | null
    annualElectricityBill: number | null
    estimatedPowerKwc: number
    marginEur: number
    creditCost: number
    createdAt: string
  }
  currentWave: number
  nextWave: number
  lastRelanceAt: string | null
  scheduledAt: string
  effectiveSendAt: string
  msRemaining: number
  isReadyNow: boolean
  takenSlots: number
  maxSlots: number
  remainingSlots: number
  targetCount: number
  targetRecipients: {
    partnerId: string
    companyName: string
    email: string
    phone: string | null
    credits: number
    score: number
    tier: MatchingTier
    isExactProvince: boolean
    hasEnoughCredits: boolean
    isTest?: boolean
  }[]
  buyers: {
    partnerId: string
    companyName: string
    email?: string
    purchasedAt: string
  }[]
  sentRecipients: {
    partnerId: string
    companyName: string
    email: string
    waveNumber: number
    sentAt: string
  }[]
  subjectPreview: string
}

export interface SentRelanceItem {
  id: string
  leadId: string
  partnerId: string
  waveNumber: number
  emailTo: string
  emailSubject: string
  matchingScore: number
  matchingTier: string
  creditsAtSend: number
  sentAt: string
  openedAt: string | null
  clickedAt: string | null
  partner: {
    id: string
    companyName: string
    email: string
    phone: string | null
    currentCredits: number
  } | null
  lead: {
    id: string
    segment: string
    province: string | null
    city: string | null
    postalCode: string | null
    marketplaceStatus: string
    creditCost: number
    estimatedPowerKwc: number
    takenSlots: number
    maxSlots: number
    buyers?: {
      partnerId: string
      companyName: string
      purchasedAt: string
    }[]
  } | null
  outcome: "purchased_by_recipient" | "purchased_by_other" | "available" | "sold_out"
  isTest?: boolean
}

export interface RelancesOverviewStats {
  totalSentCount: number
  sentTodayCount: number
  sentWave1Count: number
  sentWave2Count: number
  sentWave3Count: number
  upcomingWavesCount: number
  upcomingRecipientsCount: number
  nextScheduledInMs: number | null
  activeCascadesCount: number
  readyNowCount: number
  conversionRatePercent: number
  isBusinessHoursNow: boolean
}

/**
 * Ajuste une date selon les plages horaires ouvrées en Belgique (Europe/Brussels)
 */
export function getEffectiveSendTime(targetDate: Date): Date {
  return new Date(addBusinessMs(targetDate.getTime(), 0))
}

const getUpcomingRelancesScheduleCached = cache(async (): Promise<UpcomingRelanceItem[]> => {
  const supabase = createServiceRoleClient()
  const now = Date.now()

  // 1. Récupérer tous les leads en statut 'available'
  const { data: availableLeads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("marketplace_status", "available")
    .order("created_at", { ascending: false })

  if (error || !availableLeads || availableLeads.length === 0) {
    return []
  }

  const availableLeadIds = availableLeads.map((l) => l.id)

  // 2. Précharger en parallèle achats, relances, envois du jour, télémétrie et partenaires (zéro boucle N+1)
  const [purchasesRes, dispatchesRes, dailyDispatchesRes, telemetryRes, partnersRes] = await Promise.all([
    supabase
      .from("lead_purchases")
      .select("lead_id, partner_id, purchased_at, partners(id, company_name, email, is_test)")
      .in("lead_id", availableLeadIds)
      .order("purchased_at", { ascending: true }),
    supabase
      .from("lead_relance_dispatches")
      .select("id, lead_id, partner_id, wave_number, email_to, sent_at, partners(id, company_name, email, is_test)")
      .in("lead_id", availableLeadIds)
      .order("sent_at", { ascending: false }),
    Promise.resolve(
      supabase
        .from("lead_relance_dispatches")
        .select("partner_id")
        .gte("sent_at", getStartOfBrusselsDayIso(now))
    ).catch(() => ({ data: [] as any[], error: null })),
    Promise.resolve(
      supabase
        .from("partner_activity_events")
        .select("lead_id, partner_id, partner_email, event_type, duration_ms")
        .in("lead_id", availableLeadIds)
    ).catch(() => ({ data: [] as any[], error: null })),
    supabase
      .from("partners")
      .select("id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture, is_test, email_notifications_enabled, email_relances_enabled"),
  ])

  const allPurchases = (purchasesRes.data as any[]) || []
  const purchasesByLead = new Map<string, { partnerId: string; companyName: string; email: string; purchasedAt: string }[]>()
  const rawPurchasesByLeadId = new Map<string, any[]>()

  for (const p of allPurchases) {
    const rawList = rawPurchasesByLeadId.get(p.lead_id) || []
    rawList.push(p)
    rawPurchasesByLeadId.set(p.lead_id, rawList)

    const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
    if (isDevTestPartner({ ...partnerObj, email: partnerObj?.email })) {
      continue
    }
    const list = purchasesByLead.get(p.lead_id) || []
    list.push({
      partnerId: p.partner_id,
      companyName: partnerObj?.company_name || "Installateur Partenaire",
      email: partnerObj?.email || "",
      purchasedAt: p.purchased_at,
    })
    purchasesByLead.set(p.lead_id, list)
  }

  const allDispatches = (dispatchesRes.data as any[]) || []
  const dispatchesByLead = new Map<string, { partnerId: string; companyName: string; email: string; waveNumber: number; sentAt: string }[]>()
  const rawDispatchesByLeadId = new Map<string, { partner_id: string; wave_number: number }[]>()

  for (const d of allDispatches) {
    const rawList = rawDispatchesByLeadId.get(d.lead_id) || []
    rawList.push({ partner_id: d.partner_id, wave_number: d.wave_number })
    rawDispatchesByLeadId.set(d.lead_id, rawList)

    const partnerObj = Array.isArray(d.partners) ? d.partners[0] : d.partners
    if (isDevTestPartner({ ...partnerObj, emailTo: d.email_to })) {
      continue
    }
    const list = dispatchesByLead.get(d.lead_id) || []
    list.push({
      partnerId: d.partner_id,
      companyName: partnerObj?.company_name || d.email_to,
      email: d.email_to,
      waveNumber: d.wave_number,
      sentAt: d.sent_at,
    })
    dispatchesByLead.set(d.lead_id, list)
  }

  const telemetryByLeadId = new Map<string, any[]>()
  for (const ev of (telemetryRes as any)?.data || []) {
    if (!ev.lead_id) continue
    const list = telemetryByLeadId.get(ev.lead_id) || []
    list.push(ev)
    telemetryByLeadId.set(ev.lead_id, list)
  }

  const dailyDispatchCountsByPartnerId = new Map<string, number>()
  for (const row of (dailyDispatchesRes as any)?.data || []) {
    if (!row.partner_id) continue
    const pId = String(row.partner_id)
    dailyDispatchCountsByPartnerId.set(pId, (dailyDispatchCountsByPartnerId.get(pId) || 0) + 1)
  }

  const velocityByPartnerId = await loadPartnerVelocityMap(supabase)
  const preloaded: PreloadedRelanceWaveData = {
    allPartners: partnersRes.data || [],
    purchasesByLeadId: rawPurchasesByLeadId,
    dispatchesByLeadId: rawDispatchesByLeadId,
    dailyDispatchCountsByPartnerId,
    telemetryByLeadId,
    velocityByPartnerId,
  }

  const upcomingItems: UpcomingRelanceItem[] = []

  for (const lead of availableLeads) {
    const currentWave = Number(lead.relance_wave) || 0
    if (currentWave >= 3) {
      // Toutes les vagues ont déjà été envoyées pour ce lead
      continue
    }

    const nextWave = currentWave + 1
    const isB2B = lead.segment === "B2B"
    const maxSlots =
      typeof lead.max_slots === "number"
        ? lead.max_slots
        : isB2B
          ? MAX_SLOTS_B2B
          : MAX_SLOTS_B2C
    const leadBuyers = purchasesByLead.get(lead.id) || []
    const takenSlots = leadBuyers.length

    if (takenSlots >= maxSlots) {
      // Déjà vendu complètement
      continue
    }

    const remainingSlots = Math.max(0, maxSlots - takenSlots)

    // Calculer la date théorique selon les cooldowns ouvrés (+6h / +24h ouvrées)
    const publishedAtMs = getLeadPublishedAtMs(lead)
    let scheduledTimestamp = now
    if (currentWave === 0) {
      // Vague 1 : immédiat à la publication (ou maintenant si publication passée)
      scheduledTimestamp = publishedAtMs
    } else if (currentWave === 1) {
      // Vague 2 : +6h ouvrées après Vague 1
      const base = lead.last_relance_at ? new Date(lead.last_relance_at).getTime() : publishedAtMs
      scheduledTimestamp = addBusinessMs(base, COOLDOWN_WAVE_1_TO_2_MS)
    } else if (currentWave === 2) {
      // Vague 3 : +24h ouvrées après Vague 2 (~J+2 / J+3)
      const base = lead.last_relance_at ? new Date(lead.last_relance_at).getTime() : publishedAtMs
      scheduledTimestamp = addBusinessMs(base, COOLDOWN_WAVE_2_TO_3_MS)
    }

    const rawScheduledDate = new Date(scheduledTimestamp)
    const effectiveSendDate = getEffectiveSendTime(
      rawScheduledDate.getTime() < now ? new Date(now) : rawScheduledDate
    )
    const msRemaining = Math.max(0, effectiveSendDate.getTime() - now)
    const isReadyNow = now >= scheduledTimestamp && isWithinBusinessHours(new Date(now))

    // Calculer les données financières
    const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)
    const financials = calculateMarketplaceFinancials({
      segment: lead.segment,
      surfaceArea: lead.surface_area_m2 || lead.surface_area,
      surfaceType: lead.surface_type,
      roofMaterial: lead.roof_material,
      annualBill: lead.annual_bill_eur || lead.annual_electricity_bill,
      creditCost,
      estimatedPowerKwc: lead.estimated_power_kwc,
      projectDetails: lead.project_details || lead.message,
      qualificationMetadata: lead.qualification_metadata,
    })

    // Obtenir la liste des installateurs cibles éligibles (données préchargées en mémoire)
    const candidates = await getEligiblePartnersForWave(supabase, lead, nextWave, preloaded)
    if (candidates.length === 0) {
      continue
    }

    const targetRecipients = candidates.map((c) => ({
      partnerId: c.partner.id,
      companyName: c.partner.company_name,
      email: c.partner.email,
      phone: c.partner.phone || null,
      credits: c.partner.credits || 0,
      score: c.scoreInfo.score,
      tier: c.scoreInfo.tier,
      isExactProvince: c.scoreInfo.isExactProvince,
      hasEnoughCredits: c.scoreInfo.hasEnoughCredits,
      isTest: isDevTestPartner({ ...c.partner, email: c.partner.email }),
    }))

    // Calcul du quota réel ciblé (sans compter DEV TEST)
    const realRecipientsCount = targetRecipients.filter((r) => !r.isTest).length

    // Sujet d'email prévisionnel
    const subjectPreview = buildLeadEmailSubject({
      partner: {
        id: targetRecipients[0]?.partnerId || "",
        companyName: targetRecipients[0]?.companyName || "Installateur",
        credits: targetRecipients[0]?.credits || 0,
      },
      lead: {
        id: lead.id,
        segment: lead.segment,
        province: lead.province,
        provinceFreeText: lead.province_free_text,
        postalCode: lead.postal_code,
        city: lead.city,
        surfaceType: lead.surface_type,
        surfaceArea: lead.surface_area_m2 || lead.surface_area || 0,
        roofMaterial: lead.roof_material,
        annualElectricityBill: lead.annual_bill_eur || lead.annual_electricity_bill || 0,
        estimatedPowerKwc: financials.estimatedPowerKwc,
        firstName: lead.first_name,
        createdAt: lead.created_at,
      },
      waveNumber: nextWave,
      takenSlots,
      maxSlots,
      creditCost,
      financials,
    })

    upcomingItems.push({
      id: `${lead.id}-wave-${nextWave}`,
      leadId: lead.id,
      lead: {
        id: lead.id,
        segment: lead.segment,
        province: lead.province,
        city: lead.city,
        postalCode: lead.postal_code,
        surfaceArea: lead.surface_area_m2 || lead.surface_area || null,
        surfaceType: lead.surface_type,
        annualElectricityBill: lead.annual_bill_eur || lead.annual_electricity_bill || null,
        estimatedPowerKwc: financials.estimatedPowerKwc,
        marginEur: financials.estimatedInstallerMargin,
        creditCost,
        createdAt: lead.created_at,
      },
      currentWave,
      nextWave,
      lastRelanceAt: lead.last_relance_at,
      scheduledAt: rawScheduledDate.toISOString(),
      effectiveSendAt: effectiveSendDate.toISOString(),
      msRemaining,
      isReadyNow,
      takenSlots,
      maxSlots,
      remainingSlots,
      targetCount: realRecipientsCount,
      targetRecipients,
      buyers: leadBuyers,
      sentRecipients: dispatchesByLead.get(lead.id) || [],
      subjectPreview,
    })
  }

  // Trier par échéance la plus proche (ceux prêts ou qui partent en premier)
  upcomingItems.sort((a, b) => a.msRemaining - b.msRemaining)

  return upcomingItems
})

/**
 * Récupère le planning détaillé des relances programmées à venir (quels mails, à qui, dans combien de temps)
 */
export async function getUpcomingRelancesSchedule(): Promise<UpcomingRelanceItem[]> {
  return getUpcomingRelancesScheduleCached()
}

/**
 * Récupère l'historique de tous les e-mails de relance déjà envoyés (qui, quand, quoi, résultat)
 */
export async function getSentRelancesHistory(limit = 100): Promise<SentRelanceItem[]> {
  const supabase = createServiceRoleClient()

  let dispatches: any[] = []
  try {
    const { data, error } = await supabase
      .from("lead_relance_dispatches")
      .select(`
        id,
        lead_id,
        partner_id,
        wave_number,
        email_to,
        email_subject,
        matching_score,
        matching_tier,
        credits_at_send,
        sent_at,
        opened_at,
        clicked_at,
        partners(id, company_name, email, phone, credits, is_test),
        leads(id, segment, province, city, postal_code, marketplace_status, credit_cost, surface_area, annual_electricity_bill)
      `)
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (!error && data) {
      dispatches = data
    }
  } catch (err) {
    console.error("[getSentRelancesHistory] error:", err)
    return []
  }

  if (dispatches.length === 0) {
    return []
  }

  // Vérifier les achats réels (hors comptes de test) pour déterminer l'outcome
  const leadIds = Array.from(new Set(dispatches.map((d: any) => d.lead_id)))
  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("lead_id, partner_id, purchased_at, partners(id, company_name, email, is_test)")
    .in("lead_id", leadIds)
    .order("purchased_at", { ascending: true })

  const purchasesMap = new Map<string, { partnerId: string; companyName: string; purchasedAt: string }[]>()
  for (const p of (purchases as any[]) || []) {
    const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
    if (isDevTestPartner({ ...partnerObj, email: partnerObj?.email })) {
      continue
    }
    const list = purchasesMap.get(p.lead_id) || []
    list.push({
      partnerId: p.partner_id,
      companyName: partnerObj?.company_name || "Installateur Partenaire",
      purchasedAt: p.purchased_at,
    })
    purchasesMap.set(p.lead_id, list)
  }

  return dispatches.map((d: any) => {
    const lead = d.leads
    const buyersList = purchasesMap.get(d.lead_id) || []
    const buyerPartnerIds = buyersList.map((b) => b.partnerId)
    const isB2B = lead?.segment === "B2B"
    const maxSlots =
      typeof lead?.max_slots === "number"
        ? lead.max_slots
        : isB2B
          ? MAX_SLOTS_B2B
          : MAX_SLOTS_B2C
    const takenSlots = buyersList.length
    const isTest = isDevTestPartner({ ...d.partners, emailTo: d.email_to })

    let outcome: "purchased_by_recipient" | "purchased_by_other" | "available" | "sold_out" = "available"
    if (buyerPartnerIds.includes(d.partner_id)) {
      outcome = "purchased_by_recipient"
    } else if (takenSlots >= maxSlots || lead?.marketplace_status === "sold_out") {
      outcome = "sold_out"
    } else if (takenSlots > 0) {
      outcome = "purchased_by_other"
    }

    const financials = calculateMarketplaceFinancials({
      segment: lead?.segment || "B2C",
      surfaceArea: lead?.surface_area || 0,
      surfaceType: lead?.surface_type,
      roofMaterial: lead?.roof_material,
      annualBill: lead?.annual_electricity_bill || 0,
      creditCost: lead?.credit_cost || 3,
      estimatedPowerKwc: lead?.estimated_power_kwc,
      projectDetails: lead?.project_details || lead?.message,
      qualificationMetadata: lead?.qualification_metadata,
    })

    return {
      id: d.id,
      leadId: d.lead_id,
      partnerId: d.partner_id,
      waveNumber: d.wave_number,
      emailTo: d.email_to,
      emailSubject: d.email_subject,
      matchingScore: d.matching_score,
      matchingTier: d.matching_tier,
      creditsAtSend: d.credits_at_send,
      sentAt: d.sent_at,
      openedAt: d.opened_at,
      clickedAt: d.clicked_at,
      partner: d.partners
        ? {
            id: d.partners.id,
            companyName: d.partners.company_name,
            email: d.partners.email,
            phone: d.partners.phone || null,
            currentCredits: d.partners.credits || 0,
          }
        : null,
      lead: lead
        ? {
            id: lead.id,
            segment: lead.segment,
            province: lead.province,
            city: lead.city,
            postalCode: lead.postal_code,
            marketplaceStatus: lead.marketplace_status,
            creditCost: lead.credit_cost || 2,
            estimatedPowerKwc: financials.estimatedPowerKwc,
            takenSlots,
            maxSlots,
            buyers: buyersList,
          }
        : null,
      outcome,
      isTest,
    }
  })
}

/**
 * Calcule les indicateurs statistiques Bento globaux des relances
 */
export async function getRelancesOverviewStats(
  precomputedSchedule?: UpcomingRelanceItem[]
): Promise<RelancesOverviewStats> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const startOfDay = getStartOfBrusselsDayIso(now.getTime())

  let totalSent = 0
  let sentToday = 0
  let sentW1 = 0
  let sentW2 = 0
  let sentW3 = 0
  let purchasedFromRelanceCount = 0

  const schedulePromise = precomputedSchedule
    ? Promise.resolve(precomputedSchedule)
    : getUpcomingRelancesSchedule()

  const statsPromise = (async () => {
    try {
      const [dispatchesRes, purchasesRes] = await Promise.all([
        supabase
          .from("lead_relance_dispatches")
          .select("id, wave_number, sent_at, lead_id, partner_id, email_to, partners(is_test, company_name)"),
        supabase
          .from("lead_purchases")
          .select("lead_id, partner_id, partners(is_test, company_name)"),
      ])

      const allDispatches = dispatchesRes.data
      const purchases = purchasesRes.data

      if (allDispatches) {
        // Exclure les envois de test des calculs statistiques de conversion et de volume
        const realDispatches = allDispatches.filter((d: any) => {
          const isTest = isDevTestPartner({
            is_test: d.partners?.is_test,
            company_name: d.partners?.company_name,
            emailTo: d.email_to,
          })
          return !isTest
        })

        totalSent = realDispatches.length
        sentToday = realDispatches.filter((d: any) => d.sent_at >= startOfDay).length
        sentW1 = realDispatches.filter((d: any) => d.wave_number === 1).length
        sentW2 = realDispatches.filter((d: any) => d.wave_number === 2).length
        sentW3 = realDispatches.filter((d: any) => d.wave_number === 3).length

        // Taux d'attribution (uniquement sur les vrais achats et vrais dispatches)
        if (purchases) {
          const realPurchases = purchases.filter(
            (p: any) => !p.partners?.is_test && !p.partners?.company_name?.toLowerCase().includes("test")
          )
          const purchaseSet = new Set(realPurchases.map((p: any) => `${p.lead_id}:${p.partner_id}`))
          purchasedFromRelanceCount = realDispatches.filter((d: any) =>
            purchaseSet.has(`${d.lead_id}:${d.partner_id}`)
          ).length
        }
      }
    } catch {
      // Si la table est encore vide
    }
  })()

  const [, upcoming] = await Promise.all([statsPromise, schedulePromise])
  const upcomingWavesCount = upcoming.length
  let upcomingRecipientsCount = 0
  for (const item of upcoming) {
    const realCount = item.targetRecipients.filter((r) => !r.isTest).length
    upcomingRecipientsCount += realCount
  }

  const nextScheduledInMs = upcoming.length > 0 ? upcoming[0].msRemaining : null
  const readyNowCount = upcoming.filter((u) => u.isReadyNow).length

  // Leads uniques actuellement en cascade
  const activeCascadesCount = new Set(upcoming.map((u) => u.leadId)).size

  const conversionRatePercent = totalSent > 0 ? Math.round((purchasedFromRelanceCount / totalSent) * 100) : 0

  return {
    totalSentCount: totalSent,
    sentTodayCount: sentToday,
    sentWave1Count: sentW1,
    sentWave2Count: sentW2,
    sentWave3Count: sentW3,
    upcomingWavesCount,
    upcomingRecipientsCount,
    nextScheduledInMs,
    activeCascadesCount,
    readyNowCount,
    conversionRatePercent,
    isBusinessHoursNow: isWithinBusinessHours(),
  }
}

// ==============================================================================
// 8. ONBOARDING & RATTRAPAGE DES LEADS DISPONIBLES (CATCH-UP INSTALLATEURS)
// ==============================================================================

export interface AvailableLeadSummary {
  id: string
  segment: "B2B" | "B2C" | string
  province: string
  provinceLabel: string
  city: string | null
  postalCode: string | null
  surfaceArea: number
  surfaceType: string
  estimatedPowerKwc: number
  annualBill: number
  estimatedSavings: number
  creditCost: number
  remainingSlots: number
  maxSlots: number
  matchingScore: number
  matchingTier: MatchingTier
  createdAt: string
}

/**
 * Récupère les leads disponibles (non épuisés) correspondant aux zones et segments d'un partenaire,
 * triés par pertinence (Tier 1 local en premier).
 * Utile pour l'intégration immédiate d'un nouvel installateur ou le renvoi d'e-mail de bienvenue.
 */
export async function getAvailableMatchingLeadsForPartner(
  supabase: ReturnType<typeof createServiceRoleClient>,
  partner: {
    id: string
    email?: string | null
    credits?: number | null
    segment?: string | null
    target_provinces?: string[] | null
    target_surfaces?: string[] | null
    min_facture?: number | null
  },
  limit = 3
): Promise<AvailableLeadSummary[]> {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("marketplace_status", "available")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error || !leads || leads.length === 0) return []

  const leadIds = leads.map((l) => l.id)

  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("lead_id, partner_id, partners(is_test, company_name)")
    .in("lead_id", leadIds)

  const purchasesByLead = new Map<string, number>()
  const partnerPurchasedLeads = new Set<string>()

  for (const p of purchases || []) {
    const isTest = (p as any).partners?.is_test || (p as any).partners?.company_name?.toLowerCase().includes("test")
    if (!isTest) {
      purchasesByLead.set(p.lead_id, (purchasesByLead.get(p.lead_id) || 0) + 1)
    }
    if (p.partner_id === partner.id) {
      partnerPurchasedLeads.add(p.lead_id)
    }
  }

  const partnerForScore = {
    id: partner.id,
    email: partner.email || null,
    credits: partner.credits || 0,
    segment: getEffectivePartnerSegment(partner),
    target_provinces: partner.target_provinces || [],
    target_surfaces: partner.target_surfaces || [],
    min_facture: partner.min_facture || null,
  }

  const candidates: AvailableLeadSummary[] = []

  for (const lead of leads) {
    if (partnerPurchasedLeads.has(lead.id)) continue

    const isB2B = lead.segment === "B2B"
    const maxSlots =
      typeof lead.max_slots === "number"
        ? lead.max_slots
        : isB2B
          ? MAX_SLOTS_B2B
          : MAX_SLOTS_B2C
    const takenSlots = purchasesByLead.get(lead.id) || 0
    if (takenSlots >= maxSlots) continue

    const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)
    const scoreInfo = calculatePartnerMatchScore(partnerForScore, {
      segment: lead.segment,
      province: lead.province,
      surface_type: lead.surface_type,
      annual_electricity_bill: lead.annual_electricity_bill,
      credit_cost: creditCost,
    })

    if (scoreInfo.score === 0 || !scoreInfo.segmentMatch) continue

    const financials = calculateMarketplaceFinancials({
      segment: lead.segment,
      surfaceArea: lead.surface_area_m2 || lead.surface_area || 0,
      surfaceType: lead.surface_type,
      roofMaterial: lead.roof_material,
      annualBill: lead.annual_bill_eur || lead.annual_electricity_bill || 0,
      creditCost,
      estimatedPowerKwc: lead.estimated_power_kwc,
      projectDetails: lead.project_details || lead.message,
      qualificationMetadata: lead.qualification_metadata,
    })

    const provinceLabel = getProvinceDisplayLabel(lead.province, lead.province_free_text)

    candidates.push({
      id: lead.id,
      segment: lead.segment,
      province: lead.province,
      provinceLabel,
      city: lead.city || null,
      postalCode: lead.postal_code || null,
      surfaceArea: financials.normalizedSurfaceAreaM2,
      surfaceType: lead.surface_type,
      estimatedPowerKwc: financials.estimatedPowerKwc,
      annualBill: financials.normalizedAnnualBill,
      estimatedSavings: financials.revenueEstimatePerYear,
      creditCost,
      remainingSlots: Math.max(0, maxSlots - takenSlots),
      maxSlots,
      matchingScore: scoreInfo.score,
      matchingTier: scoreInfo.tier,
      createdAt: lead.created_at,
    })
  }

  // Trier par pertinence : Tier 1 en premier, puis Tier 2, puis meilleur score, puis date récente
  candidates.sort((a, b) => {
    if (a.matchingTier !== b.matchingTier) {
      if (a.matchingTier === "tier_1") return -1
      if (b.matchingTier === "tier_1") return 1
      if (a.matchingTier === "tier_2") return -1
      if (b.matchingTier === "tier_2") return 1
    }
    if (b.matchingScore !== a.matchingScore) {
      return b.matchingScore - a.matchingScore
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return candidates.slice(0, limit)
}

/**
 * Journalise le dispatch de rattrapage pour un partenaire nouvellement approuvé
 */
export async function recordCatchUpDispatches(
  supabase: ReturnType<typeof createServiceRoleClient>,
  partner: { id: string; email: string; credits?: number | null },
  leads: AvailableLeadSummary[],
  emailSubject: string
): Promise<void> {
  if (!leads || leads.length === 0) return

  for (const lead of leads) {
    try {
      await supabase.from("lead_relance_dispatches").insert({
        lead_id: lead.id,
        partner_id: partner.id,
        wave_number: 1,
        email_to: partner.email,
        email_subject: emailSubject,
        matching_score: lead.matchingScore,
        matching_tier: lead.matchingTier,
        credits_at_send: partner.credits || 0,
        sent_at: new Date().toISOString(),
        metadata: { trigger: "installer_approval_catchup" },
      })
    } catch {
      // Tolérance si la contrainte unique uq_lead_partner_wave existe déjà
    }
  }
}

// ==============================================================================
// 9. ALERTE SMS OPTIONNELLE (TWILIO SI CONFIGURÉ) & MOTEUR AUTO-PILOT
// ==============================================================================

async function sendOptionalSmsUrgencyAlert(params: {
  toPhone: string
  city: string
  segment: string
  powerKwc: number
  creditCost: number
}): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !fromNumber || !params.toPhone) return

  const cleanPhone = params.toPhone.replace(/[^+\d]/g, "")
  if (!cleanPhone.startsWith("+") || cleanPhone.length < 10) return

  const kwcLabel = params.powerKwc > 0 ? `${params.powerKwc} kWc` : "PV"
  const body = `Aegis Solaire: Nouveau chantier ${params.segment} ${kwcLabel} a ${params.city} (${params.creditCost} cr.). Consultez votre espace partenaire.`
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: cleanPhone,
        Body: body,
      }).toString(),
    }
  )
}

export interface AutoMatchResult {
  leadId: string
  allocatedCount: number
  isFullySold: boolean
  allocations: { partnerId: string; companyName: string; mode: "wallet" | "mollie_mandate"; exclusive: boolean }[]
}

/**
 * Exécuté immédiatement à la publication d'un lead :
 * attribue automatiquement le dossier aux partenaires ayant activé l'Auto-Pilot
 * dans le strict respect de leur plafond hebdomadaire (`auto_buy_weekly_cap`),
 * de leurs critères géographiques/techniques, et de leur solde (wallet ou mandat 1-clic).
 */
export async function runAutoMatchForLead(leadId: string): Promise<AutoMatchResult> {
  const supabase = createServiceRoleClient()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadErr || !lead || lead.marketplace_status !== "available") {
    return { leadId, allocatedCount: 0, isFullySold: false, allocations: [] }
  }

  const isB2B = lead.segment === "B2B"
  const maxSlots =
    typeof lead.max_slots === "number"
      ? lead.max_slots
      : isB2B
        ? MAX_SLOTS_B2B
        : MAX_SLOTS_B2C
  const creditCost = Number(lead.credit_cost) || calculateLeadCreditCost(lead)

  // 1. Récupérer les achats actuels réels
  const { data: existingPurchases } = await supabase
    .from("lead_purchases")
    .select("partner_id, purchased_at, partners(id, company_name, is_test)")
    .eq("lead_id", leadId)

  const existingBuyerIds = new Set((existingPurchases || []).map((p: any) => p.partner_id))
  const realBuyers: LeadSaleBuyerSummary[] = (existingPurchases || [])
    .filter((p: any) => {
      const pRel = Array.isArray(p.partners) ? p.partners[0] : p.partners
      return !pRel?.is_test && !pRel?.company_name?.toLowerCase().includes("test")
    })
    .map((p: any) => {
      const pRel = Array.isArray(p.partners) ? p.partners[0] : p.partners
      return {
        partnerId: p.partner_id,
        companyName: pRel?.company_name || "Partenaire",
        purchasedAt: p.purchased_at,
        isTest: false,
      }
    })

  let takenSlots = realBuyers.length
  if (takenSlots >= maxSlots) {
    return { leadId, allocatedCount: 0, isFullySold: true, allocations: [] }
  }

  // 2. Récupérer les partenaires Auto-Pilot actifs (résilient si colonnes non migrées)
  const { data: autoPartners, error: partnersErr } = await supabase
    .from("partners")
    .select(
      "id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture, is_test, auto_buy_enabled, auto_buy_weekly_cap, auto_buy_include_b2c_exclusive, mollie_customer_id, mollie_mandate_id, mollie_mandate_status"
    )
    .eq("auto_buy_enabled", true)

  if (partnersErr) {
    // Migration 202611180001 non encore appliquée ou aucun partenaire éligible
    return { leadId, allocatedCount: 0, isFullySold: false, allocations: [] }
  }

  const eligiblePool = (autoPartners || []).filter(
    (p: any) =>
      p.email &&
      p.email.includes("@") &&
      !isUnreachableMockEmail(p.email) &&
      !isDevTestPartner(p) &&
      !existingBuyerIds.has(p.id)
  )

  if (eligiblePool.length === 0) {
    return { leadId, allocatedCount: 0, isFullySold: false, allocations: [] }
  }

  // 3. Compter les achats des 7 derniers jours par partenaire pour appliquer le cap hebdomadaire
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const partnerIds = eligiblePool.map((p: any) => p.id)
  const weeklyCounts = new Map<string, number>()

  try {
    const { data: recentPurchases } = await supabase
      .from("lead_purchases")
      .select("partner_id")
      .in("partner_id", partnerIds)
      .gte("purchased_at", since7d)

    for (const row of recentPurchases || []) {
      weeklyCounts.set(row.partner_id, (weeklyCounts.get(row.partner_id) || 0) + 1)
    }
  } catch {
    // Non bloquant
  }

  const annualBill = Number(lead.annual_bill_eur || lead.annual_electricity_bill) || 0
  const filteredCandidates = eligiblePool
    .filter((partner: any) => {
      const cap = Math.max(1, Number(partner.auto_buy_weekly_cap) || 3)
      const currentWeekCount = weeklyCounts.get(partner.id) || 0
      if (currentWeekCount >= cap) return false

      const effectiveSeg = getEffectivePartnerSegment(partner)
      if (effectiveSeg !== "BOTH" && effectiveSeg !== lead.segment) return false

      const provinces = Array.isArray(partner.target_provinces) ? partner.target_provinces : []
      if (provinces.length > 0 && lead.province && !provinces.includes(lead.province)) {
        return false
      }

      if (!doesSurfaceMatchPreference(lead.surface_type, partner.target_surfaces)) {
        return false
      }

      if (partner.min_facture && annualBill > 0 && annualBill < Number(partner.min_facture)) {
        return false
      }

      return true
    })
    .sort((a: any, b: any) => {
      // Équité Round-Robin : celui qui a reçu le moins de leads cette semaine passe en premier
      const countDiff = (weeklyCounts.get(a.id) || 0) - (weeklyCounts.get(b.id) || 0)
      if (countDiff !== 0) return countDiff
      // Priorité au portefeuille crédits prépayés (exécution atomique immédiate)
      return (b.credits || 0) - (a.credits || 0)
    })

  const allocations: AutoMatchResult["allocations"] = []

  for (const partner of filteredCandidates) {
    if (takenSlots >= maxSlots) break

    const wantsExclusiveB2C =
      !isB2B && takenSlots === 0 && Boolean(partner.auto_buy_include_b2c_exclusive)
    const requiredCredits = wantsExclusiveB2C ? B2C_EXCLUSIVE_CREDIT_COST : creditCost
    const hasWalletCredits = (partner.credits || 0) >= requiredCredits

    if (hasWalletCredits) {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        "purchase_marketplace_lead",
        {
          p_lead_id: leadId,
          p_partner_id: partner.id,
          p_exclusive: wantsExclusiveB2C,
        }
      )

      if (!rpcErr && rpcRes?.success) {
        const purchaseId = rpcRes.purchase_id as string | undefined
        if (purchaseId) {
          await supabase
            .from("lead_purchases")
            .update({ purchase_channel: "auto_pilot" })
            .eq("id", purchaseId)
        }

        allocations.push({
          partnerId: partner.id,
          companyName: partner.company_name || "Partenaire",
          mode: "wallet",
          exclusive: wantsExclusiveB2C || isB2B,
        })

        realBuyers.push({
          partnerId: partner.id,
          companyName: partner.company_name || "Partenaire",
          purchasedAt: new Date().toISOString(),
          isTest: false,
          isCurrentBuyer: true,
        })

        const postBuyNotifications: Promise<unknown>[] = []

        // Envoyer le dossier complet débloqué à l'installateur
        if (partner.email) {
          postBuyNotifications.push(
            sendLeadAssignedEmail(partner.email, {
              first_name: lead.first_name || "Prospect",
              last_name: lead.last_name || null,
              email: lead.email || "",
              phone: lead.phone || null,
              job_title: lead.job_title || "Contact projet",
              company: lead.company || null,
              surface_type: lead.surface_type || "toiture",
              surface_area: Number(lead.surface_area) || null,
              annual_electricity_bill: annualBill || null,
              project_timeline: lead.project_timeline || lead.timeframe || null,
              estimated_roi_years: lead.estimated_roi_years ?? null,
              estimated_savings: lead.estimated_savings ?? null,
              roof_image_url: getPrimaryLeadImageItem(lead)?.url ?? null,
              roof_image_is_ai_projection: Boolean(getPrimaryLeadImageItem(lead)?.isAiProjection),
              message: lead.project_details || lead.message || null,
            }).catch((e) => console.error("[Auto-Pilot] Erreur e-mail installateur:", e))
          )
        }

        if (wantsExclusiveB2C && lead.email) {
          const contactPref =
            lead.contact_preference ||
            ((lead.qualification_metadata as Record<string, unknown> | null)?.contactPreference as
              | string
              | undefined) ||
            null

          postBuyNotifications.push(
            sendProspectExclusiveMatchEmail({
              email: lead.email,
              firstName: lead.first_name,
              leadId: lead.id,
              city: lead.city,
              province: lead.province,
              estimatedPowerKwc: lead.estimated_power_kwc,
              surfaceArea: Number(lead.surface_area) || null,
              grd: lead.grd,
              contactPreference: contactPref,
              partnerCompany: partner.company_name || "Installateur RESCERT agréé",
              partnerEmail: partner.email,
              partnerPhone: partner.phone,
            }).catch((e) => console.warn("[Auto-Pilot] Erreur réassurance prospect:", e))
          )
        }

        const effectiveMaxSlots = wantsExclusiveB2C ? 1 : maxSlots
        postBuyNotifications.push(
          sendAdminLeadSaleNotification({
            mode: "credits",
            purchaseId,
            partner: {
              id: partner.id,
              company_name: partner.company_name,
              email: partner.email,
              phone: partner.phone,
              credits: Number(rpcRes.remaining_credits ?? (partner.credits - requiredCredits)),
            },
            lead,
            creditsSpent: requiredCredits,
            takenSlots: realBuyers.length,
            maxSlots: effectiveMaxSlots,
            buyers: realBuyers,
          }).catch(() => undefined)
        )

        if (postBuyNotifications.length > 0) {
          await Promise.allSettled(postBuyNotifications)
        }

        takenSlots = wantsExclusiveB2C ? maxSlots : takenSlots + 1
        if (wantsExclusiveB2C) break
        continue
      }
    }

    // Fallback Mandat Mollie 1-Clic valide si solde crédits insuffisant
    if (partner.mollie_customer_id && partner.mollie_mandate_status === "valid" && process.env.MOLLIE_API_KEY) {
      try {
        const mandateInfo = await getValidMollieMandate(
          partner.mollie_customer_id,
          partner.mollie_mandate_id
        )
        // Seuls les mandats par carte (creditcard) garantissent un règlement synchrone immédiat
        if (mandateInfo.valid && mandateInfo.mandateId && mandateInfo.method === "creditcard") {
          const fin = calculateOrderFinancials(requiredCredits)
          const recurring = await createRecurringLeadPayment({
            customerId: partner.mollie_customer_id,
            mandateId: mandateInfo.mandateId,
            leadId: lead.id,
            leadSegment: lead.segment || "B2C",
            leadLocation: lead.city || lead.province || "Wallonie",
            priceTtc: fin.priceTtc,
            priceHtva: fin.priceHtva,
            vatAmount: fin.vatAmount,
            credits: requiredCredits,
            exclusive: wantsExclusiveB2C,
            partnerId: partner.id,
            partnerEmail: partner.email,
            partnerCompany: partner.company_name || "Installateur",
            siteUrl,
            channel: "auto_pilot",
          })

          const mollie = getMollieClient()
          const fullPayment = await mollie.payments.get(recurring.paymentId)
          if (fullPayment.status === "paid") {
            const fulfilled = await fulfillPaidLeadDirectPurchase(
              lead.id,
              partner.id,
              fullPayment
            )
            if (fulfilled.success) {
              allocations.push({
                partnerId: partner.id,
                companyName: partner.company_name || "Partenaire",
                mode: "mollie_mandate",
                exclusive: wantsExclusiveB2C || isB2B,
              })
              takenSlots = wantsExclusiveB2C ? maxSlots : takenSlots + 1
              if (wantsExclusiveB2C) break
            }
          }
        }
      } catch (mandateErr) {
        console.warn("[Auto-Pilot] Échec débit mandat 1-clic:", mandateErr)
      }
    }
  }

  return {
    leadId,
    allocatedCount: allocations.length,
    isFullySold: takenSlots >= maxSlots,
    allocations,
  }
}

export interface PostPublishDispatchResult {
  autoMatch: AutoMatchResult
  wave1: DispatchWaveResult | null
}

/**
 * Exécute de façon fiable et séquentielle la chaîne post-publication :
 * 1) Attribution automatique Auto-Pilot
 * 2) Si des créneaux restent disponibles, envoi de la Vague 1
 */
export async function triggerPostPublishDispatch(
  leadId: string
): Promise<PostPublishDispatchResult> {
  let autoMatch: AutoMatchResult = {
    leadId,
    allocatedCount: 0,
    isFullySold: false,
    allocations: [],
  }

  try {
    autoMatch = await runAutoMatchForLead(leadId)
  } catch (err) {
    console.error(`[PostPublishDispatch] Erreur runAutoMatchForLead(${leadId}):`, err)
  }

  if (autoMatch.isFullySold) {
    return { autoMatch, wave1: null }
  }

  let wave1: DispatchWaveResult | null = null
  try {
    wave1 = await dispatchLeadWave(leadId, 1)
  } catch (err) {
    console.error(`[PostPublishDispatch] Erreur dispatchLeadWave(${leadId}, 1):`, err)
  }

  return { autoMatch, wave1 }
}



