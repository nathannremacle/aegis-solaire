import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { findInvoiceByAnyId } from "@/lib/accounting/invoice-service"
import {
  generatePeppolUblXml,
  renderOfficialInvoiceHtml,
} from "@/lib/accounting/ubl-peppol-generator"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const decodedId = decodeURIComponent(id)
  const invoice = await findInvoiceByAnyId(decodedId)

  if (!invoice) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 })
  }

  const format = request.nextUrl.searchParams.get("format") || "html"

  if (format === "ubl" || format === "xml") {
    const xml = generatePeppolUblXml(invoice)
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${invoice.invoice_number}.xml"`,
      },
    })
  }

  const html = renderOfficialInvoiceHtml(invoice)
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
