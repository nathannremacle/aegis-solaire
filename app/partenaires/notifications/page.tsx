import Link from "next/link"
import { AlertTriangle, ShieldCheck } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  applyNotificationModeToSurfaces,
  getCleanTargetSurfaces,
  getEffectivePartnerSegment,
  getPartnerNotificationMode,
  isValidPartnerNotificationMode,
  normalizePartnerSegment,
  type PartnerNotificationMode,
  type PartnerSegmentPreference,
} from "@/lib/partner-notification-prefs"
import { verifyPartnerUnsubscribeToken } from "@/lib/partner-notification-tokens"
import { PartnerNotificationsClient } from "@/components/partners/partner-notifications-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Préférences d'alertes e-mail — Aegis Solaire",
  description: "Gérez la fréquence de réception de vos opportunités photovoltaïques Aegis Solaire.",
}

export default async function PartnerNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    partner?: string
    token?: string
    mode?: string
    segment?: string
    sms?: string
    feedback?: string
  }>
}) {
  const params = await searchParams
  const partnerId = (params.partner || "").trim()
  const token = (params.token || "").trim()
  const requestedMode = params.mode
  const requestedSegment = normalizePartnerSegment(params.segment)
  const requestedSms =
    params.sms === "0" || params.sms === "false"
      ? false
      : params.sms === "1" || params.sms === "true"
        ? true
        : null
  const feedbackReason = params.feedback?.trim() || null

  const isTokenValid = Boolean(partnerId && verifyPartnerUnsubscribeToken(partnerId, token))

  let partner: {
    id: string
    company_name: string
    email: string
    phone?: string | null
    segment: string | null
    target_surfaces: string[] | null
    email_notifications_enabled?: boolean | null
    email_relances_enabled?: boolean | null
    sms_alerts_opt_in?: boolean | null
    weekly_digest_enabled?: boolean | null
  } | null = null

  let currentMode: PartnerNotificationMode = "all"
  let currentSegment: PartnerSegmentPreference = "BOTH"
  let currentSmsOptIn = false
  let currentWeeklyDigest = true
  let autoAppliedMode: PartnerNotificationMode | null = null
  let autoAppliedSms: boolean | null = null

  if (isTokenValid) {
    const admin = createServiceRoleClient()
    let fetchedPartner: any = null
    const fullRes = await admin
      .from("partners")
      .select(
        "id, company_name, email, phone, segment, target_surfaces, email_notifications_enabled, email_relances_enabled, sms_alerts_opt_in, weekly_digest_enabled"
      )
      .eq("id", partnerId)
      .maybeSingle()

    if (
      fullRes.error &&
      (fullRes.error.code === "42703" ||
        fullRes.error.message?.includes("sms_alerts_opt_in") ||
        fullRes.error.message?.includes("weekly_digest_enabled"))
    ) {
      const legacyRes = await admin
        .from("partners")
        .select(
          "id, company_name, email, phone, segment, target_surfaces, email_notifications_enabled, email_relances_enabled"
        )
        .eq("id", partnerId)
        .maybeSingle()
      fetchedPartner = legacyRes.data
    } else {
      fetchedPartner = fullRes.data
    }

    if (fetchedPartner) {
      partner = fetchedPartner
      currentMode = getPartnerNotificationMode(fetchedPartner)
      currentSegment = getEffectivePartnerSegment(fetchedPartner)
      currentSmsOptIn = Boolean(fetchedPartner.sms_alerts_opt_in)
      currentWeeklyDigest = fetchedPartner.weekly_digest_enabled !== false

      if (
        isValidPartnerNotificationMode(requestedMode) ||
        requestedSegment ||
        requestedSms !== null
      ) {
        const nextMode = isValidPartnerNotificationMode(requestedMode)
          ? requestedMode
          : currentMode
        const nextSegment = requestedSegment ?? currentSegment
        const nextSms = requestedSms !== null ? requestedSms : currentSmsOptIn
        const cleanSurfaces = getCleanTargetSurfaces(fetchedPartner.target_surfaces)
        const encodedSurfaces = applyNotificationModeToSurfaces(cleanSurfaces, nextMode)
        const baseUpdates = {
          target_surfaces: encodedSurfaces,
          segment: nextSegment,
          updated_at: new Date().toISOString(),
        }

        const { error: fullErr } = await admin
          .from("partners")
          .update({
            ...baseUpdates,
            email_notifications_enabled: nextMode !== "none",
            email_relances_enabled: nextMode === "all",
            sms_alerts_opt_in: nextSms,
          })
          .eq("id", fetchedPartner.id)

        if (
          fullErr &&
          (fullErr.code === "42703" ||
            fullErr.message?.includes("email_notifications_enabled") ||
            fullErr.message?.includes("email_relances_enabled") ||
            fullErr.message?.includes("sms_alerts_opt_in"))
        ) {
          await admin.from("partners").update(baseUpdates).eq("id", fetchedPartner.id)
        }

        currentMode = nextMode
        currentSegment = nextSegment
        currentSmsOptIn = nextSms
        if (isValidPartnerNotificationMode(requestedMode)) {
          autoAppliedMode = requestedMode
        }
        if (requestedSms !== null) {
          autoAppliedSms = requestedSms
        }
      }
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b border-border pb-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-mono font-semibold text-foreground w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>AEGIS SOLAIRE · GESTION DES ALERTES</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Préférences de réception e-mail
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choisissez à tout moment la fréquence de nos notifications de chantiers photovoltaïques en Wallonie.
            </p>
          </div>

          {!isTokenValid || !partner ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Lien de gestion invalide ou expiré</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Vous pouvez modifier vos alertes directement depuis votre espace installateur ou nous écrire à{" "}
                <a href="mailto:contact@aegissolaire.com" className="underline font-medium text-foreground">
                  contact@aegissolaire.com
                </a>
                .
              </p>
              <Link
                href="/partenaires/dashboard?alerts=1"
                className="text-xs font-semibold text-primary hover:underline w-fit"
              >
                Accéder à mon espace partenaire &rarr;
              </Link>
            </div>
          ) : (
            <PartnerNotificationsClient
              partnerId={partner.id}
              token={token}
              companyName={partner.company_name}
              email={partner.email}
              phone={partner.phone ?? null}
              initialMode={currentMode}
              initialSegment={currentSegment}
              initialSmsOptIn={currentSmsOptIn}
              initialWeeklyDigest={currentWeeklyDigest}
              autoAppliedMode={autoAppliedMode}
              autoAppliedSms={autoAppliedSms}
              feedbackReason={feedbackReason}
            />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          L&apos;équipe Support Aegis Solaire · contact@aegissolaire.com
        </p>
      </div>
    </main>
  )
}

