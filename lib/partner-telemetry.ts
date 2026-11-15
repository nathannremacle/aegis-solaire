import { cache } from "react"
import { unstable_cache, revalidateTag } from "next/cache"
import { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { buildPartnerExpressLeadUrls } from "@/lib/partner-notification-tokens"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { calculateLeadDirectFinancials, formatEurWithDecimals } from "@/lib/credit-pricing"

export type PartnerTelemetryEventType =
  | "session_start"
  | "email_deep_link"
  | "lead_inspect_open"
  | "lead_inspect_duration"
  | "roof_photo_zoom"
  | "unlock_intent"
  | "credit_modal_open"
  | "marketplace_filter"
  | "crm_tab_open"

export const VALID_PARTNER_TELEMETRY_EVENTS: PartnerTelemetryEventType[] = [
  "session_start",
  "email_deep_link",
  "lead_inspect_open",
  "lead_inspect_duration",
  "roof_photo_zoom",
  "unlock_intent",
  "credit_modal_open",
  "marketplace_filter",
  "crm_tab_open",
]

export interface RecordPartnerTelemetryInput {
  partnerId?: string | null
  partnerEmail: string
  partnerName: string
  leadId?: string | null
  leadRef?: string | null
  sessionId: string
  eventType: PartnerTelemetryEventType
  durationMs?: number
  source?: string
  metadata?: Record<string, unknown>
}

export interface PartnerActivityEventRecord {
  id: string
  partnerId: string | null
  partnerEmail: string
  partnerName: string
  isTest: boolean
  leadId: string | null
  leadRef: string | null
  leadLabel: string | null
  leadSegment: string | null
  leadProvince: string | null
  leadCreditCost: number | null
  leadMarketplaceStatus: string | null
  sessionId: string
  eventType: PartnerTelemetryEventType
  durationMs: number
  source: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface PartnerLeadViewDetail {
  leadId: string
  leadLabel: string
  segment: string | null
  province: string | null
  creditCost: number | null
  marketplaceStatus: string | null
  viewsCount: number
  totalDurationMs: number
  zoomedPhoto: boolean
  unlockIntent: boolean
  hasPurchased: boolean
  lastViewedAt: string
  lastSource: string
}

export interface PartnerEngagementSummary {
  partnerId: string
  companyName: string
  email: string
  isTest: boolean
  credits: number
  sessionsCount: number
  leadsInspectedCount: number
  uniqueLeadsIds: string[]
  totalViewsCount: number
  totalDurationMs: number
  avgDurationMs: number
  unlockIntentsCount: number
  roofZoomsCount: number
  creditModalOpensCount: number
  lastActivityAt: string | null
  hotLeadSignals: number
  recentLeads: PartnerLeadViewDetail[]
  recentEvents: PartnerActivityEventRecord[]
}

export interface LeadViewerDetail {
  partnerId: string
  companyName: string
  email: string
  isTest: boolean
  credits: number
  viewsCount: number
  totalDurationMs: number
  zoomedPhoto: boolean
  unlockIntent: boolean
  hasPurchased: boolean
  lastViewedAt: string
  lastSource: string
}

export interface LeadEngagementSummary {
  leadId: string
  leadLabel: string
  segment: string | null
  province: string | null
  creditCost: number | null
  marketplaceStatus: string | null
  totalViews: number
  uniquePartnersCount: number
  totalDurationMs: number
  avgDurationMs: number
  unlockIntentsCount: number
  roofZoomsCount: number
  purchasesCount: number
  viewers: LeadViewerDetail[]
}

export interface HotIntentSignal {
  id: string
  partnerId: string
  companyName: string
  partnerEmail: string
  partnerCredits: number
  leadId: string
  leadLabel: string
  segment: string | null
  province: string | null
  creditCost: number
  viewsCount: number
  totalDurationMs: number
  zoomedPhoto: boolean
  unlockIntent: boolean
  intentMethod: string | null
  heatScore: number
  lastActivityAt: string
  reason: string
}

export interface PartnerTelemetryAnalytics {
  generatedAt: string
  storageBackend: "partner_activity_events" | "audit_log_fallback" | "hybrid"
  kpis: {
    activePartnersCount: number
    totalLeadViews: number
    uniqueLeadsViewed: number
    totalStudyDurationMs: number
    avgStudyDurationMs: number
    unlockIntentsCount: number
    hotSignalsCount: number
  }
  byPartner: Record<string, PartnerEngagementSummary>
  byLead: Record<string, LeadEngagementSummary>
  hotSignals: HotIntentSignal[]
  topViewedLeads: LeadEngagementSummary[]
  recentEvents: PartnerActivityEventRecord[]
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim())
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const msg = (error.message || "").toLowerCase()
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("partner_activity_events") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  )
}

function isTestPartnerIdentity(partner?: {
  is_test?: boolean | null
  company_name?: string | null
  email?: string | null
}): boolean {
  if (!partner) return false
  if (partner.is_test) return true
  const email = (partner.email || "").toLowerCase().trim()
  const name = (partner.company_name || "").toLowerCase().trim()
  if (
    email === "mrnathanrem@gmail.com" ||
    email === "fabrice.remacle@gmail.com" ||
    email.includes("@aegissolaire-pro.be") ||
    email.includes("+test") ||
    email.startsWith("test@") ||
    email.endsWith("@test.com")
  ) {
    return true
  }
  if (
    name.includes("dev test") ||
    name.includes("mega solar") ||
    name.includes("sogreen") ||
    name.includes("enersol") ||
    name.includes("high tech") ||
    name.includes("solena") ||
    name.includes("belga solar") ||
    name.includes("aitex")
  ) {
    return true
  }
  return false
}

