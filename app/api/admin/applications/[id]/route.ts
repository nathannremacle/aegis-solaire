import { NextRequest, NextResponse } from "next/server"
import { revalidateTag, revalidatePath } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type ApplicationRow = {
  id: string
  company_name: string
  siret: string
  first_name: string
  last_name: string
  job_title: string
  email: string
  phone: string
  rescert_ref: string
  regions: string[]
  admin_notes: string | null
}

/**
 * À l'approbation : crée ou met à jour un installateur (liste /admin/installateurs)
 * pour assignation des leads simulateur, etc.
 */
async function syncInstallateurFromApplication(
  supabase: ReturnType<typeof createServiceRoleClient>,
  app: ApplicationRow
) {
  const email = app.email.toLowerCase().trim()
  const regionStr =
    Array.isArray(app.regions) && app.regions.length > 0
      ? app.regions.join(", ").slice(0, 255)
      : null
  const notesParts = [
    `Candidature approuvée — ref. ${app.id}`,
    `Contact : ${app.first_name} ${app.last_name} — ${app.job_title}`,
    `BCE/KBO : ${app.siret}`,
    `RESCERT PV : ${app.rescert_ref}`,
  ]
  if (app.admin_notes?.trim()) notesParts.push(`Notes admin : ${app.admin_notes.trim()}`)
  const notes = notesParts.join("\n").slice(0, 2000)

  const payload = {
    name: app.company_name.trim().slice(0, 255),
    email,
    phone: app.phone?.trim().slice(0, 50) || null,
    region: regionStr,
    actif: true,
    notes,
  }

  const { data: existing } = await supabase.from("installateurs").select("id").eq("email", email).maybeSingle()

  if (existing?.id) {
    const { error } = await supabase.from("installateurs").update(payload).eq("id", existing.id)
    if (error) throw error
    return { created: false, installateurId: existing.id }
  }

  const { data: inserted, error } = await supabase.from("installateurs").insert(payload).select("id").single()
  if (error) {
    if (error.code === "23505") {
      const { data: row } = await supabase.from("installateurs").select("id").eq("email", email).maybeSingle()
      if (row?.id) {
        await supabase.from("installateurs").update(payload).eq("id", row.id)
        return { created: false, installateurId: row.id }
      }
    }
    throw error
  }
  return { created: true, installateurId: inserted?.id }
}

async function syncPartnerFromApplication(
  supabase: ReturnType<typeof createServiceRoleClient>,
  app: ApplicationRow
) {
  const email = app.email.toLowerCase().trim()
  const targetProvinces = Array.isArray(app.regions) && app.regions.length > 0 ? app.regions : null

  const { data: existing } = await supabase
    .from("partners")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existing?.id) {
    if (targetProvinces) {
      await supabase
        .from("partners")
        .update({ target_provinces: targetProvinces })
        .eq("id", existing.id)
    }
    return { created: false, partnerId: existing.id }
  }

  // Vérifier si des crédits d'accueil / invitation ont été explicitement offerts dans admin_notes
  let initialCredits = 0
  const match = app.admin_notes?.match(/(\d+)\s*crédits?\s*offerts?/i)
  if (match) {
    initialCredits = parseInt(match[1], 10) || 0
  }

  const { data: inserted, error } = await supabase
    .from("partners")
    .insert({
      company_name: app.company_name.trim().slice(0, 255),
      email,
      phone: app.phone?.trim().slice(0, 50) || null,
      credits: 0,
      segment: "BOTH",
      target_provinces: targetProvinces,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      const { data: row } = await supabase.from("partners").select("id").eq("email", email).maybeSingle()
      if (row?.id) return { created: false, partnerId: row.id }
    }
    throw error
  }

  if (inserted?.id && initialCredits > 0) {
    const { error: creditRpcErr } = await supabase.rpc("add_credits", {
      p_partner_id: inserted.id,
      p_amount: initialCredits,
      p_type: "adjustment",
      p_reference: "Bienvenue Partenaire Privilégié (crédits d'accueil offerts)",
    })
    if (creditRpcErr) {
      console.error("[syncPartnerFromApplication] add_credits error:", creditRpcErr)
    }
  }

  return { created: true, partnerId: inserted?.id }
}

