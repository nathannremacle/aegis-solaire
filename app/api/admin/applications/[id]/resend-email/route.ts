import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { generateInstallerVerificationToken } from "@/lib/installer-verification"
import {
  buildInstallerWelcomeVerificationEmail,
  buildInstallerMarketplaceWelcomeEmail,
  getSiteBaseUrl,
  sendInstallerEmail,
} from "@/lib/installer-welcome-emails"
import {
  ensurePartnerAuthAccount,
  generatePartnerPasswordSetupUrl,
} from "@/lib/partner-auth-onboarding"
import {
  getAvailableMatchingLeadsForPartner,
  recordCatchUpDispatches,
  type AvailableLeadSummary,
} from "@/lib/lead-relance-engine"
import {
  extractTargetLeadIdFromAdminNotes,
  getRegionalLeadSummary,
  isShowcaseOnlyLeadId,
} from "@/lib/regional-leads-catalog"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const type = body.type || "marketplace" // 'verification' | 'marketplace'

    const supabase = createServiceRoleClient()
    const { data: app, error } = await supabase
      .from("installer_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error || !app) {
      return NextResponse.json({ error: "Candidature introuvable." }, { status: 404 })
    }

    const baseUrl = getSiteBaseUrl(request.nextUrl.origin)

    if (type === "verification") {
      const verificationToken = generateInstallerVerificationToken(app.id, app.email)
      const verificationUrl = `${baseUrl}/api/installateurs/verify-email?id=${encodeURIComponent(
        app.id
      )}&token=${encodeURIComponent(verificationToken)}`

      const emailPayload = buildInstallerWelcomeVerificationEmail({
        applicationId: app.id,
        firstName: app.first_name,
        lastName: app.last_name,
        companyName: app.company_name,
        email: app.email,
        verificationUrl,
      })

      const sendRes = await sendInstallerEmail({
        to: app.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        tag: "installer-welcome-verification-resend",
      })

      return NextResponse.json({
        success: sendRes.success,
        simulated: sendRes.simulated,
        type: "verification",
        recipient: app.email,
        message: "E-mail de vérification réexpédié avec succès.",
      })
    } else {
      const targetLeadId = extractTargetLeadIdFromAdminNotes(app.admin_notes)
      const dashboardPath = targetLeadId
        ? `/partenaires/dashboard?lead=${encodeURIComponent(targetLeadId)}`
        : "/partenaires/dashboard"
      const marketplaceUrl = `${baseUrl}${dashboardPath}`
      const closedTargetLead =
        targetLeadId && isShowcaseOnlyLeadId(targetLeadId)
          ? getRegionalLeadSummary(targetLeadId)
          : null

      let availableLeads: AvailableLeadSummary[] = []
      const { data: partner } = await supabase
        .from("partners")
        .select("id, email, credits, segment, target_provinces, target_surfaces, min_facture")
        .eq("email", app.email.toLowerCase().trim())
        .maybeSingle()

      if (partner) {
        try {
          availableLeads = await getAvailableMatchingLeadsForPartner(supabase, partner, 3)
        } catch (leadsErr) {
          console.error("[resend-email] Échec recherche leads:", leadsErr)
        }
      }

      let setupPasswordUrl: string | null = null
      try {
        await ensurePartnerAuthAccount(supabase, {
          email: app.email,
          companyName: app.company_name,
          partnerId: partner?.id,
        })
        setupPasswordUrl = await generatePartnerPasswordSetupUrl(supabase, {
          email: app.email,
          baseUrl,
          nextPath: dashboardPath,
        })
      } catch (authErr) {
        console.error("[resend-email] auth onboarding warning:", authErr)
      }

      const emailPayload = buildInstallerMarketplaceWelcomeEmail({
        applicationId: app.id,
        firstName: app.first_name,
        lastName: app.last_name,
        companyName: app.company_name,
        email: app.email,
        rescertRef: app.rescert_ref,
        marketplaceUrl,
        setupPasswordUrl,
        availableLeads,
        closedTargetLead,
      })

      const sendRes = await sendInstallerEmail({
        to: app.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        tag: "installer-marketplace-welcome-resend",
      })

      if (sendRes.success && partner && availableLeads.length > 0) {
        try {
          await recordCatchUpDispatches(
            supabase,
            { id: partner.id, email: app.email },
            availableLeads,
            emailPayload.subject
          )
        } catch (dispatchErr) {
          console.warn("[admin/applications/resend-email] recordCatchUpDispatches error:", dispatchErr)
        }
      }

      return NextResponse.json({
        success: sendRes.success,
        simulated: sendRes.simulated,
        type: "marketplace",
        recipient: app.email,
        availableLeadsCount: availableLeads.length,
        message:
          availableLeads.length > 0
            ? `E-mail de bienvenue Marketplace réexpédié avec ${availableLeads.length} dossier(s) disponible(s).`
            : "E-mail de bienvenue Marketplace réexpédié avec succès.",
      })
    }
  } catch (err: any) {
    console.error("[resend-email API error]:", err)
    return NextResponse.json(
      { error: err.message || "Erreur lors du renvoi de l'e-mail." },
      { status: 500 }
    )
  }
}
