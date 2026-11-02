const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')

// Execute the actual handlers with isolated adapters; never contact remote services.
function load(file, mocks = {}, env = {}, globals = {}) {
  const context = { exports: {}, console: { ...console, warn() {}, error() {} },
    process: { env }, ...globals,
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : (name.startsWith('@/') ? load(name.slice(2) + '.ts', mocks, env, globals) : require(name)) }
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, context)
  return context.exports
}
const responseMock = { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } }
test('development no longer grants anonymous admin or partner access', async () => {
  const mocks = {
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) },
    '@/lib/supabase/admin': { createServiceRoleClient: () => { throw new Error('Must not access private data') }, isAdminEmail: () => false },
  }
  for (const mode of ['development', 'production']) {
    assert.equal(await load('lib/admin-auth.ts', mocks, { NODE_ENV: mode }).getAdminUser(), null)
    assert.equal(await load('lib/partner-auth.ts', mocks, { NODE_ENV: mode }).getPartner(), null)
  }
})
test('a signed-in non-admin is not promoted in development', async () => {
  const mocks = {
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { email: 'user@example.invalid' } } }) } }) },
    '@/lib/supabase/admin': { isAdminEmail: () => false, createServiceRoleClient: () => ({ from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }) },
  }
  assert.equal(await load('lib/admin-auth.ts', mocks, { NODE_ENV: 'development' }).getAdminUser(), null)
})
function orderHandler(insert) {
  return load('app/api/partners/credits/order/route.ts', {
    'next/server': responseMock,
    '@/lib/partner-auth': { getPartner: async () => ({ id: 'test', company_name: 'Test', email: 'test@example.invalid' }) },
    '@/lib/supabase/admin': { createServiceRoleClient: () => ({ from: () => ({ insert }) }) },
    resend: { Resend: class { constructor() { throw new Error('No email expected') } } },
  })
}
test('database insertion failure never returns payment instructions', async () => {
  const r = await orderHandler(async () => ({ error: { code: '23505' } })).POST({ json: async () => ({ packId: 'pack_10' }) })
  assert.equal(r.status, 500)
  assert.equal(r.body.success, undefined)
  assert.equal(r.body.order, undefined)
})
test('simultaneous orders receive unique bank references', async () => {
  const references = []
  const handler = orderHandler(async row => { references.push(row.transfer_reference); return { error: null } })
  const results = await Promise.all(Array.from({ length: 20 }, () => handler.POST({ json: async () => ({ packId: 'pack_10' }) })))
  assert.equal(results.every(r => r.status === 200), true)
  assert.equal(new Set(references).size, 20)
})
test('Meta CAPI never sends without explicit advertising consent', async () => {
  let requests = 0
  const module = load('lib/meta-capi.ts', {}, { NEXT_PUBLIC_META_PIXEL_ID: 'test', META_CAPI_ACCESS_TOKEN: 'test' }, {
    fetch: async () => { requests++; return { ok: true } },
  })
  const input = { eventId: 'test', email: 'test@example.invalid', phone: '000', segment: 'B2C' }
  await module.sendMetaConversionApiLead(input)
  await module.sendMetaConversionApiLead({ ...input, advertisingConsent: false })
  assert.equal(requests, 0)
  await module.sendMetaConversionApiLead({ ...input, advertisingConsent: true })
  assert.equal(requests, 1)
})
test('already settled Mollie callbacks do not send duplicate email or write audit entries', async () => {
  let rpcCalls = 0
  const module = load('lib/mollie-fulfillment.ts', {
    '@/lib/supabase/admin': { createServiceRoleClient: () => ({
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'order', partners: {} } }) }) }) }),
      rpc: async name => { assert.equal(name, 'settle_credit_order'); rpcCalls++; return { data: { alreadyPaid: true, newCredits: 10 } } },
    }) },
    resend: { Resend: class { constructor() { throw new Error('No email expected') } } },
  }, { RESEND_API_KEY: 'test' })
  const result = await module.fulfillPaidCreditOrder('order', { id: 'tr_test', status: 'paid', metadata: { orderId: 'order' }, amount: { value: '121.00', currency: 'EUR' } })
  assert.equal(result.alreadyPaid, true)
  assert.equal(rpcCalls, 1)
  const invalid = await module.fulfillPaidCreditOrder('order', { status: 'open', metadata: { orderId: 'order' } })
  assert.equal(invalid.success, false)
  assert.equal(rpcCalls, 1)
})
test('normalizePhoneForMeta correctly handles 0032, +32 (0), national 0, and raw 9-digit numbers', async () => {
  const module = load('lib/meta-capi.ts', {}, {}, {})
  assert.equal(module.normalizePhoneForMeta('0032 475 12 34 56'), '32475123456')
  assert.equal(module.normalizePhoneForMeta('+32 (0)475 12 34 56'), '32475123456')
  assert.equal(module.normalizePhoneForMeta('0475 12 34 56'), '32475123456')
  assert.equal(module.normalizePhoneForMeta('02 123 45 67'), '3221234567')
  assert.equal(module.normalizePhoneForMeta('475123456'), '32475123456')
  assert.equal(module.normalizePhoneForMeta('+33 6 12 34 56 78'), '33612345678')
})

