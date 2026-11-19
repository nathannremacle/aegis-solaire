import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { round2, type DraftWarning } from "@/lib/accounting/belgian-tax-rules"
import { ACCOUNTING_DOCUMENTS_BUCKET } from "@/lib/accounting/invoice-extractor"

export const dynamic = "force-dynamic"

const draftUpdateFieldsSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  supplier_name: z.string().min(1).max(200).optional(),
  supplier_country: z.enum(["BE", "EU", "NON_EU"]).optional(),
  supplier_vat_number: z.string().max(40).nullable().optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional(),
  nace_code: z.string().max(10).optional(),
  original_currency: z.string().min(3).max(3).optional(),
  original_amount_htva: z.number().min(0).max(1000000).optional(),
  exchange_rate: z.number().positive().max(1000).optional(),
  amount_htva: z.number().min(0).max(1000000).optional(),
  vat_paid_be: z.number().min(0).max(500000).optional(),
  vat_deductible_pct: z.number().min(0).max(100).optional(),
  tax_deductible_pct: z.number().min(0).max(100).optional(),
  is_reverse_charge: z.boolean().optional(),
  is_investment: z.boolean().optional(),
  invoice_ref: z.string().max(120).nullable().optional(),
  payment_source: z.enum(["pro_account", "personal_card", "mollie_balance", "other"]).optional(),
  is_valid_tax_invoice: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_draft"),
    id: z.string().uuid(),
    updates: draftUpdateFieldsSchema,
  }),
  z.object({
    action: z.literal("approve_draft"),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("approve_all_valid_drafts"),
  }),
  z.object({
    action: z.literal("reject_draft"),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("apply_chat_audit_patch"),
    patches: z
      .array(
        z.object({
          draft_id: z.string().uuid(),
          action: z.enum(["update", "reject", "approve"]).optional(),
          reason: z.string().max(500).optional(),
          updates: draftUpdateFieldsSchema.optional(),
        })
      )
      .min(1)
      .max(200),
  }),
])

async function approveDraftRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  draft: Record<string, any>
) {
  const expenseId = randomUUID()
  const nowIso = new Date().toISOString()

  const expensePayload = {
    id: expenseId,
    expense_date: draft.expense_date,
    supplier_name: String(draft.supplier_name || "Fournisseur").trim(),
    supplier_country: draft.supplier_country || "BE",
    supplier_vat_number: draft.supplier_vat_number || null,
    category: draft.category || "saas_cloud_non_eu",
    description: String(draft.description || draft.supplier_name || "Frais pro").trim(),
    nace_code: draft.nace_code || "62100",
    amount_htva: round2(Number(draft.amount_htva || 0)),
    vat_paid_be: round2(Number(draft.vat_paid_be || 0)),
    vat_deductible_pct: Number(draft.vat_deductible_pct ?? 100),
    tax_deductible_pct: Number(draft.tax_deductible_pct ?? 100),
    is_reverse_charge: Boolean(draft.is_reverse_charge),
    is_investment: Boolean(draft.is_investment),
    invoice_ref: draft.invoice_ref || null,
    notes: draft.notes || null,
    document_storage_path: draft.document_storage_path || null,
    document_filename: draft.document_filename || null,
    document_mime_type: draft.document_mime_type || null,
    document_sha256: draft.document_sha256 || null,
    original_currency: draft.original_currency || "EUR",
    original_amount:
      draft.original_amount_htva !== null && draft.original_amount_htva !== undefined
        ? round2(Number(draft.original_amount_htva))
        : null,
    exchange_rate:
      draft.exchange_rate !== null && draft.exchange_rate !== undefined
        ? Number(draft.exchange_rate)
        : 1,
    payment_source: draft.payment_source || "pro_account",
    source: draft.source || "drag_drop",
    source_metadata: draft.source_metadata || {},
  }

  const { data: insertedExpense, error: expErr } = await supabase
    .from("accounting_expenses")
    .insert(expensePayload)
    .select("*")
    .single()

  if (expErr || !insertedExpense) {
    throw new Error(expErr?.message || "Impossible de créer la dépense validée.")
  }

  await supabase
    .from("accounting_expense_drafts")
    .update({
      status: "approved",
      approved_expense_id: insertedExpense.id,
      updated_at: nowIso,
    })
    .eq("id", draft.id)

  return insertedExpense
}

