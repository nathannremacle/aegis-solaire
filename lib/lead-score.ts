/**
 * Scoring prédictif du lead (qualification B2B) — tunnel Wallonie.
 */

const HIGH_VALUE_JOB_KEYWORDS = [
  "directeur",
  "daf",
  "pdg",
  "ceo",
  "gérant",
  "gerant",
  "dirigeant",
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
  /** GRD renseigné (hors « je ne sais pas ») */
  grd?: string | null
}

export type LeadScoreResult = {
  score: number
  status: "HOT_LEAD" | "new" | "NEEDS_HUMAN_REVIEW"
}

/**
 * Calcule le score de qualification du lead (0–100) et le statut recommandé.
 */
export function calculateLeadScore(data: LeadScoreInput): LeadScoreResult {
  let score = 0

  if (data.annualElectricityBill > 100_000) score += 35
  else if (data.annualElectricityBill > 50_000) score += 25
  else if (data.annualElectricityBill > 20_000) score += 15

  if (data.surfaceArea >= 1_500) score += 20
  else if (data.surfaceArea >= 500) score += 10

  const jobLower = data.jobTitle.trim().toLowerCase()
  const isHighValueJob = HIGH_VALUE_JOB_KEYWORDS.some((kw) => jobLower.includes(kw))
  if (isHighValueJob) score += 20

  if (data.grd && data.grd !== "unknown") score += 5

  if (hasSuspiciousName(data.firstName) || hasSuspiciousName(data.lastName)) score -= 50

  score = Math.max(0, Math.min(100, score))

  let status: LeadScoreResult["status"] = "new"
  if (score < 40) status = "NEEDS_HUMAN_REVIEW"
  else if (score > 70) status = "HOT_LEAD"

  return { score, status }
}
