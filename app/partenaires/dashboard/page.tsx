import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getPartner } from "@/lib/partner-auth"
import { isPartnerEmailVerified } from "@/lib/installer-verification"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { PartnerDashboardShell } from "@/components/partners/dashboard/partner-dashboard-shell"
import { PartnerDashboardSkeleton } from "@/components/partners/dashboard/partner-dashboard-skeleton"

export const dynamic = "force-dynamic"

interface PartnerDashboardPageProps {
  searchParams?: Promise<{ lead?: string; asPartner?: string }>
}

export default async function PartnerDashboardPage({ searchParams }: PartnerDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const targetLeadId = resolvedSearchParams.lead?.trim() || null

  let partner = await getPartner()

  // En environnement de développement, permet de simuler un partenaire/candidat spécifique via ?asPartner=email
  if (process.env.NODE_ENV === "development" && resolvedSearchParams.asPartner) {
    const admin = createServiceRoleClient()
    const targetEmail = resolvedSearchParams.asPartner.toLowerCase().trim()
    const { data: matchedPartner } = await admin
      .from("partners")
      .select("*")
      .eq("email", targetEmail)
      .maybeSingle()

    if (matchedPartner) {
      partner = matchedPartner as any
    } else {
      const { data: matchedApp } = await admin
        .from("installer_applications")
        .select("*")
        .eq("email", targetEmail)
        .maybeSingle()

      if (matchedApp) {
        partner = {
          id: matchedApp.id,
          company_name: matchedApp.company_name,
          email: matchedApp.email,
          phone: matchedApp.phone,
          credits: 0,
          segment: "BOTH",
          target_provinces: matchedApp.regions,
          target_surfaces: null,
          min_facture: 0,
          auth_user_id: null,
          created_at: matchedApp.created_at,
          updated_at: matchedApp.created_at,
        } as any
      }
    }
  }

  if (!partner) {
    const returnUrl = targetLeadId
      ? `/partenaires/dashboard?lead=${encodeURIComponent(targetLeadId)}`
      : "/partenaires/dashboard"
    redirect(`/partenaires/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  // Contrôle d'accès strict : accès marketplace bloqué tant que l'email n'est pas validé
  const emailVerified = await isPartnerEmailVerified(partner.email)
  if (!emailVerified) {
    redirect(
      `/partenaires/verification-requise?email=${encodeURIComponent(
        partner.email
      )}&company=${encodeURIComponent(partner.company_name)}`
    )
  }

  return (
    <Suspense fallback={<PartnerDashboardSkeleton />}>
      <PartnerDashboardLoader
        partnerId={partner.id}
        partnerRow={partner}
        targetLeadId={targetLeadId}
      />
    </Suspense>
  )
}

async function PartnerDashboardLoader({
  partnerId,
  partnerRow,
  targetLeadId,
}: {
  partnerId: string
  partnerRow: any
  targetLeadId?: string | null
}) {
  const admin = createServiceRoleClient()

  let initialPartner = partnerRow
  let initialMarketplace: any[] = []
  let initialPortfolio: any[] = []

  let rpcSuccess = false
  // 1. Appel de la RPC atomique get_partner_dashboard_init
  try {
    const { data: initPayload, error: rpcErr } = await admin.rpc(
      "get_partner_dashboard_init",
      { p_partner_id: partnerId }
    )

    if (!rpcErr && initPayload) {
      const feed = initPayload.marketplace || []
      // Si la RPC active ne retourne pas encore 'city', basculer sur la requête riche
      if (feed.length === 0 || feed[0].city !== undefined) {
        initialPartner = initPayload.partner || initialPartner
        initialMarketplace = feed
        initialPortfolio = initPayload.portfolio || []
        rpcSuccess = true
      }
    }
  } catch (e) {
    console.warn("[partner-dashboard] RPC fallback to server queries:", e)
  }

  if (!rpcSuccess) {
    // 2. Fallback résilient côté serveur si la migration SQL est en attente
    const [marketRes, purchasesRes, partnerCurrentRes] = await Promise.all([
      admin
        .from("leads")
        .select(`
          id, segment, province, city, postal_code, site_address, surface_type, surface_area, surface_area_m2,
          annual_electricity_bill, annual_bill_eur, estimated_power_kwc, roof_material, ownership_status,
          timeframe, project_timeline, project_driver, project_details, message, first_name, last_name,
          credit_cost, marketplace_status, created_at, grd, estimated_roi_years, estimated_savings,
          wants_irve, lead_score,
          lead_purchases(id, partner_id, purchased_at, partners(id, company_name, email, is_test))
        `)
        .eq("marketplace_status", "available")
        .order("created_at", { ascending: false })
        .limit(60),
      admin
        .from("lead_purchases")
        .select("id, credits_spent, purchased_at, pipeline_status, notes, next_action_at, leads(id, first_name, last_name, email, phone, company, company_vat, province, city, segment, surface_type, surface_area, annual_electricity_bill, postal_code, lead_score)")
        .eq("partner_id", partnerId)
        .order("purchased_at", { ascending: false }),
      admin
        .from("partners")
        .select("id, company_name, email, phone, credits, segment, target_provinces")
        .eq("id", partnerId)
        .single(),
    ])

    if (partnerCurrentRes.data) {
      initialPartner = { ...partnerRow, ...partnerCurrentRes.data }
    }

    const myPurchases = purchasesRes.data ?? []
    const myPurchasedLeadIds = new Set(myPurchases.map((p: any) => p.leads?.id).filter(Boolean))

    initialPortfolio = myPurchases
      .filter((p: any) => Boolean(p.leads))
      .map((p: any) => ({
        purchase_id: p.id,
        purchased_at: p.purchased_at,
        credits_spent: p.credits_spent,
        pipeline_status: p.pipeline_status || "to_contact",
        notes: p.notes,
        next_action_at: p.next_action_at,
        ...p.leads,
      }))

    initialMarketplace = (marketRes.data ?? [])
      .filter((l: any) => !myPurchasedLeadIds.has(l.id))
      .map((l: any) => {
        const maxSlots = l.segment === "B2B" ? 1 : 3
        const realPurchases = (Array.isArray(l.lead_purchases) ? l.lead_purchases : []).filter((p: any) => {
          const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
          if (partnerObj?.is_test) return false
          const cName = (partnerObj?.company_name || "").toLowerCase()
          if (cName.includes("test") || cName.includes("dev test")) return false
          const email = (partnerObj?.email || "").toLowerCase()
          if (email === "mrnathanrem@gmail.com") return false
          return true
        })
        const takenSlots = realPurchases.length
        const remainingSlots = Math.max(0, maxSlots - takenSlots)
        return {
          ...l,
          max_slots: maxSlots,
          taken_slots: takenSlots,
          remaining_slots: remainingSlots,
          buyers: realPurchases.map((p: any) => ({
            companyName: p.partners?.company_name || "Installateur Partenaire",
            purchasedAt: p.purchased_at,
          })),
          masked_postal_code: l.postal_code ? `${l.postal_code.slice(0, 2)}XX` : "—",
        }
      })
      .filter((l: any) => l.remaining_slots > 0)
  }

  // 3. Garantir la présence du lead ciblé (?lead=[id]) s'il existe en base
  if (targetLeadId) {
    const existsInMarket = initialMarketplace.some((l: any) => l.id === targetLeadId)
    const existsInPortfolio = initialPortfolio.some(
      (p: any) => p.id === targetLeadId || p.lead_id === targetLeadId || p.purchase_id === targetLeadId
    )
    if (!existsInMarket && !existsInPortfolio) {
      const { data: specificLead } = await admin
        .from("leads")
        .select(`
          id, segment, province, city, postal_code, site_address, surface_type, surface_area, surface_area_m2,
          annual_electricity_bill, annual_bill_eur, estimated_power_kwc, roof_material, ownership_status,
          timeframe, project_timeline, project_driver, project_details, message, first_name, last_name,
          credit_cost, marketplace_status, created_at, grd, estimated_roi_years, estimated_savings,
          wants_irve, lead_score,
          lead_purchases(id, partner_id, purchased_at, partners(id, company_name, email, is_test))
        `)
        .eq("id", targetLeadId)
        .maybeSingle()

      if (specificLead) {
        const maxSlots = specificLead.segment === "B2B" ? 1 : 3
        const realPurchases = (Array.isArray(specificLead.lead_purchases) ? specificLead.lead_purchases : []).filter((p: any) => {
          const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
          if (partnerObj?.is_test) return false
          const cName = (partnerObj?.company_name || "").toLowerCase()
          if (cName.includes("test") || cName.includes("dev test")) return false
          const email = (partnerObj?.email || "").toLowerCase()
          if (email === "mrnathanrem@gmail.com") return false
          return true
        })
        const takenSlots = realPurchases.length
        const remainingSlots = Math.max(0, maxSlots - takenSlots)
        const formattedLead = {
          ...specificLead,
          max_slots: maxSlots,
          taken_slots: takenSlots,
          remaining_slots: remainingSlots,
          buyers: realPurchases.map((p: any) => ({
            companyName: p.partners?.company_name || "Installateur Partenaire",
            purchasedAt: p.purchased_at,
          })),
          masked_postal_code: specificLead.postal_code ? `${specificLead.postal_code.slice(0, 2)}XX` : "—",
        }
        initialMarketplace = [formattedLead, ...initialMarketplace]
      }
    }
  }

  return (
    <PartnerDashboardShell
      initialPartner={initialPartner}
      initialMarketplace={initialMarketplace}
      initialPortfolio={initialPortfolio}
      targetLeadId={targetLeadId ?? undefined}
    />
  )
}
