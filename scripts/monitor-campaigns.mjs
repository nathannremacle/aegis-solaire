import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "")
      }
    }
  }
}

loadEnv()

const META_TOKEN = process.env.META_MARKETING_TOKEN
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const AD_ACCOUNT_ID = "act_1596485538374624"
const CAMPAIGN_ID = "120251604763090465"
const ADSET_ID = "120251604763100465"

function isWalloonCp(cp) {
  const s = String(cp || "").trim()
  if (!/^[0-9]{4}$/.test(s)) return false
  const n = Number(s)
  return (n >= 1300 && n <= 1499) || (n >= 4000 && n <= 7999)
}

function getActionValue(actions, actionType) {
  if (!Array.isArray(actions)) return 0
  const found = actions.find((a) => a.action_type === actionType)
  return found ? Number(found.value || 0) : 0
}

function fmtEur(n) {
  return `${Number(n || 0).toFixed(2)} EUR`
}

function fmtPct(n) {
  return `${Number(n || 0).toFixed(2)} %`
}

function classifyAdVerdict({ status, spend, linkCtr, linkCpc, lpv, linkClicks, leads }) {
  const isPaused = String(status || "").startsWith("PAUSED")
  const lpvRate = linkClicks > 0 ? (lpv / linkClicks) * 100 : 0
  if (spend < 5) {
    return isPaused ? "PAUSE (donnees insuffisantes)" : "PHASE TEST (< 5 EUR)"
  }
  if (leads > 0 && spend / leads <= 30) {
    return "KEEP / SCALE (CPL <= 30 EUR)"
  }
  if (spend >= 50 && leads === 0) {
    return "KILL STRICT (50+ EUR depenses, 0 lead)"
  }
  if (spend >= 15 && linkCtr < 0.8) {
    return "KILL (CTR lien < 0.80 %)"
  }
  if (spend >= 20 && (linkCpc > 1.8 || (linkClicks >= 15 && lpvRate < 50))) {
    return "KILL / ITERATE (CPC lien > 1.80 EUR ou LPV < 50 %)"
  }
  return isPaused ? "EN PAUSE (a remplacer par V2)" : "SURVEILLANCE ACTIVE"
}

async function fetchMetaJson(endpoint, params = {}) {
  if (!META_TOKEN) return null
  const url = new URL(`https://graph.facebook.com/v22.0/${endpoint}`)
  url.searchParams.set("access_token", META_TOKEN)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }
  const res = await fetch(url)
  return res.json()
}

