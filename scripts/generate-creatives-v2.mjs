import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { chromium } from "playwright"

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "campagnes-meta", "creatives-v2")
const SCENES_DIR = path.join(OUT_DIR, "_scenes")
const TMP_FRAMES_DIR = path.join(OUT_DIR, "_tmp_frames")

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.mkdirSync(TMP_FRAMES_DIR, { recursive: true })

function toDataUri(absOrRelPath, mime) {
  const fullPath = path.isAbsolute(absOrRelPath) ? absOrRelPath : path.join(ROOT, absOrRelPath)
  const buf = fs.readFileSync(fullPath)
  return `data:${mime};base64,${buf.toString("base64")}`
}

const SCENE_AD1 = toDataUri(path.join(SCENES_DIR, "scene_ad1_quotes_wallonia.jpg"), "image/jpeg")
const SCENE_AD2 = toDataUri(path.join(SCENES_DIR, "scene_ad2_walloon_home_sunset.jpg"), "image/jpeg")
const SCENE_AD3 = toDataUri(path.join(SCENES_DIR, "scene_ad3_calm_homeowner.jpg"), "image/jpeg")
const LOGO_PNG = toDataUri("public/logo.png", "image/png")

const SVG_CHECK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
const SVG_CROSS = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
const SVG_SHIELD = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`
const SVG_STAR = `<svg width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
const SVG_STARS_5 = `<span style="display:inline-flex;align-items:center;gap:2px;">${SVG_STAR.repeat(5)}</span>`
const SVG_ARROW = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`

const SHARED_HEAD = `
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,700&family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@600;700;800&display=swap" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F8FAFC;
    color: #0F172A;
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
  .mono-label {
    font-family: 'JetBrains Mono', 'Segoe UI', monospace;
    font-variant-numeric: tabular-nums;
  }
