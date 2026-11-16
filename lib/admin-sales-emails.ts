import { Resend } from "resend"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import {
  getB2CSlotIndicator,
  getGrdLabel,
  getLeadLocationInfo,
  getRoofMaterialLabel,
  getSurfaceTypeLabel,
  getTimeframeLabel,
} from "@/lib/lead-display-helpers"

function escapeHtml(value: unknown): string {
  const s = String(value ?? "")
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
}

export function getAdminSalesRecipients(): string[] {
  const raw =
    process.env.ADMIN_ALERT_EMAIL?.trim() ||
    process.env.ADMIN_EMAILS?.trim() ||
    "contact@aegissolaire.com"

  const parsed = raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes("@"))

  return parsed.length > 0 ? parsed : ["contact@aegissolaire.com"]
}

function normalizeImageUrl(rawUrl: unknown, baseUrl: string): string | null {
  if (typeof rawUrl !== "string") return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed
  }
  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`
  }
  return null
}

function formatEur(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0)
  if (!Number.isFinite(num)) return "0,00 €"
  return `${num.toFixed(2).replace(".", ",")} €`
}

function formatDateTimeBrussels(isoOrDate?: string | Date | null): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date()
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("fr-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export interface LeadSaleBuyerSummary {
  partnerId: string
  companyName: string
  purchasedAt?: string | null
  isTest?: boolean
  isCurrentBuyer?: boolean
}

export interface AdminLeadSaleEmailParams {
  mode: "direct_mollie" | "credits"
  purchaseId?: string | null
  partner: {
    id: string
    company_name: string
    email: string
    phone?: string | null
    credits?: number | null
  }
  lead: {
    id: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    company?: string | null
    company_vat?: string | null
    segment?: string | null
    province?: string | null
    city?: string | null
    postal_code?: string | null
    site_address?: string | null
    surface_type?: string | null
    surface_area?: number | null
    estimated_power_kwc?: number | null
    annual_electricity_bill?: number | null
    roof_material?: string | null
    project_timeline?: string | null
    lead_score?: number | null
    grd?: string | null
    qualification_metadata?: Record<string, unknown> | null
    created_at?: string | null
  }
  /** Détails financiers (mode direct_mollie) */
  priceHtva?: number | string | null
  vatAmount?: number | string | null
  priceTtc?: number | string | null
  paymentMethod?: string | null
  molliePaymentId?: string | null
  /** Détails crédits (mode credits ou équivalent) */
  creditsSpent?: number | null
  creditsRemainingAfter?: number | null
  /** Places prises et acheteurs actuels sur ce dossier */
  takenSlots: number
  maxSlots: number
  buyers?: LeadSaleBuyerSummary[]
}

export async function sendAdminLeadSaleNotification(
  params: AdminLeadSaleEmailParams
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[admin-sales-emails] RESEND_API_KEY manquante — notification ignorée")
    return { success: false, error: "RESEND_API_KEY manquante" }
  }

  const baseUrl = getBaseUrl()
  const recipients = getAdminSalesRecipients()
  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"

  const { lead, partner } = params
  const isB2B = (lead.segment || "").toUpperCase() === "B2B"
  const maxSlots = Math.max(1, params.maxSlots || (isB2B ? 1 : 3))
  const takenSlots = Math.max(1, Math.min(maxSlots, params.takenSlots))
  const remainingSlots = Math.max(0, maxSlots - takenSlots)

  const leadFirst = (lead.first_name || "").trim()
  const leadLast = (lead.last_name || "").trim()
  const leadFullName = `${leadFirst} ${leadLast}`.trim() || lead.company?.trim() || `Lead #${lead.id.slice(0, 8)}`
  const leadHeadlineName =
    isB2B && lead.company && lead.company.trim() && !leadFullName.includes(lead.company.trim())
      ? `${leadFullName} (${lead.company.trim()})`
      : leadFullName

  const adminLeadUrl = `${baseUrl}/admin/leads?leadId=${encodeURIComponent(lead.id)}`
  const adminPartnersUrl = `${baseUrl}/admin/partners`

  const loc = getLeadLocationInfo(lead)
  const provinceLabel =
    loc.provinceLabel || getProvinceDisplayLabel(lead.province || "wallonie")
  const hasRealPostal = Boolean(lead.postal_code && String(lead.postal_code).trim())
  const hasRealCity = Boolean(lead.city && String(lead.city).trim())
  const cityPostalLine = [
    hasRealPostal ? String(lead.postal_code).trim() : null,
    hasRealCity ? String(lead.city).trim() : loc.city,
  ]
    .filter(Boolean)
    .join(" ")
  const fullLocality = [
    lead.site_address?.trim() || null,
    cityPostalLine || null,
    provinceLabel || null,
  ]
    .filter(Boolean)
    .join(" · ") || "Wallonie"

  const mapsQuery = [lead.site_address, lead.postal_code, lead.city || loc.city, "Belgique"]
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .join(", ")
  const googleMapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null

  const qualMeta = (lead.qualification_metadata || {}) as Record<string, unknown>
  const roofImageUrl =
    normalizeImageUrl(qualMeta.roof_image_url, baseUrl) ||
    normalizeImageUrl(qualMeta.site_image_url, baseUrl)

  // Statut des places restantes
  const slotIndicator = !isB2B ? getB2CSlotIndicator(remainingSlots) : null
  let slotStatusLabel: string
  let slotShortSubject: string
  let slotBadgeBg: string
  let slotBadgeBorder: string
  let slotBadgeColor: string

  if (remainingSlots === 0) {
    slotStatusLabel = isB2B
      ? "0 / 1 place restante — Exclusif vendu (Sold Out)"
      : `0 / ${maxSlots} place restante — Complet (Sold Out)`
    slotShortSubject = isB2B ? "Vendu exclusif (0/1)" : `Complet (0/${maxSlots})`
    slotBadgeBg = "#FEF2F2"
    slotBadgeBorder = "#FECACA"
    slotBadgeColor = "#B91C1C"
  } else if (remainingSlots === 1) {
    slotStatusLabel = `1 / ${maxSlots} place restante (${takenSlots} prise${takenSlots > 1 ? "s" : ""})`
    slotShortSubject = `1/${maxSlots} place rest.`
    slotBadgeBg = "#FFF7ED"
    slotBadgeBorder = "#FED7AA"
    slotBadgeColor = "#C2410C"
  } else {
    slotStatusLabel = `${remainingSlots} / ${maxSlots} places restantes (${takenSlots} prise${takenSlots > 1 ? "s" : ""})`
    slotShortSubject = `${remainingSlots}/${maxSlots} places rest.`
    slotBadgeBg = "#ECFDF5"
    slotBadgeBorder = "#A7F3D0"
    slotBadgeColor = "#047857"
  }

  const isMollie = params.mode === "direct_mollie"
  const priceTtcStr = formatEur(params.priceTtc)
  const priceHtvaStr = formatEur(params.priceHtva)
  const vatStr = formatEur(params.vatAmount)
  const paymentMethodLabel = params.paymentMethod || "Bancontact"
  const creditsSpent = Number(params.creditsSpent ?? 0)
  const dateLabel = formatDateTimeBrussels()

  const heroValueText = isMollie ? `${priceTtcStr} TTC` : `${creditsSpent} crédit${creditsSpent > 1 ? "s" : ""}`
  const heroSubText = isMollie
    ? `${priceHtvaStr} HTVA · via ${paymentMethodLabel}`
    : params.creditsRemainingAfter != null
    ? `Solde partenaire : ${params.creditsRemainingAfter} cr.`
    : "Déblocage via portefeuille crédits"

  const modeBadgeText = isMollie ? "Achat direct Mollie" : "Déblocage par crédits"
  const modeAccentColor = isMollie ? "#059669" : "#2563EB"
  const modeBadgeBg = isMollie ? "#ECFDF5" : "#EFF6FF"
  const modeBadgeBorder = isMollie ? "#A7F3D0" : "#BFDBFE"
  const modeBadgeColor = isMollie ? "#047857" : "#1D4ED8"

  const subject = isMollie
    ? `[Aegis Solaire - Ventes] Achat direct : ${partner.company_name} → ${leadFullName} (${priceTtcStr} TTC · ${slotShortSubject})`
    : `[Aegis Solaire - Ventes] Déblocage crédits : ${partner.company_name} → ${leadFullName} (${creditsSpent} cr. · ${slotShortSubject})`

  // Infos techniques du lead
  const surfaceTypeLabel = lead.surface_type ? getSurfaceTypeLabel(lead.surface_type) : null
  const roofMaterialLabel = lead.roof_material ? getRoofMaterialLabel(lead.roof_material) : null
  const implantationCombined = [surfaceTypeLabel, roofMaterialLabel].filter(Boolean).join(" · ") || "—"
  const surfaceAreaLabel =
    lead.surface_area && Number(lead.surface_area) > 0
      ? `${Number(lead.surface_area).toLocaleString("fr-BE")} m²`
      : null
  const powerLabel =
    lead.estimated_power_kwc && Number(lead.estimated_power_kwc) > 0
      ? `~${Number(lead.estimated_power_kwc).toLocaleString("fr-BE")} kWc`
      : null
  const dimensioningCombined = [surfaceAreaLabel, powerLabel].filter(Boolean).join(" · ") || "—"
  const annualBillLabel =
    lead.annual_electricity_bill && Number(lead.annual_electricity_bill) > 0
      ? `${Number(lead.annual_electricity_bill).toLocaleString("fr-BE")} € / an`
      : "—"
  const grdLabel = lead.grd ? getGrdLabel(lead.grd) : "—"
  const timeframeLabel = lead.project_timeline ? getTimeframeLabel(lead.project_timeline) : "—"
  const scoreLabel =
    typeof lead.lead_score === "number" ? `${lead.lead_score} / 100` : "—"

  const buyersList = params.buyers && params.buyers.length > 0 ? params.buyers : []

  const textLines = [
    `AEGIS SOLAIRE — NOTIFICATION DE VENTE LEAD (${modeBadgeText.toUpperCase()})`,
    `Date : ${dateLabel}`,
    ``,
    `LEAD DÉBLOQUÉ :`,
    `- Nom du lead : ${leadHeadlineName}`,
    `- Lien admin : ${adminLeadUrl}`,
    `- Segment : ${lead.segment || "B2C"}`,
    `- Places restantes : ${slotStatusLabel}`,
    `- Localité : ${fullLocality}`,
    googleMapsUrl ? `- Google Maps : ${googleMapsUrl}` : null,
    `- Téléphone lead : ${lead.phone || "—"}`,
    `- E-mail lead : ${lead.email || "—"}`,
    `- Projet : ${implantationCombined} | ${dimensioningCombined} | Facture : ${annualBillLabel} | GRD : ${grdLabel}`,
    roofImageUrl ? `- Image du lead : ${roofImageUrl}` : `- Image du lead : Aucune image enregistrée`,
    ``,
    `PARTENAIRE & TRANSACTION :`,
    `- Partenaire : ${partner.company_name} (${partner.email}${partner.phone ? ` · ${partner.phone}` : ""})`,
    isMollie
      ? `- Paiement : Mollie (${paymentMethodLabel}) · ID : ${params.molliePaymentId || "—"}`
      : `- Paiement : ${creditsSpent} crédits déduits (solde restant : ${params.creditsRemainingAfter ?? "—"} cr.)`,
    isMollie ? `- Montant HTVA : ${priceHtvaStr} | TVA (21%) : ${vatStr} | Total TTC : ${priceTtcStr}` : null,
    params.purchaseId ? `- Référence achat : ${params.purchaseId}` : null,
    buyersList.length > 0
      ? `\nACQUÉREURS SUR CE DOSSIER (${takenSlots}/${maxSlots}) :\n` +
        buyersList
          .map(
            (b, i) =>
              `${i + 1}. ${b.companyName}${b.isTest ? " [TEST]" : ""}${b.isCurrentBuyer ? " (nouvel acquéreur)" : ""}${b.purchasedAt ? ` · ${formatDateTimeBrussels(b.purchasedAt)}` : ""}`
          )
          .join("\n")
      : null,
  ].filter((l): l is string => l !== null)

  const text = textLines.join("\n")

  const dotsHtml = slotIndicator
    ? slotIndicator.dots
        .map(
          (dotColor) =>
            `<span style="display:inline-block;width:9px;height:9px;border-radius:9999px;background-color:${dotColor};margin-right:4px;vertical-align:middle;"></span>`
        )
        .join("")
    : ""

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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
    }
    table { border-collapse: separate; border-spacing: 0; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      font-variant-numeric: tabular-nums !important;
    }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .email-pad { padding: 20px 16px !important; }
      .kpi-cell { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #E2E8F0 !important; box-sizing: border-box !important; }
      .kpi-cell-last { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;color:#0F172A;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(`${leadHeadlineName} · ${fullLocality} · ${slotStatusLabel} · Partenaire : ${partner.company_name}`)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:24px 12px 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="620" style="width:620px;max-width:620px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:4px solid ${modeAccentColor};border-radius:14px;overflow:hidden;box-shadow:0 4px 20px -2px rgba(15,23,42,0.06);">

          <!-- Top Brand Bar -->
          <tr>
            <td class="email-pad" style="padding:18px 28px;border-bottom:1px solid #E2E8F0;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${escapeHtml(baseUrl)}/admin/leads" target="_blank" style="text-decoration:none;display:inline-block;">
                      <img src="https://www.aegissolaire.com/logo.png" alt="Aegis Solaire" width="136" height="28" style="height:28px;width:auto;max-width:150px;display:block;" />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span class="mono" style="display:inline-block;background-color:${modeBadgeBg};border:1px solid ${modeBadgeBorder};color:${modeBadgeColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.04em;">
                      ${escapeHtml(modeBadgeText)}
                    </span>
                    <span class="mono" style="display:inline-block;margin-left:6px;background-color:#F1F5F9;border:1px solid #E2E8F0;color:#475569;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;">
                      #${escapeHtml(lead.id.slice(0, 8))}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td class="email-pad" style="padding:24px 28px 18px 28px;">
              <p class="mono" style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:${modeAccentColor};text-transform:uppercase;letter-spacing:0.06em;">
                Vente Lead · ${escapeHtml(lead.segment || "B2C")} · ${escapeHtml(dateLabel)}
              </p>
              <h1 style="margin:0 0 6px 0;font-size:21px;font-weight:800;line-height:1.25;color:#0F172A;letter-spacing:-0.015em;">
                ${escapeHtml(partner.company_name)} a débloqué le dossier de ${escapeHtml(leadFullName)}
              </h1>
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">
                Le dossier a été assigné instantanément dans le CRM de <strong>${escapeHtml(partner.company_name)}</strong>.
              </p>
            </td>
          </tr>

          <!-- 3-Column KPI Strip -->
          <tr>
            <td style="padding:0 28px 20px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;background-color:#F8FAFC;">
                <tr>
                  <td class="kpi-cell" width="33%" valign="top" style="padding:14px 14px;border-right:1px solid #E2E8F0;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;margin-bottom:4px;">
                      ${isMollie ? "Encaissement" : "Crédits débités"}
                    </div>
                    <div class="mono" style="font-size:17px;font-weight:800;color:#0F172A;line-height:1.2;">
                      ${escapeHtml(heroValueText)}
                    </div>
                    <div class="mono" style="font-size:11px;color:#64748B;margin-top:3px;">
                      ${escapeHtml(heroSubText)}
                    </div>
                  </td>
                  <td class="kpi-cell" width="34%" valign="top" style="padding:14px 14px;border-right:1px solid #E2E8F0;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;margin-bottom:4px;">
                      Places restantes
                    </div>
                    <div style="margin-bottom:4px;">
                      <span class="mono" style="display:inline-block;background-color:${slotBadgeBg};border:1px solid ${slotBadgeBorder};color:${slotBadgeColor};font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;">
                        ${remainingSlots} / ${maxSlots} restante${remainingSlots > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style="font-size:11px;color:#475569;margin-top:2px;">
                      ${dotsHtml}<span class="mono">${takenSlots}/${maxSlots} prise${takenSlots > 1 ? "s" : ""}</span>
                    </div>
                  </td>
                  <td class="kpi-cell-last" width="33%" valign="top" style="padding:14px 14px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;margin-bottom:4px;">
                      Localité
                    </div>
                    <div style="font-size:14px;font-weight:700;color:#0F172A;line-height:1.25;">
                      ${escapeHtml(cityPostalLine || loc.city)}
                    </div>
                    <div style="font-size:11px;color:#64748B;margin-top:3px;">
                      ${escapeHtml(provinceLabel)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Lead Visual & Identity Card -->
          <tr>
            <td style="padding:0 28px 20px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;background-color:#FFFFFF;">
                ${
                  roofImageUrl
                    ? `<tr>
                        <td style="padding:0;background-color:#0F172A;">
                          <a href="${escapeHtml(adminLeadUrl)}" target="_blank" style="display:block;text-decoration:none;">
                            <img src="${escapeHtml(roofImageUrl)}" alt="Photo du lead ${escapeHtml(leadFullName)}" width="564" style="width:100%;max-height:260px;object-fit:cover;object-position:center;display:block;border:0;" />
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:7px 16px;background-color:#F1F5F9;border-bottom:1px solid #E2E8F0;font-size:11px;color:#475569;">
                          Visuel toiture / façade du lead · <a href="${escapeHtml(adminLeadUrl)}" target="_blank" style="color:#2563EB;font-weight:600;text-decoration:underline;">Ouvrir le dossier</a>
                        </td>
                      </tr>`
                    : `<tr>
                        <td style="padding:10px 16px;background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;">
                          Aucun visuel toiture/façade enregistré sur ce dossier · <a href="${escapeHtml(adminLeadUrl)}" target="_blank" style="color:#2563EB;font-weight:600;text-decoration:underline;">Ajouter une image</a>
                        </td>
                      </tr>`
                }

                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;margin-bottom:4px;">
                      Dossier Lead (${escapeHtml(lead.segment || "B2C")})
                    </div>
                    <div style="margin-bottom:10px;">
                      <a href="${escapeHtml(adminLeadUrl)}" target="_blank" style="font-size:19px;font-weight:800;color:#0F172A;text-decoration:underline;">
                        ${escapeHtml(leadHeadlineName)}
                      </a>
                      ${
                        lead.company_vat
                          ? `<span class="mono" style="display:inline-block;margin-left:8px;font-size:11px;color:#475569;background-color:#F1F5F9;border:1px solid #E2E8F0;padding:2px 7px;border-radius:4px;">TVA ${escapeHtml(lead.company_vat)}</span>`
                          : ""
                      }
                    </div>

                    <!-- Lead Details Table -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.5;">
                      <tr>
                        <td width="34%" valign="top" style="padding:5px 8px 5px 0;color:#64748B;border-top:1px solid #F1F5F9;">Localité complète</td>
                        <td valign="top" style="padding:5px 0;color:#0F172A;font-weight:600;border-top:1px solid #F1F5F9;">
                          ${escapeHtml(fullLocality)}
                          ${
                            googleMapsUrl
                              ? ` · <a href="${escapeHtml(googleMapsUrl)}" target="_blank" style="color:#2563EB;font-weight:600;text-decoration:underline;font-size:12px;">Maps &rarr;</a>`
                              : ""
                          }
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:5px 8px 5px 0;color:#64748B;border-top:1px solid #F1F5F9;">Téléphone &amp; E-mail</td>
                        <td valign="top" style="padding:5px 0;color:#0F172A;border-top:1px solid #F1F5F9;">
                          ${
                            lead.phone
                              ? `<a href="tel:${escapeHtml(lead.phone)}" class="mono" style="color:#0F172A;font-weight:700;text-decoration:underline;">${escapeHtml(lead.phone)}</a>`
                              : `<span style="color:#94A3B8;">Tél. non renseigné</span>`
                          }
                          <span style="color:#CBD5E1;margin:0 6px;">|</span>
                          ${
                            lead.email
                              ? `<a href="mailto:${escapeHtml(lead.email)}" style="color:#2563EB;text-decoration:underline;">${escapeHtml(lead.email)}</a>`
                              : `<span style="color:#94A3B8;">E-mail manquant</span>`
                          }
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:5px 8px 5px 0;color:#64748B;border-top:1px solid #F1F5F9;">Implantation</td>
                        <td valign="top" style="padding:5px 0;color:#0F172A;border-top:1px solid #F1F5F9;">
                          ${escapeHtml(implantationCombined)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:5px 8px 5px 0;color:#64748B;border-top:1px solid #F1F5F9;">Dimensionnement</td>
                        <td valign="top" class="mono" style="padding:5px 0;color:#0F172A;font-weight:600;border-top:1px solid #F1F5F9;">
                          ${escapeHtml(dimensioningCombined)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:5px 8px 5px 0;color:#64748B;border-top:1px solid #F1F5F9;">Facture &amp; GRD</td>
                        <td valign="top" style="padding:5px 0;color:#0F172A;border-top:1px solid #F1F5F9;">
                          <span class="mono" style="font-weight:600;">${escapeHtml(annualBillLabel)}</span> · ${escapeHtml(grdLabel)}
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding:5px 8px 5px 0;color:#64748B;border-top:1px solid #F1F5F9;">Délai &amp; Score</td>
                        <td valign="top" style="padding:5px 0;color:#0F172A;border-top:1px solid #F1F5F9;">
                          ${escapeHtml(timeframeLabel)} · <span class="mono" style="font-weight:700;">${escapeHtml(scoreLabel)}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Primary Action CTA -->
                    <div style="margin-top:16px;padding-top:14px;border-top:1px solid #E2E8F0;">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-right:12px;">
                            <a href="${escapeHtml(adminLeadUrl)}" target="_blank" style="display:inline-block;background-color:#0F172A;color:#FFFFFF;font-size:13px;font-weight:700;text-decoration:none;padding:11px 18px;border-radius:8px;">
                              Ouvrir la fiche du lead &rarr;
                            </a>
                          </td>
                          <td>
                            <a href="${escapeHtml(adminPartnersUrl)}" target="_blank" style="font-size:12px;font-weight:600;color:#475569;text-decoration:underline;">
                              Voir les partenaires
                            </a>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Partner & Payment Details -->
          <tr>
            <td style="padding:0 28px 20px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;margin-bottom:8px;">
                      Partenaire acquéreur &amp; Détails transaction
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.55;">
                      <tr>
                        <td width="34%" style="padding:3px 8px 3px 0;color:#64748B;">Partenaire</td>
                        <td style="padding:3px 0;color:#0F172A;font-weight:700;">
                          ${escapeHtml(partner.company_name)}
                          (<a href="mailto:${escapeHtml(partner.email)}" style="color:#2563EB;font-weight:500;text-decoration:underline;">${escapeHtml(partner.email)}</a>)
                        </td>
                      </tr>
                      ${
                        partner.phone
                          ? `<tr>
                              <td style="padding:3px 8px 3px 0;color:#64748B;">Téléphone partenaire</td>
                              <td style="padding:3px 0;"><a href="tel:${escapeHtml(partner.phone)}" class="mono" style="color:#0F172A;font-weight:600;text-decoration:underline;">${escapeHtml(partner.phone)}</a></td>
                            </tr>`
                          : ""
                      }
                      ${
                        isMollie
                          ? `<tr>
                              <td style="padding:3px 8px 3px 0;color:#64748B;">Montant HTVA / TVA</td>
                              <td class="mono" style="padding:3px 0;color:#0F172A;">${escapeHtml(priceHtvaStr)} HTVA + ${escapeHtml(vatStr)} TVA (21%) = <strong>${escapeHtml(priceTtcStr)} TTC</strong></td>
                            </tr>
                            <tr>
                              <td style="padding:3px 8px 3px 0;color:#64748B;">Paiement Mollie</td>
                              <td class="mono" style="padding:3px 0;color:#0F172A;">${escapeHtml(paymentMethodLabel)} · ${escapeHtml(params.molliePaymentId || "—")}</td>
                            </tr>`
                          : `<tr>
                              <td style="padding:3px 8px 3px 0;color:#64748B;">Crédits utilisés</td>
                              <td class="mono" style="padding:3px 0;color:#0F172A;"><strong>${creditsSpent} crédits</strong>${params.creditsRemainingAfter != null ? ` (solde après achat : ${params.creditsRemainingAfter} cr.)` : ""}</td>
                            </tr>`
                      }
                      <tr>
                        <td style="padding:3px 8px 3px 0;color:#64748B;">Références</td>
                        <td class="mono" style="padding:3px 0;font-size:11px;color:#475569;">
                          Lead : ${escapeHtml(lead.id)}${params.purchaseId ? ` · Achat : ${escapeHtml(params.purchaseId)}` : ""}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            buyersList.length > 0
              ? `<!-- Current Buyers History on this Lead -->
          <tr>
            <td style="padding:0 28px 22px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;">
                <tr>
                  <td style="padding:14px 20px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748B;margin-bottom:8px;">
                      Historique des attributions sur ce lead (${takenSlots} / ${maxSlots})
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;">
                      ${buyersList
                        .map(
                          (b, idx) => `<tr>
                            <td style="padding:4px 0;color:#0F172A;${idx > 0 ? "border-top:1px solid #F1F5F9;" : ""}">
                              <span class="mono" style="color:#64748B;font-weight:700;margin-right:6px;">#${idx + 1}</span>
                              <strong>${escapeHtml(b.companyName)}</strong>
                              ${b.isTest ? `<span class="mono" style="margin-left:6px;font-size:10px;background:#FEF3C7;color:#92400E;padding:1px 5px;border-radius:4px;">TEST</span>` : ""}
                              ${b.isCurrentBuyer ? `<span class="mono" style="margin-left:6px;font-size:10px;background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;padding:1px 6px;border-radius:4px;">Nouvel achat</span>` : ""}
                            </td>
                            <td align="right" class="mono" style="padding:4px 0;color:#64748B;${idx > 0 ? "border-top:1px solid #F1F5F9;" : ""}">
                              ${escapeHtml(b.purchasedAt ? formatDateTimeBrussels(b.purchasedAt) : dateLabel)}
                            </td>
                          </tr>`
                        )
                        .join("")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="padding:14px 28px 18px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
              Aegis Solaire · Notification interne Ventes ·
              <a href="${escapeHtml(adminLeadUrl)}" style="color:#2563EB;text-decoration:underline;">Fiche lead</a> ·
              <a href="${escapeHtml(baseUrl)}/admin/finance" style="color:#2563EB;text-decoration:underline;">Finance</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    replyTo: partner.email || fromEmail,
    subject,
    text,
    html,
  })

  if (error) {
    console.error("[admin-sales-emails] Resend error (lead sale):", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export interface AdminCreditOrderEmailParams {
  mode: "mollie_paid" | "bank_transfer_pending"
  orderId?: string | null
  partner: {
    id?: string | null
    company_name: string
    email: string
    phone?: string | null
  }
  packName: string
  credits: number
  newCreditsBalance?: number | null
  priceHtva: number | string
  vatAmount?: number | string | null
  priceTtc: number | string
  paymentMethod?: string | null
  molliePaymentId?: string | null
  transferReference?: string | null
}

export async function sendAdminCreditOrderNotification(
  params: AdminCreditOrderEmailParams
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: "RESEND_API_KEY manquante" }

  const baseUrl = getBaseUrl()
  const recipients = getAdminSalesRecipients()
  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"

  const isPaid = params.mode === "mollie_paid"
  const priceHtvaStr = formatEur(params.priceHtva)
  const priceTtcStr = formatEur(params.priceTtc)
  const vatStr = params.vatAmount != null ? formatEur(params.vatAmount) : null
  const dateLabel = formatDateTimeBrussels()

  const adminFinanceUrl = `${baseUrl}/admin/finance`
  const adminPartnersUrl = `${baseUrl}/admin/partners`

  const subject = isPaid
    ? `[Aegis Solaire - Trésorerie] Recharge reçue : ${params.partner.company_name} (+${params.credits} cr. · ${priceTtcStr} TTC)`
    : `[Aegis Solaire - Commandes] Commande virement : ${params.partner.company_name} (+${params.credits} cr. · ${priceTtcStr} TTC)`

  const accentColor = isPaid ? "#059669" : "#D97706"
  const badgeBg = isPaid ? "#ECFDF5" : "#FFFBEB"
  const badgeBorder = isPaid ? "#A7F3D0" : "#FDE68A"
  const badgeColor = isPaid ? "#047857" : "#B45309"
  const badgeLabel = isPaid ? "Paiement Mollie validé" : "En attente de virement"

  const text = [
    `AEGIS SOLAIRE — ${isPaid ? "RECHARGE CRÉDITS VALIDÉE" : "NOUVELLE COMMANDE DE CRÉDITS (VIREMENT)"}`,
    `Date : ${dateLabel}`,
    ``,
    `- Entreprise : ${params.partner.company_name} (${params.partner.email})`,
    `- Pack : ${params.packName} (+${params.credits} crédits)`,
    `- Montant HTVA : ${priceHtvaStr}`,
    vatStr ? `- TVA (21%) : ${vatStr}` : null,
    `- Montant TTC : ${priceTtcStr}`,
    isPaid
      ? `- Méthode : Mollie (${params.paymentMethod || "Bancontact"}) · ID : ${params.molliePaymentId || "—"}`
      : `- Référence virement : ${params.transferReference || "—"}`,
    isPaid && params.newCreditsBalance != null
      ? `- Nouveau solde installateur : ${params.newCreditsBalance} crédits`
      : null,
    ``,
    `Finance & Commandes : ${adminFinanceUrl}`,
    `Partenaires : ${adminPartnersUrl}`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n")

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body { margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A; }
    .mono { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace !important;font-variant-numeric:tabular-nums !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:24px 12px 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:4px solid ${accentColor};border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:18px 28px;border-bottom:1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="https://www.aegissolaire.com/logo.png" alt="Aegis Solaire" width="136" height="28" style="height:28px;width:auto;display:block;" />
                  </td>
                  <td align="right" valign="middle">
                    <span class="mono" style="display:inline-block;background-color:${badgeBg};border:1px solid ${badgeBorder};color:${badgeColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:9999px;text-transform:uppercase;">
                      ${escapeHtml(badgeLabel)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p class="mono" style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.06em;">
                ${isPaid ? "Trésorerie Crédits" : "Commande Crédits"} · ${escapeHtml(dateLabel)}
              </p>
              <h1 style="margin:0 0 14px 0;font-size:20px;font-weight:800;color:#0F172A;line-height:1.3;">
                ${escapeHtml(params.partner.company_name)} — ${escapeHtml(params.packName)} (+${params.credits} cr.)
              </h1>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:18px;">
                <tr>
                  <td width="50%" style="padding:14px 16px;border-right:1px solid #E2E8F0;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:3px;">Montant TTC</div>
                    <div class="mono" style="font-size:20px;font-weight:800;color:#0F172A;">${escapeHtml(priceTtcStr)}</div>
                    <div class="mono" style="font-size:11px;color:#64748B;">${escapeHtml(priceHtvaStr)} HTVA${vatStr ? ` · TVA ${escapeHtml(vatStr)}` : ""}</div>
                  </td>
                  <td width="50%" style="padding:14px 16px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:3px;">
                      ${isPaid ? "Crédits activés" : "Crédits commandés"}
                    </div>
                    <div class="mono" style="font-size:20px;font-weight:800;color:${accentColor};">+${params.credits} cr.</div>
                    <div class="mono" style="font-size:11px;color:#64748B;">
                      ${isPaid && params.newCreditsBalance != null ? `Nouveau solde : ${params.newCreditsBalance} cr.` : `Réf : ${escapeHtml(params.transferReference || "—")}`}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.6;margin-bottom:18px;">
                <tr>
                  <td width="35%" style="padding:4px 0;color:#64748B;">Partenaire</td>
                  <td style="padding:4px 0;font-weight:700;color:#0F172A;">
                    ${escapeHtml(params.partner.company_name)} (<a href="mailto:${escapeHtml(params.partner.email)}" style="color:#2563EB;font-weight:500;text-decoration:underline;">${escapeHtml(params.partner.email)}</a>)
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#64748B;">Pack</td>
                  <td style="padding:4px 0;color:#0F172A;">${escapeHtml(params.packName)} (${params.credits} crédits)</td>
                </tr>
                ${
                  isPaid
                    ? `<tr>
                        <td style="padding:4px 0;color:#64748B;">Transaction Mollie</td>
                        <td class="mono" style="padding:4px 0;color:#0F172A;">${escapeHtml(params.paymentMethod || "Bancontact")} · ${escapeHtml(params.molliePaymentId || "—")}</td>
                      </tr>`
                    : `<tr>
                        <td style="padding:4px 0;color:#64748B;">Communication virement</td>
                        <td class="mono" style="padding:4px 0;font-weight:700;color:#0F172A;">${escapeHtml(params.transferReference || "—")}</td>
                      </tr>`
                }
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${escapeHtml(adminFinanceUrl)}" target="_blank" style="display:inline-block;background-color:#0F172A;color:#FFFFFF;font-size:13px;font-weight:700;text-decoration:none;padding:11px 18px;border-radius:8px;">
                      Ouvrir Finance &amp; Trésorerie &rarr;
                    </a>
                  </td>
                  <td>
                    <a href="${escapeHtml(adminPartnersUrl)}" target="_blank" style="font-size:12px;font-weight:600;color:#475569;text-decoration:underline;">
                      Voir les partenaires
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#64748B;">
              Aegis Solaire · Notification interne Trésorerie
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    replyTo: params.partner.email || fromEmail,
    subject,
    text,
    html,
  })

  if (error) {
    console.error("[admin-sales-emails] Resend error (credit order):", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
