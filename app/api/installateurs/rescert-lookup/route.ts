import { NextRequest, NextResponse } from "next/server"
import { getRescertInstallerById } from "@/lib/rescert-directory"
import { getRegionsFromPostalCode } from "@/lib/installer-registration-schema"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = (searchParams.get("id") || "").trim()
  if (!id) {
    return NextResponse.json({ found: false }, { status: 400 })
  }

  const inst = getRescertInstallerById(id)
  if (!inst) {
    return NextResponse.json({ found: false }, { status: 404 })
  }

  const parts = inst.certifiedPerson.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] || ""
  const lastName = parts.slice(1).join(" ") || ""

  return NextResponse.json({
    found: true,
    installer: {
      id: inst.id,
      slug: inst.slug,
      companyName: inst.companyName,
      firstName,
      lastName,
      postalCode: inst.postalCode,
      city: inst.city,
      provinceLabel: inst.provinceLabel,
      regions: getRegionsFromPostalCode(inst.postalCode),
    },
  })
}
