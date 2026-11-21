import { Suspense } from "react"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  getRegionalLeadSummary,
  isShowcaseOnlyLeadId,
  type InvitationLeadSummary,
} from "@/lib/regional-leads-catalog"
import { getRoofMaterialLabel } from "@/lib/lead-display-helpers"
import { getLeadImageItems, getPrimaryLeadImage } from "@/lib/lead-images"
import { InvitationClient } from "./invitation-client"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveInvitationLeadSummary(
  leadId: string
): Promise<InvitationLeadSummary | null> {
  const trimmed = leadId.trim()
  if (!trimmed) return null

  if (UUID_REGEX.test(trimmed) && !isShowcaseOnlyLeadId(trimmed)) {
    try {
      const supabase = createServiceRoleClient()
      const [{ data }, { count: takenCount }] = await Promise.all([
        supabase
          .from("leads")
          .select(
            "id, segment, postal_code, city, province, surface_type, surface_area, roof_material, estimated_power_kwc, annual_electricity_bill, ownership_status, timeframe, project_driver, grd, credit_cost, max_slots, project_details, message, created_at, phone_verified, phone_verification_method, phone_carrier, email_verified, qualification_metadata"
          )
          .eq("id", trimmed)
          .maybeSingle(),
        supabase
          .from("lead_purchases")
          .select("id", { count: "exact", head: true })
          .eq("lead_id", trimmed),
      ])

      if (data) {
        const segment: "B2C" | "B2B" = data.segment === "B2B" ? "B2B" : "B2C"
        const segmentLabel =
          segment === "B2B" ? "Projet B2B / Industriel" : "Maison unifamiliale"

        const rawSurface = Number(data.surface_area || 0)
        const roofMat = data.roof_material ? String(data.roof_material).trim() : ""
        const roofMaterialLabel = roofMat ? getRoofMaterialLabel(roofMat) : null
        let surfaceLabel = ""
        if (data.surface_area !== null && data.surface_area !== undefined && String(data.surface_area).trim()) {
          const s = String(data.surface_area).trim()
          surfaceLabel = s.includes("m²") ? `Toiture ${s}` : `Toiture ${s} m²`
        }
        if (roofMaterialLabel) {
          surfaceLabel = surfaceLabel ? `${surfaceLabel} (${roofMaterialLabel})` : roofMaterialLabel
        }

        const rawPower = data.estimated_power_kwc
        const powerNum = Number(rawPower || 0)
        const powerLabel =
          rawPower !== null && rawPower !== undefined && String(rawPower).trim()
            ? String(rawPower).toLowerCase().includes("kwc")
              ? String(rawPower).trim()
              : `Puissance recommandée ~${String(rawPower).replace(".", ",")} kWc`
            : ""

        const rawBill = data.annual_electricity_bill
        const billNum = Number(rawBill || 0)
        let billLabel = ""
        if (rawBill !== null && rawBill !== undefined && String(rawBill).trim()) {
          const bStr = String(rawBill).trim()
          billLabel = bStr.includes("€")
            ? bStr
            : Number.isFinite(billNum)
              ? `${Math.round(billNum).toLocaleString("fr-BE")} €/an facture`
              : bStr
        }

        const maxSlots =
          typeof data.max_slots === "number" && data.max_slots > 0
            ? data.max_slots
            : segment === "B2B"
              ? 1
              : 3
        const remainingSlots = Math.max(0, maxSlots - (takenCount ?? 0))

        const qualMeta = (data.qualification_metadata ?? {}) as Record<string, unknown>
        const verifs =
          qualMeta.verifications && typeof qualMeta.verifications === "object"
            ? (qualMeta.verifications as Record<string, any>)
            : null
        const phoneVerifiedBySms = Boolean(
          data.phone_verified ||
            verifs?.phoneOtp?.verified === true ||
            verifs?.phoneOtp?.status === "verified" ||
            data.phone_verification_method === "sms_otp"
        )
        const phoneCarrier =
          (data.phone_carrier ? String(data.phone_carrier).trim() : null) ||
          (verifs?.twilioLookup?.carrierName ? String(verifs.twilioLookup.carrierName).trim() : null)
        const emailVerified = Boolean(
          data.email_verified || verifs?.emailProof?.verified === true
        )
        const addressVerified = Boolean(
          verifs?.walloniaAddress?.validInWallonia === true &&
            (verifs?.walloniaAddress?.houseVerified === true ||
              verifs?.walloniaAddress?.streetVerified === true)
        )
        const rawPanelCount = Number(qualMeta.estimatedPanelCount || 0)
        const imageItems = getLeadImageItems(qualMeta)

        return {
          id: data.id,
          postalCode: data.postal_code ? String(data.postal_code) : "",
          city: data.city ? String(data.city) : "",
          province: data.province ? String(data.province) : "",
          provinceKey: data.province ? String(data.province) : "wallonie",
          segment,
          segmentLabel,
          surfaceLabel,
          surfaceType: data.surface_type ? String(data.surface_type) : "toiture",
          surfaceAreaM2: Number.isFinite(rawSurface) ? rawSurface : 0,
          powerLabel,
          estimatedPowerKwc: Number.isFinite(powerNum) ? powerNum : 0,
          billLabel,
          annualBillEur: Number.isFinite(billNum) ? billNum : 0,
          roofMaterial: roofMat || "tuiles",
          roofMaterialLabel,
          panelCount: Number.isFinite(rawPanelCount) && rawPanelCount > 0 ? rawPanelCount : null,
          ownershipStatus: data.ownership_status ? String(data.ownership_status) : "owner",
          timeframe: data.timeframe ? String(data.timeframe) : "immediat_3mois",
          projectDriver: data.project_driver ? String(data.project_driver) : "autoconsommation",
          grd: data.grd ? String(data.grd) : "ORES / RESA",
          creditCost: typeof data.credit_cost === "number" && data.credit_cost > 0 ? data.credit_cost : segment === "B2B" ? 9 : 3,
          maxSlots,
          remainingSlots,
          imageUrl: getPrimaryLeadImage(qualMeta) ?? "",
          images: imageItems.map((img) => ({ url: img.url, isAiProjection: img.isAiProjection })),
          phoneVerifiedBySms,
          phoneCarrier,
          emailVerified,
          addressVerified,
          projectDetails: String(data.project_details || data.message || "").trim(),
          isShowcaseOnly: Boolean(qualMeta.is_showcase),
          createdAt: data.created_at ? String(data.created_at) : new Date().toISOString(),
        }
      }
    } catch (err) {
      console.warn("[invitation/page] resolveInvitationLeadSummary DB lookup failed:", err)
    }
  }

  return getRegionalLeadSummary(trimmed)
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Invitation Privée Installateur RESCERT | Aegis Solaire Wallonie",
  description:
    "Vous êtes invité par la Direction des Partenariats à rejoindre le réseau d'installateurs photovoltaïques Aegis Solaire en Wallonie. Leads qualifiés, exclusivité B2B et transparence B2C.",
  alternates: {
    canonical: `${baseUrl}/partenaires/invitation`,
  },
  robots: {
    index: false, // Invitation privée nominative, pas d'indexation SEO nécessaire
    follow: false,
  },
}

