import { NextRequest, NextResponse } from "next/server"
import {
  getPartnerVerificationStatusForInstaller,
  getRescertInstallerBySlug,
} from "@/lib/rescert-directory"

export const dynamic = "force-dynamic"

function escapeXml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function truncateLabel(value: string, maxLen = 28): string {
  const clean = value.trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen - 1)}…`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let companyName = "Installateur Agréé"
  let subLabel = "RESCERT Photovoltaïque · Wallonie"
  let isVerifiedPartner = slug === "verified"

  if (slug !== "verified") {
    const installer = getRescertInstallerBySlug(slug)
    if (installer) {
      companyName = installer.companyName
      subLabel = `${installer.postalCode} ${installer.city} · RESCERT PV`
      const status = await getPartnerVerificationStatusForInstaller(installer)
      isVerifiedPartner = status.isVerifiedPartner
    }
  }

  const accentColor = isVerifiedPartner ? "#1D5D45" : "#305A76"
  const pillBg = isVerifiedPartner ? "#E8F2ED" : "#F0F5F8"
  const pillText = isVerifiedPartner ? "PARTENAIRE VÉRIFIÉ" : "RÉFÉRENCÉ RESCERT"

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="72" viewBox="0 0 280 72" role="img" aria-label="${escapeXml(
    `${companyName} — ${pillText} Aegis Solaire`
  )}">
  <rect x="0.5" y="0.5" width="279" height="71" rx="10" fill="#FFFFFF" stroke="#DCE5EB"/>
  <rect x="10" y="14" width="44" height="44" rx="10" fill="#142D42"/>
  <path d="M32 23L42 27.5V35.5C42 42 37.8 47.4 32 49.5C26.2 47.4 22 42 22 35.5V27.5L32 23Z" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
  <path d="M28 36L30.8 38.8L36.5 33" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="64" y="12" width="128" height="16" rx="4" fill="${pillBg}"/>
  <text x="70" y="23" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="${accentColor}" letter-spacing="0.4">${escapeXml(
    pillText
  )}</text>
  <text x="64" y="43" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#142D42">${escapeXml(
    truncateLabel(companyName, 26)
  )}</text>
  <text x="64" y="58" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4D6374">${escapeXml(
    truncateLabel(subLabel, 34)
  )} · Aegis Solaire</text>
</svg>`

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
