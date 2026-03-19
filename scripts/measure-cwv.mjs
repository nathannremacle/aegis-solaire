import { chromium } from "playwright"

const url = process.argv[2] || "http://localhost:3000/"

function formatMs(value) {
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

async function measureForViewport(browser, viewport, name) {
  const page = await browser.newPage({ viewport })

  await page.addInitScript(() => {
    window.__cwv = {
      lcp: 0,
      cls: 0,
      _lastShiftTime: null,
      _sessionWindowValue: 0,
      _maxSessionWindowValue: 0,
    }

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "largest-contentful-paint") {
            window.__cwv.lcp = entry.startTime
          }
        }
      })
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })
    } catch {
      // no-op
    }

    // CLS
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType !== "layout-shift") continue
          if (entry.hadRecentInput) continue

          const ts = entry.startTime
          const value = entry.value

          if (window.__cwv._lastShiftTime === null) {
            window.__cwv._sessionWindowValue = value
          } else if (ts - window.__cwv._lastShiftTime <= 1000) {
            window.__cwv._sessionWindowValue += value
          } else {
            window.__cwv._sessionWindowValue = value
          }

          window.__cwv._lastShiftTime = ts
          window.__cwv._maxSessionWindowValue = Math.max(window.__cwv._maxSessionWindowValue, window.__cwv._sessionWindowValue)
          window.__cwv.cls = window.__cwv._maxSessionWindowValue
        }
      })
      clsObserver.observe({ type: "layout-shift", buffered: true })
    } catch {
      // no-op
    }
  })

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 })

  // LCP/CLS peuvent se produire après "networkidle" (polices, images héro, etc.)
  await page.waitForTimeout(5000)

  const cwv = await page.evaluate(() => {
    const w = window.__cwv
    return { lcp: w.lcp, cls: w.cls }
  })

  console.log(`${name}:`, {
    LCP_ms: formatMs(cwv.lcp),
    CLS: cwv.cls,
  })

  await page.close()
  return cwv
}

async function main() {
  const browser = await chromium.launch()

  const desktop = { width: 1366, height: 768 }
  const mobile = { width: 390, height: 844 }

  await measureForViewport(browser, desktop, "desktop")
  await measureForViewport(browser, mobile, "mobile")

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