</style>
`

function buildStaticAd1Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#F8FAFC;display:flex;flex-direction:column;">
    <!-- Photo Hero Haute (scène architecturale + 2 dossiers devis réels sur table chêne) -->
    <div style="position:relative;height:590px;width:100%;overflow:hidden;border-bottom:4px solid #F59E0B;">
      <img src="${SCENE_AD1}" style="width:100%;height:100%;object-fit:cover;object-position:center 58%;" />
      <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.58) 0%, rgba(15,23,42,0.06) 36%, rgba(15,23,42,0.05) 68%, rgba(15,23,42,0.52) 100%);"></div>

      <!-- Top Bar épurée -->
      <div style="position:absolute;top:36px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:inline-flex;align-items:center;gap:11px;background:rgba(15,23,42,0.9);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.22);padding:11px 22px;border-radius:999px;">
          <span style="width:10px;height:10px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>
          <span style="color:#FFFFFF;font-weight:700;font-size:20px;letter-spacing:0.05em;">WALLONIE · AUDIT COMPARATIF 2026</span>
        </div>
        <div style="background:rgba(255,255,255,0.96);padding:10px 22px;border-radius:14px;display:flex;align-items:center;box-shadow:0 8px 24px rgba(15,23,42,0.22);">
          <img src="${LOGO_PNG}" style="height:34px;width:auto;object-fit:contain;" />
        </div>
      </div>

      <!-- Bottom Tag discret sans surcharger la maison -->
      <div style="position:absolute;bottom:26px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;">
        <div style="background:rgba(255,255,255,0.95);padding:10px 20px;border-radius:12px;font-weight:700;font-size:21px;color:#0F172A;box-shadow:0 6px 20px rgba(15,23,42,0.18);">
          Maison unifamiliale · ~6,0&nbsp;kWc (14 panneaux)
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;background:#059669;color:#FFFFFF;padding:10px 20px;border-radius:12px;font-weight:700;font-size:21px;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
          ${SVG_SHIELD}
          <span>Cas réel wallon</span>
        </div>
      </div>
    </div>

    <!-- Corps éditorial Swiss Fintech -->
    <div style="flex:1;padding:44px 52px 42px;display:flex;flex-direction:column;justify-content:space-between;background:#F8FAFC;">
      <div>
        <h1 class="heading" style="font-size:58px;line-height:1.07;font-weight:800;letter-spacing:-0.03em;color:#0F172A;">
          Même toiture. Mêmes panneaux.<br/>
          <span style="color:#D97706;">Jusqu'à 1&nbsp;850&nbsp;€ d'écart.</span>
        </h1>
        <p style="margin-top:16px;font-size:26px;line-height:1.38;color:#475569;font-weight:500;">
          Ne signez jamais le premier devis solaire sans comparer jusqu'à <strong style="color:#0F172A;font-weight:700;">3 installateurs certifiés RESCERT</strong> de votre province.
        </p>
      </div>

      <!-- Tableau comparatif ultra-net -->
      <div style="display:flex;flex-direction:column;gap:16px;margin:14px 0;">
        <div style="background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:20px;padding:24px 30px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:17px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;">1er devis isolé (démarche commerciale)</div>
            <div style="font-size:25px;font-weight:600;color:#475569;margin-top:4px;">Sans mise en concurrence locale</div>
          </div>
          <div class="num" style="font-size:44px;font-weight:800;color:#94A3B8;text-decoration:line-through;text-decoration-thickness:3px;">11&nbsp;650&nbsp;€</div>
        </div>

        <div style="background:#FFFFFF;border:2.5px solid #059669;border-radius:20px;padding:26px 30px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 14px 32px -10px rgba(5,150,105,0.2);">
          <div>
            <div style="display:inline-flex;align-items:center;gap:8px;background:#ECFDF5;color:#059669;padding:6px 14px;border-radius:8px;font-size:17px;font-weight:800;letter-spacing:0.04em;">
              ${SVG_CHECK}
              <span>COMPARÉ VIA AEGIS SOLAIRE</span>
            </div>
            <div style="font-size:27px;font-weight:800;color:#0F172A;margin-top:8px;">Installateur RESCERT local audité</div>
          </div>
          <div style="text-align:right;">
            <div class="num" style="font-size:50px;font-weight:800;color:#059669;line-height:1;">9&nbsp;800&nbsp;€</div>
            <div class="num" style="font-size:21px;font-weight:700;color:#059669;margin-top:5px;">Économie&nbsp;: -1&nbsp;850&nbsp;€</div>
          </div>
        </div>
      </div>

      <!-- Bandeau éditorial sobre sans bouton factice -->
      <div style="background:#0F172A;color:#FFFFFF;border-radius:18px;padding:22px 28px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:25px;font-weight:800;letter-spacing:-0.01em;">Comparez jusqu'à 3 offres locales en 45&nbsp;s</span>
          <span style="font-size:19px;font-weight:500;color:#CBD5E1;">Liège · Namur · Hainaut · Brabant wallon · Luxembourg</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(245,158,11,0.16);border:1.5px solid #F59E0B;color:#FBBF24;padding:10px 18px;border-radius:12px;font-size:19px;font-weight:700;white-space:nowrap;">
          <span>100&nbsp;% gratuit</span>
          ${SVG_ARROW}
        </div>
      </div>
    </div>
  </body></html>`
}

