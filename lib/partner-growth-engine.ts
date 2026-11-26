import { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { loadGlobalEmailBlacklist, safeSendResendEmail } from "@/lib/email-blacklist"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"
import {
  getEffectivePartnerSegment,
  getPartnerNotificationMode,
} from "@/lib/partner-notification-prefs"
import {
  buildPartnerExpressLeadUrls,
  buildPartnerFeedback1ClickUrl,
  buildPartnerNotificationUrls,
} from "@/lib/partner-notification-tokens"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
  type EmailSpecRow,
} from "@/lib/email-templates/installer-email-layout"
import {
  isDevTestPartner,
  isUnreachableMockEmail,
  isWithinBusinessHours,
} from "@/lib/lead-relance-engine"

const WEEKLY_DIGEST_COOLDOWN_MS = 6 * 24 * 60 * 60 * 1000
const BEHAVIORAL_NUDGE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

const ALL_WALLONIA_PROVINCES = [
  "liege",
  "hainaut",
  "namur",
  "brabant_wallon",
  "luxembourg",
  "bruxelles",
]

function normalizeProvinceKeySimple(raw: string | null | undefined): string {
  const s = (raw || "").toLowerCase().trim()
  if (!s) return ""
  if (s.includes("liège") || s.includes("liege")) return "liege"
  if (s.includes("hainaut")) return "hainaut"
  if (s.includes("namur")) return "namur"
  if (s.includes("brabant") && s.includes("wallon")) return "brabant_wallon"
  if (s.includes("bruxelles") || s.includes("brussels")) return "bruxelles"
  if (s.includes("luxembourg")) return "luxembourg"
  return s
}

export interface GrowthRunResult {
  action: "weekly_digest" | "behavioral_nudges"
  dryRun: boolean
  eligibleCount: number
  sentCount: number
  skippedCount: number
  previews: Array<{
    partnerId: string
    companyName: string
    email: string
    subject: string
    detail: string
  }>
}

function resolvePartnerTargetProvinces(raw: string[] | null | undefined): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return ALL_WALLONIA_PROVINCES
  const normalized = raw.map(normalizeProvinceKeySimple).filter(Boolean)
  if (
    normalized.some(
      (p) =>
        p === "all" ||
        p === "national" ||
        p === "wallonie" ||
        p.includes("toute") ||
        p.includes("belgique")
    )
  ) {
    return ALL_WALLONIA_PROVINCES
  }
  return normalized.length > 0 ? normalized : ALL_WALLONIA_PROVINCES
}

/**
 * Étage 1 — Digest Hebdomadaire « Preuve de Marché Locale » (100 % factuel).
 * Liste uniquement les vrais chantiers vérifiés/attribués des 7 derniers jours
 * sur les provinces du partenaire.
 */