import {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const supabase = createServiceRoleClient()

  const updates: Record<string, unknown> = {}
  if (body.status && ["pending", "approved", "rejected"].includes(body.status)) {
    updates.status = body.status
    if (body.status !== "pending") {
      updates.reviewed_at = new Date().toISOString()
    }
  }
  if (typeof body.admin_notes === "string") {
    updates.admin_notes = body.admin_notes
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("installer_applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[admin/applications/PATCH]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let installateurSync: { created: boolean; installateurId?: string } | null = null
  let partnerSync: { created: boolean; partnerId?: string } | null = null
  let marketplaceEmailSent = false
  let availableLeads: AvailableLeadSummary[] = []

  if (data.status === "approved") {
    const app = data as ApplicationRow
    try {
      installateurSync = await syncInstallateurFromApplication(supabase, app)
    } catch (e) {
      console.error("[admin/applications] sync installateur:", e)
      return NextResponse.json(
        {
          error:
            "Candidature mise à jour mais échec de la création de l'installateur (vérifiez l'email unique ou les logs).",
          application: data,
        },
        { status: 500 }
      )
    }

    try {
      partnerSync = await syncPartnerFromApplication(supabase, app)
    } catch (e) {
      console.error("[admin/applications] sync partner:", e)
    }

    const partnerId = partnerSync?.partnerId

    if (partnerId) {
      try {
        const { data: fullPartner } = await supabase
          .from("partners")
          .select("id, email, credits, segment, target_provinces, target_surfaces, min_facture")
          .eq("id", partnerId)
          .maybeSingle()

        if (fullPartner) {
          availableLeads = await getAvailableMatchingLeadsForPartner(supabase, fullPartner, 3)
        }
      } catch (leadsErr) {
        console.error("[admin/applications] Échec recherche leads de rattrapage:", leadsErr)
      }
    }

    // Envoi de l'e-mail de bienvenue sur la Marketplace (avec rattrapage des leads chauds)
    try {
      const baseUrl = getSiteBaseUrl(request.nextUrl.origin)
      const targetLeadId = extractTargetLeadIdFromAdminNotes(app.admin_notes)
      const dashboardPath = targetLeadId
        ? `/partenaires/dashboard?lead=${encodeURIComponent(targetLeadId)}`
        : "/partenaires/dashboard"
      const marketplaceUrl = `${baseUrl}${dashboardPath}`
      const closedTargetLead =
        targetLeadId && isShowcaseOnlyLeadId(targetLeadId)
          ? getRegionalLeadSummary(targetLeadId)
          : null

      let setupPasswordUrl: string | null = null
      try {
        await ensurePartnerAuthAccount(supabase, {
          email: app.email,
          companyName: app.company_name,
          partnerId,
        })
        setupPasswordUrl = await generatePartnerPasswordSetupUrl(supabase, {
          email: app.email,
          baseUrl,
          nextPath: dashboardPath,
        })
      } catch (authErr) {
        console.error("[admin/applications] auth onboarding warning:", authErr)
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
        tag: "installer-marketplace-welcome",
      })
      marketplaceEmailSent = sendRes.success

      // Journalisation dans lead_relance_dispatches pour ces leads disponibles
      if (sendRes.success && partnerId && availableLeads.length > 0) {
        try {
          await recordCatchUpDispatches(
            supabase,
            { id: partnerId, email: app.email },
            availableLeads,
            emailPayload.subject
          )
        } catch (dispatchErr) {
          console.warn("[admin/applications] recordCatchUpDispatches error:", dispatchErr)
        }
      }
    } catch (mailErr) {
      console.error("[admin/applications] Échec envoi email marketplace:", mailErr)
    }
  }

  revalidateTag("admin-badges", "max")
  revalidateTag("admin-kpis", "max")
  revalidatePath("/admin", "layout")

  return NextResponse.json({
    ...data,
    installateurSync,
    partnerSync,
    marketplaceEmailSent,
    availableLeadsCount: availableLeads.length,
  })
}

