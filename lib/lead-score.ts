/**
 * Scoring prédictif du lead (qualification B2B).
 * Attribue une note sur 100 selon les règles métiers et détermine le statut recommandé (HOT_LEAD / new / NEEDS_HUMAN_REVIEW).
 *
 * Règles :
 * - Délai "Urgent (< 3 mois)" = +40 pts / "3 à 6 mois" = +20 pts / "> 6 mois" = 0 pt.
 * - Fonction contient "Directeur", "DAF", "PDG", "CEO", "Gérant" = +20 pts.
 * - Facture annuelle > 50 000 € = +20 pts.
 * - Option IRVE cochée = +20 pts.
 */

const HIGH_VALUE_JOB_KEYWORDS = [
  "directeur",
  "daf",
  "pdg",
  "ceo",
  "gérant",
  "gerant",
]

/** Détecte noms/prénoms suspects (suites de lettres sans sens, caractères bizarres). */
function hasSuspiciousName(name: string): boolean {
  const cleaned = name.trim().toLowerCase()
  if (cleaned.length < 2) return true
  const uniqueLetters = new Set(cleaned.replace(/\s/g, "").split("")).size
  if (uniqueLetters <= 2) return true
  const nonsense = /^(.)\1{3,}$|^[asdfqwer]+$|^[qwerty]+$|^[azerty]+$/i
  if (nonsense.test(cleaned)) return true
  if (/[0-9<>{}[\]\\|]/.test(cleaned)) return true
  return false
}

export type LeadScoreInput = {
  firstName: string
  lastName: string
  jobTitle: string
  surfaceArea: number
  annualElectricityBill: number
  /** Délai projet : urgent | 3_6_months | 6_plus_months */
  projectTimeline?: string | null
  /** Option IRVE cochée */
  wantsIrve?: boolean
}

export type LeadScoreResult = {
  score: number
  status: "HOT_LEAD" | "new" | "NEEDS_HUMAN_REVIEW"
}

/**
 * Calcule le score de qualification du lead (0–100) et le statut recommandé.
 * - score > 70 → HOT_LEAD (badge rouge/feu)
 * - score 40–70 → new (badge orange)
 * - score < 40 → NEEDS_HUMAN_REVIEW (badge gris)
 */
export function calculateLeadScore(data: LeadScoreInput): LeadScoreResult {
  let score = 0

  // Délai : Urgent = +40, 3 à 6 mois = +20, > 6 mois = 0
  if (data.projectTimeline === "urgent") score += 40
  else if (data.projectTimeline === "3_6_months") score += 20
  // 6_plus_months ou non renseigné = 0

  // Fonction à fort pouvoir de décision = +20
  const jobLower = data.jobTitle.trim().toLowerCase()
  const isHighValueJob = HIGH_VALUE_JOB_KEYWORDS.some((kw) => jobLower.includes(kw))
  if (isHighValueJob) score += 20

  // Facture annuelle > 50 000 € = +20
  if (data.annualElectricityBill > 50_000) score += 20

  // Option IRVE cochée = +20
  if (data.wantsIrve === true) score += 20

  // Pénalité si nom/prénom suspects (bot / faux)
  if (hasSuspiciousName(data.firstName) || hasSuspiciousName(data.lastName)) score -= 50

  score = Math.max(0, Math.min(100, score))

  let status: LeadScoreResult["status"] = "new"
  if (score < 40) status = "NEEDS_HUMAN_REVIEW"
  else if (score > 70) status = "HOT_LEAD"

  return { score, status }
}