function buildStaticAd2Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#0F172A;position:relative;color:#FFFFFF;display:flex;flex-direction:column;justify-content:space-between;">
    <!-- Photo architecturale wallonne pure, sans artefact néon -->
    <img src="${SCENE_AD2}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 52%;" />
    <!-- Dégradés ciblés uniquement en haut (ciel) et en bas (pelouse) pour garder la maison lumineuse -->
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.45) 30%, rgba(15,23,42,0.0) 46%, rgba(15,23,42,0.08) 65%, rgba(15,23,42,0.92) 84%, #0F172A 100%);"></div>

    <!-- Header haut dans le ciel sombre -->
    <div style="position:relative;z-index:2;padding:46px 54px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;">
        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(15,23,42,0.75);backdrop-filter:blur(8px);border:1.5px solid #F59E0B;padding:10px 22px;border-radius:999px;">
          <span style="width:9px;height:9px;border-radius:50%;background:#FBBF24;display:inline-block;"></span>
          <span style="font-size:19px;font-weight:800;color:#FBBF24;letter-spacing:0.06em;">WALLONIE 2026 · RENTABILITÉ RÉELLE</span>
        </div>
        <div style="background:rgba(255,255,255,0.96);padding:10px 22px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.28);">
          <img src="${LOGO_PNG}" style="height:34px;width:auto;display:block;" />
        </div>
      </div>

      <h1 class="heading" style="font-size:63px;line-height:1.06;font-weight:800;letter-spacing:-0.03em;color:#FFFFFF;text-shadow:0 4px 24px rgba(15,23,42,0.65);">
        Fin du compteur qui tourne<br/>
        à l'envers&nbsp;: <span style="color:#FBBF24;">encore rentable<br/>sur votre maison&nbsp;?</span>
      </h1>
      <p style="margin-top:16px;font-size:26px;color:#E2E8F0;font-weight:500;max-width:880px;line-height:1.38;text-shadow:0 2px 12px rgba(15,23,42,0.7);">
        Calculez votre rendement réel en autoconsommation et comparez <strong style="color:#FFFFFF;font-weight:700;">jusqu'à 3 offres RESCERT locales</strong>.
      </p>
    </div>

    <!-- Bas Bento éditorial propre posé sur la pelouse -->
    <div style="position:relative;z-index:2;padding:0 54px 44px;display:flex;flex-direction:column;gap:18px;">
      <!-- 3 Cartes KPI -->
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
          <div style="font-size:16px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Comparatif local</div>
          <div class="num" style="font-size:46px;font-weight:800;color:#D97706;margin-top:6px;line-height:1;">Max 3</div>
          <div style="font-size:19px;font-weight:600;color:#334155;margin-top:6px;">artisans RESCERT</div>
        </div>
      </div>

      <!-- Barre éditoriale bas sobre (pointe vers le bouton natif Meta) -->
      <div style="background:rgba(15,23,42,0.88);backdrop-filter:blur(10px);border:1.5px solid rgba(245,158,11,0.45);border-radius:16px;padding:18px 26px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${SVG_STARS_5}
          <span style="font-size:21px;font-weight:700;color:#FFFFFF;">4,9/5 · Tiers de confiance Wallonie</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;color:#FBBF24;font-size:21px;font-weight:700;">
          <span>Simulation en 45&nbsp;s · Gratuit</span>
          ${SVG_ARROW}
        </div>
      </div>
    </div>
  </body></html>`
}

function buildStaticAd3Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#FFFFFF;display:flex;flex-direction:column;">
    <!-- Photo lifestyle couple serein à domicile (zéro harcèlement) -->
    <div style="position:relative;height:520px;width:100%;overflow:hidden;border-bottom:4px solid #0F172A;">
      <img src="${SCENE_AD3}" style="width:100%;height:100%;object-fit:cover;object-position:center 28%;" />
      <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.52) 0%, rgba(15,23,42,0.04) 40%, rgba(15,23,42,0.06) 66%, rgba(15,23,42,0.62) 100%);"></div>

      <!-- Top Bar -->
      <div style="position:absolute;top:36px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;">
        <div style="background:rgba(255,255,255,0.96);padding:10px 22px;border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,0.18);">
          <img src="${LOGO_PNG}" style="height:34px;width:auto;display:block;" />
        </div>
        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(15,23,42,0.9);color:#FFFFFF;padding:11px 22px;border-radius:999px;font-size:19px;font-weight:700;letter-spacing:0.05em;border:1px solid rgba(255,255,255,0.2);">
          <span style="width:9px;height:9px;border-radius:50%;background:#10B981;"></span>
          <span>TIERS DE CONFIANCE · WALLONIE</span>
        </div>
      </div>

      <!-- Bottom Tag Photo -->
      <div style="position:absolute;bottom:24px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.96);color:#0F172A;padding:10px 20px;border-radius:12px;font-size:20px;font-weight:700;box-shadow:0 8px 20px rgba(15,23,42,0.18);">
          <span style="color:#059669;display:inline-flex;">${SVG_SHIELD}</span>
          <span>Option «&nbsp;1er contact par écrit&nbsp;» disponible</span>
        </div>
        <div style="background:rgba(15,23,42,0.88);color:#FBBF24;padding:10px 18px;border-radius:12px;font-size:19px;font-weight:700;">
          0 centre d'appels
        </div>
      </div>
    </div>

    <!-- Corps éditorial comparatif -->
    <div style="flex:1;padding:40px 48px 42px;display:flex;flex-direction:column;justify-content:space-between;background:#F8FAFC;">
      <div>
        <h1 class="heading" style="font-size:56px;line-height:1.08;font-weight:800;letter-spacing:-0.03em;color:#0F172A;">
          Marre d'être appelé <span style="color:#DC2626;">10 fois</span><br/>
          après une demande de devis&nbsp;?
        </h1>
        <p style="margin-top:14px;font-size:25px;color:#475569;font-weight:500;line-height:1.38;">
          Comparez sereinement&nbsp;: vous gardez le contrôle sur vos coordonnées et le mode de contact.
        </p>
      </div>

      <!-- Matrice contrastée nette -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:10px 0;">
        <div style="background:#FFFFFF;border:1.5px solid #FECACA;border-radius:20px;padding:26px 24px;display:flex;flex-direction:column;gap:18px;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:#FEF2F2;color:#DC2626;padding:7px 14px;border-radius:9px;font-size:17px;font-weight:800;align-self:flex-start;">
            ${SVG_CROSS}
            <span>PLUPART DES SITES</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;font-size:23px;font-weight:600;color:#475569;line-height:1.32;">
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#DC2626;margin-top:3px;flex-shrink:0;">${SVG_CROSS}</span><span>Dossier revendu à 6 à 10 sociétés</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#DC2626;margin-top:3px;flex-shrink:0;">${SVG_CROSS}</span><span>Appels insistants dès le lendemain</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#DC2626;margin-top:3px;flex-shrink:0;">${SVG_CROSS}</span><span>Sous-traitance et prix opaques</span></div>
          </div>
        </div>

        <div style="background:#0F172A;color:#FFFFFF;border:2.5px solid #F59E0B;border-radius:20px;padding:26px 24px;display:flex;flex-direction:column;gap:18px;box-shadow:0 16px 36px rgba(15,23,42,0.18);">
          <div style="display:inline-flex;align-items:center;gap:8px;background:#F59E0B;color:#0F172A;padding:7px 14px;border-radius:9px;font-size:17px;font-weight:800;align-self:flex-start;">
            ${SVG_CHECK}
            <span>CHARTE AEGIS SOLAIRE</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;font-size:23px;font-weight:600;color:#F8FAFC;line-height:1.32;">
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#10B981;margin-top:3px;flex-shrink:0;">${SVG_CHECK}</span><span>Limité à <strong style="color:#FBBF24;">3 artisans RESCERT</strong> locaux</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#10B981;margin-top:3px;flex-shrink:0;">${SVG_CHECK}</span><span>Contact par écrit (e-mail/SMS) d'abord</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#10B981;margin-top:3px;flex-shrink:0;">${SVG_CHECK}</span><span>Vérification BCE &amp; garantie locale</span></div>
          </div>
        </div>
      </div>

      <!-- Footer éditorial propre -->
      <div style="background:#FFFFFF;border:1.5px solid #E2E8F0;border-radius:18px;padding:20px 26px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:14px;">
          ${SVG_STARS_5}
          <span style="font-size:22px;font-weight:800;color:#0F172A;">4,9/5 · Offres comparées sous 48&nbsp;h</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;color:#059669;font-size:21px;font-weight:800;">
          <span>Tester en 45&nbsp;s</span>
          ${SVG_ARROW}
        </div>
      </div>
    </div>
  </body></html>`
}

