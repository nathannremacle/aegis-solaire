import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createMollieClient } from "@mollie/api-client"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { LEGAL_ENTITY, round2, type DraftWarning } from "@/lib/accounting/belgian-tax-rules"
import { storeAccountingDocument } from "@/lib/accounting/invoice-extractor"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const orgToken = (process.env.MOLLIE_ORG_ACCESS_TOKEN || "").trim()
  if (!orgToken) {
    return NextResponse.json(
      {
        code: "MISSING_MOLLIE_ORG_TOKEN",
        error:
          "Token organisation Mollie manquant (MOLLIE_ORG_ACCESS_TOKEN). Crée un Advanced Access Token avec la permission invoices.read dans Mollie Dashboard.",
      },
      { status: 400 }
    )
  }

  let bodyYear = new Date().getFullYear()
  try {
    const body = (await request.json().catch(() => ({}))) as { year?: number }
    if (body?.year && Number.isInteger(body.year) && body.year >= 2024 && body.year <= 2035) {
      bodyYear = body.year
    }
  } catch {
    // Garder année courante
  }

  const supabase = createServiceRoleClient()

  try {
    const mollie = createMollieClient({ accessToken: orgToken })

    // Charger les références Mollie déjà enregistrées pour déduplication idempotente
    const [{ data: existingExp }, { data: existingDrafts }] = await Promise.all([
      supabase
        .from("accounting_expenses")
        .select("invoice_ref")
        .ilike("invoice_ref", "MOLLIE-%"),
      supabase
        .from("accounting_expense_drafts")
        .select("invoice_ref")
        .ilike("invoice_ref", "MOLLIE-%")
        .neq("status", "rejected"),
    ])

    const existingRefs = new Set<string>([
      ...(existingExp ?? []).map((r) => String(r.invoice_ref || "")),
      ...(existingDrafts ?? []).map((r) => String(r.invoice_ref || "")),
    ])

    let page = await mollie.invoices.page({ year: String(bodyYear) })
    let checkedCount = 0
    let importedCount = 0
    let skippedExistingCount = 0

    while (page) {
      for (const inv of page) {
        checkedCount += 1
        const refKey = `MOLLIE-${inv.reference}`
        if (existingRefs.has(refKey)) {
          skippedExistingCount += 1
          continue
        }

        const netHtva = round2(Number(inv.netAmount?.value || 0))
        const vatAmt = round2(Number(inv.vatAmount?.value || 0))
        const grossTtc = round2(Number(inv.grossAmount?.value || netHtva + vatAmt))
        const currency = String(inv.netAmount?.currency || "EUR").toUpperCase()

        const warnings: DraftWarning[] = []
        if (vatAmt > 0) {
          warnings.push({
            code: "FOREIGN_VAT_CHARGED",
            severity: "warning",
            message: `Mollie a facturé ${vatAmt.toFixed(2)} € de TVA néerlandaise : ajoute ton n° TVA ${LEGAL_ENTITY.vat} dans Mollie Dashboard → Paramètres → Organisation → Infos TVA pour passer en autoliquidation 0 %.`,
          })
        }

        const invVatNorm = (inv.vatNumber || "").replace(/[^A-Z0-9]/gi, "").toUpperCase()
        const clientVatPresent = invVatNorm === LEGAL_ENTITY.vatCompact

        if (!clientVatPresent) {
          warnings.push({
            code: "MISSING_CLIENT_VAT",
            severity: "warning",
            message: `Le n° TVA ${LEGAL_ENTITY.vat} ne figure pas sur cette facture Mollie (${inv.reference}).`,
          })
        }

        let storedPath: string | null = null
        let storedFilename: string | null = null
        let storedSha256: string | null = null
        let storedSize: number | null = null

        const pdfUrl = inv.getPdfUrl()
        if (pdfUrl) {
          try {
            const pdfRes = await fetch(pdfUrl, {
              headers: { Authorization: `Bearer ${orgToken}` },
              signal: AbortSignal.timeout(10000),
            })
            if (pdfRes.ok) {
              const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
              storedSize = pdfBuffer.byteLength
              const stored = await storeAccountingDocument(supabase, {
                buffer: pdfBuffer,
                filename: `mollie_${inv.reference}.pdf`,
                mimeType: "application/pdf",
              })
              storedPath = stored.storagePath
              storedFilename = stored.safeFilename
              storedSha256 = stored.sha256
            }
          } catch {
            // Poursuivre même si le téléchargement PDF échoue
          }
        }

        const lineSummary =
          Array.isArray(inv.lines) && inv.lines.length > 0
            ? inv.lines.map((l) => `${l.period} · ${l.description} (${l.count}×)`).join(", ")
            : `Commissions & frais Mollie (${inv.reference})`

        const nowIso = new Date().toISOString()
        const { error: insertErr } = await supabase.from("accounting_expense_drafts").insert({
          id: randomUUID(),
          status: "pending_review",
          source: "mollie_api",
          document_storage_path: storedPath,
          document_filename: storedFilename || `mollie_${inv.reference}.pdf`,
          document_mime_type: storedPath ? "application/pdf" : null,
          document_sha256: storedSha256,
          document_size_bytes: storedSize,
          expense_date: inv.issuedAt || nowIso.slice(0, 10),
          supplier_name: "Mollie B.V.",
          supplier_country: "EU",
          supplier_vat_number: "NL815839091B01",
          category: "mollie_fees_eu",
          description: lineSummary.slice(0, 290),
          nace_code: "63100",
          original_currency: currency,
          original_amount_htva: netHtva,
          original_vat_amount: vatAmt,
          original_amount_ttc: grossTtc,
          exchange_rate: 1,
          exchange_rate_source: currency,
          amount_htva: netHtva,
          vat_paid_be: 0,
          vat_deductible_pct: vatAmt === 0 ? 100 : 0,
          tax_deductible_pct: 100,
          is_reverse_charge: vatAmt === 0,
          is_investment: false,
          invoice_ref: refKey,
          payment_source: "mollie_balance",
          is_valid_tax_invoice: true,
          client_vat_present: clientVatPresent,
          ai_confidence: 1,
          ai_model: "mollie-invoices-api",
          ai_warnings: warnings,
          ai_raw_extraction: {
            mollie_invoice_id: inv.id,
            reference: inv.reference,
            status: inv.status,
            line_items: (inv.lines || []).map((l) => ({
              description: `${l.period} — ${l.description} (${l.count}×)`,
              amount: Number(l.amount?.value || 0),
            })),
          },
          source_metadata: {
            mollie_invoice_id: inv.id,
            mollie_status: inv.status,
            paid_at: inv.paidAt || null,
          },
          notes: `Facture officielle Mollie #${inv.reference} (${inv.status}).`,
          created_at: nowIso,
          updated_at: nowIso,
        })

        if (!insertErr) {
          importedCount += 1
          existingRefs.add(refKey)
        }
      }

      if (typeof page.nextPage === "function") {
        page = await page.nextPage()
      } else {
        break
      }
    }

    return NextResponse.json({
      success: true,
      year: bodyYear,
      checkedCount,
      importedCount,
      skippedExistingCount,
    })
  } catch (err: any) {
    console.error("[Mollie Invoices Sync] Error:", err)
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Erreur lors de l'appel à l'API Mollie Invoices. Vérifie les permissions (invoices.read) de MOLLIE_ORG_ACCESS_TOKEN.",
      },
      { status: 500 }
    )
  }
}
