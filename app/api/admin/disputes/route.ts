import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { fetchAdminDisputesWithStats } from "@/lib/admin/disputes-data"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  try {
    const disputes = await fetchAdminDisputesWithStats(supabase, 100)
    return NextResponse.json({ disputes })
  } catch {
    return NextResponse.json({ disputes: [] })
  }
}
