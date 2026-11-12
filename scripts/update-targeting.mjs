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
const ADSET_ID = "120251604763100465"

if (!ACCESS_TOKEN) {
  console.error("META_MARKETING_TOKEN manquant dans .env.local")
  process.exit(1)
}

const isDryRun = process.argv.includes("--dry-run")

/**
 * Ciblage optimal V2 Wallonie 5 provinces (y compris Luxembourg belge 66xx-69xx) :
 * - Inclusion : Région Wallonne ("4137", BE) uniquement pour les personnes résidant sur place (location_types: ["home"])
 * - Exclusions strictes : Région de Bruxelles-Capitale ("296"), Région flamande ("4136"), Grand-Duché de Luxembourg ("LU")
 * - Placements Feed-only tant que les annonces statiques tournent (coupe le gaspillage Reels 0.27% CTR)
 * - Advantage+ Audience désactivé (advantage_audience: 0) pour empêcher l'expansion hors Wallonie
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
  },
  publisher_platforms: ["facebook", "instagram"],
  facebook_positions: ["feed"],
  instagram_positions: ["stream"],
  targeting_automation: {
    advantage_audience: 0,
  },
}

async function main() {
  console.log("═══ MISE À JOUR CIBLAGE & PLACEMENTS V2 (WALLONIE 5 PROVINCES · FEED ONLY) ═══\n")

  // 1. Vérification d'estimation de portée avant application
  const reachUrl = new URL(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/reachestimate`)
  reachUrl.searchParams.set("access_token", ACCESS_TOKEN)
  reachUrl.searchParams.set("targeting_spec", JSON.stringify(targetSpecV2))

  const reachRes = await fetch(reachUrl)
  const reachJson = await reachRes.json()
  if (reachJson.error) {
    console.error("Erreur reachestimate:", JSON.stringify(reachJson.error, null, 2))
    process.exit(1)
  }

  console.log(
    `Portée estimée V2 (Wallonie 5 provinces résidents, 30-64 ans, Feed FB+IG) : ${reachJson.data?.users_lower_bound?.toLocaleString("fr-BE")} - ${reachJson.data?.users_upper_bound?.toLocaleString("fr-BE")} utilisateurs (estimate_ready=${reachJson.data?.estimate_ready})`
  )

  if (isDryRun) {
    console.log("\n[DRY-RUN] Ciblage prêt (aucune mutation appliquée) :")
    console.log(JSON.stringify(targetSpecV2, null, 2))
    return
  }

  // 2. Application sur l'AdSet actif
  const body = new URLSearchParams({
    access_token: ACCESS_TOKEN,
    targeting: JSON.stringify(targetSpecV2),
  })

  const updateRes = await fetch(`https://graph.facebook.com/v22.0/${ADSET_ID}`, {
    method: "POST",
    body,
  })
  const updateJson = await updateRes.json()
  if (updateJson.error || !updateJson.success) {
    console.error("Erreur mise à jour AdSet:", JSON.stringify(updateJson, null, 2))
    process.exit(1)
  }

  console.log(`AdSet ${ADSET_ID} mis à jour avec succès (Luxembourg BE restauré, Reels/Stories désactivés).`)

  // 3. Relecture de vérification depuis l'API Graph
  const verifyRes = await fetch(
    `https://graph.facebook.com/v22.0/${ADSET_ID}?fields=name,status,targeting&access_token=${ACCESS_TOKEN}`
  )
  const verifyJson = await verifyRes.json()
  const t = verifyJson.targeting ?? {}

  console.log("\nVérification post-écriture :", JSON.stringify({
    name: verifyJson.name,
    status: verifyJson.status,
    age: `${t.age_min}-${t.age_max}`,
    regions_included: t.geo_locations?.regions?.map((r) => `${r.name} (${r.key})`),
    location_types: t.geo_locations?.location_types,
    regions_excluded: t.excluded_geo_locations?.regions?.map((r) => `${r.name} (${r.key})`),
    countries_excluded: t.excluded_geo_locations?.countries,
    excluded_zips_count: t.excluded_geo_locations?.zips?.length ?? 0,
    facebook_positions: t.facebook_positions,
    instagram_positions: t.instagram_positions,
    advantage_audience: t.targeting_automation?.advantage_audience,
  }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
