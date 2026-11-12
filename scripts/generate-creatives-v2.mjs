import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { chromium } from "playwright"

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "campagnes-meta", "creatives-v2")
const TMP_FRAMES_DIR = path.join(OUT_DIR, "_tmp_frames")

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.mkdirSync(TMP_FRAMES_DIR, { recursive: true })

function toDataUri(relPath, mime) {
  const buf = fs.readFileSync(path.join(ROOT, relPath))
  return `data:${mime};base64,${buf.toString("base64")}`
}

const PHOTO_CLASSIC = toDataUri("public/solar/b2c-lead-preview.jpg", "image/jpeg")
const PHOTO_HERO = toDataUri("public/hero-particuliers.png", "image/png")
const LOGO_PNG = toDataUri("public/logo.png", "image/png")

const SHARED_HEAD = `
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F8FAFC;
    color: #0F172A;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .mono {
    font-family: 'JetBrains Mono', 'Consolas', 'Courier New', monospace;
    font-variant-numeric: tabular-nums;
  }
</style>
`

function buildStaticAd1Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#F8FAFC;display:flex;flex-direction:column;">
    <!-- Photo Hero Haute -->
    <div style="position:relative;height:600px;width:100%;overflow:hidden;border-bottom:4px solid #F59E0B;">
      <img src="${PHOTO_CLASSIC}" style="width:100%;height:100%;object-fit:cover;object-position:center 42%;transform:scale(1.04);" />
      <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.12) 45%, rgba(15,23,42,0.58) 100%);"></div>

      <!-- Top Bar -->
      <div style="position:absolute;top:40px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;background:rgba(15,23,42,0.92);border:1px solid rgba(255,255,255,0.2);padding:12px 22px;border-radius:999px;">
          <span style="width:12px;height:12px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>
          <span style="color:#FFFFFF;font-weight:800;font-size:21px;letter-spacing:0.06em;">WALLONIE · PROPRIÉTAIRES 2026</span>
        </div>
        <div style="background:#FFFFFF;padding:10px 22px;border-radius:14px;display:flex;align-items:center;box-shadow:0 8px 24px rgba(15,23,42,0.2);">
          <img src="${LOGO_PNG}" style="height:34px;width:auto;object-fit:contain;" />
        </div>
      </div>

      <!-- Photo Bottom Floating Tag -->
      <div style="position:absolute;bottom:28px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;">
        <div style="background:rgba(255,255,255,0.95);padding:12px 22px;border-radius:14px;font-weight:700;font-size:22px;color:#0F172A;box-shadow:0 6px 20px rgba(0,0,0,0.16);">
          Installation 14 panneaux · ~6,0 kWc (Chaudfontaine)
        </div>
        <div style="background:#059669;color:#FFFFFF;padding:12px 22px;border-radius:14px;font-weight:800;font-size:22px;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
          Audit réel constaté
        </div>
      </div>
    </div>

    <!-- Editorial Contrast Body -->
    <div style="flex:1;padding:44px 52px 46px;display:flex;flex-direction:column;justify-content:space-between;background:#F8FAFC;">
      <div>
        <div style="font-size:56px;line-height:1.08;font-weight:900;letter-spacing:-0.03em;color:#0F172A;">
          Même maison. Mêmes panneaux.<br/>
          <span style="color:#D97706;">Jusqu'à </span><span class="mono" style="color:#D97706;">1 850 €</span><span style="color:#D97706;"> d'écart.</span>
        </div>
        <div style="margin-top:16px;font-size:27px;line-height:1.35;color:#475569;font-weight:500;">
          Ne signez jamais le premier devis solaire sans comparer jusqu'à 3 installateurs <strong style="color:#0F172A;">certifiés RESCERT</strong>.
        </div>
      </div>

      <!-- 2 Clean Comparison Cards -->
      <div style="display:flex;flex-direction:column;gap:16px;margin:18px 0;">
        <div style="background:#FFFFFF;border:2px solid #E2E8F0;border-radius:20px;padding:24px 30px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:20px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;">Premier devis isolé (commercial)</div>
            <div style="font-size:26px;font-weight:600;color:#475569;margin-top:4px;">Sans mise en concurrence locale</div>
          </div>
          <div class="mono" style="font-size:44px;font-weight:800;color:#94A3B8;text-decoration:line-through;">11 650 €</div>
        </div>

        <div style="background:#FFFFFF;border:3px solid #059669;border-radius:20px;padding:26px 30px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 12px 30px -8px rgba(5,150,105,0.22);">
          <div>
            <div style="display:inline-flex;align-items:center;gap:8px;background:#ECFDF5;color:#059669;padding:5px 14px;border-radius:8px;font-size:19px;font-weight:800;letter-spacing:0.04em;">
              ✓ COMPARÉ VIA AEGIS SOLAIRE
            </div>
            <div style="font-size:28px;font-weight:800;color:#0F172A;margin-top:6px;">Installateur RESCERT local audité</div>
          </div>
          <div style="text-align:right;">
            <div class="mono" style="font-size:48px;font-weight:900;color:#059669;line-height:1;">9 800 €</div>
            <div class="mono" style="font-size:22px;font-weight:800;color:#059669;margin-top:4px;">Économie : -1 850 €</div>
          </div>
        </div>
      </div>

      <!-- Bottom CTA -->
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="background:#0F172A;color:#FFFFFF;border-radius:18px;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 12px 26px rgba(15,23,42,0.22);">
          <span style="font-size:30px;font-weight:800;letter-spacing:-0.01em;">Comparer jusqu'à 3 devis gratuits</span>
          <span style="background:#F59E0B;color:#0F172A;padding:10px 22px;border-radius:12px;font-weight:900;font-size:26px;">45 sec →</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:21px;font-weight:600;color:#475569;padding:0 6px;">
          <span>✓ Liège · Namur · Hainaut · BW · Luxembourg</span>
          <span>✓ 100 % gratuit &amp; sans engagement</span>
        </div>
      </div>
    </div>
  </body></html>`
}

function buildStaticAd2Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#0F172A;position:relative;color:#FFFFFF;display:flex;flex-direction:column;justify-content:space-between;">
    <img src="${PHOTO_HERO}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 38%;" />
    <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.28) 38%, rgba(15,23,42,0.55) 60%, rgba(15,23,42,0.97) 78%, #0F172A 100%);"></div>

    <!-- Header -->
    <div style="position:relative;z-index:2;padding:48px 54px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
        <div style="display:inline-flex;align-items:center;gap:12px;background:rgba(245,158,11,0.18);border:2px solid #F59E0B;padding:10px 22px;border-radius:999px;">
          <span style="font-size:21px;font-weight:800;color:#FBBF24;letter-spacing:0.06em;">WALLONIE 2026 · RENTABILITÉ RÉELLE</span>
        </div>
        <div style="background:rgba(255,255,255,0.96);padding:10px 20px;border-radius:14px;">
          <img src="${LOGO_PNG}" style="height:34px;width:auto;" />
        </div>
      </div>

      <h1 style="font-size:66px;line-height:1.06;font-weight:900;letter-spacing:-0.03em;color:#FFFFFF;text-shadow:0 4px 20px rgba(0,0,0,0.4);">
        Fin du compteur qui tourne<br/>à l'envers : <span style="color:#FBBF24;">est-ce encore<br/>rentable chez vous ?</span>
      </h1>
      <p style="margin-top:18px;font-size:28px;color:#E2E8F0;font-weight:500;max-width:860px;line-height:1.35;">
        Vérifiez votre retour sur investissement exact selon votre toiture et recevez <strong style="color:#FFFFFF;">jusqu'à 3 offres RESCERT locales</strong>.
      </p>
    </div>

    <!-- Bottom Card -->
    <div style="position:relative;z-index:2;padding:0 54px 48px;display:flex;flex-direction:column;gap:22px;">
      <!-- 3 KPI Pillars -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;">
        <div style="background:rgba(255,255,255,0.96);color:#0F172A;border-radius:20px;padding:24px 22px;box-shadow:0 12px 24px rgba(0,0,0,0.28);">
          <div style="font-size:18px;font-weight:700;color:#64748B;text-transform:uppercase;">Économie moyenne</div>
          <div class="mono" style="font-size:44px;font-weight:900;color:#059669;margin-top:6px;">1 480 €</div>
          <div style="font-size:20px;font-weight:700;color:#334155;">par an / foyer</div>
        </div>
        <div style="background:rgba(255,255,255,0.96);color:#0F172A;border-radius:20px;padding:24px 22px;box-shadow:0 12px 24px rgba(0,0,0,0.28);">
          <div style="font-size:18px;font-weight:700;color:#64748B;text-transform:uppercase;">Amortissement</div>
          <div class="mono" style="font-size:44px;font-weight:900;color:#0F172A;margin-top:6px;">4 à 6 ans</div>
          <div style="font-size:20px;font-weight:700;color:#334155;">selon toiture</div>
        </div>
        <div style="background:rgba(255,255,255,0.96);color:#0F172A;border-radius:20px;padding:24px 22px;box-shadow:0 12px 24px rgba(0,0,0,0.28);">
          <div style="font-size:18px;font-weight:700;color:#64748B;text-transform:uppercase;">Installateurs</div>
          <div class="mono" style="font-size:44px;font-weight:900;color:#D97706;margin-top:6px;">Max 3</div>
          <div style="font-size:20px;font-weight:700;color:#334155;">agréés RESCERT</div>
        </div>
      </div>

      <!-- High Contrast CTA -->
      <div style="background:#F59E0B;color:#0F172A;border-radius:20px;padding:26px 34px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 14px 32px rgba(245,158,11,0.35);">
        <span style="font-size:32px;font-weight:900;letter-spacing:-0.01em;">Calculer mon gain &amp; comparer 3 devis</span>
        <span style="background:#0F172A;color:#FFFFFF;padding:10px 24px;border-radius:12px;font-weight:800;font-size:25px;">Gratuit →</span>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:21px;font-weight:600;color:#CBD5E1;padding:0 4px;">
        <span>★ 4,9/5 · Plateforme indépendante Wallonie</span>
        <span>Réponse écrite possible · Zéro harcèlement</span>
      </div>
    </div>
  </body></html>`
}

