import { FinancialEstimates } from "@/lib/marketplace-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

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
    createdAt: string
  }
  waveNumber: 1 | 2 | 3 | number
  takenSlots: number
  maxSlots: number
  creditCost: number
  financials: FinancialEstimates
}

import {
  SURFACE_TYPE_LABELS,
  ROOF_MATERIAL_LABELS,
  TIMEFRAME_LABELS,
  OWNERSHIP_LABELS,
  PROJECT_DRIVER_LABELS,
} from "@/lib/lead-display-helpers"

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
  const rawProvince = lead.province && lead.province !== "null" && lead.province !== "undefined"
    ? getProvinceDisplayLabel(lead.province, lead.provinceFreeText)
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
 * Construit l'objet d'e-mail selon la vague et la typologie du dossier
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

  if (data.waveNumber === 2) {
    if (isB2B) {
      return `Rappel : Projet B2B disponible ${locPhrase} (${power})`
    }
    return `Rappel : Plus que ${remainingSlots} place(s) restante(s) — Projet solaire ${locPhrase}`
  }

  // Wave 3
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
  const logoUrl = `${baseUrl}/logo.png`

  const { city, provinceLabel, postalCode, locPhrase } = getLeadLocationInfo(data.lead)
  const isB2B = data.lead.segment === "B2B"
  const remainingSlots = Math.max(0, data.maxSlots - data.takenSlots)

  const surfaceTypeLabel = SURFACE_TYPE_LABELS[data.lead.surfaceType] ?? data.lead.surfaceType
  const roofMaterialLabel = data.lead.roofMaterial ? (ROOF_MATERIAL_LABELS[data.lead.roofMaterial] ?? data.lead.roofMaterial) : "Toiture standard"
  const timeframeLabel = data.lead.timeframe ? (TIMEFRAME_LABELS[data.lead.timeframe] ?? data.lead.timeframe) : "Dans les 3 mois"
  const ownershipLabel = data.lead.ownershipStatus ? (OWNERSHIP_LABELS[data.lead.ownershipStatus] ?? data.lead.ownershipStatus) : "Propriétaire occupant"
  const driverLabel = data.lead.projectDriver ? (PROJECT_DRIVER_LABELS[data.lead.projectDriver] ?? data.lead.projectDriver) : "Optimisation des coûts énergétiques"

  const powerKwc = `${data.financials.estimatedPowerKwc} kWc`
  const surfaceArea = `${data.lead.surfaceArea.toLocaleString("fr-BE")} m²`
  const annualBill = `${data.lead.annualElectricityBill.toLocaleString("fr-BE")} € HT / an`
  const estimatedContract = `${data.financials.estimatedContractValueRange.min.toLocaleString("fr-BE")} € à ${data.financials.estimatedContractValueRange.max.toLocaleString("fr-BE")} € HT`
  const estimatedMargin = `~${data.financials.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT`
  const creditCostEur = `${data.financials.leadCostEuros.toFixed(2)} € HT`

  const partnerGreetingName = data.partner.contactName?.trim() || data.partner.companyName
  const hasEnoughCredits = data.partner.credits >= data.creditCost

  // Masquage strict du contact : seul le nom de famille est affiché, le prénom est masqué par "xxxx"
  const rawLeadLastName = (data.lead.lastName?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()
  const rawLeadFirstName = (data.lead.firstName?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()

  let leadMaskedName = "xxxx"
  if (rawLeadLastName) {
    leadMaskedName = `xxxx ${rawLeadLastName}`
  } else if (rawLeadFirstName) {
    const parts = rawLeadFirstName.split(/\s+/)
    if (parts.length > 1) {
      leadMaskedName = `xxxx ${parts[parts.length - 1]}`
    } else {
      leadMaskedName = `xxxx ${rawLeadFirstName}`
    }
  }

  // Text Hook based on Wave
  let waveIntroText = ""
  let waveUrgencyBadge = ""

  if (data.waveNumber === 1) {
    waveIntroText = `Un nouveau dossier de rénovation photovoltaïque hautement qualifié vient d'être validé par nos auditeurs techniques dans votre zone d'intervention (${city}${provinceLabel && provinceLabel !== city ? `, ${provinceLabel}` : ""}).`
    waveUrgencyBadge = isB2B ? "EXCLUSIVITÉ 100% — 1 SEUL ACHETEUR" : "ATTRIBUTION STRICTEMENT LIMITÉE À 3 ARTISANS"
  } else if (data.waveNumber === 2) {
    waveIntroText = `Rappel : Le dossier photovoltaïque ${locPhrase} dispose encore de ${remainingSlots} place(s) artisan disponible(s). Les installateurs de votre région étudient actuellement ce chantier.`
    waveUrgencyBadge = `PLUS QUE ${remainingSlots} CRÉNEAU(X) DISPONIBLE(S)`
  } else {
    waveIntroText = `Dernière opportunité : Ce dossier qualifié ${locPhrase} n'a plus qu'un créneau disponible avant clôture définitive de la mise en relation.`
    waveUrgencyBadge = "DERNIER CRÉNEAU DISPONIBLE — CLÔTURE IMMINENTE"
  }

  // Visual Scarcity Slots for B2C
  let slotsHtml = ""
  if (!isB2B) {
    const slots = []
    for (let i = 1; i <= data.maxSlots; i++) {
      if (i <= data.takenSlots) {
        slots.push(`
          <td style="padding: 8px 12px; background-color: #F1F5F9; border-radius: 8px; border: 1px solid #E2E8F0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #64748B; text-align: center;">
            <span style="color: #94A3B8; font-weight: 700;">●</span> Place ${i} : Réservée
          </td>
        `)
      } else {
        slots.push(`
          <td style="padding: 8px 12px; background-color: #FEF3C7; border-radius: 8px; border: 1px solid #FDE68A; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #B45309; font-weight: 700; text-align: center;">
            <span style="color: #F59E0B; font-weight: 700;">○</span> Place ${i} : DISPONIBLE
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

  // Plain Text Version
  const text = `AEGIS SOLAIRE — DOSSIER PHOTOVOLTAÏQUE QUALIFIÉ
Tiers de Confiance Wallon · Agrément RESCERT & CWaPE

Bonjour ${partnerGreetingName},

${waveIntroText}

Consultez la fiche technique et débloquez les coordonnées complètes du client :
${dashboardLeadUrl}

============================================================
RÉSUMÉ DU PROJET : Installation Solaire ${locPhrase}
============================================================
• Segment : ${isB2B ? "Professionnel / B2B (Exclusif)" : "Résidentiel / B2C (Max 3 artisans)"}
• Puissance estimée : ${powerKwc}
• Surface disponible : ${surfaceArea} (${surfaceTypeLabel})
• Type de toiture : ${roofMaterialLabel}
• Facture d'électricité : ${annualBill}
• Décisionnaire : ${ownershipLabel}
• Objectif du projet : ${driverLabel}
• Échéance souhaitée : ${timeframeLabel}

COORDONNÉES CLIENT :
• Nom du client : ${leadMaskedName}
• Localisation : ${locPhrase}
• Téléphone : ********* [Vérifié par Aegis Solaire]
• E-mail : ********* [Vérifié par Aegis Solaire]
• Adresse exacte : ********* [Débloquée après acquisition]

CONDITIONS D'ACQUISITION :
• Coût du dossier : ${data.creditCost} crédits (~${creditCostEur})
• Votre solde actuel : ${data.partner.credits} crédits
• Montant estimé du devis : ${estimatedContract}
• Marge brute estimée : ${estimatedMargin}
${!isB2B ? `• Attribution : Limité à 3 artisans maximum (${remainingSlots} place(s) restante(s))` : "• Exclusivité : 100 % exclusif (1 seul artisan sur ce dossier)"}

Pour débloquer ce dossier en 1 clic :
${dashboardLeadUrl}

${!hasEnoughCredits ? `Note : Votre solde actuel (${data.partner.credits} crédits) est insuffisant pour ce dossier (${data.creditCost} crédits). Vous pouvez recharger votre pack en quelques clics ici : ${creditsOrderUrl}\n` : ""}
Une question technique ?
Notre cellule technique et ingénierie se tient à votre entière disposition par e-mail à contact@aegissolaire.com.

Aegis Solaire — Plateforme éditée par INIT42 (Nathan Remacle) · Liège, Belgique · BCE BE 1039.899.980
`.trim()

  // Dynamic tokens depending on urgency stage (sans jamais mentionner le mot interne "vague")
  const topStripeColor =
    data.waveNumber === 1 ? "#2563EB" : data.waveNumber === 2 ? "#F59E0B" : "#DC2626"

  let pillBadgeBg = "#EFF6FF"
  let pillBadgeBorder = "#BFDBFE"
  let pillBadgeColor = "#1D4ED8"
  let bulletColor = "#2563EB"
  let pillBadgeText = isB2B ? "Exclusivité 100% · B2B" : "Attribution Restreinte · 3 Max"

  let eyebrowColor = "#2563EB"
  let eyebrowText = `Nouveau Dossier Qualifié · ${city} (#${data.lead.id.slice(0, 8)})`

  let headlineTitle = `Installation solaire ${escapeHtml(locPhrase)}`

  if (data.waveNumber === 2) {
    pillBadgeBg = "#FEF3C7"
    pillBadgeBorder = "#FDE68A"
    pillBadgeColor = "#92400E"
    bulletColor = "#D97706"
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
    bulletColor = "#DC2626"
    pillBadgeText = isB2B ? "Clôture Imminente · B2B" : "Dernier créneau disponible"
    eyebrowColor = "#DC2626"
    eyebrowText = isB2B
      ? `Avis de Clôture · Projet B2B (#${data.lead.id.slice(0, 8)})`
      : `Dernière Opportunité · Clôture Imminente (#${data.lead.id.slice(0, 8)})`
    headlineTitle = `Dernier créneau disponible ${escapeHtml(locPhrase)}`
  }

  // High-End Fintech Slate & Solar Trust HTML Email
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

        <!-- Main Card Container avec liseré supérieur dynamique selon la vague -->
        <table role="presentation" class="email-container" width="600" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid ${topStripeColor}; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
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
                    <span class="mono" style="display: inline-block; white-space: nowrap; background-color: ${pillBadgeBg}; border: 1px solid ${pillBadgeBorder}; color: ${pillBadgeColor}; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.3;">
                      <span style="color: ${bulletColor}; font-size: 8px; vertical-align: middle; margin-right: 6px;">●</span>${escapeHtml(pillBadgeText)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="email-body" style="padding: 34px 32px 28px 32px;">

              <!-- Eyebrow & Subject Headline -->
              <p class="mono" style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: ${eyebrowColor}; text-transform: uppercase; letter-spacing: 0.08em;">
                ${eyebrowText}
              </p>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; line-height: 1.25; color: #0F172A; letter-spacing: -0.02em;">
                ${headlineTitle}
              </h1>

              <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Bonjour <strong>${escapeHtml(partnerGreetingName)}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                ${escapeHtml(waveIntroText)}
              </p>

              <!-- Top Primary CTA Button (Fintech Slate) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="padding: 4px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);">
                          <a href="${dashboardLeadUrl}" target="_blank" style="display: inline-block; padding: 15px 34px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: 0.01em;">
                            Débloquer ce dossier sur mon Dashboard &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span class="mono" style="font-size: 12px; color: #64748B;">
                      Accès immédiat · Coût du dossier : <strong style="color: #0F172A;">${data.creditCost} crédits</strong> (~${creditCostEur})
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Project Technical Bento Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 28px; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 18px 22px; border-bottom: 1px solid #E2E8F0; background-color: #F8FAFC;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" valign="middle">
                          <h2 style="margin: 0; font-size: 17px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                            Installation solaire ${escapeHtml(locPhrase)}
                          </h2>
                          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;" class="mono">
                            ${escapeHtml(leadMaskedName)} · Région : ${escapeHtml(provinceLabel)}${postalCode && postalCode !== "—" ? ` (${escapeHtml(postalCode)})` : ""}
                          </p>
                        </td>
                        <td align="right" valign="middle" style="width: 32px;">
                          <div style="background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px; text-align: center; width: 20px; height: 20px; line-height: 20px; font-size: 12px;">
                            🔒
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Trust Badges Bento -->
                    <div style="margin-top: 12px;">
                      <span class="mono" style="display: inline-block; font-size: 11px; padding: 4px 10px; background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; border-radius: 9999px; font-weight: 700; margin-right: 6px;">
                        ✓ Téléphone Contrôlé
                      </span>
                      <span class="mono" style="display: inline-block; font-size: 11px; padding: 4px 10px; background-color: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; border-radius: 9999px; font-weight: 700; margin-right: 6px;">
                        ✓ Propriétaire Vérifié
                      </span>
                      <span class="mono" style="display: inline-block; font-size: 11px; padding: 4px 10px; background-color: #F1F5F9; color: #334155; border: 1px solid #E2E8F0; border-radius: 9999px; font-weight: 700;">
                        ✓ Satellite Cadastre OK
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Technical Specs Rows -->
                <tr>
                  <td style="padding: 8px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="44%" valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Segment de marché</td>
                        <td width="56%" valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${isB2B ? "Professionnel / B2B (Exclusivité 100%)" : "Résidentiel / B2C (Partagé max 3)"}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Puissance estimée</td>
                        <td valign="top" class="mono" style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #2563EB; border-bottom: 1px solid #F1F5F9;">
                          ${powerKwc}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Surface toiture / terrain</td>
                        <td valign="top" class="mono" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${surfaceArea} (${escapeHtml(surfaceTypeLabel)})
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Type de couverture toiture</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(roofMaterialLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Facture d'électricité actuelle</td>
                        <td valign="top" class="mono" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${annualBill}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Profil du décideur</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(ownershipLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Objectif prioritaire</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(driverLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Échéance souhaitée</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #F1F5F9;">
                          ${escapeHtml(timeframeLabel)}
                        </td>
                      </tr>
                      ${
                        data.lead.projectDetails
                          ? `<tr>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #F1F5F9;">Précisions du client</td>
                        <td valign="top" style="padding: 10px 0; font-size: 13px; color: #0F172A; font-style: italic; border-bottom: 1px solid #F1F5F9;">
                          &laquo; ${escapeHtml(data.lead.projectDetails)} &raquo;
                        </td>
                      </tr>`
                          : ""
                      }
                    </table>
                  </td>
                </tr>

                <!-- Masked Contact Details -->
                <tr>
                  <td style="padding: 16px 22px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
                    <p class="mono" style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.06em;">
                      Coordonnées débloquées après acquisition :
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
                          ********* <span style="color: #059669; font-weight: 700;">[✓ Vérifié]</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Adresse e-mail :</td>
                        <td style="font-size: 13px; color: #0F172A; font-weight: 600;" class="mono">
                          ********* <span style="color: #059669; font-weight: 700;">[✓ Vérifié]</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Scarcity & Competition Rules -->
                <tr>
                  <td style="padding: 18px 22px; background-color: #FFFFFF; border-top: 1px solid #E2E8F0;">
                    <p class="mono" style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em;">
                      Règle de concurrence Aegis Solaire :
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                      ${
                        isB2B
                          ? "<strong>Exclusivité absolue garantie :</strong> Ce dossier est cédé à <strong>1 seul installateur unique</strong>. Aucune concurrence de plateforme ne sera admise."
                          : "<strong>Attribution restreinte à 3 installateurs certifiés maximum :</strong> Pour protéger vos marges et éviter les enchères destructrices, ce lead est automatiquement verrouillé dès le 3ème déblocage."
                      }
                    </p>
                    ${slotsHtml}
                  </td>
                </tr>

                <!-- Financial Estimations Bento Footer -->
                <tr>
                  <td style="padding: 18px 20px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
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
                          <div style="font-size: 11px; color: #64748B; font-weight: 500;">Coût du lead</div>
                          <div class="mono" style="font-size: 13px; font-weight: 700; color: #2563EB; margin-top: 4px;">${data.creditCost} cr. (~${creditCostEur})</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bottom CTA Button & Balance Status -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 26px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);">
                          <a href="${dashboardLeadUrl}" target="_blank" style="display: inline-block; padding: 15px 34px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: 0.01em;">
                            Débloquer les coordonnées complètes &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p class="mono" style="margin: 12px 0 0 0; font-size: 12px; color: #64748B;">
                      Votre solde actuel : <strong style="color: #0F172A;">${data.partner.credits} crédits</strong>
                      ${
                        !hasEnoughCredits
                          ? ` &bull; <a href="${creditsOrderUrl}" style="color: #2563EB; text-decoration: underline; font-weight: 600;">Recharger votre pack de crédits</a>`
                          : ""
                      }
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Technical Assistance Bento Box (Anonymity Compliant) -->
              <div style="background-color: #F1F5F9; border-left: 3px solid #2563EB; padding: 16px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0F172A;">
                  Besoin d'un accompagnement technique ou d'un dimensionnement ?
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #475569;">
                  En tant que partenaire certifié Aegis Solaire, vous pouvez solliciter l'assistance de notre cellule technique et ingénierie pour vos études d'onduleurs, batteries et dossiers tertiaires complexes. Contact direct : <a href="mailto:contact@aegissolaire.com" style="color: #2563EB; font-weight: 600; text-decoration: underline;">contact@aegissolaire.com</a>.
                </p>
              </div>

              <!-- Replacement Guarantee Note -->
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5;">
                🛡️ <strong>Garantie Sérénité Aegis Solaire :</strong> Tout numéro erroné ou dossier injoignable après 3 tentatives est recrédité sous 24h ouvrées via votre interface partenaire.
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
                Éditée par <strong>INIT42</strong> (Nathan Remacle, personne physique) · BCE/TVA <span class="mono">BE 1039.899.980</span> · Liège, Belgique.
              </p>
              <p style="margin: 0 0 6px 0;">
                Agrément RESCERT Photovoltaïque · Conformité CWaPE &amp; PACE 2030.
              </p>
              <p style="margin: 0;">
                Vous recevez cette alerte car votre société est membre agréé de la marketplace Aegis Solaire. Pour ajuster vos préférences : <a href="${baseUrl}/partenaires/dashboard" style="color: #475569; text-decoration: underline;">Gérer mes préférences</a>.
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
