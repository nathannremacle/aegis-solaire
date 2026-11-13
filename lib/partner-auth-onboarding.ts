import type { SupabaseClient } from "@supabase/supabase-js"
import { getSiteBaseUrl } from "@/lib/installer-welcome-emails"

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function findAuthUserIdByEmail(
  supabase: SupabaseClient<any, "public", any>,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase()
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error("[partner-auth-onboarding] listUsers error:", error)
      return null
    }
    const users = data?.users ?? []
    const match = users.find((u) => u.email?.toLowerCase().trim() === target)
    if (match?.id) return match.id
    if (users.length < perPage) break
    page += 1
  }

  return null
}

/**
 * Garantit l'existence d'un compte Supabase Auth confirmé pour un partenaire validé
 * et synchronise `partners.auth_user_id`.
 */
export async function ensurePartnerAuthAccount(
  supabase: SupabaseClient<any, "public", any>,
  params: {
    email: string
    companyName?: string | null
    partnerId?: string | null
  }
): Promise<{ userId: string | null; created: boolean }> {
  const email = params.email.trim().toLowerCase()
  let userId = await findAuthUserIdByEmail(supabase, email)
  let created = false

  if (!userId) {
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        role: "partner",
        company_name: params.companyName?.trim() || undefined,
      },
    })

    if (createError) {
      // En cas d'accès concurrent, retenter la lecture
      userId = await findAuthUserIdByEmail(supabase, email)
      if (!userId) {
        console.error("[partner-auth-onboarding] createUser error:", createError)
        return { userId: null, created: false }
      }
    } else if (createdUser?.user?.id) {
      userId = createdUser.user.id
      created = true
    }
  }

  if (userId) {
    const partnerQuery = params.partnerId
      ? supabase.from("partners").update({ auth_user_id: userId }).eq("id", params.partnerId)
      : supabase.from("partners").update({ auth_user_id: userId }).eq("email", email).is("auth_user_id", null)

    const { error: linkError } = await partnerQuery
    if (linkError) {
      console.warn("[partner-auth-onboarding] link auth_user_id warning:", linkError)
    }
  }

  return { userId, created }
}

/**
 * Génère un lien sécurisé de création/réinitialisation de mot de passe
 * pointant directement vers `/partenaires/definir-mot-de-passe?token_hash=...`
 * afin d'éviter la pré-consommation du jeton par les scanners antispam.
 */
export async function generatePartnerPasswordSetupUrl(
  supabase: SupabaseClient<any, "public", any>,
  params: {
    email: string
    baseUrl?: string
  }
): Promise<string | null> {
  const email = params.email.trim().toLowerCase()
  const baseUrl = getSiteBaseUrl(params.baseUrl)
  const redirectTo = `${baseUrl}/partenaires/definir-mot-de-passe`

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  })

  if (error) {
    console.error("[partner-auth-onboarding] generateLink error:", error)
    return null
  }

  const hashedToken = data?.properties?.hashed_token
  if (hashedToken) {
    return `${redirectTo}?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
  }

  return data?.properties?.action_link ?? null
}

export function buildPartnerPasswordResetEmail(params: {
  companyName?: string | null
  setupUrl: string
}): {
  subject: string
  text: string
  html: string
} {
  const company = params.companyName?.trim() || "votre entreprise"
  const subject = `Aegis Solaire — Créez votre mot de passe partenaire (${company})`
  const logoUrl = "https://www.aegissolaire.com/logo.png"

  const text = `Bonjour,

Vous avez demandé l'accès à votre Portail Partenaire Aegis Solaire pour ${company}.

Cliquez sur le lien sécurisé ci-dessous pour définir votre mot de passe et accéder directement à la Marketplace des projets solaires en Wallonie :

Définir mon mot de passe :
${params.setupUrl}

Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.

Des questions ? Répondez simplement à ce message ou écrivez à contact@aegissolaire.com.

Cordialement,
L'équipe support partenaires Aegis Solaire

--
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`.trim()

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 28px 12px 40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #10B981; border-radius: 14px; overflow: hidden;">
          <tr>
            <td style="background-color: #FFFFFF; padding: 22px 32px; border-bottom: 1px solid #E2E8F0;">
              <a href="https://www.aegissolaire.com" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${logoUrl}" alt="Aegis Solaire" width="160" height="34" style="height: 34px; width: auto; max-width: 180px; display: block; border: 0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.08em;">
                Accès Portail Partenaire
              </p>
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; line-height: 1.25; color: #0F172A;">
                Définissez votre mot de passe
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Bonjour,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Utilisez le bouton ci-dessous pour choisir votre mot de passe personnel pour <strong>${escapeHtml(company)}</strong> et accéder immédiatement à la Marketplace Aegis Solaire.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${params.setupUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; border-radius: 10px; padding: 14px 32px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none;">
                      Définir mon mot de passe &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br />
                <a href="${params.setupUrl}" style="color: #2563EB; word-break: break-all;">${escapeHtml(params.setupUrl)}</a>
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                Une question ? Répondez directement à cet e-mail ou écrivez à <a href="mailto:contact@aegissolaire.com" style="color: #2563EB;">contact@aegissolaire.com</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B; line-height: 1.6;">
              Plateforme éditée par INIT42 (Nathan Remacle) &middot; BCE BE 1039.899.980 &middot; Liège, Belgique
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