async function fetchAllSupabaseRows(supabase, table, columns, filterFn, orderCol = "created_at") {
  const all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    let q = supabase.from(table).select(columns).order(orderCol, { ascending: true }).range(from, from + pageSize - 1)
    if (filterFn) q = filterFn(q)
    const { data, error } = await q
    if (error) {
      throw new Error(`Supabase ${table}: ${error.message}`)
    }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

async function runMetaAudit() {
  console.log("================================================================================")
  console.log("  AEGIS SOLAIRE - AUDIT CHIRURGICAL META ADS + ENTONNOIR SUPABASE")
  console.log("================================================================================\n")

  if (!META_TOKEN) {
    console.log("[WARN] META_MARKETING_TOKEN absent : section Meta ignoree.\n")
    return
  }

  const [campaign, adset, adsMeta, insightsAd, insightsPlacement, insightsDaily] = await Promise.all([
    fetchMetaJson(CAMPAIGN_ID, { fields: "name,status,objective,daily_budget" }),
    fetchMetaJson(ADSET_ID, { fields: "name,status,optimization_goal,targeting" }),
    fetchMetaJson(`${AD_ACCOUNT_ID}/ads`, { fields: "id,name,status,effective_status", limit: 50 }),
    fetchMetaJson(`${AD_ACCOUNT_ID}/insights`, {
      level: "ad",
      date_preset: "maximum",
      fields:
        "ad_id,ad_name,impressions,reach,frequency,cpm,spend,clicks,ctr,cpc,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,actions",
      limit: 50,
    }),
    fetchMetaJson(`${CAMPAIGN_ID}/insights`, {
      date_preset: "maximum",
      breakdowns: "publisher_platform,platform_position",
      fields:
        "impressions,cpm,spend,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,actions",
      limit: 50,
    }),
    fetchMetaJson(`${CAMPAIGN_ID}/insights`, {
      date_preset: "last_14d",
      time_increment: 1,
      fields: "date_start,impressions,spend,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,actions",
      limit: 30,
    }),
  ])

  const adStatusMap = new Map(
    (adsMeta?.data || []).map((a) => [a.id, `${a.status || "?"}/${a.effective_status || "?"}`])
  )
  const t = adset?.targeting || {}

  console.log(`1. STRUCTURE CAMPAGNE & CIBLAGE`)
  console.log(`   - Campagne : ${campaign?.name} [${campaign?.status}] (Budget: ${campaign?.daily_budget ? fmtEur(Number(campaign.daily_budget) / 100) + "/j" : "ABO"})`)
  console.log(`   - AdSet    : ${adset?.name} [${adset?.status}] (Goal: ${adset?.optimization_goal})`)
  console.log(
    `   - Geo      : Inclus=${(t.geo_locations?.regions || []).map((r) => r.name).join(",")} (${(t.geo_locations?.location_types || []).join(",")}) | Exclu Regions=${(t.excluded_geo_locations?.regions || []).map((r) => r.name).join(",")} | Exclu Pays=${(t.excluded_geo_locations?.countries || []).join(",")} | Exclu Zips=${t.excluded_geo_locations?.zips?.length || 0}`
  )
  console.log(
    `   - Placements : Platforms=${(t.publisher_platforms || []).join(",")} | FB=${(t.facebook_positions || ["ALL"]).join(",")} | IG=${(t.instagram_positions || ["ALL"]).join(",")} | AdvantageAudience=${t.targeting_automation?.advantage_audience ?? "unset"}\n`
  )

  console.log(`2. PERFORMANCE PAR ANNONCE (Metriques Reelles : Inline Link Clicks + LPV + Leads)`)
  let totalSpend = 0
  let totalImpr = 0
  let totalLinkClicks = 0
  let totalLpv = 0
  let totalLeads = 0

  for (const row of insightsAd?.data || []) {
    const spend = Number(row.spend || 0)
    const impr = Number(row.impressions || 0)
    const linkClicks = Number(row.inline_link_clicks || 0)
    const linkCtr = Number(row.inline_link_click_ctr || 0)
    const linkCpc = Number(row.cost_per_inline_link_click || 0)
    const allClicks = Number(row.clicks || 0)
    const cpm = Number(row.cpm || 0)
    const reach = Number(row.reach || 0)
    const freq = Number(row.frequency || 0)
    const lpv = getActionValue(row.actions, "landing_page_view")
    const leads = getActionValue(row.actions, "lead")
    const ic = getActionValue(row.actions, "initiate_checkout")
    const contact = getActionValue(row.actions, "contact_total")
    const status = adStatusMap.get(row.ad_id) || "UNKNOWN"

    totalSpend += spend
    totalImpr += impr
    totalLinkClicks += linkClicks
    totalLpv += lpv
    totalLeads += leads

    const lpvRate = linkClicks > 0 ? (lpv / linkClicks) * 100 : 0
    const verdict = classifyAdVerdict({ status, spend, linkCtr, linkCpc, lpv, linkClicks, leads })

    console.log(`   * ${row.ad_name} (${row.ad_id}) [${status}]`)
    console.log(
      `     Depense: ${fmtEur(spend)} | Impr: ${impr} (Reach ${reach}, Freq ${freq.toFixed(2)}) | CPM: ${fmtEur(cpm)}`
    )
    console.log(
      `     Clics LIEN: ${linkClicks} (CTR lien: ${fmtPct(linkCtr)} | CPC lien: ${fmtEur(linkCpc)}) [vs Tous clics: ${allClicks}]`
    )
    console.log(
      `     Vues Landing (LPV): ${lpv} (${fmtPct(lpvRate)} des clics lien) | IC: ${ic} | Contact: ${contact} | Leads Meta: ${leads}`
    )
    console.log(`     -> VERDICT: ${verdict}\n`)
  }

  const globalLinkCtr = totalImpr > 0 ? (totalLinkClicks / totalImpr) * 100 : 0
  const globalLinkCpc = totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0
  const globalLpvRate = totalLinkClicks > 0 ? (totalLpv / totalLinkClicks) * 100 : 0
  console.log(
    `   TOTAL COMPTE : ${fmtEur(totalSpend)} | ${totalImpr} impr | ${totalLinkClicks} clics lien (${fmtPct(globalLinkCtr)}, ${fmtEur(globalLinkCpc)}/clic) | ${totalLpv} LPV (${fmtPct(globalLpvRate)}) | ${totalLeads} Leads\n`
  )

  console.log(`3. REPARTITION PAR PLACEMENT (Identification du gaspillage Reels/Stories)`)
  for (const p of (insightsPlacement?.data || []).sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0))) {
    const spend = Number(p.spend || 0)
    if (spend <= 0) continue
    const linkClicks = Number(p.inline_link_clicks || 0)
    const linkCtr = Number(p.inline_link_click_ctr || 0)
    const linkCpc = Number(p.cost_per_inline_link_click || 0)
    const lpv = getActionValue(p.actions, "landing_page_view")
    console.log(
      `   - ${p.publisher_platform} / ${p.platform_position} : ${fmtEur(spend)} | ${p.impressions} impr | ${linkClicks} clics lien (${fmtPct(linkCtr)}, ${fmtEur(linkCpc)}/clic) | ${lpv} LPV`
    )
  }
  console.log("")

  console.log(`4. TENDANCE QUOTIDIENNE (14 derniers jours)`)
  for (const d of insightsDaily?.data || []) {
    const lpv = getActionValue(d.actions, "landing_page_view")
    const leads = getActionValue(d.actions, "lead")
    console.log(
      `   - ${d.date_start} : ${fmtEur(d.spend)} | ${d.impressions} impr | ${d.inline_link_clicks || 0} clics lien (${fmtPct(d.inline_link_click_ctr)}) | ${lpv} LPV | ${leads} leads`
    )
  }
  console.log("")
}

