/**
 * Envoi contrôlé par vagues géographiques (30–50/jour) aux installateurs certifiés RESCERT.
 * Déduplique automatiquement contre :
 *  - lib/data/optout-emails.json
 *  - public.partners et public.installer_applications
 *  - audit_log (RESCERT_OUTREACH_SENT & RESCERT_OUTREACH_OPTOUT)
 *
 * Usage :
 *   node scripts/send-rescert-outreach-wave.mjs --dry-run --province=liege,hainaut --limit=40
 *   node scripts/send-rescert-outreach-wave.mjs --test-email=mrnathanrem@gmail.com --province=liege
 *   node scripts/send-rescert-outreach-wave.mjs --send --province=liege,hainaut --limit=40
 */

import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE = path.resolve(__dirname, "..")
const workspaceRequire = createRequire(path.join(WORKSPACE, "package.json"))

// 1. Charger .env.local sans écraser les variables shell existantes
const envPath = path.join(WORKSPACE, ".env.local")
if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eqIdx = line.indexOf("=")
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

const ts = workspaceRequire("typescript")
const { Resend } = workspaceRequire("resend")
const { createClient } = workspaceRequire("@supabase/supabase-js")

const moduleCache = new Map()
function loadTs(relPath) {
  const norm = relPath.replace(/\\/g, "/")
  if (moduleCache.has(norm)) return moduleCache.get(norm)
  const fullPath = path.join(WORKSPACE, norm)
  const source = fs.readFileSync(fullPath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText

  const mod = { exports: {} }
  const context = {
    exports: mod.exports,
    module: mod,
    console,
    process: { env: { ...process.env } },
    Buffer,
    URL,
    URLSearchParams,
    require: (name) => {
      if (name.endsWith(".json")) {
        const cleanJson = name.startsWith("@/")
          ? path.join(WORKSPACE, name.slice(2))
          : path.resolve(path.dirname(fullPath), name)
        return JSON.parse(fs.readFileSync(cleanJson, "utf8"))
      }
      if (name.startsWith("@/")) return loadTs(name.slice(2) + ".ts")
      if (name.startsWith("./") || name.startsWith("../")) {
        const targetAbs = path.resolve(path.dirname(fullPath), name) + ".ts"
        return loadTs(path.relative(WORKSPACE, targetAbs))
      }
      return workspaceRequire(name)
    },
  }
  vm.runInNewContext(compiled, context)
  moduleCache.set(norm, context.exports)
  return context.exports
}

function parseArgs(argv) {
  const opts = {
    provinces: ["liege", "hainaut"],
    limit: 40,
    delayMs: 450,
    dryRun: true,
    send: false,
    testEmail: "",
  }
  for (const arg of argv) {
    if (arg === "--send") {
      opts.send = true
      opts.dryRun = false
    } else if (arg === "--dry-run") {
      opts.dryRun = true
      opts.send = false
    } else if (arg.startsWith("--province=") || arg.startsWith("--provinces=")) {
      const val = arg.split("=")[1] || ""
      opts.provinces = val
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    } else if (arg.startsWith("--limit=")) {
      const n = Number(arg.split("=")[1])
      if (Number.isFinite(n) && n > 0) opts.limit = Math.min(50, Math.round(n))
    } else if (arg.startsWith("--delay-ms=")) {
      const n = Number(arg.split("=")[1])
      if (Number.isFinite(n) && n >= 200) opts.delayMs = Math.round(n)
    } else if (arg.startsWith("--test-email=")) {
      opts.testEmail = (arg.split("=")[1] || "").trim()
    }
  }
  return opts
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Variables Supabase manquantes dans .env.local")
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { buildRescertWaveInviteEmail } = loadTs("lib/email-templates/rescert-wave-invite.ts")
  const { isUnreachableMockEmail } = loadTs("lib/lead-relance-engine.ts")

  const rescertRaw = JSON.parse(
    fs.readFileSync(path.join(WORKSPACE, "lib/data/rescert-wallonie-installateurs.json"), "utf8")
  )
  const staticOptouts = JSON.parse(
    fs.readFileSync(path.join(WORKSPACE, "lib/data/optout-emails.json"), "utf8")
  )

  const [partnersRes, appsRes, auditRes, openLeadsRes] = await Promise.all([
    sb.from("partners").select("email"),
    sb.from("installer_applications").select("email"),
    sb
      .from("audit_log")
      .select("action, entity_id")
      .in("action", ["RESCERT_OUTREACH_SENT", "RESCERT_OUTREACH_OPTOUT"]),
    sb
      .from("leads")
      .select(
        "id, province, city, postal_code, surface_area, estimated_power_kwc, annual_electricity_bill, credit_cost, qualification_metadata"
      )
      .eq("marketplace_status", "available")
      .order("created_at", { ascending: false }),
  ])

  const blockedEmails = new Set()
  for (const e of staticOptouts || []) blockedEmails.add(String(e).toLowerCase().trim())
  for (const p of partnersRes.data || []) {
    if (p.email) blockedEmails.add(String(p.email).toLowerCase().trim())
  }
  for (const a of appsRes.data || []) {
    if (a.email) blockedEmails.add(String(a.email).toLowerCase().trim())
  }
  for (const row of auditRes.data || []) {
    if (row.entity_id) blockedEmails.add(String(row.entity_id).toLowerCase().trim())
  }

  const openLeads = (openLeadsRes.data || []).filter(
    (l) => l.qualification_metadata?.is_showcase !== true
  )
  const leadsByProvince = new Map()
  for (const l of openLeads) {
    const pk = String(l.province || "").toLowerCase().trim()
    if (!pk) continue
    if (!leadsByProvince.has(pk)) leadsByProvince.set(pk, [])
    leadsByProvince.get(pk).push(l)
  }

  // Dédupliquer RESCERT par e-mail, nettoyer les entités & exclure hors-zone (ex: .nl),
  // puis équilibrer en round-robin sur toutes les provinces demandées (ex: 20 Liège + 20 Hainaut).
  const decodeEnt = (s) =>
    String(s || "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .trim()

  const seenCandidates = new Set()
  const buckets = new Map()
  for (const pk of opts.provinces) buckets.set(pk, [])

  for (const rec of rescertRaw) {
    const provKey = String(rec.provinceKey || "").toLowerCase().trim()
    if (opts.provinces.length > 0 && !opts.provinces.includes(provKey)) continue
    const cleanEmail = String(rec.email || "").toLowerCase().trim()
    if (!cleanEmail || !cleanEmail.includes("@") || isUnreachableMockEmail(cleanEmail)) continue
    if (cleanEmail.endsWith(".nl") || /^apeldoorn$/i.test(String(rec.city || "").trim())) continue
    if (blockedEmails.has(cleanEmail) || seenCandidates.has(cleanEmail)) continue
    seenCandidates.add(cleanEmail)
    const normalizedRec = {
      ...rec,
      companyName: decodeEnt(rec.companyName),
      certifiedPerson: decodeEnt(rec.certifiedPerson),
    }
    if (!buckets.has(provKey)) buckets.set(provKey, [])
    buckets.get(provKey).push(normalizedRec)
  }

  const queue = []
  const keys = Array.from(buckets.keys())
  let idx = 0
  let added = true
  while (added) {
    added = false
    for (const k of keys) {
      const list = buckets.get(k) || []
      if (idx < list.length) {
        queue.push(list[idx])
        added = true
      }
    }
    idx++
  }

  const batch = queue.slice(0, opts.limit)
  const siteBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@aegissolaire.com"
  const replyToEmail = process.env.RESEND_REPLY_TO || "contact@aegissolaire.com"

  if (opts.testEmail) {
    const sampleRec = batch[0] || queue[0] || {
      companyName: "Installateur RESCERT Test SRL",
      certifiedPerson: "Marc Exemple",
      email: opts.testEmail,
      phone: "",
      postalCode: "4000",
      city: "Liège",
      provinceKey: opts.provinces[0] || "liege",
      provinceLabel: opts.provinces[0] === "hainaut" ? "Hainaut" : "Liège",
    }
    const provKey = String(sampleRec.provinceKey || "liege").toLowerCase()
    const provLeads = leadsByProvince.get(provKey) || []
    const topLead = provLeads[0] || null

    const rendered = buildRescertWaveInviteEmail({
      companyName: sampleRec.companyName,
      certifiedPerson: sampleRec.certifiedPerson,
      email: opts.testEmail,
      phone: sampleRec.phone,
      postalCode: sampleRec.postalCode,
      city: sampleRec.city,
      provinceKey: provKey,
      provinceLabel: sampleRec.provinceLabel || "Liège",
      totalOpenWalloniaCount: openLeads.length,
      provinceOpenCount: provLeads.length,
      sampleLead: topLead
        ? {
            id: topLead.id,
            city: topLead.city,
            postalCode: topLead.postal_code,
            provinceLabel: sampleRec.provinceLabel,
            surfaceAreaM2: Number(topLead.surface_area) || null,
            estimatedPowerKwc: Number(topLead.estimated_power_kwc) || null,
            annualBillEur: Number(topLead.annual_electricity_bill) || null,
            creditCost: topLead.credit_cost ?? 3,
          }
        : null,
      baseUrl: siteBaseUrl,
    })

    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY manquante")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const sendRes = await resend.emails.send({
      from: `Direction des Partenariats — Aegis Solaire <${fromEmail}>`,
      to: opts.testEmail,
      replyTo: replyToEmail,
      subject: `[TEST RESCERT WAVE] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${rendered.optoutUrl}>, <mailto:contact@aegissolaire.com?subject=Desinscription%20RESCERT>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })
    if (sendRes.error) throw new Error(sendRes.error.message)
    console.log(
      JSON.stringify({
        mode: "test_email",
        to: opts.testEmail,
        simulatedCompany: sampleRec.companyName,
        province: provKey,
        resendId: sendRes.data?.id || null,
        inviteUrl: rendered.inviteUrl,
        optoutUrl: rendered.optoutUrl,
      })
    )
    return
  }

  console.log(
    JSON.stringify({
      mode: opts.send ? "LIVE_SEND" : "DRY_RUN",
      provinces: opts.provinces,
      totalOpenWalloniaLeads: openLeads.length,
      openLeadsByProvince: Object.fromEntries(
        Array.from(leadsByProvince.entries()).map(([k, v]) => [k, v.length])
      ),
      eligiblePoolTotal: queue.length,
      batchLimit: opts.limit,
      batchSize: batch.length,
      previewFirst5: batch.slice(0, 5).map((r) => ({
        companyName: r.companyName,
        email: r.email,
        province: r.provinceKey,
        city: r.city,
      })),
    })
  )

  if (!opts.send) return

  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY manquante")
  const resend = new Resend(process.env.RESEND_API_KEY)

  let sentCount = 0
  let failedCount = 0
  const waveTag = `wave_${new Date().toISOString().slice(0, 10)}_${opts.provinces.join("-")}`

  for (const rec of batch) {
    const provKey = String(rec.provinceKey || "").toLowerCase().trim()
    const provLeads = leadsByProvince.get(provKey) || []
    const topLead = provLeads[0] || null

    const rendered = buildRescertWaveInviteEmail({
      companyName: rec.companyName,
      certifiedPerson: rec.certifiedPerson,
      email: rec.email,
      phone: rec.phone,
      postalCode: rec.postalCode,
      city: rec.city,
      provinceKey: provKey,
      provinceLabel: rec.provinceLabel || provKey,
      totalOpenWalloniaCount: openLeads.length,
      provinceOpenCount: provLeads.length,
      sampleLead: topLead
        ? {
            id: topLead.id,
            city: topLead.city,
            postalCode: topLead.postal_code,
            provinceLabel: rec.provinceLabel,
            surfaceAreaM2: Number(topLead.surface_area) || null,
            estimatedPowerKwc: Number(topLead.estimated_power_kwc) || null,
            annualBillEur: Number(topLead.annual_electricity_bill) || null,
            creditCost: topLead.credit_cost ?? 3,
          }
        : null,
      baseUrl: siteBaseUrl,
    })

    const sendRes = await resend.emails.send({
      from: `Direction des Partenariats — Aegis Solaire <${fromEmail}>`,
      to: rec.email,
      replyTo: replyToEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        "List-Unsubscribe": `<${rendered.optoutUrl}>, <mailto:contact@aegissolaire.com?subject=Desinscription%20RESCERT>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })

    if (sendRes.error) {
      failedCount++
      console.error(`[RESCERT WAVE ERROR] ${rec.email}:`, sendRes.error.message)
    } else {
      sentCount++
      await sb.from("audit_log").insert({
        admin_email: "system@aegissolaire.com",
        action: "RESCERT_OUTREACH_SENT",
        entity_type: "rescert_outreach",
        entity_id: String(rec.email).toLowerCase().trim(),
        details: {
          companyName: rec.companyName,
          provinceKey: provKey,
          waveTag,
          resendId: sendRes.data?.id || null,
        },
      })
    }

    await sleep(opts.delayMs)
  }

  console.log(JSON.stringify({ waveTag, sentCount, failedCount }))
}

main().catch((err) => {
  console.error("FATAL:", err.message || err)
  process.exit(1)
})
