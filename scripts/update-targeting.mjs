import fs from "node:fs"
import path from "node:path"

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

const ACCESS_TOKEN = process.env.META_MARKETING_TOKEN
const AD_ACCOUNT_ID = "act_1596485538374624"
const CAMPAIGN_ID = "120251604763090465"
const ADSET_ID = "120251604763100465"
const CHALLENGERS_ADSET_NAME = "Wallonie_Challengers_Video_Ad3_30-64"
const PIXEL_ID = "1672474437601117"

const ADSET1_ADS_TO_ACTIVATE = [
  { id: "120251681580910465", name: "V2_AD1_ECART_1850_GPT" },
  { id: "120251681581910465", name: "V2_AD2_RENTABILITE_2026_GPT" },
  { id: "120251681583270465", name: "V2_VIDEO_WALLONIE_FEED_4X5" },
]
const ADSET1_ADS_TO_PAUSE = [
  { id: "120251681583000465", name: "V2_AD3_ANTI_DEMARCHAGE_GPT" },
  { id: "120251604763110465", name: "PUB_1_VISUEL_ANALYSE_DEVIS" },
  { id: "120251605088950465", name: "PUB_2_VISUEL_MAISON_COMPAREZ" },
  { id: "120251628805770465", name: "PUB_3_VISUEL_AUDIT_COMPARER" },
]

if (!ACCESS_TOKEN) {
  console.error("META_MARKETING_TOKEN manquant dans .env.local")
  process.exit(1)
}

const isDryRun = process.argv.includes("--dry-run")

async function fetchLuxembourgBeZips() {
  const luxZipsMap = new Map()
  for (const prefix of ["66", "67", "68", "69"]) {
    const url = new URL("https://graph.facebook.com/v22.0/search")
    url.searchParams.set("type", "adgeolocation")
    url.searchParams.set("location_types", JSON.stringify(["zip"]))
    url.searchParams.set("country_code", "BE")
    url.searchParams.set("q", prefix)
    url.searchParams.set("limit", "1000")
    url.searchParams.set("access_token", ACCESS_TOKEN)

    const res = await fetch(url)
    const json = await res.json()
    if (json.error) {
      throw new Error(`Erreur recherche zips Luxembourg (${prefix}): ${JSON.stringify(json.error)}`)
    }
    for (const item of json.data || []) {
      if (item.type === "zip" && /^6[6-9]\d{2}$/.test(item.name)) {
        luxZipsMap.set(item.key, { key: item.key })
      }
    }
  }
  return [...luxZipsMap.values()]
}

async function metaPost(endpoint, payload) {
  const body = new URLSearchParams({ access_token: ACCESS_TOKEN })
  for (const [k, v] of Object.entries(payload)) {
    body.set(k, typeof v === "string" ? v : JSON.stringify(v))
  }
  const res = await fetch(`https://graph.facebook.com/v22.0/${endpoint}`, {
    method: "POST",
    body,
  })
  return res.json()
}

async function metaGet(endpoint, params = {}) {
  const url = new URL(`https://graph.facebook.com/v22.0/${endpoint}`)
  url.searchParams.set("access_token", ACCESS_TOKEN)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }
  const res = await fetch(url)
  return res.json()
}

