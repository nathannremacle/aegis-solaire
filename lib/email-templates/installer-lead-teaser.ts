import { FinancialEstimates } from "@/lib/marketplace-pricing"
import {
  formatProvinceLocative,
  getBelgiumProvinceKeyFromPostalCode,
  getProvinceDisplayLabel,
} from "@/lib/belgium-regions"
import {
  SURFACE_TYPE_LABELS,
  ROOF_MATERIAL_LABELS,
  TIMEFRAME_LABELS,
  OWNERSHIP_LABELS,
  PROJECT_DRIVER_LABELS,
  sanitizeLeadNotes,
  getPropertyTypeLabel,
  getGrdLabel,
} from "@/lib/lead-display-helpers"
import {
  buildPartnerNotificationUrls,
  buildPartnerExpressLeadUrls,
} from "@/lib/partner-notification-tokens"
import { calculateOrderFinancials, getExclusiveCreditCost } from "@/lib/credit-pricing"
import { getLeadVerificationSummary } from "@/lib/lead-verification-display"
import {
  AI_PROJECTION_BADGE_SHORT,
  AI_PROJECTION_EMAIL_CAPTION,
  getLeadImages,
  getPrimaryLeadImageItem,
} from "@/lib/lead-images"

export interface InstallerLeadTeaserData {
  partner: {
    id: string
    companyName: string
    contactName?: string | null
    credits: number
  }
  lead: {
    id: string
    segment: "B2B" | "B2C" | string
    province: string
    provinceFreeText?: string | null
    postalCode?: string | null
    city?: string | null
    surfaceType: string
    surfaceArea: number
    roofMaterial?: string | null
    annualElectricityBill: number
    estimatedPowerKwc?: number | null
    timeframe?: string | null
    ownershipStatus?: string | null
    projectDriver?: string | null
    projectDetails?: string | null
    contactPreference?: string | null
    phone?: string | null
    firstName: string
    lastName?: string | null
    grd?: string | null
    roofImageUrl?: string | null
    roofImagesCount?: number
    roofImageIsAiProjection?: boolean
    phoneVerified?: boolean | null
    phoneVerificationMethod?: string | null
    phoneCarrier?: string | null
    phoneLineType?: string | null
    emailVerified?: boolean | null
    emailDeliveryStatus?: string | null
    qualificationMetadata?: Record<string, unknown> | null
    createdAt: string
  }
  waveNumber: 1 | 2 | 3 | number
  takenSlots: number
  maxSlots: number
  creditCost: number
  expressCheckoutUrl?: string | null
  financials: FinancialEstimates
  engagement?: {
    hasInspected?: boolean
    inspectedDurationMs?: number
    zoomedRoof?: boolean
    unlockIntent?: boolean
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatEur(amount: number): string {
  return `${amount.toLocaleString("fr-BE", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} € HT`
}

function formatPowerKwc(kwc: number): string {
  return `${kwc.toLocaleString("fr-BE", {
    minimumFractionDigits: kwc % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })} kWc`
}

function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
}

function getSafeOwnershipLabel(val?: string | null): string {
  if (!val) return "Propriétaire occupant"
  const clean = val.toLowerCase().trim()
  if (OWNERSHIP_LABELS[clean]) return OWNERSHIP_LABELS[clean]
  if (clean.includes("occup")) return "Propriétaire occupant"
  if (clean.includes("propri")) return "Propriétaire occupant"
  if (clean.includes("locat")) return "Locataire"
  if (clean.includes("business") || clean.includes("owner") || clean.includes("dirig")) {
    return "Chef d'entreprise / Dirigeant"
  }
  return "Propriétaire occupant"
}

function getExplicitTimeframeLabel(val?: string | null): string | null {
  if (!val || !val.trim()) return null
  const clean = val.toLowerCase().trim()
  if (clean === "non_specifie" || clean === "null" || clean === "undefined") return null
  if (TIMEFRAME_LABELS[clean]) return TIMEFRAME_LABELS[clean]
  if (clean.includes("immed") || clean.includes("urgent") || clean.includes("1_month")) {
    return "Immédiat (1 à 3 mois)"
  }
  if (clean.includes("3_months") || clean.includes("3 mois") || clean.includes("dans_les_3_mois")) {
    return "Dans les 3 mois"
  }
  if (clean.includes("6_months") || clean.includes("6 mois") || clean.includes("3_6mois")) {
    return "D'ici 3 à 6 mois"
  }
  if (clean.includes("12_months") || clean.includes("annee")) return "Dans l'année"
  return val.replace(/_/g, " ")
}

function getSafeDriverLabel(val?: string | null): string | null {
  if (!val || !val.trim()) return null
  const clean = val.toLowerCase().trim()
  if (PROJECT_DRIVER_LABELS[clean]) return PROJECT_DRIVER_LABELS[clean]
  if (clean.includes("facture") || clean.includes("cost") || clean.includes("reduc")) {
    return "Réduction des factures d'électricité"
  }
  if (clean.includes("auto")) return "Autonomie & autoconsommation"
  if (clean.includes("esg") || clean.includes("rse")) return "Transition énergétique & conformité RSE"
  return null
}

function getSafeSurfaceTypeLabel(val?: string | null): string {
  if (!val) return "Toiture"
  const clean = val.toLowerCase().trim()
  return SURFACE_TYPE_LABELS[clean] || "Toiture"
}

function getSafeRoofMaterialLabel(val?: string | null): string {
  if (!val) return "Toiture standard"
  const clean = val.toLowerCase().trim()
  return ROOF_MATERIAL_LABELS[clean] || "Toiture standard"
}

function formatContactPreferenceLabel(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null
  const clean = raw.toLowerCase().trim()
  if (
    clean === "written_first" ||
    clean.includes("écrit") ||
    clean.includes("ecrit") ||
    clean.includes("e-mail") ||
    clean.includes("email") ||
    clean.includes("sms")
  ) {
    return "Par e-mail ou SMS"
  }
  if (clean === "direct_call" || clean.includes("appel")) {
    return "Par appel direct (9h–18h)"
  }
  return raw.trim()
}

function formatCompactRoofSurface(
  specSurface: string | undefined,
  leadSurfaceArea: number,
  normalizedSurfaceM2: number,
  surfaceTypeLabel: string,
  isB2B: boolean
): string {
  if (specSurface) {
    const parenMatch = specSurface.match(/\(([^)]+)\)/)
    if (parenMatch) {
      const inner = parenMatch[1].trim().replace(/^~\s*/, "env. ")
      return inner
    }
    return specSurface
  }
  const area = leadSurfaceArea > 0 ? leadSurfaceArea : normalizedSurfaceM2
  if (area > 0) {
    return isB2B
      ? `${area.toLocaleString("fr-BE")} m² (${surfaceTypeLabel})`
      : `env. ${area.toLocaleString("fr-BE")} m²`
  }
  return surfaceTypeLabel
}

