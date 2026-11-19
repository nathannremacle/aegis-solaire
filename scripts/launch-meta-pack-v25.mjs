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

const VIDEO_AD_TO_PAUSE_ID = "120251681583270465"

if (!ACCESS_TOKEN) {
  console.error("META_MARKETING_TOKEN manquant dans .env.local")
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const shouldApply = args.has("--apply")
const isDryRun = args.has("--dry-run") || !shouldApply

const V25_ADS_SPEC = [
  {
    name: "V25_ALLIE_CONCURRENCE_4X5",
    file: "v25_allie_concurrence_4x5.png",
    utmContent: "V25_ALLIE_CONCURRENCE_4X5",
    targetStatus: "ACTIVE",
    ctaType: "GET_QUOTE",
    headline: "3 devis RESCERT en concurrence",
    description: "Gratuit · 45 s · Zéro appel non sollicité",
    primaryText:
      "Propriétaire en Wallonie ? Ne négociez plus seul votre devis solaire.\n\nAegis Solaire est de votre côté : nous mettons jusqu'à 3 installateurs certifiés RESCERT de votre province en concurrence sur un cahier des charges identique (matériel Tier-1, conformité RGIE).\n\nRésultat : sachant qu'ils sont comparés, ils réduisent d'eux-mêmes leur marge dès la première offre (-18 % en moyenne, jusqu'à 1 850 € d'écart) — sans aucun compromis sur la qualité.\n\n✅ Service 100 % gratuit et sans engagement\n✅ 1er contact par écrit (e-mail/SMS) respecté, zéro centre d'appels\n✅ Estimation claire en 45 secondes\n\nActivez votre mise en concurrence gratuite ci-dessous 👇",
  },
  {
    name: "V25_FACTURE_2026_4X5",
    file: "v25_facture_2026_4x5.png",
    utmContent: "V25_FACTURE_2026_4X5",
    targetStatus: "PAUSED",
    ctaType: "GET_QUOTE",
    headline: "Panneaux solaires : payez le juste prix",
    description: "-18 % en concurrence · Artisans RESCERT",
    primaryText:
      "Panneaux solaires en Wallonie en 2026 : comment être sûr de ne pas payer 1 500 € à 1 850 € trop cher ?\n\nEn organisant la mise en concurrence. Sur Aegis Solaire, votre tiers de confiance indépendant, jusqu'à 3 installateurs agréés RESCERT de votre province chiffrent votre toiture sur un cahier des charges Tier-1 strict.\n\nVous obtenez le meilleur prix au kWc sans aucune contrepartie sur la qualité — gratuitement, sans surcoût et sans obligation de signer.\n\nFaites votre simulation en 45 secondes 👇",
  },
]

async function listExistingAdsInAdSet() {
  const url = new URL(`https://graph.facebook.com/v22.0/${ADSET_FEED_ID}/ads`)
  url.searchParams.set("access_token", ACCESS_TOKEN)
  url.searchParams.set("fields", "id,name,status,effective_status,creative{id,name}")
  url.searchParams.set("limit", "100")
  const res = await fetch(url)
  const json = await res.json()
  if (json.error) {
    throw new Error(`Lecture ads AdSet ${ADSET_FEED_ID}: ${json.error.message}`)
  }
  const map = new Map()
  for (const ad of json.data || []) {
    map.set(ad.name, ad)
  }
  return { list: json.data || [], byName: map }
}

async function uploadImageAsset(filePath, filename) {
  const bytes = fs.readFileSync(filePath).toString("base64")
  const form = new URLSearchParams({
    access_token: ACCESS_TOKEN,
    name: filename,
    bytes,
  })
  const res = await fetch(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/adimages`, {
    method: "POST",
    body: form,
  })
  const json = await res.json()
  if (json.error) {
    throw new Error(`Upload image ${filename}: ${json.error.message} (code ${json.error.code})`)
  }
  const imagesObj = json.images || {}
  const firstKey = Object.keys(imagesObj)[0]
  return imagesObj[firstKey]?.hash || imagesObj[filename]?.hash
}

async function ensureAdStatus(adId, desiredStatus) {
  const body = new URLSearchParams({
    access_token: ACCESS_TOKEN,
    status: desiredStatus,
  })
  const res = await fetch(`https://graph.facebook.com/v22.0/${adId}`, {
    method: "POST",
    body,
  })
  const json = await res.json()
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

  const creativeBody = new URLSearchParams({
    access_token: ACCESS_TOKEN,
    name: `${spec.name}_CREATIVE`,
    object_story_spec: JSON.stringify(objectStorySpec),
    url_tags: urlTags,
  })

  const creativeRes = await fetch(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/adcreatives`, {
    method: "POST",
    body: creativeBody,
  })
  const creativeJson = await creativeRes.json()
  if (creativeJson.error) {
    return { ok: false, stage: "adcreative", error: creativeJson.error }
  }

  const adBody = new URLSearchParams({
    access_token: ACCESS_TOKEN,
    name: spec.name,
    adset_id: ADSET_FEED_ID,
    creative: JSON.stringify({ creative_id: creativeJson.id }),
    tracking_specs: JSON.stringify([{ "action.type": ["offsite_conversion"], fb_pixel: [PIXEL_ID] }]),
    status: spec.targetStatus,
  })

  const adRes = await fetch(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/ads`, {
    method: "POST",
    body: adBody,
  })
  const adJson = await adRes.json()
  if (adJson.error) {
    return { ok: false, stage: "ad", creativeId: creativeJson.id, error: adJson.error }
  }

  return { ok: true, creativeId: creativeJson.id, adId: adJson.id, status: spec.targetStatus }
}