function buildStaticAd3Html() {
  return `<!doctype html><html><head>${SHARED_HEAD}</head>
  <body style="width:1080px;height:1350px;background:#F1F5F9;padding:48px 50px;display:flex;flex-direction:column;justify-content:space-between;">
    <!-- Top Header + Thumbnail -->
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="background:#FFFFFF;padding:12px 22px;border-radius:14px;border:1px solid #E2E8F0;">
        <img src="${LOGO_PNG}" style="height:36px;width:auto;" />
      </div>
      <div style="display:flex;align-items:center;gap:12px;background:#0F172A;color:#FFFFFF;padding:12px 22px;border-radius:999px;font-size:20px;font-weight:800;letter-spacing:0.05em;">
        <span style="width:10px;height:10px;border-radius:50%;background:#10B981;"></span>
        TIERS DE CONFIANCE · WALLONIE
      </div>
    </div>

    <!-- Big Punchy Headline -->
    <div style="margin-top:20px;">
      <div style="font-size:62px;line-height:1.06;font-weight:900;letter-spacing:-0.03em;color:#0F172A;">
        Marre d'être appelé<br/>
        <span style="color:#DC2626;">10 fois</span> après une demande<br/>
        de devis solaire ?
      </div>
      <div style="margin-top:18px;font-size:28px;color:#475569;font-weight:500;line-height:1.35;">
        Comparez en toute sérénité : vous gardez le contrôle sur vos coordonnées et le choix de contact.
      </div>
    </div>

    <!-- Visual Contrast Matrix -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin:10px 0;">
      <!-- Left: Comparateurs classiques -->
      <div style="background:#FFFFFF;border:2px solid #FECACA;border-radius:24px;padding:30px 26px;display:flex;flex-direction:column;gap:22px;">
        <div style="display:inline-block;background:#FEF2F2;color:#DC2626;padding:8px 16px;border-radius:10px;font-size:20px;font-weight:800;align-self:flex-start;">
          ✕ COMPARATEURS CLASSIQUES
        </div>
        <div style="display:flex;flex-direction:column;gap:20px;font-size:25px;font-weight:600;color:#475569;line-height:1.3;">
          <div style="display:flex;gap:12px;"><span style="color:#DC2626;font-weight:900;">✕</span><span>Dossier revendu à 6 à 10 sociétés</span></div>
          <div style="display:flex;gap:12px;"><span style="color:#DC2626;font-weight:900;">✕</span><span>Appels insistants dès le matin</span></div>
          <div style="display:flex;gap:12px;"><span style="color:#DC2626;font-weight:900;">✕</span><span>Sous-traitance opaque &amp; acompte risqué</span></div>
        </div>
      </div>

      <!-- Right: Aegis Solaire -->
      <div style="background:#0F172A;color:#FFFFFF;border:3px solid #F59E0B;border-radius:24px;padding:30px 26px;display:flex;flex-direction:column;gap:22px;box-shadow:0 18px 38px rgba(15,23,42,0.2);">
        <div style="display:inline-block;background:#F59E0B;color:#0F172A;padding:8px 16px;border-radius:10px;font-size:20px;font-weight:900;align-self:flex-start;">
          ✓ MÉTHODE AEGIS SOLAIRE
        </div>
        <div style="display:flex;flex-direction:column;gap:20px;font-size:25px;font-weight:700;color:#F8FAFC;line-height:1.3;">
          <div style="display:flex;gap:12px;"><span style="color:#10B981;font-weight:900;">✓</span><span>Limité à <span style="color:#FBBF24;">3 installateurs RESCERT</span> locaux</span></div>
          <div style="display:flex;gap:12px;"><span style="color:#10B981;font-weight:900;">✓</span><span>Option « Contact écrit d'abord » respectée</span></div>
          <div style="display:flex;gap:12px;"><span style="color:#10B981;font-weight:900;">✓</span><span>Vérification BCE &amp; garantie locale</span></div>
        </div>
      </div>
    </div>

    <!-- Real Proof Strip with Photo Inset -->
    <div style="background:#FFFFFF;border:2px solid #E2E8F0;border-radius:22px;padding:18px 22px;display:flex;align-items:center;gap:22px;">
      <img src="${PHOTO_CLASSIC}" style="width:140px;height:110px;object-fit:cover;border-radius:14px;flex-shrink:0;" />
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="color:#D97706;font-size:22px;font-weight:800;">★★★★★ 4,9/5 · Propriétaires Wallonie</div>
        <div style="font-size:23px;font-weight:700;color:#0F172A;line-height:1.28;">
          3 offres comparées sous 48 h · Premier contact écrit respecté.
        </div>
        <div style="font-size:19px;font-weight:600;color:#64748B;">Entreprises locales vérifiées sur toutes les provinces wallonnes</div>
      </div>
    </div>

    <!-- CTA -->
    <div style="background:#0F172A;color:#FFFFFF;border-radius:20px;padding:26px 34px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 12px 28px rgba(15,23,42,0.25);">
      <span style="font-size:31px;font-weight:800;">Recevoir jusqu'à 3 devis vérifiés</span>
      <span style="background:#10B981;color:#FFFFFF;padding:11px 24px;border-radius:12px;font-weight:900;font-size:25px;">Tester en 45 s →</span>
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

      const imgClassic = new Image(); imgClassic.src = ${JSON.stringify(PHOTO_CLASSIC)};
      const imgHero = new Image(); imgHero.src = ${JSON.stringify(PHOTO_HERO)};
      const imgLogo = new Image(); imgLogo.src = ${JSON.stringify(LOGO_PNG)};

      window.__imagesReady = Promise.all([
        new Promise(r => imgClassic.complete ? r() : (imgClassic.onload = r)),
        new Promise(r => imgHero.complete ? r() : (imgHero.onload = r)),
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

        ctx.clearRect(0, 0, W, H);

        // Background Photo avec zoom progressif fluide
        const bgImg = t < 7.5 ? imgClassic : imgHero;
        const zoom = 1.02 + (t / 15) * 0.14;
        drawCover(bgImg, 0, 0, W, H, zoom);

        // Dark editorial scrim pour lisibilité 100%
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "rgba(15, 23, 42, 0.86)");
        grad.addColorStop(0.32, "rgba(15, 23, 42, 0.42)");
        grad.addColorStop(0.60, "rgba(15, 23, 42, 0.78)");
        grad.addColorStop(1, "rgba(15, 23, 42, 0.96)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Progress Bar top
        roundRect(padX, topSafe - 24, contentW, 8, 4, "rgba(255,255,255,0.22)");
        roundRect(padX, topSafe - 24, contentW * clamp(t / 15, 0, 1), 8, 4, "#F59E0B");

        // Top Pill + Logo
        roundRect(padX, topSafe, 460, 52, 26, "rgba(15,23,42,0.92)", "rgba(245,158,11,0.8)", 2);
        ctx.beginPath(); ctx.arc(padX + 26, topSafe + 26, 7, 0, Math.PI * 2); ctx.fillStyle = "#F59E0B"; ctx.fill();
        ctx.font = "800 22px Inter, Segoe UI, sans-serif";
        ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText("WALLONIE · PROPRIÉTAIRES 2026", padX + 44, topSafe + 27);

        roundRect(W - padX - 210, topSafe - 2, 210, 56, 14, "#FFFFFF");
        const logoH = 34;
        const logoW = (imgLogo.width / imgLogo.height) * logoH;
        ctx.drawImage(imgLogo, W - padX - 105 - logoW / 2, topSafe + 26 - logoH / 2, logoW, logoH);

        // SCENE 1 (0 - 3.6s) : HOOK CHOC SUR LE PRIX
        if (t < 3.6) {
          const p = easeOutCubic(t / 0.45);
          ctx.save();
          ctx.globalAlpha = p;
          const baseY = topSafe + (IS_VERT ? 150 : 105) + (1 - p) * 28;
          drawWrapText(
            ["Panneaux solaires", "en Wallonie :"],
            padX, baseY, 78, "900 66px Inter, Segoe UI, sans-serif", "#FFFFFF"
          );
          const p2 = easeOutCubic((t - 0.35) / 0.45);
          ctx.globalAlpha = p2;
          roundRect(padX, baseY + 178, contentW, IS_VERT ? 250 : 210, 24, "rgba(255,255,255,0.96)", "#F59E0B", 4);
          drawWrapText(
            ["Ne signez JAMAIS le", "premier devis sans comparer."],
            padX + 34, baseY + 214, 58, "900 46px Inter, Segoe UI, sans-serif", "#0F172A"
          );
          ctx.font = "800 32px Inter, Segoe UI, sans-serif";
          ctx.fillStyle = "#D97706";
          ctx.fillText("Même toiture → jusqu'à 1 850 € d'écart", padX + 34, baseY + (IS_VERT ? 355 : 330));
          ctx.restore();
        }
        // SCENE 2 (3.6 - 7.8s) : COMPARATIF DEVIS A vs DEVIS B + COMPTEUR
        else if (t < 7.8) {
          const lt = t - 3.6;
          const p1 = easeOutCubic(lt / 0.4);
          const p2 = easeOutCubic((lt - 0.55) / 0.45);
          const baseY = topSafe + (IS_VERT ? 140 : 95);

          ctx.save(); ctx.globalAlpha = p1;
          drawWrapText(["Exemple réel constaté (Liège)", "Installation ~6,0 kWc"], padX, baseY, 46, "800 36px Inter, Segoe UI, sans-serif", "#FBBF24");

          // Card A
          const cardAY = baseY + 115 + (1 - p1) * 30;
          roundRect(padX, cardAY, contentW, 165, 22, "rgba(255,255,255,0.94)", "#E2E8F0", 2);
          ctx.font = "700 22px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#64748B"; ctx.textAlign = "left"; ctx.textBaseline = "top";
          ctx.fillText("DEVIS 1 (SOLO SANS CONCURRENCE)", padX + 30, cardAY + 26);
          ctx.font = "800 32px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#0F172A";
          ctx.fillText("Offre standard reçue", padX + 30, cardAY + 66);
          ctx.font = "900 54px JetBrains Mono, Consolas, monospace"; ctx.fillStyle = "#94A3B8"; ctx.textAlign = "right";
          ctx.fillText("11 650 €", W - padX - 30, cardAY + 52);
          ctx.beginPath(); ctx.moveTo(W - padX - 275, cardAY + 82); ctx.lineTo(W - padX - 25, cardAY + 82); ctx.strokeStyle = "#DC2626"; ctx.lineWidth = 5; ctx.stroke();

          // Card B
          ctx.globalAlpha = p2;
          const cardBY = cardAY + 195 + (1 - p2) * 30;
          roundRect(padX, cardBY, contentW, 195, 22, "#FFFFFF", "#059669", 4);
          roundRect(padX + 30, cardBY + 24, 340, 38, 8, "#ECFDF5");
          ctx.font = "800 21px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#059669"; ctx.textAlign = "left";
          ctx.fillText("✓ COMPARÉ SUR AEGIS SOLAIRE", padX + 44, cardBY + 32);
          ctx.font = "800 32px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#0F172A";
          ctx.fillText("Installateur RESCERT local", padX + 30, cardBY + 78);
          const countVal = Math.round(1850 * easeOutCubic((lt - 0.8) / 1.1));
          ctx.font = "900 58px JetBrains Mono, Consolas, monospace"; ctx.fillStyle = "#059669"; ctx.textAlign = "right";
          ctx.fillText("9 800 €", W - padX - 30, cardBY + 44);
          ctx.font = "800 28px JetBrains Mono, Consolas, monospace"; ctx.fillStyle = "#059669";
          ctx.fillText("-" + countVal.toLocaleString("fr-BE") + " € économisés", W - padX - 30, cardBY + 122);
          ctx.restore();
        }
        // SCENE 3 (7.8 - 11.4s) : ANTI-HARCELEMENT & QUALITE RESCERT
        else if (t < 11.4) {
          const lt = t - 7.8;
          const baseY = topSafe + (IS_VERT ? 155 : 100);
          drawWrapText(["Zéro démarchage agressif.", "Juste l'ingénierie et des", "artisans locaux vérifiés."], padX, baseY, 68, "900 56px Inter, Segoe UI, sans-serif", "#FFFFFF");

          const pills = [
            { title: "Jusqu'à 3 installateurs RESCERT max", sub: "Jamais 10 sociétés sur votre téléphone" },
            { title: "Audit gratuit sous 48 h", sub: "Rentabilité réelle calculée sur votre facture" },
            { title: "Toutes provinces wallonnes", sub: "Liège · Namur · Hainaut · BW · Luxembourg" }
          ];
          pills.forEach((pill, idx) => {
            const pi = easeOutCubic((lt - idx * 0.35) / 0.4);
            ctx.save(); ctx.globalAlpha = pi;
            const py = baseY + 245 + idx * (IS_VERT ? 150 : 125) + (1 - pi) * 24;
            roundRect(padX, py, contentW, IS_VERT ? 126 : 106, 20, "rgba(255,255,255,0.96)");
            roundRect(padX + 24, py + (IS_VERT ? 35 : 25), 56, 56, 28, "#F59E0B");
            ctx.font = "900 32px Inter, sans-serif"; ctx.fillStyle = "#0F172A"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("✓", padX + 52, py + (IS_VERT ? 64 : 54));
            ctx.textAlign = "left"; ctx.textBaseline = "top";
            ctx.font = "800 28px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#0F172A";
            ctx.fillText(pill.title, padX + 98, py + (IS_VERT ? 26 : 18));
            ctx.font = "500 22px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#475569";
            ctx.fillText(pill.sub, padX + 98, py + (IS_VERT ? 68 : 56));
            ctx.restore();
          });
        }
        // SCENE 4 (11.4 - 15.0s) : END CARD CTA PUISSANT
        else {
          const lt = t - 11.4;
          const p = easeOutCubic(lt / 0.45);
          const baseY = topSafe + (IS_VERT ? 220 : 140);
          ctx.save(); ctx.globalAlpha = p;
          drawWrapText(["Comparez vos", "devis solaires", "en 45 secondes."], padX, baseY, 78, "900 68px Inter, Segoe UI, sans-serif", "#FFFFFF");
          ctx.font = "700 30px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#FBBF24"; ctx.textAlign = "left";
          ctx.fillText("100 % gratuit · Sans engagement · Wallonie", padX, baseY + 255);

          const pulse = 1 + Math.sin(lt * 7) * 0.015;
          const ctaY = baseY + 340;
          ctx.save();
          ctx.translate(W / 2, ctaY + 62);
          ctx.scale(pulse, pulse);
          ctx.translate(-W / 2, -(ctaY + 62));
          roundRect(padX, ctaY, contentW, 124, 24, "#F59E0B");
          ctx.font = "900 36px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#0F172A";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("RECEVOIR MES 3 DEVIS GRATUITS →", W / 2, ctaY + 62);
          ctx.restore();

          ctx.font = "600 23px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#CBD5E1"; ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText("★ 4,9/5 · Installateurs agréés RESCERT en Wallonie", W / 2, ctaY + 150);
          ctx.restore();
        }

        // Bottom persistent Safe Badge on Reels/Feed during Scenes 1-3
        if (t < 11.4) {
          const footerY = H - (IS_VERT ? 320 : 120);
          roundRect(padX, footerY, contentW, 84, 18, "rgba(245,158,11,0.96)");
          ctx.font = "900 28px Inter, Segoe UI, sans-serif"; ctx.fillStyle = "#0F172A";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("Comparez jusqu'à 3 devis gratuits · 45 sec →", W / 2, footerY + 43);
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
    await page.setContent(spec.html, { waitUntil: "load" })
    await page.evaluate(() => document.fonts?.ready)
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
  await page.setContent(buildMotionHtml(width, height), { waitUntil: "load" })
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

  // Extraire 3 frames de contrôle visuel (debut 1.5s, milieu 5.5s, fin 13.0s)
  const checkPrefix = filename.replace(".mp4", "")
  for (const [label, frameNum] of [
    ["f01_hook", 45],
    ["f02_comp", 170],
    ["f03_cta", 390],
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
