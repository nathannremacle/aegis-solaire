import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  enrichAllMissingPartnersBce,
  ensureInvoiceForCreditOrder,
  ensureInvoiceForLeadPurchase,
  getUnifiedAccountingData,
} from "@/lib/accounting/invoice-service"
import {
  EXPENSE_PRESETS_MAP,
  isDateInPeriod,
  round2,
} from "@/lib/accounting/belgian-tax-rules"
import { isTestPartnerAccount } from "@/lib/admin/partner-purchases"

export const dynamic = "force-dynamic"

function parsePeriodQuery(req: NextRequest) {
  const now = new Date()
  const rawYear = Number(req.nextUrl.searchParams.get("year") || now.getFullYear())
  const rawQuarter = req.nextUrl.searchParams.get("quarter")
  const defaultQuarter = Math.floor(now.getMonth() / 3) + 1
  const year = Number.isInteger(rawYear) && rawYear >= 2024 && rawYear <= 2035 ? rawYear : now.getFullYear()
  const parsedQ = rawQuarter !== null ? Number(rawQuarter) : defaultQuarter
  const quarter = ([0, 1, 2, 3, 4].includes(parsedQ) ? parsedQ : defaultQuarter) as 0 | 1 | 2 | 3 | 4
  return { year, quarter }
}

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { year, quarter } = parsePeriodQuery(request)
  const bundle = await getUnifiedAccountingData({ year, quarter })
  return NextResponse.json(bundle)
}

