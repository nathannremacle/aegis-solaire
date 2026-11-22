import type { SupabaseClient } from "@supabase/supabase-js"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
} from "@/lib/email-templates/installer-email-layout"
import { sendInstallerEmail } from "@/lib/installer-welcome-emails"

export const PARTNER_REFERRAL_REWARD_CREDITS = 3

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function isMissingSchemaError(err: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!err) return false
  return (
    err.code === "42703" ||
    err.code === "42P01" ||
    err.code === "42883" ||
    Boolean(err.message?.includes("referral_code")) ||
    Boolean(err.message?.includes("referred_by_partner_id")) ||
    Boolean(err.message?.includes("partner_referrals"))
  )
}

export function normalizeReferralCode(raw?: string | null): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
}

export function buildDeterministicReferralCode(partnerId: string): string {
  const cleanHex = String(partnerId || "").replace(/[^a-fA-F0-9]/g, "").toUpperCase()
  const suffix = cleanHex.slice(0, 6).padEnd(6, "A")
  return `AEGIS-${suffix}`
}

/**
 * Génère un code de parrainage lisible au format AEGIS-XXXXXX (sans caractères ambigus).
 */
export function generateReferralCode(companyName?: string | null, partnerId?: string): string {
  const prefixChars = String(companyName || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[01IO]/g, "")
    .slice(0, 2)

  let randomPart = ""
  const targetLen = 6 - prefixChars.length
  for (let i = 0; i < targetLen; i++) {
    const idx = Math.floor(Math.random() * REFERRAL_ALPHABET.length)
    randomPart += REFERRAL_ALPHABET[idx]
  }

  const combined = `${prefixChars}${randomPart}`
  if (combined.length === 6) {
    return `AEGIS-${combined}`
  }
  return partnerId ? buildDeterministicReferralCode(partnerId) : `AEGIS-${combined.padEnd(6, "A").slice(0, 6)}`
}

/**
 * Récupère ou provisionne le code de parrainage unique d'un partenaire.
 * Gère gracieusement l'absence éventuelle de la colonne avant exécution SQL.
 */
export async function ensurePartnerReferralCode(
  supabase: SupabaseClient<any, "public", any>,
  partnerId: string,
  companyName?: string | null
): Promise<string> {
  const { data: partnerRow, error: readErr } = await supabase
    .from("partners")
    .select("id, referral_code")
    .eq("id", partnerId)
    .maybeSingle()

  if (readErr) {
    if (isMissingSchemaError(readErr)) {
      return buildDeterministicReferralCode(partnerId)
    }
    console.warn("[partner-referrals] ensurePartnerReferralCode read error:", readErr)
    return buildDeterministicReferralCode(partnerId)
  }

  if (partnerRow?.referral_code) {
    return partnerRow.referral_code
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate =
      attempt === 3
        ? buildDeterministicReferralCode(partnerId)
        : generateReferralCode(companyName, partnerId)

    const { error: updateErr } = await supabase
      .from("partners")
      .update({ referral_code: candidate })
      .eq("id", partnerId)
      .is("referral_code", null)

    if (!updateErr) {
      return candidate
    }
    if (isMissingSchemaError(updateErr)) {
      return buildDeterministicReferralCode(partnerId)
    }
    if (updateErr.code !== "23505") {
      console.warn("[partner-referrals] ensurePartnerReferralCode update error:", updateErr)
      break
    }
  }

  return buildDeterministicReferralCode(partnerId)
}

/**
 * Résout un parrain existant à partir d'un code de parrainage.
 */
