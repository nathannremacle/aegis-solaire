/**
 * Envoi contrôlé par vagues géographiques (30–50/jour) aux installateurs certifiés RESCERT.
 * Déduplique automatiquement contre :
 *  - lib/data/optout-emails.json (+ lib/data/b2c-optout-emails.json)
 *  - public.partners et public.installer_applications
 *  - public.audit_log (RESCERT_OUTREACH_SENT & RESCERT_OUTREACH_OPTOUT)
 *  - Les 7 rapports historiques scratch/wave*.json
 *  - L'historique complet de l'API Resend (envois + bounces/complaints)
 *  - La liste de sécurité HARD_BOUNCED_EMAILS et BLACKLIST_TERMS
 *  - Vérification DNS MX sur le domaine du destinataire
 *
 * Usage :
 *   node scripts/send-rescert-outreach-wave.mjs --sync-audit --dry-run --province=liege --limit=40
 *   node scripts/send-rescert-outreach-wave.mjs --dry-run --province=liege,hainaut --limit=40
 *   node scripts/send-rescert-outreach-wave.mjs --test-email=mrnathanrem@gmail.com --province=liege
 *   node scripts/send-rescert-outreach-wave.mjs --send --province=liege --limit=40
 */

import dns from "node:dns/promises"
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

const PRIOR_REPORT_FILES = [
  "scratch/wave1-execution-report.json",
  "scratch/wave2-execution-report.json",
  "scratch/wave-liege1-execution-report.json",
  "scratch/wave-namur1-execution-report.json",
  "scratch/wave-batch2-execution-report.json",
  "scratch/wave-real-leads-4waves-report.json",
  "scratch/wave-hainaut-namur-clickers-report.json",
]

const HARD_BOUNCED_EMAILS = [
  "info.sowatts@gmail.com",
  "frederik.ruison@bilfinger.com",
  "contact@hotelec.be",
  "rc@hotelec.be",
  "frederic@homegridsolutions.be",
  "contact@wenergy-consulting.com",
  "thibaut.cougnet@we-green.be",
  "adriano.cremona@corelis.be",
  "tristan@electrici-t.be",
  "info@renovalenergie.be",
  "bensilvio2000@yahoo.fr",
  "olivier@carodel.net",
  "gert@aaves.be",
  "contact@performa.be",
  "info@lazogroup.be",
  "berardozzi@outlook.fr",
  "pro@ecotoit-energie.be",
  "contact@solaris-wallonie.be",
  "direction@ardenne-watts.be",
  "rh@monnaie.be",
  "pierregomand@gogui.be",
  "anthony.devleeshouwer@gmail.com",
  "info@elthium.be",
  "val@renovalenergie.be",
]

const BLACKLIST_TERMS = [
  "auvray",
  "housing energy",
  "ideal energy",
  "ideal-energy",
  "watup",
  "mc industry",
  "mc-industry",
  "mcindustry",
  "batelex",
  "hotelec",
  "etienne botman",
  "giacomo zenoni",
  "enolix",
  "bryan lardinois",
]

const ADMIN_EMAILS_EXCLUDE = new Set(["mrnathanrem@gmail.com", "fabrice.remacle@gmail.com"])

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
    syncAudit: false,
    allowEmptyProvinceLeads: false,
    testEmail: "",
  }
  for (const arg of argv) {
    if (arg === "--send") {
      opts.send = true
      opts.dryRun = false
    } else if (arg === "--dry-run") {
      opts.dryRun = true
      opts.send = false
    } else if (arg === "--sync-audit") {
      opts.syncAudit = true
    } else if (arg === "--allow-empty-province-leads") {
      opts.allowEmptyProvinceLeads = true
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

function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase()
}

function decodeEnt(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim()
}

function isBlacklisted(installer) {
  const haystack = `${installer.companyName || ""} ${installer.email || ""} ${installer.certifiedPerson || ""}`.toLowerCase()
  return BLACKLIST_TERMS.some((t) => haystack.includes(t))
}

const mxCache = new Map()
async function hasValidMxRecord(email) {
  const domain = String(email || "").split("@")[1]?.toLowerCase().trim()
  if (!domain) return false
  if (mxCache.has(domain)) return mxCache.get(domain)
  try {
    const records = await dns.resolveMx(domain)
    const ok = Array.isArray(records) && records.length > 0
    mxCache.set(domain, ok)
    return ok
  } catch {
    mxCache.set(domain, false)
    return false
  }
}

async function fetchAllResendEmails(apiKey) {
  const all = []
  let after = null
  for (let page = 0; page < 30; page++) {
    const url = "https://api.resend.com/emails?limit=100" + (after ? "&after=" + after : "")
    const res = await fetch(url, { headers: { Authorization: "Bearer " + apiKey } })
    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      throw new Error(`Resend API error (${res.status}) while fetching email history: ${errBody}`)
    }
    const json = await res.json()
    if (!json.data || json.data.length === 0) break
    all.push(...json.data)
    if (!json.has_more) break
    after = json.data[json.data.length - 1].id
    await sleep(550)
  }
  return all
}

