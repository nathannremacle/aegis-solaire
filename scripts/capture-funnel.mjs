import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1120 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3001/devis-panneaux-solaires...');
  await page.goto('http://localhost:3001/devis-panneaux-solaires', { waitUntil: 'networkidle' });

  // Dismiss cookie banner if visible
  try {
    const cookieBtn = page.locator('aside[aria-label*="cookie" i] button, button:has-text("Accepter")').first();
    if (await cookieBtn.isVisible({ timeout: 1500 })) {
      await cookieBtn.click();
      console.log('Cookie banner dismissed');
      await page.waitForTimeout(300);
    }
  } catch {}

  // Étape 1 : Choix consommation (4000-5000 kWh)
  console.log('Step 1: Selecting consumption...');
  await page.locator('button:has-text("4.000 – 5.000 kWh")').click();
  await page.waitForTimeout(400);

  // Étape 2 : Type de bien
  console.log('Step 2: Selecting property...');
  await page.locator('button:has-text("Maison individuelle")').click();
  await page.waitForTimeout(400);

  // Étape 3 : Propriétaire
  console.log('Step 3: Selecting owner...');
  await page.locator('button:has-text("Oui, je suis propriétaire")').click();
  await page.waitForTimeout(400);

  // Étape 4 : Toiture (déjà pré-sélectionné "tuiles" et "30–60 m²")
  console.log('Step 4: Clicking Suivant...');
  await page.locator('button:has-text("Suivant")').click();
  await page.waitForTimeout(400);

  // Étape 5 : Localisation
  console.log('Step 5: Filling postal code and city...');
  await page.locator('#postalCode').fill('4000');
  await page.locator('#city').fill('Liège');
  await page.waitForTimeout(300);

  // Screenshot Step 5 rempli
  await page.screenshot({ path: 'C:/Users/mrnat/.gemini/antigravity/brain/c2df3e59-7f6d-4c28-ae07-0330519beba3/localhost_step5_localisation.png' });
  console.log('Saved localhost_step5_localisation.png');

  // Clic sur Suivant -> DÉCLENCHE L'INTERSTITIEL DE MISE EN CONCURRENCE
  console.log('Clicking Suivant to start 3000ms Interstitial...');
  await page.locator('button:has-text("Suivant")').click();

  // Capture t = ~0.6s
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/mrnat/.gemini/antigravity/brain/c2df3e59-7f6d-4c28-ae07-0330519beba3/localhost_interstitial_phase1.png' });
  console.log('Saved localhost_interstitial_phase1.png');

  // Capture t = ~1.9s (Animation complète avec bouton Continuer actif)
  await page.waitForTimeout(1300);
  await page.screenshot({ path: 'C:/Users/mrnat/.gemini/antigravity/brain/c2df3e59-7f6d-4c28-ae07-0330519beba3/localhost_interstitial_phase2.png' });
  console.log('Saved localhost_interstitial_phase2.png');

  // Clic sur le bouton utilisateur "Continuer vers mes 3 devis comparatifs"
  console.log('Clicking "Continuer vers mes 3 devis comparatifs"...');
  const continueBtn = page.locator('button:has-text("Continuer vers mes 3 devis comparatifs")');
  await continueBtn.waitFor({ state: 'visible' });
  await continueBtn.click();
  await page.waitForTimeout(500);

  // Capture Étape 6
  await page.screenshot({ path: 'C:/Users/mrnat/.gemini/antigravity/brain/c2df3e59-7f6d-4c28-ae07-0330519beba3/localhost_step6_contact.png' });
  console.log('Saved localhost_step6_contact.png');

  // Ouvrir la modale réseau RESCert
  const modalBtn = page.locator('button:has-text("Consulter les critères et partenaires du réseau")');
  if (await modalBtn.isVisible()) {
    await modalBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'C:/Users/mrnat/.gemini/antigravity/brain/c2df3e59-7f6d-4c28-ae07-0330519beba3/localhost_network_modal.png' });
    console.log('Saved localhost_network_modal.png');
  }

  // Également une version Mobile (390x844 iPhone 14) pour montrer le rendu Meta in-app
  console.log('Generating Mobile Meta in-app preview...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3001/devis-panneaux-solaires', { waitUntil: 'networkidle' });

  try {
    const mCookie = mobilePage.locator('aside[aria-label*="cookie" i] button, button:has-text("Accepter")').first();
    if (await mCookie.isVisible({ timeout: 1500 })) {
      await mCookie.click();
      await mobilePage.waitForTimeout(300);
    }
  } catch {}

  // Quick navigation sur mobile
  await mobilePage.locator('button:has-text("4.000 – 5.000 kWh")').click();
  await mobilePage.waitForTimeout(300);
  await mobilePage.locator('button:has-text("Maison individuelle")').click();
  await mobilePage.waitForTimeout(300);
  await mobilePage.locator('button:has-text("Oui, je suis propriétaire")').click();
  await mobilePage.waitForTimeout(300);
  await mobilePage.locator('button:has-text("Suivant")').click();
  await mobilePage.waitForTimeout(300);
  await mobilePage.locator('#postalCode').fill('4000');
  await mobilePage.locator('#city').fill('Liège');
  await mobilePage.locator('button:has-text("Suivant")').click();

  // Capture mobile pendant l'interstitiel avec bouton actif
  await mobilePage.waitForTimeout(2000);
  await mobilePage.evaluate(() => {
    window.scrollBy({ top: 180, behavior: 'instant' });
  });
  await mobilePage.screenshot({ path: 'C:/Users/mrnat/.gemini/antigravity/brain/c2df3e59-7f6d-4c28-ae07-0330519beba3/localhost_mobile_interstitial.png' });
  console.log('Saved localhost_mobile_interstitial.png');

  // Clic sur le bouton Continuer sur mobile
  const mContinueBtn = mobilePage.locator('button:has-text("Continuer vers mes 3 devis comparatifs")');
  await mContinueBtn.waitFor({ state: 'visible' });
  await mContinueBtn.click();
  await mobilePage.waitForTimeout(500);

  // Capture Step 6 sur mobile
  await mobilePage.screenshot({ path: 'C:/Users/mrnat/.gemini/antigravity/brain/c2df3e59-7f6d-4c28-ae07-0330519beba3/localhost_mobile_step6.png' });
  console.log('Saved localhost_mobile_step6.png');

  await browser.close();
  console.log('All localhost renders finished successfully!');
}

run().catch((err) => {
  console.error('Error during run:', err);
  process.exit(1);
});
