import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  generateDistributorCode,
  listDistributorsWithStats,
  slugifyDistributorName,
} from "@/lib/distributor-partners"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  companyName: z.string().min(2).max(150).transform((s) => s.trim()),
  contactName: z.string().max(150).optional().nullable(),
  contactEmail: z
    .string()
    .email("E-mail invalide")
    .optional()
    .or(z.literal(""))
    .nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  rewardCreditsReferred: z.number().int().min(0).max(20).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { tableMissing, distributors } = await listDistributorsWithStats(supabase)

  return NextResponse.json({
    tableMissing,
    distributors,
  })
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Données invalides" },
      { status: 400 }
    )
  }

  const data = parsed.data
  const supabase = createServiceRoleClient()
  const baseSlug = slugifyDistributorName(data.companyName) || `distributeur-${Date.now()}`
  const referralCode = generateDistributorCode(data.companyName)

  const { data: existingSlug } = await supabase
    .from("distributor_partners")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle()

  const slug = existingSlug ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug

  const { data: inserted, error } = await supabase
    .from("distributor_partners")
    .insert({
      slug,
      company_name: data.companyName,
      contact_name: data.contactName?.trim() || null,
      contact_email: data.contactEmail?.trim().toLowerCase() || null,
      contact_phone: data.contactPhone?.trim() || null,
      referral_code: referralCode,
      reward_credits_referred: data.rewardCreditsReferred ?? 3,
      status: "active",
      notes: data.notes?.trim() || null,
    })
    .select("*")
    .single()

  if (error) {
    console.error("[admin/distributors POST]", error)
    return NextResponse.json(
      {
        error:
          error.code === "42P01"
            ? "Table distributor_partners absente : exécutez la migration 202611270001."
            : error.message || "Erreur création distributeur",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, distributor: inserted })
}
