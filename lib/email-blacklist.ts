import type { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import rescertOptoutEmails from "@/lib/data/optout-emails.json"
import b2cOptoutEmails from "@/lib/data/b2c-optout-emails.json"
import { OPTOUT_ALL_MARKER } from "@/lib/partner-notification-prefs"

const BLACKLIST_AUDIT_ACTIONS = [
  "RESCERT_OUTREACH_OPTOUT",
  "EMAIL_BLACKLISTED",
  "PARTNER_OPTOUT_ALL",
]

export function normalizeEmail(email: unknown): string {
  return String(email ?? "").toLowerCase().trim()
}

/**
 * Charge la liste noire globale depuis TOUTES les sources officielles :
 * 1. Fichiers statiques `lib/data/optout-emails.json` et `lib/data/b2c-optout-emails.json`
 * 2. Table Supabase `audit_log` (`RESCERT_OUTREACH_OPTOUT`, `EMAIL_BLACKLISTED`, `PARTNER_OPTOUT_ALL`)
 * 3. Table Supabase `partners` (`email_notifications_enabled = false` ou `__optout_all__`)
 *
 * FAIL-CLOSED : lève une exception si une requête Supabase échoue afin de ne jamais envoyer
 * avec une liste noire vide ou partielle.
 */
export async function loadGlobalEmailBlacklist(
  supabaseClient?: ReturnType<typeof createServiceRoleClient>
): Promise<Set<string>> {
  const supabase = supabaseClient ?? createServiceRoleClient()

  const [auditRes, partnersRes] = await Promise.all([
    supabase
      .from("audit_log")
      .select("entity_id")
      .in("action", BLACKLIST_AUDIT_ACTIONS),
    supabase
      .from("partners")
      .select("email, email_notifications_enabled, target_surfaces"),
  ])

  if (auditRes.error) {
    throw new Error(
      `[EmailBlacklist] Échec lecture audit_log : ${auditRes.error.message}`
    )
  }
  if (partnersRes.error) {
    throw new Error(
      `[EmailBlacklist] Échec lecture partners : ${partnersRes.error.message}`
    )
  }

  const blacklist = new Set<string>()

  for (const raw of Array.isArray(rescertOptoutEmails) ? rescertOptoutEmails : []) {
    const em = normalizeEmail(raw)
    if (em) blacklist.add(em)
  }
  for (const raw of Array.isArray(b2cOptoutEmails) ? b2cOptoutEmails : []) {
    const em = normalizeEmail(raw)
    if (em) blacklist.add(em)
  }

  for (const row of (auditRes.data as Array<{ entity_id?: string | null }>) || []) {
    const em = normalizeEmail(row.entity_id)
    if (em && em.includes("@")) blacklist.add(em)
  }

  for (const p of (partnersRes.data as Array<{
    email?: string | null
    email_notifications_enabled?: boolean | null
    target_surfaces?: unknown
  }>) || []) {
    const em = normalizeEmail(p.email)
    if (!em) continue
    const surfaces = Array.isArray(p.target_surfaces) ? p.target_surfaces : []
    if (
      p.email_notifications_enabled === false ||
      surfaces.includes(OPTOUT_ALL_MARKER)
    ) {
      blacklist.add(em)
    }
  }

  return blacklist
}

export function isEmailBlacklisted(
  email: unknown,
  blacklist: Set<string>
): boolean {
  const em = normalizeEmail(email)
  return !em || blacklist.has(em)
}

type ResendSendPayload = Parameters<Resend["emails"]["send"]>[0]

export async function safeSendResendEmail(
  resend: Resend,
  payload: ResendSendPayload,
  opts?: {
    blacklistSet?: Set<string>
    supabase?: ReturnType<typeof createServiceRoleClient>
    context?: string
  }
): Promise<{
  blocked: boolean
  data: { id: string } | null
  error: unknown
}> {
  const blacklist =
    opts?.blacklistSet ?? (await loadGlobalEmailBlacklist(opts?.supabase))
  const contextLabel = opts?.context ?? "Resend"

  const rawTo = Array.isArray(payload.to) ? payload.to : [payload.to]
  const allowedTo = rawTo.filter((addr) => !isEmailBlacklisted(addr, blacklist))
  const blockedTo = rawTo.filter((addr) => isEmailBlacklisted(addr, blacklist))

  if (blockedTo.length > 0) {
    console.warn(
      `[BLACKLIST_BLOCKED] (${contextLabel}) Envoi bloqué pour : ${blockedTo.join(", ")}`
    )
  }

  if (allowedTo.length === 0) {
    return { blocked: true, data: null, error: null }
  }

  const finalPayload: ResendSendPayload = {
    ...payload,
    to: Array.isArray(payload.to) ? allowedTo : allowedTo[0],
  }

  const res = await resend.emails.send(finalPayload)
  return {
    blocked: false,
    data: res.data ?? null,
    error: res.error ?? null,
  }
}
