import { hasBelgianHouseNumber } from "@/lib/leads-validation"

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
}): LeadQualityCheckResult {
  const missingFields: string[] = []
  const warnings: string[] = []

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

  const hasEmail = Boolean(lead.email && lead.email.trim().includes("@"))
  const hasPhone = Boolean(lead.phone && lead.phone.trim().length >= 8)

  if (!hasEmail && !hasPhone) {
    missingFields.push("Aucun moyen de contact direct (téléphone ou email)")
  } else if (!hasPhone) {
    warnings.push("Numéro de téléphone absent (email uniquement)")
  }

  // Contrôle qualité d'adresse : en B2C, rue + numéro requis si la colonne est sélectionnée
  if (lead.segment === "B2C" && "site_address" in lead) {
    const trimmedAddr = (lead.site_address ?? "").trim()
    if (!trimmedAddr) {
      missingFields.push("Adresse du bien (rue et numéro) manquante")
    } else if (!hasBelgianHouseNumber(trimmedAddr)) {
      missingFields.push("Numéro de maison manquant dans l'adresse (localisation toiture impossible)")
    }
  } else if (lead.segment === "B2B" && "site_address" in lead) {
    const trimmedAddr = (lead.site_address ?? "").trim()
    if (!trimmedAddr) {
      warnings.push("Adresse ou zoning B2B non précisé")
    }
  }

  if (lead.segment === "B2B" && (!lead.company || lead.company.trim() === "")) {
    warnings.push("Nom d'entreprise non spécifié pour un dossier B2B")
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