interface PartenairesInvitationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PartenairesInvitationPage({
  searchParams,
}: PartenairesInvitationPageProps) {
  const resolved = await searchParams
  const rawNom =
    typeof resolved.nom === "string"
      ? resolved.nom
      : typeof resolved.name === "string"
        ? resolved.name
        : ""
  const rawCie =
    typeof resolved.cie === "string"
      ? resolved.cie
      : typeof resolved.company === "string"
        ? resolved.company
        : ""
  const inviter =
    typeof resolved.par === "string" && resolved.par.trim()
      ? resolved.par.trim()
      : "Direction des Partenariats"
  const rawCode =
    typeof resolved.code === "string"
      ? resolved.code
      : typeof resolved.cp === "string"
        ? resolved.cp
        : ""
  const rawLeadId = typeof resolved.leadId === "string" ? resolved.leadId : ""
  const rawEmail = typeof resolved.email === "string" ? resolved.email : ""
  const rawPhone = typeof resolved.phone === "string" ? resolved.phone : ""

  const nom = rawNom ? rawNom.trim() : ""
  const cie = rawCie ? rawCie.trim() : ""
  const initialLeadSummary = rawLeadId
    ? await resolveInvitationLeadSummary(rawLeadId)
    : null

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <InvitationClient
        initialNom={nom}
        initialCie={cie}
        initialInviter={inviter}
        initialCode={rawCode}
        initialLeadId={rawLeadId}
        initialLeadSummary={initialLeadSummary}
        initialEmail={rawEmail}
        initialPhone={rawPhone}
      />
    </Suspense>
  )
}
