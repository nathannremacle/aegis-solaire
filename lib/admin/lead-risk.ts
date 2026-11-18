import {
  detectCityPostalContradiction,
  extractBelgianStreetAndNumber,
  getEmailError,
  isSuspiciousPersonName,
  isValidBelgianVat,
  isValidFrBePhone,
  isWalloonPostalCode,
  normalizeBelgianVat,
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

export function detectLeadRiskFlags(lead: LeadRiskInput): RiskFlag[] {
  const flags: RiskFlag[] = []
  const verifs =
    (lead.qualificationMetadata?.verifications as Record<string, unknown> | undefined) ?? undefined

  // 1. Contrôle Téléphone (incluant suites factices type 10 20 30, 12 34 56, 11 22 33)
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
      label: "Numéro suspect / factice",
      severity: "critical",
      description:
        "Numéro non conforme au plan BE/FR ou suite factice détectée (type 10 20 30, 12 34 56, répétition).",
    })
  }

  // 1b. Contrôle E-mail (syntaxe, domaine jetable, typo, MX)
  const emailStr = (lead.email ?? "").trim()
  const emailSyntaxErr = emailStr ? getEmailError(emailStr) : "E-mail absent"
  const emailMx = verifs?.emailMx as
    | { valid?: boolean; isDisposable?: boolean; transientError?: boolean; reason?: string }
    | undefined

  if (emailMx?.isDisposable) {
    flags.push({
      code: "DISPOSABLE_EMAIL",
      label: "E-mail temporaire / jetable",
      severity: "critical",
      description: "Le domaine de messagerie est un fournisseur d'e-mails jetables.",
    })
  } else if (emailMx && emailMx.valid === false && !emailMx.transientError) {
    flags.push({
      code: "INVALID_EMAIL_MX",
      label: "Domaine e-mail sans serveur MX",
      severity: "critical",
      description: emailMx.reason || "Aucun serveur de messagerie actif détecté pour ce domaine.",
    })
  } else if (emailSyntaxErr) {
    flags.push({
      code: "INVALID_EMAIL",
      label: "E-mail suspect ou mal orthographié",
      severity: "critical",
      description: emailSyntaxErr,
    })
  }

  // 2. Contrôle Nom & Prénom
  if (
    (lead.firstName && isSuspiciousPersonName(lead.firstName)) ||
    (lead.lastName && isSuspiciousPersonName(lead.lastName))
  ) {
    flags.push({
      code: "SUSPICIOUS_NAME",
      label: "Nom / Prénom suspect",
      severity: "warning",
      description: "Nom de test, chiffres ou caractères répétitifs détectés.",
    })
  } else if (
    lead.firstName &&
    lead.lastName &&
    lead.firstName.trim().length >= 2 &&
    lead.firstName.trim().toLowerCase() === lead.lastName.trim().toLowerCase()
  ) {
    flags.push({
      code: "IDENTICAL_FIRST_LAST_NAME",
      label: "Prénom et nom identiques",
      severity: "warning",
      description: "Le prénom et le nom renseignés sont strictement identiques.",
    })
  }

  // 3. Localisation en Région Wallonne & Contradictions Géographiques
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

  const isWalloonClaim = [
    "liege",
    "hainaut",
    "namur",
    "luxembourg",
    "brabant_wallon",
  ].includes((lead.province ?? "").trim())
  const geoContradiction = detectCityPostalContradiction({
    postalCode: lead.postalCode,
    city: lead.city,
    siteAddress: lead.siteAddress,
    walloniaOnly: lead.segment === "B2C" || isWalloonClaim,
  })
  if (geoContradiction) {
    flags.push({
      code: "GEO_CONTRADICTION",
      label: "Contradiction géographique",
      severity: "critical",
      description: geoContradiction,
    })
  }

  // 3b. Adresse de voirie & numéro de bâtiment (requis pour Street View / étude satellite)
  const spwVerif = verifs?.walloniaAddress as Record<string, unknown> | undefined
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

  // 4. Contrôle B2B : TVA, Société & BCE
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

    const cbe = verifs?.cbeCompany as
      | { verified?: boolean; active?: boolean; officialName?: string; nameMatchesInput?: boolean }
      | undefined
    if (cbe?.verified && cbe.active === false) {
      flags.push({
        code: "CBE_INACTIVE",
        label: "Société fermée ou radiée (BCE)",
        severity: "critical",
        description: "L'unité légale n'est plus active selon la Banque-Carrefour des Entreprises.",
      })
    } else if (cbe?.verified && cbe.nameMatchesInput === false) {
      flags.push({
        code: "CBE_NAME_MISMATCH",
        label: "Raison sociale divergente (BCE)",
        severity: "warning",
        description: `Dénomination déclarée différente du registre BCE (« ${cbe.officialName || "?"} »).`,
      })
    }
  }

  // 5. Statut d'occupation
  if (lead.ownershipStatus === "tenant_unauthorized" || lead.ownershipStatus === "tenant") {
    flags.push({
      code: "TENANT_UNAUTHORIZED",
      label: "Locataire sans accord",
      severity: isB2C ? "critical" : "warning",
      description: "Le signataire est locataire et n'a pas confirmé l'accord du propriétaire.",
    })
  }

  // 5b. Contrôle Doublon (< 30 jours)
  const dup = verifs?.duplicateCheck as
    | { hasDuplicatePhone?: boolean; hasDuplicateEmail?: boolean }
    | undefined
  if (dup?.hasDuplicatePhone || dup?.hasDuplicateEmail) {
    flags.push({
      code: "DUPLICATE_CONTACT",
      label: "Doublon détecté (< 30 j)",
      severity: "warning",
      description:
        dup.hasDuplicatePhone && dup.hasDuplicateEmail
          ? "Un dossier récent possède déjà le même numéro de téléphone et la même adresse e-mail."
          : dup.hasDuplicatePhone
            ? "Un autre dossier récent utilise déjà ce numéro de téléphone."
            : "Un autre dossier récent utilise déjà cette adresse e-mail.",
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
