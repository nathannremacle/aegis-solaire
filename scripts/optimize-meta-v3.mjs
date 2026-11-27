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
const ADSET_FEED_ID = "120251604763100465"
const PAGE_ID = "1135722802965073"
const INSTAGRAM_USER_ID = "17841416430125462"
const PIXEL_ID = "1672474437601117"
const BASE_URL = "https://www.aegissolaire.com/devis-panneaux-solaires"
const CREATIVES_DIR = path.resolve(process.cwd(), "campagnes-meta", "creatives-v2")

const TARGET_SPEND_CAP_CENTS = 120000 // 1 200,00 EUR
const TARGET_DAILY_BUDGET_CENTS = 2500 // 25,00 EUR/jour

if (!ACCESS_TOKEN) {
  console.error("META_MARKETING_TOKEN manquant dans .env.local")
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const shouldApply = args.has("--apply")
const isDryRun = args.has("--dry-run") || !shouldApply

const V3_ADS_SPEC = [
  {
    name: "V3_AD1_RENTABILITE_AUTOCONSO_4X5",
    file: "v3_ad1_rentabilite_autoconso_4x5.png",
    utmContent: "V3_AD1_RENTABILITE_AUTOCONSO_4X5",
    targetStatus: "ACTIVE",
    ctaType: "LEARN_MORE",
    headline: "Calculez votre vrai gain solaire 2026",
    description: "Gratuit · 45 s · Max 3 artisans RESCERT",
    primaryText:
      "Facture d'électricité > 120 €/mois en Wallonie ? Même après la fin du compteur qui tourne à l'envers, une installation bien dimensionnée reste très rentable en 2026 (~1 480 €/an d'économie moyenne, amortie en 4 à 6 ans).\n\nLa vraie différence se fait sur le prix du devis. Aegis Solaire est de votre côté : nous mettons jusqu'à 3 installateurs certifiés RESCERT de votre province en concurrence sur un cahier des charges Tier-1 identique.\n\nSachant qu'ils sont comparés, ils réduisent d'eux-mêmes leur marge dès la première offre (-18 % en moyenne) — sans aucun compromis sur la qualité (RESCERT, RGIE, assurance décennale).\n\n✅ Service 100 % gratuit et sans engagement\n✅ 1er contact par écrit (e-mail/SMS) respecté, zéro centre d'appels\n✅ Estimation claire de votre gain en 45 secondes 👇",
  },
  {
    name: "V3_AD2_CONCURRENCE_1850_MAISON_4X5",
    file: "v3_ad2_concurrence_1850_maison_4x5.png",
    utmContent: "V3_AD2_CONCURRENCE_1850_MAISON_4X5",
    targetStatus: "ACTIVE",
    ctaType: "LEARN_MORE",
    headline: "Même toiture : économisez jusqu'à 1 850 €",
    description: "3 devis RESCERT comparés · Gratuit · 45 s",
    primaryText:
      "Panneaux solaires en Wallonie : sur une même toiture et pour exactement le même matériel Tier-1, nous constatons jusqu'à 1 850 € d'écart entre un devis isolé et des offres mises en concurrence.\n\nNe négociez plus seul face à un commercial. Aegis Solaire agit comme votre tiers de confiance indépendant : nous mettons jusqu'à 3 installateurs agréés RESCERT de votre région en concurrence sur un cahier des charges strict.\n\nRésultat : vous obtenez le prix le plus juste au kWc, sans aucune contrepartie sur la qualité ni les garanties.\n\n✅ 100 % gratuit, aucun surcoût sur votre devis et zéro obligation de signer\n✅ Zéro centre d'appels · Option « 1er contact écrit » respectée\n✅ Simulation personnalisée en 45 secondes 👇",
  },
]

async function fetchMeta(endpoint, params = {}) {
  const url = new URL(`https://graph.facebook.com/v22.0/${endpoint}`)
  url.searchParams.set("access_token", ACCESS_TOKEN)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }
  const res = await fetch(url)
  return res.json()
}

async function postMeta(endpoint, fields) {
  const body = new URLSearchParams({
    access_token: ACCESS_TOKEN,
    ...fields,
  })
  const res = await fetch(`https://graph.facebook.com/v22.0/${endpoint}`, {
    method: "POST",
    body,
  })
  return res.json()
}

async function listExistingAdsInAdSet() {
  const json = await fetchMeta(`${ADSET_FEED_ID}/ads`, {
    fields: "id,name,status,effective_status,creative{id,name}",
    limit: "100",
  })
  if (json.error) {
    throw new Error(`Lecture ads AdSet ${ADSET_FEED_ID}: ${json.error.message}`)
  }
  const map = new Map()
  for (const ad of json.data || []) {
    map.set(ad.name, ad)
  }
  return { list: json.data || [], byName: map }
}

