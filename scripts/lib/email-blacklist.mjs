import fs from "node:fs"
import path from "node:path"

const BLACKLIST_AUDIT_ACTIONS = [
  "RESCERT_OUTREACH_OPTOUT",
  "EMAIL_BLACKLISTED",
  "PARTNER_OPTOUT_ALL",
]

export function normalizeEmail(email) {
  return String(email ?? "").toLowerCase().trim()
}

/**
 * Charge la liste noire globale (fichiers JSON locaux + Supabase audit_log & partners).
 * FAIL-CLOSED : lève une erreur si le fichier principal manque ou si Supabase échoue.
 */
export async function loadGlobalEmailBlacklist(supabase, rootDir = process.cwd()) {
  if (!supabase) {
    throw new Error("[EmailBlacklist] Client Supabase requis pour vérifier la liste noire.")
  }

  const rescertOptoutPath = path.resolve(rootDir, "lib/data/optout-emails.json")
  const b2cOptoutPath = path.resolve(rootDir, "lib/data/b2c-optout-emails.json")

  if (!fs.existsSync(rescertOptoutPath)) {
    throw new Error(`[EmailBlacklist] Fichier liste noire introuvable : ${rescertOptoutPath}`)
  }

  const blacklist = new Set()
  const rescertList = JSON.parse(fs.readFileSync(rescertOptoutPath, "utf8"))
  for (const raw of Array.isArray(rescertList) ? rescertList : []) {
    const em = normalizeEmail(raw)
    if (em) blacklist.add(em)
  }

  if (fs.existsSync(b2cOptoutPath)) {
    const b2cList = JSON.parse(fs.readFileSync(b2cOptoutPath, "utf8"))
    for (const raw of Array.isArray(b2cList) ? b2cList : []) {
      const em = normalizeEmail(raw)
      if (em) blacklist.add(em)
    }
  }

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
    throw new Error(`[EmailBlacklist] Échec lecture audit_log : ${auditRes.error.message}`)
  }
  if (partnersRes.error) {
    throw new Error(`[EmailBlacklist] Échec lecture partners : ${partnersRes.error.message}`)
  }

  for (const row of auditRes.data || []) {
    const em = normalizeEmail(row.entity_id)
    if (em && em.includes("@")) blacklist.add(em)
  }

  for (const p of partnersRes.data || []) {
    const em = normalizeEmail(p.email)
    if (!em) continue
    const surfaces = Array.isArray(p.target_surfaces) ? p.target_surfaces : []
    if (p.email_notifications_enabled === false || surfaces.includes("__optout_all__")) {
      blacklist.add(em)
    }
  }

  return blacklist
}

export async function safeSendResendEmail(resend, payload, { blacklistSet, supabase, context = "Script" }) {
  const blacklist = blacklistSet ?? (await loadGlobalEmailBlacklist(supabase))
  const rawTo = Array.isArray(payload.to) ? payload.to : [payload.to]
  const allowedTo = rawTo.filter((addr) => {
    const em = normalizeEmail(addr)
    return em && !blacklist.has(em)
  })
  const blockedTo = rawTo.filter((addr) => {
    const em = normalizeEmail(addr)
    return !em || blacklist.has(em)
  })

  if (blockedTo.length > 0) {
    console.warn(`[BLACKLIST_BLOCKED] (${context}) Envoi bloqué pour : ${blockedTo.join(", ")}`)
  }
  if (allowedTo.length === 0) {
    return { blocked: true, data: null, error: null }
  }

  const finalPayload = {
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