test('formatFbc formats raw fbclid or preserves valid fb.1 format', async () => {
  const module = load('lib/meta-capi.ts', {}, {}, {})
  assert.match(module.formatFbc(undefined, 'IwZXh0bgNhZW10'), /^fb\.1\.\d+\.IwZXh0bgNhZW10$/)
  assert.equal(module.formatFbc('fb.1.1600000000.IwZXh0bgNhZW10'), 'fb.1.1600000000.IwZXh0bgNhZW10')
  assert.match(module.formatFbc('IwZXh0bgNhZW10'), /^fb\.1\.\d+\.IwZXh0bgNhZW10$/)
  assert.equal(module.formatFbc('', ''), undefined)
  assert.equal(module.formatFbc(undefined, undefined), undefined)
})

test('Meta CAPI user_data includes fn, ln, zp, country, fbc, and fbp for EMQ >= 8.8', async () => {
  let capturedBody = null
  const module = load('lib/meta-capi.ts', {}, { NEXT_PUBLIC_META_PIXEL_ID: '123456', META_CAPI_ACCESS_TOKEN: 'token' }, {
    fetch: async (url, options) => {
      capturedBody = JSON.parse(options.body)
      return { ok: true }
    },
  })

  await module.sendMetaConversionApiLead({
    advertisingConsent: true,
    eventId: 'lead-test-123',
    email: 'Jean.Dupont@Example.be',
    phone: '0475 12 34 56',
    firstName: 'Jean',
    lastName: 'Dupont',
    postalCode: '4000',
    countryCode: 'be',
    segment: 'B2C',
    clientIp: '198.51.100.1',
    userAgent: 'Mozilla/5.0 TestBrowser',
    fbp: 'fb.1.12345.67890',
    fbclid: 'IwZXh0bgNhZW10',
  })

  assert.ok(capturedBody)
  const userData = capturedBody.data[0].user_data
  assert.ok(Array.isArray(userData.em))
  assert.ok(Array.isArray(userData.ph))
  assert.ok(Array.isArray(userData.fn))
  assert.ok(Array.isArray(userData.ln))
  assert.ok(Array.isArray(userData.zp))
  assert.ok(Array.isArray(userData.country))
  assert.equal(userData.client_ip_address, '198.51.100.1')
  assert.equal(userData.client_user_agent, 'Mozilla/5.0 TestBrowser')
  assert.equal(userData.fbp, 'fb.1.12345.67890')
  assert.match(userData.fbc, /^fb\.1\.\d+\.IwZXh0bgNhZW10$/)
})



