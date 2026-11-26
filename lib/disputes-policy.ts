/**
 * Source unique de vérité contractuelle & technique pour la Garantie Lead Aegis Solaire (Art. 5 CGV).
 * Partagée entre l'API partenaire, l'arbitrage admin, le modal de contestation et les CGV publiques.
 */

export type DisputeReasonId =
  | "wrong_number"
  | "unreachable"
  | "already_equipped"
  | "out_of_scope"
  | "duplicate"
  | "other"

export type WrongNumberProofId = "operator_unassigned" | "email_bounce"

export const WRONG_NUMBER_PROOF_OPTIONS: Array<{
  id: WrongNumberProofId
  label: string
  description: string
}> = [
  {
    id: "operator_unassigned",
    label: "Numéro non attribué / hors service (message opérateur)",
    description: "Annonce réseau formelle « numéro non attribué » ou ligne inexistante",
  },
  {
    id: "email_bounce",
    label: "Adresse e-mail en erreur technique permanente (rebond / bounce)",
    description: "Retour SMTP « Address not found » / « User unknown »",
  },
]

export const DEFAULT_DISPUTE_SUSPENSION_REASON =
  "Suspension de la garantie Lead (Art. 5.6 CGV) suite au dépassement du seuil contractuel de 8 % de litiges sur 30 jours glissants ou soumission de réclamations non conformes."

export type DisputeStatus = "pending" | "approved" | "rejected"

export const DISPUTE_MAX_WINDOW_DAYS = 10 // Équivalent contractuel de 7 jours ouvrés
export const DISPUTE_MAX_WINDOW_MS = DISPUTE_MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000

/** Délai minimal après achat exigé avant de pouvoir déclarer un prospect injoignable */
export const UNREACHABLE_MIN_AGE_HOURS = 24
export const UNREACHABLE_MIN_AGE_MS = UNREACHABLE_MIN_AGE_HOURS * 60 * 60 * 1000

export const MIN_DISPUTE_DETAILS_LENGTH = 20
export const DISPUTE_ADMIN_SLA_HOURS = 24

/** Seuil contractuel anti-abus (CGV Art. 5.6) sur 30 jours glissants */
export const DISPUTE_ABUSE_ROLLING_DAYS = 30
export const DISPUTE_ABUSE_THRESHOLD_PERCENT = 8
export const DISPUTE_ABUSE_MIN_COUNT = 2

export const DISPUTE_SUPPORT_EMAIL = "contact@aegissolaire.com"

export interface DisputeReasonConfig {
  id: DisputeReasonId
  label: string
  adminLabel: string
  adminDescription: string
  placeholder: string
  minAgeHoursAfterPurchase: number
  autoRetiresLeadFromMarketplace: boolean
}

