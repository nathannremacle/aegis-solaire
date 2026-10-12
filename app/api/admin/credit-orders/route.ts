import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  try {
    const { data: orders, error } = await supabase
      .from("credit_orders")
      .select(`
        id,
        partner_id,
        pack_id,
        pack_name,
        credits,
        price_htva,
        vat_amount,
        price_ttc,
        transfer_reference,
        status,
        created_at,
        validated_at,
        notes,
        partners (
          id,
          company_name,
          email,
          phone,
          credits
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      // Si la table n'existe pas encore
      if (error.code === "42P01") {
        return NextResponse.json([])
      }
      console.error("[admin/credit-orders] query error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(orders ?? [])
  } catch (err: any) {
    console.error("[admin/credit-orders] unexpected error:", err)
    return NextResponse.json([])
  }
}
