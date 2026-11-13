import {
  isValidFrBePhone,
  isValidBelgianVat,
  normalizeBelgianVat,
  isWalloonPostalCode,
  extractBelgianStreetAndNumber,
} from "../leads-validation"

export { isWalloonPostalCode }

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
  city?: string | null
  siteAddress?: string | null
  province?: string | null
  segment?: string | null
  company?: string | null
  companyVat?: string | null
  ownershipStatus?: string | null
  surfaceArea?: number | null
  annualElectricityBill?: number | null
  qualificationMetadata?: Record<string, unknown> | null
}

/**
 * Plages des codes postaux wallons (définies de façon canonique dans lib/leads-validation.ts) :
 * - Brabant wallon : 1300 - 1499
 * - Liège : 4000 - 4999
 * - Namur : 5000 - 5999
 * - Hainaut : 6000 - 6599 et 7000 - 7999
 * - Luxembourg : 6600 - 6999
 */

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

  // 3. Localisation en Région Wallonne & Qualité de l'Adresse Chantier
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

  // 3b. Adresse de voirie & numéro de bâtiment (requis pour Street View / étude satellite)
  const spwVerif = (
    (lead.qualificationMetadata?.verifications as Record<string, unknown> | undefined)
      ?.walloniaAddress as Record<string, unknown> | undefined
  )
  const trimmedAddr = (lead.siteAddress ?? "").trim()
  const isB2C = lead.segment === "B2C"

  if (!trimmedAddr) {
    flags.push({
      code: "MISSING_ADDRESS",
      label: "Adresse chantier absente",
      severity: isB2C ? "critical" : "warning",
      description:
        "Aucune rue/adresse précise renseignée : impossible de localiser la toiture avant appel.",
    })
  } else {
    const parsedAddr = extractBelgianStreetAndNumber(trimmedAddr)
    if (!parsedAddr.houseNumber) {
      flags.push({
        code: "MISSING_HOUSE_NUMBER",
        label: "Numéro de maison manquant",
        severity: isB2C ? "critical" : "warning",
        description: `L'adresse « ${trimmedAddr} » ne comporte pas de numéro de bâtiment — vue satellite / Street View précise impossible.`,
      })
    } else if (spwVerif) {
      if (spwVerif.postalMismatch === true) {
        flags.push({
          code: "ADDRESS_POSTAL_MISMATCH",
          label: "Incohérence CP / localité SPW",
          severity: "critical",
          description: `Le code postal saisi (${lead.postalCode || "?"}) ne correspond pas à la localité détectée par SPW (${String(spwVerif.officialPostalCode || "?")} ${String(spwVerif.officialCity || "")}).`,
        })
      } else if (spwVerif.streetVerified === false) {
        flags.push({
          code: "UNVERIFIED_STREET",
          label: "Rue non trouvée au cadastre SPW",
          severity: "warning",
          description: `La voirie « ${parsedAddr.street} » n'a pas été trouvée telle quelle dans le code postal ${lead.postalCode || ""}. Vérifiez l'orthographe.`,
        })
      } else if (spwVerif.houseVerified === false && spwVerif.resolutionLevel === "street") {
        flags.push({
          code: "UNVERIFIED_HOUSE_NUMBER",
          label: "N° non confirmé SPW ICAR",
          severity: "warning",
          description: `La rue est reconnue, mais le numéro « ${parsedAddr.houseNumber} » n'apparaît pas au cadastre SPW (nouvelle construction ou erreur).`,
        })
      }
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
