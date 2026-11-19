const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")
const { zipSync, unzipSync, strToU8, strFromU8 } = require("fflate")

function loadTs(relPath, mocks = {}) {
  const fullPath = path.join(__dirname, "..", relPath)
  const source = fs.readFileSync(fullPath, "utf8")
  const context = {
    exports: {},
    module: { exports: {} },
    console,
    process,
    Buffer,
    require: (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (name.startsWith("@/")) {
        return loadTs(name.slice(2) + ".ts", mocks)
      }
      return require(name)
    },
  }
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText
  vm.runInNewContext(transpiled, context)
  return Object.keys(context.exports).length > 0 ? context.exports : context.module.exports
}

const rules = loadTs("lib/accounting/belgian-tax-rules.ts")
const ubl = loadTs("lib/accounting/ubl-peppol-generator.ts")

test("1. Dates limites TVA belges fixées au 25 sans report week-end", () => {
  const q1 = rules.getPeriodDeadlineLabel(2026, 1)
  const q2 = rules.getPeriodDeadlineLabel(2026, 2)
  const q3 = rules.getPeriodDeadlineLabel(2026, 3)
  const q4 = rules.getPeriodDeadlineLabel(2026, 4)

  assert.equal(q1.deadlineLabel, "25 avril 2026")
  assert.equal(q2.deadlineLabel, "25 juillet 2026")
  assert.equal(q3.deadlineLabel, "25 octobre 2026")
  assert.equal(q4.deadlineLabel, "25 janvier 2027")

  // 25 avril 2026 = samedi, 25 juillet 2026 = samedi, 25 octobre 2026 = dimanche, 25 janvier 2027 = lundi
  const sched2026 = rules.getQuarterCalendarSchedule(2026, new Date("2026-11-20T12:00:00Z"))
  assert.equal(sched2026.length, 4)
  assert.equal(sched2026[0].isWeekend, true)
  assert.match(sched2026[0].effectiveDeadlineNote, /samedi.*vendredi 24/i)
  assert.equal(sched2026[1].isWeekend, true)
  assert.equal(sched2026[2].isWeekend, true)
  assert.match(sched2026[2].effectiveDeadlineNote, /dimanche.*vendredi 23/i)
  assert.equal(sched2026[3].isWeekend, false)
  assert.equal(sched2026[3].state, "current")
  assert.equal(sched2026[2].state, "past")
})

test("2. Mollie B.V. (Pays-Bas UE) traité en autoliquidation UE [82]+[88]+[55]+[59] (solde TVA = 0)", () => {
  const molliePreset = rules.EXPENSE_PRESETS_MAP.mollie_fees_eu
  assert.ok(molliePreset)
  assert.equal(molliePreset.supplierCountry, "EU")
  assert.equal(molliePreset.isReverseCharge, true)
  assert.equal(molliePreset.vatDeductiblePct, 100)

  const impact = rules.computeExpenseIntervatImpact({
    amount_htva: 42.5,
    vat_paid_be: 0,
    vat_deductible_pct: 100,
    tax_deductible_pct: 100,
    is_reverse_charge: true,
    is_investment: false,
    supplier_country: "EU",
    category: "mollie_fees_eu",
  })

  assert.equal(impact.grid82, 42.5)
  assert.equal(impact.grid88, 42.5)
  assert.equal(impact.grid87, 0)
  assert.equal(impact.grid55, 8.93)
  assert.equal(impact.grid59, 8.93)
  assert.equal(impact.netVatEffect, 0)
  assert.equal(impact.taxDeductibleAmount, 42.5)
})

test("3. Infomaniak (Suisse) & Vercel/Supabase/Resend (US) en autoliquidation Hors-UE [82]+[87]+[56]+[59]", () => {
  const inv = rules.computeIntervatDeclaration(
    [],
    [
      {
        id: "e1",
        expense_date: "2026-11-05",
        supplier_name: "Infomaniak Network SA",
        supplier_country: "NON_EU",
        supplier_vat_number: null,
        category: "saas_cloud_non_eu",
        description: "Nom de domaine & mail CH",
        nace_code: "63100",
        amount_htva: 30,
        vat_paid_be: 0,
        vat_deductible_pct: 100,
        tax_deductible_pct: 100,
        is_reverse_charge: true,
        is_investment: false,
        invoice_ref: "INF-2026-1",
        notes: null,
      },
      {
        id: "e2",
        expense_date: "2026-11-10",
        supplier_name: "Vercel Inc.",
        supplier_country: "NON_EU",
        supplier_vat_number: null,
        category: "saas_cloud_non_eu",
        description: "Vercel Pro",
        nace_code: "63100",
        amount_htva: 20,
        vat_paid_be: 0,
        vat_deductible_pct: 100,
        tax_deductible_pct: 100,
        is_reverse_charge: true,
        is_investment: false,
        invoice_ref: "VER-2026-1",
        notes: null,
      },
    ],
    2026,
    4
  )

  assert.equal(inv.grid82, 50)
  assert.equal(inv.grid87, 50)
  assert.equal(inv.grid88, 0)
  assert.equal(inv.grid56, 10.5)
  assert.equal(inv.grid59, 10.5)
  assert.equal(inv.grid71, 0)
  assert.equal(inv.grid72, 0)
  assert.equal(inv.totalTaxDeductibleExpenses, 50)
})

