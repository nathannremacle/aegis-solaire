import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

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

  return NextResponse.json(data)
}
