import Link from "next/link"
import { AlertTriangle, ShieldCheck } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  applyNotificationModeToSurfaces,
  getCleanTargetSurfaces,
  getPartnerNotificationMode,
  isValidPartnerNotificationMode,
  type PartnerNotificationMode,
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
  searchParams: Promise<{ partner?: string; token?: string; mode?: string }>
}) {
  const params = await searchParams
  const partnerId = (params.partner || "").trim()
  const token = (params.token || "").trim()
  const requestedMode = params.mode

  const isTokenValid = Boolean(partnerId && verifyPartnerUnsubscribeToken(partnerId, token))

  let partner: {
    id: string
    company_name: string
    email: string
    target_surfaces: string[] | null
  } | null = null

  let currentMode: PartnerNotificationMode = "all"
  let autoAppliedMode: PartnerNotificationMode | null = null

  if (isTokenValid) {
    const admin = createServiceRoleClient()
    const { data } = await admin
      .from("partners")
      .select("id, company_name, email, target_surfaces")
      .eq("id", partnerId)
      .maybeSingle()

    if (data) {
      partner = data
      currentMode = getPartnerNotificationMode(data)

      if (isValidPartnerNotificationMode(requestedMode)) {
        const cleanSurfaces = getCleanTargetSurfaces(data.target_surfaces)
        const encodedSurfaces = applyNotificationModeToSurfaces(cleanSurfaces, requestedMode)
        const baseUpdates = {
          target_surfaces: encodedSurfaces,
          updated_at: new Date().toISOString(),
        }

        const { error: fullErr } = await admin
          .from("partners")
          .update({
            ...baseUpdates,
            email_notifications_enabled: requestedMode !== "none",
            email_relances_enabled: requestedMode === "all",
          })
          .eq("id", data.id)

        if (
          fullErr &&
          (fullErr.code === "42703" ||
            fullErr.message?.includes("email_notifications_enabled") ||
            fullErr.message?.includes("email_relances_enabled"))
        ) {
          await admin.from("partners").update(baseUpdates).eq("id", data.id)
        }

        currentMode = requestedMode
        autoAppliedMode = requestedMode
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
              initialMode={currentMode}
              autoAppliedMode={autoAppliedMode}
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

