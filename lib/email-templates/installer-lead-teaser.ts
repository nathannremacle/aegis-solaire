import { FinancialEstimates } from "@/lib/marketplace-pricing"
import {
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
  getRoofSurfaceLabel,
  getRoofMaterialLabel,
  getOwnershipLabel,
  getConsumptionLabel,
} from "@/lib/lead-display-helpers"
import { buildPartnerNotificationUrls } from "@/lib/partner-notification-tokens"

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
    firstName: string
    lastName?: string | null
    grd?: string | null
    roofImageUrl?: string | null
    createdAt: string
  }
  waveNumber: 1 | 2 | 3 | number
  takenSlots: number
  maxSlots: number
  creditCost: number
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
  return `${amount.toLocaleString("fr-BE")} € HT`
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
  if (clean.includes("business") || clean.includes("owner") || clean.includes("dirig")) return "Chef d'entreprise / Dirigeant"
  return "Propriétaire occupant"
}

function getExplicitTimeframeLabel(val?: string | null): string | null {
  if (!val || !val.trim()) return null
  const clean = val.toLowerCase().trim()
  if (clean === "non_specifie" || clean === "null" || clean === "undefined") return null
  if (TIMEFRAME_LABELS[clean]) return TIMEFRAME_LABELS[clean]
  if (clean.includes("immed") || clean.includes("urgent") || clean.includes("1_month")) return "Immédiat (1 à 3 mois)"
  if (clean.includes("3_months") || clean.includes("3 mois") || clean.includes("dans_les_3_mois")) return "Dans les 3 mois"
  if (clean.includes("6_months") || clean.includes("6 mois") || clean.includes("3_6mois")) return "D'ici 3 à 6 mois"
  if (clean.includes("12_months") || clean.includes("annee")) return "Dans l'année"
  return val.replace(/_/g, " ")
}