export const DISPUTE_REASONS: DisputeReasonConfig[] = [
  {
    id: "wrong_number",
    label: "Numéro de téléphone non attribué ou e-mail inexistant",
    adminLabel: "Numéro erroné / e-mail en rebond",
    adminDescription: "Numéro non attribué sur le réseau ou e-mail en erreur",
    placeholder:
      "Ex : Appelé le 18/11 à 10h15, message opérateur « numéro non attribué » et e-mail revenu en erreur...",
    minAgeHoursAfterPurchase: 0,
    autoRetiresLeadFromMarketplace: true,
  },
  {
    id: "unreachable",
    label: "Prospect injoignable après 3 tentatives sur ≥ 24 h",
    adminLabel: "Injoignable (diligence vérifiée)",
    adminDescription:
      "Aucune réponse après ≥ 24h et 3 tentatives espacées de 4h (dont 1 écrit si demandé)",
    placeholder:
      "Ex : Appels le 18/11 à 10h, 15h et le 19/11 à 11h + SMS envoyé sans réponse...",
    minAgeHoursAfterPurchase: UNREACHABLE_MIN_AGE_HOURS,
    autoRetiresLeadFromMarketplace: true,
  },
  {
    id: "already_equipped",
    label: "Déjà équipé ou projet déjà signé ailleurs avant l'achat",
    adminLabel: "Déjà équipé / Signé ailleurs",
    adminDescription: "Le prospect confirme avoir déjà installé ou signé avec un autre prestataire",
    placeholder:
      "Ex : Le prospect confirme au téléphone avoir déjà fait installer ses panneaux ou signé ailleurs...",
    minAgeHoursAfterPurchase: 0,
    autoRetiresLeadFromMarketplace: true,
  },
  {
    id: "out_of_scope",
    label: "Hors zone Wallonie ou hors critères (locataire sans accord)",
    adminLabel: "Hors zone / Hors critères",
    adminDescription:
      "Adresse hors Wallonie, locataire sans accord ou absence manifeste de bâtiment éligible",
    placeholder:
      "Ex : Adresse réelle située hors de la Wallonie ou le contact indique être locataire sans accord du propriétaire...",
    minAgeHoursAfterPurchase: 0,
    autoRetiresLeadFromMarketplace: false,
  },
  {
    id: "duplicate",
    label: "Doublon strict (< 30 jours sur votre compte)",
    adminLabel: "Doublon interne (< 30 jours)",
    adminDescription: "Même prospect déjà débloqué par le partenaire au cours des 30 derniers jours",
    placeholder:
      "Ex : Même contact (nom, téléphone et adresse) déjà acheté sur notre espace le ...",
    minAgeHoursAfterPurchase: 0,
    autoRetiresLeadFromMarketplace: false,
  },
  {
    id: "other",
    label: "Autre anomalie documentée (fausse identité, erreur manifeste)",
    adminLabel: "Autre anomalie circonstanciée",
    adminDescription: "Anomalie factuelle précise non couverte par les motifs standards",
    placeholder:
      "Ex : Précisez concrètement l'anomalie constatée (identité incorrecte, erreur manifeste de qualification)...",
    minAgeHoursAfterPurchase: 0,
    autoRetiresLeadFromMarketplace: false,
  },
]

export const VALID_DISPUTE_REASON_IDS = DISPUTE_REASONS.map((r) => r.id)

export function getDisputeReasonConfig(reason: string): DisputeReasonConfig {
  return (
    DISPUTE_REASONS.find((r) => r.id === reason) ?? {
      id: "other",
      label: reason,
      adminLabel: reason,
      adminDescription: "Motif circonstancié détaillé par le partenaire",
      placeholder: "",
      minAgeHoursAfterPurchase: 0,
      autoRetiresLeadFromMarketplace: false,
    }
  )
}

export interface DisputeEligibilityResult {
  eligible: boolean
  code?:
    | "WINDOW_EXPIRED"
    | "TOO_EARLY_FOR_UNREACHABLE"
    | "DETAILS_TOO_SHORT"
    | "DILIGENCE_NOT_CONFIRMED"
    | "MISCLASSIFIED_UNREACHABLE"
    | "WRONG_NUMBER_PROOF_REQUIRED"
    | "WRONG_NUMBER_VERIFIED_ACK_REQUIRED"
    | "EXCLUDED_BY_ART_5_4"
  error?: string
  remainingHoursForUnreachable?: number
}

function normalizeDisputeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Détecte si une justification soumise sous `wrong_number` décrit en réalité
 * un prospect qui ne répond pas aux appels (motif `unreachable`, CGV Art. 5.3.2).
 */
