import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("installer_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[admin/applications] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
