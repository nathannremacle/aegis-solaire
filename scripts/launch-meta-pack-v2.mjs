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

const LEGACY_AD_IDS = [
  "120251604763110465", // PUB_1_VISUEL_ANALYSE_DEVIS
  "120251605088950465", // PUB_2_VISUEL_MAISON_COMPAREZ
  "120251628805770465", // PUB_3_VISUEL_AUDIT_COMPARER
]

if (!ACCESS_TOKEN) {
  console.error("META_MARKETING_TOKEN manquant dans .env.local")
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const shouldStageAssets = args.has("--stage-assets") || args.has("--create-ads")
const shouldCreateAds = args.has("--create-ads")
const shouldActivate = args.has("--activate")
const isDryRun = !shouldStageAssets

/**
 * Configuration optimale à 20 €/j CBO : 4 créatifs haut-CTR max dans l'AdSet Feed
 * - 3 visuels photo-réalistes natifs GPT Image (ChatGPT Plus)
 * - 1 vidéo motion 15s 4:5 (challenger format vidéo)
 */
const V2_ADS_SPEC = [
  {
    name: "V2_AD1_ECART_1850_GPT",
    type: "image",
    file: "v2_ad1_ecart1850_gpt_4x5.png",
    utmContent: "V2_AD1_ECART_1850_GPT",
    headline: "Comparez jusqu'à 3 devis RESCERT",
    description: "Gratuit · 45 s · Wallonie uniquement",
    ctaType: "GET_QUOTE",
    primaryText:
      "Panneaux solaires en Wallonie : sur une même toiture et pour des panneaux équivalents, l'écart constaté entre deux devis dépasse souvent 1 500 € à 1 850 €.\n\nComparez gratuitement jusqu'à 3 installateurs agréés RESCERT de votre province (Liège, Namur, Hainaut, Brabant wallon, Luxembourg) en 45 secondes.\n👉 Réponse claire sous 48 h, zéro engagement.",
  },
  {
    name: "V2_AD2_RENTABILITE_2026_GPT",
    type: "image",
    file: "v2_ad2_rentabilite2026_gpt_4x5.png",
    utmContent: "V2_AD2_RENTABILITE_2026_GPT",
    headline: "Simulez votre vrai gain solaire 2026",
    description: "Audit gratuit · Installateurs agréés RESCERT",
    ctaType: "LEARN_MORE",
    primaryText:
      "Fin du compteur qui tourne à l'envers : le solaire reste-t-il rentable sur votre maison en Wallonie en 2026 ?\n\nOui, si l'installation est bien calibrée pour votre autoconsommation (amortissement moyen en 4 à 6 ans, ~1 480 €/an économisés). Testez votre rendement exact et comparez jusqu'à 3 offres RESCERT locales.",
  },
  {
    name: "V2_AD3_ANTI_DEMARCHAGE_GPT",
    type: "image",
    file: "v2_ad3_anti_demarchage_gpt_4x5.png",
    utmContent: "V2_AD3_ANTI_DEMARCHAGE_GPT",
    headline: "3 devis max · Zéro harcèlement",
    description: "Option 1er contact par écrit respectée",
    ctaType: "GET_QUOTE",
    primaryText:
      "Marre de recevoir 10 appels commerciaux dès le lendemain d'une demande de devis solaire ?\n\nSur Aegis Solaire, votre dossier n'est jamais revendu en masse : jusqu'à 3 installateurs RESCERT vérifiés maximum, et vous pouvez choisir le 1er contact par écrit (e-mail / SMS) uniquement.",
  },
  {
    name: "V2_VIDEO_WALLONIE_FEED_4X5",
    type: "video",
    file: "v2_video_wallonie_4x5.mp4",
    thumbFile: "v2_ad1_ecart1850_gpt_4x5.png",
    utmContent: "V2_VIDEO_WALLONIE_FEED_4X5",
    headline: "1 850 € d'écart ? Comparez 3 devis",
    description: "Gratuit · 45 s · Wallonie (RESCERT)",
    ctaType: "GET_QUOTE",
    primaryText:
      "Panneaux solaires en Wallonie : sur une même toiture, ne signez jamais le premier devis sans comparer. Jusqu'à 3 offres d'installateurs RESCERT locaux en 45 secondes.",
  },
]

async function checkPageAcl() {
  const url = new URL("https://graph.facebook.com/v22.0/me/accounts")
  url.searchParams.set("access_token", ACCESS_TOKEN)
  url.searchParams.set("fields", "id,name,tasks")
  const res = await fetch(url)
  const json = await res.json()
  const accounts = json.data || []
  const pageMatch = accounts.find((p) => p.id === PAGE_ID)
  return {
    hasPageAccess: Boolean(pageMatch),
    pageName: pageMatch?.name || null,
    tasks: pageMatch?.tasks || [],
    accountsCount: accounts.length,
  }
}

async function listExistingAdsByName() {
  const url = new URL(`https://graph.facebook.com/v22.0/${ADSET_FEED_ID}/ads`)
  url.searchParams.set("access_token", ACCESS_TOKEN)
  url.searchParams.set("fields", "id,name,status,effective_status,creative{id,name}")
  url.searchParams.set("limit", "100")
  const res = await fetch(url)
  const json = await res.json()
  const map = new Map()
  for (const ad of json.data || []) {
    map.set(ad.name, ad)
  }
  return map
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

async function uploadVideoAsset(filePath, filename) {
  const formData = new FormData()
  formData.append("access_token", ACCESS_TOKEN)
  formData.append("title", filename)
  formData.append("source", new Blob([fs.readFileSync(filePath)], { type: "video/mp4" }), filename)

  const res = await fetch(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/advideos`, {
    method: "POST",
    body: formData,
  })
  const json = await res.json()
  if (json.error) {
    throw new Error(`Upload video ${filename}: ${json.error.message} (code ${json.error.code})`)
  }
  return json.id
}

async function waitForVideoReady(videoId) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const u = new URL(`https://graph.facebook.com/v22.0/${videoId}`)
    u.searchParams.set("access_token", ACCESS_TOKEN)
    u.searchParams.set("fields", "status")
    const r = await fetch(u)
    const j = await r.json()
    const videoStatus = j.status?.video_status
    if (videoStatus === "ready") return true
    if (videoStatus === "error") {
      throw new Error(`Traitement vidéo Meta en échec pour ${videoId}: ${JSON.stringify(j.status)}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }
  throw new Error(`Timeout attente encodage vidéo Meta ${videoId}`)
}

async function createAdWithCreative(spec, assetResult, targetStatus) {
  const urlTags = `utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=${spec.utmContent}&utm_term={{placement}}`

  const objectStorySpec =
    spec.type === "image"
      ? {
          page_id: PAGE_ID,
          instagram_user_id: INSTAGRAM_USER_ID,
          link_data: {
            image_hash: assetResult.imageHash,
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
      : {
          page_id: PAGE_ID,
          instagram_user_id: INSTAGRAM_USER_ID,
          video_data: {
            video_id: assetResult.videoId,
            image_hash: assetResult.thumbHash,
            message: spec.primaryText,
            title: spec.headline,
            link_description: spec.description,
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
    status: targetStatus,
  })

  const adRes = await fetch(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/ads`, {
    method: "POST",
    body: adBody,
  })
  const adJson = await adRes.json()
  if (adJson.error) {
    return { ok: false, stage: "ad", creativeId: creativeJson.id, error: adJson.error }
  }

  return { ok: true, creativeId: creativeJson.id, adId: adJson.id, status: targetStatus }
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
  return res.json()
}

async function main() {
  console.log("═══ DÉPLOIEMENT & CONFIGURATION CAMPAGNE META ADS V2 ═══\n")

  for (const spec of V2_ADS_SPEC) {
    const p = path.join(CREATIVES_DIR, spec.file)
    if (!fs.existsSync(p)) {
      console.error(`Fichier créatif manquant : ${p}`)
      process.exit(1)
    }
  }

  const acl = await checkPageAcl()
  console.log(
    `Autorisation Page ${PAGE_ID} (${acl.pageName || "?"}) : ${acl.hasPageAccess ? `OK (${acl.tasks.join(",")})` : `NON ATTRIBUÉE (me/accounts=${acl.accountsCount})`}`
  )
  console.log(`Campagne cible : ${CAMPAIGN_ID} | AdSet Feed : ${ADSET_FEED_ID} | Pixel : ${PIXEL_ID} | IG : ${INSTAGRAM_USER_ID}`)

  if (isDryRun) {
    console.log("\n[DRY-RUN] Aucun appel d'écriture envoyé.")
    console.log("- Pour téléverser les médias : node scripts/launch-meta-pack-v2.mjs --stage-assets")
    console.log("- Pour créer en PAUSED     : node scripts/launch-meta-pack-v2.mjs --create-ads")
    console.log("- Pour créer et ACTIVER    : node scripts/launch-meta-pack-v2.mjs --create-ads --activate")
    return
  }

  const uploaded = {}
  console.log("\n1. Téléversement des créatifs retenus dans", AD_ACCOUNT_ID)
  for (const spec of V2_ADS_SPEC) {
    const fullPath = path.join(CREATIVES_DIR, spec.file)
    if (spec.type === "image") {
      const hash = await uploadImageAsset(fullPath, spec.file)
      uploaded[spec.name] = { imageHash: hash }
      console.log(`   ✓ Image téléversée : ${spec.file} -> image_hash=${hash}`)
    } else {
      const videoId = await uploadVideoAsset(fullPath, spec.file)
      const thumbName = spec.thumbFile || "v2_ad1_ecart1850_gpt_4x5.png"
      const thumbHash =
        uploaded.V2_AD1_ECART_1850_GPT?.imageHash ||
        (await uploadImageAsset(path.join(CREATIVES_DIR, thumbName), thumbName))
      console.log(`   ⏳ Vidéo téléversée : ${spec.file} -> video_id=${videoId}, attente traitement Meta...`)
      await waitForVideoReady(videoId)
      uploaded[spec.name] = { videoId, thumbHash }
      console.log(`   ✓ Vidéo prête (ready) : video_id=${videoId} (thumb=${thumbHash})`)
    }
  }

  const reelsPath = path.join(CREATIVES_DIR, "v2_video_wallonie_9x16.mp4")
  if (fs.existsSync(reelsPath)) {
    const reelsVideoId = await uploadVideoAsset(reelsPath, "v2_video_wallonie_9x16.mp4")
    uploaded.V2_VIDEO_WALLONIE_REELS_9X16 = { videoId: reelsVideoId }
    console.log(`   ✓ Vidéo Reels 9:16 archivée en bibliothèque : video_id=${reelsVideoId}`)
  }

  const manifestPath = path.join(CREATIVES_DIR, "meta-uploaded-assets.json")
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        account: AD_ACCOUNT_ID,
        campaignId: CAMPAIGN_ID,
        adsetFeedId: ADSET_FEED_ID,
        pageId: PAGE_ID,
        instagramUserId: INSTAGRAM_USER_ID,
        pixelId: PIXEL_ID,
        uploadedAt: new Date().toISOString(),
        uploaded,
      },
      null,
      2
    )
  )
  console.log(`   Manifest mis à jour : ${manifestPath}`)

  if (!shouldCreateAds) {
    console.log("\nTéléversement médias terminé (--stage-assets).")
    return
  }

  const targetStatus = shouldActivate ? "ACTIVE" : "PAUSED"
  const existingAds = await listExistingAdsByName()

  console.log(`\n2. Vérification pause des anciennes pubs V1 & création des annonces V2 (${targetStatus})`)
  for (const legacyId of LEGACY_AD_IDS) {
    await ensureAdStatus(legacyId, "PAUSED")
  }
  console.log(`   ✓ ${LEGACY_AD_IDS.length} anciennes annonces V1 confirmées PAUSED`)

  const createdAds = []
  for (const spec of V2_ADS_SPEC) {
    if (existingAds.has(spec.name)) {
      const existing = existingAds.get(spec.name)
      if (existing.status !== targetStatus) {
        await ensureAdStatus(existing.id, targetStatus)
      }
      console.log(`   ↺ Déjà existante : ${spec.name} (${existing.id}) -> statut ${targetStatus}`)
      createdAds.push({ name: spec.name, adId: existing.id, creativeId: existing.creative?.id })
      continue
    }

    const res = await createAdWithCreative(spec, uploaded[spec.name], targetStatus)
    if (res.ok) {
      console.log(`   ✓ Ad créée (${res.status}) : ${spec.name} -> ad_id=${res.adId} (creative=${res.creativeId})`)
      createdAds.push({ name: spec.name, adId: res.adId, creativeId: res.creativeId })
    } else {
      console.error(
        `   ✕ Échec sur ${spec.name} (${res.stage}) : code=${res.error?.code} subcode=${res.error?.error_subcode} | ${res.error?.error_user_msg || res.error?.message}`
      )
      process.exit(2)
    }
  }

  console.log(`\nDéploiement V2 terminé (${createdAds.length} annonces en statut ${targetStatus}).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
