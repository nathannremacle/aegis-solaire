import { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { calculateMarketplaceFinancials, calculateLeadCreditCost } from "@/lib/marketplace-pricing"
import { renderInstallerLeadTeaserEmail } from "@/lib/email-templates/installer-lead-teaser"

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

  // 1. Récupérer les achats existants pour ce lead
  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("partner_id")
    .eq("lead_id", lead.id)

  const purchasedPartnerIds = new Set((purchases || []).map((p) => p.partner_id))

  // Si le lead est déjà plein, aucun partenaire n'est éligible
  if (purchasedPartnerIds.size >= maxSlots) {
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

  // 3. Récupérer tous les partenaires réels actifs
  const { data: allPartners, error: partnersErr } = await supabase
    .from("partners")
    .select("id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture")
    .eq("is_test", false)

  if (partnersErr || !allPartners || allPartners.length === 0) {
    return []
  }

  // 4. Calculer le score et filtrer les candidats
  const scoredCandidates: EligiblePartnerForDispatch[] = []

  for (const partner of allPartners) {
    // Exclure si déjà acheteur
    if (purchasedPartnerIds.has(partner.id)) continue

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
    scoredCandidates.push({ partner, scoreInfo })
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

  // 6. Limiter le nombre de destinataires selon la jauge cible de la vague
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

  return scoredCandidates.slice(0, targetCount)
}

// ==============================================================================
// 5. EXÉCUTION D'UNE VAGUE DE RELANCE (DISPATCH WAVE)
// ==============================================================================

export interface DispatchWaveResult {
  success: boolean
  leadId: string
  waveNumber: number
  sentCount: number
  recipients: { email: string; companyName: string; score: number; tier: string }[]
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

  // 2. Vérifier les achats réels enregistrés
  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("id")
    .eq("lead_id", leadId)

  const takenSlots = purchases ? purchases.length : 0

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
  const dispatchedRecipients: { email: string; companyName: string; score: number; tier: string }[] = []

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

  return {
    success: true,
    leadId,
    waveNumber,
    sentCount: dispatchedRecipients.length,
    recipients: dispatchedRecipients,
    takenSlots,
    maxSlots,
    isFullySold: false,
    message: `Vague ${waveNumber} envoyée avec succès à ${dispatchedRecipients.length} installateur(s).`,
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
