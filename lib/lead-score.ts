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
  "resp. rse",
  "technique",
  "rse",
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
  jobTitle?: string | null
  surfaceArea: number
  annualElectricityBill: number
  segment?: "B2B" | "B2C" | string
  /** GRD renseigné (hors « je ne sais pas ») */
  grd?: string | null
}

export type ScoreFactor = {
  label: string
  delta: number
}

export type LeadScoreResult = {
  score: number
  status: "HOT_LEAD" | "new" | "NEEDS_HUMAN_REVIEW"
  factors: ScoreFactor[]
}

/**
 * Calcule le score de qualification du lead (0–100) et le statut recommandé.
 */
export function calculateLeadScore(data: LeadScoreInput): LeadScoreResult {
  let score = 0
  const factors: ScoreFactor[] = []
  const isB2C = data.segment === "B2C"

  if (isB2C) {
    // ── Barème spécifique B2C Résidentiel ──
    if (data.annualElectricityBill >= 2_500) {
      score += 35
      factors.push({ label: "Facture annuelle ≥ 2 500 €", delta: 35 })
    } else if (data.annualElectricityBill >= 1_500) {
      score += 25
      factors.push({ label: "Facture annuelle ≥ 1 500 €", delta: 25 })
    } else if (data.annualElectricityBill >= 900) {
      score += 15
      factors.push({ label: "Facture annuelle ≥ 900 €", delta: 15 })
    }

    if (data.surfaceArea >= 50 && data.surfaceArea <= 400) {
      score += 25
      factors.push({ label: "Surface toiture optimale (50-400 m²)", delta: 25 })
    } else if (data.surfaceArea >= 25) {
      score += 15
      factors.push({ label: "Surface toiture minimale (≥ 25 m²)", delta: 15 })
    }

    // Bonus de complétion résidentiel
    score += 15
    factors.push({ label: "Formulaire résidentiel complété", delta: 15 })

    // Pénalité d'incohérence résidentielle (ex: 5000 m² de toiture pour 400 € de facture)
    if (data.surfaceArea > 600 || data.annualElectricityBill < 500) {
      score -= 25
      factors.push({ label: "Incohérence surface/facture résidentielle", delta: -25 })
    }
  } else {
    // ── Barème spécifique B2B Tertiaire & Industriel ──
    if (data.annualElectricityBill > 100_000) {
      score += 35
      factors.push({ label: "Facture annuelle > 100 000 €", delta: 35 })
    } else if (data.annualElectricityBill > 50_000) {
      score += 25
      factors.push({ label: "Facture annuelle > 50 000 €", delta: 25 })
    } else if (data.annualElectricityBill >= 15_000) {
      score += 15
      factors.push({ label: "Facture annuelle ≥ 15 000 €", delta: 15 })
    } else if (data.annualElectricityBill >= 5_000) {
      score += 10
      factors.push({ label: "Facture annuelle ≥ 5 000 €", delta: 10 })
    }

    if (data.surfaceArea >= 1_500) {
      score += 25
      factors.push({ label: "Surface industrielle (≥ 1 500 m²)", delta: 25 })
    } else if (data.surfaceArea >= 500) {
      score += 15
      factors.push({ label: "Grande surface toiture (≥ 500 m²)", delta: 15 })
    } else if (data.surfaceArea >= 200) {
      score += 10
      factors.push({ label: "Surface moyenne tertiaire (≥ 200 m²)", delta: 10 })
    }

    if (data.jobTitle) {
      const jobLower = data.jobTitle.trim().toLowerCase()
      const isHighValueJob = HIGH_VALUE_JOB_KEYWORDS.some((kw) => jobLower.includes(kw))
      if (isHighValueJob) {
        score += 20
        factors.push({ label: `Décideur identifié (${data.jobTitle})`, delta: 20 })
      }
    }

    // Pénalité d'incohérence physique B2B (facture / surface disproportionnée)
    const billPerM2 = data.annualElectricityBill / Math.max(data.surfaceArea, 1)
    if (billPerM2 < 1.5 || billPerM2 > 1500) {
      score -= 30
      factors.push({ label: "Incohérence physique facture/m² B2B", delta: -30 })
    }
  }

  if (data.grd && data.grd !== "unknown") {
    score += 5
    factors.push({ label: `Gestionnaire réseau (${data.grd.toUpperCase()})`, delta: 5 })
  }

  if (hasSuspiciousName(data.firstName) || hasSuspiciousName(data.lastName)) {
    score -= 50
    factors.push({ label: "Nom ou prénom suspect", delta: -50 })
  }

  score = Math.max(0, Math.min(100, score))

  let status: LeadScoreResult["status"] = "new"
  if (score < 40) status = "NEEDS_HUMAN_REVIEW"
  else if (score >= 70) status = "HOT_LEAD"

  return { score, status, factors }
}
