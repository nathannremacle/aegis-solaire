import { NextRequest, NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { sendLeadAssignedEmail } from "@/lib/notify-installateur"
import { logAudit } from "@/lib/audit-log"
import {
  verifyBelgianCompanyCbe,
  verifyEmailDomainMx,
  verifyIdentityIntegrity,
  verifyPhoneIntegrity,
  verifyWalloniaAddressSpw,
} from "@/lib/lead-verification-engine"
import { getBelgiumProvinceKeyFromPostalCode } from "@/lib/belgium-regions"
import { getEmailError, normalizeFrBePhone } from "@/lib/leads-validation"
import { getPrimaryLeadImageItem } from "@/lib/lead-images"

const LEAD_SELECT =
  "id, first_name, last_name, email, phone, job_title, company, company_vat, message, project_details, surface_type, surface_area, estimated_power_kwc, annual_electricity_bill, roof_material, ownership_status, project_timeline, estimated_roi_years, autoconsumption_rate, estimated_savings, status, marketplace_status, credit_cost, lead_score, installateur_id, wants_irve, segment, province, postal_code, city, site_address, grd, media_partner_code, admin_notes, qualification_metadata, created_at"

const VALID_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
  "HOT_LEAD",
  "NEEDS_HUMAN_REVIEW",
] as const

