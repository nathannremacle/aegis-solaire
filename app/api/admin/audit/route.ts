import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50", 10)))

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, admin_email, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Admin audit log error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des logs" }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [] })
}