async function rejectDraftRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  draft: Record<string, any>
) {
  await supabase
    .from("accounting_expense_drafts")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", draft.id)

  if (draft.document_storage_path) {
    const [{ count: expCount }, { count: otherDraftCount }] = await Promise.all([
      supabase
        .from("accounting_expenses")
        .select("id", { count: "exact", head: true })
        .eq("document_storage_path", draft.document_storage_path),
      supabase
        .from("accounting_expense_drafts")
        .select("id", { count: "exact", head: true })
        .eq("document_storage_path", draft.document_storage_path)
        .neq("status", "rejected"),
    ])

    if ((expCount ?? 0) === 0 && (otherDraftCount ?? 0) === 0) {
      await supabase.storage
        .from(ACCOUNTING_DOCUMENTS_BUCKET)
        .remove([String(draft.document_storage_path)])
        .catch(() => null)
    }
  }
}

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
      { error: "Paramètres invalides", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const payload = parsed.data

  if (payload.action === "update_draft") {
    const cleanUpdates = {
      ...payload.updates,
      ...(payload.updates.amount_htva !== undefined
        ? { amount_htva: round2(payload.updates.amount_htva) }
        : {}),
      ...(payload.updates.vat_paid_be !== undefined
        ? { vat_paid_be: round2(payload.updates.vat_paid_be) }
        : {}),
      ...(payload.updates.original_currency !== undefined
        ? { original_currency: payload.updates.original_currency.toUpperCase() }
        : {}),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("accounting_expense_drafts")
      .update(cleanUpdates)
      .eq("id", payload.id)
      .eq("status", "pending_review")
      .select("*")
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Brouillon introuvable ou déjà traité." },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, draft: data })
  }

  if (payload.action === "approve_draft") {
    const { data: draft, error: fetchErr } = await supabase
      .from("accounting_expense_drafts")
      .select("*")
      .eq("id", payload.id)
      .eq("status", "pending_review")
      .single()

    if (fetchErr || !draft) {
      return NextResponse.json(
        { error: "Brouillon introuvable ou déjà validé." },
        { status: 404 }
      )
    }

    const expense = await approveDraftRow(supabase, draft)
    return NextResponse.json({ success: true, expense })
  }

  if (payload.action === "approve_all_valid_drafts") {
    const { data: drafts, error: fetchErr } = await supabase
      .from("accounting_expense_drafts")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    let approvedCount = 0
    let skippedCount = 0

    for (const draft of drafts ?? []) {
      const warnings = Array.isArray(draft.ai_warnings)
        ? (draft.ai_warnings as DraftWarning[])
        : []
      const hasBlockingIssue =
        !draft.is_valid_tax_invoice ||
        Number(draft.amount_htva || 0) <= 0 ||
        warnings.some((w) => w.code === "DUPLICATE_FILE")

      if (hasBlockingIssue) {
        skippedCount += 1
        continue
      }

      await approveDraftRow(supabase, draft)
      approvedCount += 1
    }

    return NextResponse.json({ success: true, approvedCount, skippedCount })
  }

  if (payload.action === "reject_draft") {
    const { data: draft } = await supabase
      .from("accounting_expense_drafts")
      .select("*")
      .eq("id", payload.id)
      .single()

    if (!draft) {
      return NextResponse.json({ error: "Brouillon introuvable." }, { status: 404 })
    }

    await rejectDraftRow(supabase, draft)
    return NextResponse.json({ success: true })
  }

  if (payload.action === "apply_chat_audit_patch") {
    let updatedCount = 0
    let approvedCount = 0
    let rejectedCount = 0

    for (const patch of payload.patches) {
      const { data: draft } = await supabase
        .from("accounting_expense_drafts")
        .select("*")
        .eq("id", patch.draft_id)
        .eq("status", "pending_review")
        .maybeSingle()

      if (!draft) continue

      let mergedDraft = draft
      if (patch.updates && Object.keys(patch.updates).length > 0) {
        const nextNotes = patch.reason
          ? [patch.updates.notes ?? draft.notes, `Audit chat : ${patch.reason}`]
              .filter(Boolean)
              .join(" · ")
              .slice(0, 1000)
          : patch.updates.notes ?? draft.notes

        const existingWarnings = Array.isArray(draft.ai_warnings)
          ? (draft.ai_warnings as DraftWarning[])
          : []
        const filteredWarnings = existingWarnings.filter(
          (w) =>
            w.code !== "AI_UNAVAILABLE" &&
            !(patch.updates?.is_valid_tax_invoice === true && w.code === "NOT_A_TAX_INVOICE")
        )

        const { data: savedDraft } = await supabase
          .from("accounting_expense_drafts")
          .update({
            ...patch.updates,
            ...(patch.updates.amount_htva !== undefined
              ? { amount_htva: round2(patch.updates.amount_htva) }
              : {}),
            ...(patch.updates.vat_paid_be !== undefined
              ? { vat_paid_be: round2(patch.updates.vat_paid_be) }
              : {}),
            notes: nextNotes,
            ai_warnings: filteredWarnings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.id)
          .select("*")
          .single()

        if (savedDraft) {
          mergedDraft = savedDraft
          updatedCount += 1
        }
      }

      if (patch.action === "reject") {
        await rejectDraftRow(supabase, mergedDraft)
        rejectedCount += 1
      } else if (patch.action === "approve") {
        await approveDraftRow(supabase, mergedDraft)
        approvedCount += 1
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      approvedCount,
      rejectedCount,
    })
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
}
