import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { buildInstallerReferralLaunchEmail } from "../lib/email-templates/installer-referral-launch"
import { buildLeadDirectPurchaseConfirmationEmail } from "../lib/email-templates/installer-transactional"
import { getPartnerNotificationMode } from "../lib/partner-notification-prefs"
import { buildPartnerNotificationUrls } from "../lib/partner-notification-tokens"
import { ensurePartnerReferralCode } from "../lib/partner-referrals"
import { isDevTestPartner, isUnreachableMockEmail } from "../lib/lead-relance-engine"

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return
  const envFile = fs.readFileSync(envPath, "utf8")
  for (const rawLine of envFile.split("\n")) {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let val = trimmed.slice(idx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

loadEnvLocal()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function assertEmailQuality(
  label: string,
  payload: { subject: string; text: string; html: string },
  options: { requireDirectRefUrlInHtml?: boolean } = {}
) {
  const { subject, text, html } = payload
  const combined = `${subject}\n${text}\n${html}`
  const requireDirectRefUrlInHtml = options.requireDirectRefUrlInHtml ?? true

  if (/[🔒🛡️⚡🎯👉✅]/.test(combined)) {
    throw new Error(`[${label}] Emoji non conforme détecté dans le rendu.`)
  }
  if (/<code\b/i.test(html)) {
    throw new Error(`[${label}] Balise <code> brute interdite détectée dans le HTML.`)
  }
  if (/fabrice\s+remacle/i.test(combined)) {
    throw new Error(`[${label}] Mention personnelle interdite détectée (Fabrice Remacle).`)
  }

  // Seule occurrence légale autorisée : "Plateforme éditée par INIT42 (Nathan Remacle)"
  const strippedLegal = combined.replace(
    /Plateforme éditée par INIT42 \(Nathan Remacle\)/g,
    ""
  )
  if (/nathan\s+remacle/i.test(strippedLegal)) {
    throw new Error(`[${label}] Mention personnelle interdite détectée hors footer légal.`)
  }

  if (!html.includes("https://wa.me/?text=") || !text.includes("https://wa.me/?text=")) {
    throw new Error(`[${label}] Lien de partage WhatsApp 1-clic manquant.`)
  }
  if (
    (requireDirectRefUrlInHtml && !html.includes("/partenaires?ref=")) ||
    !text.includes("/partenaires?ref=")
  ) {
    throw new Error(`[${label}] Lien personnel /partenaires?ref= manquant.`)
  }
  if (!/autre province/i.test(html) || !/autre province/i.test(text)) {
    throw new Error(`[${label}] Argument clé « autre province » manquant.`)
  }
}

async function fetchEligiblePartners() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return null
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [{ data: partners, error }, { data: purchases }] = await Promise.all([
    supabase
      .from("partners")
      .select(
        "id, company_name, email, credits, referral_code, target_surfaces, is_test, email_notifications_enabled"
      )
      .order("created_at", { ascending: false }),
    supabase.from("lead_purchases").select("partner_id"),
  ])

  if (error) {
    throw new Error(`Erreur Supabase lors de la lecture des partenaires : ${error.message}`)
  }

  const buyerIds = new Set(
    (purchases || [])
      .map((r: { partner_id?: string | null }) => r.partner_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )

  const eligible = (partners || [])
    .filter((p: any) => {
      if (!p.email || isUnreachableMockEmail(p.email)) return false
      if (isDevTestPartner(p)) return false
      if (getPartnerNotificationMode(p) === "none") return false
      return true
    })
    .map((p: any) => ({
      id: String(p.id),
      company_name: (p.company_name as string | null) ?? null,
      email: String(p.email),
      credits: typeof p.credits === "number" ? p.credits : Number(p.credits ?? 0),
      referral_code: (p.referral_code as string | null) ?? null,
      hasPurchased: buyerIds.has(p.id),
    }))

  return { supabase, eligible }
}

async function main() {
  const args = process.argv.slice(2)
  const testArg = args.find((a) => a.startsWith("--test="))
  const isBroadcast = args.includes("--broadcast")
  const isConfirmed = args.includes("--confirm")
  const buyersOnly = args.includes("--buyers-only")
  const isDryRun = !testArg && !isBroadcast

  const siteBaseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com"
  ).replace(/\/$/, "")

  // 1. Génération systématique des aperçus + assertions qualité
  const launchSample = buildInstallerReferralLaunchEmail({
    partnerId: "00000000-0000-4000-8000-000000000001",
    companyName: "SolarTech Wallonie SRL",
    referralCode: "AEGIS-SO94K2",
    credits: 6,
    baseUrl: siteBaseUrl,
  })
  assertEmailQuality("referral-launch", launchSample)

  const transactionalSample = buildLeadDirectPurchaseConfirmationEmail({
    leadId: "11111111-1111-4111-8111-111111111111",
    segment: "B2C",
    invoiceRef: "AEGIS-2026-0042",
    companyName: "SolarTech Wallonie SRL",
    leadName: "Jean-Pierre Martin",
    phone: "+32 475 12 34 56",
    email: "jp.martin@exemple.be",
    addressLine: "Rue de la Station 14, 4000 Liège",
    locationSubtitle: "4000 Liège",
    contactPreferenceLabel: "Par e-mail ou SMS",
    priceHtva: 29.5,
    vatAmount: 6.2,
    priceTtc: 35.7,
    paymentMethodLabel: "Bancontact",
    transactionId: "tr_sample_01",
    referralCode: "AEGIS-SO94K2",
  })
  assertEmailQuality("transactional-referral-footnote", transactionalSample, {
    requireDirectRefUrlInHtml: false,
  })

  const previewDir = path.resolve(process.cwd(), "scratch", "previews")
  fs.mkdirSync(previewDir, { recursive: true })
  const launchPreviewPath = path.join(previewDir, "email-preview-partner-referral-launch.html")
  const txPreviewPath = path.join(previewDir, "email-preview-transactional-referral.html")
  fs.writeFileSync(launchPreviewPath, launchSample.html, "utf8")
  fs.writeFileSync(txPreviewPath, transactionalSample.html, "utf8")

  console.log(`✓ Assertions qualité passées (lancement + encart transactionnel).`)
  console.log(`✓ Aperçu lancement : ${launchPreviewPath}`)
  console.log(`✓ Aperçu encart transactionnel : ${txPreviewPath}`)

  if (isDryRun) {
    console.log(`\nMode --dry-run actif : aucun e-mail ne sera envoyé.`)
    try {
      const res = await fetchEligiblePartners()
      if (!res) {
        console.log(
          "Variables Supabase absentes — comptage des destinataires ignoré (dry-run local OK)."
        )
        return
      }
      const buyers = res.eligible.filter((p) => p.hasPurchased)
      console.log(
        `Partenaires éligibles (opt-in, hors test) : ${res.eligible.length} au total | ${buyers.length} acheteur(s) actif(s)`
      )
      for (const p of res.eligible.slice(0, 15)) {
        console.log(
          `  - ${p.company_name || "Partenaire"} <${p.email}> · ${p.credits} cr. · ${p.hasPurchased ? "ACHETEUR" : "INSC. SANS ACHAT"} · code=${p.referral_code || "(à provisionner)"}`
        )
      }
    } catch (err: any) {
      console.warn(`Comptage Supabase ignoré : ${err?.message || err}`)
    }
    return
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY manquante dans .env.local / environnement.")
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
  const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"
  const resend = new Resend(resendApiKey)

  if (testArg) {
    const targetEmail = testArg.slice("--test=".length).trim()
    if (!targetEmail || !targetEmail.includes("@")) {
      throw new Error(`Adresse e-mail de test invalide : "${targetEmail}"`)
    }
    const { data, error } = await resend.emails.send({
      from: `Aegis Solaire — Équipe Partenaires <${fromEmail}>`,
      to: targetEmail,
      replyTo: replyToEmail,
      subject: `[TEST] ${launchSample.subject}`,
      html: launchSample.html,
      text: launchSample.text,
      tags: [{ name: "category", value: "partner-referral-launch-test" }],
    })
    if (error) {
      throw new Error(`Échec envoi test Resend : ${error.message}`)
    }
    console.log(`✓ E-mail de test envoyé à ${targetEmail} (Resend ID : ${data?.id})`)
    return
  }

  if (isBroadcast) {
    if (!isConfirmed) {
      throw new Error(
        "Sécurité : l'option --broadcast exige explicitement le flag --confirm pour envoyer aux vrais partenaires."
      )
    }

    const dbRes = await fetchEligiblePartners()
    if (!dbRes) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis pour --broadcast.")
    }

    const recipients = buyersOnly
      ? dbRes.eligible.filter((p) => p.hasPurchased)
      : dbRes.eligible

    console.log(
      `Démarrage diffusion (${buyersOnly ? "acheteurs actifs uniquement" : "tous opt-in"}) : ${recipients.length} partenaire(s)...`
    )

    let sent = 0
    let failed = 0

    for (let i = 0; i < recipients.length; i++) {
      const partner = recipients[i]
      const referralCode = await ensurePartnerReferralCode(
        dbRes.supabase as any,
        partner.id,
        partner.company_name
      )
      const rendered = buildInstallerReferralLaunchEmail({
        partnerId: partner.id,
        companyName: partner.company_name,
        referralCode,
        credits: partner.credits,
        baseUrl: siteBaseUrl,
      })
      assertEmailQuality(`broadcast:${partner.email}`, rendered)

      const notifUrls = buildPartnerNotificationUrls(siteBaseUrl, partner.id, partner.email)

      try {
        const { error } = await resend.emails.send({
          from: `Aegis Solaire — Équipe Partenaires <${fromEmail}>`,
          to: partner.email,
          replyTo: replyToEmail,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: {
            "List-Unsubscribe": `<${notifUrls.muteAllUrl}>, <mailto:contact@aegissolaire.com?subject=Desabonnement>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [{ name: "category", value: "partner-referral-launch" }],
        })

        if (error) {
          failed++
          console.error(`  ✗ ${partner.email} : ${error.message}`)
        } else {
          sent++
          console.log(`  ✓ [${i + 1}/${recipients.length}] ${partner.email} (${referralCode})`)
        }
      } catch (err: any) {
        failed++
        console.error(`  ✗ ${partner.email} : ${err?.message || err}`)
      }

      if (i < recipients.length - 1) {
        await sleep(300)
      }
    }

    console.log(`\nBilan diffusion parrainage : ${sent} envoyé(s), ${failed} échec(s).`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
