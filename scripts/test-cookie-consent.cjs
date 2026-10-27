// Run against the dev server with test-only tracking IDs; all external requests are aborted.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const requests = []
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.hostname === '127.0.0.1') return route.continue()
      requests.push(url.hostname)
      return route.abort()
    })
    const advertising = () => requests.filter(host => /facebook|googletagmanager/.test(host))
    await page.goto('http://127.0.0.1:3101/')
    await page.getByRole('button', { name: 'Continuer sans accepter' }).waitFor()
    await page.waitForTimeout(500)
    assert.equal(advertising().length, 0, 'No tracking before a choice')
    await page.getByRole('button', { name: 'Continuer sans accepter' }).click()
    await page.reload()
    await page.getByRole('button', { name: 'Gérer mes cookies' }).waitFor()
    assert.equal(advertising().length, 0, 'Refusal persists across reload')
    await page.getByRole('button', { name: 'Gérer mes cookies' }).click()
    await page.getByRole('button', { name: 'Accepter', exact: true }).click()
    await page.waitForFunction(() => !!window.fbq && !!window.dataLayer)
    await page.waitForTimeout(500)
    assert(advertising().includes('connect.facebook.net'), 'Meta loaded only after consent')
    assert(advertising().includes('www.googletagmanager.com'), 'Google loaded only after consent')
    await page.getByRole('button', { name: 'Gérer mes cookies' }).click()
    requests.length = 0
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Continuer sans accepter' }).click(),
    ])
    await page.getByRole('button', { name: 'Gérer mes cookies' }).waitFor()
    await page.waitForTimeout(500)
    assert.equal(advertising().length, 0, 'Withdrawal unloads SDKs and blocks new loads')
    assert.equal(await page.evaluate(() => typeof window.fbq), 'undefined')
    for (const route of ['/api/admin/stats', '/api/partners/credits']) {
      assert.equal((await page.request.get(`http://127.0.0.1:3101${route}`)).status(), 401)
    }
    await page.goto('http://127.0.0.1:3101/particuliers')
    assert.equal((await page.title()).match(/Aegis Solaire/g)?.length, 1)
    console.log('PASS: default/refused/granted/withdrawn consent, anonymous dev API denial, SEO title')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
