import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { loadGlobalEmailBlacklist, safeSendResendEmail } from "./lib/email-blacklist.mjs"

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const idx = t.indexOf("=")
    if (idx <= 0) continue
    const k = t.slice(0, idx).trim()
    let v = t.slice(idx + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnvLocal()

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Vérifier que la liste noire globale contient toutes les adresses désinscrites connues
  const blacklist = await loadGlobalEmailBlacklist(supabase)
  const mustBeBlocked = [
    "bryanlardinois.electricite@gmail.com",
    "fabienne.dans18@gmail.com",
    "contact@srmgt.be",
    "r.delrue@rdsystems.be",
    "philippe.defever@gmail.com",
    "peb@energytips.be",
  ]
  for (const email of mustBeBlocked) {
    assert.ok(blacklist.has(email), `Adresse manquante de la liste noire : ${email}`)
  }

  // 2. Vérifier que safeSendResendEmail bloque un envoi vers Bryan Lardinois sans jamais appeler Resend
  let sendCalls = 0
  const fakeResend = {
    emails: {
      send: async (payload) => {
        sendCalls++
        return { data: { id: "fake" }, error: null, payload }
      },
    },
  }

  const singleBlocked = await safeSendResendEmail(
    fakeResend,
    {
      from: "contact@aegissolaire.com",
      to: "BryanLardinois.Electricite@gmail.com ",
      subject: "Test",
      text: "Test",
    },
    { blacklistSet: blacklist, context: "UNIT_TEST" }
  )
  assert.equal(singleBlocked.blocked, true)
  assert.equal(sendCalls, 0, "Resend ne doit jamais être appelé pour une adresse blacklistée")

  // 3. Vérifier le filtrage partiel sur un tableau mixte
  let lastPayload = null
  const fakeResend2 = {
    emails: {
      send: async (payload) => {
        lastPayload = payload
        return { data: { id: "ok" }, error: null }
      },
    },
  }
  const mixed = await safeSendResendEmail(
    fakeResend2,
    {
      from: "contact@aegissolaire.com",
      to: ["bryanlardinois.electricite@gmail.com", "allowed-test@example.com"],
      subject: "Test",
      text: "Test",
    },
    { blacklistSet: blacklist, context: "UNIT_TEST_MIXED" }
  )
  assert.equal(mixed.blocked, false)
  assert.deepEqual(lastPayload.to, ["allowed-test@example.com"])

  // 4. Vérifier le comportement fail-closed si Supabase renvoie une erreur
  const brokenSupabase = {
    from: () => ({
      select: () => ({
        in: async () => ({ data: null, error: { message: "DB unreachable" } }),
        then: (resolve) => resolve({ data: null, error: { message: "DB unreachable" } }),
      }),
    }),
  }
  await assert.rejects(() => loadGlobalEmailBlacklist(brokenSupabase), /Échec lecture/)

  console.log(`ALL BLACKLIST TESTS PASSED (${blacklist.size} emails in global blacklist).`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
