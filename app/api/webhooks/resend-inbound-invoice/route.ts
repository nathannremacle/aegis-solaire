import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { analyzeAndCreateExpenseDraft } from "@/lib/accounting/invoice-extractor"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
])

function resolveSupportedMimeType(contentType: string, filename: string | null): string | null {
  const ct = (contentType || "").toLowerCase().trim()
  if (ct === "image/jpg") return "image/jpeg"
  if (SUPPORTED_ATTACHMENT_TYPES.has(ct)) return ct
  const lower = (filename || "").toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  return null
}

function normalizeEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return (match ? match[1] : raw).trim().toLowerCase()
}

function isAccountingInboundRecipient(
  recipients: string[] | string | undefined,
  expectedAddress: string
): boolean {
  const target = expectedAddress.trim().toLowerCase()
  const list = Array.isArray(recipients) ? recipients : recipients ? [recipients] : []
  return list.some((entry) => normalizeEmailAddress(entry) === target)
}

export async function POST(request: NextRequest) {
  const webhookSecret = (process.env.RESEND_INBOUND_WEBHOOK_SECRET || "").trim()
  const apiKey = (process.env.RESEND_API_KEY || "").trim()

  if (!webhookSecret || !apiKey) {
    return NextResponse.json(
      { error: "Configuration Resend Inbound incomplète côté serveur." },
      { status: 503 }
    )
  }

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "En-têtes Svix manquants" }, { status: 401 })
  }

  const rawBody = await request.text()
  const resend = new Resend(apiKey)

  let event: ReturnType<typeof resend.webhooks.verify>
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret,
    })
  } catch (err: any) {
    console.warn("[Resend Inbound] Invalid signature:", err?.message || err)
    return NextResponse.json({ error: "Signature webhook invalide" }, { status: 401 })
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true, ignored: event.type })
  }

  const emailData = event.data
  const accountingInboundEmail =
    (process.env.ACCOUNTING_INBOUND_EMAIL || "factures@inbound.aegissolaire.com").trim()
  if (!isAccountingInboundRecipient(emailData.to, accountingInboundEmail)) {
    return NextResponse.json({
      received: true,
      ignored: "non_accounting_recipient",
    })
  }

  const attachments = emailData.attachments || []
  if (attachments.length === 0) {
    return NextResponse.json({ received: true, processed: 0, reason: "no_attachments" })
  }

  const supabase = createServiceRoleClient()
  let processed = 0
  let skippedDuplicates = 0

  for (const att of attachments) {
    const mimeType = resolveSupportedMimeType(att.content_type, att.filename)
    if (!mimeType) continue

    try {
      const { data: attDetails, error: attErr } = await resend.emails.receiving.attachments.get({
        emailId: emailData.email_id,
        id: att.id,
      })

      if (attErr || !attDetails?.download_url) {
        console.warn("[Resend Inbound] Attachment fetch failed:", attErr?.message)
        continue
      }

      const fileRes = await fetch(attDetails.download_url, {
        signal: AbortSignal.timeout(15000),
      })
      if (!fileRes.ok) continue

      const buffer = Buffer.from(await fileRes.arrayBuffer())
      const sha256 = createHash("sha256").update(buffer).digest("hex")

      // Idempotence sur retries webhook Resend / transferts répétés
      const [{ data: existingExp }, { data: existingDraft }] = await Promise.all([
        supabase
          .from("accounting_expenses")
          .select("id")
          .eq("document_sha256", sha256)
          .limit(1),
        supabase
          .from("accounting_expense_drafts")
          .select("id")
          .eq("document_sha256", sha256)
          .neq("status", "rejected")
          .limit(1),
      ])

      if ((existingExp?.length || 0) > 0 || (existingDraft?.length || 0) > 0) {
        skippedDuplicates += 1
        continue
      }

      await analyzeAndCreateExpenseDraft({
        buffer,
        filename: att.filename || attDetails.filename || `email_facture_${att.id}.pdf`,
        mimeType,
        source: "email_inbound",
        sourceMetadata: {
          email_id: emailData.email_id,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          received_at: emailData.created_at,
        },
      })
      processed += 1
    } catch (err) {
      console.error("[Resend Inbound] Error processing attachment:", att.id, err)
    }
  }

  return NextResponse.json({
    received: true,
    processed,
    skippedDuplicates,
  })
}
