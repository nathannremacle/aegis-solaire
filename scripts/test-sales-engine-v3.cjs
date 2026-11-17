const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")

function loadTs(relPath, mocks = {}) {
  const fullPath = path.join(__dirname, "..", relPath)
  const source = fs.readFileSync(fullPath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText

  const mod = { exports: {} }
  const context = {
    exports: mod.exports,
    module: mod,
    console,
    process: { env: { ...process.env } },
    Buffer,
    URL,
    require: (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (name.endsWith(".json")) {
        const cleanJson = name.startsWith("@/")
          ? path.join(__dirname, "..", name.slice(2))
          : path.resolve(path.dirname(fullPath), name)
        return JSON.parse(fs.readFileSync(cleanJson, "utf8"))
      }
      if (name.startsWith("@/")) return loadTs(name.slice(2) + ".ts", mocks)
      if (name.startsWith("./")) {
        const dir = path.dirname(relPath)
        const target = path.posix.join(dir.replace(/\\/g, "/"), name.slice(2)) + ".ts"
        return loadTs(target, mocks)
      }
      return require(name)
    },
  }
  vm.runInNewContext(compiled, context)
  return context.exports
}

test("Degressive divisible credit packs and Value-Based lead pricing tiers", () => {
  const creditPricing = loadTs("lib/credit-pricing.ts")
  const solar = loadTs("lib/solar-assumptions.ts")
  const marketplacePricing = loadTs("lib/marketplace-pricing.ts", {
    "./credit-pricing": creditPricing,
    "./solar-assumptions": solar,
    "@/lib/credit-pricing": creditPricing,
    "@/lib/solar-assumptions": solar,
  })

  // Packs multiples de 3 & 12 avec remises dégressives
  assert.equal(creditPricing.CREDIT_PACKS_LIST.length, 3)
  assert.deepEqual(
    Array.from(creditPricing.CREDIT_PACKS_LIST.map((p) => p.credits)),
    [12, 24, 60]
  )
  assert.equal(creditPricing.calculateCreditPackFinancials("pack_12").priceHtva, 108)
  assert.equal(creditPricing.calculateCreditPackFinancials("pack_24").priceHtva, 198)
  assert.equal(creditPricing.calculateCreditPackFinancials("pack_60").priceHtva, 450)
  assert.equal(creditPricing.calculateCreditPackFinancials("pack_24").priceTtc, 239.58)

  // Option Exclusivité Totale B2C (7 cr. = 65 € HTVA)
  const excl = creditPricing.calculateLeadDirectFinancials({
    segment: "B2C",
    credit_cost: 3,
    exclusive: true,
  })
  assert.equal(excl.credits, 7)
  assert.equal(excl.priceHtva, 65)
  assert.equal(excl.vatAmount, 13.65)
  assert.equal(excl.priceTtc, 78.65)

  // Paliers B2C
  assert.equal(
    marketplacePricing.calculateLeadCreditCost({
      segment: "B2C",
      surfaceArea: 20,
      annualBill: 900,
    }),
    2
  )
  assert.equal(
    marketplacePricing.calculateLeadCreditCost({
      segment: "B2C",
      surfaceArea: 45,
      annualBill: 1500,
    }),
    3
  )
  assert.equal(
    marketplacePricing.calculateLeadCreditCost({
      segment: "B2C",
      surfaceArea: 85,
      annualBill: 2800,
      wantsIrve: true,
    }),
    4
  )

  // Paliers B2B
  assert.equal(
    marketplacePricing.calculateLeadCreditCost({
      segment: "B2B",
      surfaceArea: 250,
      annualBill: 7000,
    }),
    6
  )
  assert.equal(
    marketplacePricing.calculateLeadCreditCost({
      segment: "B2B",
      surfaceArea: 600,
      annualBill: 16000,
    }),
    9
  )
  assert.equal(
    marketplacePricing.calculateLeadCreditCost({
      segment: "B2B",
      surfaceArea: 1500,
      surfaceType: "friche",
      annualBill: 45000,
    }),
    12
  )
})

test("Surface family normalization and H+48h freshness labels", () => {
  const prefs = loadTs("lib/partner-notification-prefs.ts", {
    "@/data/b2c-optout-emails.json": [],
  })
  assert.equal(prefs.doesSurfaceMatchPreference("toiture_inclinee", ["toiture"]), true)
  assert.equal(prefs.doesSurfaceMatchPreference("toiture_plate", ["toiture"]), true)
  assert.equal(prefs.doesSurfaceMatchPreference("friche", ["sol"]), true)
  assert.equal(prefs.doesSurfaceMatchPreference("parking", ["toiture"]), false)

  const helpers = loadTs("lib/lead-display-helpers.ts")
  const recentReconfirm = helpers.getLeadFreshness(
    "2026-01-01T00:00:00Z",
    null,
    new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  )
  assert.equal(recentReconfirm.label, "Reconfirmé récemment")
  assert.equal(recentReconfirm.isHot, true)

  const olderLead = helpers.getLeadFreshness("2026-01-01T00:00:00Z")
  assert.equal(olderLead.label.includes("Il y a"), false)
})

test("Prospect exclusive reassurance, reconfirm token, and platform update announcement respect anonymity", () => {
  const exclusiveMod = loadTs("lib/prospect-exclusive-match-email.ts", {
    resend: { Resend: class {} },
  })
  const exclEmail = exclusiveMod.buildProspectExclusiveMatchEmail({
    email: "prospect@example.be",
    firstName: "Marc",
    leadId: "4a8f21cc-0000-4000-8000-000000000000",
    city: "Namur",
    province: "namur",
    estimatedPowerKwc: 5.2,
    surfaceArea: 45,
    grd: "ores",
    contactPreference: "written_first",
    partnerCompany: "Solar Wallonie SRL",
    partnerEmail: "contact@aegissolaire.com",
    partnerPhone: null,
  })
  assert.match(exclEmail.subject, /Namur/)
  assert.match(exclEmail.subject, /sans engagement/i)
  assert.match(exclEmail.html, /Solar Wallonie SRL/)
  assert.match(exclEmail.html, /RESCERT/)
  assert.match(exclEmail.html, /Dossier #4A8F21CC/)
  assert.match(exclEmail.html, /Par écrit d'abord/)
  assert.match(exclEmail.html, /tri comparatif/i)
  assert.match(exclEmail.html, /25 à 35/i)
  assert.match(exclEmail.html, /Transparence sur notre rémunération/i)
  assert.equal(/2 autres devis/i.test(exclEmail.html), false)
  assert.equal(/vérification tarifaire gratuite/i.test(exclEmail.html), false)
  assert.match(exclEmail.html, /ORES/)
  assert.equal(/Coordonnées directes<\/th>/i.test(exclEmail.html), false)
  assert.equal(/<code>/i.test(exclEmail.html), false)
  assert.equal(/Fabrice Remacle/i.test(exclEmail.html), false)
  assert.equal(/#314b5f/i.test(exclEmail.html), false)
  assert.match(exclEmail.html, /#142D42/)
  assert.match(exclEmail.html, /font-size: 18px; line-height: 1\.25;/)
  assert.match(exclEmail.text, /sans engagement/i)
  assert.equal(/Coordonnées directes : contact@aegissolaire\.com/i.test(exclEmail.text), false)

  const exclDirectEmail = exclusiveMod.buildProspectExclusiveMatchEmail({
    email: "prospect2@example.be",
    firstName: "Sophie",
    province: "brabant_wallon",
    contactPreference: "direct_call",
    partnerCompany: "Brabant Solar SRL",
    partnerEmail: "devis@brabantsolar.be",
    partnerPhone: "010 22 33 44",
    partnerRescertRef: "RC-2026-441",
  })
  assert.match(exclDirectEmail.subject, /Brabant wallon/)
  assert.match(exclDirectEmail.html, /010 22 33 44 · devis@brabantsolar\.be/)
  assert.match(exclDirectEmail.html, /RC-2026-441/)
  assert.match(exclDirectEmail.html, /Appel téléphonique autorisé/)

  const reconfirmMod = loadTs("lib/prospect-reconfirm-email.ts", {
    resend: { Resend: class {} },
  })
  const recEmail = reconfirmMod.buildProspectReconfirmEmail({
    leadId: "lead-123",
    email: "marc@example.be",
    firstName: "Marc",
    city: "Namur",
  })
  assert.equal(/#314b5f/i.test(recEmail.html), false)
  assert.match(recEmail.html, /#142D42/)
  const token = reconfirmMod.createLeadReconfirmToken("lead-123", "marc@example.be")
  assert.equal(
    reconfirmMod.verifyLeadReconfirmToken("lead-123", "MARC@example.be", token),
    true
  )
  assert.equal(
    reconfirmMod.verifyLeadReconfirmToken("lead-123", "other@example.be", token),
    false
  )

  const creditPricing = loadTs("lib/credit-pricing.ts")
  const tokens = loadTs("lib/partner-notification-tokens.ts")
  const updateMod = loadTs("lib/email-templates/installer-platform-update.ts", {
    "@/lib/credit-pricing": creditPricing,
    "@/lib/partner-notification-tokens": tokens,
  })
  const announcement = updateMod.buildInstallerPlatformUpdateEmail({
    partnerId: "partner-1",
    companyName: "ElectroSolaire",
    credits: 3,
  })
  assert.match(announcement.html, /-24(&nbsp;| )%/)
  assert.match(announcement.html, /Exclusivit/)
  assert.match(announcement.html, /Auto-Pilot/)
  assert.equal(/Fabrice Remacle/i.test(announcement.html), false)
  assert.equal(/#314b5f/i.test(announcement.html), false)
  assert.equal(/<code>/i.test(announcement.html), false)
  assert.match(announcement.html, /font-size: 18px; line-height: 1\.25;/)
  assert.match(announcement.html, /font-variant-numeric: tabular-nums;">0\/3<\/span>/)
  // Legal footer only
  assert.match(announcement.text, /INIT42 \(Nathan Remacle\)/)
})
