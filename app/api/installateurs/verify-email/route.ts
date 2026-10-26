import { NextRequest, NextResponse } from "next/server"
import {
  verifyInstallerVerificationToken,
  recordInstallerEmailVerified,
} from "@/lib/installer-verification"
import { createServiceRoleClient } from "@/lib/supabase/admin"

function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim() || ""
  const token = searchParams.get("token")?.trim() || ""
  const origin =
    request.nextUrl.origin && !request.nextUrl.origin.includes("localhost:0")
      ? request.nextUrl.origin
      : getSiteBaseUrl()
  const baseUrl = origin

  if (!id || !token) {
    return NextResponse.redirect(
      new URL("/partenaires/verification?status=invalid_params", baseUrl)
    )
  }

  const supabase = createServiceRoleClient()
  const { data: app, error } = await supabase
    .from("installer_applications")
    .select("id, email, company_name, first_name")
    .eq("id", id)
    .maybeSingle()

  if (error || !app) {
    return NextResponse.redirect(
      new URL("/partenaires/verification?status=not_found", baseUrl)
    )
  }

  const isValid = verifyInstallerVerificationToken(app.id, app.email, token)
  if (!isValid) {
    return NextResponse.redirect(
      new URL("/partenaires/verification?status=invalid_token", baseUrl)
    )
  }

  // Enregistre la vérification
  await recordInstallerEmailVerified(app.id)

  const successUrl = new URL("/partenaires/verification", baseUrl)
  successUrl.searchParams.set("status", "success")
  successUrl.searchParams.set("email", app.email)
  successUrl.searchParams.set("company", app.company_name)
  if (app.first_name) successUrl.searchParams.set("name", app.first_name)

  return NextResponse.redirect(successUrl)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, token } = body

    if (!id || !token) {
      return NextResponse.json(
        { error: "Identifiant et jeton requis." },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const { data: app, error } = await supabase
      .from("installer_applications")
      .select("id, email, company_name, first_name")
      .eq("id", id)
      .maybeSingle()

    if (error || !app) {
      return NextResponse.json(
        { error: "Candidature introuvable." },
        { status: 404 }
      )
    }

    const isValid = verifyInstallerVerificationToken(app.id, app.email, token)
    if (!isValid) {
      return NextResponse.json(
        { error: "Jeton de validation expiré ou invalide." },
        { status: 403 }
      )
    }

    const result = await recordInstallerEmailVerified(app.id)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de la validation." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Adresse e-mail vérifiée avec succès.",
      email: app.email,
      company: app.company_name,
    })
  } catch (err: any) {
    console.error("[verify-email API error]:", err)
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la vérification." },
      { status: 500 }
    )
  }
}
