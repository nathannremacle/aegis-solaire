#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { chromium } from "playwright"

const args = process.argv.slice(2)
const urlArg = args.find((a) => a.startsWith("--url="))?.split("=")[1]
const screenshotsArg = args.find((a) => a.startsWith("--screenshots="))?.split("=")[1]

const BASE_URL = (urlArg || process.env.MOBILE_TEST_URL || "http://localhost:3001").replace(/\/$/, "")
const SCREENSHOT_DIR = screenshotsArg ? path.resolve(screenshotsArg) : null

if (SCREENSHOT_DIR) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

const SMARTPHONE_VIEWPORTS = [
  { name: "320x568-se1", width: 320, height: 568 },
  { name: "360x800-android", width: 360, height: 800 },
  { name: "375x667-se", width: 375, height: 667 },
  { name: "390x844-iphone14", width: 390, height: 844 },
  { name: "412x915-pixel", width: 412, height: 915 },
  { name: "430x932-promax", width: 430, height: 932 },
]

const DESKTOP_VIEWPORT = { name: "1440x900-desktop", width: 1440, height: 900 }

const results = []
const failures = []

function recordPass(name, detail = "") {
  results.push({ ok: true, name, detail })
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`)
}

function recordFail(name, detail) {
  results.push({ ok: false, name, detail })
  failures.push({ name, detail })
  console.error(`FAIL  ${name} — ${detail}`)
}

function assertCondition(condition, name, detail) {
  if (condition) {
    recordPass(name, detail)
  } else {
    recordFail(name, detail)
  }
}

async function saveScreenshot(page, filename) {
  if (!SCREENSHOT_DIR) return
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false })
}

async function setupContext(browser, viewport, { dismissTours = true } = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.width < 768,
    isMobile: viewport.width < 768,
    deviceScaleFactor: viewport.width < 768 ? 2 : 1,
  })

  await context.route("**/*", (route) => {
    const reqUrl = route.request().url()
    if (
      /facebook\.net|connect\.facebook\.net|facebook\.com\/tr|vercel-insights|googletagmanager|google-analytics|doubleclick/i.test(
        reqUrl
      )
    ) {
      return route.abort()
    }
    return route.continue()
  })

  if (dismissTours) {
    await context.addInitScript(() => {
      try {
        localStorage.setItem("aegis_marketplace_tour_dismissed_v1", "true")
        localStorage.setItem("aegis_crm_tour_dismissed_v1", "true")
      } catch {
        /* ignore */
      }
    })
  } else {
    await context.addInitScript(() => {
      try {
        localStorage.removeItem("aegis_marketplace_tour_dismissed_v1")
      } catch {
        /* ignore */
      }
    })
  }

  const page = await context.newPage()
  const runtimeErrors = []
  page.on("pageerror", (err) => runtimeErrors.push(`pageerror: ${err.message}`))
  page.on("response", (res) => {
    if (res.status() >= 500) {
      runtimeErrors.push(`http_${res.status()}: ${res.url()}`)
    }
  })
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text()
      // Ignore abort noise from blocked external analytics, external OSM tiles, and expected dev-mock 401 on unauthenticated partner APIs
      if (/ERR_FAILED|Failed to load resource: net::ERR_FAILED/i.test(txt)) return
      if (/Failed to load resource: the server responded with a status of 401/i.test(txt)) return
      if (/openstreetmap|facebook/i.test(txt)) return
      runtimeErrors.push(`console.error: ${txt}`)
    }
  })

  return { context, page, runtimeErrors }
}

async function waitForDialogSettled(page) {
  const dlg = page.locator('[role="dialog"]').last()
  await dlg.waitFor({ state: "visible", timeout: 10000 })
  await page.waitForFunction(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
    const last = dialogs[dialogs.length - 1]
    if (!last) return false
    const inner = last.firstElementChild || last
    const stOuter = window.getComputedStyle(last)
    const stInner = window.getComputedStyle(inner)
    return parseFloat(stOuter.opacity) >= 0.99 && parseFloat(stInner.opacity) >= 0.99
  }, null, { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(260)
  return dlg
}

async function waitForDashboardReady(page) {
  await page.waitForSelector("header", { state: "visible", timeout: 15000 })
  await page.waitForTimeout(350)
}

async function auditNoHorizontalOverflow(page, label) {
  const data = await page.evaluate(() => {
    const innerWidth = window.innerWidth
    const docScrollWidth = document.documentElement.scrollWidth
    const overflowing = []

    const isInsideHorizontalScroller = (el) => {
      let cur = el.parentElement
      while (cur && cur !== document.body) {
        const st = window.getComputedStyle(cur)
        if (st.overflowX === "auto" || st.overflowX === "scroll") {
          return true
        }
        cur = cur.parentElement
      }
      return false
    }

    const isClippedByOverflowHiddenAncestor = (el, rect) => {
      let cur = el.parentElement
      while (cur && cur !== document.body) {
        const st = window.getComputedStyle(cur)
        if (st.overflowX === "hidden" || st.overflow === "hidden") {
          const parentRect = cur.getBoundingClientRect()
          if (parentRect.right <= innerWidth + 2 && parentRect.left >= -2) {
            return true
          }
        }
        cur = cur.parentElement
      }
      return false
    }

    const all = Array.from(document.querySelectorAll("*"))
    for (const el of all) {
      if (el.closest("nextjs-portal")) continue
      const tag = el.tagName.toLowerCase()
      if (tag === "svg" || el.closest("svg")) continue
      const st = window.getComputedStyle(el)
      if (st.display === "none" || st.visibility === "hidden" || parseFloat(st.opacity) === 0) continue

      const rect = el.getBoundingClientRect()
      if (rect.width <= 0.5 || rect.height <= 0.5) continue
      if (rect.right <= 0 || rect.bottom < 0 || rect.top > window.innerHeight * 6) continue

      if (isInsideHorizontalScroller(el)) continue
      if (rect.right > innerWidth + 2.5 || rect.left < -2.5) {
        if (isClippedByOverflowHiddenAncestor(el, rect)) continue
        overflowing.push({
          tag,
          cls: typeof el.className === "string" ? el.className.slice(0, 80) : "",
          text: (el.textContent || "").trim().slice(0, 50),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          innerWidth,
        })
      }
    }

    return {
      innerWidth,
      docScrollWidth,
      overflowing: overflowing.slice(0, 8),
    }
  })

  const ok = data.docScrollWidth <= data.innerWidth + 1 && data.overflowing.length === 0
  assertCondition(
    ok,
    `${label} :: no horizontal overflow`,
    ok
      ? `scrollWidth=${data.docScrollWidth}/${data.innerWidth}`
      : `scrollWidth=${data.docScrollWidth}/${data.innerWidth}, elems=${JSON.stringify(data.overflowing)}`
  )
}

async function auditCardsAndAboveTheFold(page, label, viewport, { isPublicPreview = false } = {}) {
  const isMobile = viewport.width < 768
  const report = await page.evaluate(
    ({ isMobileView, isPreview }) => {
      const h1s = Array.from(document.querySelectorAll("h1")).filter((el) => {
        const st = window.getComputedStyle(el)
        return st.display !== "none" && st.visibility !== "hidden"
      })
      const cards = Array.from(document.querySelectorAll('[id^="lead-"]'))
      const firstLeadRect = cards[0]?.getBoundingClientRect() || null

      const badBadges = []
      const lowercaseKwc = []
      const smallCtas = []
      const desktopRowTops = []

      cards.slice(0, 4).forEach((card, idx) => {
        const cardRect = card.getBoundingClientRect()
        if (idx < 3) desktopRowTops.push(Math.round(cardRect.top))

        // Top overlay row badges inside card photo
        const photoBox = card.querySelector("div.relative.overflow-hidden")
        if (photoBox) {
          const topBadgeRow = Array.from(photoBox.children).find((c) =>
            typeof c.className === "string" && c.className.includes("top-")
          )
          if (topBadgeRow) {
            const spans = Array.from(topBadgeRow.children).filter(
              (child) => window.getComputedStyle(child).display !== "none"
            )
            for (const sp of spans) {
              const r = sp.getBoundingClientRect()
              if (r.height > 36) {
                badBadges.push({ idx, reason: `height=${Math.round(r.height)}`, text: sp.textContent?.trim() })
              }
            }
            if (spans.length === 2) {
              const r0 = spans[0].getBoundingClientRect()
              const r1 = spans[1].getBoundingClientRect()
              if (r0.right > r1.left + 1) {
                badBadges.push({
                  idx,
                  reason: `collision r0.right=${Math.round(r0.right)} > r1.left=${Math.round(r1.left)}`,
                })
              }
            }
          }
        }

        // Check kWc casing + CSS text-transform
        const kwcSpans = Array.from(card.querySelectorAll("span")).filter(
          (s) => s.textContent && s.textContent.trim().toLowerCase() === "kwc"
        )
        for (const ks of kwcSpans) {
          const tt = window.getComputedStyle(ks).textTransform
          if (tt === "lowercase" || ks.textContent?.trim() === "kwc") {
            lowercaseKwc.push({ idx, text: ks.textContent?.trim(), textTransform: tt })
          }
        }

        // Check mobile primary action button heights inside card footer
        if (isMobileView) {
          const footerButtons = Array.from(card.querySelectorAll("button"))
          for (const btn of footerButtons) {
            const st = window.getComputedStyle(btn)
            if (st.display === "none") continue
            const txt = (btn.textContent || "").trim()
            if (/Débloquer|Payer|Compléter|Inspecter/i.test(txt)) {
              const r = btn.getBoundingClientRect()
              const minRequired = txt === "Inspecter" ? 36 : 38
              if (r.height > 0 && r.height < minRequired) {
                smallCtas.push({ idx, txt, height: Math.round(r.height) })
              }
            }
          }
        }
      })

      return {
        visibleH1Count: h1s.length,
        cardCount: cards.length,
        firstLeadTop: firstLeadRect ? Math.round(firstLeadRect.top) : null,
        badBadges,
        lowercaseKwc,
        smallCtas,
        desktopRowTops,
        isPreview,
      }
    },
    { isMobileView: isMobile, isPreview: isPublicPreview }
  )

  assertCondition(report.visibleH1Count === 1, `${label} :: unique visible h1`, `count=${report.visibleH1Count}`)
  assertCondition(report.cardCount > 0, `${label} :: cards present`, `count=${report.cardCount}`)

  if (isMobile && !isPublicPreview && viewport.width >= 360) {
    assertCondition(
      report.firstLeadTop !== null && report.firstLeadTop <= 315,
      `${label} :: first lead visible above the fold`,
      `firstLeadTop=${report.firstLeadTop}px (limit <= 315px)`
    )
  }

  assertCondition(
    report.badBadges.length === 0,
    `${label} :: mono-line non-overlapping card photo badges`,
    report.badBadges.length === 0 ? "all clean" : JSON.stringify(report.badBadges)
  )
  assertCondition(
    report.lowercaseKwc.length === 0,
    `${label} :: proper kWc casing`,
    report.lowercaseKwc.length === 0 ? "all kWc" : JSON.stringify(report.lowercaseKwc)
  )

  if (isMobile) {
    assertCondition(
      report.smallCtas.length === 0,
      `${label} :: touch-friendly card CTA height`,
      report.smallCtas.length === 0 ? "all >= 36-42px" : JSON.stringify(report.smallCtas)
    )
  } else if (!isPublicPreview && report.desktopRowTops.length >= 2) {
    assertCondition(
      Math.abs(report.desktopRowTops[0] - report.desktopRowTops[1]) <= 4,
      `${label} :: desktop multi-column grid preserved`,
      `rowTops=${JSON.stringify(report.desktopRowTops)}`
    )
  }
}

async function auditLeadDrawer(page, label, viewport) {
  const firstCard = page.locator('[id^="lead-"]').first()
  await firstCard.scrollIntoViewIfNeeded()
  await firstCard.click()
  const dialog = await waitForDialogSettled(page)

  await auditNoHorizontalOverflow(page, `${label} Drawer`)

  const metrics = await page.evaluate((vh) => {
    const dlg = Array.from(document.querySelectorAll('[role="dialog"]')).pop()
    if (!dlg) return null
    const scrollArea = dlg.querySelector("div.flex-1.overflow-y-auto")
    const scrollRect = scrollArea?.getBoundingClientRect()
    const scrollRatio = scrollRect ? scrollRect.height / vh : 0

    // Check Photo gallery appears BEFORE Radar map in DOM/vertical flow
    const txt = dlg.textContent || ""
    const photoIdx = txt.search(/Visuel|Photo|Modélisation 3D/i)
    const radarIdx = txt.search(/Radar|Zone d'intervention/i)

    // Check Expert button doesn't overflow dialog
    const expertBtn = Array.from(dlg.querySelectorAll("button")).find((b) =>
      /expert/i.test(b.textContent || "")
    )
    const dlgRect = dlg.getBoundingClientRect()
    const expertRect = expertBtn?.getBoundingClientRect()
    const expertFits = !expertRect || expertRect.right <= dlgRect.right + 1

    return {
      scrollHeight: scrollRect ? Math.round(scrollRect.height) : 0,
      scrollRatio: Number(scrollRatio.toFixed(2)),
      photoBeforeRadar: photoIdx !== -1 && radarIdx !== -1 ? photoIdx < radarIdx : true,
      expertFits,
    }
  }, viewport.height)

  assertCondition(
    Boolean(metrics && metrics.scrollRatio >= 0.45),
    `${label} Drawer :: comfortable scrollable height`,
    `ratio=${metrics?.scrollRatio} (${metrics?.scrollHeight}px / ${viewport.height}px)`
  )
  assertCondition(
    Boolean(metrics?.photoBeforeRadar),
    `${label} Drawer :: roof photos placed before radar map`,
    `photoBeforeRadar=${metrics?.photoBeforeRadar}`
  )
  assertCondition(
    Boolean(metrics?.expertFits),
    `${label} Drawer :: expert button fits width`,
    `expertFits=${metrics?.expertFits}`
  )

  if (SCREENSHOT_DIR && (viewport.width === 360 || viewport.width === 320)) {
    await saveScreenshot(page, `drawer-${viewport.name}.png`)
  }

  // Test DirectLeadPaymentModal trigger from drawer if present
  const directPayBtn = dialog.locator("button", { hasText: /Payer|Régler/i }).first()
  if ((await directPayBtn.count()) > 0 && (await directPayBtn.isVisible())) {
    await directPayBtn.click()
    await waitForDialogSettled(page)
    await auditNoHorizontalOverflow(page, `${label} DirectPayModal`)
    if (SCREENSHOT_DIR && viewport.width === 360) {
      await saveScreenshot(page, `direct-pay-${viewport.name}.png`)
    }
    const closeDirect = page.locator('[role="dialog"]').last().locator('button[aria-label*="Fermer"]').first()
    if ((await closeDirect.count()) > 0) {
      await closeDirect.click()
    } else {
      await page.keyboard.press("Escape")
    }
    await page.waitForTimeout(200)
  }

  // Close DirectPayModal if open, then Drawer
  const closeDirect = page.locator('button[aria-label="Fermer la fenêtre de paiement"]')
  if ((await closeDirect.count()) > 0 && (await closeDirect.isVisible())) {
    await closeDirect.click()
    await page.waitForTimeout(200)
  }

  // Close drawer cleanly and ensure all dialogs closed
  const closeDrawer = dialog.locator('button[aria-label*="Fermer"]').first()
  if ((await closeDrawer.count()) > 0 && (await closeDrawer.isVisible())) {
    await closeDrawer.click()
  } else {
    await page.keyboard.press("Escape")
  }
  await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0, null, { timeout: 5000 }).catch(async () => {
    await page.keyboard.press("Escape")
    await page.waitForTimeout(200)
  })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  console.log(`\nRunning mobile & desktop audit against ${BASE_URL}\n`)

  try {
    // 1. All 6 Smartphone Viewports on Marketplace Dashboard + Drawer
    for (const vp of SMARTPHONE_VIEWPORTS) {
      const { context, page, runtimeErrors } = await setupContext(browser, vp)
      try {
        await page.goto(`${BASE_URL}/partenaires/dashboard`, { waitUntil: "domcontentloaded", timeout: 25000 })
        await waitForDashboardReady(page)

        await auditNoHorizontalOverflow(page, vp.name)
        await auditCardsAndAboveTheFold(page, vp.name, vp)

        if (SCREENSHOT_DIR) {
          await saveScreenshot(page, `dashboard-${vp.name}.png`)
        }

        // Scroll slightly to inspect full lead card footer clearly in 360px / 320px screenshots
        if (SCREENSHOT_DIR && (vp.width === 320 || vp.width === 360 || vp.width === 390)) {
          await page.evaluate(() => {
            document.querySelector('[id^="lead-"]')?.scrollIntoView({ block: "center" })
          })
          await page.waitForTimeout(200)
          await saveScreenshot(page, `lead-card-${vp.name}.png`)
          await page.evaluate(() => window.scrollTo(0, 0))
        }

        if (vp.width === 320 || vp.width === 360) {
          await auditLeadDrawer(page, vp.name, vp)
        }

        // Extra interactive coverage on 360x800 Android and 320x568 SE1
        if (vp.width === 320 || vp.width === 360) {
          // Filter bottom sheet
          const filterBtn = page.locator('button[aria-label="Ouvrir les filtres et le tri"]')
          await filterBtn.click()
          await waitForDialogSettled(page)
          await auditNoHorizontalOverflow(page, `${vp.name} FilterSheet`)
          if (SCREENSHOT_DIR && vp.width === 360) {
            await saveScreenshot(page, `filter-sheet-${vp.name}.png`)
          }
          await page.locator('button[aria-label="Fermer les filtres"]').click()
          await page.waitForTimeout(200)

          // Account menu bottom sheet
          const menuBtn = page.locator('button[aria-label="Menu compte et outils"]')
          await menuBtn.click()
          await waitForDialogSettled(page)
          await auditNoHorizontalOverflow(page, `${vp.name} AccountSheet`)
          if (SCREENSHOT_DIR && vp.width === 360) {
            await saveScreenshot(page, `account-sheet-${vp.name}.png`)
          }

          // Open PartnerReferralModal from Account menu
          await page.locator('button:has-text("Parrainage RESCERT")').click()
          await waitForDialogSettled(page)
          await auditNoHorizontalOverflow(page, `${vp.name} ReferralModal`)
          if (SCREENSHOT_DIR && vp.width === 360) {
            await saveScreenshot(page, `referral-modal-${vp.name}.png`)
          }
          await page.locator('button[aria-label="Fermer la fenêtre de parrainage"]').click()
          await page.waitForTimeout(200)

          // AlertPreferencesModal
          await page.locator('button[aria-label="Alertes et Auto-Pilot"]').click()
          await waitForDialogSettled(page)
          await auditNoHorizontalOverflow(page, `${vp.name} AlertsModal`)
          if (SCREENSHOT_DIR && vp.width === 360) {
            await saveScreenshot(page, `alerts-modal-${vp.name}.png`)
          }
          await page.locator('button[aria-label="Fermer la fenêtre"]').click()
          await page.waitForTimeout(200)

          // CreditPacksModal
          await page.locator('button[aria-label*="crédits, recharger"]').click()
          await waitForDialogSettled(page)
          await auditNoHorizontalOverflow(page, `${vp.name} CreditsModal`)
          if (SCREENSHOT_DIR && vp.width === 360) {
            await saveScreenshot(page, `credits-modal-${vp.name}.png`)
          }
          await page.locator('button[aria-label="Fermer la fenêtre de recharge"]').click()
          await page.waitForTimeout(200)

          // ExpertStudyModal via Bottom Nav
          await page.locator('nav[aria-label="Navigation mobile"] button:has-text("Expert")').click()
          await waitForDialogSettled(page)
          await auditNoHorizontalOverflow(page, `${vp.name} ExpertModal`)
          if (SCREENSHOT_DIR && vp.width === 320) {
            await saveScreenshot(page, `expert-modal-${vp.name}.png`)
          }
          await page.locator('[role="dialog"] button[aria-label="Fermer"]').click()
          await page.waitForTimeout(200)

          // List view on mobile
          await page.locator('button[aria-label="Passer en vue liste dense"]').first().click()
          await page.waitForTimeout(250)
          const hasSwipeHint = (await page.locator('text=Glisser horizontalement').count()) > 0
          assertCondition(!hasSwipeHint, `${vp.name} ListView :: no horizontal swipe table hint`, "native cards rendered")
          await auditNoHorizontalOverflow(page, `${vp.name} ListView`)
          if (SCREENSHOT_DIR && vp.width === 360) {
            await saveScreenshot(page, `list-view-${vp.name}.png`)
          }
          await page.locator('button[aria-label="Passer en vue grille"]').first().click()
          await page.waitForTimeout(200)

          // Focused lead view (?lead=...)
          const firstLeadId = await page.evaluate(() => {
            const el = document.querySelector('[id^="lead-"]')
            return el ? el.id.replace(/^lead-/, "") : null
          })
          if (firstLeadId) {
            await page.goto(`${BASE_URL}/partenaires/dashboard?lead=${encodeURIComponent(firstLeadId)}`, {
              waitUntil: "domcontentloaded",
              timeout: 25000,
            })
            await waitForDashboardReady(page)
            await auditNoHorizontalOverflow(page, `${vp.name} FocusedLead`)
            const stickyBar = page.locator("#focused-unlock-box")
            assertCondition(
              (await stickyBar.count()) > 0,
              `${vp.name} FocusedLead :: unlock box rendered`,
              `lead=${firstLeadId}`
            )
            if (SCREENSHOT_DIR && vp.width === 360) {
              await saveScreenshot(page, `focused-lead-${vp.name}.png`)
            }
          }

          // Mon CRM tab
          await page.goto(`${BASE_URL}/partenaires/dashboard`, { waitUntil: "domcontentloaded", timeout: 25000 })
          await waitForDashboardReady(page)
          await page.locator('nav[aria-label="Navigation mobile"] button:has-text("Mon CRM")').click()
          await page.waitForTimeout(300)
          await auditNoHorizontalOverflow(page, `${vp.name} MonCRM`)
          if (SCREENSHOT_DIR && vp.width === 360) {
            await saveScreenshot(page, `crm-tab-${vp.name}.png`)
          }

          // Credits full page (/partenaires/dashboard/credits)
          await page.goto(`${BASE_URL}/partenaires/dashboard/credits`, {
            waitUntil: "domcontentloaded",
            timeout: 25000,
          })
          await page.waitForTimeout(450)
          await auditNoHorizontalOverflow(page, `${vp.name} CreditsPage`)
          if (SCREENSHOT_DIR && vp.width === 320) {
            await saveScreenshot(page, `credits-page-${vp.name}.png`)
          }

          // Public /partenaires preview
          await page.goto(`${BASE_URL}/partenaires`, { waitUntil: "domcontentloaded", timeout: 25000 })
          await page.waitForTimeout(450)
          await auditNoHorizontalOverflow(page, `${vp.name} PublicPartenaires`)
          if ((await page.locator('[id^="lead-"]').count()) > 0) {
            await auditCardsAndAboveTheFold(page, `${vp.name} PublicPreviewCards`, vp, { isPublicPreview: true })
          }
        }

        assertCondition(
          runtimeErrors.length === 0,
          `${vp.name} :: zero runtime console/page errors`,
          runtimeErrors.length === 0 ? "0 errors" : runtimeErrors.join(" | ")
        )
      } finally {
        await context.close()
      }
    }

    // 2. Tour modal multi-step check at 320x568 and 360x800
    for (const vp of [SMARTPHONE_VIEWPORTS[0], SMARTPHONE_VIEWPORTS[1]]) {
      const { context, page } = await setupContext(browser, vp, { dismissTours: false })
      try {
        await page.goto(`${BASE_URL}/partenaires/dashboard`, { waitUntil: "domcontentloaded", timeout: 25000 })
        await waitForDashboardReady(page)
        const tourDialog = await waitForDialogSettled(page)

        for (let step = 1; step <= 4; step++) {
          await auditNoHorizontalOverflow(page, `${vp.name} TourStep${step}`)
          if (step === 4 && SCREENSHOT_DIR && vp.width === 320) {
            await saveScreenshot(page, `tour-final-${vp.name}.png`)
          }
          const nextBtn = tourDialog.locator("button", { hasText: /Étape suivante/i })
          if ((await nextBtn.count()) > 0 && (await nextBtn.isVisible())) {
            await nextBtn.click()
            await page.waitForTimeout(200)
          }
        }
        await tourDialog.locator('button[aria-label="Fermer le tutoriel"]').click()
      } finally {
        await context.close()
      }
    }

    // 3. Desktop 1440x900 Non-Regression Check
    {
      const { context, page, runtimeErrors } = await setupContext(browser, DESKTOP_VIEWPORT)
      try {
        await page.goto(`${BASE_URL}/partenaires/dashboard`, { waitUntil: "domcontentloaded", timeout: 25000 })
        await waitForDashboardReady(page)

        await auditNoHorizontalOverflow(page, DESKTOP_VIEWPORT.name)
        await auditCardsAndAboveTheFold(page, DESKTOP_VIEWPORT.name, DESKTOP_VIEWPORT)

        const navVisible = await page.locator('header nav[aria-label="Espaces du portail"]').isVisible()
        assertCondition(navVisible, `${DESKTOP_VIEWPORT.name} :: desktop topbar tabs visible`, `visible=${navVisible}`)

        const bottomNavHidden = !(await page.locator('nav[aria-label="Navigation mobile"]').isVisible())
        assertCondition(bottomNavHidden, `${DESKTOP_VIEWPORT.name} :: mobile bottom nav hidden on desktop`, `hidden=${bottomNavHidden}`)

        if (SCREENSHOT_DIR) {
          await saveScreenshot(page, `dashboard-${DESKTOP_VIEWPORT.name}.png`)
        }

        assertCondition(
          runtimeErrors.length === 0,
          `${DESKTOP_VIEWPORT.name} :: zero runtime console/page errors`,
          runtimeErrors.length === 0 ? "0 errors" : runtimeErrors.join(" | ")
        )
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\nSummary: ${results.filter((r) => r.ok).length}/${results.length} checks passed, ${failures.length} failed.`)
  if (failures.length > 0) {
    process.exitCode = 1
  }
}

run().catch((err) => {
  console.error("Fatal error in test-marketplace-mobile.mjs:", err)
  process.exit(1)
})