export async function resolveReferrerByCode(
  supabase: SupabaseClient<any, "public", any>,
  rawCode?: string | null
): Promise<{ id: string; company_name: string; email: string; referral_code: string } | null> {
  const code = normalizeReferralCode(rawCode)
  if (!code || !code.startsWith("AEGIS-")) {
    return null
  }

  const { data: matched, error } = await supabase
    .from("partners")
    .select("id, company_name, email, referral_code")
    .eq("referral_code", code)
    .maybeSingle()

  if (!error && matched?.id) {
    return {
      id: matched.id,
      company_name: matched.company_name || "Partenaire RESCERT",
      email: matched.email,
      referral_code: matched.referral_code || code,
    }
  }

  if (error && !isMissingSchemaError(error)) {
    console.warn("[partner-referrals] resolveReferrerByCode error:", error)
    return null
  }

  // Fallback déterministe si la colonne referral_code n'est pas encore créée ou backfillée
  const { data: candidates } = await supabase
    .from("partners")
    .select("id, company_name, email")
    .limit(500)

  const match = (candidates ?? []).find(
    (p: { id: string }) => buildDeterministicReferralCode(p.id) === code
  )
  if (!match) return null

  return {
    id: match.id,
    company_name: match.company_name || "Partenaire RESCERT",
    email: match.email,
    referral_code: code,
  }
}

/**
 * Enregistre la candidature d'un filleul dans partner_referrals sans bloquer l'inscription.
 */
export async function recordReferralApplication(
  supabase: SupabaseClient<any, "public", any>,
  params: {
    referrerPartnerId: string
    applicationId: string
    referredEmail: string
    referredCompanyName?: string | null
  }
): Promise<void> {
  const cleanEmail = params.referredEmail.toLowerCase().trim()
  if (!cleanEmail || !params.referrerPartnerId) return

  const { error } = await supabase.from("partner_referrals").upsert(
    {
      referrer_partner_id: params.referrerPartnerId,
      referred_application_id: params.applicationId,
      referred_email: cleanEmail,
      referred_company_name: params.referredCompanyName?.trim() || null,
      status: "pending",
      reward_credits_referrer: PARTNER_REFERRAL_REWARD_CREDITS,
      reward_credits_referred: PARTNER_REFERRAL_REWARD_CREDITS,
    },
    { onConflict: "referred_email", ignoreDuplicates: true }
  )

  if (error && !isMissingSchemaError(error)) {
    console.warn("[partner-referrals] recordReferralApplication warning:", error)
  }
}

/**
 * Lie le compte partenaire nouvellement approuvé à l'entrée partner_referrals existante.
 */
export async function linkApprovedReferralPartner(
  supabase: SupabaseClient<any, "public", any>,
  params: {
    applicationId: string
    referredEmail: string
    partnerId: string
  }
): Promise<void> {
  const cleanEmail = params.referredEmail.toLowerCase().trim()
  if (!cleanEmail || !params.partnerId) return

  const { error } = await supabase
    .from("partner_referrals")
    .update({
      referred_partner_id: params.partnerId,
      referred_application_id: params.applicationId,
      status: "approved",
    })
    .eq("referred_email", cleanEmail)
    .in("status", ["pending", "approved"])
    .neq("referrer_partner_id", params.partnerId)

  if (error && !isMissingSchemaError(error)) {
    console.warn("[partner-referrals] linkApprovedReferralPartner warning:", error)
  }
}