function formatLeadLabel(lead?: {
  id?: string
  city?: string | null
  postal_code?: string | null
  province?: string | null
  segment?: string | null
} | null, fallbackRef?: string | null): string {
  if (!lead) return fallbackRef || "Dossier Solaire"
  const city = lead.city?.trim()
  const postal = lead.postal_code?.trim()
  const segment = lead.segment?.trim()
  const loc = [postal, city].filter(Boolean).join(" ") || lead.province || "Wallonie"
  return segment ? `${segment} · ${loc}` : loc
}

export function formatDurationCompact(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  if (totalSeconds < 60) return `${totalSeconds} s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return `${hours}h ${String(remMinutes).padStart(2, "0")}m`
}

const HOT_INTENT_ALERT_COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 heures
const hotIntentAlertCooldownMap = new Map<string, number>()

function escapeHtmlTelemetry(s: string | null | undefined): string {
  if (!s) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatBelgianWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  let digits = trimmed.replace(/[^\d+]/g, "")
  if (digits.startsWith("+")) {
    digits = digits.slice(1)
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2)
  } else if (digits.startsWith("0")) {
    digits = `32${digits.slice(1)}`
  }
  digits = digits.replace(/\D/g, "")
  if (digits.length < 9) return null
  return digits
}

function getHotIntentCategory(
  eventType: PartnerTelemetryEventType,
  durationMs: number
): "unlock_intent" | "credit_modal_open" | "deep_inspection" | null {
  if (eventType === "unlock_intent") return "unlock_intent"
  if (eventType === "credit_modal_open") return "credit_modal_open"
  if (eventType === "lead_inspect_duration" && durationMs >= 30000) return "deep_inspection"
  return null
}

/**
 * Alerte Admin Temps Réel « Sniper Sales » sur signaux d'achat chauds installateurs.
 * Envoie un e-mail avec bouton d'appel direct et lien WhatsApp pré-rempli 1-clic.
 * Strictement non-bloquant.
 */
async function maybeNotifyAdminHotPartnerIntent(params: {
  supabase: ReturnType<typeof createServiceRoleClient>
  partnerId: string | null
  partnerEmail: string
  partnerName: string
  leadId: string | null
  eventType: PartnerTelemetryEventType
  durationMs: number
  source: string
  metadata: Record<string, unknown>
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

  const eventCategory = getHotIntentCategory(params.eventType, params.durationMs)
  if (!eventCategory) return

  if (
    isTestPartnerIdentity({
      email: params.partnerEmail,
      company_name: params.partnerName,
    })
  ) {
    return
  }

  const now = Date.now()
  const cooldownKey = `${params.partnerId || params.partnerEmail.toLowerCase().trim()}:${params.leadId || "global"}:${eventCategory}`
  const lastSentAt = hotIntentAlertCooldownMap.get(cooldownKey)
  if (lastSentAt && now - lastSentAt < HOT_INTENT_ALERT_COOLDOWN_MS) {
    return
  }

  // Charger les coordonnées exactes du partenaire
  let partnerRow: {
    id: string
    company_name: string | null
    email: string | null
    phone: string | null
    credits: number | null
    is_test: boolean | null
  } | null = null

  if (params.partnerId) {
    const { data } = await params.supabase
      .from("partners")
      .select("id, company_name, email, phone, credits, is_test")
      .eq("id", params.partnerId)
      .maybeSingle()
    partnerRow = data
  } else if (params.partnerEmail) {
    const { data } = await params.supabase
      .from("partners")
      .select("id, company_name, email, phone, credits, is_test")
      .eq("email", params.partnerEmail.toLowerCase().trim())
      .maybeSingle()
    partnerRow = data
  }

  if (!partnerRow || isTestPartnerIdentity(partnerRow)) {
    return
  }

  // Charger les détails du lead ciblé et vérifier s'il n'est pas déjà acheté
  let leadRow: {
    id: string
    segment: string | null
    province: string | null
    city: string | null
    postal_code: string | null
    estimated_power_kwc: number | null
    credit_cost: number | null
    marketplace_status: string | null
  } | null = null

  if (params.leadId) {
    const [{ data: fetchedLead }, { data: existingPurchase }] = await Promise.all([
      params.supabase
        .from("leads")
        .select("id, segment, province, city, postal_code, estimated_power_kwc, credit_cost, marketplace_status")
        .eq("id", params.leadId)
        .maybeSingle(),
      params.supabase
        .from("lead_purchases")
        .select("id")
        .eq("lead_id", params.leadId)
        .eq("partner_id", partnerRow.id)
        .maybeSingle(),
    ])

    if (existingPurchase?.id) {
      return
    }
    leadRow = fetchedLead
  }

  // Purge légère si le cache mémoire grossit
  if (hotIntentAlertCooldownMap.size > 500) {
    for (const [k, ts] of hotIntentAlertCooldownMap.entries()) {
      if (now - ts >= HOT_INTENT_ALERT_COOLDOWN_MS) {
        hotIntentAlertCooldownMap.delete(k)
      }
    }
  }
  hotIntentAlertCooldownMap.set(cooldownKey, now)

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
  const partnerEmail = (partnerRow.email || params.partnerEmail).trim()
  const partnerCompany = (partnerRow.company_name || params.partnerName || partnerEmail).trim()
  const partnerCredits = Number(partnerRow.credits) || 0
  const partnerPhone = partnerRow.phone?.trim() || null

  const expressUrls = buildPartnerExpressLeadUrls(
    baseUrl,
    partnerRow.id,
    leadRow?.id || params.leadId || null,
    partnerEmail
  )

  const leadLocation = leadRow
    ? [leadRow.postal_code, leadRow.city].filter(Boolean).join(" ") ||
      getProvinceDisplayLabel(leadRow.province || "wallonie")
    : null
  const powerLabel = leadRow?.estimated_power_kwc ? `~${leadRow.estimated_power_kwc} kWc` : null
  const directFinancials = leadRow
    ? calculateLeadDirectFinancials({ segment: leadRow.segment, credit_cost: leadRow.credit_cost })
    : null

  const signalLabel =
    eventCategory === "unlock_intent"
      ? "Intention de déblocage / paiement détectée"
      : eventCategory === "credit_modal_open"
      ? "Ouverture de la fenêtre de crédits sans achat finalisé"
      : `Inspection approfondie du dossier (${formatDurationCompact(params.durationMs)})`

  const waMessage = leadRow
    ? `Bonjour ${partnerCompany}, ici La Cellule Technique Aegis Solaire. Nous avons vu que vous venez de consulter le chantier solaire ${leadRow.segment || "B2C"} à ${leadLocation}${powerLabel ? ` (${powerLabel})` : ""}. Le propriétaire est vérifié et disponible. Pour gagner du temps, vous pouvez débloquer ses coordonnées directement sans mot de passe via Bancontact ici (${directFinancials ? formatEurWithDecimals(directFinancials.priceHtva) : ""}) : ${expressUrls.directCheckoutLeadUrl}`
    : `Bonjour ${partnerCompany}, ici La Cellule Technique Aegis Solaire. Nous avons vu votre passage sur le portail partenaire. Pour rappel, vous pouvez débloquer nos dossiers vérifiés directement à l'unité par Bancontact sans pack obligatoire : ${expressUrls.dashboardUrl}`

  const waPhone = formatBelgianWhatsAppNumber(partnerPhone)
  const waHref = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`
    : null
  const telHref = partnerPhone ? `tel:${partnerPhone.replace(/\s+/g, "")}` : null
  const adminLeadUrl = leadRow
    ? `${baseUrl}/admin/leads?leadId=${encodeURIComponent(leadRow.id)}`
    : `${baseUrl}/admin/partners`

  const adminEmail =
    process.env.ADMIN_ALERT_EMAIL?.split(",")[0]?.trim() ||
    process.env.ADMIN_ALERT_EMAILS?.split(",")[0]?.trim() ||
    "contact@aegissolaire.com"
  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"

  const subject = leadRow
    ? `[Sniper Sales] Signal chaud : ${partnerCompany} sur ${leadRow.segment || "PV"} ${leadLocation}`
    : `[Sniper Sales] Signal chaud : ${partnerCompany} (${signalLabel})`

  const text = `SIGNAL CHAUD INSTALLATEUR — AEGIS TÉLÉMÉTRIE

Installateur : ${partnerCompany}
Email : ${partnerEmail}
Téléphone : ${partnerPhone || "Non renseigné"}
Solde actuel : ${partnerCredits} crédits
Signal : ${signalLabel} (source : ${params.source})
${leadRow ? `\nDossier ciblé : ${leadRow.segment || "PV"} · ${leadLocation}${powerLabel ? ` · ${powerLabel}` : ""} (#${leadRow.id.slice(0, 8)})\nCoût direct : ${directFinancials ? formatEurWithDecimals(directFinancials.priceHtva) : "—"} (${directFinancials?.credits || "—"} crédits)` : ""}

Lien direct Bancontact pré-authentifié de l'installateur :
${expressUrls.directCheckoutLeadUrl}

Message WhatsApp prêt à envoyer :
${waMessage}
${waHref ? `\nOuvrir WhatsApp 1-clic : ${waHref}` : ""}
`.trim()

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><title>${escapeHtmlTelemetry(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:4px solid #DC2626;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;">
        <p style="margin:0 0 6px 0;font-family:monospace;font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;letter-spacing:0.06em;">
          Alerte Sniper Sales · Temps Réel
        </p>
        <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:800;color:#0F172A;line-height:1.3;">
          ${escapeHtmlTelemetry(partnerCompany)} montre une forte intention d'achat
        </h1>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:20px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;line-height:1.6;">
              <div><strong>Signal :</strong> <span style="color:#DC2626;font-weight:700;">${escapeHtmlTelemetry(signalLabel)}</span></div>
              <div><strong>Installateur :</strong> ${escapeHtmlTelemetry(partnerCompany)} (${escapeHtmlTelemetry(partnerEmail)})</div>
              <div><strong>Téléphone :</strong> <strong style="font-family:monospace;">${escapeHtmlTelemetry(partnerPhone || "Non renseigné")}</strong></div>
              <div><strong>Solde crédits :</strong> <span style="font-family:monospace;">${partnerCredits} cr.</span></div>
              ${leadRow ? `<div><strong>Dossier consulté :</strong> ${escapeHtmlTelemetry(leadRow.segment || "PV")} &middot; ${escapeHtmlTelemetry(leadLocation)}${powerLabel ? ` &middot; ${escapeHtmlTelemetry(powerLabel)}` : ""} (#${leadRow.id.slice(0, 8)})</div>` : ""}
              ${directFinancials ? `<div><strong>Tarif dossier :</strong> <span style="font-family:monospace;">${directFinancials.credits} cr. / ${formatEurWithDecimals(directFinancials.priceHtva)}</span></div>` : ""}
            </td>
          </tr>
        </table>

        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
          <tr>
            ${telHref ? `
            <td style="padding-right:10px;padding-bottom:8px;">
              <a href="${escapeHtmlTelemetry(telHref)}" style="display:inline-block;background-color:#0F172A;color:#FFFFFF;font-size:13px;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px;">
                Appeler l'installateur (${escapeHtmlTelemetry(partnerPhone)})
              </a>
            </td>` : ""}
            ${waHref ? `
            <td style="padding-bottom:8px;">
              <a href="${escapeHtmlTelemetry(waHref)}" target="_blank" style="display:inline-block;background-color:#059669;color:#FFFFFF;font-size:13px;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px;">
                Envoyer le WhatsApp pré-rempli en 1 clic &rarr;
              </a>
            </td>` : ""}
          </tr>
        </table>

        <div style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px 16px;margin-bottom:18px;">
          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#1D4ED8;text-transform:uppercase;font-family:monospace;">
            Message prêt à copier / envoyer :
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#1E293B;">
            ${escapeHtmlTelemetry(waMessage)}
          </p>
        </div>

        <p style="margin:0;font-size:12px;color:#64748B;">
          <a href="${escapeHtmlTelemetry(adminLeadUrl)}" style="color:#2563EB;text-decoration:underline;">Ouvrir le dossier dans l'admin</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    replyTo: partnerEmail,
    subject,
    text,
    html,
  })

  if (error) {
    console.error("[partner-telemetry] Sniper Sales Resend error:", error)
  }
}