function getMaskedPhoneDisplay(phone?: string | null): string {
  if (!phone || !phone.trim()) return "04•• •• •• ••"
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("324") || digits.startsWith("04")) {
    return "04•• •• •• ••"
  }
  return "0• •• •• ••"
}

function getLeadLocationInfo(lead: {
  city?: string | null
  postalCode?: string | null
  province?: string | null
  provinceFreeText?: string | null
}): {
  city: string
  provinceLabel: string
  postalCode: string
  headlineLocation: string
  locPhrase: string
} {
  const rawCity =
    lead.city && lead.city !== "null" && lead.city !== "undefined"
      ? lead.city.trim().replace(/^\d{4}\s+/, "").trim()
      : ""
  const rawPostal =
    lead.postalCode && lead.postalCode !== "null" && lead.postalCode !== "undefined"
      ? lead.postalCode.trim()
      : ""
  const derivedProvinceKey = getBelgiumProvinceKeyFromPostalCode(rawPostal)
  const isSpecialMultiOrForeign =
    lead.province === "plusieurs_regions_be" || lead.province === "etranger"
  const effectiveProvinceKey =
    !isSpecialMultiOrForeign && derivedProvinceKey
      ? derivedProvinceKey
      : lead.province && lead.province !== "null" && lead.province !== "undefined"
        ? lead.province
        : ""
  const rawProvince = effectiveProvinceKey
    ? getProvinceDisplayLabel(effectiveProvinceKey, lead.provinceFreeText)
    : ""

  const provinceLabel =
    rawProvince && rawProvince !== "null" && rawProvince !== "undefined" ? rawProvince : "Wallonie"
  const city = rawCity || provinceLabel
  const postalCode = rawPostal || "—"

  const headlineLocation = rawPostal && rawCity
    ? `${rawPostal} ${rawCity}`
    : rawCity
      ? rawCity
      : rawPostal
        ? `${rawPostal} (${provinceLabel})`
        : provinceLabel

  let locPhrase = "en Wallonie"
  if (rawPostal && rawCity) {
    locPhrase = `à ${rawPostal} ${rawCity}`
  } else if (rawCity) {
    locPhrase = `à ${rawCity}`
  } else if (rawPostal && rawProvince) {
    locPhrase = `à ${rawPostal} (${rawProvince})`
  } else if (rawProvince) {
    locPhrase = formatProvinceLocative(rawProvince)
  }

  return { city, provinceLabel, postalCode, headlineLocation, locPhrase }
}

/**
 * Construit l'objet d'e-mail selon le niveau d'urgence et la typologie du dossier
 * Sans jamais mentionner le terme interne "vague".
 */