export function detectUnreachableClaimInWrongNumber(details: string | null | undefined): boolean {
  const norm = normalizeDisputeText(details ?? "")
  if (!norm) return false

  const explicitTechnicalKeywords = [
    "non attribue",
    "pas attribue",
    "hors service",
    "inexistant",
    "n existe pas",
    "numero invalide",
    "faux numero",
    "numero errone",
    "rebond",
    "bounce",
    "undeliverable",
    "address not found",
    "user unknown",
    "boite introuvable",
    "adresse introuvable",
  ]
  if (explicitTechnicalKeywords.some((kw) => norm.includes(kw))) {
    return false
  }

  const unreachablePatterns = [
    /\bne\s+repond(?:s|ent)?\s+pas\b/,
    /\brepond\s+pas\b/,
    /\bpas\s+de\s+reponse\b/,
    /\bsans\s+reponse\b/,
    /\baucune\s+reponse\b/,
    /\binjoignable\b/,
    /\bne\s+decroche\s+pas\b/,
    /\bdecroche\s+pas\b/,
    /\bsonne\s+dans\s+le\s+vide\b/,
    /\brepondeur\b/,
    /\bmessagerie\s+vocale\b/,
    /\bboite\s+vocale\b/,
    /\b\d+\s*(?:appel|appels|appeles|tentatives?)\b/,
  ]
  return unreachablePatterns.some((re) => re.test(norm))
}

export type Art54ExclusionCategory = "changed_mind" | "price_or_quote" | "roof_constraint"

/**
 * Détecte sous le motif `other` les situations expressément exclues de la garantie
 * par l'article 5.4 des CGV (prospect ayant changé d'avis, refus de devis/budget,
 * ou contrainte technique découverte sur site).
 */
export function detectExcludedReasonArt54(
  details: string | null | undefined
): { excluded: boolean; category?: Art54ExclusionCategory; error?: string } {
  const norm = normalizeDisputeText(details ?? "")
  if (!norm) return { excluded: false }

  const changedMindPatterns = [
    /\b(?:a|ont)\s+change\s+d\s+avis\b/,
    /\bchange\s+d\s+avis\b/,
    /\bchangement\s+d\s+avis\b/,
    /\bne\s+veut\s+plus\b/,
    /\bn\s+en\s+veut\s+plus\b/,
    /\bne\s+souhaite\s+plus\b/,
    /\bplus\s+interesse(?:e|s)?\b/,
    /\bpas\s+interesse(?:e|s)?\b/,
    /\brenonce\s+(?:a|au)\b/,
    /\babandonne\s+(?:le|son)\s+projet\b/,
    /\bannule\s+son\s+projet\b/,
  ]
  if (changedMindPatterns.some((re) => re.test(norm))) {
    return {
      excluded: true,
      category: "changed_mind",
      error:
        "Motif exclu par l'article 5.4 des CGV : un prospect qui a été joint et a changé d'avis ou renonce à son projet ne donne pas droit à un recrédit.",
    }
  }

  const priceOrQuotePatterns = [
    /\btrop\s+cher\b/,
    /\brefuse\s+le\s+devis\b/,
    /\brefus\s+du\s+devis\b/,
    /\bhors\s+budget\b/,
    /\bbudget\s+insuffisant\b/,
    /\btrouve\s+moins\s+cher\b/,
    /\bpas\s+d\s+accord\s+(?:sur|avec)\s+le\s+(?:prix|tarif|devis)\b/,
  ]
  if (priceOrQuotePatterns.some((re) => re.test(norm))) {
    return {
      excluded: true,
      category: "price_or_quote",
      error:
        "Motif exclu par l'article 5.4 des CGV : le refus de votre proposition tarifaire, du dimensionnement ou des délais de pose ne donne pas droit à un recrédit.",
    }
  }

  const roofConstraintPatterns = [
    /\bamiante\b/,
    /\bardoises?\s+friables?\b/,
    /\btoiture\s+(?:vetuste|trop\s+fragile|inadaptee)\b/,
    /\bcharpente\s+(?:trop\s+faible|vetuste)\b/,
    /\bcapacite\s+reseau\b/,
  ]
  if (roofConstraintPatterns.some((re) => re.test(norm))) {
    return {
      excluded: true,
      category: "roof_constraint",
      error:
        "Motif exclu par l'article 5.4 des CGV : les contraintes techniques du bâtiment ou du réseau découvertes en visite technique (amiante, ardoises friables, RGIE, GRD) ne sont pas couvertes par la garantie.",
    }
  }

  return { excluded: false }
}