const VALID_MARKETPLACE_STATUSES = [
  "draft",
  "pending_review",
  "available",
  "sold_out",
  "rejected",
] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error?.code === "PGRST116") {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }
    console.error("Admin lead get error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération du lead" }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const {
    status,
    marketplace_status,
    installateur_id: installateurId,
    admin_notes,
    site_address,
    postal_code,
    city,
    province,
    reverify_address,
    first_name,
    last_name,
    email,
    phone,
    job_title,
    company,
    company_vat,
    segment,
  } = body

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  let installateurEmailForNotify: string | null = null

  if (first_name !== undefined) {
    const cleanFirst = String(first_name || "").trim().slice(0, 100)
    if (!cleanFirst) {
      return NextResponse.json({ error: "Le prénom est requis." }, { status: 400 })
    }
    updates.first_name = cleanFirst
  }

  if (last_name !== undefined) {
    updates.last_name = String(last_name || "").trim().slice(0, 100) || null
  }

  if (email !== undefined) {
    const cleanEmail = String(email || "").trim().toLowerCase().slice(0, 180)
    const emailErr = getEmailError(cleanEmail)
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 })
    }
    updates.email = cleanEmail
  }

  if (phone !== undefined) {
    const cleanPhone = String(phone || "").trim().slice(0, 40)
    if (!cleanPhone) {
      updates.phone = null
    } else {
      const normalizedPhone = normalizeFrBePhone(cleanPhone)
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: "Numéro de téléphone belge ou français invalide ou factice." },
          { status: 400 }
        )
      }
      updates.phone = normalizedPhone
    }
  }

  if (job_title !== undefined) {
    updates.job_title = String(job_title || "").trim().slice(0, 100) || "Particulier"
  }

  if (company !== undefined) {
    updates.company = String(company || "").trim().slice(0, 150) || null
  }

  if (company_vat !== undefined) {
    updates.company_vat = String(company_vat || "").trim().slice(0, 40) || null
  }

  if (segment !== undefined && (segment === "B2B" || segment === "B2C")) {
    updates.segment = segment
  }

  const contactEdited =
    first_name !== undefined ||
    last_name !== undefined ||
    email !== undefined ||
    phone !== undefined ||
    job_title !== undefined ||
    company !== undefined ||
    company_vat !== undefined ||
    segment !== undefined

  if (typeof status === "string" && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    updates.status = status
    if (status === "qualified" && !marketplace_status) {
      updates.marketplace_status = "available"
    } else if (status === "lost" && !marketplace_status) {
      updates.marketplace_status = "rejected"
    }
  }

  if (
    typeof marketplace_status === "string" &&
    VALID_MARKETPLACE_STATUSES.includes(
      marketplace_status as (typeof VALID_MARKETPLACE_STATUSES)[number]
    )
  ) {
    updates.marketplace_status = marketplace_status
  }

  if (installateurId !== undefined) {
    if (installateurId === null || installateurId === "") {
      updates.installateur_id = null
    } else if (typeof installateurId === "string" && /^[0-9a-f-]{36}$/i.test(installateurId)) {
      const supabaseCheck = createServiceRoleClient()
      const { data: inst } = await supabaseCheck.from("installateurs").select("id, email").eq("id", installateurId).single()
      if (!inst) {
        return NextResponse.json({ error: "Installateur introuvable." }, { status: 400 })
      }
      updates.installateur_id = installateurId
      installateurEmailForNotify = inst.email ?? null
    } else {
      return NextResponse.json({ error: "installateur_id invalide." }, { status: 400 })
    }
  }

  if (admin_notes !== undefined) {
    if (typeof admin_notes === "string" || admin_notes === null) {
      updates.admin_notes = admin_notes ?? ""
    }
  }

  const supabase = createServiceRoleClient()
  const addressEdited =
    site_address !== undefined ||
    postal_code !== undefined ||
    city !== undefined ||
    province !== undefined

  const reverifyAddress = reverify_address === true && !addressEdited

  if (addressEdited || reverifyAddress || contactEdited) {
    const { data: existing } = await supabase
      .from("leads")
      .select(
        "first_name, last_name, email, phone, company, company_vat, segment, site_address, postal_code, city, province, qualification_metadata"
      )
      .eq("id", id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }

    const existingMeta =
      (existing.qualification_metadata as Record<string, unknown> | null) ?? {}
    const existingVerifs =
      (existingMeta.verifications as Record<string, unknown> | undefined) ?? {}
    const nextVerifs: Record<string, unknown> = { ...existingVerifs }

    if (addressEdited) {
      const nextPostal =
        postal_code !== undefined
          ? String(postal_code || "").replace(/\D/g, "").slice(0, 4) || null
          : existing.postal_code
      if (nextPostal && nextPostal.length !== 4) {
        return NextResponse.json(
          { error: "Le code postal belge doit comporter 4 chiffres." },
          { status: 400 }
        )
      }

      const nextCity =
        city !== undefined
          ? String(city || "").trim().slice(0, 100) || null
          : existing.city
      const nextSiteAddress =
        site_address !== undefined
          ? String(site_address || "").trim().slice(0, 255) || null
          : existing.site_address

      const derivedProvince = nextPostal
        ? getBelgiumProvinceKeyFromPostalCode(nextPostal)
        : null
      const nextProvince =
        province !== undefined
          ? String(province || "").trim() || derivedProvince || existing.province
          : derivedProvince || existing.province

      const spwVerification = await verifyWalloniaAddressSpw({
        postalCode: nextPostal,
        city: nextCity,
        streetAddress: nextSiteAddress,
      })

      updates.postal_code = nextPostal
      updates.city = nextCity || spwVerification.officialSection || spwVerification.officialCity || null
      updates.site_address = nextSiteAddress
      updates.province = nextProvince
      updates.matched_province = nextProvince
      nextVerifs.walloniaAddress = spwVerification
      nextVerifs.addressManuallyCorrectedAt = new Date().toISOString()
      nextVerifs.addressManuallyCorrectedBy = user.email
    } else if (reverifyAddress) {
      const spwVerification = await verifyWalloniaAddressSpw({
        postalCode: existing.postal_code,
        city: existing.city,
        streetAddress: existing.site_address,
      })
      nextVerifs.walloniaAddress = spwVerification
    }

    if (contactEdited) {
      const nextEmail = String((updates.email ?? existing.email) || "")
      const nextPhone = (updates.phone !== undefined ? updates.phone : existing.phone) as string | null
      const nextFirst = String((updates.first_name ?? existing.first_name) || "")
      const nextLast = String((updates.last_name ?? existing.last_name) || "")
      const nextVat = (updates.company_vat !== undefined ? updates.company_vat : existing.company_vat) as string | null
      const nextSegment = String((updates.segment ?? existing.segment) || "B2C")

      const [nextMx, nextCbe] = await Promise.all([
        email !== undefined ? verifyEmailDomainMx(nextEmail) : Promise.resolve(null),
        (company_vat !== undefined || company !== undefined || segment !== undefined) &&
        nextVat &&
        nextSegment === "B2B"
          ? verifyBelgianCompanyCbe(nextVat)
          : Promise.resolve(null),
      ])

      if (nextMx) nextVerifs.emailMx = nextMx
      if (phone !== undefined) nextVerifs.phoneAnalysis = verifyPhoneIntegrity(nextPhone)
      if (first_name !== undefined || last_name !== undefined) {
        nextVerifs.identityAnalysis = verifyIdentityIntegrity({
          firstName: nextFirst,
          lastName: nextLast,
        })
      }
      if (nextCbe) nextVerifs.cbeCompany = nextCbe
      nextVerifs.contactManuallyCorrectedAt = new Date().toISOString()
      nextVerifs.contactManuallyCorrectedBy = user.email
    }

    updates.qualification_metadata = {
      ...existingMeta,
      verifications: nextVerifs,
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select(LEAD_SELECT)
    .single()

  if (error || !data) {
    console.error("Admin lead patch error:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour du lead" }, { status: 500 })
  }

  if (addressEdited || reverifyAddress || contactEdited || status !== undefined || marketplace_status !== undefined) {
    revalidateTag("admin-kpis", "max")
    revalidateTag("admin-badges", "max")
    revalidateTag("marketplace-feed", "max")
    revalidatePath("/admin", "layout")
    revalidatePath("/admin/leads")
    revalidatePath("/partenaires/dashboard")
  }

  let installateur_notified = false
  if (installateurEmailForNotify && data.installateur_id) {
    try {
      await sendLeadAssignedEmail(installateurEmailForNotify, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        job_title: data.job_title,
        company: data.company ?? null,
        surface_type: data.surface_type,
        surface_area: data.surface_area,
        annual_electricity_bill: data.annual_electricity_bill,
        project_timeline: data.project_timeline ?? null,
        estimated_roi_years: data.estimated_roi_years ?? null,
        estimated_savings: data.estimated_savings ?? null,
        roof_image_url: getPrimaryLeadImageItem(data)?.url ?? null,
        roof_image_is_ai_projection: Boolean(getPrimaryLeadImageItem(data)?.isAiProjection),
        message: data.message ?? null,
      })
      installateur_notified = true
    } catch (err) {
      console.error("Notify installateur failed:", err)
    }
  }

  try {
    await logAudit({
      adminEmail: user.email!,
      action: "lead_updated",
      entityType: "lead",
      entityId: id,
      details: {
        status: updates.status,
        marketplace_status: updates.marketplace_status,
        installateur_id: updates.installateur_id,
        admin_notes: updates.admin_notes !== undefined ? true : undefined,
        address_edited: addressEdited || undefined,
        contact_edited: contactEdited || undefined,
        postal_code: addressEdited ? updates.postal_code : undefined,
        city: addressEdited ? updates.city : undefined,
        site_address: addressEdited ? updates.site_address : undefined,
        installateur_notified,
      },
    })
  } catch (auditErr) {
    console.error("Audit log failed:", auditErr)
  }

  return NextResponse.json({ ...data, installateur_notified })
}