export async function runWeeklyMarketProofDigest(options?: {
  dryRun?: boolean
  forcePartnerId?: string
  maxEmails?: number
}): Promise<GrowthRunResult> {
  const dryRun = Boolean(options?.dryRun)
  const maxEmails = Math.min(250, Math.max(1, options?.maxEmails ?? 120))
  const supabase = createServiceRoleClient()
  const siteBaseUrl = getEmailSiteBaseUrl()
  const nowMs = Date.now()
  const since7dIso = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Charger les vrais leads des 7 derniers jours
  const { data: recentLeads, error: leadsErr } = await supabase
    .from("leads")
    .select(
      "id, segment, province, city, postal_code, estimated_power_kwc, marketplace_status, created_at, qualification_metadata"
    )
    .in("marketplace_status", ["available", "sold_out"])
    .gte("created_at", since7dIso)
    .order("created_at", { ascending: false })
    .limit(200)

  if (leadsErr || !recentLeads || recentLeads.length === 0) {
    return {
      action: "weekly_digest",
      dryRun,
      eligibleCount: 0,
      sentCount: 0,
      skippedCount: 0,
      previews: [],
    }
  }

  const validLeads = recentLeads.filter((l: any) => {
    if (isShowcaseOnlyLeadId(l.id)) return false
    const meta =
      l.qualification_metadata && typeof l.qualification_metadata === "object"
        ? (l.qualification_metadata as Record<string, unknown>)
        : null
    if (meta?.is_showcase === true) return false
    return true
  })

  if (validLeads.length === 0) {
    return {
      action: "weekly_digest",
      dryRun,
      eligibleCount: 0,
      sentCount: 0,
      skippedCount: 0,
      previews: [],
    }
  }

  // Indexer les chantiers par province
  const leadsByProvince = new Map<string, any[]>()
  for (const lead of validLeads) {
    const pk = normalizeProvinceKeySimple(lead.province)
    if (!pk) continue
    const arr = leadsByProvince.get(pk) || []
    arr.push(lead)
    leadsByProvince.set(pk, arr)
  }

  // 2. Charger la liste noire et les partenaires
  let blacklistSet = new Set<string>()
  try {
    blacklistSet = await loadGlobalEmailBlacklist(supabase)
  } catch (err) {
    console.error("[WeeklyDigest] Liste noire indisponible, arrêt par sécurité :", err)
    return {
      action: "weekly_digest",
      dryRun,
      eligibleCount: 0,
      sentCount: 0,
      skippedCount: 0,
      previews: [],
    }
  }

  let partners: any[] = []
  const fullPartnerRes = await supabase
    .from("partners")
    .select(
      "id, company_name, email, credits, segment, target_provinces, target_surfaces, email_notifications_enabled, email_relances_enabled, weekly_digest_enabled, last_weekly_digest_at, is_test"
    )

  if (
    fullPartnerRes.error &&
    (fullPartnerRes.error.code === "42703" ||
      fullPartnerRes.error.message?.includes("weekly_digest_enabled") ||
      fullPartnerRes.error.message?.includes("last_weekly_digest_at"))
  ) {
    const legacyRes = await supabase
      .from("partners")
      .select(
        "id, company_name, email, credits, segment, target_provinces, target_surfaces, email_notifications_enabled, email_relances_enabled, is_test"
      )
    partners = legacyRes.data || []
  } else {
    partners = fullPartnerRes.data || []
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
  const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"
  const resend = !dryRun && resendApiKey ? new Resend(resendApiKey) : null

  let eligibleCount = 0
  let sentCount = 0
  let skippedCount = 0
  const previews: GrowthRunResult["previews"] = []

  for (const partner of partners) {
    if (options?.forcePartnerId && partner.id !== options.forcePartnerId) continue
    if (!partner.email || !partner.email.includes("@")) continue
    if (isUnreachableMockEmail(partner.email) || isDevTestPartner(partner)) continue

    const cleanEmail = partner.email.toLowerCase().trim()
    if (blacklistSet.has(cleanEmail)) {
      skippedCount++
      continue
    }

    if (getPartnerNotificationMode(partner) === "none") {
      skippedCount++
      continue
    }
    if (partner.weekly_digest_enabled === false && !options?.forcePartnerId) {
      skippedCount++
      continue
    }

    if (partner.last_weekly_digest_at && !options?.forcePartnerId && !dryRun) {
      const lastTs = new Date(partner.last_weekly_digest_at).getTime()
      if (Number.isFinite(lastTs) && nowMs - lastTs < WEEKLY_DIGEST_COOLDOWN_MS) {
        skippedCount++
        continue
      }
    }

    const partnerProvs = resolvePartnerTargetProvinces(partner.target_provinces)
    const partnerSeg = getEffectivePartnerSegment(partner)

    const matchingLeads: any[] = []
    const seenIds = new Set<string>()
    for (const prov of partnerProvs) {
      const list = leadsByProvince.get(prov) || []
      for (const l of list) {
        if (seenIds.has(l.id)) continue
        const seg = (l.segment || "B2C").toUpperCase()
        if (partnerSeg !== "BOTH" && partnerSeg !== seg) continue
        seenIds.add(l.id)
        matchingLeads.push(l)
      }
    }

    if (matchingLeads.length === 0) {
      skippedCount++
      continue
    }

    eligibleCount++
    if (sentCount >= maxEmails) break

    const totalKwc = Math.round(
      matchingLeads.reduce((acc, l) => acc + (Number(l.estimated_power_kwc) || 0), 0)
    )
    const availableCount = matchingLeads.filter((l) => l.marketplace_status === "available").length
    const assignedCount = matchingLeads.length - availableCount
    const topLeads = matchingLeads.slice(0, 5)
    const mainProvLabel =
      partnerProvs.length === 1
        ? getProvinceDisplayLabel(partnerProvs[0])
        : "votre secteur Wallonie & Bruxelles"

    const expressUrls = buildPartnerExpressLeadUrls(siteBaseUrl, partner.id, null, partner.email)
    const notifUrls = buildPartnerNotificationUrls(siteBaseUrl, partner.id, partner.email)

    const subject = `Bilan 7 jours (${mainProvLabel}) : ${matchingLeads.length} chantier${matchingLeads.length > 1 ? "s" : ""} vérifié${matchingLeads.length > 1 ? "s" : ""} (${totalKwc} kWc)`

    const specRows: EmailSpecRow[] = topLeads.map((l) => {
      const loc = [l.postal_code, l.city].filter(Boolean).join(" ") || getProvinceDisplayLabel(l.province)
      const kwc = l.estimated_power_kwc ? `${Number(l.estimated_power_kwc).toFixed(1).replace(".", ",")} kWc` : "PV"
      const statusTxt = l.marketplace_status === "sold_out" ? "Attribué" : "Créneau disponible"
      return {
        label: `${l.segment || "B2C"} · ${loc}`,
        value: `${kwc} — ${statusTxt}`,
      }
    })

    const html = renderInstallerEmailShell({
      subject,
      preheader: `${matchingLeads.length} chantiers solaires vérifiés cette semaine sur ${mainProvLabel} (${totalKwc} kWc).`,
      reference: "Récapitulatif hebdomadaire",
      context: `Activité locale · ${mainProvLabel}`,
      headline: `${matchingLeads.length} chantier${matchingLeads.length > 1 ? "s" : ""} qualifié${matchingLeads.length > 1 ? "s" : ""} cette semaine`,
      subtitle: `${partner.company_name} · Synthèse 100 % factuelle des 7 derniers jours`,
      statusPill:
        availableCount > 0
          ? { text: `${availableCount} dossier(s) encore ouvert(s)`, tone: "success" }
          : { text: "Marché actif sur votre secteur", tone: "neutral" },
      bodyHtml: `
        ${renderFiguresBox(
          {
            label: "Dossiers vérifiés (7 j.)",
            value: `${matchingLeads.length}`,
            sublabel: `${assignedCount} attribué(s) · ${availableCount} ouvert(s)`,
          },
          {
            label: "Volume cumulé modélisé",
            value: totalKwc > 0 ? `${totalKwc.toLocaleString("fr-BE")} kWc` : "B2C / B2B",
            sublabel: "Contrôle OTP + vue 3D du toit",
          }
        )}

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #DCE5EB; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
          <tr>
            <td style="padding: 14px 15px;">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
                Aperçu des chantiers récents dans votre zone
              </h2>
              ${renderSpecsTable(specRows)}
            </td>
          </tr>
        </table>

        ${renderActionBox({
          kicker: "Zéro abonnement · Paiement à l'unité ou sur crédits",
          title:
            availableCount > 0
              ? `${availableCount} chantier(s) à inspecter dès maintenant`
              : "Activez l'Auto-Pilot ou les alertes SMS pour être averti en 1er",
          subtext: "Consultez gratuitement les photos du toit et le radar 3 km avant toute décision.",
          ctaLabel: "Ouvrir la Marketplace →",
          ctaUrl: expressUrls.dashboardUrl,
        })}

        ${renderCalloutBox({
          label: "Ne manquez plus le prochain chantier local",
          value: "Vous pouvez activer les alertes SMS temps réel ou ajuster vos provinces et votre seuil kWc en 1 clic dans votre onglet Alertes.",
          tone: "info",
        })}
      `,
      footerNote:
        "Synthèse hebdomadaire envoyée aux installateurs certifiés RESCERT inscrits sur Aegis Solaire.",
      footerLinks: [
        { label: "Gérer mes alertes (e-mail & SMS)", href: notifUrls.manageUrl },
        { label: "Couper les SMS", href: notifUrls.muteSmsUrl },
        { label: "Mettre en pause", href: notifUrls.muteAllUrl },
      ],
    })

    const text = `AEGIS SOLAIRE — BILAN HEBDOMADAIRE (${mainProvLabel})\n\n${matchingLeads.length} chantier(s) vérifié(s) ces 7 derniers jours (${totalKwc} kWc).\n${topLeads
      .map((l) => `• ${l.segment || "B2C"} ${l.postal_code || ""} ${l.city || ""} (${l.estimated_power_kwc || "?"} kWc) — ${l.marketplace_status === "sold_out" ? "Attribué" : "Disponible"}`)
      .join("\n")}\n\nOuvrir la Marketplace : ${expressUrls.dashboardUrl}\nGérer vos alertes (e-mail & SMS) : ${notifUrls.manageUrl}`.trim()

    if (previews.length < 15) {
      previews.push({
        partnerId: partner.id,
        companyName: partner.company_name,
        email: cleanEmail,
        subject,
        detail: `${matchingLeads.length} chantiers (${availableCount} ouverts, ${totalKwc} kWc)`,
      })
    }

    if (dryRun) {
      sentCount++
      continue
    }

    if (resend) {
      const { blocked, error: sendErr } = await safeSendResendEmail(
        resend,
        {
          from: fromEmail,
          to: cleanEmail,
          replyTo: replyToEmail,
          subject,
          text,
          html,
          headers: {
            "List-Unsubscribe": `<${notifUrls.muteAllUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
        { supabase, blacklistSet, context: "WEEKLY_MARKET_DIGEST" }
      )
      if (blocked || sendErr) {
        skippedCount++
        continue
      }
    }

    sentCount++
    try {
      await supabase
        .from("partners")
        .update({ last_weekly_digest_at: new Date().toISOString() })
        .eq("id", partner.id)
    } catch {
      // Tolérant si colonne absente
    }
  }

  if (!dryRun && sentCount > 0) {
    try {
      await supabase.from("audit_log").insert({
        admin_email: "system:growth_engine",
        action: "weekly_market_digest_run",
        entity_type: "growth_engine",
        details: { eligibleCount, sentCount, skippedCount },
      })
    } catch {
      // non-blocking
    }
  }

  return {
    action: "weekly_digest",
    dryRun,
    eligibleCount,
    sentCount,
    skippedCount,
    previews,
  }
}

/**
 * Étage 1 — Micro-relance comportementale 1-clic sur les signaux de télémétrie
 * (partenaires ayant inspecté un dossier >= 20 s ou ouvert un intention d'achat sans acheter).
 */
export async function runBehavioralReactivationNudges(options?: {
  dryRun?: boolean
  maxEmails?: number
}): Promise<GrowthRunResult> {
  const dryRun = Boolean(options?.dryRun)
  const maxEmails = Math.min(100, Math.max(1, options?.maxEmails ?? 40))
  const supabase = createServiceRoleClient()
  const siteBaseUrl = getEmailSiteBaseUrl()
  const nowMs = Date.now()
  const since7dIso = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString()

  if (!dryRun && !isWithinBusinessHours()) {
    return {
      action: "behavioral_nudges",
      dryRun,
      eligibleCount: 0,
      sentCount: 0,
      skippedCount: 0,
      previews: [],
    }
  }

  let events: any[] = []
  try {
    const { data, error } = await supabase
      .from("partner_activity_events")
      .select("partner_id, partner_email, lead_id, event_type, duration_ms, created_at")
      .in("event_type", ["lead_inspect_duration", "unlock_intent", "credit_modal_open"])
      .gte("created_at", since7dIso)
      .order("created_at", { ascending: false })
      .limit(500)

    if (!error && data) {
      events = data
    }
  } catch {
    return {
      action: "behavioral_nudges",
      dryRun,
      eligibleCount: 0,
      sentCount: 0,
      skippedCount: 0,
      previews: [],
    }
  }

  // Garder les partenaires avec un signal fort (>= 20s ou intention)
  const partnerLeadMap = new Map<string, { leadId: string | null; maxDurationMs: number; eventType: string }>()
  for (const ev of events) {
    if (!ev.partner_id) continue
    const isStrong =
      ev.event_type === "unlock_intent" ||
      ev.event_type === "credit_modal_open" ||
      (ev.event_type === "lead_inspect_duration" && Number(ev.duration_ms || 0) >= 20000)
    if (!isStrong) continue
    if (!partnerLeadMap.has(ev.partner_id)) {
      partnerLeadMap.set(ev.partner_id, {
        leadId: ev.lead_id || null,
        maxDurationMs: Number(ev.duration_ms || 0),
        eventType: ev.event_type,
      })
    }
  }

  if (partnerLeadMap.size === 0) {
    return {
      action: "behavioral_nudges",
      dryRun,
      eligibleCount: 0,
      sentCount: 0,
      skippedCount: 0,
      previews: [],
    }
  }

  let blacklistSet = new Set<string>()
  try {
    blacklistSet = await loadGlobalEmailBlacklist(supabase)
  } catch {
    return {
      action: "behavioral_nudges",
      dryRun,
      eligibleCount: 0,
      sentCount: 0,
      skippedCount: 0,
      previews: [],
    }
  }

  const candidateIds = Array.from(partnerLeadMap.keys())
  let partners: any[] = []
  const fullPartnerRes = await supabase
    .from("partners")
    .select(
      "id, company_name, email, credits, segment, target_surfaces, email_notifications_enabled, email_relances_enabled, last_behavioral_nudge_at, is_test"
    )
    .in("id", candidateIds)

  if (
    fullPartnerRes.error &&
    (fullPartnerRes.error.code === "42703" ||
      fullPartnerRes.error.message?.includes("last_behavioral_nudge_at"))
  ) {
    const legacyRes = await supabase
      .from("partners")
      .select(
        "id, company_name, email, credits, segment, target_surfaces, email_notifications_enabled, email_relances_enabled, is_test"
      )
      .in("id", candidateIds)
    partners = legacyRes.data || []
  } else {
    partners = fullPartnerRes.data || []
  }

  const { data: recentPurchases } = await supabase
    .from("lead_purchases")
    .select("partner_id, lead_id, purchased_at")
    .in("partner_id", candidateIds)
    .gte("purchased_at", since7dIso)

  const recentBuyPartnerIds = new Set(
    (recentPurchases || []).map((p: any) => String(p.partner_id))
  )

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
  const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"
  const resend = !dryRun && resendApiKey ? new Resend(resendApiKey) : null

  let eligibleCount = 0
  let sentCount = 0
  let skippedCount = 0
  const previews: GrowthRunResult["previews"] = []

  for (const partner of partners) {
    if (!partner.email || !partner.email.includes("@")) continue
    if (isUnreachableMockEmail(partner.email) || isDevTestPartner(partner)) continue

    const cleanEmail = partner.email.toLowerCase().trim()
    if (blacklistSet.has(cleanEmail)) {
      skippedCount++
      continue
    }
    if (getPartnerNotificationMode(partner) === "none") {
      skippedCount++
      continue
    }
    // Ne pas relancer si le partenaire a acheté dans les 7 derniers jours
    if (recentBuyPartnerIds.has(partner.id)) {
      skippedCount++
      continue
    }
    if (partner.last_behavioral_nudge_at && !dryRun) {
      const lastTs = new Date(partner.last_behavioral_nudge_at).getTime()
      if (Number.isFinite(lastTs) && nowMs - lastTs < BEHAVIORAL_NUDGE_COOLDOWN_MS) {
        skippedCount++
        continue
      }
    }

    const signal = partnerLeadMap.get(partner.id)
    if (!signal) continue

    eligibleCount++
    if (sentCount >= maxEmails) break

    const notifUrls = buildPartnerNotificationUrls(siteBaseUrl, partner.id, partner.email)
    const expressUrls = buildPartnerExpressLeadUrls(siteBaseUrl, partner.id, signal.leadId, partner.email)

    const urlZone = buildPartnerFeedback1ClickUrl(siteBaseUrl, partner.id, "out_of_zone", {
      leadId: signal.leadId,
      email: partner.email,
    })
    const urlTooSmall = buildPartnerFeedback1ClickUrl(siteBaseUrl, partner.id, "too_small", {
      leadId: signal.leadId,
      email: partner.email,
    })
    const urlExclusive = buildPartnerFeedback1ClickUrl(siteBaseUrl, partner.id, "competition", {
      leadId: signal.leadId,
      email: partner.email,
    })
    const urlPrice = buildPartnerFeedback1ClickUrl(siteBaseUrl, partner.id, "price", {
      leadId: signal.leadId,
      email: partner.email,
    })

    const subject = `Ajustons vos dossiers solaires en 1 clic (${partner.company_name})`

    const html = renderInstallerEmailShell({
      subject,
      preheader: "Un dossier consulté récemment ne correspondait pas à vos critères ? Dites-le en 1 clic.",
      reference: "Calibration réseau",
      context: "Support Partenaires Aegis Solaire",
      headline: "Qu'est-ce qui vous a retenu récemment ?",
      subtitle: `${partner.company_name} · Calibration en 1 clic (0 formulaire)`,
      statusPill: { text: "Réglage instantané en 1 clic", tone: "neutral" },
      bodyHtml: `
        <p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.5; color: #142D42;">
          Vous avez consulté un dossier sur votre portail Aegis Solaire sans le débloquer. Pour que nous ne vous présentions que les chantiers les plus rentables pour vos équipes, cliquez simplement sur la raison principale :
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: separate; border-spacing: 0 8px;">
          <tr>
            <td style="padding: 12px 14px; border: 1px solid #DCE5EB; border-radius: 8px; background-color: #F6F8FA;">
              <a href="${escapeEmailHtml(urlZone)}" style="display: block; font-size: 14px; font-weight: bold; color: #142D42; text-decoration: none;">
                1. Zone géographique hors secteur &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; border: 1px solid #DCE5EB; border-radius: 8px; background-color: #F6F8FA;">
              <a href="${escapeEmailHtml(urlTooSmall)}" style="display: block; font-size: 14px; font-weight: bold; color: #142D42; text-decoration: none;">
                2. Projet trop petit (passer au filtre &ge; 15 kWc automatiquement) &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; border: 1px solid #DCE5EB; border-radius: 8px; background-color: #F6F8FA;">
              <a href="${escapeEmailHtml(urlExclusive)}" style="display: block; font-size: 14px; font-weight: bold; color: #142D42; text-decoration: none;">
                3. Je préfère uniquement les dossiers 100 % exclusifs &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; border: 1px solid #DCE5EB; border-radius: 8px; background-color: #F6F8FA;">
              <a href="${escapeEmailHtml(urlPrice)}" style="display: block; font-size: 14px; font-weight: bold; color: #142D42; text-decoration: none;">
                4. Tarif du dossier &rarr;
              </a>
            </td>
          </tr>
        </table>

        ${renderActionBox({
          kicker: "Retour au portail",
          title: "Consulter les chantiers disponibles",
          subtext: "Pour rappel : B2C plafonné à 3 installateurs max (ou 100 % exclusif dès 0/3), B2B 2 max ou exclusif.",
          ctaLabel: "Voir la Marketplace →",
          ctaUrl: expressUrls.inspectLeadUrl,
        })}
      `,
      footerLinks: [
        { label: "Gérer mes alertes (e-mail & SMS)", href: notifUrls.manageUrl },
        { label: "Assistance partenaires", href: "mailto:contact@aegissolaire.com" },
        { label: "Mettre en pause", href: notifUrls.muteAllUrl },
      ],
    })

    const text = `Bonjour,\n\nVous avez consulté un dossier sur Aegis Solaire sans le débloquer. Aidez-nous à mieux calibrer vos opportunités en 1 clic :\n- Zone hors secteur : ${urlZone}\n- Projet trop petit (>= 15 kWc) : ${urlTooSmall}\n- Préférence exclusivité : ${urlExclusive}\n- Tarif : ${urlPrice}\n\nLa Direction des Partenariats Aegis Solaire\ncontact@aegissolaire.com`.trim()

    if (previews.length < 15) {
      previews.push({
        partnerId: partner.id,
        companyName: partner.company_name,
        email: cleanEmail,
        subject,
        detail: `Signal ${signal.eventType} (${Math.round(signal.maxDurationMs / 1000)} s)`,
      })
    }

    if (dryRun) {
      sentCount++
      continue
    }

    if (resend) {
      const { blocked, error: sendErr } = await safeSendResendEmail(
        resend,
        {
          from: fromEmail,
          to: cleanEmail,
          replyTo: replyToEmail,
          subject,
          text,
          html,
          headers: {
            "List-Unsubscribe": `<${notifUrls.muteAllUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
        { supabase, blacklistSet, context: "BEHAVIORAL_NUDGE" }
      )
      if (blocked || sendErr) {
        skippedCount++
        continue
      }
    }

    sentCount++
    try {
      await supabase
        .from("partners")
        .update({ last_behavioral_nudge_at: new Date().toISOString() })
        .eq("id", partner.id)
    } catch {
      // Tolérant si colonne absente
    }
  }

  return {
    action: "behavioral_nudges",
    dryRun,
    eligibleCount,
    sentCount,
    skippedCount,
    previews,
  }
}
