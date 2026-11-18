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
  error?: string
  remainingHoursForUnreachable?: number
}

export function checkDisputeEligibility(params: {
  reason: string
  purchasedAt?: string | Date | null
  nowMs?: number
  details?: string | null
  contactPreference?: string | null
  diligenceConfirmed?: boolean
  skipDetailsCheck?: boolean
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

  if (!params.skipDetailsCheck) {
    const len = (params.details ?? "").trim().length
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
