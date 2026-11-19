import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { analyzeAndCreateExpenseDraft } from "@/lib/accounting/invoice-extractor"
import type { AccountingExpenseDraftRecord, PaymentSource } from "@/lib/accounting/belgian-tax-rules"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])

const MAX_FILE_BYTES = 15 * 1024 * 1024

function normalizeMimeType(file: File): string {
  const raw = (file.type || "").toLowerCase().trim()
  if (raw === "image/jpg") return "image/jpeg"
  if (ALLOWED_MIME_TYPES.has(raw)) return raw
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "application/pdf"
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".webp")) return "image/webp"
  return raw
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "Impossible de lire les fichiers envoyés (FormData invalide)." },
      { status: 400 }
    )
  }

  const rawPaymentSource = String(formData.get("payment_source") || "").trim()
  const paymentSourceOverride = (
    ["pro_account", "personal_card", "mollie_balance", "other"].includes(rawPaymentSource)
      ? rawPaymentSource
      : undefined
  ) as PaymentSource | undefined

  const entries = [
    ...formData.getAll("file"),
    ...formData.getAll("files"),
  ].filter((v): v is File => v instanceof File && v.size > 0)

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "Aucun fichier reçu. Sélectionne au moins un PDF ou une image." },
      { status: 400 }
    )
  }

  const drafts: AccountingExpenseDraftRecord[] = []
  const errors: Array<{ filename: string; error: string }> = []

  for (const file of entries) {
    const mimeType = normalizeMimeType(file)
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      errors.push({
        filename: file.name,
        error: `Format non supporté (${file.type || "inconnu"}). Formats acceptés : PDF, JPG, PNG, WebP.`,
      })
      continue
    }

    if (file.size > MAX_FILE_BYTES) {
      errors.push({
        filename: file.name,
        error: "Fichier trop volumineux (max 15 Mo).",
      })
      continue
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const res = await analyzeAndCreateExpenseDraft({
        buffer,
        filename: file.name,
        mimeType,
        source: "drag_drop",
        paymentSourceOverride,
        sourceMetadata: {
          uploaded_by: user.email || "admin",
        },
      })
      drafts.push(res.draft)
    } catch (err: any) {
      errors.push({
        filename: file.name,
        error: err?.message || "Erreur lors de l'analyse de ce fichier.",
      })
    }
  }

  if (drafts.length === 0 && errors.length > 0) {
    return NextResponse.json(
      { success: false, drafts, errors, error: errors[0].error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    drafts,
    errors,
  })
}