test("4. Matériel IT >= 1000 € BE ([83]+[59]) et Restaurant BE (0 % TVA, 69 % IPP)", () => {
  const hw = rules.computeExpenseIntervatImpact({
    amount_htva: 1500,
    vat_paid_be: 315,
    vat_deductible_pct: 100,
    tax_deductible_pct: 100,
    is_reverse_charge: false,
    is_investment: true,
    supplier_country: "BE",
    category: "hardware_it_video",
  })
  assert.equal(hw.grid83, 1500)
  assert.equal(hw.grid82, 0)
  assert.equal(hw.grid59, 315)
  assert.equal(hw.netVatEffect, -315)
  assert.equal(hw.taxDeductibleAmount, 1500)

  const resto = rules.computeExpenseIntervatImpact({
    amount_htva: 100,
    vat_paid_be: 12,
    vat_deductible_pct: 0,
    tax_deductible_pct: 69,
    is_reverse_charge: false,
    is_investment: false,
    supplier_country: "BE",
    category: "restaurant_business",
  })
  assert.equal(resto.grid82, 100)
  assert.equal(resto.grid59, 0)
  assert.equal(resto.netVatEffect, 0)
  // Coût TTC = 112 € × 69 % = 77,28 € déductibles à l'IPP
  assert.equal(resto.taxDeductibleAmount, 77.28)
})

test("5. Génération dossier d'audit Markdown pour vérification dans le chat", () => {
  const md = rules.buildChatAuditMarkdown(
    [
      {
        id: "11111111-1111-4111-8111-111111111111",
        status: "pending_review",
        source: "drag_drop",
        document_storage_path: "2026/11/test.pdf",
        document_filename: "resend-nov-2026.pdf",
        document_mime_type: "application/pdf",
        document_sha256: "abc123",
        document_size_bytes: 12000,
        expense_date: "2026-11-01",
        supplier_name: "Resend Inc.",
        supplier_country: "NON_EU",
        supplier_vat_number: null,
        category: "saas_cloud_non_eu",
        description: "Resend Pro",
        nace_code: "63100",
        original_currency: "USD",
        original_amount_htva: 20,
        original_vat_amount: 0,
        original_amount_ttc: 20,
        exchange_rate: 0.92,
        exchange_rate_source: "BCE (2026-11-01)",
        amount_htva: 18.4,
        vat_paid_be: 0,
        vat_deductible_pct: 100,
        tax_deductible_pct: 100,
        is_reverse_charge: true,
        is_investment: false,
        invoice_ref: "RES-2026-11",
        payment_source: "personal_card",
        is_valid_tax_invoice: true,
        client_vat_present: true,
        ai_confidence: 0.98,
        ai_model: "google/gemini-3.8-flash",
        ai_warnings: [],
        ai_raw_extraction: { line_items: [{ description: "Resend Pro Monthly", amount: 20 }] },
        source_metadata: {},
        notes: null,
        approved_expense_id: null,
        created_at: "2026-11-19T12:00:00Z",
        updated_at: "2026-11-19T12:00:00Z",
      },
    ],
    2026,
    4
  )

  assert.match(md, /11111111-1111-4111-8111-111111111111/)
  assert.match(md, /Resend Inc\./)
  assert.match(md, /20\.00 USD/)
  assert.match(md, /18\.40 €/)
  assert.match(md, /\[87\]=18\.40€/)
  assert.match(md, /personal_card/)
})

test("6. Génération archive ZIP Peppol UBL 2.1 round-trip valide via fflate", () => {
  const xml = ubl.generatePeppolUblXml({
    id: "inv-1",
    invoice_number: "FA-2026-0001",
    invoice_type: "invoice",
    fiscal_year: 2026,
    sequence_number: 1,
    partner_id: "p1",
    credit_order_id: "o1",
    lead_purchase_id: null,
    source_kind: "credit_order",
    client_company_name: "Installateur Test SRL",
    client_vat_number: "BE 0123.456.789",
    client_bce_number: "0123456789",
    client_street: "Rue de Test 10",
    client_postal_code: "4000",
    client_city: "Liège",
    client_country: "BE",
    client_email: "test@example.be",
    line_description: "Pack 10 crédits Aegis Solaire",
    credits_amount: 10,
    amount_htva: 98.33,
    vat_rate: 21,
    amount_vat: 20.65,
    amount_ttc: 118.98,
    processor_fee_eur: 0,
    payment_method: "Bancontact",
    payment_reference: "tr_test123",
    status: "paid",
    peppol_status: "ready_ubl",
    issued_at: "2026-11-15T10:00:00Z",
    paid_at: "2026-11-15T10:00:00Z",
    notes: null,
  })

  const zipped = zipSync({
    "FA-2026-0001.xml": strToU8(xml),
    "README_PEPPOL_ODOO.txt": strToU8("Test Peppol batch"),
  })
  const unzipped = unzipSync(zipped)
  assert.ok(unzipped["FA-2026-0001.xml"])
  assert.ok(unzipped["README_PEPPOL_ODOO.txt"])
  const decodedXml = strFromU8(unzipped["FA-2026-0001.xml"])
  assert.match(decodedXml, /<cbc:ID>FA-2026-0001<\/cbc:ID>/)
  assert.match(decodedXml, /<cbc:EndpointID schemeID="0208">1039899980<\/cbc:EndpointID>/)
})
