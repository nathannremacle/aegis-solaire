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
import {
  escapeEmailHtml,
  renderActionBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
  type EmailSpecRow,
} from "@/lib/email-templates/installer-email-layout"
import { getPrimaryLeadImage } from "@/lib/lead-images"

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
  const roofImageUrl = normalizeImageUrl(getPrimaryLeadImage(qualMeta), baseUrl)

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
  const modeAccentColor = isMollie ? "#1d5d45" : "#305a76"

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

  const leadRefCode = lead.id.slice(0, 8).toUpperCase()
  const slotTone = remainingSlots === 0 ? "danger" : remainingSlots === 1 ? "warning" : "success"

  const leadRowsHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
      <tr>
        <th scope="row" style="width: 40%; padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Prospect</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">
          ${escapeEmailHtml(leadHeadlineName)}${lead.company_vat ? ` · TVA ${escapeEmailHtml(lead.company_vat)}` : ""}
        </td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Localité</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">
          ${escapeEmailHtml(fullLocality)}${googleMapsUrl ? ` · <a href="${escapeEmailHtml(googleMapsUrl)}" target="_blank" style="color: #194767; text-decoration: underline; font-weight: normal;">Maps &rarr;</a>` : ""}
        </td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Contact</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">
          ${lead.phone ? `<a href="tel:${escapeEmailHtml(lead.phone)}" style="color: #142d42; text-decoration: underline;">${escapeEmailHtml(lead.phone)}</a>` : "—"}
          &nbsp;&middot;&nbsp;
          ${lead.email ? `<a href="mailto:${escapeEmailHtml(lead.email)}" style="color: #194767; text-decoration: underline; font-weight: normal;">${escapeEmailHtml(lead.email)}</a>` : "—"}
        </td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Implantation</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">${escapeEmailHtml(implantationCombined)}</td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Dimensionnement</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">${escapeEmailHtml(dimensioningCombined)}</td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Facture &amp; GRD</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">${escapeEmailHtml(annualBillLabel)} · ${escapeEmailHtml(grdLabel)}</td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 0; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Délai &amp; Score</th>
        <td style="padding: 6px 0; border-bottom: 0; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">${escapeEmailHtml(timeframeLabel)} · ${escapeEmailHtml(scoreLabel)}</td>
      </tr>
    </table>
  `

  const partnerRows: EmailSpecRow[] = [
    { label: "Partenaire", value: `${partner.company_name} (${partner.email})` },
    ...(partner.phone ? [{ label: "Téléphone partenaire", value: partner.phone }] : []),
    ...(isMollie
      ? [
          { label: "Montant", value: `${priceHtvaStr} HTVA + ${vatStr} TVA = ${priceTtcStr} TTC` },
          { label: "Paiement Mollie", value: `${paymentMethodLabel} · ${params.molliePaymentId || "—"}` },
        ]
      : [
          {
            label: "Crédits débités",
            value: `${creditsSpent} crédits${params.creditsRemainingAfter != null ? ` (solde : ${params.creditsRemainingAfter} cr.)` : ""}`,
          },
        ]),
    {
      label: "Références",
      value: `Lead #${leadRefCode}${params.purchaseId ? ` · Achat ${params.purchaseId.slice(0, 8)}` : ""}`,
    },
  ]

  const buyersHtml =
    buyersList.length > 0
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding-top: 14px; border-top: 1px solid #e4edf1;">
              <h2 style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.25; font-weight: bold; color: #142d42;">
                Acquéreurs sur ce dossier (${takenSlots}/${maxSlots})
              </h2>
              ${renderSpecsTable(
                buyersList.map((b, idx) => ({
                  label: `#${idx + 1} · ${b.companyName}${b.isTest ? " [TEST]" : ""}${b.isCurrentBuyer ? " (nouvel achat)" : ""}`,
                  value: b.purchasedAt ? formatDateTimeBrussels(b.purchasedAt) : dateLabel,
                }))
              )}
            </td>
          </tr>
        </table>`
      : ""

  const bodyHtml = `
    ${renderFiguresBox(
      {
        label: isMollie ? "Encaissement" : "Crédits débités",
        value: heroValueText,
        sublabel: heroSubText,
      },
      {
        label: "Places restantes",
        value: `${remainingSlots} / ${maxSlots} restante${remainingSlots > 1 ? "s" : ""}`,
        sublabel: `${takenSlots}/${maxSlots} prise${takenSlots > 1 ? "s" : ""} · ${cityPostalLine || loc.city}`,
      }
    )}

    ${renderActionBox({
      kicker: modeBadgeText,
      title: `${partner.company_name} → ${leadFullName}`,
      subtext: `${cityPostalLine || loc.city} · ${provinceLabel}`,
      ctaLabel: "Ouvrir la fiche du lead →",
      ctaUrl: adminLeadUrl,
      secondaryLabel: "Voir les partenaires",
      secondaryUrl: adminPartnersUrl,
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Dossier Lead (${escapeEmailHtml(lead.segment || "B2C")})
          </h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              ${
                roofImageUrl
                  ? `<td class="photo-cell" width="40%" style="width: 40%; padding-right: 15px; vertical-align: top;">
                      <img src="${escapeEmailHtml(roofImageUrl)}" alt="Photo du lead" width="220" style="display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 7px; border: 1px solid #e2eaf0;" />
                      <p style="margin: 4px 0 0 0; font-size: 12px; color: #4d6374;">Photo du bâtiment</p>
                    </td>`
                  : ""
              }
              <td class="spec-cell" style="vertical-align: top;">
                ${leadRowsHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 18px; width: 100%; background-color: #f0f5f8; border: 1px solid #e2eaf0; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td style="padding: 12px 15px;">
          <h2 style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Partenaire acquéreur &amp; transaction
          </h2>
          ${renderSpecsTable(partnerRows)}
        </td>
      </tr>
    </table>

    ${buyersHtml}
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `${leadHeadlineName} · ${fullLocality} · ${slotStatusLabel} · Partenaire : ${partner.company_name}`,
    reference: `Dossier #${leadRefCode}`,
    context: `Vente Lead · ${lead.segment || "B2C"} · ${dateLabel}`,
    contextColor: modeAccentColor,
    headline: `${partner.company_name} → ${leadFullName}`,
    subtitle: `${fullLocality} · ${modeBadgeText}`,
    statusPill: { text: slotStatusLabel, tone: slotTone },
    bodyHtml,
    logoHref: adminLeadUrl,
    footerLinks: [
      { label: "Fiche lead", href: adminLeadUrl },
      { label: "Finance & Trésorerie", href: `${baseUrl}/admin/finance` },
      { label: "Partenaires", href: adminPartnersUrl },
    ],
    footerLegalText: "Aegis Solaire · Notification interne Ventes",
  })

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

  const accentColor = isPaid ? "#1d5d45" : "#89610e"
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

  const orderSpecRows: EmailSpecRow[] = [
    { label: "Partenaire", value: `${params.partner.company_name} (${params.partner.email})` },
    { label: "Pack", value: `${params.packName} (${params.credits} crédits)` },
    isPaid
      ? {
          label: "Transaction Mollie",
          value: `${params.paymentMethod || "Bancontact"} · ${params.molliePaymentId || "—"}`,
        }
      : {
          label: "Communication virement",
          value: params.transferReference || "—",
        },
  ]

  const html = renderInstallerEmailShell({
    subject,
    preheader: `${params.partner.company_name} · ${params.packName} (+${params.credits} cr.) · ${priceTtcStr} TTC.`,
    reference: params.transferReference || (params.orderId ? `#${params.orderId.slice(0, 8).toUpperCase()}` : "Trésorerie"),
    context: `${isPaid ? "Trésorerie Crédits" : "Commande Crédits"} · ${dateLabel}`,
    contextColor: accentColor,
    headline: `${params.partner.company_name} — +${params.credits} cr.`,
    subtitle: `${params.packName} · ${priceTtcStr} TTC`,
    statusPill: { text: badgeLabel, tone: isPaid ? "success" : "warning" },
    logoHref: adminFinanceUrl,
    bodyHtml: `
      ${renderFiguresBox(
        {
          label: "Montant TTC",
          value: priceTtcStr,
          sublabel: `${priceHtvaStr} HTVA${vatStr ? ` · TVA ${vatStr}` : ""}`,
        },
        {
          label: isPaid ? "Crédits activés" : "Crédits commandés",
          value: `+${params.credits} cr.`,
          sublabel:
            isPaid && params.newCreditsBalance != null
              ? `Nouveau solde · ${params.newCreditsBalance} cr.`
              : `Réf · ${params.transferReference || "—"}`,
        }
      )}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding-top: 14px; border-top: 1px solid #e4edf1;">
            ${renderSpecsTable(orderSpecRows)}
          </td>
        </tr>
      </table>

      ${renderActionBox({
        kicker: isPaid ? "Comptabilisé automatiquement" : "Validation manuelle requise à réception",
        title: `${params.packName} · ${priceTtcStr}`,
        subtext: isPaid ? "Crédits disponibles immédiatement pour le partenaire." : "Validez dès réception du virement.",
        ctaLabel: "Ouvrir Finance & Trésorerie →",
        ctaUrl: adminFinanceUrl,
        secondaryLabel: "Voir les partenaires",
        secondaryUrl: adminPartnersUrl,
      })}
    `,
    footerLinks: [
      { label: "Finance & Trésorerie", href: adminFinanceUrl },
      { label: "Partenaires", href: adminPartnersUrl },
    ],
    footerLegalText: "Aegis Solaire · Notification interne Trésorerie",
  })

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