function buildReferralRewardEmail(params: {
  referrerCompanyName: string
  referredCompanyName: string
  rewardCredits: number
  newBalance: number
}): { subject: string; text: string; html: string } {
  const baseUrl = getEmailSiteBaseUrl()
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`
  const subject = `Aegis Solaire — +${params.rewardCredits} crédits offerts suite au parrainage de ${params.referredCompanyName}`

  const text = `Bonjour,

Bonne nouvelle pour ${params.referrerCompanyName} !

Votre confrère certifié RESCERT ${params.referredCompanyName} vient d'effectuer son premier achat payant sur la Marketplace Aegis Solaire.

Comme prévu par le programme de parrainage RESCERT :
- Vos ${params.rewardCredits} crédits offerts ont été ajoutés automatiquement à votre portefeuille.
- Nouveau solde disponible : ${params.newBalance} crédits.
- Votre confrère bénéficie également de +${params.rewardCredits} crédits offerts sur son compte.

Accéder à la Marketplace :
${dashboardUrl}

Des questions ? contact@aegissolaire.com

Cordialement,
L'équipe Partenaires Aegis Solaire`.trim()

  const bodyHtml = `
    <p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.5; color: #142d42;">
      Votre confrère certifié RESCERT <strong>${escapeEmailHtml(params.referredCompanyName)}</strong> vient de valider son premier déblocage payant sur Aegis Solaire.
    </p>

    ${renderFiguresBox(
      {
        label: "Bonus parrainage crédité",
        value: `+${params.rewardCredits} crédits`,
        sublabel: "Crédits offerts immédiatement",
      },
      {
        label: "Votre nouveau solde",
        value: `${params.newBalance} crédits`,
        sublabel: "Utilisables sur B2C & B2B",
      }
    )}

    ${renderCalloutBox({
      label: "Programme Parrainage RESCERT",
      value: `${params.referredCompanyName} a également reçu +${params.rewardCredits} crédits offerts sur son compte partenaire.`,
      tone: "success",
    })}

    ${renderActionBox({
      kicker: "Votre portefeuille est crédité",
      title: `${params.newBalance} crédits disponibles`,
      subtext: "Consultez les chantiers disponibles en Wallonie et à Bruxelles.",
      ctaLabel: "Ouvrir la Marketplace →",
      ctaUrl: dashboardUrl,
    })}
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `+${params.rewardCredits} crédits offerts crédités suite au parrainage de ${params.referredCompanyName}.`,
    reference: "Parrainage RESCERT",
    context: "Programme Partenaires Aegis Solaire",
    contextColor: "#1d5d45",
    headline: `+${params.rewardCredits} crédits offerts`,
    subtitle: `${params.referrerCompanyName} · Bonus parrainage activé`,
    statusPill: { text: "Bonus crédité automatiquement", tone: "success" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance partenaires", href: "mailto:contact@aegissolaire.com" },
      { label: "Accéder à mon portail", href: dashboardUrl },
    ],
  })

  return { subject, text, html }
}

/**
 * Déclenche de manière atomique et idempotente la récompense de parrainage (+3 crédits chacun)
 * lors du tout premier paiement réel d'un partenaire filleul, puis notifie le parrain par e-mail.
 */
export async function triggerPartnerReferralReward(
  supabase: SupabaseClient<any, "public", any>,
  referredPartnerId: string,
  triggerEvent: "first_credit_order" | "first_direct_lead_purchase"
): Promise<{ rewarded: boolean }> {
  if (!referredPartnerId) return { rewarded: false }

  try {
    const { data, error } = await supabase.rpc("reward_partner_referral_if_eligible", {
      p_referred_partner_id: referredPartnerId,
      p_trigger_event: triggerEvent,
    })

    if (error) {
      if (!isMissingSchemaError(error)) {
        console.warn("[partner-referrals] reward RPC warning:", error)
      }
      return { rewarded: false }
    }

    if (!data?.rewarded) {
      return { rewarded: false }
    }

    const referrerPartnerId = String(data.referrer_partner_id || "")
    const rewardCredits = Number(data.referrer_credits || PARTNER_REFERRAL_REWARD_CREDITS)
    const newBalance = Number(data.referrer_new_balance || rewardCredits)

    if (referrerPartnerId) {
      const [{ data: referrer }, { data: referred }] = await Promise.all([
        supabase
          .from("partners")
          .select("id, company_name, email")
          .eq("id", referrerPartnerId)
          .maybeSingle(),
        supabase
          .from("partners")
          .select("id, company_name")
          .eq("id", referredPartnerId)
          .maybeSingle(),
      ])

      if (referrer?.email) {
        const rendered = buildReferralRewardEmail({
          referrerCompanyName: referrer.company_name || "Partenaire Aegis Solaire",
          referredCompanyName: referred?.company_name || "votre confrère RESCERT",
          rewardCredits,
          newBalance,
        })
        await sendInstallerEmail({
          to: referrer.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tag: "partner-referral-reward",
        }).catch((mailErr) => {
          console.warn("[partner-referrals] email notification warning:", mailErr)
        })
      }
    }

    return { rewarded: true }
  } catch (err) {
    console.warn("[partner-referrals] triggerPartnerReferralReward non-blocking warning:", err)
    return { rewarded: false }
  }
}