async function main() {
  console.log("═══ MISE À JOUR META ADS (CONSOLIDATION ADSET 1 + RÉACTIVATION V2_AD2 + PAUSE ADSET 2) ═══\n")

  // 1. Récupération des 101 codes postaux du Luxembourg belge (66xx–69xx)
  const luxZips = await fetchLuxembourgBeZips()
  console.log(`Codes postaux Province du Luxembourg récupérés : ${luxZips.length}`)

  /**
   * Ciblage strict Wallonie 4 provinces (Hainaut, Namur, Liège, Brabant wallon) :
   * - Inclusion : Région Wallonne ("4137", BE) résidents ("home")
   * - Exclusions : Bruxelles ("296"), Flandre ("4136"), Grand-Duché ("LU") + 101 zips Luxembourg BE (66xx-69xx)
   * - Placements Feed FB + Instagram Stream uniquement
   * - Advantage+ Audience désactivé (advantage_audience: 0)
   */
  const targetSpecV2 = {
    age_min: 30,
    age_max: 64,
    geo_locations: {
      regions: [{ key: "4137" }],
      location_types: ["home"],
    },
    excluded_geo_locations: {
      regions: [{ key: "296" }, { key: "4136" }],
      countries: ["LU"],
      zips: luxZips,
    },
    publisher_platforms: ["facebook", "instagram"],
    facebook_positions: ["feed"],
    instagram_positions: ["stream"],
    targeting_automation: {
      advantage_audience: 0,
    },
  }

  // 2. Vérification d'estimation de portée avant application
  const reachJson = await metaGet(`${AD_ACCOUNT_ID}/reachestimate`, {
    targeting_spec: JSON.stringify(targetSpecV2),
  })
  if (reachJson.error) {
    console.error("Erreur reachestimate:", JSON.stringify(reachJson.error, null, 2))
    process.exit(1)
  }

  console.log(
    `Portée estimée (Wallonie 4 provinces hors Luxembourg BE, 30-64 ans, Feed FB+IG) : ${reachJson.data?.users_lower_bound?.toLocaleString("fr-BE")} - ${reachJson.data?.users_upper_bound?.toLocaleString("fr-BE")} utilisateurs (estimate_ready=${reachJson.data?.estimate_ready})`
  )

  if (isDryRun) {
    console.log("\n[DRY-RUN] Plan prêt (aucune mutation appliquée) :")
    console.log("- Exclusion zips Luxembourg BE:", luxZips.length)
    console.log("- AdSet 1:", ADSET_ID, "-> ACTIVE:", ADSET1_ADS_TO_ACTIVATE.map((a) => a.name).join(", "))
    console.log("- AdSet 1 PAUSED:", ADSET1_ADS_TO_PAUSE.map((a) => a.name).join(", "))
    console.log("- AdSet 2:", CHALLENGERS_ADSET_NAME, "-> PAUSED (+ toutes ses annonces)")
    return
  }

  // 3. Mise à jour du ciblage sur l'AdSet 1 principal et consolidation à 100 % du budget CBO
  const updateAdSet1Res = await metaPost(ADSET_ID, {
    targeting: targetSpecV2,
    status: "ACTIVE",
    daily_min_spend_target: 0,
  })
  if (updateAdSet1Res.error || !updateAdSet1Res.success) {
    console.error("Erreur mise à jour targeting AdSet 1:", JSON.stringify(updateAdSet1Res, null, 2))
    process.exit(1)
  }
  console.log(`AdSet 1 (${ADSET_ID}) targeting mis à jour (${luxZips.length} zips Luxembourg BE exclus), ACTIVE et daily_min_spend_target=0.`)

  // 4. Activer V2_AD1, V2_AD2 et V2_VIDEO dans l'AdSet 1 et garder V2_AD3 + V1 en PAUSED
  for (const ad of ADSET1_ADS_TO_ACTIVATE) {
    const actRes = await metaPost(ad.id, { status: "ACTIVE" })
    if (actRes.error) {
      console.error(`Erreur activation ${ad.name} (${ad.id}):`, JSON.stringify(actRes.error, null, 2))
      process.exit(1)
    }
    console.log(`AdSet 1 : ${ad.name} (${ad.id}) -> ACTIVE.`)
  }

  for (const ad of ADSET1_ADS_TO_PAUSE) {
    const pauseRes = await metaPost(ad.id, { status: "PAUSED" })
    if (pauseRes.error) {
      console.error(`Erreur mise en pause ${ad.name} (${ad.id}):`, JSON.stringify(pauseRes.error, null, 2))
      process.exit(1)
    }
    console.log(`AdSet 1 : ${ad.name} (${ad.id}) -> PAUSED.`)
  }

  // 5. Mettre en PAUSE le second AdSet Challengers et toutes ses annonces
  const existingAdSets = await metaGet(`${CAMPAIGN_ID}/adsets`, {
    fields: "id,name,status,daily_min_spend_target,daily_spend_cap",
    limit: 50,
  })
  if (existingAdSets.error) {
    console.error("Erreur lecture AdSets campagne:", JSON.stringify(existingAdSets.error, null, 2))
    process.exit(1)
  }

  const adSet2 = (existingAdSets.data || []).find((a) => a.name === CHALLENGERS_ADSET_NAME)
  if (adSet2) {
    const existingAdSet2Ads = await metaGet(`${adSet2.id}/ads`, {
      fields: "id,name,status",
      limit: 50,
    })
    if (existingAdSet2Ads.error) {
      console.error("Erreur lecture annonces AdSet 2:", JSON.stringify(existingAdSet2Ads.error, null, 2))
      process.exit(1)
    }
    for (const ad of existingAdSet2Ads.data || []) {
      const pauseAd2Res = await metaPost(ad.id, { status: "PAUSED" })
      if (pauseAd2Res.error) {
        console.error(`Erreur mise en pause ${ad.name} (${ad.id}) dans AdSet 2:`, JSON.stringify(pauseAd2Res.error, null, 2))
        process.exit(1)
      }
      console.log(`AdSet 2 : ${ad.name} (${ad.id}) -> PAUSED.`)
    }

    const pauseAdSet2Res = await metaPost(adSet2.id, { status: "PAUSED" })
    if (pauseAdSet2Res.error) {
      console.error("Erreur mise en pause AdSet 2:", JSON.stringify(pauseAdSet2Res.error, null, 2))
      process.exit(1)
    }
    console.log(`AdSet 2 (${adSet2.id}) ${CHALLENGERS_ADSET_NAME} -> PAUSED.`)
  } else {
    console.log(`AdSet 2 (${CHALLENGERS_ADSET_NAME}) introuvable, rien à mettre en pause.`)
  }

  // 7. Relecture complète de vérification depuis l'API Graph
  const [verifyAdSets, verifyAllAds] = await Promise.all([
    metaGet(`${CAMPAIGN_ID}/adsets`, {
      fields: "id,name,status,effective_status,daily_min_spend_target,daily_spend_cap,targeting",
      limit: 50,
    }),
    metaGet(`${CAMPAIGN_ID}/ads`, {
      fields: "id,name,adset_id,status,effective_status",
      limit: 50,
    }),
  ])

  console.log("\n═══ VÉRIFICATION POST-ÉCRITURE META ═══")
  for (const aset of verifyAdSets.data || []) {
    const t = aset.targeting || {}
    console.log(`AdSet ${aset.name} (${aset.id}) [${aset.status}/${aset.effective_status}]`, {
      daily_min_spend_target: aset.daily_min_spend_target || null,
      daily_spend_cap: aset.daily_spend_cap || null,
      excluded_zips: t.excluded_geo_locations?.zips?.length ?? 0,
      excluded_regions: t.excluded_geo_locations?.regions?.map((r) => `${r.name} (${r.key})`),
      excluded_countries: t.excluded_geo_locations?.countries,
      advantage_audience: t.targeting_automation?.advantage_audience,
    })
  }
  console.log("Annonces de la campagne :")
  for (const ad of verifyAllAds.data || []) {
    console.log(` - [${ad.status}/${ad.effective_status}] ${ad.name} (${ad.id}) -> adset ${ad.adset_id}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
