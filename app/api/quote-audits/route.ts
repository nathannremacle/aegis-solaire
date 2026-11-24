import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getBelgiumProvinceKeyFromPostalCode } from "@/lib/belgium-regions"
import { resolveLeadPhoneE164, getEmailError } from "@/lib/leads-validation"
import { checkRateLimit } from "@/lib/rate-limit"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const QUOTE_AUDITS_BUCKET = "quote-audits"
const MAX_FILE_BYTES = 12 * 1024 * 1024 // 12 Mo

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])

export async function POST(request: NextRequest) {
  try {
    if (!(await checkRateLimit(request))) {
      return NextResponse.json(
        { error: "Trop de demandes. Veuillez réessayer plus tard." },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const honeypot = String(formData.get("fax_number") || "").trim()
    if (honeypot !== "") {
      return NextResponse.json({ success: true, id: randomUUID() })
    }

    const file = formData.get("file") as File | null
    const postalCode = String(formData.get("postalCode") || "").trim()
    const segment = formData.get("segment") === "B2B" ? "B2B" : "B2C"
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const phoneRaw = String(formData.get("phone") || "").trim()
    const contactPreference =
      formData.get("contactPreference") === "direct_call" ? "direct_call" : "written_first"
    const wantsCounterOffer = formData.get("wantsCounterOffer") === "true"

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Veuillez joindre votre devis (PDF ou photo)." }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Fichier invalide ou supérieur à 12 Mo." }, { status: 400 })
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      return NextResponse.json(
        { error: "Format accepté : PDF, JPG, PNG ou WEBP uniquement." },
        { status: 400 }
      )
    }
    if (!/^[1-9][0-9]{3}$/.test(postalCode)) {
      return NextResponse.json({ error: "Code postal belge valide requis (4 chiffres)." }, { status: 400 })
    }
    const emailErr = getEmailError(email)
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 })
    }
    const phoneResolved = resolveLeadPhoneE164(phoneRaw, segment)
    if (!phoneResolved.valid || !phoneResolved.e164) {
      return NextResponse.json(
        { error: phoneResolved.error || "Numéro de téléphone belge invalide." },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const province = getBelgiumProvinceKeyFromPostalCode(postalCode) || "liege"
    const cleanName = (file.name || "devis.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
    const storagePath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${cleanName}`

    // S'assurer que le bucket privé existe
    try {
      await supabase.storage.createBucket(QUOTE_AUDITS_BUCKET, { public: false })
    } catch {
      // Déjà existant
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await supabase.storage
      .from(QUOTE_AUDITS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadErr) {
      console.error("[Quote Audit] Storage upload error:", uploadErr)
      return NextResponse.json(
        { error: "Impossible de téléverser votre document de manière sécurisée." },
        { status: 500 }
      )
    }

    const { data: auditRow, error: insErr } = await supabase
      .from("quote_audits")
      .insert({
        segment,
        postal_code: postalCode,
        province,
        email,
        phone: phoneResolved.e164,
        contact_preference: contactPreference,
        wants_counter_offer: wantsCounterOffer,
        file_path: storagePath,
        file_name: cleanName,
        file_mime: file.type,
        status: "pending_audit",
      })
      .select("id")
      .single()

    if (insErr || !auditRow) {
      console.error("[Quote Audit] DB insert error:", insErr)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement de votre audit." }, { status: 500 })
    }

    // Notification interne Cellule Technique
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com",
          to: "contact@aegissolaire.com",
          subject: `[Contre-Expertise Devis] Nouveau devis ${segment} à contrôler (${postalCode})`,
          text: `Nouveau devis déposé sur /verifier-mon-devis\nID: ${auditRow.id}\nSegment: ${segment}\nCP: ${postalCode} (${province})\nEmail: ${email}\nTel: ${phoneResolved.e164}\nContre-offre demandée d'emblée: ${wantsCounterOffer ? "Oui" : "Après rapport"}`,
        })
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({
      success: true,
      auditId: auditRow.id,
      message: "Votre devis a bien été transmis à la Cellule Technique Aegis Solaire.",
    })
  } catch (err: any) {
    console.error("[Quote Audit] Error:", err)
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 })
  }
}