async function ensureAccountSpendCap() {
  const before = await fetchMeta(AD_ACCOUNT_ID, { fields: "name,spend_cap,amount_spent,currency" })
  if (before.error) {
    throw new Error(`Lecture compte ${AD_ACCOUNT_ID}: ${before.error.message}`)
  }
  if (Number(before.spend_cap) >= TARGET_SPEND_CAP_CENTS) {
    console.log(`✓ spend_cap déjà >= 1 200,00 EUR (${Number(before.spend_cap) / 100} EUR)`)
    return before
  }

  // Graph API POST /act_<id> attend généralement l'unité principale ("1200"), mais certaines versions attendent les centimes ("120000").
  // On tente "1200" puis on relit immédiatement pour vérifier que spend_cap == "120000".
  const try1 = await postMeta(AD_ACCOUNT_ID, { spend_cap: "1200" })
  if (!try1.error) {
    const check1 = await fetchMeta(AD_ACCOUNT_ID, { fields: "spend_cap,amount_spent" })
    if (String(check1.spend_cap) === String(TARGET_SPEND_CAP_CENTS)) {
      console.log(`✓ spend_cap relevé à 1 200,00 EUR (spend_cap=${check1.spend_cap})`)
      return check1
    }
    console.log(`↺ spend_cap après essai "1200" = ${check1.spend_cap}, tentative en centimes ("120000")...`)
  } else {
    console.log(`↺ Essai spend_cap="1200" rejeté (${try1.error.message}), tentative en centimes ("120000")...`)
  }

  const try2 = await postMeta(AD_ACCOUNT_ID, { spend_cap: String(TARGET_SPEND_CAP_CENTS) })
  if (try2.error) {
    throw new Error(`Échec mise à jour spend_cap: ${try2.error.error_user_msg || try2.error.message}`)
  }
  const check2 = await fetchMeta(AD_ACCOUNT_ID, { fields: "spend_cap,amount_spent" })
  if (String(check2.spend_cap) !== String(TARGET_SPEND_CAP_CENTS)) {
    throw new Error(`spend_cap inattendu après mise à jour: ${check2.spend_cap}`)
  }
  console.log(`✓ spend_cap relevé à 1 200,00 EUR (spend_cap=${check2.spend_cap})`)
  return check2
}

async function ensureCampaignDailyBudget() {
  const before = await fetchMeta(CAMPAIGN_ID, { fields: "name,status,daily_budget" })
  if (before.error) {
    throw new Error(`Lecture campagne ${CAMPAIGN_ID}: ${before.error.message}`)
  }
  if (Number(before.daily_budget) === TARGET_DAILY_BUDGET_CENTS) {
    console.log(`✓ daily_budget campagne déjà à 25,00 EUR/j (2500)`)
    return before
  }
  const upd = await postMeta(CAMPAIGN_ID, { daily_budget: String(TARGET_DAILY_BUDGET_CENTS) })
  if (upd.error) {
    throw new Error(`Échec mise à jour daily_budget: ${upd.error.error_user_msg || upd.error.message}`)
  }
  const after = await fetchMeta(CAMPAIGN_ID, { fields: "name,status,daily_budget" })
  if (String(after.daily_budget) !== String(TARGET_DAILY_BUDGET_CENTS)) {
    throw new Error(`daily_budget inattendu après mise à jour: ${after.daily_budget}`)
  }
  console.log(`✓ daily_budget campagne passé de ${Number(before.daily_budget) / 100} EUR/j à 25,00 EUR/j (daily_budget=${after.daily_budget})`)
  return after
}

async function uploadImageAsset(filePath, filename) {
  const bytes = fs.readFileSync(filePath).toString("base64")
  const json = await postMeta(`${AD_ACCOUNT_ID}/adimages`, {
    name: filename,
    bytes,
  })
  if (json.error) {
    throw new Error(`Upload image ${filename}: ${json.error.message} (code ${json.error.code})`)
  }
  const imagesObj = json.images || {}
  const firstKey = Object.keys(imagesObj)[0]
  return imagesObj[firstKey]?.hash || imagesObj[filename]?.hash
}

async function ensureAdStatus(adId, desiredStatus) {
  const json = await postMeta(adId, { status: desiredStatus })
  if (json.error) {
    throw new Error(`Mise à jour statut ad ${adId} -> ${desiredStatus}: ${json.error.message}`)
  }
  return json
}

