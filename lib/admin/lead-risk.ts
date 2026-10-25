import { isValidFrBePhone, isValidBelgianVat, normalizeBelgianVat } from "@/lib/leads-validation"

export type RiskSeverity = "critical" | "warning"

export type RiskFlag = {
  code: string
  label: string
  severity: RiskSeverity
  description: string
}

export type LeadRiskInput = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  postalCode?: string | null
  province?: string | null
  segment?: string | null
  company?: string | null
  companyVat?: string | null
  ownershipStatus?: string | null
  surfaceArea?: number | null
  annualElectricityBill?: number | null
}

/**
 * Plages des codes postaux wallons :
 * - Brabant wallon : 1300 - 1499
 * - Liège : 4000 - 4999
 * - Namur : 5000 - 5999
 * - Hainaut : 6000 - 6599 et 7000 - 7999
 * - Luxembourg : 6600 - 6999
 */
export function isWalloonPostalCode(postalCode: string): boolean {
  const digits = postalCode.replace(/\D/g, "")
  if (digits.length !== 4) return false
  const n = parseInt(digits, 10)
  return (
    (n >= 1300 && n <= 1499) ||
    (n >= 4000 && n <= 4999) ||
    (n >= 5000 && n <= 5999) ||
    (n >= 6000 && n <= 6599) ||
    (n >= 6600 && n <= 6999) ||
    (n >= 7000 && n <= 7999)
  )
}

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

export function detectLeadRiskFlags(lead: LeadRiskInput): RiskFlag[] {
  const flags: RiskFlag[] = []

  // 1. Contrôle Téléphone
  if (!lead.phone || lead.phone.trim() === "") {
    flags.push({
      code: "NO_PHONE",
      label: "Numéro absent",
      severity: "critical",
      description: "Aucun numéro de téléphone fourni par le prospect.",
    })
  } else if (!isValidFrBePhone(lead.phone)) {
    flags.push({
      code: "INVALID_PHONE",
      label: "Numéro suspect / invalide",
      severity: "critical",
      description: "Le format de téléphone BE/FR est non conforme ou présente une répétition anormale.",
    })
  }

  // 2. Contrôle Nom & Prénom
  if (
    (lead.firstName && hasSuspiciousName(lead.firstName)) ||
    (lead.lastName && hasSuspiciousName(lead.lastName))
  ) {
    flags.push({
      code: "SUSPICIOUS_NAME",
      label: "Nom / Prénom suspect",
      severity: "warning",
      description: "Caractères aléatoires ou répétitions détectés.",
    })
  }

  // 3. Localisation en Région Wallonne
  if (lead.postalCode && lead.postalCode.trim().length === 4) {
    if (!isWalloonPostalCode(lead.postalCode)) {
      flags.push({
        code: "OUT_OF_WALLONIA",
        label: "Hors Wallonie",
        severity: "critical",
        description: `Code postal ${lead.postalCode} situé hors du territoire wallon (Flandre ou Bruxelles).`,
      })
    }
  }

  // 4. Contrôle B2B : TVA et Société
  if (lead.segment === "B2B") {
    if (!lead.company || lead.company.trim().length < 2) {
      flags.push({
        code: "B2B_MISSING_COMPANY",
        label: "Entreprise non précisée",
        severity: "critical",
        description: "Nom d'entreprise requis pour les dossiers B2B.",
      })
    }
    if (lead.companyVat) {
      const normalizedVat = normalizeBelgianVat(lead.companyVat)
      if (!isValidBelgianVat(normalizedVat)) {
        flags.push({
          code: "INVALID_VAT",
          label: "TVA invalide",
          severity: "warning",
          description: "La clé de contrôle Modulo 97 de la TVA belge n'est pas conforme.",
        })
      }
    } else {
      flags.push({
        code: "B2B_NO_VAT",
        label: "TVA absente",
        severity: "warning",
        description: "Numéro d'entreprise / TVA non renseigné pour ce lead B2B.",
      })
    }
  }

  // 5. Statut d'occupation
  if (lead.ownershipStatus === "tenant_unauthorized" || lead.ownershipStatus === "tenant") {
    flags.push({
      code: "TENANT_UNAUTHORIZED",
      label: "Locataire sans accord",
      severity: "warning",
      description: "Le signataire est locataire et n'a pas confirmé l'accord du propriétaire.",
    })
  }

  // 6. Ratio Incohérent Facture / Surface
  if (lead.surfaceArea && lead.annualElectricityBill) {
    const ratio = lead.annualElectricityBill / Math.max(lead.surfaceArea, 1)
    if (lead.segment === "B2B" && (ratio < 1.5 || ratio > 1500)) {
      flags.push({
        code: "INCOHERENT_METRICS",
        label: "Ratio facture/surface atypique",
        severity: "warning",
        description: `Ratio ${ratio.toFixed(1)} €/m² très éloigné des standards tertiaires.`,
      })
    }
  }

  return flags
}
