import { NextRequest, NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { setPartnerDisputePrivilege } from "@/lib/partner-dispute-privilege"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const supabase = createServiceRoleClient()

  if (typeof body.disputesSuspended === "boolean") {
    const result = await setPartnerDisputePrivilege({
      supabase,
      partnerId: id,
      suspended: body.disputesSuspended,
      reason:
        typeof body.disputesSuspendedReason === "string"
          ? body.disputesSuspendedReason
          : null,
      adminEmail: user.email || "contact@aegissolaire.com",
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    revalidateTag("admin-badges", "max")
    revalidatePath("/admin/disputes")
    revalidatePath("/admin/partners")
    revalidatePath("/partenaires/dashboard")

    return NextResponse.json({
      success: true,
      partnerId: id,
      ...result.data,
    })
  }

  if (typeof body.addCredits === "number" && body.addCredits > 0) {
    const { data: newCredits, error } = await supabase.rpc("add_credits", {
      p_partner_id: id,
      p_amount: body.addCredits,
      p_type: "adjustment",
      p_reference: body.reference ?? "admin_manual",
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, newCredits })
  }

  const allowed = ["company_name", "email", "phone", "segment", "target_provinces", "target_surfaces", "min_facture"]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("partners")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