function buildMotionHtml(width, height) {
  const isVertical = height / width >= 1.6
  return `<!doctype html><html><head>${SHARED_HEAD}
  <style>
    body { width:${width}px; height:${height}px; position:relative; background:#0F172A; color:#FFFFFF; }
  </style>
  </head>
  <body>
    <canvas id="stage" width="${width}" height="${height}"></canvas>
    <script>
      const canvas = document.getElementById("stage");
      const ctx = canvas.getContext("2d");
      const W = ${width}, H = ${height}, IS_VERT = ${isVertical ? "true" : "false"};

      const imgScene1 = new Image(); imgScene1.src = ${JSON.stringify(SCENE_AD1)};
      const imgScene2 = new Image(); imgScene2.src = ${JSON.stringify(SCENE_AD2)};
      const imgScene3 = new Image(); imgScene3.src = ${JSON.stringify(SCENE_AD3)};
      const imgLogo = new Image(); imgLogo.src = ${JSON.stringify(LOGO_PNG)};

      window.__imagesReady = Promise.all([
        new Promise(r => imgScene1.complete ? r() : (imgScene1.onload = r)),
        new Promise(r => imgScene2.complete ? r() : (imgScene2.onload = r)),
        new Promise(r => imgScene3.complete ? r() : (imgScene3.onload = r)),
        new Promise(r => imgLogo.complete ? r() : (imgLogo.onload = r)),
      ]);

      function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
      function easeOutCubic(x) { return 1 - Math.pow(1 - clamp(x, 0, 1), 3); }

      function roundRect(x, y, w, h, r, fill, stroke, lw = 2) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
      }

      function drawCover(img, x, y, w, h, zoom = 1.0) {
        const ir = img.width / img.height;
        const br = w / h;
        let dw, dh, dx, dy;
        if (ir > br) {
          dh = h * zoom; dw = dh * ir;
        } else {
          dw = w * zoom; dh = dw / ir;
        }
        dx = x + (w - dw) / 2;
        dy = y + (h - dh) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      }

      function drawWrapText(lines, x, y, lineH, font, color, align = "left") {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = "top";
        lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
      }

      // 15 secondes = 450 frames @ 30fps
      window.__renderFrame = function(frameIdx) {
        const t = frameIdx / 30; // 0 .. 15.0 sec
        const topSafe = IS_VERT ? 210 : 52;
        const padX = IS_VERT ? 64 : 56;
        const contentW = W - padX * 2;
        const fontHeading = "'DM Sans', 'Inter', 'Segoe UI', sans-serif";
        const fontBody = "'Inter', 'Segoe UI', sans-serif";

        ctx.clearRect(0, 0, W, H);

        // Background scènes belges haute netteté avec transition fluide
        const bgImg = t < 5.0 ? imgScene1 : t < 10.5 ? imgScene2 : imgScene3;
        const zoom = 1.02 + (t / 15) * 0.12;
        drawCover(bgImg, 0, 0, W, H, zoom);

        // Scrim éditorial contrasté
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "rgba(15, 23, 42, 0.86)");
        grad.addColorStop(0.34, "rgba(15, 23, 42, 0.44)");
        grad.addColorStop(0.62, "rgba(15, 23, 42, 0.78)");
        grad.addColorStop(1, "rgba(15, 23, 42, 0.96)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Barre de progression haute
        roundRect(padX, topSafe - 24, contentW, 7, 4, "rgba(255,255,255,0.22)");
        roundRect(padX, topSafe - 24, contentW * clamp(t / 15, 0, 1), 7, 4, "#F59E0B");

        // Pill Région + Logo
        roundRect(padX, topSafe, 470, 52, 26, "rgba(15,23,42,0.92)", "rgba(245,158,11,0.8)", 2);
        ctx.beginPath(); ctx.arc(padX + 26, topSafe + 26, 7, 0, Math.PI * 2); ctx.fillStyle = "#F59E0B"; ctx.fill();
        ctx.font = "700 20px " + fontBody;
        ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("WALLONIE · PROPRIÉTAIRES 2026", padX + 44, topSafe + 27);

        roundRect(W - padX - 210, topSafe - 2, 210, 56, 14, "#FFFFFF");
        const logoH = 34;
        const logoW = (imgLogo.width / imgLogo.height) * logoH;
        ctx.drawImage(imgLogo, W - padX - 105 - logoW / 2, topSafe + 26 - logoH / 2, logoW, logoH);

        // SCENE 1 (0 - 3.6s) : HOOK CHOC SUR L'ECART DE PRIX
        if (t < 3.6) {
          const p = easeOutCubic(t / 0.45);
          ctx.save();
          ctx.globalAlpha = p;
          const baseY = topSafe + (IS_VERT ? 150 : 105) + (1 - p) * 28;
          drawWrapText(
            ["Panneaux solaires", "en Wallonie\u00A0:"],
            padX, baseY, 76, "800 66px " + fontHeading, "#FFFFFF"
          );
          const p2 = easeOutCubic((t - 0.35) / 0.45);
          ctx.globalAlpha = p2;
          roundRect(padX, baseY + 178, contentW, IS_VERT ? 250 : 210, 24, "rgba(255,255,255,0.97)", "#F59E0B", 4);
          drawWrapText(
            ["Ne signez JAMAIS le", "premier devis sans comparer."],
            padX + 34, baseY + 214, 56, "800 44px " + fontHeading, "#0F172A"
          );
          ctx.font = "700 31px " + fontHeading;
          ctx.fillStyle = "#D97706";
          ctx.fillText("Même toiture → jusqu'à 1\u00A0850\u00A0€ d'écart", padX + 34, baseY + (IS_VERT ? 355 : 330));
          ctx.restore();
        }
        // SCENE 2 (3.6 - 7.8s) : COMPARATIF DEVIS 1 vs AEGIS
        else if (t < 7.8) {
          const lt = t - 3.6;
          const p1 = easeOutCubic(lt / 0.4);
          const p2 = easeOutCubic((lt - 0.55) / 0.45);
          const baseY = topSafe + (IS_VERT ? 140 : 95);

          ctx.save(); ctx.globalAlpha = p1;
          drawWrapText(["Cas réel constaté en Wallonie", "Installation ~6,0\u00A0kWc (14 panneaux)"], padX, baseY, 46, "800 34px " + fontHeading, "#FBBF24");

          const cardAY = baseY + 115 + (1 - p1) * 30;
          roundRect(padX, cardAY, contentW, 165, 22, "rgba(255,255,255,0.95)", "#E2E8F0", 2);
          ctx.font = "700 20px " + fontBody; ctx.fillStyle = "#64748B"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText("1ER DEVIS ISOLÉ (SANS CONCURRENCE)", padX + 30, cardAY + 28);
          ctx.font = "700 31px " + fontHeading; ctx.fillStyle = "#0F172A";
          ctx.fillText("Offre commerciale standard", padX + 30, cardAY + 68);
          ctx.font = "800 52px " + fontHeading; ctx.fillStyle = "#94A3B8"; ctx.textAlign = "right";
          ctx.fillText("11\u00A0650\u00A0€", W - padX - 30, cardAY + 52);
          ctx.beginPath(); ctx.moveTo(W - padX - 245, cardAY + 82); ctx.lineTo(W - padX - 25, cardAY + 82); ctx.strokeStyle = "#DC2626"; ctx.lineWidth = 4.5; ctx.stroke();

          ctx.globalAlpha = p2;
          const cardBY = cardAY + 195 + (1 - p2) * 30;
          roundRect(padX, cardBY, contentW, 195, 22, "#FFFFFF", "#059669", 4);
          roundRect(padX + 30, cardBY + 24, 345, 38, 8, "#ECFDF5");
          ctx.font = "800 19px " + fontBody; ctx.fillStyle = "#059669"; ctx.textAlign = "left";
          ctx.fillText("✓ COMPARÉ VIA AEGIS SOLAIRE", padX + 44, cardBY + 33);
          ctx.font = "800 31px " + fontHeading; ctx.fillStyle = "#0F172A";
          ctx.fillText("Installateur RESCERT local", padX + 30, cardBY + 78);
          const countVal = Math.round(1850 * easeOutCubic((lt - 0.8) / 1.1));
          ctx.font = "800 56px " + fontHeading; ctx.fillStyle = "#059669"; ctx.textAlign = "right";
          ctx.fillText("9\u00A0800\u00A0€", W - padX - 30, cardBY + 44);
          ctx.font = "700 27px " + fontHeading; ctx.fillStyle = "#059669";
          const formattedCount = String(countVal).replace(/\\B(?=(\\d{3})+(?!\\d))/g, "\u00A0");
          ctx.fillText("-" + formattedCount + "\u00A0€ économisés", W - padX - 30, cardBY + 122);
          ctx.restore();
        }
        // SCENE 3 (7.8 - 11.4s) : ANTI-HARCELEMENT & QUALITE RESCERT
        else if (t < 11.4) {
          const lt = t - 7.8;
          const baseY = topSafe + (IS_VERT ? 155 : 100);
          drawWrapText(["Zéro démarchage agressif.", "Juste la technique et des", "artisans locaux vérifiés."], padX, baseY, 68, "800 54px " + fontHeading, "#FFFFFF");

          const pills = [
            { title: "Jusqu'à 3 installateurs RESCERT max", sub: "Jamais 10 sociétés sur votre téléphone" },
            { title: "Option «\u00A0Contact écrit d'abord\u00A0»", sub: "Offres par e-mail ou SMS avant tout appel" },
            { title: "Toutes les provinces wallonnes", sub: "Liège · Namur · Hainaut · BW · Luxembourg" }
          ];
          pills.forEach((pill, idx) => {
            const pi = easeOutCubic((lt - idx * 0.35) / 0.4);
            ctx.save(); ctx.globalAlpha = pi;
            const py = baseY + 245 + idx * (IS_VERT ? 150 : 125) + (1 - pi) * 24;
            roundRect(padX, py, contentW, IS_VERT ? 126 : 106, 20, "rgba(255,255,255,0.97)");
            roundRect(padX + 24, py + (IS_VERT ? 35 : 25), 56, 56, 28, "#F59E0B");
            ctx.font = "800 30px " + fontHeading; ctx.fillStyle = "#0F172A"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("✓", padX + 52, py + (IS_VERT ? 64 : 54));
            ctx.textAlign = "left"; ctx.textBaseline = "top";
            ctx.font = "800 27px " + fontHeading; ctx.fillStyle = "#0F172A";
            ctx.fillText(pill.title, padX + 98, py + (IS_VERT ? 26 : 18));
            ctx.font = "500 22px " + fontBody; ctx.fillStyle = "#475569";
            ctx.fillText(pill.sub, padX + 98, py + (IS_VERT ? 68 : 56));
            ctx.restore();
          });
        }
        // SCENE 4 (11.4 - 15.0s) : END CARD SOBRE
        else {
          const lt = t - 11.4;
          const p = easeOutCubic(lt / 0.45);
          const baseY = topSafe + (IS_VERT ? 220 : 140);
          ctx.save(); ctx.globalAlpha = p;
          drawWrapText(["Comparez jusqu'à", "3 devis solaires", "en 45\u00A0secondes."], padX, baseY, 76, "800 66px " + fontHeading, "#FFFFFF");
          ctx.font = "700 29px " + fontBody; ctx.fillStyle = "#FBBF24"; ctx.textAlign = "left";
          ctx.fillText("100\u00A0% gratuit · Sans engagement · Wallonie", padX, baseY + 255);

          const pulse = 1 + Math.sin(lt * 6.5) * 0.012;
          const ctaY = baseY + 340;
          ctx.save();
          ctx.translate(W / 2, ctaY + 60);
          ctx.scale(pulse, pulse);
          ctx.translate(-W / 2, -(ctaY + 60));
          roundRect(padX, ctaY, contentW, 120, 22, "#F59E0B");
          ctx.font = "800 34px " + fontHeading; ctx.fillStyle = "#0F172A";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("SIMULER MES 3 DEVIS GRATUITS →", W / 2, ctaY + 61);
          ctx.restore();

          ctx.font = "600 23px " + fontBody; ctx.fillStyle = "#CBD5E1"; ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText("4,9/5 · Installateurs agréés RESCERT en Wallonie", W / 2, ctaY + 146);
          ctx.restore();
        }

        // Pied éditorial permanent (Scènes 1-3)
        if (t < 11.4) {
          const footerY = H - (IS_VERT ? 315 : 114);
          roundRect(padX, footerY, contentW, 78, 18, "rgba(15,23,42,0.92)", "rgba(245,158,11,0.7)", 2);
          ctx.font = "700 26px " + fontHeading; ctx.fillStyle = "#FBBF24";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("Simulation gratuite en 45\u00A0s · Max 3 offres RESCERT →", W / 2, footerY + 40);
        }
      };
    </script>
  </body></html>`
}

