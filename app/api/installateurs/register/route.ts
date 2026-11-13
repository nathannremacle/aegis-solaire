import { NextRequest, NextResponse } from "next/server"
import { installerRegistrationSchema } from "@/lib/installer-registration-schema"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { generateInstallerVerificationToken } from "@/lib/installer-verification"
import {
  buildInstallerWelcomeVerificationEmail,
  getSiteBaseUrl,
  sendInstallerEmail,
} from "@/lib/installer-welcome-emails"
import {
  buildPartnerPasswordResetEmail,
  ensurePartnerAuthAccount,
  generatePartnerPasswordSetupUrl,
} from "@/lib/partner-auth-onboarding"

function mergeAdminNotes(existing: string | null | undefined, incomingParts: string[]): string | null {
  const parts = existing
    ? existing
        .split(" | ")
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  for (const part of incomingParts) {
    const cleanPart = part.trim()
    if (cleanPart && !parts.some((p) => p === cleanPart)) {
      parts.push(cleanPart)
    }
  }
  return parts.length > 0 ? parts.join(" | ") : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parseResult = installerRegistrationSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.flatten().fieldErrors
      const message =
        firstError.companyName?.[0] ??
        firstError.siret?.[0] ??
        firstError.firstName?.[0] ??
        firstError.lastName?.[0] ??
        firstError.jobTitle?.[0] ??
        firstError.email?.[0] ??
        firstError.phone?.[0] ??
        firstError.rescertPhotovoltaicRef?.[0] ??
        firstError.rescertPhotovoltaicConfirmed?.[0] ??
        firstError.regions?.[0] ??
        "Données invalides. Vérifiez les champs."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parseResult.data
    const cleanEmail = data.email.toLowerCase().trim()
    const supabase = createServiceRoleClient()
    const baseUrl = getSiteBaseUrl(request.nextUrl.origin)

    const incomingNotesParts = [
      data.invitedBy ? `⭐ INVITATION VIP PAR: ${data.invitedBy}` : null,
      data.leadId ? `🎯 CHANTIER CIBLE: ${data.leadId}` : null,
      data.targetSegment ? `Segments cibles: ${data.targetSegment}` : null,
      data.powerCapacity ? `Capacité: ${data.powerCapacity}` : null,
    ].filter((v): v is string => Boolean(v))

    // Vérifie si un compte partenaire actif ou une candidature existe déjà pour cette adresse
    const [{ data: existingPartner }, { data: existingApps }] = await Promise.all([
      supabase
        .from("partners")
        .select("id, company_name, email")
        .eq("email", cleanEmail)
        .maybeSingle(),
      supabase
        .from("installer_applications")
        .select("id, email, company_name, first_name, last_name, status, admin_notes, created_at")
        .eq("email", cleanEmail)
        .order("created_at", { ascending: false }),
    ])

    const approvedApp = existingApps?.find((a) => a.status === "approved")

    // Cas 1 : l'entreprise est déjà validée — ne jamais repasser le dossier en attente
    if (existingPartner?.id || approvedApp) {
      const resolvedCompany =
        existingPartner?.company_name || approvedApp?.company_name || data.companyName.trim()

      // Conserve l'intérêt éventuel pour un chantier cible VIP sans créer de doublon
      if (approvedApp && data.leadId && !approvedApp.admin_notes?.includes(data.leadId)) {
        const mergedApprovedNotes = mergeAdminNotes(approvedApp.admin_notes, [
          `🎯 CHANTIER CIBLE: ${data.leadId}`,
        ])
        await supabase
          .from("installer_applications")
          .update({ admin_notes: mergedApprovedNotes })
          .eq("id", approvedApp.id)
      }

      if (existingPartner?.id) {
        try {
          await ensurePartnerAuthAccount(supabase, {
            email: cleanEmail,
            companyName: resolvedCompany,
            partnerId: existingPartner.id,
          })
          const nextPath = data.leadId
            ? `/partenaires/dashboard?lead=${encodeURIComponent(data.leadId)}`
            : "/partenaires/dashboard"
          const setupUrl = await generatePartnerPasswordSetupUrl(supabase, {
            email: cleanEmail,
            baseUrl,
            nextPath,
          })
          if (setupUrl) {
            const resetPayload = buildPartnerPasswordResetEmail({
              companyName: resolvedCompany,
              setupUrl,
            })
            const resetRes = await sendInstallerEmail({
              to: cleanEmail,
              subject: resetPayload.subject,
              html: resetPayload.html,
              text: resetPayload.text,
              tag: "partner-already-approved-reapply",
            })
            if (!resetRes.success) {
              console.error("[installer register] Échec envoi lien reset déjà approuvé:", resetRes.error)
            }
          }
        } catch (authErr) {
          console.error("[installer register] alreadyApproved onboarding warning:", authErr)
        }
      }

      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        applicationId: approvedApp?.id ?? null,
        email: cleanEmail,
        companyName: resolvedCompany,
        message:
          "Votre compte partenaire est déjà validé sur Aegis Solaire ! Un lien sécurisé vient de vous être envoyé par e-mail pour définir votre mot de passe et accéder directement à la Marketplace.",
      })
    }

    // Cas 2 : une candidature en attente existe déjà — mise à jour propre sans doublon
    const existingPending = existingApps?.find((a) => a.status === "pending")
    let targetApp: {
      id: string
      email: string
      company_name: string
      first_name: string
      last_name: string
    } | null = null

    if (existingPending) {
      const mergedNotes = mergeAdminNotes(existingPending.admin_notes, incomingNotesParts)
      const { data: updatedApp, error: updateError } = await supabase
        .from("installer_applications")
        .update({
          company_name: data.companyName.trim(),
          siret: data.siret.trim(),
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          job_title: data.jobTitle.trim(),
          phone: data.phone.trim(),
          rescert_ref: data.rescertPhotovoltaicRef.trim(),
          regions: data.regions,
          admin_notes: mergedNotes,
        })
        .eq("id", existingPending.id)
        .select("id, email, company_name, first_name, last_name")
        .single()

      if (updateError || !updatedApp) {
        console.error("[installer register] DB update error:", updateError)
        return NextResponse.json(
          { error: "Une erreur est survenue lors de la mise à jour. Veuillez réessayer." },
          { status: 500 }
        )
      }
      targetApp = updatedApp
    } else {
      // Cas 3 : nouvelle candidature
      const adminNotes = mergeAdminNotes(null, incomingNotesParts)
      const { data: insertedApp, error } = await supabase
        .from("installer_applications")
        .insert({
          company_name: data.companyName.trim(),
          siret: data.siret.trim(),
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          job_title: data.jobTitle.trim(),
          email: cleanEmail,
          phone: data.phone.trim(),
          rescert_ref: data.rescertPhotovoltaicRef.trim(),
          regions: data.regions,
          admin_notes: adminNotes,
          status: "pending",
        })
        .select("id, email, company_name, first_name, last_name")
        .single()

      if (error || !insertedApp) {
        console.error("[installer register] DB error:", error)
        return NextResponse.json(
          { error: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer." },
          { status: 500 }
        )
      }
      targetApp = insertedApp
    }

    // Génération du lien de validation d'email sur l'URL canonique
    const verificationToken = generateInstallerVerificationToken(
      targetApp.id,
      targetApp.email
    )
    const verificationUrl = `${baseUrl}/api/installateurs/verify-email?id=${encodeURIComponent(
      targetApp.id
    )}&token=${encodeURIComponent(verificationToken)}`

    // Construction et expédition de l'email de bienvenue + vérification
    const emailPayload = buildInstallerWelcomeVerificationEmail({
      applicationId: targetApp.id,
      firstName: targetApp.first_name,
      lastName: targetApp.last_name,
      companyName: targetApp.company_name,
      email: targetApp.email,
      verificationUrl,
      baseUrl,
    })

    // Envoi synchrone avant la réponse pour garantir la livraison en serverless (Vercel)
    const emailRes = await sendInstallerEmail({
      to: targetApp.email,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      tag: "installer-welcome-verification",
    })
    if (!emailRes.success) {
      console.error("[installer register] Échec envoi email de vérification:", emailRes.error)
    }

    return NextResponse.json({
      success: true,
      alreadyApproved: false,
      applicationId: targetApp.id,
      message:
        "Votre demande a bien été envoyée. Un e-mail de confirmation vient de vous être envoyé pour valider votre adresse e-mail.",
    })
  } catch (error) {
    console.error("Installateur register API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
