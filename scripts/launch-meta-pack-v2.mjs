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
const ADSET_FEED_ID = "120251604763100465"
const PAGE_ID = "1135722802965073"
const BASE_URL = "https://www.aegissolaire.com/devis-panneaux-solaires"
const CREATIVES_DIR = path.resolve(process.cwd(), "campagnes-meta", "creatives-v2")

if (!ACCESS_TOKEN) {
  console.error("META_MARKETING_TOKEN manquant dans .env.local")
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const shouldStageAssets = args.has("--stage-assets") || args.has("--create-ads")
const shouldCreateAds = args.has("--create-ads")
const isDryRun = !shouldStageAssets

const V2_ADS_SPEC = [
  {
    name: "V2_AD1_ECART_1850_4X5",
    type: "image",
    file: "v2_ad1_ecart1850_4x5.png",
    utmContent: "V2_AD1_ECART_1850_4X5",
    headline: "Comparez jusqu'à 3 devis RESCERT",
    description: "Gratuit · 45 sec · Wallonie uniquement",
    ctaType: "GET_QUOTE",
    primaryText:
      "Panneaux solaires en Wallonie : sur une même toiture et pour des panneaux équivalents, l'écart constaté entre deux devis dépasse souvent 1 500 € à 1 850 €.\n\nComparez gratuitement jusqu'à 3 installateurs agréés RESCERT de votre province (Liège, Namur, Hainaut, Brabant wallon, Luxembourg) en 45 secondes.\n👉 Réponse claire sous 48 h, zéro engagement.",
  },
  {
    name: "V2_AD2_RENTABILITE_2026_4X5",
    type: "image",
    file: "v2_ad2_rentabilite2026_4x5.png",
    utmContent: "V2_AD2_RENTABILITE_2026_4X5",
    headline: "Simulez votre vrai gain solaire 2026",
    description: "Audit gratuit · Installateurs agréés RESCERT",
    ctaType: "LEARN_MORE",
    primaryText:
      "Fin du compteur qui tourne à l'envers : le solaire reste-t-il rentable sur votre maison en Wallonie en 2026 ?\n\nOui, si l'installation est bien dimensionnée pour votre autoconsommation. Testez votre économie annuelle et comparez jusqu'à 3 offres RESCERT locales.",
  },
  {
    name: "V2_AD3_ANTI_DEMARCHAGE_4X5",
    type: "image",
    file: "v2_ad3_anti_demarchage_4x5.png",
    utmContent: "V2_AD3_ANTI_DEMARCHAGE_4X5",
    headline: "3 devis max · Zéro harcèlement",
    description: "Entreprises wallonnes RESCERT vérifiées",
    ctaType: "GET_QUOTE",
    primaryText:
      "Marre de recevoir 10 appels commerciaux dès le lendemain d'une demande de devis solaire ?\n\nSur Aegis Solaire, votre dossier n'est jamais revendu en masse : jusqu'à 3 installateurs RESCERT de votre province maximum, et vous pouvez exiger un premier contact par écrit uniquement.",
  },
  {
    name: "V2_VIDEO_WALLONIE_FEED_4X5",
    type: "video",
    file: "v2_video_wallonie_4x5.mp4",
    thumbFile: "v2_ad1_ecart1850_4x5.png",
    utmContent: "V2_VIDEO_WALLONIE_FEED_4X5",
    headline: "1 850 € d'écart ? Comparez 3 devis",
    description: "Gratuit · 45 sec · Wallonie (RESCERT)",
    ctaType: "GET_QUOTE",
    primaryText:
      "Panneaux solaires en Wallonie : sur une même toiture, ne signez jamais le premier devis sans comparer. Jusqu'à 3 offres d'installateurs RESCERT locaux en 45 secondes.",
  },
]

async function checkPageAcl() {
  const url = new URL(`https://graph.facebook.com/v22.0/me/accounts`)
  url.searchParams.set("access_token", ACCESS_TOKEN)
  url.searchParams.set("fields", "id,name,tasks")
  const res = await fetch(url)
  const json = await res.json()
  const accounts = json.data || []
  const pageMatch = accounts.find((p) => p.id === PAGE_ID)
  return {
    hasPageAccess: Boolean(pageMatch),
    tasks: pageMatch?.tasks || [],
    accountsCount: accounts.length,
  }
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

async function createPausedAd(spec, assetResult) {
  const destUrl = `${BASE_URL}?utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=${spec.utmContent}&utm_term={{placement}}`

  const objectStorySpec =
    spec.type === "image"
      ? {
          page_id: PAGE_ID,
          link_data: {
            image_hash: assetResult.imageHash,
            link: destUrl,
            message: spec.primaryText,
            name: spec.headline,
            description: spec.description,
            call_to_action: {
              type: spec.ctaType,
              value: { link: destUrl },
            },
          },
        }
      : {
          page_id: PAGE_ID,
          video_data: {
            video_id: assetResult.videoId,
            image_hash: assetResult.thumbHash,
            message: spec.primaryText,
            title: spec.headline,
            link_description: spec.description,
            call_to_action: {
              type: spec.ctaType,
              value: { link: destUrl },
            },
          },
        }

  const creativeBody = new URLSearchParams({
    access_token: ACCESS_TOKEN,
    name: `${spec.name}_CREATIVE`,
    object_story_spec: JSON.stringify(objectStorySpec),
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
    status: "PAUSED",
  })

  const adRes = await fetch(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/ads`, {
    method: "POST",
    body: adBody,
  })
  const adJson = await adRes.json()
  if (adJson.error) {
    return { ok: false, stage: "ad", creativeId: creativeJson.id, error: adJson.error }
  }

  return { ok: true, creativeId: creativeJson.id, adId: adJson.id }
}

async function main() {
  console.log("═══ DÉPLOIEMENT PACK CRÉATIF V2 META ADS (STAGING + CRÉATION PAUSED) ═══\n")

  for (const spec of V2_ADS_SPEC) {
    const p = path.join(CREATIVES_DIR, spec.file)
    if (!fs.existsSync(p)) {
      console.error(`Fichier créatif manquant : ${p}. Lancez d'abord : node scripts/generate-creatives-v2.mjs`)
      process.exit(1)
    }
  }

  const acl = await checkPageAcl()
  console.log(
    `Statut autorisation Page ${PAGE_ID} pour ce token : ${acl.hasPageAccess ? `OK (${acl.tasks.join(",")})` : `NON ATTRIBUÉE (me/accounts=${acl.accountsCount})`}`
  )

  if (isDryRun) {
    console.log("\n[DRY-RUN] Aucun appel d'écriture envoyé.")
    console.log("- Pour téléverser les images/vidéos V2 dans le compte pub :", "node scripts/launch-meta-pack-v2.mjs --stage-assets")
    console.log("- Pour créer les annonces V2 en statut PAUSED :", "node scripts/launch-meta-pack-v2.mjs --create-ads")
    return
  }

  const uploaded = {}
  console.log("\n1. Téléversement des créatifs V2 dans la bibliothèque médias de", AD_ACCOUNT_ID)
  for (const spec of V2_ADS_SPEC) {
    const fullPath = path.join(CREATIVES_DIR, spec.file)
    if (spec.type === "image") {
      const hash = await uploadImageAsset(fullPath, spec.file)
      uploaded[spec.name] = { imageHash: hash }
      console.log(`   ✓ Image téléversée : ${spec.file} -> image_hash=${hash}`)
    } else {
      const videoId = await uploadVideoAsset(fullPath, spec.file)
      const thumbName = spec.thumbFile || "v2_ad1_ecart1850_4x5.png"
      const thumbHash = uploaded.V2_AD1_ECART_1850_4X5?.imageHash || (await uploadImageAsset(path.join(CREATIVES_DIR, thumbName), thumbName))
      uploaded[spec.name] = { videoId, thumbHash }
      console.log(`   ✓ Vidéo téléversée : ${spec.file} -> video_id=${videoId} (thumb=${thumbHash})`)
    }
  }

  // Upload optionnel de la vidéo 9:16 Reels en bibliothèque médias pour lancement AdSet B Reels
  const reelsPath = path.join(CREATIVES_DIR, "v2_video_wallonie_9x16.mp4")
  if (fs.existsSync(reelsPath)) {
    const reelsVideoId = await uploadVideoAsset(reelsPath, "v2_video_wallonie_9x16.mp4")
    uploaded.V2_VIDEO_WALLONIE_REELS_9X16 = { videoId: reelsVideoId }
    console.log(`   ✓ Vidéo Reels 9:16 téléversée : v2_video_wallonie_9x16.mp4 -> video_id=${reelsVideoId}`)
  }

  const manifestPath = path.join(CREATIVES_DIR, "meta-uploaded-assets.json")
  fs.writeFileSync(manifestPath, JSON.stringify({ account: AD_ACCOUNT_ID, adsetFeedId: ADSET_FEED_ID, pageId: PAGE_ID, uploadedAt: new Date().toISOString(), uploaded }, null, 2))
  console.log(`   Manifest enregistré : ${manifestPath}`)

  if (!shouldCreateAds) {
    console.log("\nTéléversement médias terminé (--stage-assets).")
    return
  }

  console.log("\n2. Création des AdCreatives + Ads V2 (statut PAUSED) sur AdSet", ADSET_FEED_ID)
  for (const spec of V2_ADS_SPEC) {
    const res = await createPausedAd(spec, uploaded[spec.name])
    if (res.ok) {
      console.log(`   ✓ Ad créée (PAUSED) : ${spec.name} -> ad_id=${res.adId} (creative=${res.creativeId})`)
    } else {
      console.error(`   ✕ Échec sur ${spec.name} (${res.stage}) : code=${res.error?.code} subcode=${res.error?.error_subcode} | ${res.error?.error_user_msg || res.error?.message}`)
      if (res.error?.error_subcode === 3858749) {
        console.error(
          "\nACTION REQUISE DANS META BUSINESS MANAGER (Init42) :\n" +
            `  Donner au Système User AegisLeadEngineMonitor l'accès 'Créer des publicités (Ads)' sur la Page ${PAGE_ID},\n` +
            "  puis relancer : node scripts/launch-meta-pack-v2.mjs --create-ads"
        )
        process.exit(2)
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

