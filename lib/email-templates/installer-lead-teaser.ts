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

/**
 * Construit l'objet d'e-mail selon la vague et la typologie du dossier
 */
export function buildLeadEmailSubject(data: InstallerLeadTeaserData): string {
  const cityOrProvince = data.lead.city?.trim() || getProvinceDisplayLabel(data.lead.province, data.lead.provinceFreeText)
  const postalCode = data.lead.postalCode ? `${data.lead.postalCode} ` : ""
  const isB2B = data.lead.segment === "B2B"
  const power = data.financials.estimatedPowerKwc > 0 ? `${data.financials.estimatedPowerKwc} kWc` : "PV"
  const remainingSlots = Math.max(0, data.maxSlots - data.takenSlots)

  if (data.waveNumber === 1) {
    if (isB2B) {
      return `⚡ Nouveau projet B2B exclusif à ${postalCode}${cityOrProvince} (${power}) — Dossier #${data.lead.id.slice(0, 8)}`
    }
    return `⚡ Nouveau dossier photovoltaïque à ${postalCode}${cityOrProvince} — 3 créneaux max (#${data.lead.id.slice(0, 8)})`
  }

  if (data.waveNumber === 2) {
    if (isB2B) {
      return `⏳ Rappel exclusif : Projet B2B disponible à ${postalCode}${cityOrProvince} (${power})`
    }
    return `⏳ Plus que ${remainingSlots} place(s) restante(s) — Projet solaire à ${postalCode}${cityOrProvince}`
  }

  // Wave 3
  if (isB2B) {
    return `⚠️ Dernier appel : Projet B2B à ${postalCode}${cityOrProvince} en attente d'artisan certifié`
  }
  return `⚠️ Dernier créneau disponible : Installation solaire à ${postalCode}${cityOrProvince}`
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

  const provinceLabel = getProvinceDisplayLabel(data.lead.province, data.lead.provinceFreeText)
  const city = data.lead.city ? data.lead.city.trim() : provinceLabel
  const postalCode = data.lead.postalCode ? data.lead.postalCode.trim() : "—"
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

  // Text Hook based on Wave
  let waveIntroText = ""
  let waveUrgencyBadge = ""

  if (data.waveNumber === 1) {
    waveIntroText = `Un nouveau dossier de rénovation photovoltaïque hautement qualifié vient d'être validé par nos auditeurs techniques dans votre zone d'intervention (${city}, ${provinceLabel}).`
    waveUrgencyBadge = isB2B ? "EXCLUSIVITÉ 100% — 1 SEUL ACHETEUR" : "ATTRIBUTION STRICTEMENT LIMITÉE À 3 ARTISANS"
  } else if (data.waveNumber === 2) {
    waveIntroText = `Rappel : Le dossier photovoltaïque à ${city} dispose encore de ${remainingSlots} place(s) artisan disponible(s). Les installateurs de votre région étudient actuellement ce chantier.`
    waveUrgencyBadge = `PLUS QUE ${remainingSlots} CRÉNEAU(X) DISPONIBLE(S)`
  } else {
    waveIntroText = `Dernière opportunité : Ce dossier qualifié à ${city} n'a plus qu'un créneau disponible avant clôture définitive de la mise en relation.`
    waveUrgencyBadge = "DERNIER CRÉNEAU DISPONIBLE — CLÔTURE IMMINENTE"
  }

  // Visual Scarcity Slots for B2C
  let slotsHtml = ""
  if (!isB2B) {
    const slots = []
    for (let i = 1; i <= data.maxSlots; i++) {
      if (i <= data.takenSlots) {
        slots.push(`
          <td style="padding: 6px 10px; background-color: #F0ECE3; border-radius: 4px; border: 1px solid #E2DDD3; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #525E59; text-align: center;">
            <span style="color: #0B2B22; font-weight: bold;">●</span> Place ${i} : Réservée
          </td>
        `)
      } else {
        slots.push(`
          <td style="padding: 6px 10px; background-color: #FAF8F5; border-radius: 4px; border: 1px dashed #0B2B22; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #0B2B22; font-weight: bold; text-align: center;">
            <span style="color: #D97706;">○</span> Place ${i} : DISPONIBLE
          </td>
        `)
      }
    }
    slotsHtml = `
      <table cellpadding="0" cellspacing="6" border="0" style="margin: 12px 0 16px 0; width: 100%;">
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
RÉSUMÉ DU PROJET : Installation Solaire à ${city} (${postalCode})
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
• Nom du client : ${escapeHtml(data.lead.firstName)} ${data.lead.lastName ? escapeHtml(data.lead.lastName) : ""}
• Ville : ${city} (${postalCode})
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
Notre référent solaire Fabrice Remacle et notre équipe support se tiennent à votre disposition au +32 (0)4 220 00 00.

Aegis Solaire — Initiative exploitée par INIT42 (Liège, Belgique — BCE 1039.899.980)
`.trim()

  // High-End Swiss Editorial HTML Email (Compatible Outlook, Gmail, Apple Mail)
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, li, blockquote { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; font-variant-numeric: tabular-nums !important; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 12px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; color: #111815; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5;">

  <!-- Preheader invisible -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    Nouveau dossier photovoltaïque qualifié à ${escapeHtml(city)} (${escapeHtml(postalCode)}) — ${powerKwc} — ${remainingSlots} place(s) disponible(s).
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5;">
    <tr>
      <td align="center" style="padding: 24px 12px 40px 12px;">

        <!-- Main Wrapper (600px) -->
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2DDD3; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 12px -4px rgba(17, 24, 21, 0.06);">
          
          <!-- Institutional Header Bar (Fond blanc pur pour contraste parfait du logo) -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 20px 24px; border-bottom: 2px solid #0B2B22;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${logoUrl}" alt="Aegis Solaire" height="36" style="display: block; max-height: 36px; width: auto;" />
                  </td>
                  <td align="right" valign="middle" class="mono" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #0B2B22; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
                    Réseau Wallon Agréé · RESCERT
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner / Wave Eyebrow -->
          <tr>
            <td style="background-color: #F0ECE3; padding: 10px 24px; border-bottom: 1px solid #E2DDD3;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" class="mono" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 600; color: #0B2B22; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${waveUrgencyBadge}
                  </td>
                  <td align="right" class="mono" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #525E59;">
                    Dossier #${escapeHtml(data.lead.id.slice(0, 8))}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro Content -->
          <tr>
            <td style="padding: 24px 24px 16px 24px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111815;">
                Bonjour ${escapeHtml(partnerGreetingName)},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #525E59; line-height: 1.6;">
                ${escapeHtml(waveIntroText)}
              </p>

              <!-- Top Primary CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0B2B22; border-radius: 4px; padding: 13px 28px;">
                          <a href="${dashboardLeadUrl}" target="_blank" style="font-size: 14px; font-weight: 600; color: #FAF8F5; text-decoration: none; display: inline-block; letter-spacing: 0.01em;">
                            Débloquer ce dossier sur mon Dashboard &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Project Technical Card (The Core Box) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2DDD3; border-radius: 6px; background-color: #FAF8F5; margin-bottom: 24px;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #E2DDD3; background-color: #FFFFFF; border-top-left-radius: 5px; border-top-right-radius: 5px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="left" valign="middle">
                          <h2 style="margin: 0; font-size: 17px; font-weight: 700; color: #111815; line-height: 1.3;">
                            Installation solaire à ${escapeHtml(city)}
                          </h2>
                          <p style="margin: 3px 0 0 0; font-size: 12px; color: #525E59;" class="mono">
                            ${escapeHtml(data.lead.firstName)} ${data.lead.lastName ? escapeHtml(data.lead.lastName) : ""} · Région : ${escapeHtml(provinceLabel)} (${escapeHtml(postalCode)})
                          </p>
                        </td>
                        <td align="right" valign="middle" style="width: 32px;">
                          <div style="background-color: #F0ECE3; border-radius: 4px; padding: 6px; text-align: center; width: 20px; height: 20px; line-height: 20px;">
                            🔒
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Trust Badges -->
                    <div style="margin-top: 12px;">
                      <span class="mono" style="display: inline-block; font-family: ui-monospace, monospace; font-size: 11px; padding: 3px 8px; background-color: #0B2B22; color: #FAF8F5; border-radius: 3px; margin-right: 6px; font-weight: 500;">
                        ✓ Téléphone Contrôlé
                      </span>
                      <span class="mono" style="display: inline-block; font-family: ui-monospace, monospace; font-size: 11px; padding: 3px 8px; background-color: #F0ECE3; color: #0B2B22; border: 1px solid #E2DDD3; border-radius: 3px; margin-right: 6px; font-weight: 500;">
                        ✓ Propriétaire Vérifié
                      </span>
                      <span class="mono" style="display: inline-block; font-family: ui-monospace, monospace; font-size: 11px; padding: 3px 8px; background-color: #F0ECE3; color: #0B2B22; border: 1px solid #E2DDD3; border-radius: 3px; font-weight: 500;">
                        ✓ Satellite Toiture OK
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Technical Specs Rows -->
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="42%" valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Segment de marché</td>
                        <td width="58%" valign="top" style="font-size: 13px; font-weight: 600; color: #111815; border-bottom: 1px solid #E2DDD3;">
                          ${isB2B ? "Professionnel / B2B (Exclusivité 100%)" : "Résidentiel / B2C (Partagé max 3)"}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Puissance estimée</td>
                        <td valign="top" class="mono" style="font-size: 13px; font-weight: 700; color: #0B2B22; border-bottom: 1px solid #E2DDD3;">
                          ${powerKwc}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Surface toiture / terrain</td>
                        <td valign="top" class="mono" style="font-size: 13px; font-weight: 600; color: #111815; border-bottom: 1px solid #E2DDD3;">
                          ${surfaceArea} (${escapeHtml(surfaceTypeLabel)})
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Type de couverture toiture</td>
                        <td valign="top" style="font-size: 13px; font-weight: 600; color: #111815; border-bottom: 1px solid #E2DDD3;">
                          ${escapeHtml(roofMaterialLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Facture d'électricité actuelle</td>
                        <td valign="top" class="mono" style="font-size: 13px; font-weight: 600; color: #111815; border-bottom: 1px solid #E2DDD3;">
                          ${annualBill}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Profil du décideur</td>
                        <td valign="top" style="font-size: 13px; font-weight: 600; color: #111815; border-bottom: 1px solid #E2DDD3;">
                          ${escapeHtml(ownershipLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Objectif prioritaire</td>
                        <td valign="top" style="font-size: 13px; font-weight: 600; color: #111815; border-bottom: 1px solid #E2DDD3;">
                          ${escapeHtml(driverLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Échéance souhaitée</td>
                        <td valign="top" style="font-size: 13px; font-weight: 600; color: #111815; border-bottom: 1px solid #E2DDD3;">
                          ${escapeHtml(timeframeLabel)}
                        </td>
                      </tr>
                      ${
                        data.lead.projectDetails
                          ? `<tr>
                        <td valign="top" style="font-size: 13px; color: #525E59; border-bottom: 1px solid #E2DDD3;">Précisions du client</td>
                        <td valign="top" style="font-size: 13px; color: #111815; font-style: italic; border-bottom: 1px solid #E2DDD3;">
                          &laquo; ${escapeHtml(data.lead.projectDetails)} &raquo;
                        </td>
                      </tr>`
                          : ""
                      }
                    </table>
                  </td>
                </tr>

                <!-- Masked Contact Details (Homedeal Style) -->
                <tr>
                  <td style="padding: 14px 20px; background-color: #FFFFFF; border-top: 1px solid #E2DDD3;">
                    <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #0B2B22; text-transform: uppercase; letter-spacing: 0.05em;" class="mono">
                      Coordonnées débloquées après acquisition :
                    </p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="4">
                      <tr>
                        <td width="35%" style="font-size: 13px; color: #525E59;">Nom du contact :</td>
                        <td width="65%" style="font-size: 13px; font-weight: 600; color: #111815;">
                          ${escapeHtml(data.lead.firstName)} ${data.lead.lastName ? escapeHtml(data.lead.lastName) : ""}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #525E59;">Adresse du chantier :</td>
                        <td style="font-size: 13px; font-family: ui-monospace, monospace; color: #525E59;">
                          ********* (${escapeHtml(postalCode)} ${escapeHtml(city)})
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #525E59;">Numéro de téléphone :</td>
                        <td style="font-size: 13px; font-family: ui-monospace, monospace; color: #525E59;">
                          ********* <span style="color: #0B2B22; font-weight: bold;">[✓ Vérifié]</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #525E59;">Adresse e-mail :</td>
                        <td style="font-size: 13px; font-family: ui-monospace, monospace; color: #525E59;">
                          ********* <span style="color: #0B2B22; font-weight: bold;">[✓ Vérifié]</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Scarcity & Competition Rules -->
                <tr>
                  <td style="padding: 16px 20px; background-color: #F0ECE3; border-top: 1px solid #E2DDD3;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #0B2B22; text-transform: uppercase;" class="mono">
                      Politique d'attribution Aegis Solaire :
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #525E59; line-height: 1.5;">
                      ${
                        isB2B
                          ? "<strong>Exclusivité absolue garantie :</strong> Ce dossier est cédé à <strong>1 seul installateur unique</strong>. Aucune concurrence de plateforme ne sera admise."
                          : "<strong>Attribution restreinte à 3 installateurs certifiés maximum :</strong> Pour protéger vos marges et éviter les enchères destructrices, ce lead est automatiquement verrouillé dès le 3ème déblocage."
                      }
                    </p>
                    ${slotsHtml}
                  </td>
                </tr>

                <!-- Financial Estimations for Installer -->
                <tr>
                  <td style="padding: 16px 20px; background-color: #FFFFFF; border-top: 1px solid #E2DDD3; border-bottom-left-radius: 5px; border-bottom-right-radius: 5px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="33%" align="center" style="border-right: 1px solid #E2DDD3; padding: 4px;">
                          <div style="font-size: 11px; color: #525E59;">Valeur devis estimée</div>
                          <div class="mono" style="font-size: 13px; font-weight: 700; color: #111815; margin-top: 4px;">${estimatedContract}</div>
                        </td>
                        <td width="33%" align="center" style="border-right: 1px solid #E2DDD3; padding: 4px;">
                          <div style="font-size: 11px; color: #525E59;">Marge brute indicative</div>
                          <div class="mono" style="font-size: 13px; font-weight: 700; color: #0B2B22; margin-top: 4px;">${estimatedMargin}</div>
                        </td>
                        <td width="34%" align="center" style="padding: 4px;">
                          <div style="font-size: 11px; color: #525E59;">Coût du lead</div>
                          <div class="mono" style="font-size: 13px; font-weight: 700; color: #D97706; margin-top: 4px;">${data.creditCost} cr. (~${creditCostEur})</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bottom CTA Button & Balance Status -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0B2B22; border-radius: 4px; padding: 14px 32px;">
                          <a href="${dashboardLeadUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #FAF8F5; text-decoration: none; display: inline-block;">
                            Débloquer les coordonnées complètes &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p class="mono" style="margin: 10px 0 0 0; font-size: 12px; color: #525E59;">
                      Votre solde actuel : <strong>${data.partner.credits} crédits</strong>
                      ${
                        !hasEnoughCredits
                          ? ` &bull; <a href="${creditsOrderUrl}" style="color: #D97706; text-decoration: underline; font-weight: 600;">Recharger votre pack de crédits</a>`
                          : ""
                      }
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Technical Assistance & Guarantee Callout -->
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background-color: #F0ECE3; border-radius: 4px; border-left: 3px solid #0B2B22; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0B2B22;">
                      Besoin d'un accompagnement technique ou d'un dimensionnement ?
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #525E59; line-height: 1.5;">
                      En tant que partenaire certifié Aegis Solaire, vous pouvez solliciter l'assistance de notre Chief Technical Advisor <strong>Fabrice Remacle</strong> pour vos études d'onduleurs, batteries et dossiers tertiaires complexes. Contact direct : <a href="mailto:support@aegissolaire.com" style="color: #0B2B22; font-weight: 600;">support@aegissolaire.com</a>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Replacement Guarantee Note -->
              <p style="margin: 0 0 16px 0; font-size: 12px; color: #525E59; text-align: center;">
                🛡️ <strong>Garantie Sérénité Aegis Solaire :</strong> Tout numéro erroné ou dossier injoignable après 3 tentatives est recrédité sous 24h ouvrées via votre interface partenaire.
              </p>

            </td>
          </tr>

          <!-- Institutional Footer -->
          <tr>
            <td style="background-color: #F0ECE3; border-top: 1px solid #E2DDD3; padding: 20px 24px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 11px; color: #525E59; line-height: 1.6;">
                    <strong>Aegis Solaire</strong> — Plateforme d'intermédiation & ingénierie photovoltaïque en Wallonie.<br />
                    Exploité par INIT42 · Siège : Liège, Belgique · BCE / KBO : <span class="mono">1039.899.980</span> · TVA : <span class="mono">BE 1039.899.980</span><br />
                    Agrément RESCERT Photovoltaïque · Conformité CWaPE & PACE 2030.
                  </td>
                </tr>
                <tr>
                  <td align="left" style="padding-top: 12px; font-size: 11px; color: #525E59;">
                    Vous recevez cette alerte car vous êtes un installateur certifié inscrit sur la marketplace Aegis Solaire.<br />
                    Pour ajuster vos zones d'intervention ou vos notifications : <a href="${baseUrl}/partenaires/dashboard" style="color: #0B2B22; text-decoration: underline;">Gérer mes préférences</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Main Wrapper -->

      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}
