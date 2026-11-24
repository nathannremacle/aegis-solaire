import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getPartner } from "@/lib/partner-auth"

export const dynamic = "force-dynamic"

const PROVINCES = [
  { key: "liege", label: "Liège", maxSeats: 3 },
  { key: "hainaut", label: "Hainaut", maxSeats: 3 },
  { key: "namur", label: "Namur", maxSeats: 3 },
  { key: "brabant_wallon", label: "Brabant wallon", maxSeats: 3 },
  { key: "bruxelles", label: "Bruxelles-Capitale", maxSeats: 3 },
  { key: "luxembourg", label: "Luxembourg", maxSeats: 3 },
]

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  let activeAutoPilotPartners: Array<{
    id: string
    target_provinces: string[] | null
    credits: number | null
    is_test: boolean | null
    company_name: string | null
  }> = []

  const { data, error } = await admin
    .from("partners")
    .select("id, target_provinces, credits, is_test, company_name")
    .eq("auto_buy_enabled", true)
    .gte("credits", 6)

  if (!error && data) {
    activeAutoPilotPartners = data.filter((p) => {
      const isTest =
        p.is_test === true ||
        (typeof p.company_name === "string" && p.company_name.toLowerCase().includes("test"))
      return !isTest
    })
  }

  const availability = PROVINCES.map((prov) => {
    const activeInProvince = activeAutoPilotPartners.filter((p) => {
      const provinces = Array.isArray(p.target_provinces) ? p.target_provinces : []
      return provinces.length === 0 || provinces.includes(prov.key)
    })
    const takenSeats = Math.min(prov.maxSeats, activeInProvince.length)
    const remainingSeats = Math.max(0, prov.maxSeats - takenSeats)
    const isPartnerActiveHere = activeInProvince.some((p) => p.id === partner.id)

    return {
      key: prov.key,
      label: prov.label,
      maxSeats: prov.maxSeats,
      takenSeats,
      remainingSeats,
      isPartnerActiveHere,
    }
  })

  return NextResponse.json({ provinces: availability })
}
