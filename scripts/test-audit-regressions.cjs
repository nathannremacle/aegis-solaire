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
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name) }
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
