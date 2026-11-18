import {
  detectCityPostalContradiction,
  getEmailError,
  hasBelgianHouseNumber,
  isSuspiciousPersonName,
  isValidBelgianVat,
  isValidFrBePhone,
  isWalloonPostalCode,
} from "@/lib/leads-validation"

/**
 * Module de contrôle de qualité et d'éligibilité des leads pour la marketplace Aegis Solaire.
 * Empêche la publication de leads incomplets ou erronés qui détruisent la crédibilité auprès des installateurs.
 */

export interface LeadQualityCheckResult {
  isPublishable: boolean
  missingFields: string[]
  warnings: string[]
  score: number // 0 à 100
}

export function evaluateLeadPublishability(lead: {
  province?: string | null
  postal_code?: string | null
  city?: string | null
  site_address?: string | null
  surface_area?: number | null
  surface_type?: string | null
  annual_electricity_bill?: number | null
  segment?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
  company_vat?: string | null
  ownership_status?: string | null
  email_delivery_status?: string | null
  qualification_metadata?: Record<string, unknown> | null
}): LeadQualityCheckResult {
  const missingFields: string[] = []
  const warnings: string[] = []
  const isB2B = lead.segment === "B2B"

  // Champs obligatoires critiques pour la marketplace
  if (!lead.province || lead.province.trim() === "") {
    missingFields.push("Province manquante")
  }

  if (!lead.surface_area || Number(lead.surface_area) <= 0) {
    missingFields.push("Surface toiture invalide ou nulle")
  }

  if (!lead.surface_type || lead.surface_type.trim() === "") {
    missingFields.push("Type d'implantation (toiture/ombrière/sol) manquant")
  }

  if (!lead.annual_electricity_bill || Number(lead.annual_electricity_bill) <= 0) {
    missingFields.push("Facture d'électricité manquante ou nulle")
  }

  // Validation stricte e-mail & téléphone lorsqu'ils sont chargés sur l'objet lead
  if ("email" in lead) {
    const emailStr = (lead.email ?? "").trim()
    const emailErr = getEmailError(emailStr)
    if (emailErr) {
      missingFields.push(`E-mail invalide (${emailErr})`)
    }
  }

  if ("phone" in lead) {
    const phoneStr = (lead.phone ?? "").trim()
    if (!phoneStr || !isValidFrBePhone(phoneStr)) {
      missingFields.push("Numéro de téléphone invalide, absent ou factice")
    }
  }

  if ("first_name" in lead && lead.first_name && isSuspiciousPersonName(lead.first_name)) {
    missingFields.push("Prénom suspect ou de test")
  }
  if ("last_name" in lead && lead.last_name && isSuspiciousPersonName(lead.last_name)) {
    missingFields.push("Nom suspect ou de test")
  }

  if ("ownership_status" in lead && lead.ownership_status === "tenant_unauthorized") {
    missingFields.push("Locataire sans accord du propriétaire")
  }

  if (isB2B && "company_vat" in lead && lead.company_vat) {
    if (!isValidBelgianVat(lead.company_vat)) {
      missingFields.push("Numéro TVA/BCE belge invalide (Modulo 97)")
    }
  }

  // Vérifications techniques & géographiques stockées en métadonnées
  const verifs =
    lead.qualification_metadata &&
    typeof lead.qualification_metadata === "object" &&
    (lead.qualification_metadata as Record<string, unknown>).verifications &&
    typeof (lead.qualification_metadata as Record<string, unknown>).verifications === "object"
      ? ((lead.qualification_metadata as Record<string, unknown>).verifications as Record<string, unknown>)
      : null

  const emailMx = verifs?.emailMx as
    | { valid?: boolean; isDisposable?: boolean; transientError?: boolean; reason?: string }
    | undefined
  const emailDelivery = verifs?.emailDelivery as
    | { status?: string; reason?: string }
    | undefined
  if (
    lead.email_delivery_status === "bounced" ||
    emailDelivery?.status === "bounced" ||
    emailDelivery?.status === "complained"
  ) {
    missingFields.push("E-mail inexistant (rebond SMTP détecté)")
  } else if (emailMx) {
    if (emailMx.isDisposable) {
      missingFields.push("Adresse e-mail jetable bloquée")
    } else if (emailMx.valid === false && !emailMx.transientError) {
      missingFields.push(emailMx.reason || "Domaine e-mail sans serveur MX valide")
    }
  }

  const spwAddr = verifs?.walloniaAddress as
    | { postalMismatch?: boolean; validInWallonia?: boolean }
    | undefined
  if (spwAddr?.postalMismatch) {
    missingFields.push("Incohérence code postal / adresse SPW ICAR")
  }

  const cbe = verifs?.cbeCompany as
    | { verified?: boolean; active?: boolean; nameMatchesInput?: boolean }
    | undefined
  if (isB2B && cbe?.verified && cbe.active === false) {
    missingFields.push("Entreprise fermée ou radiée à la BCE")
  } else if (isB2B && cbe?.verified && cbe.nameMatchesInput === false) {
    warnings.push("Raison sociale déclarée différente de la BCE")
  }

  // Périmètre géographique Wallonie & adresse complète
  if (!isB2B) {
    if ("postal_code" in lead) {
      const cp = (lead.postal_code ?? "").trim()
      if (!cp || !isWalloonPostalCode(cp)) {
        missingFields.push("Code postal hors Wallonie (1300-1499 ou 4000-7999 requis)")
      }
    }

    if ("site_address" in lead) {
      const trimmedAddr = (lead.site_address ?? "").trim()
      if (!trimmedAddr) {
        missingFields.push("Adresse du bien (rue et numéro) manquante")
      } else if (!hasBelgianHouseNumber(trimmedAddr)) {
        missingFields.push("Numéro de maison manquant dans l'adresse (localisation toiture impossible)")
      }
    }

    const geoContradiction = detectCityPostalContradiction({
      postalCode: lead.postal_code,
      city: lead.city,
      siteAddress: lead.site_address,
      walloniaOnly: true,
    })
    if (geoContradiction) {
      missingFields.push(geoContradiction)
    }
  } else {
    if ("site_address" in lead) {
      const trimmedAddr = (lead.site_address ?? "").trim()
      if (!trimmedAddr) {
        warnings.push("Adresse ou zoning B2B non précisé")
      }
    }
    if (!lead.company || lead.company.trim() === "") {
      warnings.push("Nom d'entreprise non spécifié pour un dossier B2B")
    }
    const isWalloonClaim = [
      "liege",
      "hainaut",
      "namur",
      "luxembourg",
      "brabant_wallon",
    ].includes((lead.province ?? "").trim())
    const geoContradiction = detectCityPostalContradiction({
      postalCode: lead.postal_code,
      city: lead.city,
      siteAddress: lead.site_address,
      walloniaOnly: isWalloonClaim,
    })
    if (geoContradiction) {
      missingFields.push(geoContradiction)
    }
  }

  // Calcul d'un score de complétude
  let score = 100
  score -= missingFields.length * 25
  score -= warnings.length * 10
  score = Math.max(0, Math.min(100, score))

  return {
    isPublishable: missingFields.length === 0,
    missingFields,
    warnings,
    score,
  }
}
