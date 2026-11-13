import { NextRequest, NextResponse } from "next/server"
import {
  getLocalitiesForPostalCode,
  suggestBelgianStreets,
  verifyWalloniaAddressStrict,
} from "@/lib/address-spw"
import {
  getWalloonProvinceKeyFromPostalCode,
  isWalloonPostalCode,
} from "@/lib/leads-validation"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const action = sp.get("action") || "suggest"
    const postalCode = (sp.get("postalCode") || "").replace(/\D/g, "").slice(0, 4)
    const query = (sp.get("q") || "").trim().slice(0, 140)
    const city = (sp.get("city") || "").trim().slice(0, 100)
    const street = sp.get("street")?.trim().slice(0, 140) ?? null
    const house = sp.get("house")?.trim().slice(0, 30) ?? null
    const address = (sp.get("address") || "").trim().slice(0, 200)

    if (action === "localities") {
      if (postalCode.length !== 4) {
        return NextResponse.json({
          postalCode,
          isWalloon: false,
          provinceKey: null,
          provinceLabel: null,
          localities: [],
        })
      }
      const provinceKey = getWalloonProvinceKeyFromPostalCode(postalCode)
      const isWalloon = isWalloonPostalCode(postalCode)
      const localities = isWalloon ? await getLocalitiesForPostalCode(postalCode) : []
      return NextResponse.json({
        postalCode,
        isWalloon,
        provinceKey,
        provinceLabel: provinceKey ? getProvinceDisplayLabel(provinceKey) : null,
        localities,
      })
    }

    if (action === "verify") {
      const verification = await verifyWalloniaAddressStrict({
        postalCode,
        city,
        streetAddress: address || undefined,
        street,
        houseNumber: house,
      })
      return NextResponse.json({ verification })
    }

    // action === "suggest"
    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }
    const suggestions = await suggestBelgianStreets({
      postalCode: postalCode || undefined,
      query,
      limit: 8,
    })
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.warn("[API /address/suggest] error:", err)
    return NextResponse.json({ suggestions: [], localities: [] }, { status: 200 })
  }
}