export function buildLeadEmailSubject(data: InstallerLeadTeaserData): string {
  const { locPhrase } = getLeadLocationInfo(data.lead)
  const isB2B = data.lead.segment === "B2B"
  const power =
    data.financials.estimatedPowerKwc > 0
      ? formatPowerKwc(data.financials.estimatedPowerKwc)
      : "PV"
  const remainingSlots = Math.max(0, data.maxSlots - data.takenSlots)
  const refCode = data.lead.id.slice(0, 8).toUpperCase()

  if (data.waveNumber === 1) {
    if (isB2B) {
      return isB2B && data.maxSlots <= 1
        ? `Nouveau projet B2B exclusif ${locPhrase} (${power}) — Dossier #${refCode}`
        : `Nouveau projet B2B ${locPhrase} (${power}) — ${remainingSlots === 1 ? "1 place dispo" : `${remainingSlots} places dispo`} (#${refCode})`
    }
    return `Nouveau dossier photovoltaïque ${locPhrase} — ${remainingSlots === 1 ? "1 place dispo" : `${remainingSlots} places dispo`} (#${refCode})`
  }

  if (data.waveNumber >= 2 && data.engagement?.hasInspected) {
    if (!isB2B && remainingSlots === 1) {
      return `Dossier consulté ${locPhrase} — Dernière place disponible`
    }
    if (!isB2B && data.takenSlots > 0) {
      return `Mise à jour sur le dossier consulté ${locPhrase} — ${remainingSlots} places restantes`
    }
    return `Rappel sur le dossier consulté ${locPhrase} (${power})`
  }

  if (data.waveNumber === 2) {
    if (isB2B) {
      return data.maxSlots <= 1
        ? `Rappel : Projet B2B exclusif disponible ${locPhrase} (${power})`
        : `Rappel : Projet B2B disponible ${locPhrase} (${power}) — ${remainingSlots}/${data.maxSlots} places`
    }
    if (remainingSlots === 1) {
      return `Dernière place disponible — Projet solaire ${locPhrase} (${power})`
    }
    if (data.takenSlots > 0) {
      return `Rappel : ${remainingSlots} places restantes — Projet solaire ${locPhrase}`
    }
    return `Projet solaire disponible ${locPhrase} (${power}) — ${remainingSlots} places ouvertes`
  }

  if (isB2B) {
    return data.maxSlots <= 1
      ? `Projet B2B exclusif toujours disponible ${locPhrase} (${power})`
      : `Projet B2B toujours disponible ${locPhrase} (${power}) — ${remainingSlots}/${data.maxSlots} places`
  }
  if (remainingSlots === 1) {
    return `Dernière place disponible : Installation solaire ${locPhrase}`
  }
  if (data.takenSlots > 0) {
    return `Dossier solaire ouvert ${locPhrase} (${power}) — ${remainingSlots} places restantes`
  }
  return `Installation solaire disponible ${locPhrase} (${power}) — ${remainingSlots} places ouvertes`
}

/**
 * Génère le contenu HTML et texte pour l'installateur
 * Architecture épurée Swiss/Editorial : lecture instantanée, mobile-first, 100% compatible Gmail / Outlook / Apple Mail.
 */
