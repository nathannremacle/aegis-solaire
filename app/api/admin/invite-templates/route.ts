import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const user = await getAdminUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("admin_invite_templates")
      .select("tone, subject, body, updated_at")

    if (error) {
      // Si la table n'est pas encore créée en local ou en distant, on renvoie une liste vide
      console.warn("[invite-templates] DB query notice:", error.message)
      return NextResponse.json({ templates: {} })
    }

    const templates: Record<string, { subject: string; body: string; updatedAt: string }> = {}
    for (const row of data || []) {
      templates[row.tone] = {
        subject: row.subject,
        body: row.body,
        updatedAt: row.updated_at,
      }
    }

    return NextResponse.json({ templates })
  } catch (err: any) {
    console.error("[invite-templates GET] Error:", err)
    return NextResponse.json({ templates: {} })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { tone, subject, body: templateBody } = body

    if (!tone || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Le ton, l'objet et le corps du modèle sont requis" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from("admin_invite_templates")
      .upsert(
        {
          tone,
          subject,
          body: templateBody,
          updated_at: now,
        },
        { onConflict: "tone" }
      )

    if (error) {
      console.warn("[invite-templates POST] DB warning:", error.message)
      // Même si la table Supabase n'est pas encore migrée, on renvoie le statut pour ne pas bloquer l'UI
      return NextResponse.json({
        success: true,
        dbSaved: false,
        tone,
        updatedAt: now,
      })
    }

    return NextResponse.json({
      success: true,
      dbSaved: true,
      tone,
      updatedAt: now,
    })
  } catch (err: any) {
    console.error("[invite-templates POST] Error:", err)
    return NextResponse.json({ success: true, dbSaved: false })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAdminUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tone = searchParams.get("tone")

    if (!tone) {
      return NextResponse.json({ error: "Le ton est requis" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    await supabase.from("admin_invite_templates").delete().eq("tone", tone)

    return NextResponse.json({ success: true, deletedTone: tone })
  } catch (err: any) {
    console.error("[invite-templates DELETE] Error:", err)
    return NextResponse.json({ success: true })
  }
}
