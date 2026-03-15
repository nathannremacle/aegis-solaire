/**
 * Scoring prédictif du lead (qualification B2B).
 * Attribue une note sur 100 et détermine le statut recommandé (HOT_LEAD / new / NEEDS_HUMAN_REVIEW).
 */

const HIGH_VALUE_JOB_TITLES = [
  "daf",
  "directeur financier",
  "directeur general",
  "directeur général",
  "pdg",
  "directeur rse",
  "responsable rse",
]

/** Détecte noms/prénoms suspects (suites de lettres sans sens, caractères bizarres). */
function hasSuspiciousName(name: string): boolean {
  const cleaned = name.trim().toLowerCase()
  if (cleaned.length < 2) return true
  // Suite de caractères répétitifs ou très peu variés
  const uniqueLetters = new Set(cleaned.replace(/\s/g, "").split("")).size
  if (uniqueLetters <= 2) return true
  // Mots "clavier" type asdf, qwerty, aaaa
  const nonsense = /^(.)\1{3,}$|^[asdfqwer]+$|^[qwerty]+$|^[azerty]+$/i
  if (nonsense.test(cleaned)) return true
  // Caractères non lettres (sauf espaces, tirets, apostrophes)
  if (/[0-9<>{}[\]\\|]/.test(cleaned)) return true
  return false
}

/** Vérifie si la facture d'électricité est cohérente avec la surface (ordre de grandeur). */
function isBillCoherentWithSurface(annualBill: number, surfaceArea: number): boolean {
  // ~150 W/m² × 1100 h × 0.18 €/kWh ≈ 30 €/m²/an en prod ; conso souvent 50–150 €/m²/an pour du tertiaire/industriel
  const minExpected = surfaceArea * 20  // au moins 20 €/m²
  const maxExpected = surfaceArea * 200  // au plus 200 €/m²
  return annualBill >= minExpected && annualBill <= maxExpected
}

export type LeadScoreInput = {
  firstName: string
  lastName: string
  jobTitle: string
  surfaceArea: number
  annualElectricityBill: number
}

export type LeadScoreResult = {
  score: number
  status: "HOT_LEAD" | "new" | "NEEDS_HUMAN_REVIEW"
}

/**
 * Calcule le score de qualification du lead (0–100) et le statut recommandé.
 * - score < 40 → NEEDS_HUMAN_REVIEW (ne pas envoyer auto aux installateurs)
 * - score > 70 → HOT_LEAD
 * - sinon → new
 */
export function calculateLeadScore(data: LeadScoreInput): LeadScoreResult {
  let score = 50 // base

  // +30 si fonction à fort pouvoir de décision
  const jobLower = data.jobTitle.trim().toLowerCase()
  const isHighValueJob = HIGH_VALUE_JOB_TITLES.some((title) => jobLower.includes(title))
  if (isHighValueJob) score += 30

  // +30 si surface > 1500 m² (gros projet)
  if (data.surfaceArea > 1500) score += 30

  // +20 si facture cohérente avec la surface
  if (isBillCoherentWithSurface(data.annualElectricityBill, data.surfaceArea)) score += 20

  // -50 si nom ou prénom suspects (bot / faux)
  if (hasSuspiciousName(data.firstName) || hasSuspiciousName(data.lastName)) score -= 50

  score = Math.max(0, Math.min(100, score))

  let status: LeadScoreResult["status"] = "new"
  if (score < 40) status = "NEEDS_HUMAN_REVIEW"
  else if (score > 70) status = "HOT_LEAD"

  return { score, status }
}