/**
 * Enregistre un événement de télémétrie partenaire avec persistance hybride zéro-panne
 * (table dédiée `partner_activity_events`, puis fallback automatique `audit_log` si migration en attente).
 * Synchronise également `lead_relance_dispatches.clicked_at` lors d'une interaction sur un lead.
 */
export async function recordPartnerActivityEvent(
  input: RecordPartnerTelemetryInput
): Promise<{ ok: boolean; backend: "partner_activity_events" | "audit_log_fallback" }> {
  const supabase = createServiceRoleClient()
  const cleanDurationMs = Math.min(1800000, Math.max(0, Math.round(Number(input.durationMs) || 0)))
  const validPartnerId = isValidUuid(input.partnerId) ? input.partnerId : null
  const validLeadId = isValidUuid(input.leadId) ? input.leadId : null
  const leadRef = input.leadRef || (input.leadId ? String(input.leadId).slice(0, 64) : null)
  const source = (input.source || "marketplace").slice(0, 64)
  const sessionId = (input.sessionId || "session").slice(0, 80)
  const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {}
  const nowIso = new Date().toISOString()

  let backendUsed: "partner_activity_events" | "audit_log_fallback" = "partner_activity_events"

  const { error: insertError } = await supabase.from("partner_activity_events").insert({
    partner_id: validPartnerId,
    partner_email: input.partnerEmail.slice(0, 180),
    partner_name: input.partnerName.slice(0, 180),
    lead_id: validLeadId,
    lead_ref: leadRef,
    session_id: sessionId,
    event_type: input.eventType,
    duration_ms: cleanDurationMs,
    source,
    metadata,
    created_at: nowIso,
  })

  if (insertError) {
    if (!isMissingTableError(insertError)) {
      console.warn("[partner-telemetry] insert error, attempting audit_log fallback:", insertError.message)
    }
    backendUsed = "audit_log_fallback"

    await supabase.from("audit_log").insert({
      admin_email: input.partnerEmail.slice(0, 180),
      action: input.eventType,
      entity_type: "partner_telemetry",
      entity_id: validLeadId || validPartnerId || null,
      details: {
        partner_id: validPartnerId || input.partnerId || null,
        partner_email: input.partnerEmail.slice(0, 180),
        partner_name: input.partnerName.slice(0, 180),
        lead_id: validLeadId || input.leadId || null,
        lead_ref: leadRef,
        session_id: sessionId,
        event_type: input.eventType,
        duration_ms: cleanDurationMs,
        source,
        metadata,
      },
      created_at: nowIso,
    })
  }

  // Synchronisation automatique du tracking des relances e-mail si le partenaire interagit avec le lead
  if (
    validPartnerId &&
    validLeadId &&
    (input.eventType === "email_deep_link" ||
      input.eventType === "lead_inspect_open" ||
      input.eventType === "unlock_intent")
  ) {
    try {
      const { data: openDispatches } = await supabase
        .from("lead_relance_dispatches")
        .select("id, opened_at, clicked_at")
        .eq("lead_id", validLeadId)
        .eq("partner_id", validPartnerId)
        .is("clicked_at", null)

      if (openDispatches && openDispatches.length > 0) {
        for (const dispatch of openDispatches) {
          await supabase
            .from("lead_relance_dispatches")
            .update({
              clicked_at: nowIso,
              opened_at: dispatch.opened_at || nowIso,
            })
            .eq("id", dispatch.id)
        }
      }
    } catch {
      // Non bloquant si la table lead_relance_dispatches est absente
    }
  }

  if (
    input.eventType === "unlock_intent" ||
    input.eventType === "lead_inspect_duration" ||
    input.eventType === "roof_photo_zoom"
  ) {
    try {
      revalidateTag("admin-telemetry", "max")
    } catch {
      // Non bloquant hors contexte requête Next.js
    }
  }

  if (
    input.eventType === "unlock_intent" ||
    input.eventType === "credit_modal_open" ||
    (input.eventType === "lead_inspect_duration" && cleanDurationMs >= 30000)
  ) {
    try {
      await maybeNotifyAdminHotPartnerIntent({
        supabase,
        partnerId: validPartnerId,
        partnerEmail: input.partnerEmail,
        partnerName: input.partnerName,
        leadId: validLeadId,
        eventType: input.eventType,
        durationMs: cleanDurationMs,
        source,
        metadata,
      })
    } catch (alertErr) {
      console.warn("[partner-telemetry] Sniper Sales alert non-blocking error:", alertErr)
    }
  }

  return { ok: true, backend: backendUsed }
}