async function renderStaticImages(browser) {
  const specs = [
    { name: "v2_ad1_ecart1850_4x5.png", html: buildStaticAd1Html() },
    { name: "v2_ad2_rentabilite2026_4x5.png", html: buildStaticAd2Html() },
    { name: "v2_ad3_anti_demarchage_4x5.png", html: buildStaticAd3Html() },
  ]
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
  for (const spec of specs) {
    await page.setContent(spec.html, { waitUntil: "networkidle" })
    await page.evaluate(() => document.fonts?.ready)
    await page.waitForTimeout(200)
    const outPath = path.join(OUT_DIR, spec.name)
    await page.screenshot({ path: outPath, type: "png" })
    console.log("Static PNG generated:", outPath)
  }
  await page.close()
}

async function renderVideo(browser, width, height, filename) {
  const framesSub = path.join(TMP_FRAMES_DIR, `${width}x${height}`)
  fs.rmSync(framesSub, { recursive: true, force: true })
  fs.mkdirSync(framesSub, { recursive: true })

  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.setContent(buildMotionHtml(width, height), { waitUntil: "networkidle" })
  await page.evaluate(async () => {
    await document.fonts?.ready
    await window.__imagesReady
  })

  const totalFrames = 450 // 15s @ 30fps
  for (let i = 0; i < totalFrames; i++) {
    await page.evaluate((f) => window.__renderFrame(f), i)
    const frameBuf = await page.screenshot({ type: "jpeg", quality: 92 })
    fs.writeFileSync(path.join(framesSub, `frame_${String(i).padStart(4, "0")}.jpg`), frameBuf)
  }
  await page.close()

  const outMp4 = path.join(OUT_DIR, filename)
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      "30",
      "-i",
      path.join(framesSub, "frame_%04d.jpg"),
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-level",
      "4.1",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "19",
      "-movflags",
      "+faststart",
      outMp4,
    ],
    { stdio: "inherit" }
  )

  const checkPrefix = filename.replace(".mp4", "")
  for (const [label, frameNum] of [
    ["f01_hook", 45],
    ["f02_comp", 170],
    ["f03_scene3", 285],
    ["f04_cta", 390],
  ]) {
    fs.copyFileSync(
      path.join(framesSub, `frame_${String(frameNum).padStart(4, "0")}.jpg`),
      path.join(TMP_FRAMES_DIR, `${checkPrefix}_${label}.jpg`)
    )
  }

  fs.rmSync(framesSub, { recursive: true, force: true })
  console.log("Video MP4 generated:", outMp4)
}

async function main() {
  const staticOnly = process.argv.includes("--static-only")
  const feedVideoOnly = process.argv.includes("--feed-video-only")
  const browser = await chromium.launch({ headless: true })
  try {
    if (!feedVideoOnly) {
      await renderStaticImages(browser)
    }
    if (!staticOnly) {
      if (!feedVideoOnly) {
        await renderVideo(browser, 1080, 1920, "v2_video_wallonie_9x16.mp4")
      }
      await renderVideo(browser, 1080, 1350, "v2_video_wallonie_4x5.mp4")
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
