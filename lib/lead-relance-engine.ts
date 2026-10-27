import { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { calculateMarketplaceFinancials, calculateLeadCreditCost } from "@/lib/marketplace-pricing"
import { renderInstallerLeadTeaserEmail, buildLeadEmailSubject } from "@/lib/email-templates/installer-lead-teaser"

// ==============================================================================
// 1. CONFIGURATION & CONSTANTES MÉTIER
// ==============================================================================

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

/** Quotas de vente stricts */
export const MAX_SLOTS_B2C = 3 // Partagé 3 installateurs max
export const MAX_SLOTS_B2B = 1 // Exclusivité 100%

/** Cooldowns minimaux entre les vagues (en millisecondes) */
export const COOLDOWN_WAVE_1_TO_2_MS = 4 * 60 * 60 * 1000 // 4 heures
export const COOLDOWN_WAVE_2_TO_3_MS = 20 * 60 * 60 * 1000 // 20 heures

/** Limites anti-spam par installateur */
export const MAX_NOTIFICATIONS_PER_LEAD_PER_PARTNER = 2 // Max 2 relances pour un même dossier
export const MAX_DAILY_NOTIFICATIONS_PER_PARTNER = 4 // Max 4 notifications lead par jour au total

/** Tailles cibles des vagues de dispatch */
export const WAVE_TARGET_COUNTS = {
  B2C: {
    wave1: 8, // 6 à 8 installateurs locaux Tier 1
    wave2: 12, // Élargissement limitrophe Tier 2
    wave3: 16, // Élargissement régional global Tier 3
  },
  B2B: {
    wave1: 4, // 3 à 4 spécialistes tertiaires Tier 1
    wave2: 6, // Élargissement PME/Tertiaire Tier 2
    wave3: 10, // Réseau d'ingénierie élargi
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
}

// ==============================================================================
// 2. CONTRÔLE DES HEURES OUVRÉES (BUSINESS HOURS)
// ==============================================================================

/**
 * Vérifie si le moment actuel est approprié pour un envoi de relance automatique (08:00 - 19:30).
 * Évite les désagréments nocturnes tout en tolérant les alertes immédiates manuelles.
 */
export function isWithinBusinessHours(date = new Date()): boolean {
  // Fuseau horaire Europe/Brussels
  const brusselsTime = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Brussels" }))
  const hour = brusselsTime.getHours()
  const day = brusselsTime.getDay() // 0 = Dimanche, 6 = Samedi

  // Dimanche : pas de relances automatiques
  if (day === 0) return false

  // Samedi : 09:00 - 13:00
  if (day === 6) return hour >= 9 && hour < 13

  // Du lundi au vendredi : 08:00 - 19:30
  return hour >= 8 && hour < 20
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
  const partnerSegment = (partner.segment || "BOTH").toUpperCase()

  // 1. FILTRE ÉLIMINATOIRE : Segment
  const segmentMatch =
    partnerSegment === "BOTH" ||
    partnerSegment === "ALL" ||
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
  const partnerSurfaces = partner.target_surfaces || []
  if (partnerSurfaces.length === 0 || partnerSurfaces.includes(lead.surface_type)) {
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

/**
 * Sélectionne la liste ordonnée des installateurs éligibles pour une vague donnée
 */
export async function getEligiblePartnersForWave(
  supabase: ReturnType<typeof createServiceRoleClient>,
  lead: any,
  waveNumber: number
): Promise<EligiblePartnerForDispatch[]> {
  const maxSlots = lead.segment === "B2B" ? MAX_SLOTS_B2B : MAX_SLOTS_B2C
  const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)

  // 1. Récupérer les achats existants pour ce lead (filtrer les comptes de test)
  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("partner_id, partners(is_test, company_name)")
    .eq("lead_id", lead.id)

  const realPurchases = (purchases || []).filter(
    (p: any) => !p.partners?.is_test && !p.partners?.company_name?.toLowerCase().includes("test")
  )
  const realPurchasedPartnerIds = new Set(realPurchases.map((p) => p.partner_id))
  const allPurchasedPartnerIds = new Set((purchases || []).map((p) => p.partner_id))

  // Si le lead est déjà plein pour les vrais installateurs, aucun partenaire n'est éligible
  if (realPurchasedPartnerIds.size >= maxSlots) {
    return []
  }

  // 2. Récupérer l'historique des relances déjà envoyées pour ce lead
  let alreadySentForThisLead: { partner_id: string; wave_number: number }[] = []
  try {
    const { data: dispatches } = await supabase
      .from("lead_relance_dispatches")
      .select("partner_id, wave_number")
      .eq("lead_id", lead.id)

    alreadySentForThisLead = dispatches || []
  } catch (err) {
    // Tolérance si la table n'est pas encore migrée
  }

  const partnersWhoReceivedThisWave = new Set(
    alreadySentForThisLead.filter((d) => d.wave_number === waveNumber).map((d) => d.partner_id)
  )

  const partnerNotificationCounts = new Map<string, number>()
  for (const d of alreadySentForThisLead) {
    partnerNotificationCounts.set(d.partner_id, (partnerNotificationCounts.get(d.partner_id) || 0) + 1)
  }

  // 3. Récupérer tous les partenaires actifs
  const { data: allPartners, error: partnersErr } = await supabase
    .from("partners")
    .select("id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture, is_test")

  if (partnersErr || !allPartners || allPartners.length === 0) {
    return []
  }

  const realPartners = allPartners.filter(
    (p) => !p.is_test && !p.company_name?.toLowerCase().includes("test") && p.email !== "mrnathanrem@gmail.com"
  )
  const devTestPartner = allPartners.find(
    (p) => p.is_test || p.company_name?.toLowerCase().includes("test") || p.email === "mrnathanrem@gmail.com"
  )

  // 4. Calculer le score et filtrer les candidats réels
  const scoredCandidates: EligiblePartnerForDispatch[] = []

  for (const partner of realPartners) {
    // Exclure si déjà acheteur
    if (allPurchasedPartnerIds.has(partner.id)) continue

    // Exclure si a déjà reçu cette vague précise
    if (partnersWhoReceivedThisWave.has(partner.id)) continue

    // Exclure si a déjà reçu le maximum de relances autorisées pour ce lead
    const countForLead = partnerNotificationCounts.get(partner.id) || 0
    if (countForLead >= MAX_NOTIFICATIONS_PER_LEAD_PER_PARTNER) continue

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

  // 5. Trier par score décroissant (les plus pertinents et ceux ayant des crédits en premier)
  scoredCandidates.sort((a, b) => {
    // Priorité 1 : Solde de crédits suffisant
    if (a.scoreInfo.hasEnoughCredits !== b.scoreInfo.hasEnoughCredits) {
      return a.scoreInfo.hasEnoughCredits ? -1 : 1
    }
    // Priorité 2 : Score de pertinence global
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

  // 7. Inclure DEV TEST en observateur/destinataire sans consommer de place dans le quota réel
  if (devTestPartner && devTestPartner.email && devTestPartner.email.includes("@")) {
    const hasAlreadyReceivedThisWave = partnersWhoReceivedThisWave.has(devTestPartner.id)
    if (!hasAlreadyReceivedThisWave) {
      const devScoreInfo: PartnerMatchingScore = {
        partnerId: devTestPartner.id,
        score: 95,
        tier: "tier_1",
        isExactProvince: true,
        isNeighborProvince: false,
        hasEnoughCredits: (devTestPartner.credits || 0) >= creditCost,
        segmentMatch: true,
      }
      selectedCandidates.push({
        partner: devTestPartner,
        scoreInfo: devScoreInfo,
        isTest: true,
      })
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
  const maxSlots = isB2B ? MAX_SLOTS_B2B : MAX_SLOTS_B2C

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
    annualBill: lead.annual_bill_eur || lead.annual_electricity_bill,
    creditCost,
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

  for (const candidate of candidates) {
    const partner = candidate.partner
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
        firstName: lead.first_name,
        lastName: lead.last_name,
        grd: lead.grd,
        createdAt: lead.created_at,
      },
      waveNumber,
      takenSlots,
      maxSlots,
      creditCost,
      financials,
    }

    const { subject, text, html } = renderInstallerLeadTeaserEmail(emailData)

    if (resend) {
      try {
        const { error: sendErr } = await resend.emails.send({
          from: fromEmail,
          to: partner.email,
          replyTo: replyToEmail,
          subject,
          text,
          html,
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

// ==============================================================================
// 6. PROCESSUS DE RELANCES AUTOMATIQUES EN TÂCHE DE FOND (CRON / WORKER)
// ==============================================================================

export interface CronRelanceSummary {
  processedLeads: number
  triggeredWaves: { leadId: string; waveNumber: number; sentCount: number }[]
  skippedLeadsCount: number
}

/**
 * Scanne tous les leads disponibles et déclenche les Vagues 2 et 3 selon les cooldowns
 */
export async function processPendingLeadRelances(): Promise<CronRelanceSummary> {
  // Respecter les plages horaires de courtoisie professionnelle
  if (!isWithinBusinessHours()) {
    return {
      processedLeads: 0,
      triggeredWaves: [],
      skippedLeadsCount: 0,
    }
  }

  const supabase = createServiceRoleClient()
  const now = Date.now()

  // 1. Récupérer tous les leads actuellement "available"
  const { data: availableLeads, error } = await supabase
    .from("leads")
    .select("id, segment, marketplace_status, relance_wave, last_relance_at, created_at")
    .eq("marketplace_status", "available")
    .order("created_at", { ascending: false })

  if (error || !availableLeads || availableLeads.length === 0) {
    return { processedLeads: 0, triggeredWaves: [], skippedLeadsCount: 0 }
  }

  const triggeredWaves: { leadId: string; waveNumber: number; sentCount: number }[] = []
  let skippedCount = 0

  for (const lead of availableLeads) {
    const currentWave = Number(lead.relance_wave) || 0
    const lastRelanceTime = lead.last_relance_at
      ? new Date(lead.last_relance_at).getTime()
      : new Date(lead.created_at).getTime()

    const elapsed = now - lastRelanceTime

    // Vérifier si une relance doit être déclenchée :
    let nextWave = 0

    if (currentWave === 0) {
      // Vague 1 initiale n'a jamais été envoyée
      nextWave = 1
    } else if (currentWave === 1 && elapsed >= COOLDOWN_WAVE_1_TO_2_MS) {
      // 4 heures écoulées depuis la Vague 1 -> Vague 2
      nextWave = 2
    } else if (currentWave === 2 && elapsed >= COOLDOWN_WAVE_2_TO_3_MS) {
      // 20 heures écoulées depuis la Vague 2 -> Vague 3
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
  }
}

// ==============================================================================
// 7. FONCTIONS DE SUPERVISION DASHBOARD : PLANNING, HISTORIQUE ET STATISTIQUES
// ==============================================================================

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
  if (company.includes("test") || company.includes("dev test") || company.startsWith("dev-")) return true
  const email = (p.email || p.emailTo || "").toLowerCase().trim()
  if (
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
  const current = new Date(targetDate)
  const maxAttempts = 14
  let attempts = 0

  while (attempts < maxAttempts) {
    const brusselsTime = new Date(current.toLocaleString("en-US", { timeZone: "Europe/Brussels" }))
    const day = brusselsTime.getDay() // 0 = Dimanche, 6 = Samedi
    const hour = brusselsTime.getHours()
    const minute = brusselsTime.getMinutes()

    // Dimanche : fermé -> Lundi 08:00
    if (day === 0) {
      current.setDate(current.getDate() + 1)
      current.setHours(8, 0, 0, 0)
      attempts++
      continue
    }

    // Samedi : 09:00 - 13:00
    if (day === 6) {
      if (hour < 9) {
        current.setHours(9, 0, 0, 0)
        return current
      }
      if (hour >= 13) {
        current.setDate(current.getDate() + 2)
        current.setHours(8, 0, 0, 0)
        attempts++
        continue
      }
      return current
    }

    // Lundi au Vendredi : 08:00 - 19:30
    if (hour < 8) {
      current.setHours(8, 0, 0, 0)
      return current
    }
    if (hour > 19 || (hour === 19 && minute >= 30)) {
      current.setDate(current.getDate() + 1)
      current.setHours(8, 0, 0, 0)
      attempts++
      continue
    }

    return current
  }
  return current
}

/**
 * Récupère le planning détaillé des relances programmées à venir (quels mails, à qui, dans combien de temps)
 */
export async function getUpcomingRelancesSchedule(): Promise<UpcomingRelanceItem[]> {
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

  // 2. Récupérer tous les achats existants pour vérifier les slots (hors tests)
  const { data: allPurchases } = await supabase
    .from("lead_purchases")
    .select("lead_id, partner_id, purchased_at, partners(id, company_name, email, is_test)")
    .order("purchased_at", { ascending: true })

  const purchasesByLead = new Map<string, { partnerId: string; companyName: string; email: string; purchasedAt: string }[]>()
  for (const p of (allPurchases as any[]) || []) {
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

  // 3. Récupérer les relances déjà envoyées pour ces leads (hors comptes DEV TEST)
  const availableLeadIds = availableLeads.map((l) => l.id)
  const { data: allDispatches } = await supabase
    .from("lead_relance_dispatches")
    .select("id, lead_id, partner_id, wave_number, email_to, sent_at, partners(id, company_name, email, is_test)")
    .in("lead_id", availableLeadIds)
    .order("sent_at", { ascending: false })

  const dispatchesByLead = new Map<string, { partnerId: string; companyName: string; email: string; waveNumber: number; sentAt: string }[]>()
  for (const d of (allDispatches as any[]) || []) {
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

  const upcomingItems: UpcomingRelanceItem[] = []

  for (const lead of availableLeads) {
    const currentWave = Number(lead.relance_wave) || 0
    if (currentWave >= 3) {
      // Toutes les vagues ont déjà été envoyées pour ce lead
      continue
    }

    const nextWave = currentWave + 1
    const isB2B = lead.segment === "B2B"
    const maxSlots = isB2B ? MAX_SLOTS_B2B : MAX_SLOTS_B2C
    const leadBuyers = purchasesByLead.get(lead.id) || []
    const takenSlots = leadBuyers.length

    if (takenSlots >= maxSlots) {
      // Déjà vendu complètement
      continue
    }

    const remainingSlots = Math.max(0, maxSlots - takenSlots)

    // Calculer la date théorique selon les cooldowns
    let scheduledTimestamp = now
    if (currentWave === 0) {
      // Vague 1 : immédiat à la publication (ou maintenant si publication passée)
      scheduledTimestamp = new Date(lead.created_at).getTime()
    } else if (currentWave === 1) {
      // Vague 2 : 4h après Vague 1
      const base = lead.last_relance_at ? new Date(lead.last_relance_at).getTime() : new Date(lead.created_at).getTime()
      scheduledTimestamp = base + COOLDOWN_WAVE_1_TO_2_MS
    } else if (currentWave === 2) {
      // Vague 3 : 20h après Vague 2
      const base = lead.last_relance_at ? new Date(lead.last_relance_at).getTime() : new Date(lead.created_at).getTime()
      scheduledTimestamp = base + COOLDOWN_WAVE_2_TO_3_MS
    }

    const rawScheduledDate = new Date(scheduledTimestamp)
    const effectiveSendDate = getEffectiveSendTime(rawScheduledDate < new Date() ? new Date() : rawScheduledDate)
    const msRemaining = Math.max(0, effectiveSendDate.getTime() - now)
    const isReadyNow = now >= scheduledTimestamp && isWithinBusinessHours()

    // Calculer les données financières
    const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)
    const financials = calculateMarketplaceFinancials({
      segment: lead.segment,
      surfaceArea: lead.surface_area_m2 || lead.surface_area,
      surfaceType: lead.surface_type,
      annualBill: lead.annual_bill_eur || lead.annual_electricity_bill,
      creditCost,
    })

    // Obtenir la liste des installateurs cibles éligibles
    const candidates = await getEligiblePartnersForWave(supabase, lead, nextWave)
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
    const maxSlots = isB2B ? MAX_SLOTS_B2B : MAX_SLOTS_B2C
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
      annualBill: lead?.annual_electricity_bill || 0,
      creditCost: lead?.credit_cost || 2,
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
export async function getRelancesOverviewStats(): Promise<RelancesOverviewStats> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  let totalSent = 0
  let sentToday = 0
  let sentW1 = 0
  let sentW2 = 0
  let sentW3 = 0
  let purchasedFromRelanceCount = 0

  try {
    const { data: allDispatches } = await supabase
      .from("lead_relance_dispatches")
      .select("id, wave_number, sent_at, lead_id, partner_id, email_to, partners(is_test, company_name)")

    if (allDispatches) {
      // Exclure les envois de test des calculs statistiques de conversion et de volume
      const realDispatches = allDispatches.filter((d: any) => {
        const isTest =
          d.partners?.is_test ||
          d.partners?.company_name?.toLowerCase().includes("test") ||
          d.email_to === "mrnathanrem@gmail.com"
        return !isTest
      })

      totalSent = realDispatches.length
      sentToday = realDispatches.filter((d: any) => d.sent_at >= startOfDay).length
      sentW1 = realDispatches.filter((d: any) => d.wave_number === 1).length
      sentW2 = realDispatches.filter((d: any) => d.wave_number === 2).length
      sentW3 = realDispatches.filter((d: any) => d.wave_number === 3).length

      // Taux d'attribution (uniquement sur les vrais achats et vrais dispatches)
      const { data: purchases } = await supabase
        .from("lead_purchases")
        .select("lead_id, partner_id, partners(is_test, company_name)")

      if (purchases) {
        const realPurchases = purchases.filter(
          (p: any) => !p.partners?.is_test && !p.partners?.company_name?.toLowerCase().includes("test")
        )
        const purchaseSet = new Set(realPurchases.map((p: any) => `${p.lead_id}:${p.partner_id}`))
        purchasedFromRelanceCount = realDispatches.filter((d: any) => purchaseSet.has(`${d.lead_id}:${d.partner_id}`)).length
      }
    }
  } catch (err) {
    // Si la table est encore vide
  }

  // Calcul du planning à venir
  const upcoming = await getUpcomingRelancesSchedule()
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