async function createAdWithCreative(spec, imageHash) {
  const urlTags = `utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=${spec.utmContent}&utm_term={{placement}}`

  const objectStorySpec = {
    page_id: PAGE_ID,
    instagram_user_id: INSTAGRAM_USER_ID,
    link_data: {
      image_hash: imageHash,
      link: BASE_URL,
      caption: "aegissolaire.com",
      message: spec.primaryText,
      name: spec.headline,
      description: spec.description,
      call_to_action: {
        type: spec.ctaType,
        value: { link: BASE_URL },
      },
    },
  }

  const creativeJson = await postMeta(`${AD_ACCOUNT_ID}/adcreatives`, {
    name: `${spec.name}_CREATIVE`,
    object_story_spec: JSON.stringify(objectStorySpec),
    url_tags: urlTags,
  })
  if (creativeJson.error) {
    return { ok: false, stage: "adcreative", error: creativeJson.error }
  }

  const adJson = await postMeta(`${AD_ACCOUNT_ID}/ads`, {
    name: spec.name,
    adset_id: ADSET_FEED_ID,
    creative: JSON.stringify({ creative_id: creativeJson.id }),
    tracking_specs: JSON.stringify([{ "action.type": ["offsite_conversion"], fb_pixel: [PIXEL_ID] }]),
    status: spec.targetStatus,
  })
  if (adJson.error) {
    return { ok: false, stage: "ad", creativeId: creativeJson.id, error: adJson.error }
  }

  return { ok: true, creativeId: creativeJson.id, adId: adJson.id, status: spec.targetStatus }
}

async function main() {
  console.log("═══ OPTIMISATION META ADS PACK V3 ═══\n")

  for (const spec of V3_ADS_SPEC) {
    const p = path.join(CREATIVES_DIR, spec.file)
    if (!fs.existsSync(p)) {
      console.error(`Fichier créatif manquant : ${p}`)
      process.exit(1)
    }
  }

  const [acct, camp, existingBefore] = await Promise.all([
    fetchMeta(AD_ACCOUNT_ID, { fields: "name,spend_cap,amount_spent" }),
    fetchMeta(CAMPAIGN_ID, { fields: "name,status,daily_budget" }),
    listExistingAdsInAdSet(),
  ])

  console.log(`Compte   : ${acct.name} (${AD_ACCOUNT_ID}) | spend_cap=${Number(acct.spend_cap) / 100} EUR | spent=${Number(acct.amount_spent) / 100} EUR`)
  console.log(`Campagne : ${camp.name} [${camp.status}] | daily_budget=${Number(camp.daily_budget) / 100} EUR/j`)
  console.log(`AdSet 1  : ${ADSET_FEED_ID} (${existingBefore.list.length} annonces existantes)\n`)

  if (isDryRun) {
    console.log("[DRY-RUN] Plan prêt (aucune mutation envoyée) :")
    console.log(`- Relever spend_cap du compte -> 1 200,00 EUR (spend_cap=120000)`)
    console.log(`- Passer daily_budget campagne -> 25,00 EUR/j (2500)`)
    for (const spec of V3_ADS_SPEC) {
      const exists = existingBefore.byName.get(spec.name)
      console.log(
        `- ${spec.name} (${spec.file}) -> statut cible ${spec.targetStatus}${exists ? ` [existe déjà: ${exists.id}]` : " [à créer]"}`
      )
    }
    console.log("\nPour appliquer en production : node scripts/optimize-meta-v3.mjs --apply")
    return
  }

  // 1. Relever spend_cap à 1 200 EUR
  await ensureAccountSpendCap()

  // 2. Passer daily_budget à 25 EUR/j
  await ensureCampaignDailyBudget()

  // 3. Upload images + création idempotente des annonces V3
  for (const spec of V3_ADS_SPEC) {
    const existing = existingBefore.byName.get(spec.name)
    if (existing) {
      if (existing.status !== spec.targetStatus) {
        await ensureAdStatus(existing.id, spec.targetStatus)
      }
      console.log(`↺ Annonce déjà existante : ${spec.name} (${existing.id}) -> statut ${spec.targetStatus}`)
      continue
    }

    const fullPath = path.join(CREATIVES_DIR, spec.file)
    const imageHash = await uploadImageAsset(fullPath, spec.file)
    console.log(`✓ Image téléversée : ${spec.file} -> image_hash=${imageHash}`)

    const res = await createAdWithCreative(spec, imageHash)
    if (!res.ok) {
      console.error(
        `✕ Échec création ${spec.name} (${res.stage}) : code=${res.error?.code} subcode=${res.error?.error_subcode} | ${res.error?.error_user_msg || res.error?.message}`
      )
      process.exit(2)
    }
    console.log(`✓ Annonce créée (${res.status}) : ${spec.name} -> ad_id=${res.adId} (creative=${res.creativeId})`)
  }

  // 4. Relecture finale
  const after = await listExistingAdsInAdSet()
  console.log("\n═══ ÉTAT FINAL ADSET 1 (SANS MODIFICATION DE CIBLAGE NI PLACEMENTS) ═══")
  for (const ad of after.list) {
    console.log(` - [${ad.status}/${ad.effective_status}] ${ad.name} (${ad.id})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
