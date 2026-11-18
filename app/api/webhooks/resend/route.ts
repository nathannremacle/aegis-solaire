import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

function verifySvixSignature(params: {
  payload: string
  secret: string
  svixId: string | null
  svixTimestamp: string | null
  svixSignature: string | null
}): boolean {
  const { payload, secret, svixId, svixTimestamp, svixSignature } = params
  if (!svixId || !svixTimestamp || !svixSignature) return false

  const tsNum = Number(svixTimestamp)
  if (Number.isNaN(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return false
  }

  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret
  const key = Buffer.from(rawSecret, "base64")
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`
  const expectedSig = crypto.createHmac("sha256", key).update(signedContent).digest("base64")

  const signatures = svixSignature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean) as string[]

  return signatures.some((sig) => {
    const a = Buffer.from(sig, "utf8")
    const b = Buffer.from(expectedSig, "utf8")
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const webhookSecret = (process.env.RESEND_WEBHOOK_SECRET ?? "").trim()

  if (webhookSecret) {
    const valid = verifySvixSignature({
      payload: rawBody,
      secret: webhookSecret,
      svixId: request.headers.get("svix-id"),
      svixTimestamp: request.headers.get("svix-timestamp"),
      svixSignature: request.headers.get("svix-signature"),
    })
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let event: {
    type?: string
    data?: {
      email_id?: string
      to?: string[] | string
      bounce?: { message?: string; subType?: string }
    }
  } | null = null

  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const type = event?.type || ""
  const emailId = event?.data?.email_id || null
  if (!emailId || !["email.delivered", "email.bounced", "email.complained"].includes(type)) {
    return NextResponse.json({ received: true })
  }

  const supabase = createServiceRoleClient()
  const { data: lead } = await supabase
    .from("leads")
    .select("id, marketplace_status, status, qualification_metadata")
    .eq("resend_last_email_id", emailId)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ received: true, matched: false })
  }

  const nowIso = new Date().toISOString()
  const meta =
    lead.qualification_metadata && typeof lead.qualification_metadata === "object"
      ? (lead.qualification_metadata as Record<string, any>)
      : {}
  const prevVerifs =
    meta.verifications && typeof meta.verifications === "object" ? meta.verifications : {}

  if (type === "email.delivered") {
    await supabase
      .from("leads")
      .update({
        email_delivery_status: "delivered",
        qualification_metadata: {
          ...meta,
          verifications: {
            ...prevVerifs,
            emailDelivery: {
              status: "delivered",
              at: nowIso,
            },
          },
        },
        updated_at: nowIso,
      })
      .eq("id", lead.id)
  } else {
    // Bounce ou plainte : marquer immédiatement l'e-mail invalide et retirer si encore en vente libre
    const bounceReason =
      event?.data?.bounce?.message ||
      (type === "email.complained" ? "Plainte anti-spam" : "Adresse e-mail inexistante (rebond SMTP)")

    const prevWarnings = Array.isArray(prevVerifs.warningFlags)
      ? (prevVerifs.warningFlags as string[])
      : []

    await supabase
      .from("leads")
      .update({
        email_verified: false,
        email_delivery_status: "bounced",
        email_bounced_at: nowIso,
        status: "NEEDS_HUMAN_REVIEW",
        marketplace_status:
          lead.marketplace_status === "available" ? "pending_review" : lead.marketplace_status,
        qualification_metadata: {
          ...meta,
          verifications: {
            ...prevVerifs,
            emailDelivery: {
              status: "bounced",
              at: nowIso,
              reason: bounceReason,
            },
            warningFlags: Array.from(new Set([...prevWarnings, `E-mail en rebond (${bounceReason})`])),
          },
        },
        updated_at: nowIso,
      })
      .eq("id", lead.id)
  }

  return NextResponse.json({ received: true, matched: true, eventType: type })
}