export function getWrongNumberProofLabel(proof: WrongNumberProofId): string {
  return (
    WRONG_NUMBER_PROOF_OPTIONS.find((opt) => opt.id === proof)?.label ?? proof
  )
}

export function checkDisputeEligibility(params: {
  reason: string
  purchasedAt?: string | Date | null
  nowMs?: number
  details?: string | null
  contactPreference?: string | null
  diligenceConfirmed?: boolean
  skipDetailsCheck?: boolean
  wrongNumberProof?: WrongNumberProofId | null
  requireWrongNumberProof?: boolean
  phoneVerified?: boolean | null
  emailVerified?: boolean | null
  wrongNumberVerifiedAck?: boolean
}): DisputeEligibilityResult {
  const nowMs = params.nowMs ?? Date.now()

  if (params.purchasedAt) {
    const purchasedMs =
      params.purchasedAt instanceof Date
        ? params.purchasedAt.getTime()
        : new Date(params.purchasedAt).getTime()

    if (!Number.isNaN(purchasedMs)) {
      const ageMs = nowMs - purchasedMs

      if (ageMs > DISPUTE_MAX_WINDOW_MS) {
        return {
          eligible: false,
          code: "WINDOW_EXPIRED",
          error:
            "Le délai contractuel de réclamation (7 jours ouvrés suivant l'acquisition du dossier) est dépassé.",
        }
      }

      if (params.reason === "unreachable" && ageMs < UNREACHABLE_MIN_AGE_MS) {
        const remainingHours = Math.max(
          1,
          Math.ceil((UNREACHABLE_MIN_AGE_MS - ageMs) / (60 * 60 * 1000))
        )
        const writtenHint =
          params.contactPreference === "written_first"
            ? " (dont au moins 1 SMS/WhatsApp ou e-mail requis par sa préférence « Approche écrite d'abord »)"
            : ""
        return {
          eligible: false,
          code: "TOO_EARLY_FOR_UNREACHABLE",
          remainingHoursForUnreachable: remainingHours,
          error: `Le motif « Prospect injoignable » nécessite un délai minimal de ${UNREACHABLE_MIN_AGE_HOURS} h après l'achat et au moins 3 tentatives espacées de 4 h${writtenHint}. Réessayez dans environ ${remainingHours} h.`,
        }
      }
    }
  }

  if (params.reason === "unreachable" && params.diligenceConfirmed === false) {
    return {
      eligible: false,
      code: "DILIGENCE_NOT_CONFIRMED",
      error:
        params.contactPreference === "written_first"
          ? "Veuillez confirmer avoir effectué au moins 3 tentatives espacées de 4 h dont au moins 1 message écrit (SMS/WhatsApp/e-mail)."
          : "Veuillez confirmer avoir effectué au moins 3 tentatives espacées d'au moins 4 h.",
    }
  }

  if (params.reason === "wrong_number") {
    if (
      params.requireWrongNumberProof &&
      params.wrongNumberProof !== "operator_unassigned" &&
      params.wrongNumberProof !== "email_bounce"
    ) {
      return {
        eligible: false,
        code: "WRONG_NUMBER_PROOF_REQUIRED",
        error:
          "Précisez l'anomalie technique constatée : message opérateur « numéro non attribué » ou rebond e-mail permanent.",
      }
    }

    const chosenChannelVerified =
      (params.wrongNumberProof === "operator_unassigned" && Boolean(params.phoneVerified)) ||
      (params.wrongNumberProof === "email_bounce" && Boolean(params.emailVerified)) ||
      (!params.wrongNumberProof && (Boolean(params.phoneVerified) || Boolean(params.emailVerified)))

    if (chosenChannelVerified && params.wrongNumberVerifiedAck === false) {
      return {
        eligible: false,
        code: "WRONG_NUMBER_VERIFIED_ACK_REQUIRED",
        error:
          "Ce canal a été techniquement vérifié (Tél OTP / Mail OK). Confirmez avoir constaté une erreur réseau ou serveur formelle et non une absence de réponse.",
      }
    }
  }

  if (!params.skipDetailsCheck) {
    const trimmed = (params.details ?? "").trim()
    if (params.reason === "wrong_number" && detectUnreachableClaimInWrongNumber(trimmed)) {
      const writtenHint =
        params.contactPreference === "written_first"
          ? " et avec au moins 1 contact écrit préalable (préférence « Écrit d'abord »)"
          : ""
      return {
        eligible: false,
        code: "MISCLASSIFIED_UNREACHABLE",
        error: `Un prospect qui ne répond pas aux appels ne relève pas du motif « Numéro erroné / e-mail inexistant ». Sélectionnez « Prospect injoignable après 3 tentatives sur ≥ 24 h »${writtenHint} (Art. 5.3 CGV).`,
      }
    }

    if (params.reason === "other") {
      const art54Check = detectExcludedReasonArt54(trimmed)
      if (art54Check.excluded) {
        return {
          eligible: false,
          code: "EXCLUDED_BY_ART_5_4",
          error: art54Check.error,
        }
      }
    }

    const len = trimmed.length
    if (len < MIN_DISPUTE_DETAILS_LENGTH) {
      return {
        eligible: false,
        code: "DETAILS_TOO_SHORT",
        error: `Veuillez préciser le motif en au moins ${MIN_DISPUTE_DETAILS_LENGTH} caractères (ex : date/heure des appels ou anomalie constatée).`,
      }
    }
  }

  return { eligible: true }
}