/**
 * Agrège toute la télémétrie comportementale installateurs pour le cockpit Admin,
 * la fiche /admin/partners et le tiroir d'inspection des leads.
 */
export async function getPartnerTelemetryAnalytics(options?: {
  partnerId?: string
  leadId?: string
  days?: number
  includeTest?: boolean
}): Promise<PartnerTelemetryAnalytics> {
  const supabase = createServiceRoleClient()
  const days = Math.min(365, Math.max(1, options?.days ?? 30))
  const includeTest = options?.includeTest ?? false
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const validPartnerIdFilter = options?.partnerId && isValidUuid(options.partnerId) ? options.partnerId.trim() : null
  const validLeadIdFilter = options?.leadId && isValidUuid(options.leadId) ? options.leadId.trim() : null

  type TelemetryBundlePayload = {
    events?: any[]
    audit_events?: any[]
    partners?: any[]
    leads?: any[]
    purchases?: any[]
  }

  let tableRes: { data: any[] | null; error: { code?: string; message?: string } | null } = {
    data: null,
    error: null,
  }
  let auditRes: { data: any[] | null; error: { code?: string; message?: string } | null } = {
    data: null,
    error: null,
  }
  let partnersRes: { data: any[] | null } = { data: [] }
  let leadsRes: { data: any[] | null } = { data: [] }
  let purchasesRes: { data: any[] | null } = { data: [] }

  let usedBundleRpc = false
  try {
    const rpcRes = await supabase.rpc("get_partner_telemetry_bundle", {
      p_since: sinceIso,
      p_partner_id: validPartnerIdFilter,
      p_lead_id: validLeadIdFilter,
    })

    if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === "object") {
      const bundle = rpcRes.data as TelemetryBundlePayload
      tableRes = { data: Array.isArray(bundle.events) ? bundle.events : [], error: null }
      auditRes = { data: Array.isArray(bundle.audit_events) ? bundle.audit_events : [], error: null }
      partnersRes = { data: Array.isArray(bundle.partners) ? bundle.partners : [] }
      leadsRes = { data: Array.isArray(bundle.leads) ? bundle.leads : [] }
      purchasesRes = { data: Array.isArray(bundle.purchases) ? bundle.purchases : [] }
      usedBundleRpc = true
    }
  } catch {
    // Fallback automatique si la RPC n'est pas encore déployée
  }

  if (!usedBundleRpc) {
    let tableQuery = supabase
      .from("partner_activity_events")
      .select("id, partner_id, partner_email, partner_name, lead_id, lead_ref, session_id, event_type, duration_ms, source, metadata, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(2000)

    if (validPartnerIdFilter) {
      tableQuery = tableQuery.eq("partner_id", validPartnerIdFilter)
    }
    if (validLeadIdFilter) {
      tableQuery = tableQuery.eq("lead_id", validLeadIdFilter)
    }

    const auditQuery = supabase
      .from("audit_log")
      .select("id, admin_email, action, entity_type, entity_id, details, created_at")
      .eq("entity_type", "partner_telemetry")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(2000)

    const [fallbackTableRes, fallbackAuditRes, fallbackPartnersRes] = await Promise.all([
      tableQuery,
      auditQuery,
      supabase
        .from("partners")
        .select("id, company_name, email, credits, is_test, segment"),
    ])

    tableRes = fallbackTableRes
    auditRes = fallbackAuditRes
    partnersRes = fallbackPartnersRes

    const leadIdSet = new Set<string>()
    for (const row of fallbackTableRes.data ?? []) {
      if (isValidUuid(row.lead_id)) {
        leadIdSet.add(row.lead_id.trim())
      }
    }
    for (const row of fallbackAuditRes.data ?? []) {
      if (isValidUuid(row.entity_id)) {
        leadIdSet.add(row.entity_id.trim())
      }
      const details = row.details as Record<string, unknown> | null
      if (details && typeof details.lead_id === "string" && isValidUuid(details.lead_id)) {
        leadIdSet.add(details.lead_id.trim())
      }
    }

    const distinctLeadIds = Array.from(leadIdSet)
    if (distinctLeadIds.length > 0) {
      const [fallbackLeadsRes, fallbackPurchasesRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, segment, province, city, postal_code, credit_cost, marketplace_status, estimated_power_kwc")
          .in("id", distinctLeadIds),
        supabase
          .from("lead_purchases")
          .select("lead_id, partner_id, purchased_at")
          .in("lead_id", distinctLeadIds),
      ])
      leadsRes = fallbackLeadsRes
      purchasesRes = fallbackPurchasesRes
    }
  }

  const partnerMap = new Map<
    string,
    { id: string; company_name: string; email: string; credits: number; is_test: boolean }
  >()
  const partnerByEmailMap = new Map<
    string,
    { id: string; company_name: string; email: string; credits: number; is_test: boolean }
  >()

  for (const p of partnersRes.data ?? []) {
    const normalized = {
      id: p.id,
      company_name: p.company_name || "Installateur",
      email: (p.email || "").toLowerCase().trim(),
      credits: Number(p.credits) || 0,
      is_test: isTestPartnerIdentity(p),
    }
    partnerMap.set(p.id, normalized)
    if (normalized.email) partnerByEmailMap.set(normalized.email, normalized)
  }

  const leadMap = new Map<
    string,
    {
      id: string
      segment: string | null
      province: string | null
      city: string | null
      postal_code: string | null
      credit_cost: number | null
      marketplace_status: string | null
    }
  >()
  for (const l of leadsRes.data ?? []) {
    leadMap.set(l.id, l)
  }

  const purchaseSet = new Set<string>()
  const purchasesCountByLead = new Map<string, number>()
  for (const lp of purchasesRes.data ?? []) {
    const pInfo = partnerMap.get(lp.partner_id)
    if (pInfo?.is_test && !includeTest) continue
    purchaseSet.add(`${lp.lead_id}::${lp.partner_id}`)
    purchasesCountByLead.set(lp.lead_id, (purchasesCountByLead.get(lp.lead_id) ?? 0) + 1)
  }

  const tableAvailable = !tableRes.error || !isMissingTableError(tableRes.error)
  const rawEvents: Array<{
    id: string
    partnerId: string | null
    partnerEmail: string
    partnerName: string
    leadId: string | null
    leadRef: string | null
    sessionId: string
    eventType: PartnerTelemetryEventType
    durationMs: number
    source: string
    metadata: Record<string, unknown>
    createdAt: string
  }> = []

  if (tableAvailable && !tableRes.error && tableRes.data) {
    for (const row of tableRes.data) {
      rawEvents.push({
        id: row.id,
        partnerId: row.partner_id,
        partnerEmail: row.partner_email,
        partnerName: row.partner_name,
        leadId: row.lead_id,
        leadRef: row.lead_ref,
        sessionId: row.session_id,
        eventType: row.event_type as PartnerTelemetryEventType,
        durationMs: Number(row.duration_ms) || 0,
        source: row.source || "marketplace",
        metadata: (row.metadata as Record<string, unknown>) || {},
        createdAt: row.created_at,
      })
    }
  }

  const hasAuditEvents = !auditRes.error && (auditRes.data?.length ?? 0) > 0
  if (!auditRes.error && auditRes.data) {
    for (const row of auditRes.data) {
      const details = (row.details as Record<string, unknown>) || {}
      const eventType = String(details.event_type || row.action) as PartnerTelemetryEventType
      if (!VALID_PARTNER_TELEMETRY_EVENTS.includes(eventType)) continue

      const pId = typeof details.partner_id === "string" ? details.partner_id : null
      const lId = typeof details.lead_id === "string" ? details.lead_id : row.entity_id

      if (options?.partnerId && pId !== options.partnerId) continue
      if (options?.leadId && lId !== options.leadId) continue

      rawEvents.push({
        id: `audit-${row.id}`,
        partnerId: pId,
        partnerEmail: String(details.partner_email || row.admin_email || ""),
        partnerName: String(details.partner_name || "Installateur"),
        leadId: lId,
        leadRef: typeof details.lead_ref === "string" ? details.lead_ref : lId,
        sessionId: String(details.session_id || "session"),
        eventType,
        durationMs: Number(details.duration_ms) || 0,
        source: String(details.source || "marketplace"),
        metadata: (details.metadata as Record<string, unknown>) || {},
        createdAt: row.created_at,
      })
    }
  }

  // Enrichir, filtrer les comptes de test si demandé, et dédoublonner
  const seenKeys = new Set<string>()
  const events: PartnerActivityEventRecord[] = []

  for (const ev of rawEvents) {
    const dedupKey = `${ev.partnerEmail}|${ev.leadId || ""}|${ev.eventType}|${ev.sessionId}|${ev.createdAt.slice(0, 19)}`
    if (seenKeys.has(dedupKey)) continue
    seenKeys.add(dedupKey)

    const resolvedPartner =
      (ev.partnerId ? partnerMap.get(ev.partnerId) : undefined) ||
      partnerByEmailMap.get(ev.partnerEmail.toLowerCase().trim())

    const isTest = resolvedPartner
      ? resolvedPartner.is_test
      : isTestPartnerIdentity({ email: ev.partnerEmail, company_name: ev.partnerName })

    if (isTest && !includeTest) continue

    const resolvedLead = ev.leadId ? leadMap.get(ev.leadId) : undefined
    const partnerId = resolvedPartner?.id || ev.partnerId || ev.partnerEmail

    events.push({
      id: ev.id,
      partnerId,
      partnerEmail: resolvedPartner?.email || ev.partnerEmail,
      partnerName: resolvedPartner?.company_name || ev.partnerName,
      isTest,
      leadId: ev.leadId,
      leadRef: ev.leadRef,
      leadLabel: ev.leadId ? formatLeadLabel(resolvedLead, ev.leadRef) : null,
      leadSegment: resolvedLead?.segment ?? (typeof ev.metadata.segment === "string" ? ev.metadata.segment : null),
      leadProvince: resolvedLead?.province ?? (typeof ev.metadata.province === "string" ? ev.metadata.province : null),
      leadCreditCost: resolvedLead?.credit_cost ?? (typeof ev.metadata.creditCost === "number" ? ev.metadata.creditCost : null),
      leadMarketplaceStatus: resolvedLead?.marketplace_status ?? null,
      sessionId: ev.sessionId,
      eventType: ev.eventType,
      durationMs: ev.durationMs,
      source: ev.source,
      metadata: ev.metadata,
      createdAt: ev.createdAt,
    })
  }

  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Structures d'agrégation
  const byPartner: Record<string, PartnerEngagementSummary> = {}
  const partnerSessions = new Map<string, Set<string>>()
  const partnerLeadDetails = new Map<string, Map<string, PartnerLeadViewDetail>>()

  const byLead: Record<string, LeadEngagementSummary> = {}
  const leadViewersMap = new Map<string, Map<string, LeadViewerDetail>>()

  let totalLeadViews = 0
  let totalStudyDurationMs = 0
  let durationSamplesCount = 0
  let unlockIntentsCount = 0
  const viewedLeadIds = new Set<string>()

  for (const ev of events) {
    const pKey = ev.partnerId || ev.partnerEmail
    const partnerInfo = partnerMap.get(pKey) || partnerByEmailMap.get(ev.partnerEmail.toLowerCase())

    if (!byPartner[pKey]) {
      byPartner[pKey] = {
        partnerId: pKey,
        companyName: partnerInfo?.company_name || ev.partnerName,
        email: partnerInfo?.email || ev.partnerEmail,
        isTest: ev.isTest,
        credits: partnerInfo?.credits ?? 0,
        sessionsCount: 0,
        leadsInspectedCount: 0,
        uniqueLeadsIds: [],
        totalViewsCount: 0,
        totalDurationMs: 0,
        avgDurationMs: 0,
        unlockIntentsCount: 0,
        roofZoomsCount: 0,
        creditModalOpensCount: 0,
        lastActivityAt: ev.createdAt,
        hotLeadSignals: 0,
        recentLeads: [],
        recentEvents: [],
      }
      partnerSessions.set(pKey, new Set())
      partnerLeadDetails.set(pKey, new Map())
    }

    const pSummary = byPartner[pKey]
    if (!pSummary.lastActivityAt || ev.createdAt > pSummary.lastActivityAt) {
      pSummary.lastActivityAt = ev.createdAt
    }
    if (pSummary.recentEvents.length < 30) {
      pSummary.recentEvents.push(ev)
    }

    if (ev.sessionId) {
      partnerSessions.get(pKey)!.add(ev.sessionId)
      pSummary.sessionsCount = partnerSessions.get(pKey)!.size
    }

    if (ev.eventType === "lead_inspect_open" || ev.eventType === "email_deep_link") {
      pSummary.totalViewsCount += 1
      totalLeadViews += 1
    } else if (ev.eventType === "lead_inspect_duration") {
      pSummary.totalDurationMs += ev.durationMs
      totalStudyDurationMs += ev.durationMs
      if (ev.durationMs > 0) durationSamplesCount += 1
    } else if (ev.eventType === "unlock_intent") {
      pSummary.unlockIntentsCount += 1
      unlockIntentsCount += 1
    } else if (ev.eventType === "roof_photo_zoom") {
      pSummary.roofZoomsCount += 1
    } else if (ev.eventType === "credit_modal_open") {
      pSummary.creditModalOpensCount += 1
    }

    // Agrégation croisée (Partner <-> Lead)
    if (ev.leadId) {
      const lKey = ev.leadId
      viewedLeadIds.add(lKey)

      if (!pSummary.uniqueLeadsIds.includes(lKey)) {
        pSummary.uniqueLeadsIds.push(lKey)
        pSummary.leadsInspectedCount = pSummary.uniqueLeadsIds.length
      }

      const pLeads = partnerLeadDetails.get(pKey)!
      const hasPurchased = purchaseSet.has(`${lKey}::${pKey}`)
      if (!pLeads.has(lKey)) {
        pLeads.set(lKey, {
          leadId: lKey,
          leadLabel: ev.leadLabel || formatLeadLabel(leadMap.get(lKey), ev.leadRef),
          segment: ev.leadSegment,
          province: ev.leadProvince,
          creditCost: ev.leadCreditCost,
          marketplaceStatus: ev.leadMarketplaceStatus,
          viewsCount: 0,
          totalDurationMs: 0,
          zoomedPhoto: false,
          unlockIntent: false,
          hasPurchased,
          lastViewedAt: ev.createdAt,
          lastSource: ev.source,
        })
      }

      const pLeadDetail = pLeads.get(lKey)!
      if (ev.createdAt > pLeadDetail.lastViewedAt) {
        pLeadDetail.lastViewedAt = ev.createdAt
        pLeadDetail.lastSource = ev.source
      }
      if (ev.eventType === "lead_inspect_open" || ev.eventType === "email_deep_link") {
        pLeadDetail.viewsCount += 1
      } else if (ev.eventType === "lead_inspect_duration") {
        pLeadDetail.totalDurationMs += ev.durationMs
        if (ev.metadata.zoomedRoofPhoto === true) pLeadDetail.zoomedPhoto = true
        if (ev.metadata.clickedUnlockIntent === true) pLeadDetail.unlockIntent = true
      } else if (ev.eventType === "roof_photo_zoom") {
        pLeadDetail.zoomedPhoto = true
      } else if (ev.eventType === "unlock_intent") {
        pLeadDetail.unlockIntent = true
      }

      // Agrégation côté Lead
      if (!byLead[lKey]) {
        const leadRow = leadMap.get(lKey)
        byLead[lKey] = {
          leadId: lKey,
          leadLabel: ev.leadLabel || formatLeadLabel(leadRow, ev.leadRef),
          segment: leadRow?.segment ?? ev.leadSegment,
          province: leadRow?.province ?? ev.leadProvince,
          creditCost: leadRow?.credit_cost ?? ev.leadCreditCost,
          marketplaceStatus: leadRow?.marketplace_status ?? ev.leadMarketplaceStatus,
          totalViews: 0,
          uniquePartnersCount: 0,
          totalDurationMs: 0,
          avgDurationMs: 0,
          unlockIntentsCount: 0,
          roofZoomsCount: 0,
          purchasesCount: purchasesCountByLead.get(lKey) ?? 0,
          viewers: [],
        }
        leadViewersMap.set(lKey, new Map())
      }

      const lSummary = byLead[lKey]
      if (ev.eventType === "lead_inspect_open" || ev.eventType === "email_deep_link") {
        lSummary.totalViews += 1
      } else if (ev.eventType === "lead_inspect_duration") {
        lSummary.totalDurationMs += ev.durationMs
      } else if (ev.eventType === "unlock_intent") {
        lSummary.unlockIntentsCount += 1
      } else if (ev.eventType === "roof_photo_zoom") {
        lSummary.roofZoomsCount += 1
      }

      const lViewers = leadViewersMap.get(lKey)!
      if (!lViewers.has(pKey)) {
        lViewers.set(pKey, {
          partnerId: pKey,
          companyName: pSummary.companyName,
          email: pSummary.email,
          isTest: ev.isTest,
          credits: pSummary.credits,
          viewsCount: 0,
          totalDurationMs: 0,
          zoomedPhoto: false,
          unlockIntent: false,
          hasPurchased,
          lastViewedAt: ev.createdAt,
          lastSource: ev.source,
        })
      }

      const viewer = lViewers.get(pKey)!
      if (ev.createdAt > viewer.lastViewedAt) {
        viewer.lastViewedAt = ev.createdAt
        viewer.lastSource = ev.source
      }
      if (ev.eventType === "lead_inspect_open" || ev.eventType === "email_deep_link") {
        viewer.viewsCount += 1
      } else if (ev.eventType === "lead_inspect_duration") {
        viewer.totalDurationMs += ev.durationMs
        if (ev.metadata.zoomedRoofPhoto === true) viewer.zoomedPhoto = true
        if (ev.metadata.clickedUnlockIntent === true) viewer.unlockIntent = true
      } else if (ev.eventType === "roof_photo_zoom") {
        viewer.zoomedPhoto = true
      } else if (ev.eventType === "unlock_intent") {
        viewer.unlockIntent = true
      }
    }
  }

  // Finaliser les moyennes & détecter les signaux chauds d'achat
  const hotSignals: HotIntentSignal[] = []

  for (const [pKey, pSummary] of Object.entries(byPartner)) {
    const leadsDetails = Array.from(partnerLeadDetails.get(pKey)?.values() ?? []).sort(
      (a, b) => new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime()
    )
    pSummary.recentLeads = leadsDetails
    pSummary.avgDurationMs =
      pSummary.leadsInspectedCount > 0
        ? Math.round(pSummary.totalDurationMs / pSummary.leadsInspectedCount)
        : 0

    for (const ld of leadsDetails) {
      if (ld.hasPurchased) continue
      if (ld.marketplaceStatus && ld.marketplaceStatus !== "available") continue

      const isLongInspection = ld.totalDurationMs >= 15000
      const isRepeatedView = ld.viewsCount >= 2
      if (!ld.unlockIntent && !ld.zoomedPhoto && !isLongInspection && !isRepeatedView) continue

      let heatScore = 0
      const reasons: string[] = []
      if (ld.unlockIntent) {
        heatScore += 45
        reasons.push("A cliqué sur Débloquer / Payer")
      }
      if (ld.zoomedPhoto) {
        heatScore += 20
        reasons.push("A inspecté la photo toiture")
      }
      if (ld.totalDurationMs >= 45000) {
        heatScore += 25
        reasons.push(`Étude approfondie (${formatDurationCompact(ld.totalDurationMs)})`)
      } else if (ld.totalDurationMs >= 15000) {
        heatScore += 15
        reasons.push(`Lecture attentive (${formatDurationCompact(ld.totalDurationMs)})`)
      }
      if (isRepeatedView) {
        heatScore += 10
        reasons.push(`${ld.viewsCount} ouvertures`)
      }

      const creditCost = ld.creditCost ?? (ld.segment === "B2B" ? 9 : 3)
      const intentMethod =
        pSummary.credits < creditCost && ld.unlockIntent
          ? "insufficient_credits"
          : ld.unlockIntent
          ? "checkout_abandoned"
          : null

      if (intentMethod === "insufficient_credits") {
        reasons.push(`Solde insuffisant (${pSummary.credits}/${creditCost} cr.)`)
      }

      pSummary.hotLeadSignals += 1

      hotSignals.push({
        id: `${pKey}::${ld.leadId}`,
        partnerId: pKey,
        companyName: pSummary.companyName,
        partnerEmail: pSummary.email,
        partnerCredits: pSummary.credits,
        leadId: ld.leadId,
        leadLabel: ld.leadLabel,
        segment: ld.segment,
        province: ld.province,
        creditCost,
        viewsCount: ld.viewsCount,
        totalDurationMs: ld.totalDurationMs,
        zoomedPhoto: ld.zoomedPhoto,
        unlockIntent: ld.unlockIntent,
        intentMethod,
        heatScore: Math.min(100, heatScore),
        lastActivityAt: ld.lastViewedAt,
        reason: reasons.join(" · "),
      })
    }
  }

  for (const [lKey, lSummary] of Object.entries(byLead)) {
    const viewers = Array.from(leadViewersMap.get(lKey)?.values() ?? []).sort(
      (a, b) => b.totalDurationMs - a.totalDurationMs || b.viewsCount - a.viewsCount
    )
    lSummary.viewers = viewers
    lSummary.uniquePartnersCount = viewers.length
    lSummary.avgDurationMs =
      viewers.length > 0 ? Math.round(lSummary.totalDurationMs / viewers.length) : 0
  }

  hotSignals.sort(
    (a, b) =>
      b.heatScore - a.heatScore ||
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  )

  const topViewedLeads = Object.values(byLead).sort(
    (a, b) =>
      b.uniquePartnersCount - a.uniquePartnersCount ||
      b.totalViews - a.totalViews ||
      b.totalDurationMs - a.totalDurationMs
  )

  const activePartnersCount = Object.keys(byPartner).length
  const avgStudyDurationMs =
    durationSamplesCount > 0 ? Math.round(totalStudyDurationMs / durationSamplesCount) : 0

  return {
    generatedAt: new Date().toISOString(),
    storageBackend:
      tableAvailable && hasAuditEvents
        ? "hybrid"
        : tableAvailable
        ? "partner_activity_events"
        : "audit_log_fallback",
    kpis: {
      activePartnersCount,
      totalLeadViews,
      uniqueLeadsViewed: viewedLeadIds.size,
      totalStudyDurationMs,
      avgStudyDurationMs,
      unlockIntentsCount,
      hotSignalsCount: hotSignals.length,
    },
    byPartner,
    byLead,
    hotSignals,
    topViewedLeads,
    recentEvents: events.slice(0, 100),
  }
}

const getPartnerTelemetryAnalyticsDefaultCached = unstable_cache(
  async () => getPartnerTelemetryAnalytics({ days: 30, includeTest: false }),
  ["admin-partner-telemetry-v1"],
  {
    revalidate: 30,
    tags: ["admin-telemetry", "admin-kpis"],
  }
)

/**
 * Version cachée (TTL 30s + invalidation événementielle) et dédupliquée par requête React
 * pour l'affichage instantané du cockpit Admin.
 */
export const getPartnerTelemetryAnalyticsCached = cache(
  async (options?: {
    partnerId?: string
    leadId?: string
    days?: number
    includeTest?: boolean
  }): Promise<PartnerTelemetryAnalytics> => {
    const isDefaultDashboardQuery =
      !options?.partnerId &&
      !options?.leadId &&
      (options?.days === undefined || options.days === 30) &&
      (options?.includeTest === undefined || options.includeTest === false)

    if (isDefaultDashboardQuery) {
      return await getPartnerTelemetryAnalyticsDefaultCached()
    }
    return await getPartnerTelemetryAnalytics(options)
  }
)


