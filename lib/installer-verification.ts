import { createHmac } from "crypto"
import { createServiceRoleClient } from "@/lib/supabase/admin"

/**
 * Clé secrète pour signer le jeton de vérification d'email de l'installateur.
 * Utilise la clé de service Supabase ou une clé secrète serveur.
 */
function getVerificationSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RESEND_API_KEY ||
    "aegis-solaire-installer-verification-salt-wallonie-2026"
  )
}

/**
 * Génère un jeton cryptographique HMAC-SHA256 basé sur l'ID de candidature et l'adresse email.
 * Ce jeton est infalsifiable sans la clé secrète serveur.
 */
export function generateInstallerVerificationToken(applicationId: string, email: string): string {
  const secret = getVerificationSecret()
  const payload = `${applicationId.toLowerCase().trim()}:${email.toLowerCase().trim()}`
  return createHmac("sha256", secret).update(payload).digest("hex")
}

/**
 * Vérifie l'authenticité d'un jeton pour une candidature et une adresse email données.
 */
export function verifyInstallerVerificationToken(
  applicationId: string,
  email: string,
  token: string
): boolean {
  if (!applicationId || !email || !token) return false
  const expected = generateInstallerVerificationToken(applicationId, email)
  return expected.toLowerCase() === token.toLowerCase().trim()
}

/**
 * Enregistre la validation de l'adresse email dans la base de données.
 * Met à jour installer_applications (admin_notes et email_verified_at si disponible).
 */
export async function recordInstallerEmailVerified(applicationId: string) {
  const supabase = createServiceRoleClient()

  // 1. Récupération de la candidature
  const { data: app, error: fetchErr } = await supabase
    .from("installer_applications")
    .select("id, email, admin_notes")
    .eq("id", applicationId)
    .maybeSingle()

  if (fetchErr || !app) {
    return { success: false, error: "Candidature introuvable." }
  }

  const nowIso = new Date().toISOString()
  const verifiedTag = `[EMAIL_VÉRIFIÉ: ${nowIso}]`

  // Évite d'ajouter le tag en doublon
  const existingNotes = app.admin_notes || ""
  const isAlreadyTagged = existingNotes.includes("[EMAIL_VÉRIFIÉ:")
  const updatedNotes = isAlreadyTagged
    ? existingNotes
    : existingNotes
    ? `${existingNotes} | ${verifiedTag}`
    : verifiedTag

  // 2. Mise à jour de la table installer_applications
  // Tente d'abord avec la colonne optionnelle email_verified_at
  const { error: updateErrWithCol } = await supabase
    .from("installer_applications")
    .update({
      admin_notes: updatedNotes,
      email_verified_at: nowIso,
    })
    .eq("id", applicationId)

  // Si la colonne email_verified_at n'existe pas encore dans la table PostgreSQL, repli propre sur admin_notes
  if (updateErrWithCol) {
    const { error: fallbackErr } = await supabase
      .from("installer_applications")
      .update({
        admin_notes: updatedNotes,
      })
      .eq("id", applicationId)

    if (fallbackErr) {
      console.error("[installer verification] Erreur mise à jour:", fallbackErr)
      return { success: false, error: fallbackErr.message }
    }
  }

  // 3. Synchronisation optionnelle des autres candidatures portant la même adresse email
  if (app.email) {
    try {
      const cleanEmail = app.email.toLowerCase().trim()
      const { data: siblings } = await supabase
        .from("installer_applications")
        .select("id, admin_notes")
        .eq("email", cleanEmail)
        .neq("id", applicationId)

      if (siblings && siblings.length > 0) {
        for (const sibling of siblings) {
          const sNotes = sibling.admin_notes || ""
          if (!sNotes.includes("[EMAIL_VÉRIFIÉ:")) {
            const updatedSiblingNotes = sNotes ? `${sNotes} | ${verifiedTag}` : verifiedTag
            await supabase
              .from("installer_applications")
              .update({ admin_notes: updatedSiblingNotes })
              .eq("id", sibling.id)
          }
        }
      }
    } catch {
      // Tolérant aux erreurs secondaires
    }
  }

  return { success: true, email: app.email, verifiedAt: nowIso }
}

/**
 * Vérifie si l'adresse e-mail d'un installateur ou partenaire a été confirmée.
 * Vérifie la présence de email_verified_at ou du tag [EMAIL_VÉRIFIÉ: ...] dans installer_applications.
 */
export async function isPartnerEmailVerified(email: string): Promise<boolean> {
  if (!email) return false
  const cleanEmail = email.toLowerCase().trim()
  const supabase = createServiceRoleClient()

  const { data: apps, error } = await supabase
    .from("installer_applications")
    .select("id, email, admin_notes")
    .eq("email", cleanEmail)

  if (error || !apps || apps.length === 0) {
    // Si aucune candidature formelle n'existe (compte admin ou partenaire test sans formulaire préalable)
    return true
  }

  // Si au moins une candidature pour cette adresse a été validée, l'accès est débloqué
  const hasVerifiedTag = apps.some(
    (a) => a.admin_notes && a.admin_notes.includes("[EMAIL_VÉRIFIÉ:")
  )
  if (hasVerifiedTag) return true

  // Tente aussi de vérifier si la colonne native email_verified_at existe et est non nulle
  try {
    const { data: appCol } = await supabase
      .from("installer_applications")
      .select("email_verified_at")
      .eq("email", cleanEmail)
      .not("email_verified_at", "is", null)
      .limit(1)
    if (appCol && appCol.length > 0) return true
  } catch {
    // Ignore si la colonne n'existe pas
  }

  return false
}