function getSafeDriverLabel(val?: string | null): string {
  if (!val) return "Réduction de la facture d'électricité"
  const clean = val.toLowerCase().trim()
  if (PROJECT_DRIVER_LABELS[clean]) return PROJECT_DRIVER_LABELS[clean]
  if (clean.includes("facture") || clean.includes("cost") || clean.includes("reduc")) return "Réduction de la facture d'électricité"
  if (clean.includes("auto")) return "Autonomie & autoconsommation"
  if (clean.includes("esg") || clean.includes("rse")) return "Transition énergétique & conformité RSE"
  return "Réduction de la facture d'électricité"
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

function getLeadLocationInfo(lead: {
  city?: string | null
  postalCode?: string | null
  province?: string | null
  provinceFreeText?: string | null
}): {
  city: string
  provinceLabel: string
  postalCode: string
  locPhrase: string
} {
  const rawCity = lead.city && lead.city !== "null" && lead.city !== "undefined" ? lead.city.trim() : ""
  const rawPostal = lead.postalCode && lead.postalCode !== "null" && lead.postalCode !== "undefined" ? lead.postalCode.trim() : ""
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

  const provinceLabel = rawProvince && rawProvince !== "null" && rawProvince !== "undefined" ? rawProvince : "Wallonie"
  const city = rawCity || provinceLabel
  const postalCode = rawPostal || "—"

  let locPhrase = "en Wallonie"
  if (rawPostal && rawCity) {
    locPhrase = `à ${rawPostal} ${rawCity}`
  } else if (rawCity) {
    locPhrase = `à ${rawCity}`
  } else if (rawPostal && rawProvince) {
    locPhrase = `à ${rawPostal} (${rawProvince})`
  } else if (rawProvince) {
    locPhrase = `en ${rawProvince}`
  }

  return { city, provinceLabel, postalCode, locPhrase }
}

/**
 * Construit l'objet d'e-mail selon le niveau d'urgence et la typologie du dossier
 * Sans jamais mentionner le terme interne "vague".
 */
export function buildLeadEmailSubject(data: InstallerLeadTeaserData): string {
  const { locPhrase } = getLeadLocationInfo(data.lead)
  const isB2B = data.lead.segment === "B2B"
  const power = data.financials.estimatedPowerKwc > 0 ? `${data.financials.estimatedPowerKwc} kWc` : "PV"
  const remainingSlots = Math.max(0, data.maxSlots - data.takenSlots)

  if (data.waveNumber === 1) {
    if (isB2B) {
      return `Nouveau projet B2B exclusif ${locPhrase} (${power}) — Dossier #${data.lead.id.slice(0, 8)}`
    }
    return `Nouveau dossier photovoltaïque ${locPhrase} — 3 créneaux max (#${data.lead.id.slice(0, 8)})`
  }

  if (data.waveNumber >= 2 && data.engagement?.hasInspected) {
    if (!isB2B && data.takenSlots > 0) {
      return `Mise à jour sur le dossier consulté ${locPhrase} — Plus que ${remainingSlots} place(s) disponible(s)`
    }
    return `Rappel sur le dossier consulté ${locPhrase} (${power})`
  }

  if (data.waveNumber === 2) {
    if (isB2B) {
      return `Rappel : Projet B2B disponible ${locPhrase} (${power})`
    }
    return `Rappel : Plus que ${remainingSlots} place(s) restante(s) — Projet solaire ${locPhrase}`
  }

  // Étape 3
  if (isB2B) {
    return `Dernier appel : Projet B2B ${locPhrase} en attente d'artisan certifié`
  }
  return `Dernier créneau disponible : Installation solaire ${locPhrase}`
}

/**
 * Génère le contenu HTML et texte pour l'installateur
 */
export function renderInstallerLeadTeaserEmail(data: InstallerLeadTeaserData): {
  subject: string
  text: string
  html: string
} {
  const subject = buildLeadEmailSubject(data)
  const baseUrl = getSiteBaseUrl()
  const dashboardLeadUrl = `${baseUrl}/partenaires/dashboard?lead=${encodeURIComponent(data.lead.id)}`
  const creditsOrderUrl = `${baseUrl}/partenaires/dashboard/credits`
  const notifUrls = buildPartnerNotificationUrls(baseUrl, data.partner.id)
  const logoUrl = `${baseUrl}/logo.png`

  const { city, provinceLabel, postalCode, locPhrase } = getLeadLocationInfo(data.lead)
  const isB2B = data.lead.segment === "B2B"
  const remainingSlots = Math.max(0, data.maxSlots - data.takenSlots)

  const surfaceTypeLabel = getSafeSurfaceTypeLabel(data.lead.surfaceType)

  // Nettoyage et extraction chirurgicale des critères saisis par le prospect
  const sanitized = sanitizeLeadNotes(data.lead.projectDetails)
  const specs = sanitized.specs
  const cleanRemarks = sanitized.cleanRemarks

  const propertyTypeDisplay =
    specs.propertyType ||
    (data.lead.surfaceType ? getPropertyTypeLabel(data.lead.surfaceType) : null)

  const roofMaterialLabel = specs.roofMaterial || getSafeRoofMaterialLabel(data.lead.roofMaterial)
  const timeframeLabel = getExplicitTimeframeLabel(data.lead.timeframe)
  const ownershipLabel = specs.ownership || getSafeOwnershipLabel(data.lead.ownershipStatus)
  const driverLabel = getSafeDriverLabel(data.lead.projectDriver)

  const roofSurfaceDisplay =
    specs.roofSurface ||
    (data.lead.surfaceArea > 0 ? `${data.lead.surfaceArea.toLocaleString("fr-BE")} m² (${surfaceTypeLabel})` : null) ||
    `${data.financials.normalizedSurfaceAreaM2.toLocaleString("fr-BE")} m² (${surfaceTypeLabel})`

  const contactPreferenceDisplay = specs.contactPreference || null

  const panelInfo = data.financials.estimatedPanelCount ? ` (${data.financials.estimatedPanelCount} panneaux)` : ""
  const powerKwc = `${data.financials.estimatedPowerKwc} kWc${panelInfo}`
  const displayBill = data.financials.normalizedAnnualBill || data.lead.annualElectricityBill
  const annualBill = `${displayBill.toLocaleString("fr-BE")} € ${isB2B ? "HT" : "TTC"} / an`
  const billWithConsumption = specs.consumption
    ? `${annualBill} (Conso : ${specs.consumption})`
    : annualBill
  const estimatedContract = `${data.financials.estimatedContractValueRange.min.toLocaleString("fr-BE")} € à ${data.financials.estimatedContractValueRange.max.toLocaleString("fr-BE")} € HT`
  const estimatedMargin = `~${data.financials.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT`
  const creditCostEur = `${data.financials.leadCostEuros.toFixed(2)} € HT`

  const partnerGreetingName = data.partner.contactName?.trim() || data.partner.companyName
  const hasEnoughCredits = data.partner.credits >= data.creditCost

  // Masquage strict du contact : seul le nom de famille est affiché, le prénom est masqué par "******"
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
    if (parts.length > 1) {
      leadMaskedName = `****** ${parts[parts.length - 1]}`
    } else {
      leadMaskedName = "******"
    }
  }

  // Text Hook according to urgency
  let waveIntroText = ""
  let waveUrgencyBadge = ""

  if (data.waveNumber === 1) {
    waveIntroText = isB2B
      ? `Un nouveau projet photovoltaïque d'entreprise vient d'être qualifié et audité ${locPhrase}. En tant qu'installateur agréé sur ce secteur, ce chantier vous est proposé en exclusivité.`
      : `Un nouveau dossier de rénovation photovoltaïque vient d'être validé par notre cellule technique ${locPhrase}. Les coordonnées complètes du demandeur sont prêtes à être transmises.`
    waveUrgencyBadge = isB2B ? "EXCLUSIVITÉ B2B — 1 SEUL ARTISAN" : "ATTRIBUTION RESTREINTE — 3 ARTISANS MAX"
  } else if (data.waveNumber === 2) {
    if (data.engagement?.hasInspected) {
      waveIntroText = !isB2B && data.takenSlots > 0
        ? `Mise à jour sur le dossier photovoltaïque ${locPhrase} que vous avez récemment étudié sur votre portail : un confrère partenaire vient d'en réserver un créneau. Il ne reste plus que ${remainingSlots} place(s) artisan ouverte(s) avant clôture définitive de la mise en relation.`
        : `Suite à votre consultation de la fiche technique du projet photovoltaïque ${locPhrase}, nous vous confirmons que ce dossier est toujours accessible sur votre portail partenaire${!isB2B ? ` (${remainingSlots} place(s) disponible(s))` : " en exclusivité"}.`
    } else {
      waveIntroText = isB2B
        ? `Rappel de disponibilité : Le projet photovoltaïque professionnel ${locPhrase} est toujours accessible en exclusivité sur votre espace partenaire.`
        : `Rappel de disponibilité : Le dossier photovoltaïque ${locPhrase} dispose encore de ${remainingSlots} place(s) artisan ouverte(s) avant fermeture de la mise en relation.`
    }
    waveUrgencyBadge = isB2B ? "PROJET B2B DISPONIBLE" : `PLUS QUE ${remainingSlots} CRÉNEAU(X) OUVERT(S)`
  } else {
    if (data.engagement?.hasInspected) {
      waveIntroText = !isB2B && data.takenSlots > 0
        ? `Mise à jour sur le dossier photovoltaïque ${locPhrase} que vous avez récemment étudié sur votre portail : un confrère partenaire vient d'en réserver un créneau. Il ne reste plus que ${remainingSlots} place(s) artisan ouverte(s) avant clôture définitive de la mise en relation.`
        : `Suite à votre consultation de la fiche technique du projet photovoltaïque ${locPhrase}, nous vous confirmons que ce dossier est toujours accessible sur votre portail partenaire${!isB2B ? ` (${remainingSlots} place(s) disponible(s))` : " en exclusivité"}.`
    } else {
      waveIntroText = isB2B
        ? `Dernière opportunité : Le projet photovoltaïque d'entreprise ${locPhrase} sera prochainement clôturé si aucun artisan partenaire ne le prend en charge.`
        : `Dernier créneau disponible : Il ne reste qu'une seule place artisan ouverte sur ce chantier ${locPhrase} avant clôture définitive de la mise en relation.`
    }
    waveUrgencyBadge = isB2B ? "AVIS DE CLÔTURE IMMINENTE" : "DERNIER CRÉNEAU AVANT CLÔTURE"
  }

  // Visual Scarcity Slots for B2C (Épuré sans emojis)
  let slotsHtml = ""
  if (!isB2B) {
    const slots = []
    for (let i = 1; i <= data.maxSlots; i++) {
      if (i <= data.takenSlots) {
        slots.push(`
          <td style="padding: 10px 14px; background-color: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #64748B; text-align: center; font-weight: 500;">
            Place ${i} : Réservée
          </td>
        `)
      } else {
        slots.push(`
          <td style="padding: 10px 14px; background-color: #EFF6FF; border-radius: 6px; border: 1px solid #BFDBFE; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #1D4ED8; font-weight: 700; text-align: center;">
            Place ${i} : Disponible
          </td>
        `)
      }
    }
    slotsHtml = `
      <table cellpadding="0" cellspacing="8" border="0" style="margin: 14px 0 0 0; width: 100%;">
        <tr>
          ${slots.join("")}
        </tr>
      </table>
    `
  }

  // Plain Text Version (Clair, direct, sobre)
  const text = `AEGIS SOLAIRE — DOSSIER PHOTOVOLTAÏQUE QUALIFIÉ
Tiers de Confiance Wallon · Agrément RESCERT & CWaPE

Bonjour ${partnerGreetingName},

${waveIntroText}

Consulter la fiche du chantier et obtenir les coordonnées :
${dashboardLeadUrl}

============================================================
RÉSUMÉ DU PROJET : Installation Solaire ${locPhrase}
============================================================
• Segment : ${isB2B ? "Professionnel / B2B (Exclusivité 100%)" : "Résidentiel / B2C (3 artisans maximum)"}
${propertyTypeDisplay ? `• Type de bien : ${propertyTypeDisplay}\n` : ""}• Puissance estimée : ${powerKwc}
• Surface toiture : ${roofSurfaceDisplay}
• Couverture toiture : ${roofMaterialLabel}
• Facture annuelle : ${billWithConsumption}
• Profil du demandeur : ${ownershipLabel}
• Objectif du projet : ${driverLabel}
${timeframeLabel ? `• Échéance souhaitée : ${timeframeLabel}\n` : ""}${contactPreferenceDisplay ? `• Consigne de contact : ${contactPreferenceDisplay}\n` : ""}${cleanRemarks ? `• Remarque du demandeur : « ${cleanRemarks} »\n` : ""}${data.lead.roofImageUrl ? `• Visuel bâtiment : Photo Street View de la toiture et façade disponible sur le dossier\n` : ""}

COORDONNÉES CLIENT :
• Nom : ${leadMaskedName}
• Localisation : ${locPhrase}
• Téléphone : [Vérifié par notre cellule technique]
• E-mail : [Vérifié par notre cellule technique]
• Adresse exacte : [Débloquée instantanément lors de l'accès au dossier]

CONDITIONS D'ACCÈS :
• Coût du dossier : ${data.creditCost} crédits (~${creditCostEur})
• Votre solde actuel : ${data.partner.credits} crédits
• Montant estimé du devis : ${estimatedContract}
• Marge brute indicative : ${estimatedMargin}
${!isB2B ? `• Attribution : Limité à 3 artisans maximum (${remainingSlots} place(s) restante(s))` : "• Exclusivité : 100 % exclusif (1 seul artisan sur ce dossier)"}

Pour consulter la fiche et obtenir les coordonnées :
${dashboardLeadUrl}

${!hasEnoughCredits ? `Note : Votre solde actuel (${data.partner.credits} crédits) est insuffisant pour ce dossier (${data.creditCost} crédits). Vous pouvez recharger votre compte ici : ${creditsOrderUrl}\n` : ""}
Une question technique sur ce dossier ?
Notre cellule technique se tient à votre entière disposition par e-mail à contact@aegissolaire.com.

Gérer vos alertes e-mail (sans connexion) :
• Ajuster mes critères & ma fréquence d'alerte : ${notifUrls.manageUrl}
• Recevoir uniquement les nouveaux chantiers (stopper les rappels) : ${notifUrls.noRelancesUrl}
• Désactiver toutes les alertes e-mail en 1 clic : ${notifUrls.muteAllUrl}

Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

  const topStripeColor =
    data.waveNumber === 1 ? "#2563EB" : data.waveNumber === 2 ? "#F59E0B" : "#DC2626"

  let pillBadgeBg = "#EFF6FF"
  let pillBadgeBorder = "#BFDBFE"
  let pillBadgeColor = "#1D4ED8"
  let pillBadgeText = isB2B ? "Exclusivité 100% · B2B" : "Attribution Restreinte · 3 Max"

  let eyebrowColor = "#2563EB"
  let eyebrowText = `Nouveau Dossier Qualifié · ${city} (#${data.lead.id.slice(0, 8)})`

  let headlineTitle = `Installation solaire ${escapeHtml(locPhrase)}`

  if (data.waveNumber === 2) {
    pillBadgeBg = "#FEF3C7"
    pillBadgeBorder = "#FDE68A"
    pillBadgeColor = "#92400E"
    pillBadgeText = isB2B ? "Dossier Disponible · B2B" : `${remainingSlots} place(s) restante(s)`
    eyebrowColor = "#D97706"
    eyebrowText = isB2B
      ? `Rappel Disponibilité · Dossier B2B (#${data.lead.id.slice(0, 8)})`
      : `Rappel Disponibilité · ${remainingSlots} place(s) restante(s) (#${data.lead.id.slice(0, 8)})`
    headlineTitle = `Plus que ${remainingSlots} place(s) disponible(s) ${escapeHtml(locPhrase)}`
  } else if (data.waveNumber >= 3) {
    pillBadgeBg = "#FEF2F2"
    pillBadgeBorder = "#FECACA"
    pillBadgeColor = "#991B1B"
    pillBadgeText = isB2B ? "Clôture Imminente · B2B" : "Dernier créneau disponible"
    eyebrowColor = "#DC2626"
    eyebrowText = isB2B
      ? `Avis de Clôture · Projet B2B (#${data.lead.id.slice(0, 8)})`
      : `Dernière Opportunité · Clôture Imminente (#${data.lead.id.slice(0, 8)})`
    headlineTitle = `Dernier créneau disponible ${escapeHtml(locPhrase)}`
  }

  if (data.waveNumber >= 2 && data.engagement?.hasInspected && !isB2B && data.takenSlots > 0) {
    eyebrowText = `Dossier Consulté · Plus que ${remainingSlots} place(s) restante(s) (#${data.lead.id.slice(0, 8)})`
    headlineTitle = `Plus que ${remainingSlots} place(s) disponible(s) ${escapeHtml(locPhrase)}`
  }

  // Clean, Swiss editorial HTML Email without cheesy AI emojis
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
    }
    table { border-collapse: separate; border-spacing: 0; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      font-variant-numeric: tabular-nums !important;
    }
    a { color: #2563EB; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-body { padding: 24px 18px !important; }
      .email-header { padding: 18px 18px !important; }
      .bento-cell { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #E2E8F0 !important; padding: 10px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A;">

  <!-- Preheader invisible -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    Dossier photovoltaïque qualifié ${escapeHtml(locPhrase)} — ${powerKwc} — ${remainingSlots} place(s) disponible(s).
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 28px 12px 40px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" class="email-container" width="600" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid ${topStripeColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header Blanc Pur pour contraste maximal avec logo.png -->
          <tr>
            <td class="email-header" style="background-color: #FFFFFF; padding: 22px 32px; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${logoUrl}" alt="Aegis Solaire" width="160" height="34" style="height: 34px; width: auto; max-width: 180px; display: block; border: 0; outline: none; text-decoration: none;" />
                    </a>
                  </td>
                  <td align="right" valign="middle" style="white-space: nowrap; padding-left: 12px;">
                    <span class="mono" style="display: inline-block; white-space: nowrap; background-color: ${pillBadgeBg}; border: 1px solid ${pillBadgeBorder}; color: ${pillBadgeColor}; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 6px; letter-spacing: 0.03em; text-transform: uppercase; line-height: 1.3;">
                      ${escapeHtml(pillBadgeText)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="email-body" style="padding: 32px 32px 28px 32px;">

              <!-- Eyebrow & Subject Headline -->
              <p class="mono" style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: ${eyebrowColor}; text-transform: uppercase; letter-spacing: 0.08em;">
                ${eyebrowText}
              </p>
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #0F172A; letter-spacing: -0.01em;">
                ${headlineTitle}
              </h1>

              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Bonjour <strong>${escapeHtml(partnerGreetingName)}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                ${escapeHtml(waveIntroText)}
              </p>

              <!-- Top Primary CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="padding: 4px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 8px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);">
                          <a href="${dashboardLeadUrl}" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: 0.01em;">
                            Consulter la fiche et obtenir les coordonnées &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span class="mono" style="font-size: 12px; color: #64748B;">
                      Accès immédiat · <strong style="color: #0F172A;">${data.creditCost} crédits</strong> (~${creditCostEur}) · Téléphone et adresse complète vérifiés
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Project Technical Bento Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; margin-bottom: 26px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #E2E8F0; background-color: #F8FAFC;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" valign="middle">
                          <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                            Installation solaire ${escapeHtml(locPhrase)}
                          </h2>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;" class="mono">
                            ${escapeHtml(leadMaskedName)} · Secteur : ${escapeHtml(provinceLabel)}${postalCode && postalCode !== "—" ? ` (${escapeHtml(postalCode)})` : ""}
                          </p>
                        </td>
                        <td align="right" valign="middle">
                          <span class="mono" style="font-size: 11px; color: #64748B; font-weight: 600; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 4px; padding: 3px 8px;">
                            Dossier vérifié
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Trust Badges -->
                    <div style="margin-top: 10px;">
                      <span class="mono" style="display: inline-block; font-size: 11px; padding: 3px 8px; background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; border-radius: 4px; font-weight: 600; margin-right: 6px;">
                        Téléphone vérifié
                      </span>
                      <span class="mono" style="display: inline-block; font-size: 11px; padding: 3px 8px; background-color: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; border-radius: 4px; font-weight: 600; margin-right: 6px;">
                        Propriétaire occupant
                      </span>
                      <span class="mono" style="display: inline-block; font-size: 11px; padding: 3px 8px; background-color: #F8FAFC; color: #334155; border: 1px solid #E2E8F0; border-radius: 4px; font-weight: 600;">
                        Cadastre toiture vérifié
                      </span>
                    </div>

                    ${data.lead.roofImageUrl ? `
                    <!-- Visuel Street View du Bâtiment & Toiture -->
                    <div style="margin-top: 14px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background-color: #0F172A;">
                      <img src="${data.lead.roofImageUrl}" alt="Visuel de la maison et toiture" width="560" style="width: 100%; aspect-ratio: 4 / 5; max-height: 650px; object-fit: cover; object-position: center top; display: block; border: 0;" />
                      <div style="padding: 7px 12px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 11px; color: #475569;" class="mono">
                        <strong style="color: #0F172A;">Visuel de toiture &amp; façade :</strong> Inspection Street View pour pré-dimensionnement visuel (pente, couverture, obstacles).
                      </div>
                    </div>
                    ` : ""}
                  </td>
                </tr>

                <!-- Technical Specs Rows -->
                <tr>
                  <td style="padding: 6px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="44%" valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Segment de marché</td>
                        <td width="56%" valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${isB2B ? "Professionnel / B2B (Exclusivité 100%)" : "Résidentiel / B2C (Partagé max 3)"}
                        </td>
                      </tr>
                      ${propertyTypeDisplay ? `
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Type de bien</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(propertyTypeDisplay)}
                        </td>
                      </tr>
                      ` : ""}
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Puissance estimée</td>
                        <td valign="top" class="mono" style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #2563EB; border-bottom: 1px solid #F1F5F9;">
                          ${powerKwc}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Surface toiture</td>
                        <td valign="top" class="mono" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(roofSurfaceDisplay)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Couverture toiture</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(roofMaterialLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Facture &amp; Consommation</td>
                        <td valign="top" class="mono" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(billWithConsumption)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Profil du demandeur</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(ownershipLabel)}
                        </td>
                      </tr>
                      ${driverLabel ? `
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Objectif prioritaire</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(driverLabel)}
                        </td>
                      </tr>
                      ` : ""}
                      ${timeframeLabel ? `
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Échéance souhaitée</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(timeframeLabel)}
                        </td>
                      </tr>
                      ` : ""}
                      ${contactPreferenceDisplay ? `
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Consigne de contact</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(contactPreferenceDisplay)}
                        </td>
                      </tr>
                      ` : ""}
                      ${cleanRemarks ? `
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Remarque du demandeur</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #0F172A; font-style: italic; border-bottom: 1px solid #F1F5F9;">
                          &laquo; ${escapeHtml(cleanRemarks)} &raquo;
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>

                <!-- Masked Contact Details -->
                <tr>
                  <td style="padding: 16px 20px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
                    <p class="mono" style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em;">
                      Coordonnées débloquées après validation :
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="4">
                      <tr>
                        <td width="36%" style="font-size: 13px; color: #64748B;">Nom du contact :</td>
                        <td width="64%" style="font-size: 13px; font-weight: 600; color: #0F172A;" class="mono">
                          ${escapeHtml(leadMaskedName)}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Adresse du chantier :</td>
                        <td style="font-size: 13px; color: #64748B;" class="mono">
                          ********* (${escapeHtml(postalCode)} ${escapeHtml(city)})
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Numéro de téléphone :</td>
                        <td style="font-size: 13px; color: #0F172A; font-weight: 600;" class="mono">
                          ********* <span style="color: #059669; font-weight: 600;">[Numéro vérifié]</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Adresse e-mail :</td>
                        <td style="font-size: 13px; color: #0F172A; font-weight: 600;" class="mono">
                          ********* <span style="color: #059669; font-weight: 600;">[E-mail vérifié]</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Attribution Rules -->
                <tr>
                  <td style="padding: 16px 20px; background-color: #FFFFFF; border-top: 1px solid #E2E8F0;">
                    <p class="mono" style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em;">
                      Règle d'attribution Aegis Solaire :
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                      ${isB2B
      ? "<strong>Exclusivité absolue garantie :</strong> Ce chantier est cédé à <strong>1 seul installateur partenaire</strong>. Aucune concurrence de plateforme."
      : "<strong>Attribution restreinte à 3 installateurs certifiés maximum :</strong> Pour protéger vos marges et éviter la guerre des prix, ce lead est automatiquement verrouillé dès le 3ème déblocage."
    }
                    </p>
                    ${slotsHtml}
                  </td>
                </tr>

                <!-- Financial Estimations Bento Footer -->
                <tr>
                  <td style="padding: 16px 20px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="33%" align="center" class="bento-cell" style="border-right: 1px solid #E2E8F0; padding: 4px 8px;">
                          <div style="font-size: 11px; color: #64748B; font-weight: 500;">Valeur devis estimée</div>
                          <div class="mono" style="font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 4px;">${estimatedContract}</div>
                        </td>
                        <td width="33%" align="center" class="bento-cell" style="border-right: 1px solid #E2E8F0; padding: 4px 8px;">
                          <div style="font-size: 11px; color: #64748B; font-weight: 500;">Marge brute indicative</div>
                          <div class="mono" style="font-size: 13px; font-weight: 700; color: #059669; margin-top: 4px;">${estimatedMargin}</div>
                        </td>
                        <td width="34%" align="center" class="bento-cell" style="padding: 4px 8px;">
                          <div style="font-size: 11px; color: #64748B; font-weight: 500;">Coût d'acquisition</div>
                          <div class="mono" style="font-size: 13px; font-weight: 700; color: #2563EB; margin-top: 4px;">${data.creditCost} cr. (~${creditCostEur})</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bottom CTA Button & Balance Status (Identique au bouton du haut) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 8px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);">
                          <a href="${dashboardLeadUrl}" target="_blank" style="display: inline-block; padding: 14px 30px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: 0.01em;">
                            Consulter la fiche et obtenir les coordonnées &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p class="mono" style="margin: 12px 0 0 0; font-size: 12px; color: #64748B;">
                      Votre solde actuel : <strong style="color: #0F172A;">${data.partner.credits} crédits</strong>
                      ${!hasEnoughCredits
      ? ` &bull; <a href="${creditsOrderUrl}" style="color: #2563EB; text-decoration: underline; font-weight: 600;">Recharger votre pack de crédits</a>`
      : ""
    }
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Technical Assistance Bento Box (Anonymity Compliant) -->
              <div style="background-color: #F8FAFC; border-left: 3px solid #2563EB; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0F172A;">
                  Assistance technique &amp; dimensionnement :
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #475569;">
                  Notre cellule technique se tient à votre disposition pour vos questions d'implantation ou de matériel : <a href="mailto:contact@aegissolaire.com" style="color: #2563EB; font-weight: 600; text-decoration: underline;">contact@aegissolaire.com</a>.
                </p>
              </div>

              <!-- Replacement Guarantee Note (Sans emoji) -->
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5;">
                <strong>Garantie de conformité Aegis Solaire :</strong> Tout numéro erroné ou projet injoignable signalé sous 7 jours ouvrés est recrédité sous 24h ouvrées sur votre compte.
              </p>

            </td>
          </tr>

          <!-- Institutional Footer (100% Anonymity compliant) -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 22px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; line-height: 1.6; color: #64748B;">
              <p style="margin: 0 0 6px 0;">
                <strong>Aegis Solaire</strong> &mdash; Plateforme d'audit financier et de mise en relation photovoltaïque indépendante en Wallonie.
              </p>
              <p style="margin: 0 0 6px 0;">
                Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
              </p>
              <p style="margin: 0 0 6px 0;">
                Agrément RESCERT Photovoltaïque · Conformité CWaPE &amp; PACE 2030.
              </p>
              <p style="margin: 0 0 8px 0;">
                Vous recevez cette notification en tant qu'installateur partenaire agréé Aegis Solaire.
              </p>
              <p style="margin: 0;">
                <a href="${notifUrls.manageUrl}" style="color: #0F172A; font-weight: 600; text-decoration: underline;">Ajuster mes critères &amp; ma fréquence d'alerte</a>
                &nbsp;&middot;&nbsp;
                <a href="${notifUrls.noRelancesUrl}" style="color: #475569; text-decoration: underline;">Recevoir uniquement les nouveaux chantiers (stopper les rappels)</a>
                &nbsp;&middot;&nbsp;
                <a href="${notifUrls.muteAllUrl}" style="color: #475569; text-decoration: underline;">Désactiver toutes les alertes e-mail en 1 clic</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}
