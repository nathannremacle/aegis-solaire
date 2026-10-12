import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit-log"

export async function PATCH(req: Request) {
  try {
    const user = await getAdminUser()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    const { ids, updates } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return new NextResponse("Invalid request", { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Validate updates
    const allowedFields = ["status", "marketplace_status", "installateur_id"]
    const filteredUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    const { data, error } = await supabase
      .from("leads")
      .update(filteredUpdates)
      .in("id", ids)
      .select()

    if (error) throw error

    await logAudit({
      adminEmail: user.email!,
      action: "bulk_lead_update",
      entityType: "leads",
      entityId: "multiple",
      details: { count: ids.length, updates: filteredUpdates },
    })

    return NextResponse.json({ message: `${ids.length} leads mis à jour`, data })
  } catch (error) {
    console.error("Bulk update error:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAdminUser()
    if (!user) return new NextResponse("Unauthorized", { status: 401 })

    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return new NextResponse("Invalid request", { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("leads").delete().in("id", ids)

    if (error) throw error

    await logAudit({
      adminEmail: user.email!,
      action: "bulk_lead_delete",
      entityType: "leads",
      entityId: "multiple",
      details: { count: ids.length },
    })

    return NextResponse.json({ message: `${ids.length} leads supprimés` })
  } catch (error) {
    console.error("Bulk delete error:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
