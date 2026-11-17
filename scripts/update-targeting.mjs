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

const WINNER_AD_ID = "120251681580910465" // V2_AD1_ECART_1850_GPT
const ADSET1_ADS_TO_PAUSE = [
  { id: "120251681581910465", name: "V2_AD2_RENTABILITE_2026_GPT" },
  { id: "120251681583000465", name: "V2_AD3_ANTI_DEMARCHAGE_GPT" },
  { id: "120251681583270465", name: "V2_VIDEO_WALLONIE_FEED_4X5" },
]

const CHALLENGER_ADS_SPECS = [
  {
    name: "V2_VIDEO_WALLONIE_FEED_4X5",
    creativeId: "976837255048321",
  },
  {
    name: "V2_AD3_ANTI_DEMARCHAGE_GPT",
    creativeId: "1045840888578563",
  },
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
  console.log("═══ MISE À JOUR META ADS (EXCLUSION LUXEMBOURG + PROTECTION GAGNANTE + TEST CHALLENGERS) ═══\n")

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
    console.log("- AdSet 1:", ADSET_ID, "-> V2_AD1 ACTIVE, autres PAUSED")
    console.log("- AdSet 2:", CHALLENGERS_ADSET_NAME, "-> daily_min_spend_target=400, daily_spend_cap=600, V2_VIDEO + V2_AD3 ACTIVE")
    return
  }

  // 3. Mise à jour du ciblage sur l'AdSet 1 (Gagnante)
  const updateAdSet1Res = await metaPost(ADSET_ID, {
    targeting: targetSpecV2,
  })
  if (updateAdSet1Res.error || !updateAdSet1Res.success) {
    console.error("Erreur mise à jour targeting AdSet 1:", JSON.stringify(updateAdSet1Res, null, 2))
    process.exit(1)
  }
  console.log(`AdSet 1 (${ADSET_ID}) targeting mis à jour (${luxZips.length} zips Luxembourg BE exclus).`)

  // Essayer d'appliquer daily_min_spend_target=1400 sur l'AdSet 1 (optionnel si Meta le permet en plus du cap AdSet 2)
  const minSpendAdSet1Res = await metaPost(ADSET_ID, {
    daily_min_spend_target: 1400,
  })
  if (minSpendAdSet1Res.error) {
    console.warn("Note AdSet 1 daily_min_spend_target=1400 non appliqué (géré par cap AdSet 2):", minSpendAdSet1Res.error.message)
  } else {
    console.log("AdSet 1 daily_min_spend_target=1400 (14,00 EUR/j min) appliqué.")
  }

  // 4. Garder V2_AD1 ACTIVE et mettre en PAUSE les autres pubs dans l'AdSet 1
  const ensureWinnerRes = await metaPost(WINNER_AD_ID, { status: "ACTIVE" })
  if (ensureWinnerRes.error) {
    console.error("Erreur activation V2_AD1:", JSON.stringify(ensureWinnerRes.error, null, 2))
    process.exit(1)
  }
  console.log(`AdSet 1 : V2_AD1_ECART_1850_GPT (${WINNER_AD_ID}) maintenue ACTIVE.`)

  for (const ad of ADSET1_ADS_TO_PAUSE) {
    const pauseRes = await metaPost(ad.id, { status: "PAUSED" })
    if (pauseRes.error) {
      console.error(`Erreur mise en pause ${ad.name} (${ad.id}):`, JSON.stringify(pauseRes.error, null, 2))
      process.exit(1)
    }
    console.log(`AdSet 1 : ${ad.name} (${ad.id}) passée en PAUSED.`)
  }

  // 5. Créer ou mettre à jour l'AdSet 2 (Test Challengers : V2_VIDEO + V2_AD3)
  const existingAdSets = await metaGet(`${CAMPAIGN_ID}/adsets`, {
    fields: "id,name,status,daily_min_spend_target,daily_spend_cap",
    limit: 50,
  })
  if (existingAdSets.error) {
    console.error("Erreur lecture AdSets campagne:", JSON.stringify(existingAdSets.error, null, 2))
    process.exit(1)
  }

  let adSet2 = (existingAdSets.data || []).find((a) => a.name === CHALLENGERS_ADSET_NAME)
  if (!adSet2) {
    const createAdSet2Res = await metaPost(`${AD_ACCOUNT_ID}/adsets`, {
      name: CHALLENGERS_ADSET_NAME,
      campaign_id: CAMPAIGN_ID,
      optimization_goal: "OFFSITE_CONVERSIONS",
      billing_event: "IMPRESSIONS",
      promoted_object: { pixel_id: PIXEL_ID, custom_event_type: "LEAD" },
      targeting: targetSpecV2,
      daily_min_spend_target: 400,
      daily_spend_cap: 600,
      status: "ACTIVE",
    })
    if (createAdSet2Res.error || !createAdSet2Res.id) {
      console.error("Erreur création AdSet 2:", JSON.stringify(createAdSet2Res, null, 2))
      process.exit(1)
    }
    adSet2 = { id: createAdSet2Res.id, name: CHALLENGERS_ADSET_NAME }
    console.log(`AdSet 2 créé : ${CHALLENGERS_ADSET_NAME} (${adSet2.id}) [min 4,00 EUR/j, cap 6,00 EUR/j].`)
  } else {
    const updateAdSet2Res = await metaPost(adSet2.id, {
      targeting: targetSpecV2,
      daily_min_spend_target: 400,
      daily_spend_cap: 600,
      status: "ACTIVE",
    })
    if (updateAdSet2Res.error) {
      console.error("Erreur mise à jour AdSet 2:", JSON.stringify(updateAdSet2Res.error, null, 2))
      process.exit(1)
    }
    console.log(`AdSet 2 existant mis à jour : ${CHALLENGERS_ADSET_NAME} (${adSet2.id}).`)
  }

  // 6. Créer / Activer les 2 annonces challengers dans l'AdSet 2 avec leurs créatifs approuvés
  const existingAdSet2Ads = await metaGet(`${adSet2.id}/ads`, {
    fields: "id,name,status,creative{id}",
    limit: 50,
  })
  if (existingAdSet2Ads.error) {
    console.error("Erreur lecture annonces AdSet 2:", JSON.stringify(existingAdSet2Ads.error, null, 2))
    process.exit(1)
  }

  const adSet2AdsByName = new Map((existingAdSet2Ads.data || []).map((a) => [a.name, a]))
  for (const spec of CHALLENGER_ADS_SPECS) {
    const existingAd = adSet2AdsByName.get(spec.name)
    if (existingAd) {
      const actRes = await metaPost(existingAd.id, { status: "ACTIVE" })
      if (actRes.error) {
        console.error(`Erreur activation ${spec.name} dans AdSet 2:`, JSON.stringify(actRes.error, null, 2))
        process.exit(1)
      }
      console.log(`AdSet 2 : ${spec.name} (${existingAd.id}) déjà présente -> maintenue ACTIVE.`)
    } else {
      const createAdRes = await metaPost(`${AD_ACCOUNT_ID}/ads`, {
        name: spec.name,
        adset_id: adSet2.id,
        creative: { creative_id: spec.creativeId },
        tracking_specs: [{ "action.type": ["offsite_conversion"], fb_pixel: [PIXEL_ID] }],
        status: "ACTIVE",
      })
      if (createAdRes.error || !createAdRes.id) {
        console.error(`Erreur création annonce ${spec.name} dans AdSet 2:`, JSON.stringify(createAdRes, null, 2))
        process.exit(1)
      }
      console.log(`AdSet 2 : ${spec.name} (${createAdRes.id}) créée ACTIVE (creative ${spec.creativeId}).`)
    }
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
