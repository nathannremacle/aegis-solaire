/**
 * Image optimization script for Aegis Solaire
 * Generates:
 *   1. Optimized WebP versions of hero backgrounds (quality 80, max 1920px wide)
 *   2. Tiny blur placeholders (20px wide, quality 20) as base64 data URIs
 *   3. Optimized WebP avatars (quality 75, 200px wide)
 *   4. Tiny blur placeholders for avatars
 *
 * Output: public/optimized/ directory + a JSON manifest at lib/image-manifest.json
 */

import sharp from "sharp"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")
const PUBLIC = path.join(ROOT, "public")
const OUT_DIR = path.join(PUBLIC, "optimized")

// Hero background images (large, used as CSS background-image)
const HERO_IMAGES = [
  "hero-background.png",
  "hero-media-partner.png",
  "hero-partenaires.png",
  "hero-particuliers.png",
]

// Avatar/testimonial images
const AVATAR_IMAGES = [
  "CatherineV.jpeg",
  "EmilieS.jpeg",
  "FrancoisG.jpeg",
  "IsabelleL.jpeg",
  "JeanPierreMartin.jpeg",
  "LaurenceM.jpeg",
  "MichelBernard.jpeg",
  "NathalieP.jpeg",
  "PhilippeD.jpeg",
  "SophieDurand.jpeg",
  "StephanieW.jpeg",
  "ThomasR.jpeg",
]

// Logo images
const LOGO_IMAGES = [
  "logo.png",
  "logo-square.png",
]

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function generateBlurDataUrl(inputPath, width = 20) {
  const buffer = await sharp(inputPath)
    .resize(width)
    .webp({ quality: 20 })
    .toBuffer()
  return `data:image/webp;base64,${buffer.toString("base64")}`
}

async function optimizeHeroImage(filename) {
  const inputPath = path.join(PUBLIC, filename)
  const baseName = path.parse(filename).name

  console.log(`  ⚡ Processing hero: ${filename}`)

  // Generate optimized WebP (1920px max width, quality 80)
  const webpPath = path.join(OUT_DIR, `${baseName}.webp`)
  await sharp(inputPath)
    .resize(1920, null, { withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(webpPath)

  // Generate smaller version for mobile (960px)
  const webpMobilePath = path.join(OUT_DIR, `${baseName}-mobile.webp`)
  await sharp(inputPath)
    .resize(960, null, { withoutEnlargement: true })
    .webp({ quality: 75, effort: 6 })
    .toFile(webpMobilePath)

  // Generate blur placeholder
  const blurDataUrl = await generateBlurDataUrl(inputPath)

  // Get file sizes for comparison
  const originalStats = await fs.stat(inputPath)
  const optimizedStats = await fs.stat(webpPath)
  const mobileStats = await fs.stat(webpMobilePath)

  console.log(`    Original: ${(originalStats.size / 1024 / 1024).toFixed(1)} MB`)
  console.log(`    WebP:     ${(optimizedStats.size / 1024).toFixed(0)} KB (${((1 - optimizedStats.size / originalStats.size) * 100).toFixed(0)}% smaller)`)
  console.log(`    Mobile:   ${(mobileStats.size / 1024).toFixed(0)} KB`)

  return {
    original: `/${filename}`,
    webp: `/optimized/${baseName}.webp`,
    mobile: `/optimized/${baseName}-mobile.webp`,
    blurDataUrl,
  }
}

async function optimizeAvatar(filename) {
  const inputPath = path.join(PUBLIC, filename)
  const baseName = path.parse(filename).name

  console.log(`  👤 Processing avatar: ${filename}`)

  // Generate optimized WebP avatar (200x200, quality 75)
  const webpPath = path.join(OUT_DIR, `${baseName}.webp`)
  await sharp(inputPath)
    .resize(200, 200, { fit: "cover" })
    .webp({ quality: 75, effort: 6 })
    .toFile(webpPath)

  // Generate blur placeholder
  const blurDataUrl = await generateBlurDataUrl(inputPath, 10)

  const originalStats = await fs.stat(inputPath)
  const optimizedStats = await fs.stat(webpPath)

  console.log(`    Original: ${(originalStats.size / 1024).toFixed(0)} KB → WebP: ${(optimizedStats.size / 1024).toFixed(0)} KB (${((1 - optimizedStats.size / originalStats.size) * 100).toFixed(0)}% smaller)`)

  return {
    original: `/${filename}`,
    webp: `/optimized/${baseName}.webp`,
    blurDataUrl,
  }
}

async function optimizeLogo(filename) {
  const inputPath = path.join(PUBLIC, filename)
  const baseName = path.parse(filename).name

  console.log(`  🏷️  Processing logo: ${filename}`)

  // Generate optimized WebP logo
  const webpPath = path.join(OUT_DIR, `${baseName}.webp`)
  await sharp(inputPath)
    .resize(400, null, { withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toFile(webpPath)

  const originalStats = await fs.stat(inputPath)
  const optimizedStats = await fs.stat(webpPath)

  console.log(`    Original: ${(originalStats.size / 1024).toFixed(0)} KB → WebP: ${(optimizedStats.size / 1024).toFixed(0)} KB`)

  return {
    original: `/${filename}`,
    webp: `/optimized/${baseName}.webp`,
  }
}

async function main() {
  console.log("🚀 Starting image optimization for Aegis Solaire...\n")

  await ensureDir(OUT_DIR)

  const manifest = { heroes: {}, avatars: {}, logos: {} }

  // Process hero images
  console.log("📸 Optimizing hero backgrounds...")
  for (const filename of HERO_IMAGES) {
    try {
      const result = await optimizeHeroImage(filename)
      manifest.heroes[path.parse(filename).name] = result
    } catch (err) {
      console.error(`  ❌ Error processing ${filename}:`, err.message)
    }
  }

  // Process avatar images
  console.log("\n👥 Optimizing avatars...")
  for (const filename of AVATAR_IMAGES) {
    try {
      const result = await optimizeAvatar(filename)
      manifest.avatars[path.parse(filename).name] = result
    } catch (err) {
      console.error(`  ❌ Error processing ${filename}:`, err.message)
    }
  }

  // Process logos
  console.log("\n🏷️  Optimizing logos...")
  for (const filename of LOGO_IMAGES) {
    try {
      const result = await optimizeLogo(filename)
      manifest.logos[path.parse(filename).name] = result
    } catch (err) {
      console.error(`  ❌ Error processing ${filename}:`, err.message)
    }
  }

  // Write manifest
  const manifestPath = path.join(ROOT, "lib", "image-manifest.json")
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`\n✅ Manifest written to: lib/image-manifest.json`)

  // Summary
  console.log("\n📊 Summary:")
  console.log(`  Heroes:  ${Object.keys(manifest.heroes).length} optimized`)
  console.log(`  Avatars: ${Object.keys(manifest.avatars).length} optimized`)
  console.log(`  Logos:   ${Object.keys(manifest.logos).length} optimized`)
  console.log("\n🎉 Done! Images saved to public/optimized/")
}

main().catch(console.error)