export function renderInstallerLeadTeaserEmail(data: InstallerLeadTeaserData): {
  subject: string
  text: string
  html: string
} {
  const subject = buildLeadEmailSubject(data)
  const baseUrl = getSiteBaseUrl()
  const expressUrls = buildPartnerExpressLeadUrls(baseUrl, data.partner.id, data.lead.id)
  const dashboardLeadUrl = data.expressCheckoutUrl || expressUrls.inspectLeadUrl
  const directCheckoutLeadUrl = data.expressCheckoutUrl || expressUrls.directCheckoutLeadUrl
  const creditsOrderUrl = expressUrls.creditsUrl
  const notifUrls = buildPartnerNotificationUrls(baseUrl, data.partner.id)
  const exclusiveCreditsCost = getExclusiveCreditCost({
    segment: data.lead.segment,
    credit_cost: data.creditCost,
  })
  const exclusivePriceLabel = calculateOrderFinancials(exclusiveCreditsCost)
    .priceHtva.toFixed(2)
    .replace(".", ",")
  const logoUrl = `${baseUrl}/logo.png`

  const { provinceLabel, headlineLocation, locPhrase } = getLeadLocationInfo(data.lead)
  const isB2B = data.lead.segment === "B2B"
  const remainingSlots = Math.max(0, data.maxSlots - data.takenSlots)
  const leadRefCode = data.lead.id.slice(0, 8).toUpperCase()

  const surfaceTypeLabel = getSafeSurfaceTypeLabel(data.lead.surfaceType)

  // Extraction propre des critères saisis par le prospect
  const sanitized = sanitizeLeadNotes(data.lead.projectDetails)
  const specs = sanitized.specs
  const cleanRemarks = sanitized.cleanRemarks

  const propertyTypeDisplay =
    specs.propertyType ||
    (isB2B
      ? surfaceTypeLabel
      : data.lead.surfaceType && data.lead.surfaceType !== "toiture"
        ? getPropertyTypeLabel(data.lead.surfaceType)
        : "Maison résidentielle")

  const roofMaterialLabel = specs.roofMaterial || getSafeRoofMaterialLabel(data.lead.roofMaterial)
  const timeframeLabel = getExplicitTimeframeLabel(data.lead.timeframe)
  const ownershipLabel = specs.ownership || getSafeOwnershipLabel(data.lead.ownershipStatus)
  const driverLabel = getSafeDriverLabel(data.lead.projectDriver)

  const compactRoofSurface = formatCompactRoofSurface(
    specs.roofSurface,
    data.lead.surfaceArea,
    data.financials.normalizedSurfaceAreaM2,
    surfaceTypeLabel,
    isB2B
  )

  const contactPreferenceDisplay = formatContactPreferenceLabel(
    specs.contactPreference || data.lead.contactPreference
  )

  const verifSummary = getLeadVerificationSummary({
    segment: data.lead.segment,
    phone: data.lead.phone,
    postalCode: data.lead.postalCode,
    phone_verified: data.lead.phoneVerified,
    phone_verification_method: data.lead.phoneVerificationMethod,
    phone_carrier: data.lead.phoneCarrier,
    phone_line_type: data.lead.phoneLineType,
    email_verified: data.lead.emailVerified,
    email_delivery_status: data.lead.emailDeliveryStatus,
    qualificationMetadata: data.lead.qualificationMetadata,
  })
  const phoneDisplayLabel = verifSummary.phone.shortLabel ?? "Téléphone renseigné"
  const emailDisplayLabel = verifSummary.email.shortLabel ?? "E-mail renseigné"
  const phoneDotHtml =
    verifSummary.phone.tier === "verified"
      ? `<span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #1d5d45; margin-right: 5px; vertical-align: middle;"></span>`
      : verifSummary.phone.tier === "plausible"
        ? `<span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #305a76; margin-right: 5px; vertical-align: middle;"></span>`
        : ""
  const emailDotHtml =
    verifSummary.email.tier === "verified"
      ? `<span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #1d5d45; margin-right: 5px; vertical-align: middle;"></span>`
      : verifSummary.email.tier === "plausible"
        ? `<span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #305a76; margin-right: 5px; vertical-align: middle;"></span>`
        : ""

  const powerKwcShort = formatPowerKwc(data.financials.estimatedPowerKwc)
  const panelCount = data.financials.estimatedPanelCount
  const displayBill = data.financials.normalizedAnnualBill || data.lead.annualElectricityBill
  const annualBillShort = `${displayBill.toLocaleString("fr-BE")} € ${isB2B ? "HT" : "TTC"}`
  const consumptionDisplay =
    specs.consumption ||
    (data.financials.estimatedAnnualConsumptionKwh > 0
      ? `${data.financials.estimatedAnnualConsumptionKwh.toLocaleString("fr-BE")} kWh/an`
      : null)

  const minContractStr = data.financials.estimatedContractValueRange.min.toLocaleString("fr-BE")
  const maxContractStr = data.financials.estimatedContractValueRange.max.toLocaleString("fr-BE")
  const estimatedContractShort = `${minContractStr} à ${maxContractStr} € HT`
  const estimatedMarginShort = `Env. ${data.financials.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT`
  const creditCostEur = formatEur(data.financials.leadCostEuros)
  const maskedPhoneDisplay = getMaskedPhoneDisplay(data.lead.phone)

  // Masquage strict du contact : prénom toujours masqué par "******" (règle d'anonymat Aegis Solaire)
  const rawLeadLastName = (data.lead.lastName?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()
  const rawLeadFirstName = (data.lead.firstName?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()

  let leadMaskedName = "******"
  if (rawLeadLastName) {
    leadMaskedName = `****** ${rawLeadLastName}`
  } else if (rawLeadFirstName) {
    const parts = rawLeadFirstName.split(/\s+/)
    leadMaskedName = parts.length > 1 ? `****** ${parts[parts.length - 1]}` : "******"
  }

  // Contexte d'en-tête & badge de disponibilité selon vague et segment
  let contextText = isB2B ? "Nouveau projet photovoltaïque B2B" : "Nouveau dossier photovoltaïque"
  let contextColor = "#305a76"

  if (data.waveNumber === 2) {
    if (!isB2B && remainingSlots === 1) {
      contextColor = "#991b1b"
      contextText = data.engagement?.hasInspected
        ? "Dossier consulté · Dernière place disponible"
        : "Dernière place disponible"
    } else if (data.engagement?.hasInspected && !isB2B && data.takenSlots > 0) {
      contextColor = "#89610e"
      contextText = "Dossier consulté · Mise à jour"
    } else if (data.engagement?.hasInspected) {
      contextColor = "#89610e"
      contextText = "Rappel · Dossier consulté"
    } else if (isB2B) {
      contextColor = "#89610e"
      contextText = data.maxSlots <= 1 ? "Rappel · Projet B2B exclusif disponible" : "Rappel · Projet B2B disponible"
    } else if (data.takenSlots > 0) {
      contextColor = "#89610e"
      contextText = "Rappel · Dossier photovoltaïque disponible"
    } else {
      contextColor = "#305a76"
      contextText = "Dossier photovoltaïque disponible"
    }
  } else if (data.waveNumber >= 3) {
    if (isB2B) {
      contextColor = "#305a76"
      contextText = data.maxSlots <= 1 ? "Projet B2B · Exclusivité toujours disponible" : "Projet B2B · Places toujours disponibles"
    } else if (remainingSlots === 1) {
      contextColor = "#991b1b"
      contextText = "Dernière place disponible"
    } else if (data.takenSlots > 0) {
      contextColor = "#89610e"
      contextText = "Rappel · Places encore disponibles"
    } else {
      contextColor = "#305a76"
      contextText = "Élargissement régional · Dossier ouvert"
    }
  }

  let availabilityText = ""
  let availabilityBg = "#e8f2ed"
  let availabilityColor = "#1d5d45"

  if (isB2B && data.maxSlots <= 1) {
    availabilityText = "Exclusivité B2B · 1 seul installateur"
    availabilityBg = "#e8f2ed"
    availabilityColor = "#1d5d45"
  } else if (remainingSlots <= 0) {
    availabilityText = `Complet · ${data.maxSlots} places attribuées`
    availabilityBg = "#eef2f4"
    availabilityColor = "#4d6374"
  } else if (remainingSlots === 1) {
    availabilityText = `1 place disponible sur ${data.maxSlots}`
    availabilityBg = "#fdecec"
    availabilityColor = "#991b1b"
  } else if (remainingSlots === 2 && data.maxSlots >= 3) {
    availabilityText = `2 places disponibles sur ${data.maxSlots}`
    availabilityBg = "#fff5df"
    availabilityColor = "#684916"
  } else {
    availabilityText = `${remainingSlots} places disponibles sur ${data.maxSlots}`
    availabilityBg = "#e8f2ed"
    availabilityColor = "#1d5d45"
  }

  const subtitleParts = [propertyTypeDisplay, ownershipLabel].filter(Boolean)
  const subtitleLine = subtitleParts.join(" · ")

  // Lignes techniques du chantier
  const specRows: Array<{ label: string; value: string; italic?: boolean }> = [
    {
      label: "Toiture",
      value: `${roofMaterialLabel} · ${compactRoofSurface}`,
    },
  ]

  if (consumptionDisplay) {
    specRows.push({
      label: "Consommation annuelle",
      value: consumptionDisplay,
    })
  }

  specRows.push(
    {
      label: "Facture annuelle",
      value: annualBillShort,
    },
    {
      label: "Marge nette indicative",
      value: estimatedMarginShort,
    }
  )

  if (timeframeLabel) {
    specRows.push({
      label: "Échéance souhaitée",
      value: timeframeLabel,
    })
  }

  const extraOptions: string[] = []
  if (specs.hasBattery || data.financials.includesBattery) extraOptions.push("Batterie domestique")
  if (specs.hasIrve || data.financials.includesEv) extraOptions.push("Borne de recharge VE")
  if (extraOptions.length > 0) {
    specRows.push({
      label: "Équipements souhaités",
      value: extraOptions.join(" · "),
    })
  }

  if (driverLabel && isB2B) {
    specRows.push({
      label: "Objectif du projet",
      value: driverLabel,
    })
  }

  if (isB2B && data.lead.grd) {
    specRows.push({
      label: "Gestionnaire réseau",
      value: getGrdLabel(data.lead.grd),
    })
  }

  if (cleanRemarks) {
    specRows.push({
      label: "Précisions",
      value: `« ${cleanRemarks} »`,
      italic: true,
    })
  }

  const specRowsHtml = specRows
    .map((row, index) => {
      const isLast = index === specRows.length - 1
      const borderStyle = isLast ? "border-bottom: 0;" : "border-bottom: 1px solid #e6edf1;"
      const valueStyle = row.italic
        ? "font-weight: normal; font-style: italic; color: #142d42;"
        : "font-weight: bold; color: #142d42;"
      return `<tr>
        <th scope="row" style="width: 49%; padding: 6px 8px 6px 0; ${borderStyle} text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">${escapeHtml(row.label)}</th>
        <td style="padding: 6px 0; ${borderStyle} text-align: left; font-size: 13px; ${valueStyle} vertical-align: top; font-variant-numeric: tabular-nums;">${escapeHtml(row.value)}</td>
      </tr>`
    })
    .join("")

  const resolvedRoofImagesCount =
    typeof data.lead.roofImagesCount === "number"
      ? data.lead.roofImagesCount
      : data.lead.roofImageUrl
        ? Math.max(1, getLeadImages(data.lead).length)
        : 0
  const extraRoofImagesCount =
    data.lead.roofImageUrl && resolvedRoofImagesCount > 1
      ? resolvedRoofImagesCount - 1
      : 0
  const isPrimaryAiProjection = Boolean(
    data.lead.roofImageUrl &&
      (data.lead.roofImageIsAiProjection ?? getPrimaryLeadImageItem(data.lead)?.isAiProjection)
  )

  // Version texte brut sobre et structurée
  const text = `AEGIS SOLAIRE — ${contextText.toUpperCase()}
Dossier #${leadRefCode}

${headlineLocation}
${subtitleLine}
${availabilityText}

CHIFFRES CLÉS :
• Puissance estimée : ${powerKwcShort}${panelCount ? ` (${panelCount} panneaux estimés)` : ""}
• Devis estimé : ${estimatedContractShort}

PROSPECT : ${leadMaskedName}
${contactPreferenceDisplay ? `• Premier contact souhaité : ${contactPreferenceDisplay}\n` : ""}• ${phoneDisplayLabel} : ${maskedPhoneDisplay}
• ${emailDisplayLabel} : ••••@••••.••
• Secteur : ${provinceLabel}

DÉBLOCAGE DES COORDONNÉES :
• Tarif : ${creditCostEur} ou ${data.creditCost} crédits (Solde disponible : ${data.partner.credits} crédit${data.partner.credits > 1 ? "s" : ""})${data.takenSlots === 0 && data.maxSlots > 1 && remainingSlots > 0 ? `\n• Option Exclusivité Totale (0 concurrent) : ${exclusivePriceLabel} € HTVA ou ${exclusiveCreditsCost} crédits` : ""}
• Consulter & débloquer en 8s : ${directCheckoutLeadUrl}
• Gérer mes crédits : ${creditsOrderUrl}

DÉTAILS DU CHANTIER :
${specRows.map((r) => `• ${r.label} : ${r.value}`).join("\n")}${
    data.lead.roofImageUrl
      ? resolvedRoofImagesCount > 1
        ? `\n• ${resolvedRoofImagesCount} photos du bâtiment disponibles sur la fiche dossier${isPrimaryAiProjection ? " (projection 3D IA non contractuelle, à confirmer sur site)" : ""}`
        : `\n• Photo du bâtiment disponible sur la fiche dossier${isPrimaryAiProjection ? " (projection 3D IA non contractuelle, à confirmer sur site)" : ""}`
      : ""
  }

Assistance technique : contact@aegissolaire.com
Gérer mes alertes : ${notifUrls.manageUrl}
Recevoir uniquement les nouveaux chantiers : ${notifUrls.noRelancesUrl}
Désactiver les alertes : ${notifUrls.muteAllUrl}

Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr-BE">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #eef2f4;
      color: #142d42;
      font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { color: #194767; }
    .tabular { font-variant-numeric: tabular-nums; }
    @media only screen and (max-width: 520px) {
      .mail-outer { padding: 12px 6px 24px 6px !important; }
      .letterhead, .mail-footer { padding-left: 16px !important; padding-right: 16px !important; }
      .mail-body { padding: 18px 16px 20px 16px !important; }
      .mail-h1 { font-size: 27px !important; }
      .figures-td { padding: 10px !important; }
      .figure { font-size: 18px !important; }
      .actions-td { display: block !important; width: 100% !important; }
      .action-cell { padding: 12px 0 0 0 !important; }
      .photo-cell, .spec-cell { display: block !important; width: 100% !important; }
      .photo-cell { padding: 0 0 10px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #eef2f4; color: #142d42; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.5;">

  <!-- Preheader invisible -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    ${escapeHtml(headlineLocation)} · ${escapeHtml(powerKwcShort)} · ${escapeHtml(availabilityText)} · Devis estimé ${escapeHtml(estimatedContractShort)}.
  </div>

  <table role="presentation" class="mail-outer" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #eef2f4; padding: 20px 12px 32px 12px;">
    <tr>
      <td align="center" style="vertical-align: top;">
        <!--[if mso]><table role="presentation" width="640" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="mail" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d7e0e6; border-radius: 14px; border-collapse: separate; border-spacing: 0; overflow: hidden;">

          <!-- En-tête lettre -->
          <tr>
            <td class="letterhead" style="padding: 12px 28px; border-bottom: 1px solid #e6edf1; background-color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${escapeHtml(baseUrl)}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${escapeHtml(logoUrl)}" alt="Aegis Solaire" width="132" height="72" style="display: block; width: 132px; height: 72px; border: 0; outline: none; text-decoration: none;" />
                    </a>
                  </td>
                  <td align="right" valign="middle" style="text-align: right; color: #536776; font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; padding-left: 12px;">
                    Dossier #${leadRefCode}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps principal -->
          <tr>
            <td class="mail-body" style="padding: 22px 28px 24px 28px; background-color: #ffffff;">

              <!-- En-tête dossier -->
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: ${contextColor}; line-height: 1.4;">
                ${escapeHtml(contextText)}
              </p>
              <h1 class="mail-h1" style="margin: 2px 0 4px 0; font-size: 32px; font-weight: bold; line-height: 1.12; letter-spacing: -0.035em; color: #142d42;">
                ${escapeHtml(headlineLocation)}
              </h1>
              <p style="margin: 0; color: #4d6374; font-size: 15px; line-height: 1.45;">
                ${escapeHtml(subtitleLine)}
              </p>
              <span class="tabular" style="display: inline-block; margin-top: 10px; padding: 3px 9px; border-radius: 5px; background-color: ${availabilityBg}; color: ${availabilityColor}; font-size: 12px; font-weight: bold; line-height: 1.4; font-variant-numeric: tabular-nums;">
                ${escapeHtml(availabilityText)}
              </span>

              <!-- Chiffres clés -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; background-color: #f0f5f8; border: 1px solid #e2eaf0; border-radius: 8px; border-collapse: separate; border-spacing: 0; overflow: hidden;">
                <tr>
                  <td class="figures-td" width="43%" style="width: 43%; padding: 12px 15px; vertical-align: top;">
                    <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">Puissance estimée</span>
                    <strong class="figure tabular" style="display: block; margin: 2px 0; font-size: 22px; font-weight: bold; line-height: 1.15; letter-spacing: -0.025em; color: #142d42; font-variant-numeric: tabular-nums;">${escapeHtml(powerKwcShort)}</strong>
                    ${panelCount ? `<span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35; font-variant-numeric: tabular-nums;">${panelCount} panneaux estimés</span>` : ""}
                  </td>
                  <td class="figures-td" width="57%" style="width: 57%; padding: 12px 15px; vertical-align: top; border-left: 1px solid #d8e3eb;">
                    <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">Devis estimé</span>
                    <strong class="figure tabular" style="display: block; margin: 2px 0; font-size: 22px; font-weight: bold; line-height: 1.15; letter-spacing: -0.025em; color: #142d42; font-variant-numeric: tabular-nums;">${escapeHtml(estimatedContractShort)}</strong>
                  </td>
                </tr>
              </table>

              <!-- Bloc Prospect & Contact -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td style="padding: 14px 15px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
                      Prospect &middot; ${escapeHtml(leadMaskedName)}
                    </h2>
                    ${contactPreferenceDisplay ? `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 10px; background-color: #fff5df; border-left: 3px solid #d69729; border-radius: 0 5px 5px 0;">
                          <span style="display: block; font-size: 13px; color: #684916; line-height: 1.35;">Premier contact souhaité par le prospect</span>
                          <strong style="display: block; font-size: 16px; line-height: 1.3; color: #142d42;">${escapeHtml(contactPreferenceDisplay)}</strong>
                        </td>
                      </tr>
                    </table>
                    ` : ""}
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td width="50%" style="width: 50%; vertical-align: top; padding-right: 10px;">
                          <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">
                            ${phoneDotHtml}${escapeHtml(phoneDisplayLabel)}
                          </span>
                          <strong class="tabular" style="display: block; margin-top: 2px; font-size: 15px; font-weight: bold; line-height: 1.35; color: #142d42; font-variant-numeric: tabular-nums;">${escapeHtml(maskedPhoneDisplay)}</strong>
                        </td>
                        <td width="50%" style="width: 50%; vertical-align: top; padding-left: 12px; border-left: 1px solid #e2eaf0;">
                          <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">
                            ${emailDotHtml}${escapeHtml(emailDisplayLabel)}
                          </span>
                          <strong class="tabular" style="display: block; margin-top: 2px; font-size: 15px; font-weight: bold; line-height: 1.35; color: #142d42; font-variant-numeric: tabular-nums;">••••@••••.••</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bloc Actions & Déblocage -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td style="padding: 12px 15px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td class="actions-td" style="vertical-align: middle;">
                          <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">Déblocage des coordonnées</span>
                          <strong class="tabular" style="display: block; margin: 2px 0; font-size: 19px; font-weight: bold; line-height: 1.2; letter-spacing: -0.02em; color: #142d42; font-variant-numeric: tabular-nums;">${escapeHtml(creditCostEur)} ou ${data.creditCost} crédits</strong>
                          <span class="tabular" style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35; font-variant-numeric: tabular-nums;">Solde disponible &middot; ${data.partner.credits} crédit${data.partner.credits > 1 ? "s" : ""}</span>
                          ${data.takenSlots === 0 && data.maxSlots > 1 && remainingSlots > 0 ? `<span class="tabular" style="display: block; margin-top: 4px; font-size: 12px; font-weight: bold; color: #1d5d45; font-variant-numeric: tabular-nums;">Exclusivit&eacute; totale possible (${exclusiveCreditsCost} cr. &middot; ${exclusivePriceLabel} &euro; HT)</span>` : ""}
                        </td>
                        <td class="actions-td action-cell" width="47%" style="width: 47%; padding-left: 14px; text-align: center; vertical-align: middle;">
                          <a href="${escapeHtml(dashboardLeadUrl)}" target="_blank" style="display: block; padding: 10px 12px; border: 1px solid #142d42; border-radius: 6px; background-color: #142d42; color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none; text-align: center;">Consulter le dossier &rarr;</a>
                          <a href="${escapeHtml(directCheckoutLeadUrl)}" target="_blank" style="display: inline-block; margin-top: 6px; font-size: 13px; color: #194767; text-decoration: underline;">Débloquer à l&rsquo;unité</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Détails du chantier -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
                    <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
                      Détails du chantier
                    </h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        ${data.lead.roofImageUrl ? `
                        <td class="photo-cell" width="42%" style="width: 42%; padding-right: 15px; vertical-align: top;">
                          <img src="${escapeHtml(data.lead.roofImageUrl)}" alt="Façade du bâtiment concerné par le projet" width="230" style="display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 7px; border: 1px solid #e2eaf0;" />
                          ${
                            isPrimaryAiProjection
                              ? `<p style="margin: 6px 0 0 0; padding: 5px 8px; background-color: #fff5df; border-left: 3px solid #d69729; border-radius: 0 5px 5px 0; font-size: 11px; line-height: 1.4; color: #684916;">
                                  <strong>${escapeHtml(AI_PROJECTION_BADGE_SHORT)}</strong><br />
                                  ${escapeHtml(AI_PROJECTION_EMAIL_CAPTION)}
                                </p>${
                                  extraRoofImagesCount > 0
                                    ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #4d6374;">+<span style="font-variant-numeric: tabular-nums;">${extraRoofImagesCount}</span> autre${extraRoofImagesCount > 1 ? "s" : ""} visuel${extraRoofImagesCount > 1 ? "s" : ""} sur le dossier</p>`
                                    : ""
                                }`
                              : `<p style="margin: 4px 0 0 0; font-size: 12px; color: #4d6374;">${extraRoofImagesCount > 0 ? `Photo du bâtiment · +<span style="font-variant-numeric: tabular-nums;">${extraRoofImagesCount}</span> autre${extraRoofImagesCount > 1 ? "s" : ""} sur le dossier` : "Photo du bâtiment"}</p>`
                          }
                        </td>
                        ` : ""}
                        <td class="spec-cell" style="vertical-align: top;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                            ${specRowsHtml}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pied de page institutionnel -->
          <tr>
            <td class="mail-footer" style="padding: 14px 28px; background-color: #f6f8fa; border-top: 1px solid #e3eaf0; color: #4d6374; font-size: 12px; line-height: 1.55;">
              <p style="margin: 0 0 4px 0;">
                <a href="mailto:contact@aegissolaire.com" style="display: inline-block; margin: 0 12px 3px 0; color: #194767; text-decoration: underline;">Assistance technique</a>
                <a href="${escapeHtml(notifUrls.manageUrl)}" target="_blank" style="display: inline-block; margin: 0 12px 3px 0; color: #194767; text-decoration: underline;">Gérer mes alertes</a>
                <a href="${escapeHtml(notifUrls.noRelancesUrl)}" target="_blank" style="display: inline-block; margin: 0 12px 3px 0; color: #194767; text-decoration: underline;">Uniquement les nouveaux chantiers</a>
                <a href="${escapeHtml(notifUrls.muteAllUrl)}" target="_blank" style="display: inline-block; margin: 0 12px 3px 0; color: #194767; text-decoration: underline;">Désactiver les alertes</a>
              </p>
              <p style="margin: 0; color: #4d6374;">
                Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}