const createExpenseSchema = z.object({
  action: z.literal("create_expense"),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplier_name: z.string().min(1).max(200),
  supplier_country: z.enum(["BE", "EU", "NON_EU"]).default("BE"),
  supplier_vat_number: z.string().max(40).optional().nullable(),
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  nace_code: z.string().max(10).default("62100"),
  amount_htva: z.number().min(0).max(1000000),
  vat_paid_be: z.number().min(0).max(500000).default(0),
  vat_deductible_pct: z.number().min(0).max(100).default(100),
  tax_deductible_pct: z.number().min(0).max(100).default(100),
  is_reverse_charge: z.boolean().default(false),
  is_investment: z.boolean().default(false),
  invoice_ref: z.string().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

const actionSchema = z.discriminatedUnion("action", [
  createExpenseSchema,
  z.object({
    action: z.literal("delete_expense"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("toggle_checklist"),
    period_key: z.string().min(4).max(20),
    task_id: z.string().min(1).max(80),
    completed: z.boolean(),
  }),
  z.object({
    action: z.literal("enrich_bce"),
  }),
  z.object({
    action: z.literal("sync_invoices"),
  }),
  z.object({
    action: z.literal("import_mollie_fees"),
    year: z.number().int().min(2024).max(2035),
    quarter: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  }),
  z.object({
    action: z.literal("mark_peppol_sent"),
    invoiceId: z.string().uuid(),
    peppolStatus: z.enum(["ready_ubl", "sent", "manual_uploaded", "not_applicable"]),
  }),
])

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
  }

  const parsed = actionSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const payload = parsed.data

  if (payload.action === "create_expense") {
    const newId = randomUUID()
    const rowToInsert = {
      id: newId,
      expense_date: payload.expense_date,
      supplier_name: payload.supplier_name.trim(),
      supplier_country: payload.supplier_country,
      supplier_vat_number: payload.supplier_vat_number?.trim() || null,
      category: payload.category,
      description: payload.description.trim(),
      nace_code: payload.nace_code,
      amount_htva: round2(payload.amount_htva),
      vat_paid_be: round2(payload.vat_paid_be),
      vat_deductible_pct: payload.vat_deductible_pct,
      tax_deductible_pct: payload.tax_deductible_pct,
      is_reverse_charge: payload.is_reverse_charge,
      is_investment: payload.is_investment,
      invoice_ref: payload.invoice_ref?.trim() || null,
      notes: payload.notes?.trim() || null,
    }

    const { data, error } = await supabase
      .from("accounting_expenses")
      .insert(rowToInsert)
      .select("*")
      .single()

    if (!error && data) {
      return NextResponse.json({ success: true, expense: data })
    }

    // Repli résilient dans audit_log si la table accounting_expenses n'est pas encore créée
    await supabase.from("audit_log").insert({
      admin_email: user.email || "admin",
      action: "accounting_expense_created",
      entity_type: "accounting_expense",
      entity_id: newId,
      details: rowToInsert,
    })

    return NextResponse.json({ success: true, expense: rowToInsert, fallback: true })
  }

  if (payload.action === "delete_expense") {
    const { error } = await supabase
      .from("accounting_expenses")
      .delete()
      .eq("id", payload.id)

    if (error) {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "accounting_expense_deleted",
        entity_type: "accounting_expense",
        entity_id: payload.id,
        details: { id: payload.id, deleted: true },
      })
    }

    return NextResponse.json({ success: true })
  }

  if (payload.action === "toggle_checklist") {
    if (payload.completed) {
      const { error } = await supabase.from("accounting_checklist_state").upsert({
        period_key: payload.period_key,
        task_id: payload.task_id,
        completed_at: new Date().toISOString(),
      })
      if (error) {
        await supabase.from("audit_log").insert({
          admin_email: user.email || "admin",
          action: "accounting_checklist_toggled",
          entity_type: "accounting_checklist",
          details: {
            period_key: payload.period_key,
            task_id: payload.task_id,
            completed: true,
          },
        })
      }
    } else {
      const { error } = await supabase
        .from("accounting_checklist_state")
        .delete()
        .eq("period_key", payload.period_key)
        .eq("task_id", payload.task_id)
      if (error) {
        await supabase.from("audit_log").insert({
          admin_email: user.email || "admin",
          action: "accounting_checklist_toggled",
          entity_type: "accounting_checklist",
          details: {
            period_key: payload.period_key,
            task_id: payload.task_id,
            completed: false,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  }

  if (payload.action === "enrich_bce") {
    const stats = await enrichAllMissingPartnersBce()
    return NextResponse.json({ success: true, ...stats })
  }

  if (payload.action === "sync_invoices") {
    const [ordersRes, purchasesRes, partnersRes] = await Promise.all([
      supabase
        .from("credit_orders")
        .select("id, partner_id, validated_at, created_at")
        .eq("status", "paid")
        .order("created_at", { ascending: true }),
      supabase
        .from("lead_purchases")
        .select("id, partner_id, purchased_at")
        .ilike("notes", "%Achat direct en euros%")
        .order("purchased_at", { ascending: true }),
      supabase.from("partners").select("id, company_name, email, is_test"),
    ])

    const testIds = new Set(
      (partnersRes.data ?? []).filter((p) => isTestPartnerAccount(p)).map((p) => p.id)
    )

    const queue: Array<{ date: string; kind: "order" | "purchase"; id: string }> = []
    for (const o of ordersRes.data ?? []) {
      if (!testIds.has(o.partner_id)) {
        queue.push({ date: o.validated_at || o.created_at, kind: "order", id: o.id })
      }
    }
    for (const p of purchasesRes.data ?? []) {
      if (!testIds.has(p.partner_id)) {
        queue.push({ date: p.purchased_at, kind: "purchase", id: p.id })
      }
    }
    queue.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let synced = 0
    for (const item of queue) {
      if (item.kind === "order") {
        const res = await ensureInvoiceForCreditOrder(item.id)
        if (res.invoice) synced += 1
      } else {
        const res = await ensureInvoiceForLeadPurchase({ purchaseId: item.id })
        if (res.invoice) synced += 1
      }
    }

    return NextResponse.json({ success: true, synced, totalChecked: queue.length })
  }

  if (payload.action === "import_mollie_fees") {
    const bundle = await getUnifiedAccountingData({
      year: payload.year,
      quarter: payload.quarter,
    })
    const periodInvoices = bundle.invoices.filter(
      (inv) =>
        inv.status !== "cancelled" &&
        inv.processor_fee_eur > 0 &&
        isDateInPeriod(inv.issued_at, payload.year, payload.quarter)
    )
    const totalFees = round2(
      periodInvoices.reduce((acc, inv) => acc + Number(inv.processor_fee_eur || 0), 0)
    )

    if (totalFees <= 0) {
      return NextResponse.json(
        { error: "Aucun frais Mollie détecté sur cette période." },
        { status: 400 }
      )
    }

    const preset = EXPENSE_PRESETS_MAP.mollie_bank_fees
    const feeId = randomUUID()
    const expenseDate =
      payload.quarter === 0
        ? `${payload.year}-12-31`
        : `${payload.year}-${String(payload.quarter * 3).padStart(2, "0")}-28`

    const row = {
      id: feeId,
      expense_date: expenseDate,
      supplier_name: "Mollie B.V.",
      supplier_country: "EU",
      supplier_vat_number: preset.defaultVatNumber,
      category: preset.id,
      description: `Commissions Mollie estimées (${periodInvoices.length} transactions · ${bundle.intervat.periodLabel})`,
      nace_code: preset.naceCode,
      amount_htva: totalFees,
      vat_paid_be: 0,
      vat_deductible_pct: 0,
      tax_deductible_pct: 100,
      is_reverse_charge: false,
      is_investment: false,
      invoice_ref: `MOLLIE-${payload.year}-Q${payload.quarter}`,
      notes: "Frais financiers exonérés de TVA (art. 44 Code TVA), 100 % déductibles à l'IPP.",
    }

    const { data, error } = await supabase
      .from("accounting_expenses")
      .insert(row)
      .select("*")
      .single()

    if (error) {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "accounting_expense_created",
        entity_type: "accounting_expense",
        entity_id: feeId,
        details: row,
      })
      return NextResponse.json({ success: true, expense: row, fallback: true })
    }

    return NextResponse.json({ success: true, expense: data })
  }

  if (payload.action === "mark_peppol_sent") {
    const { error } = await supabase
      .from("invoices")
      .update({ peppol_status: payload.peppolStatus })
      .eq("id", payload.invoiceId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Action non supportée" }, { status: 400 })
}