test('B2C solar calculation engine does not over-evaluate 3000-4000 kWh residential projects', () => {
  const solar = load('lib/solar-assumptions.ts')
  const pricing = load('lib/marketplace-pricing.ts', {
    './credit-pricing': load('lib/credit-pricing.ts'),
    './solar-assumptions': solar,
  })

  // Un ménage wallon consommant 3 500 kWh/an (tranche 3000_4000, ~1 150 €/an TTC) sans batterie
  const res = solar.calculateB2CSolarROI({
    annualBill: 1150,
    consumptionKwh: 3500,
    surfaceAreaM2: 42,
    roofMaterial: 'tuiles',
    hasBattery: 'non',
    hasEv: 'non',
  })

  // Doit recommander ~3.0 kWc (7 panneaux de 435 Wc), et jamais 5.6 kWc !
  assert.equal(res.estimatedPanelCount, 7)
  assert.equal(res.installedPowerKwc, 3)
  assert.ok(res.autoconsumptionRate >= 30 && res.autoconsumptionRate <= 42)
  // Wallonie post-2024 (sans compteur qui tourne à l'envers) : retour réaliste 8 à 11 ans sans batterie
  assert.ok(res.roiYears >= 8.0 && res.roiYears <= 11.0)

  // "hesite" sur la batterie ne doit pas facturer une batterie fantôme de 3 000 €
  const resHesite = solar.calculateB2CSolarROI({
    annualBill: 1480,
    consumptionKwh: 4500,
    surfaceAreaM2: 42,
    roofMaterial: 'tuiles',
    hasBattery: 'hesite',
    hasEv: 'non',
  })
  const resNon = solar.calculateB2CSolarROI({
    annualBill: 1480,
    consumptionKwh: 4500,
    surfaceAreaM2: 42,
    roofMaterial: 'tuiles',
    hasBattery: 'non',
    hasEv: 'non',
  })
  assert.equal(resHesite.totalNetCostHT, resNon.totalNetCostHT)

  // Normalisation rétroactive d'un lead existant en DB qui avait l'ancienne facture gonflée (1800 €) et 5.6 kWc
  const legacyLeadFin = pricing.calculateMarketplaceFinancials({
    segment: 'B2C',
    surfaceArea: 45,
    surfaceType: 'toiture',
    roofMaterial: 'tuiles',
    annualBill: 1800,
    estimatedPowerKwc: 5.6,
    projectDetails: 'Consommation annuelle: 3000_4000 | Type de bien: maison_4f | Couverture: tuiles | Surface toiture: medium',
    qualificationMetadata: {
      consumptionKwh: '3000_4000',
      roofSurface: 'medium',
      roofType: 'tuiles',
    },
  })

  assert.equal(legacyLeadFin.normalizedAnnualBill, 1150)
  assert.equal(legacyLeadFin.normalizedSurfaceAreaM2, 42)
  assert.equal(legacyLeadFin.estimatedPowerKwc, 3)
  assert.equal(legacyLeadFin.estimatedPanelCount, 7)
  assert.ok(legacyLeadFin.estimatedInstallerMargin < 1100) // ~700 € HT (20%), loin des 2 000 € gonflés d'avant
})

test('B2B solar calculation engine sizes realistically on daytime load without 115% oversizing', () => {
  const solar = load('lib/solar-assumptions.ts')
  const pricing = load('lib/marketplace-pricing.ts', {
    './credit-pricing': load('lib/credit-pricing.ts'),
    './solar-assumptions': solar,
  })

  // PME avec facture de 10 000 € HT/an et petite toiture (< 500 m²)
  const b2b = solar.calculateB2BSolarROI({
    surfaceType: 'toiture',
    surfaceRange: 'lt_500',
    annualElectricityBill: 10000,
    roofMaterial: 'bac_acier',
  })

  // Surface médiane 280 m² (et non 400 m²), puissance ~30 kWc (et non 55 kWc)
  assert.equal(b2b.surfaceAreaM2, 280)
  assert.ok(b2b.installedPowerKwc >= 25 && b2b.installedPowerKwc <= 35)
  assert.ok(b2b.estimatedRoiYears >= 5.0 && b2b.estimatedRoiYears <= 8.5)

  const fin = pricing.calculateMarketplaceFinancials({
    segment: 'B2B',
    surfaceArea: 350, // ancienne valeur par défaut lt_500
    surfaceType: 'toiture',
    roofMaterial: 'bac_acier',
    annualBill: 10000,
    estimatedPowerKwc: 55, // ancienne valeur sur-évaluée ignorée au profit du modèle physique
    qualificationMetadata: { b2b_surface_range: 'lt_500' },
  })
  assert.equal(fin.normalizedSurfaceAreaM2, 280)
  assert.equal(fin.estimatedPowerKwc, b2b.installedPowerKwc)
})
