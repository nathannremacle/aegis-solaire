import fs from "node:fs"
import path from "node:path"
import { chromium } from "playwright"

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "campagnes-meta", "creatives-v2")
const SCENES_DIR = path.join(OUT_DIR, "_scenes")

function toDataUri(absOrRelPath, mime) {
  const fullPath = path.isAbsolute(absOrRelPath) ? absOrRelPath : path.join(ROOT, absOrRelPath)
  const buf = fs.readFileSync(fullPath)
  return `data:${mime};base64,${buf.toString("base64")}`
}

const SCENE_V3_AD1 = toDataUri(path.join(SCENES_DIR, "scene_v3_ad1_walloon_golden.png"), "image/png")
const SCENE_V3_AD2 = toDataUri(path.join(SCENES_DIR, "scene_v3_ad2_walloon_twilight.png"), "image/png")
const LOGO_PNG = toDataUri("public/logo.png", "image/png")

const SVG_CHECK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
const SVG_STAR = `<svg width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
const SVG_STARS_5 = `<span style="display:inline-flex;align-items:center;gap:2px;">${SVG_STAR.repeat(5)}</span>`
const SVG_ARROW = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`

const SHARED_HEAD = `
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,700&family=Inter:wght@500;600;700;800&display=swap" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0F172A;
    color: #FFFFFF;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .heading {
    font-family: 'DM Sans', 'Inter', 'Segoe UI', sans-serif;
    font-variant-numeric: tabular-nums;
  }
  .num {
    font-family: 'DM Sans', 'Inter', 'Segoe UI', sans-serif;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.025em;
  }
</style>
`