function extractEntriesFromPriorReports() {
  const entries = new Map()
  for (const relPath of PRIOR_REPORT_FILES) {
    const full = path.join(WORKSPACE, relPath)
    if (!fs.existsSync(full)) continue
    const data = JSON.parse(fs.readFileSync(full, "utf8"))
    const arrays = Array.isArray(data)
      ? [data]
      : [data.sent, data.sentEmails, data.results, data.recipients, data.emails, data.logs].filter(Array.isArray)
    for (const arr of arrays) {
      for (const item of arr) {
        const em = normalizeEmail(typeof item === "string" ? item : item?.email || item?.to || item?.recipient)
        if (!em || ADMIN_EMAILS_EXCLUDE.has(em)) continue
        if (!entries.has(em)) {
          entries.set(em, {
            email: em,
            companyName: typeof item === "object" && item ? decodeEnt(item.companyName || item.company || "") : "",
            source: relPath,
          })
        }
      }
    }
  }
  return entries
}

async function fetchAllTableRows(buildQuery) {
  const all = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
  }
  return all
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Variables Supabase manquantes dans .env.local")
  }
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY manquante dans .env.local")
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
  const b2cOptoutPath = path.join(WORKSPACE, "lib/data/b2c-optout-emails.json")
  const b2cOptouts = fs.existsSync(b2cOptoutPath)
    ? JSON.parse(fs.readFileSync(b2cOptoutPath, "utf8"))
    : []

  const rescertByEmail = new Map()
  for (const rec of rescertRaw) {
    const em = normalizeEmail(rec.email)
    if (!em || rescertByEmail.has(em)) continue
    rescertByEmail.set(em, {
      companyName: decodeEnt(rec.companyName),
      provinceKey: String(rec.provinceKey || "").toLowerCase().trim() || "unknown",
    })
  }

  const [partnersData, appsData, auditData, openLeadsRes, resendHistory] = await Promise.all([
    fetchAllTableRows(() => sb.from("partners").select("email")),
    fetchAllTableRows(() => sb.from("installer_applications").select("email")),
    fetchAllTableRows(() =>
      sb
        .from("audit_log")
        .select("action, entity_id")
        .in("action", ["RESCERT_OUTREACH_SENT", "RESCERT_OUTREACH_OPTOUT"])
    ),
    sb
      .from("leads")
      .select(
        "id, province, city, postal_code, surface_area, estimated_power_kwc, annual_electricity_bill, credit_cost, qualification_metadata"
      )
      .eq("marketplace_status", "available")
      .order("created_at", { ascending: false }),
    fetchAllResendEmails(process.env.RESEND_API_KEY),
  ])

  if (openLeadsRes.error) throw openLeadsRes.error

  const reportEntries = extractEntriesFromPriorReports()
  const resendSentEmails = new Set()
  const resendBouncedEmails = new Set()
  for (const e of resendHistory) {
    const ev = String(e.last_event || "").toLowerCase()
    for (const to of e.to || []) {
      const em = normalizeEmail(to)
      if (!em || ADMIN_EMAILS_EXCLUDE.has(em)) continue
      resendSentEmails.add(em)
      if (ev === "bounced" || ev === "complained") {
        resendBouncedEmails.add(em)
      }
    }
  }

  const existingAuditSentEmails = new Set()
  const auditBlockedEmails = new Set()
  for (const row of auditData) {
    const em = normalizeEmail(row.entity_id)
    if (!em) continue
    auditBlockedEmails.add(em)
    if (row.action === "RESCERT_OUTREACH_SENT") {
      existingAuditSentEmails.add(em)
    }
  }

  // Synchroniser l'historique RESCERT (rapports scratch + Resend) dans public.audit_log
  let syncedToAuditCount = 0
  if (opts.syncAudit || opts.send) {
    const backfillCandidates = new Map()
    for (const [em, info] of reportEntries.entries()) {
      const rescertMeta = rescertByEmail.get(em)
      backfillCandidates.set(em, {
        companyName: info.companyName || rescertMeta?.companyName || null,
        provinceKey: rescertMeta?.provinceKey || "unknown",
      })
    }
    for (const em of resendSentEmails) {
      if (backfillCandidates.has(em)) continue
      const rescertMeta = rescertByEmail.get(em)
      if (!rescertMeta) continue
      backfillCandidates.set(em, {
        companyName: rescertMeta.companyName || null,
        provinceKey: rescertMeta.provinceKey || "unknown",
      })
    }

    const missingRows = []
    for (const [em, meta] of backfillCandidates.entries()) {
      if (existingAuditSentEmails.has(em)) continue
      missingRows.push({
        admin_email: "system@aegissolaire.com",
        action: "RESCERT_OUTREACH_SENT",
        entity_type: "rescert_outreach",
        entity_id: em,
        details: {
          companyName: meta.companyName,
          provinceKey: meta.provinceKey,
          waveTag: "historical_backfill_2026_11_12_to_16",
        },
      })
    }

    for (let i = 0; i < missingRows.length; i += 100) {
      const chunk = missingRows.slice(i, i + 100)
      const { error: insertErr } = await sb.from("audit_log").insert(chunk)
      if (insertErr) {
        throw new Error(`Erreur backfill audit_log (chunk ${i}): ${insertErr.message}`)
      }
      syncedToAuditCount += chunk.length
      for (const r of chunk) {
        existingAuditSentEmails.add(r.entity_id)
        auditBlockedEmails.add(r.entity_id)
      }
    }
  }

  const blockedEmails = new Set()
  for (const e of staticOptouts || []) blockedEmails.add(normalizeEmail(e))
  for (const e of b2cOptouts || []) blockedEmails.add(normalizeEmail(e))
  for (const e of HARD_BOUNCED_EMAILS) blockedEmails.add(normalizeEmail(e))
  for (const e of resendBouncedEmails) blockedEmails.add(e)
  for (const e of resendSentEmails) blockedEmails.add(e)
  for (const em of reportEntries.keys()) blockedEmails.add(em)
  for (const p of partnersData) {
    if (p.email) blockedEmails.add(normalizeEmail(p.email))
  }
  for (const a of appsData) {
    if (a.email) blockedEmails.add(normalizeEmail(a.email))
  }
  for (const em of auditBlockedEmails) blockedEmails.add(em)

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

  const emptyProvinces = opts.provinces.filter((pk) => (leadsByProvince.get(pk) || []).length === 0)
  if (emptyProvinces.length > 0) {
    console.warn(
      `[RESCERT WAVE WARNING] Provinces sans aucun lead actif (marketplace_status='available'): ${emptyProvinces.join(", ")}`
    )
  }

  // Dédupliquer RESCERT par e-mail, exclure hors-zone / blacklist / sans MX,
  // puis équilibrer en round-robin sur les provinces éligibles.
  const seenCandidates = new Set()
  const buckets = new Map()
  for (const pk of opts.provinces) buckets.set(pk, [])
  const skippedInvalidMx = []

  for (const rec of rescertRaw) {
    const provKey = String(rec.provinceKey || "").toLowerCase().trim()
    if (opts.provinces.length > 0 && !opts.provinces.includes(provKey)) continue
    const cleanEmail = normalizeEmail(rec.email)
    if (!cleanEmail || !cleanEmail.includes("@") || isUnreachableMockEmail(cleanEmail)) continue
    if (cleanEmail.endsWith(".nl") || /^apeldoorn$/i.test(String(rec.city || "").trim())) continue

    const normalizedRec = {
      ...rec,
      companyName: decodeEnt(rec.companyName),
      certifiedPerson: decodeEnt(rec.certifiedPerson),
    }

    if (blockedEmails.has(cleanEmail) || seenCandidates.has(cleanEmail) || isBlacklisted(normalizedRec)) {
      continue
    }

    const mxOk = await hasValidMxRecord(cleanEmail)
    if (!mxOk) {
      skippedInvalidMx.push({
        email: cleanEmail,
        companyName: normalizedRec.companyName,
        provinceKey: provKey,
        postalCode: normalizedRec.postalCode,
      })
      continue
    }

    seenCandidates.add(cleanEmail)
    if (!buckets.has(provKey)) buckets.set(provKey, [])
    buckets.get(provKey).push(normalizedRec)
  }

  const eligiblePoolByProvince = Object.fromEntries(
    Array.from(buckets.entries()).map(([k, v]) => [k, v.length])
  )
  const eligiblePoolTotalAll = Array.from(buckets.values()).reduce((sum, list) => sum + list.length, 0)

  const activeBucketKeys =
    opts.send && !opts.allowEmptyProvinceLeads
      ? Array.from(buckets.keys()).filter((k) => (leadsByProvince.get(k) || []).length > 0)
      : Array.from(buckets.keys())

  const queue = []
  let idx = 0
  let added = true
  while (added) {
    added = false
    for (const k of activeBucketKeys) {
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
  const rawOutreachFrom = (process.env.OUTREACH_FROM_EMAIL || "partenaires@partenaires.aegissolaire.com").trim()
  const angleMatch = rawOutreachFrom.match(/<([^>]+)>/)
  const fromEmail = (angleMatch ? angleMatch[1] : rawOutreachFrom).trim()
  const fromHeader = `Direction des Partenariats — Aegis Solaire <${fromEmail}>`
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

    const resend = new Resend(process.env.RESEND_API_KEY)
    const sendRes = await resend.emails.send({
      from: fromHeader,
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
        fromEmail,
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
      fromEmail,
      fromHeader,
      provinces: opts.provinces,
      emptyProvinces,
      allowEmptyProvinceLeads: opts.allowEmptyProvinceLeads,
      syncedToAuditCount,
      dedupStats: {
        blockedTotal: blockedEmails.size,
        priorReportsCount: reportEntries.size,
        resendHistoryFetched: resendHistory.length,
        resendUniqueRecipients: resendSentEmails.size,
        resendBounced: resendBouncedEmails.size,
        auditBlockedCount: auditBlockedEmails.size,
        partnersCount: partnersData.length,
        applicationsCount: appsData.length,
        skippedInvalidMxCount: skippedInvalidMx.length,
      },
      totalOpenWalloniaLeads: openLeads.length,
      openLeadsByProvince: Object.fromEntries(
        Array.from(leadsByProvince.entries()).map(([k, v]) => [k, v.length])
      ),
      eligiblePoolTotal: eligiblePoolTotalAll,
      eligiblePoolByProvince,
      sendablePoolTotal: queue.length,
      batchLimit: opts.limit,
      batchSize: batch.length,
      skippedInvalidMx,
      previewFirst5: batch.slice(0, 5).map((r) => ({
        companyName: r.companyName,
        email: r.email,
        province: r.provinceKey,
        postalCode: r.postalCode,
        city: r.city,
      })),
    })
  )

  if (!opts.send) return

  if (batch.length === 0) {
    throw new Error(
      emptyProvinces.length > 0 && !opts.allowEmptyProvinceLeads
        ? `Aucun destinataire éligible : les provinces demandées (${emptyProvinces.join(", ")}) n'ont aucun lead actif en base. Passez --allow-empty-province-leads pour forcer.`
        : "Aucun destinataire éligible pour cette vague."
    )
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  let sentCount = 0
  let failedCount = 0
  const waveTag = `wave_${new Date().toISOString().slice(0, 10)}_${opts.provinces.join("-")}`

  for (const rec of batch) {
    const provKey = String(rec.provinceKey || "").toLowerCase().trim()
    const provLeads = leadsByProvince.get(provKey) || []
    const topLead = provLeads[0] || null
    const cleanEmail = normalizeEmail(rec.email)

    const mxOk = await hasValidMxRecord(cleanEmail)
    if (!mxOk) {
      failedCount++
      console.error(`[RESCERT WAVE MX SKIP] ${cleanEmail}: no valid MX record`)
      continue
    }

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

    const idempotencyKey = `rescert-wave-${waveTag}-${cleanEmail}`.slice(0, 250)
    const sendRes = await resend.emails.send(
      {
        from: fromHeader,
        to: rec.email,
        replyTo: replyToEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: {
          "List-Unsubscribe": `<${rendered.optoutUrl}>, <mailto:contact@aegissolaire.com?subject=Desinscription%20RESCERT>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      { idempotencyKey }
    )

    if (sendRes.error) {
      failedCount++
      console.error(`[RESCERT WAVE ERROR] ${rec.email}:`, sendRes.error.message)
    } else {
      sentCount++
      await sb.from("audit_log").insert({
        admin_email: "system@aegissolaire.com",
        action: "RESCERT_OUTREACH_SENT",
        entity_type: "rescert_outreach",
        entity_id: cleanEmail,
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
