import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyExpressBuyToken } from "@/lib/express-buy-token"
import { getLeadPricingTierMeta, calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { getPrimaryLeadImageItem } from "@/lib/lead-images"
import { ExpressLeadCheckoutClient } from "@/components/partners/express-lead-checkout-client"

export const dynamic = "force-dynamic"

export default async function ExpressLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>
  searchParams: Promise<{ t?: string; payment?: string; pid?: string; upgraded?: string }>
}) {
  const { leadId } = await params
  const { t, payment, pid, upgraded } = await searchParams

  const tokenPayload = verifyExpressBuyToken(t, leadId)
  if (!tokenPayload) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center flex flex-col gap-3">
          <h1 className="text-lg font-bold text-foreground">Lien d&apos;accès express expiré</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien sécurisé a expiré (validité 72 h) ou est invalide. Connectez-vous à votre espace partenaire pour consulter les chantiers disponibles.
          </p>
          <a
            href="/partenaires/login"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Accéder au Portail Partenaire
          </a>
        </div>
      </main>
    )
  }

  const supabase = createServiceRoleClient()
  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, segment, marketplace_status, credit_cost, max_slots, province, city, postal_code, surface_type, surface_area, annual_electricity_bill, estimated_power_kwc, roof_material, timeframe, project_timeline, last_name, contact_preference, allocation_mode, qualification_metadata, roof_image_url"
    )
    .eq("id", leadId)
    .maybeSingle()

  if (error || !lead) {
    notFound()
  }

  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("id, partner_id, credits_spent, purchased_at, partners(is_test, company_name)")
    .eq("lead_id", leadId)

  const realTaken = (purchases || []).filter((r: any) => {
    const pRel = Array.isArray(r.partners) ? r.partners[0] : r.partners
    return !pRel?.is_test && !pRel?.company_name?.toLowerCase().includes("test")
  }).length

  const maxSlots = typeof lead.max_slots === "number" ? lead.max_slots : lead.segment === "B2B" ? 2 : 3
  const remainingSlots = Math.max(0, maxSlots - realTaken)

  // Résoudre le partenaire (si déjà inscrit)
  let partnerId = pid || tokenPayload.partnerId || null
  let partnerCredits = 0
  let partnerCompany = tokenPayload.rescertCompany || "Installateur RESCERT"
  let partnerVat = tokenPayload.rescertVat || null

  if (partnerId) {
    const { data: pRow } = await supabase
      .from("partners")
      .select("id, company_name, credits")
      .eq("id", partnerId)
      .maybeSingle()
    if (pRow) {
      partnerCredits = Number(pRow.credits || 0)
      partnerCompany = pRow.company_name || partnerCompany
    }
  } else if (tokenPayload.rescertEmail) {
    const { data: pRow } = await supabase
      .from("partners")
      .select("id, company_name, credits")
      .eq("email", tokenPayload.rescertEmail.trim().toLowerCase())
      .maybeSingle()
    if (pRow) {
      partnerId = pRow.id
      partnerCredits = Number(pRow.credits || 0)
      partnerCompany = pRow.company_name || partnerCompany
    }
  }

  const existingPurchase = partnerId
    ? (purchases || []).find((p: any) => p.partner_id === partnerId)
    : null

  const tierMeta = getLeadPricingTierMeta(lead)
  const fin = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea: lead.surface_area,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: lead.annual_electricity_bill,
    creditCost: tierMeta.credits,
    timeframe: lead.timeframe || lead.project_timeline,
    qualificationMetadata: (lead.qualification_metadata as Record<string, unknown>) || null,
  })

  const imageUrl = getPrimaryLeadImageItem(lead)?.url || lead.roof_image_url || null

  return (
    <ExpressLeadCheckoutClient
      lead={{
        id: lead.id,
        segment: lead.segment || "B2C",
        city: lead.city || getProvinceDisplayLabel(lead.province || ""),
        postalCode: lead.postal_code || "",
        provinceLabel: getProvinceDisplayLabel(lead.province || ""),
        maskedLastName: lead.last_name ? `****** ${lead.last_name}` : "****** (Propriétaire vérifié)",
        surfaceType: lead.surface_type || "toiture",
        surfaceArea: Number(lead.surface_area || 0),
        roofMaterial: lead.roof_material || "Tuiles",
        annualBill: Number(lead.annual_electricity_bill || 0),
        estimatedPowerKwc: Number(lead.estimated_power_kwc || fin.estimatedPowerKwc),
        estimatedContractMin: fin.estimatedContractValueRange.min,
        estimatedContractMax: fin.estimatedContractValueRange.max,
        estimatedMargin: fin.estimatedInstallerMargin,
        contactPreference: lead.contact_preference || "written_first",
        allocationMode: lead.allocation_mode || "shared_3",
        marketplaceStatus: lead.marketplace_status || "available",
        maxSlots,
        takenSlots: realTaken,
        remainingSlots,
        imageUrl,
        credits: tierMeta.credits,
        directPriceHtva: tierMeta.directPriceHtva,
        exclusiveCredits: tierMeta.exclusiveCreditCost,
        exclusivePriceHtva: tierMeta.exclusivePriceHtva,
      }}
      partner={{
        id: partnerId,
        companyName: partnerCompany,
        vat: partnerVat,
        credits: partnerCredits,
        distanceKm: tokenPayload.distanceKm ?? null,
      }}
      token={t || ""}
      isPaymentReturn={payment === "return"}
      isUpgraded={upgraded === "1"}
      initialPurchaseId={existingPurchase?.id || null}
    />
  )
}