function buildV3Ad1Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#0F172A;position:relative;color:#FFFFFF;display:flex;flex-direction:column;justify-content:space-between;">
    <img src="${SCENE_V3_AD1}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 50%;" />
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.84) 0%, rgba(15,23,42,0.44) 29%, rgba(15,23,42,0.0) 45%, rgba(15,23,42,0.08) 65%, rgba(15,23,42,0.92) 84%, #0F172A 100%);"></div>

    <!-- Header haut dans le ciel bleu profond -->
    <div style="position:relative;z-index:2;padding:46px 54px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;">
        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(15,23,42,0.78);backdrop-filter:blur(8px);border:1.5px solid #F59E0B;padding:10px 22px;border-radius:999px;">
          <span style="width:9px;height:9px;border-radius:50%;background:#FBBF24;display:inline-block;"></span>
          <span style="font-size:19px;font-weight:800;color:#FBBF24;letter-spacing:0.06em;">WALLONIE 2026 · RENTABILITÉ RÉELLE</span>
        </div>
        <div style="background:rgba(255,255,255,0.96);padding:10px 22px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.28);">
          <img src="${LOGO_PNG}" style="height:34px;width:auto;display:block;" />
        </div>
      </div>

      <h1 class="heading" style="font-size:62px;line-height:1.06;font-weight:800;letter-spacing:-0.03em;color:#FFFFFF;text-shadow:0 4px 24px rgba(15,23,42,0.68);">
        Facture &gt; 120&nbsp;€/mois&nbsp;?<br/>
        <span style="color:#FBBF24;">Voici votre vrai gain<br/>solaire en 2026.</span>
      </h1>
      <p style="margin-top:16px;font-size:25px;color:#E2E8F0;font-weight:500;max-width:880px;line-height:1.38;text-shadow:0 2px 12px rgba(15,23,42,0.75);">
        Simulez votre économie et mettez <strong style="color:#FFFFFF;font-weight:700;">jusqu'à 3 artisans RESCERT</strong> en concurrence.
      </p>
    </div>

    <!-- Bas 3 Cartes KPI nettes (ADN gagnant V2_AD2) -->
    <div style="position:relative;z-index:2;padding:0 54px 44px;display:flex;flex-direction:column;gap:18px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
        <div style="background:rgba(255,255,255,0.97);color:#0F172A;border-radius:20px;padding:24px 22px;box-shadow:0 16px 32px rgba(0,0,0,0.32);">
          <div style="font-size:16px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Économie moyenne</div>
          <div class="num" style="font-size:46px;font-weight:800;color:#059669;margin-top:6px;line-height:1;">1&nbsp;480&nbsp;€</div>
          <div style="font-size:19px;font-weight:600;color:#334155;margin-top:6px;">par an / foyer</div>
        </div>
        <div style="background:rgba(255,255,255,0.97);color:#0F172A;border-radius:20px;padding:24px 22px;box-shadow:0 16px 32px rgba(0,0,0,0.32);">
          <div style="font-size:16px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Amortissement</div>
          <div class="num" style="font-size:46px;font-weight:800;color:#0F172A;margin-top:6px;line-height:1;">4 à 6&nbsp;ans</div>
          <div style="font-size:19px;font-weight:600;color:#334155;margin-top:6px;">installation calibrée</div>
        </div>
        <div style="background:rgba(255,255,255,0.97);color:#0F172A;border-radius:20px;padding:24px 22px;box-shadow:0 16px 32px rgba(0,0,0,0.32);">
          <div style="font-size:16px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Concurrence</div>
          <div class="num" style="font-size:46px;font-weight:800;color:#D97706;margin-top:6px;line-height:1;">Max 3</div>
          <div style="font-size:19px;font-weight:600;color:#334155;margin-top:6px;">artisans RESCERT</div>
        </div>
      </div>

      <div style="background:rgba(15,23,42,0.88);backdrop-filter:blur(10px);border:1.5px solid rgba(245,158,11,0.45);border-radius:16px;padding:18px 26px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${SVG_STARS_5}
          <span style="font-size:20px;font-weight:700;color:#FFFFFF;">4,9/5 · Tiers de confiance indépendant Wallonie</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;color:#FBBF24;font-size:20px;font-weight:700;white-space:nowrap;">
          <span>45&nbsp;s · Gratuit</span>
          ${SVG_ARROW}
        </div>
      </div>
    </div>
  </body></html>`
}

function buildV3Ad2Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#0F172A;position:relative;color:#FFFFFF;display:flex;flex-direction:column;justify-content:space-between;">
    <img src="${SCENE_V3_AD2}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 50%;" />
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.86) 0%, rgba(15,23,42,0.46) 29%, rgba(15,23,42,0.0) 45%, rgba(15,23,42,0.10) 64%, rgba(15,23,42,0.93) 83%, #0F172A 100%);"></div>

    <!-- Header haut dans le ciel bleu nuit -->
    <div style="position:relative;z-index:2;padding:46px 54px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;">
        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(15,23,42,0.78);backdrop-filter:blur(8px);border:1.5px solid #F59E0B;padding:10px 22px;border-radius:999px;">
          <span style="width:9px;height:9px;border-radius:50%;background:#FBBF24;display:inline-block;"></span>
          <span style="font-size:19px;font-weight:800;color:#FBBF24;letter-spacing:0.06em;">WALLONIE 2026 · MISE EN CONCURRENCE</span>
        </div>
        <div style="background:rgba(255,255,255,0.96);padding:10px 22px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.28);">
          <img src="${LOGO_PNG}" style="height:34px;width:auto;display:block;" />
        </div>
      </div>

      <h1 class="heading" style="font-size:62px;line-height:1.06;font-weight:800;letter-spacing:-0.03em;color:#FFFFFF;text-shadow:0 4px 24px rgba(15,23,42,0.68);">
        Panneaux solaires&nbsp;:<br/>
        <span style="color:#FBBF24;">pourquoi payer 1&nbsp;850&nbsp;€<br/>de trop&nbsp;?</span>
      </h1>
      <p style="margin-top:16px;font-size:25px;color:#E2E8F0;font-weight:500;max-width:880px;line-height:1.38;text-shadow:0 2px 12px rgba(15,23,42,0.75);">
        Même toiture, même matériel Tier-1 : <strong style="color:#FFFFFF;font-weight:700;">comparez jusqu'à 3 offres RESCERT</strong> en 45&nbsp;s.
      </p>
    </div>

    <!-- Bas comparatif 2 cartes côte à côte sur le jardin sombre -->
    <div style="position:relative;z-index:2;padding:0 54px 44px;display:flex;flex-direction:column;gap:18px;">
      <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:16px;align-items:stretch;">
        <div style="background:rgba(255,255,255,0.95);color:#0F172A;border-radius:20px;padding:24px 24px;box-shadow:0 16px 32px rgba(0,0,0,0.32);display:flex;flex-direction:column;justify-content:space-between;">
          <div style="font-size:16px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">1er devis isolé</div>
          <div class="num" style="font-size:50px;font-weight:800;color:#94A3B8;text-decoration:line-through;text-decoration-color:#DC2626;text-decoration-thickness:3.5px;margin:10px 0;line-height:1;">11&nbsp;650&nbsp;€</div>
          <div style="font-size:19px;font-weight:600;color:#475569;">Sans mise en concurrence</div>
        </div>

        <div style="background:#FFFFFF;color:#0F172A;border:3px solid #059669;border-radius:20px;padding:22px 26px;box-shadow:0 18px 36px rgba(5,150,105,0.34);display:flex;flex-direction:column;justify-content:space-between;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="display:inline-flex;align-items:center;gap:6px;background:#ECFDF5;color:#059669;padding:5px 12px;border-radius:8px;font-size:15px;font-weight:800;letter-spacing:0.04em;">
              ${SVG_CHECK}
              <span>COMPARÉ RESCERT</span>
            </span>
            <span style="font-size:15px;font-weight:700;color:#64748B;">VIA AEGIS SOLAIRE</span>
          </div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:10px 0 8px;">
            <span class="num" style="font-size:52px;font-weight:800;color:#059669;line-height:1;">9&nbsp;800&nbsp;€</span>
          </div>
          <div class="num" style="display:inline-flex;align-items:center;gap:6px;background:#059669;color:#FFFFFF;padding:7px 14px;border-radius:10px;font-size:18px;font-weight:700;align-self:flex-start;">
            <span>-1&nbsp;850&nbsp;€ à matériel Tier-1 identique</span>
          </div>
        </div>
      </div>

      <div style="background:rgba(15,23,42,0.88);backdrop-filter:blur(10px);border:1.5px solid rgba(245,158,11,0.45);border-radius:16px;padding:18px 26px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${SVG_STARS_5}
          <span style="font-size:20px;font-weight:700;color:#FFFFFF;">4,9/5 · 100&nbsp;% gratuit · 0 centre d'appels</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;color:#FBBF24;font-size:20px;font-weight:700;white-space:nowrap;">
          <span>Aegis Solaire</span>
          ${SVG_ARROW}
        </div>
      </div>
    </div>
  </body></html>`
}

async function main() {
  const specs = [
    { name: "v3_ad1_rentabilite_autoconso_4x5.png", html: buildV3Ad1Html() },
    { name: "v3_ad2_concurrence_1850_maison_4x5.png", html: buildV3Ad2Html() },
  ]
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
    for (const spec of specs) {
      await page.setContent(spec.html, { waitUntil: "networkidle" })
      await page.evaluate(() => document.fonts?.ready)
      await page.waitForTimeout(250)
      const outPath = path.join(OUT_DIR, spec.name)
      await page.screenshot({ path: outPath, type: "png" })
      console.log("Static PNG V3 generated:", outPath)
    }
    await page.close()
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
