import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  status: z.enum(["active", "paused"]).optional(),
  companyName: z.string().min(2).max(150).optional(),
  contactName: z.string().max(150).nullable().optional(),
  contactEmail: z.string().email().nullable().optional().or(z.literal("")),
  contactPhone: z.string().max(50).nullable().optional(),
  rewardCreditsReferred: z.number().int().min(0).max(20).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 })
  }

  const d = parsed.data
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (d.status) updates.status = d.status
  if (d.companyName !== undefined) updates.company_name = d.companyName.trim()
  if (d.contactName !== undefined) updates.contact_name = d.contactName?.trim() || null
  if (d.contactEmail !== undefined) {
    updates.contact_email = d.contactEmail ? d.contactEmail.trim().toLowerCase() : null
  }
  if (d.contactPhone !== undefined) updates.contact_phone = d.contactPhone?.trim() || null
  if (d.rewardCreditsReferred !== undefined) {
    updates.reward_credits_referred = d.rewardCreditsReferred
  }
  if (d.notes !== undefined) updates.notes = d.notes?.trim() || null

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("distributor_partners")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, distributor: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("distributor_partners").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