export interface PartnerDisputeStats30d {
  purchases30d: number
  disputes30d: number
  approved30d: number
  rejected30d: number
  disputeRatePct: number
  exceedsAbuseThreshold: boolean
}

export function computePartnerDisputeStats30d(params: {
  purchases: Array<{ partner_id: string; purchased_at?: string | null }>
  disputes: Array<{ partner_id: string; status?: string | null; created_at?: string | null }>
  nowMs?: number
}): Map<string, PartnerDisputeStats30d> {
  const nowMs = params.nowMs ?? Date.now()
  const cutoffMs = nowMs - DISPUTE_ABUSE_ROLLING_DAYS * 24 * 60 * 60 * 1000

  const purchasesCount = new Map<string, number>()
  for (const p of params.purchases) {
    if (!p.partner_id) continue
    if (p.purchased_at) {
      const ts = new Date(p.purchased_at).getTime()
      if (!Number.isNaN(ts) && ts < cutoffMs) continue
    }
    purchasesCount.set(p.partner_id, (purchasesCount.get(p.partner_id) ?? 0) + 1)
  }

  const disputesAgg = new Map<
    string,
    { total: number; approved: number; rejected: number }
  >()
  for (const d of params.disputes) {
    if (!d.partner_id) continue
    if (d.created_at) {
      const ts = new Date(d.created_at).getTime()
      if (!Number.isNaN(ts) && ts < cutoffMs) continue
    }
    const cur = disputesAgg.get(d.partner_id) ?? { total: 0, approved: 0, rejected: 0 }
    cur.total += 1
    if (d.status === "approved") cur.approved += 1
    else if (d.status === "rejected") cur.rejected += 1
    disputesAgg.set(d.partner_id, cur)
  }

  const result = new Map<string, PartnerDisputeStats30d>()
  const allPartnerIds = new Set([...purchasesCount.keys(), ...disputesAgg.keys()])
  for (const pid of allPartnerIds) {
    const p30 = purchasesCount.get(pid) ?? 0
    const agg = disputesAgg.get(pid) ?? { total: 0, approved: 0, rejected: 0 }
    const rate = p30 > 0 ? Math.round((agg.total / p30) * 1000) / 10 : 0
    const exceeds =
      agg.total >= DISPUTE_ABUSE_MIN_COUNT && rate > DISPUTE_ABUSE_THRESHOLD_PERCENT
    result.set(pid, {
      purchases30d: p30,
      disputes30d: agg.total,
      approved30d: agg.approved,
      rejected30d: agg.rejected,
      disputeRatePct: rate,
      exceedsAbuseThreshold: exceeds,
    })
  }

  return result
}