async function main() {
  console.log("═══ DÉPLOIEMENT META ADS PACK V2.5 (ALLIÉ PROTECTEUR) ═══\n")

  for (const spec of V25_ADS_SPEC) {
    const p = path.join(CREATIVES_DIR, spec.file)
    if (!fs.existsSync(p)) {
      console.error(`Fichier créatif manquant : ${p}`)
      process.exit(1)
    }
  }

  const existingBefore = await listExistingAdsInAdSet()
  console.log(`Campagne : ${CAMPAIGN_ID} | AdSet 1 : ${ADSET_FEED_ID} (${existingBefore.list.length} annonces existantes)`)

  if (isDryRun) {
    console.log("\n[DRY-RUN] Plan prêt (aucune mutation envoyée) :")
    console.log(`- Confirmer PAUSED sur V2_VIDEO_WALLONIE_FEED_4X5 (${VIDEO_AD_TO_PAUSE_ID})`)
    for (const spec of V25_ADS_SPEC) {
      const exists = existingBefore.byName.get(spec.name)
      console.log(
        `- ${spec.name} (${spec.file}) -> statut cible ${spec.targetStatus}${exists ? ` [existe déjà: ${exists.id}]` : " [à créer]"}`
      )
    }
    console.log("\nPour appliquer en production : node scripts/launch-meta-pack-v25.mjs --apply")
    return
  }

  // 1. Confirmer PAUSED sur V2_VIDEO_WALLONIE_FEED_4X5
  const videoAd = existingBefore.byName.get("V2_VIDEO_WALLONIE_FEED_4X5")
  if (!videoAd || videoAd.status !== "PAUSED") {
    await ensureAdStatus(VIDEO_AD_TO_PAUSE_ID, "PAUSED")
    console.log(`✓ V2_VIDEO_WALLONIE_FEED_4X5 (${VIDEO_AD_TO_PAUSE_ID}) confirmée PAUSED.`)
  } else {
    console.log(`✓ V2_VIDEO_WALLONIE_FEED_4X5 (${VIDEO_AD_TO_PAUSE_ID}) déjà PAUSED.`)
  }

  // 2. Upload images + création idempotente des annonces V2.5
  for (const spec of V25_ADS_SPEC) {
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

  // 3. Relecture finale des annonces de l'AdSet 1
  const after = await listExistingAdsInAdSet()
  console.log("\n═══ ÉTAT FINAL ADSET 1 (SANS MODIFICATION DE CIBLAGE NI BUDGET) ═══")
  for (const ad of after.list) {
    console.log(` - [${ad.status}/${ad.effective_status}] ${ad.name} (${ad.id})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