async function runSupabaseAudit() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log("[WARN] Identifiants Supabase manquants : audit DB ignore.")
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const [events, allLandingLeads, purchases, partners] = await Promise.all([
    fetchAllSupabaseRows(
      supabase,
      "funnel_step_events",
      "session_id,step_number,step_name,province,utm_source,utm_content,created_at"
    ),
    fetchAllSupabaseRows(
      supabase,
      "leads",
      "id,session_id,first_name,last_name,email,postal_code,province,status,source_form,ownership_status,credit_cost,qualification_metadata,created_at",
      (q) => q.eq("source_form", "b2c_devis_landing")
    ),
    fetchAllSupabaseRows(
      supabase,
      "lead_purchases",
      "id,lead_id,partner_id,credits_spent,pipeline_status,purchased_at",
      undefined,
      "purchased_at"
    ),
    fetchAllSupabaseRows(supabase, "partners", "id,company_name,credits,segment,target_provinces,is_test,created_at"),
  ])

  const metaEvents = events.filter((e) => {
    const src = (e.utm_source || "").toLowerCase()
    return ["meta", "facebook", "fb", "ig"].includes(src)
  })

  const sessions = new Map()
  for (const ev of metaEvents) {
    const sid = ev.session_id || "unknown"
    if (!sessions.has(sid)) {
      sessions.set(sid, {
        sid,
        steps: new Set(),
        events: [],
        utmContent: ev.utm_content || "(vide)",
        provinces: new Set(),
        minTs: Infinity,
        maxTs: -Infinity,
      })
    }
    const s = sessions.get(sid)
    s.steps.add(ev.step_number)
    s.events.push(ev)
    if (ev.utm_content) s.utmContent = ev.utm_content
    if (ev.province) s.provinces.add(ev.province)
    const ts = Date.parse(ev.created_at)
    if (Number.isFinite(ts)) {
      s.minTs = Math.min(s.minTs, ts)
      s.maxTs = Math.max(s.maxTs, ts)
    }
  }

  // Détection de bursts suspects (>= 4 sessions distinctes Step 1 uniquement apparues dans un créneau de 10s, ou >=3 steps en <1s)
  const step1OnlySessions = [...sessions.values()]
    .filter((s) => s.steps.size === 1 && s.steps.has(1))
    .sort((a, b) => a.minTs - b.minTs)

  const suspiciousBurstSids = new Set()
  for (let i = 0; i < step1OnlySessions.length; i++) {
    let cluster = [step1OnlySessions[i]]
    for (let j = i + 1; j < step1OnlySessions.length; j++) {
      if (step1OnlySessions[j].minTs - step1OnlySessions[i].minTs <= 10000) {
        cluster.push(step1OnlySessions[j])
      } else break
    }
    if (cluster.length >= 4) {
      for (const c of cluster) suspiciousBurstSids.add(c.sid)
    }
  }
  for (const s of sessions.values()) {
    if (s.steps.size >= 3 && s.maxTs - s.minTs < 1000) {
      suspiciousBurstSids.add(s.sid)
    }
  }

  const humanSessions = [...sessions.values()].filter((s) => !suspiciousBurstSids.has(s.sid))
  const stepCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const s of humanSessions) {
    for (let k = 1; k <= 6; k++) {
      if (s.steps.has(k)) stepCounts[k]++
    }
  }

  console.log(`5. TELEMETRIE ENTONNOIR SUPABASE (Pagination Complete : ${events.length} lignes totales)`)
  console.log(`   - Evenements attribues Meta : ${metaEvents.length} | Sessions uniques : ${sessions.size}`)
  console.log(`   - Bursts bots suspects filtres : ${suspiciousBurstSids.size} sessions`)
  console.log(`   - Sessions humaines dedupliquees : ${humanSessions.length}`)
  for (let k = 1; k <= 6; k++) {
    const base = stepCounts[1] || 1
    console.log(`     * Etape ${k} : ${stepCounts[k]} sessions (${fmtPct((stepCounts[k] / base) * 100)} du Step 1 humain)`)
  }

  // Répartition par annonce (utm_content) sur les sessions humaines
  const byAd = new Map()
  for (const s of humanSessions) {
    if (!byAd.has(s.utmContent)) byAd.set(s.utmContent, { s1: 0, s2: 0, s5: 0, s6: 0 })
    const b = byAd.get(s.utmContent)
    if (s.steps.has(1)) b.s1++
    if (s.steps.has(2)) b.s2++
    if (s.steps.has(5)) b.s5++
    if (s.steps.has(6)) b.s6++
  }
  console.log(`   - Entonnoir humain par utm_content :`)
  for (const [ad, b] of byAd.entries()) {
    console.log(`     * ${ad} : Step1=${b.s1} -> Step2=${b.s2} -> Step5=${b.s5} -> Step6=${b.s6}`)
  }

  console.log(`\n6. LEADS B2C LANDING & REVENUS MARKETPLACE`)
  const drafts = allLandingLeads.filter((l) => l.status === "draft_email_only")
  const submitted = allLandingLeads.filter((l) => l.status !== "draft_email_only")
  const nonWalloon = submitted.filter((l) => !isWalloonCp(l.postal_code))
  const landingLeadIds = new Set(submitted.map((l) => l.id))
  const landingPurchases = purchases.filter((p) => landingLeadIds.has(p.lead_id))
  const totalCreditsSpentLanding = landingPurchases.reduce((acc, p) => acc + Number(p.credits_spent || 0), 0)
  const totalCreditsAll = purchases.reduce((acc, p) => acc + Number(p.credits_spent || 0), 0)

  console.log(`   - Leads finaux (b2c_devis_landing) : ${submitted.length} (Brouillons email-only : ${drafts.length})`)
  console.log(`   - Leads hors-Wallonie detectes : ${nonWalloon.length}${nonWalloon.length > 0 ? ` [${nonWalloon.map((l) => `${l.postal_code} (${l.email})`).join(", ")}]` : ""}`)
  for (const l of submitted) {
    const isTest = /test|example|demo|aegissolaire/i.test(`${l.email} ${l.first_name} ${l.last_name}`)
    const leadPurchaseCount = landingPurchases.filter((p) => p.lead_id === l.id).length
    console.log(
      `     * ${l.created_at?.slice(0, 10)} | CP ${l.postal_code || "N/A"} (${l.province || "N/A"}) | owner=${l.ownership_status || "N/A"} | utm=${l.qualification_metadata?.utm_source || "direct"}/${l.qualification_metadata?.utm_content || "-"} | achats=${leadPurchaseCount}${isTest ? " [TEST/INTERNE]" : ""}`
    )
  }

  console.log(
    `   - Achats installateurs sur leads Meta/Landing : ${landingPurchases.length} (${totalCreditsSpentLanding} credits) | Total achats plateforme : ${purchases.length} (${totalCreditsAll} credits)`
  )
  const realPartners = partners.filter((p) => !p.is_test)
  const fundedPartners = realPartners.filter((p) => Number(p.credits || 0) > 0)
  console.log(`   - Partenaires reels en base : ${realPartners.length}/${partners.length} (avec credits > 0 : ${fundedPartners.length})`)
  for (const p of realPartners) {
    console.log(`     * ${p.company_name} (${p.segment || "ALL"}) : ${p.credits} credits | provinces=${Array.isArray(p.target_provinces) ? p.target_provinces.join(",") : p.target_provinces}`)
  }
  console.log("")
}

async function main() {
  await runMetaAudit()
  await runSupabaseAudit()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
