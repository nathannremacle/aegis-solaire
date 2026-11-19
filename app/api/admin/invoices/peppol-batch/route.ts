import { NextRequest, NextResponse } from "next/server"
import { strToU8, zipSync } from "fflate"
import { getAdminUser } from "@/lib/admin-auth"
import { isDateInPeriod } from "@/lib/accounting/belgian-tax-rules"
import { getUnifiedAccountingData } from "@/lib/accounting/invoice-service"
import { generatePeppolUblXml } from "@/lib/accounting/ubl-peppol-generator"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const now = new Date()
  const rawYear = Number(request.nextUrl.searchParams.get("year") || now.getFullYear())
  const rawQuarter = request.nextUrl.searchParams.get("quarter")
  const onlyPending = request.nextUrl.searchParams.get("onlyPending") !== "false"

  const year =
    Number.isInteger(rawYear) && rawYear >= 2024 && rawYear <= 2035 ? rawYear : now.getFullYear()
  const parsedQ = rawQuarter !== null ? Number(rawQuarter) : Math.floor(now.getMonth() / 3) + 1
  const quarter = ([0, 1, 2, 3, 4].includes(parsedQ) ? parsedQ : 0) as 0 | 1 | 2 | 3 | 4

  const data = await getUnifiedAccountingData({ year, quarter })
  const eligible = data.invoices.filter((inv) => {
    if (inv.status === "cancelled") return false
    if (!isDateInPeriod(inv.issued_at, year, quarter)) return false
    if (onlyPending && inv.peppol_status === "sent") return false
    return true
  })

  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "Aucune facture Peppol à exporter sur cette période." },
      { status: 404 }
    )
  }

  const files: Record<string, Uint8Array> = {}
  const summaryLines = [
    `AEGIS SOLAIRE / INIT42 (BE 1039.899.980) — LOT PEPPOL UBL 2.1`,
    `Période : ${year} ${quarter === 0 ? "Année complète" : `T${quarter}`}`,
    `Factures incluses : ${eligible.length}`,
    ``,
    `Procédure Odoo Facturation Gratuit :`,
    `1. Ouvre Odoo Facturation -> Clients -> Factures -> Importer / Charger XML.`,
    `2. Sélectionne tous les fichiers .xml de cette archive.`,
    `3. Une fois envoyés sur Peppol depuis Odoo, clique sur « Marquer lot envoyé Peppol » dans Aegis.`,
    ``,
    `Liste des factures :`,
    ...eligible.map(
      (inv) =>
        `- ${inv.invoice_number}.xml | ${inv.client_company_name} (${inv.client_vat_number || "TVA manquante"}) | ${inv.amount_ttc.toFixed(2)} € TTC`
    ),
  ]

  files["README_PEPPOL_ODOO.txt"] = strToU8(summaryLines.join("\n"))
  for (const inv of eligible) {
    const xml = generatePeppolUblXml(inv)
    files[`${inv.invoice_number}.xml`] = strToU8(xml)
  }

  const zipBytes = zipSync(files, { level: 6 })
  const periodTag = quarter === 0 ? `${year}` : `${year}_T${quarter}`

  return new NextResponse(Buffer.from(zipBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="aegis_peppol_ubl_${periodTag}.zip"`,
      "X-Peppol-Count": String(eligible.length),
      "Cache-Control": "private, no-store",
    },
  })
}
