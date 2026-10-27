import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT_DIR = 'C:/Users/mrnat/Documents/SaaS/Aegis Solaire/aegis-solaire-main/campagnes-meta/creatives-final';
fs.mkdirSync(OUT_DIR, { recursive: true });

// Palette Bobex/Aegis officielle de la landing
const THEME = {
  navy: '#002A45',
  navyDark: '#001D3D',
  yellow: '#F8C630',
  yellowHover: '#F2BA1F',
  yellowShadow: '#DEB12C',
  bg: '#F6F9FC',
  cardBg: '#FFFFFF',
  textMain: '#002A45',
  textMuted: '#64748B',
  emerald: '#059669',
  emeraldBg: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  border: '#E2E8F0',
  redSoft: '#EF4444',
  redBg: '#FEF2F2',
};

// Templates HTML pour chaque créatif
function renderAngle1Html(aspectRatio = '1:1') {
  const isVertical = aspectRatio === '4:5';
  const height = isVertical ? 1350 : 1080;
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body {
    width: 1080px;
    height: ${height}px;
    background: ${THEME.bg};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: ${isVertical ? '70px 65px' : '55px 60px'};
    color: ${THEME.navy};
    overflow: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.5px;
    color: ${THEME.navy};
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-dot {
    width: 14px;
    height: 14px;
    background: ${THEME.yellow};
    border-radius: 50%;
  }
  .badge-rescert {
    background: ${THEME.emeraldBg};
    border: 2px solid ${THEME.emeraldBorder};
    color: ${THEME.emerald};
    font-weight: 800;
    font-size: 16px;
    padding: 8px 18px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .headline-group {
    margin-top: ${isVertical ? '35px' : '20px'};
  }
  .eyebrow {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #D97706;
    margin-bottom: 12px;
  }
  .main-title {
    font-size: ${isVertical ? '48px' : '42px'};
    font-weight: 900;
    line-height: 1.15;
    letter-spacing: -1px;
    color: ${THEME.navy};
  }
  .main-title .highlight {
    background: ${THEME.yellow};
    padding: 2px 8px;
    border-radius: 6px;
  }
  .card {
    background: #FFFFFF;
    border: 2px solid ${THEME.border};
    border-radius: 28px;
    padding: ${isVertical ? '40px' : '32px'};
    box-shadow: 0 20px 40px rgba(0, 42, 69, 0.08);
    margin-top: ${isVertical ? '35px' : '20px'};
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid ${THEME.bg};
    padding-bottom: 18px;
    margin-bottom: 22px;
  }
  .card-title {
    font-size: 18px;
    font-weight: 800;
    color: ${THEME.navy};
  }
  .specs-pill {
    background: ${THEME.bg};
    font-size: 14px;
    font-weight: 700;
    color: ${THEME.textMuted};
    padding: 6px 14px;
    border-radius: 8px;
  }
  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 22px;
  }
  .metric-box {
    padding: 20px;
    border-radius: 18px;
    border: 1.5px solid ${THEME.border};
  }
  .metric-box.standard {
    background: #F8FAFC;
  }
  .metric-box.battery {
    background: #F0FDF4;
    border-color: #86EFAC;
  }
  .metric-label {
    font-size: 14px;
    font-weight: 700;
    color: ${THEME.textMuted};
    margin-bottom: 8px;
  }
  .metric-val {
    font-size: 38px;
    font-weight: 900;
    line-height: 1;
    color: ${THEME.navy};
  }
  .metric-val.green {
    color: ${THEME.emerald};
  }
  .metric-sub {
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.textMuted};
    margin-top: 6px;
  }
  .savings-banner {
    background: ${THEME.navy};
    color: #FFFFFF;
    border-radius: 18px;
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .savings-label {
    font-size: 16px;
    font-weight: 700;
  }
  .savings-amount {
    font-size: 32px;
    font-weight: 900;
    color: ${THEME.yellow};
  }
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: ${isVertical ? '35px' : '20px'};
    padding-top: 15px;
    border-top: 1.5px solid #CBD5E1;
  }
  .footer-trust {
    font-size: 15px;
    font-weight: 700;
    color: ${THEME.textMuted};
  }
  .cta-fake-btn {
    background: ${THEME.yellow};
    color: ${THEME.navy};
    font-size: 17px;
    font-weight: 900;
    padding: 14px 28px;
    border-radius: 14px;
    box-shadow: 0 4px 0 ${THEME.yellowShadow};
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-dot"></div>
      <span>AEGIS SOLAIRE</span>
    </div>
    <div class="badge-rescert">
      <span>✓</span>
      <span>Installateurs Agréés RESCERT</span>
    </div>
  </div>

  <div class="headline-group">
    <div class="eyebrow">Wallonie · Étude Technique 2026</div>
    <h1 class="main-title">
      Fin du compteur qui tourne à l'envers : <br>
      <span class="highlight">les panneaux sont-ils encore rentables ?</span>
    </h1>
  </div>

  <div class="card">
    <div class="card-header">
      <span class="card-title">Maison 4 façades type (Toiture 12 panneaux · 5,2 kWc)</span>
      <span class="specs-pill">Amortissement : 6 à 8 ans</span>
    </div>

    <div class="comparison-grid">
      <div class="metric-box standard">
        <div class="metric-label">Facture sans panneaux</div>
        <div class="metric-val">2.400 €</div>
        <div class="metric-sub">Achat réseau plein pot (0,35 €/kWh)</div>
      </div>
      <div class="metric-box battery">
        <div class="metric-label">Facture avec solaire</div>
        <div class="metric-val green">920 €</div>
        <div class="metric-sub">Après autoconsommation directe</div>
      </div>
    </div>

    <div class="savings-banner">
      <span class="savings-label">Économie nette moyenne constatée en Wallonie :</span>
      <span class="savings-amount">1.480 € / an</span>
    </div>
  </div>

  <div class="footer-bar">
    <span class="footer-trust">Simulation neutre en 45 s · 1 seul artisan RESCERT local · 0 démarcheur</span>
    <span class="cta-fake-btn">Calculer mes économies →</span>
  </div>
</body>
</html>`;
}

function renderAngle2Html(aspectRatio = '1:1') {
  const isVertical = aspectRatio === '4:5';
  const height = isVertical ? 1350 : 1080;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body {
    width: 1080px;
    height: ${height}px;
    background: ${THEME.bg};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: ${isVertical ? '70px 65px' : '55px 60px'};
    color: ${THEME.navy};
    overflow: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    font-size: 28px;
    font-weight: 900;
    color: ${THEME.navy};
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-dot {
    width: 14px;
    height: 14px;
    background: ${THEME.yellow};
    border-radius: 50%;
  }
  .badge-rescert {
    background: ${THEME.navy};
    color: #FFFFFF;
    font-weight: 800;
    font-size: 15px;
    padding: 8px 18px;
    border-radius: 999px;
  }
  .headline-group {
    margin-top: ${isVertical ? '35px' : '20px'};
  }
  .eyebrow {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #DC2626;
    margin-bottom: 12px;
  }
  .main-title {
    font-size: ${isVertical ? '48px' : '42px'};
    font-weight: 900;
    line-height: 1.15;
    letter-spacing: -1px;
    color: ${THEME.navy};
  }
  .main-title .highlight {
    background: ${THEME.yellow};
    padding: 2px 8px;
    border-radius: 6px;
  }
  .comparison-table {
    background: #FFFFFF;
    border: 2px solid ${THEME.border};
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 42, 69, 0.08);
    margin-top: ${isVertical ? '35px' : '20px'};
  }
  .table-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1.5px solid ${THEME.border};
  }
  .table-row:last-child {
    border-bottom: none;
  }
  .col-danger {
    background: #FEF2F2;
    padding: 24px 28px;
    border-right: 1.5px solid ${THEME.border};
  }
  .col-safe {
    background: #F0FDF4;
    padding: 24px 28px;
  }
  .col-header {
    font-size: 18px;
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .col-danger .col-header { color: #DC2626; }
  .col-safe .col-header { color: ${THEME.emerald}; }
  .col-body {
    font-size: 15px;
    font-weight: 600;
    color: #475569;
    line-height: 1.4;
  }
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: ${isVertical ? '35px' : '20px'};
    padding-top: 15px;
    border-top: 1.5px solid #CBD5E1;
  }
  .footer-trust {
    font-size: 15px;
    font-weight: 700;
    color: ${THEME.textMuted};
  }
  .cta-fake-btn {
    background: ${THEME.yellow};
    color: ${THEME.navy};
    font-size: 17px;
    font-weight: 900;
    padding: 14px 28px;
    border-radius: 14px;
    box-shadow: 0 4px 0 ${THEME.yellowShadow};
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-dot"></div>
      <span>AEGIS SOLAIRE</span>
    </div>
    <div class="badge-rescert">
      <span>Charte Tiers de Confiance</span>
    </div>
  </div>

  <div class="headline-group">
    <div class="eyebrow">Protection des Particuliers Wallons</div>
    <h1 class="main-title">
      Stop au démarchage agressif et aux <br>
      <span class="highlight">devis solaires gonflés à 15.000 €</span>
    </h1>
  </div>

  <div class="comparison-table">
    <div class="table-row">
      <div class="col-danger">
        <div class="col-header">✕ Démarcheurs Téléphoniques</div>
        <div class="col-body">Appels insistants, promesses mensongères de « panneaux 100% gratuits », commissions cachées.</div>
      </div>
      <div class="col-safe">
        <div class="col-header">✓ Aegis Solaire (Comparateur)</div>
        <div class="col-body">Zéro appel intrusif. Vos coordonnées protégées et transmises uniquement à 3 pros certifiés max.</div>
      </div>
    </div>
    <div class="table-row">
      <div class="col-danger">
        <div class="col-header">✕ Devis Opaque & Surdimensionné</div>
        <div class="col-body">Matériel non spécifié, sous-traitants non déclarés, tarif gonflé de 20 à 35 % pour payer les téléprospecteurs.</div>
      </div>
      <div class="col-safe">
        <div class="col-header">✓ Artisans 100 % Agréés RESCERT</div>
        <div class="col-body">Entreprises locales de votre province, dimensionnement RGIE certifié, prix directs sans intermédiaire.</div>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <span class="footer-trust">100 % gratuit · Sans engagement · Jusqu'à 3 devis comparatifs sous 48 h</span>
    <span class="cta-fake-btn">Lancer ma comparaison →</span>
  </div>
</body>
</html>`;
}

function renderAngle3Html(aspectRatio = '1:1') {
  const isVertical = aspectRatio === '4:5';
  const height = isVertical ? 1350 : 1080;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body {
    width: 1080px;
    height: ${height}px;
    background: ${THEME.bg};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: ${isVertical ? '70px 65px' : '55px 60px'};
    color: ${THEME.navy};
    overflow: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    font-size: 28px;
    font-weight: 900;
    color: ${THEME.navy};
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-dot {
    width: 14px;
    height: 14px;
    background: ${THEME.yellow};
    border-radius: 50%;
  }
  .badge-rescert {
    background: ${THEME.emeraldBg};
    border: 2px solid ${THEME.emeraldBorder};
    color: ${THEME.emerald};
    font-weight: 800;
    font-size: 15px;
    padding: 8px 18px;
    border-radius: 999px;
  }
  .headline-group {
    margin-top: ${isVertical ? '35px' : '20px'};
  }
  .eyebrow {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #D97706;
    margin-bottom: 12px;
  }
  .main-title {
    font-size: ${isVertical ? '48px' : '42px'};
    font-weight: 900;
    line-height: 1.15;
    letter-spacing: -1px;
    color: ${THEME.navy};
  }
  .main-title .highlight {
    background: ${THEME.yellow};
    padding: 2px 8px;
    border-radius: 6px;
  }
  .price-table {
    background: #FFFFFF;
    border: 2px solid ${THEME.border};
    border-radius: 28px;
    padding: ${isVertical ? '35px' : '28px'};
    box-shadow: 0 20px 40px rgba(0, 42, 69, 0.08);
    margin-top: ${isVertical ? '35px' : '20px'};
  }
  .table-subtitle {
    font-size: 16px;
    font-weight: 800;
    color: ${THEME.textMuted};
    margin-bottom: 18px;
  }
  .offer-row {
    display: grid;
    grid-template-columns: 1.8fr 1fr 1fr;
    align-items: center;
    padding: 16px 20px;
    border-radius: 16px;
    margin-bottom: 10px;
  }
  .offer-row.commercial {
    background: #F8FAFC;
    border: 1.5px solid ${THEME.border};
  }
  .offer-row.aegis {
    background: #F0FDF4;
    border: 2px solid #86EFAC;
  }
  .offer-name {
    font-size: 17px;
    font-weight: 800;
    color: ${THEME.navy};
  }
  .offer-spec {
    font-size: 14px;
    font-weight: 600;
    color: ${THEME.textMuted};
  }
  .offer-price {
    font-size: 26px;
    font-weight: 900;
    text-align: right;
    color: ${THEME.navy};
  }
  .offer-price.winner {
    color: ${THEME.emerald};
  }
  .gap-banner {
    margin-top: 18px;
    background: ${THEME.navy};
    color: #FFFFFF;
    border-radius: 16px;
    padding: 18px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .gap-text {
    font-size: 15px;
    font-weight: 700;
  }
  .gap-val {
    font-size: 30px;
    font-weight: 900;
    color: ${THEME.yellow};
  }
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: ${isVertical ? '35px' : '20px'};
    padding-top: 15px;
    border-top: 1.5px solid #CBD5E1;
  }
  .footer-trust {
    font-size: 15px;
    font-weight: 700;
    color: ${THEME.textMuted};
  }
  .cta-fake-btn {
    background: ${THEME.yellow};
    color: ${THEME.navy};
    font-size: 17px;
    font-weight: 900;
    padding: 14px 28px;
    border-radius: 14px;
    box-shadow: 0 4px 0 ${THEME.yellowShadow};
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-dot"></div>
      <span>AEGIS SOLAIRE</span>
    </div>
    <div class="badge-rescert">
      <span>Audit Prix Réel Wallonie</span>
    </div>
  </div>

  <div class="headline-group">
    <div class="eyebrow">Comparatif Prix Moyen Constaté</div>
    <h1 class="main-title">
      Jusqu'à <span class="highlight">1.850 € d'écart</span> sur la même <br>
      installation solaire en Wallonie
    </h1>
  </div>

  <div class="price-table">
    <div class="table-subtitle">Exemple réel : Toiture 5,2 kWc (12 panneaux + onduleur hybride)</div>

    <div class="offer-row commercial">
      <div>
        <div class="offer-name">Devis Franchise Commerciale</div>
        <div class="offer-spec">Téléprospection & gros frais marketing</div>
      </div>
      <div class="offer-spec">Garantie 25 ans</div>
      <div class="offer-price">10.750 €</div>
    </div>

    <div class="offer-row aegis">
      <div>
        <div class="offer-name">Devis Artisan Agréé RESCERT</div>
        <div class="offer-spec">Mise en concurrence via Aegis Solaire</div>
      </div>
      <div class="offer-spec">Garantie 25 ans</div>
      <div class="offer-price winner">8.900 €</div>
    </div>

    <div class="gap-banner">
      <span class="gap-text">Économie brute réalisée à matériel et garanties strictement identiques :</span>
      <span class="gap-val">1.850 € TTC</span>
    </div>
  </div>

  <div class="footer-bar">
    <span class="footer-trust">Simulation impartiale en 45 s · 100 % gratuit · Sans engagement</span>
    <span class="cta-fake-btn">Comparer mes devis →</span>
  </div>
</body>
</html>`;
}

function renderCarouselCard(cardIndex) {
  const cards = [
    {
      num: 'MYTHE 01 / 03',
      title: '« Le solaire n\'est plus rentable avec le compteur communicant »',
      verdict: 'FAUX',
      explanation: 'Avec une batterie bien calibrée, votre taux d\'autoconsommation passe de 30 % à plus de 74 %. L\'économie annuelle atteint 1.480 €/an en Wallonie.',
      action: 'Glissez pour le mythe #2 →',
    },
    {
      num: 'MYTHE 02 / 03',
      title: '« Les panneaux sont 100 % financés par la Région Wallonne »',
      verdict: 'ARNAQUE ILLÉGALE',
      explanation: 'Aucune aide d\'État ne rend une installation "gratuite". Les démarcheurs utilisent ce prétexte pour vendre des installations surfacturées à 15.000 €.',
      action: 'Glissez pour le conseil #3 →',
    },
    {
      num: 'CONSEIL 03 / 03',
      title: '« Pourquoi faut-il toujours mettre en concurrence 3 artisans ? »',
      verdict: '1.850 € D\'ÉCONOMIE',
      explanation: 'À puissance et garanties identiques, l\'écart moyen entre 3 installateurs certifiés RESCERT atteint 1.850 € en Wallonie. Ne signez jamais le 1er devis.',
      action: 'Simulez gratuitement en 45 s sur Aegis Solaire',
    },
  ];

  const c = cards[cardIndex];

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body {
    width: 1080px;
    height: 1080px;
    background: ${THEME.bg};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px;
    color: ${THEME.navy};
    overflow: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand {
    font-size: 26px;
    font-weight: 900;
    color: ${THEME.navy};
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-dot {
    width: 14px;
    height: 14px;
    background: ${THEME.yellow};
    border-radius: 50%;
  }
  .badge-rescert {
    background: ${THEME.navy};
    color: #FFFFFF;
    font-weight: 800;
    font-size: 15px;
    padding: 8px 18px;
    border-radius: 999px;
  }
  .card-main {
    background: #FFFFFF;
    border: 2px solid ${THEME.border};
    border-radius: 28px;
    padding: 45px;
    box-shadow: 0 20px 40px rgba(0, 42, 69, 0.08);
  }
  .card-num {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #D97706;
    margin-bottom: 18px;
  }
  .card-question {
    font-size: 38px;
    font-weight: 900;
    line-height: 1.2;
    color: ${THEME.navy};
    margin-bottom: 24px;
  }
  .verdict-tag {
    display: inline-block;
    background: ${cardIndex === 1 ? '#FEE2E2' : '#FEF3C7'};
    color: ${cardIndex === 1 ? '#DC2626' : '#B45309'};
    font-size: 18px;
    font-weight: 900;
    padding: 8px 18px;
    border-radius: 10px;
    margin-bottom: 20px;
  }
  .card-explanation {
    font-size: 22px;
    font-weight: 600;
    color: #334155;
    line-height: 1.45;
  }
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 15px;
    border-top: 1.5px solid #CBD5E1;
  }
  .footer-sub {
    font-size: 16px;
    font-weight: 700;
    color: ${THEME.textMuted};
  }
  .footer-action {
    font-size: 18px;
    font-weight: 900;
    color: ${THEME.navy};
    background: ${THEME.yellow};
    padding: 12px 24px;
    border-radius: 12px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-dot"></div>
      <span>AEGIS SOLAIRE</span>
    </div>
    <div class="badge-rescert">
      <span>Le Vrai / Faux du Solaire Wallon</span>
    </div>
  </div>

  <div class="card-main">
    <div class="card-num">${c.num}</div>
    <div class="card-question">${c.title}</div>
    <div class="verdict-tag">VÉRITÉ : ${c.verdict}</div>
    <div class="card-explanation">${c.explanation}</div>
  </div>

  <div class="footer-bar">
    <span class="footer-sub">Comparateur 100 % Indépendant · Wallonie</span>
    <span class="footer-action">${c.action}</span>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('Lancement de Playwright pour génération des créatifs haute résolution...');
  const browser = await chromium.launch();

  const tasks = [
    { name: 'ad_angle1_rentabilite_1080x1080.png', html: renderAngle1Html('1:1'), width: 1080, height: 1080 },
    { name: 'ad_angle1_rentabilite_1080x1350.png', html: renderAngle1Html('4:5'), width: 1080, height: 1350 },
    { name: 'ad_angle1_batterie_1080x1080.png', html: renderAngle1Html('1:1'), width: 1080, height: 1080 },
    { name: 'ad_angle1_batterie_1080x1350.png', html: renderAngle1Html('4:5'), width: 1080, height: 1350 },
    { name: 'ad_angle2_rescert_1080x1080.png', html: renderAngle2Html('1:1'), width: 1080, height: 1080 },
    { name: 'ad_angle2_rescert_1080x1350.png', html: renderAngle2Html('4:5'), width: 1080, height: 1350 },
    { name: 'ad_angle3_ecart1850_1080x1080.png', html: renderAngle3Html('1:1'), width: 1080, height: 1080 },
    { name: 'ad_angle3_ecart1850_1080x1350.png', html: renderAngle3Html('4:5'), width: 1080, height: 1350 },
    { name: 'carrousel_carte1_1080x1080.png', html: renderCarouselCard(0), width: 1080, height: 1080 },
    { name: 'carrousel_carte2_1080x1080.png', html: renderCarouselCard(1), width: 1080, height: 1080 },
    { name: 'carrousel_carte3_1080x1080.png', html: renderCarouselCard(2), width: 1080, height: 1080 },
  ];

  for (const t of tasks) {
    const page = await browser.newPage({ viewport: { width: t.width, height: t.height } });
    await page.setContent(t.html, { waitUntil: 'networkidle' });
    const outPath = path.join(OUT_DIR, t.name);
    await page.screenshot({ path: outPath });
    console.log(`✓ Généré : ${t.name} (${t.width}x${t.height})`);
    await page.close();
  }

  await browser.close();
  console.log(`\nTous les créatifs ont été générés avec succès dans : ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Erreur génération créatifs:', err);
  process.exit(1);
});
