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
    URLSearchParams,
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

test("Partial lead closure rule (7j + 48h grace) & RESCERT outreach invite template", () => {
  const noop = () => ({})
  const engine = loadTs("lib/lead-relance-engine.ts", {
    react: { cache: (fn) => fn },
    resend: { Resend: class {} },
    "@/lib/supabase/admin": { createServiceRoleClient: noop },
    "@/lib/marketplace-pricing": { calculateMarketplaceFinancials: noop, calculateLeadCreditCost: () => 3 },
    "@/lib/email-templates/installer-lead-teaser": { renderInstallerLeadTeaserEmail: noop, buildLeadEmailSubject: () => "" },
    "@/lib/belgium-regions": { getProvinceDisplayLabel: (p) => p },
    "@/lib/partner-notification-prefs": {
      doesSurfaceMatchPreference: () => true,
      getEffectivePartnerSegment: () => "BOTH",
      getPartnerNotificationMode: () => "all",
      OPTOUT_ALL_MARKER: "",
      OPTOUT_RELANCES_MARKER: "",
    },
    "@/lib/partner-notification-tokens": { buildPartnerNotificationUrls: noop },
    "@/lib/credit-pricing": { B2C_EXCLUSIVE_CREDIT_COST: 7, calculateOrderFinancials: noop },
    "@/lib/mollie": { createRecurringLeadPayment: noop, getMollieClient: noop, getValidMollieMandate: noop },
    "@/lib/mollie-fulfillment": { fulfillPaidLeadDirectPurchase: noop },
    "@/lib/notify-installateur": { sendLeadAssignedEmail: noop },
    "@/lib/admin-sales-emails": { sendAdminLeadSaleNotification: noop },
    "@/lib/prospect-exclusive-match-email": { sendProspectExclusiveMatchEmail: noop },
    "@/lib/prospect-reconfirm-email": { sendProspectReconfirmEmail: noop },
  })

  const DAY_MS = 24 * 60 * 60 * 1000
  const HOUR_MS = 60 * 60 * 1000
  const now = 1_795_000_000_000

  // 49h après création (< 7 jours) -> NE PAS fermer
  assert.equal(
    engine.shouldAutoClosePartialLead({
      segment: "B2C",
      createdAtMs: now - 49 * HOUR_MS,
      takenSlots: 2,
      maxSlots: 3,
      lastPurchaseAtMs: now - 2 * HOUR_MS,
      nowMs: now,
    }),
    false
  )

  // >= 7 jours mais dernier achat il y a 10h (< 48h grâce) -> NE PAS fermer
  assert.equal(
    engine.shouldAutoClosePartialLead({
      segment: "B2C",
      createdAtMs: now - 8 * DAY_MS,
      takenSlots: 2,
      maxSlots: 3,
      lastPurchaseAtMs: now - 10 * HOUR_MS,
      nowMs: now,
    }),
    false
  )

  // >= 7 jours ET dernier achat il y a 50h (>= 48h grâce) -> fermer proprement
  assert.equal(
    engine.shouldAutoClosePartialLead({
      segment: "B2C",
      createdAtMs: now - 8 * DAY_MS,
      takenSlots: 1,
      maxSlots: 3,
      lastPurchaseAtMs: now - 50 * HOUR_MS,
      nowMs: now,
    }),
    true
  )

  // Reconfirmation repousse le point de départ : créé il y a 9 jours, reconfirmé il y a 3 jours -> NE PAS fermer
  assert.equal(
    engine.shouldAutoClosePartialLead({
      segment: "B2C",
      createdAtMs: now - 9 * DAY_MS,
      reconfirmedAtMs: now - 3 * DAY_MS,
      takenSlots: 1,
      maxSlots: 3,
      lastPurchaseAtMs: now - 3 * DAY_MS,
      nowMs: now,
    }),
    false
  )

  const belgiumMod = loadTs("lib/belgium-regions.ts")
  assert.equal(belgiumMod.formatProvinceLocative("liege"), "en province de Liège")
  assert.equal(belgiumMod.formatProvinceLocative("namur"), "en province de Namur")
  assert.equal(belgiumMod.formatProvinceLocative("luxembourg"), "en province de Luxembourg")
  assert.equal(belgiumMod.formatProvinceLocative("hainaut"), "en Hainaut")
  assert.equal(belgiumMod.formatProvinceLocative("bruxelles"), "à Bruxelles")

  const optoutMod = loadTs("lib/rescert-optout-tokens.ts")
  const optToken = optoutMod.createRescertOptoutToken("Contact@SolarTest.be")
  assert.equal(optoutMod.verifyRescertOptoutToken("contact@solartest.be", optToken), true)
  assert.equal(optoutMod.verifyRescertOptoutToken("autre@solartest.be", optToken), false)

  const waveMod = loadTs("lib/email-templates/rescert-wave-invite.ts", {
    "@/lib/belgium-regions": belgiumMod,
    "@/lib/rescert-optout-tokens": optoutMod,
  })
  const inviteEmail = waveMod.buildRescertWaveInviteEmail({
    companyName: "Solar Liège SRL",
    certifiedPerson: "Laurent",
    email: "laurent@solarliege.be",
    phone: "+32477001122",
    postalCode: "4000",
    city: "Liège",
    provinceKey: "liege",
    provinceLabel: "Liège",
    totalOpenWalloniaCount: 6,
    provinceOpenCount: 2,
    sampleLead: {
      id: "98c09b29-675c-4000-9a81-3c6c5351eb6b",
      city: "Bovenistier",
      postalCode: "4300",
      provinceLabel: "Liège",
      surfaceAreaM2: 65,
      estimatedPowerKwc: 6.1,
      annualBillEur: 2300,
      creditCost: 3,
    },
  })

  assert.match(inviteEmail.subject, /Solar Liège SRL/)
  assert.match(inviteEmail.subject, /en province de Liège/)
  assert.equal(/en Liège/i.test(inviteEmail.subject), false)
  assert.equal(/en Liège/i.test(inviteEmail.html), false)
  assert.equal(/en Liège/i.test(inviteEmail.text), false)
  assert.match(inviteEmail.html, /en province de Liège/)
  assert.match(inviteEmail.html, /Bovenistier/)
  assert.match(inviteEmail.html, /#142D42/)
  assert.match(inviteEmail.html, /#4D6374/)
  assert.match(inviteEmail.html, /font-size: 18px; line-height: 1\.25;/)
  assert.equal(/#314b5f/i.test(inviteEmail.html), false)
  assert.equal(/<code>/i.test(inviteEmail.html), false)
  assert.equal(/Fabrice Remacle/i.test(inviteEmail.html), false)
  assert.match(inviteEmail.inviteUrl, /\/partenaires\/invitation\?/)
  assert.match(inviteEmail.inviteUrl, /leadId=98c09b29/)
  assert.match(inviteEmail.optoutUrl, /\/api\/partners\/rescert-optout\?/)
})

test("Prospect referral email ('L'astuce propriétaire') & 24h anti-misclick trigger", async () => {
  const belgiumMod = loadTs("lib/belgium-regions.ts")
  const referralMod = loadTs("lib/prospect-referral-email.ts", {
    resend: { Resend: class {} },
    "@/lib/belgium-regions": belgiumMod,
  })

  const referralEmail = referralMod.buildProspectReferralEmail({
    email: "julien.dubois@example.be",
    firstName: "Julien",
    lastName: "Dubois",
    leadId: "9f3d2a10-0000-4000-8000-000000000001",
    city: "Chaudfontaine",
    province: "liege",
    segment: "B2C",
    estimatedPowerKwc: 6.2,
    partnerCompany: "SolarTech Liège SRL",
  })

  assert.match(referralEmail.subject, /Chaudfontaine/)
  assert.match(referralEmail.subject, /astuce/i)
  assert.match(referralEmail.html, /#142D42/)
  assert.match(referralEmail.html, /#FFF5DF/)
  assert.match(referralEmail.html, /#D69729/)
  assert.match(referralEmail.html, /font-size: 18px; line-height: 1\.25;/)
  assert.match(referralEmail.html, /https:\/\/wa\.me\/\?text=/)
  assert.match(referralEmail.html, /aegissolaire\.com\/astuce/)
  assert.match(referralEmail.html, /RESCERT/)
  assert.match(referralEmail.html, /SolarTech Liège SRL/)
  assert.equal(/<code>/i.test(referralEmail.html), false)
  assert.equal(/#314b5f/i.test(referralEmail.html), false)
  assert.equal(/Fabrice Remacle/i.test(referralEmail.html), false)
  assert.match(referralEmail.text, /https:\/\/www\.aegissolaire\.com\/astuce/)

  const noop = () => ({})
  const sentTo = []
  const updatedLeads = []
  const now = 1_800_000_000_000
  const HOUR_MS = 60 * 60 * 1000

  const fakeRows = [
    // Éligible : won depuis 26h (> 24h)
    {
      id: "purch-eligible",
      lead_id: "lead-eligible",
      partner_id: "partner-real",
      pipeline_status: "won",
      updated_at: new Date(now - 26 * HOUR_MS).toISOString(),
      partners: { id: "partner-real", company_name: "SolarTech Liège SRL", email: "contact@solartech.be", is_test: false },
      leads: {
        id: "lead-eligible",
        first_name: "Julien",
        last_name: "Dubois",
        email: "julien@example.be",
        city: "Chaudfontaine",
        province: "liege",
        segment: "B2C",
        estimated_power_kwc: 6.2,
        qualification_metadata: {},
      },
    },
    // Déjà envoyé -> doit être ignoré
    {
      id: "purch-already-sent",
      lead_id: "lead-already-sent",
      partner_id: "partner-real",
      pipeline_status: "won",
      updated_at: new Date(now - 48 * HOUR_MS).toISOString(),
      partners: { id: "partner-real", company_name: "SolarTech Liège SRL", email: "contact@solartech.be", is_test: false },
      leads: {
        id: "lead-already-sent",
        first_name: "Claire",
        email: "claire@example.be",
        city: "Namur",
        province: "namur",
        segment: "B2C",
        estimated_power_kwc: 5.0,
        qualification_metadata: { referral_invite_sent_at: "2026-11-10T10:00:00.000Z" },
      },
    },
    // Opt-out -> doit être ignoré
    {
      id: "purch-optout",
      lead_id: "lead-optout",
      partner_id: "partner-real",
      pipeline_status: "won",
      updated_at: new Date(now - 30 * HOUR_MS).toISOString(),
      partners: { id: "partner-real", company_name: "SolarTech Liège SRL", email: "contact@solartech.be", is_test: false },
      leads: {
        id: "lead-optout",
        first_name: "Daniel",
        email: "daniel.castroviejo@cgs-energies.be",
        city: "Liège",
        province: "liege",
        segment: "B2C",
        qualification_metadata: {},
      },
    },
    // Compte test -> doit être ignoré
    {
      id: "purch-test-partner",
      lead_id: "lead-test-partner",
      partner_id: "partner-test",
      pipeline_status: "won",
      updated_at: new Date(now - 30 * HOUR_MS).toISOString(),
      partners: { id: "partner-test", company_name: "Test Partner", email: "mrnathanrem@gmail.com", is_test: true },
      leads: {
        id: "lead-test-partner",
        first_name: "Test",
        email: "prospect.test@example.be",
        city: "Liège",
        province: "liege",
        segment: "B2C",
        qualification_metadata: {},
      },
    },
  ]

  const mockSupabase = {
    from: (table) => {
      if (table === "lead_purchases") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          lte: () => chain,
          gte: () => chain,
          order: async () => ({ data: fakeRows, error: null }),
        }
        return chain
      }
      if (table === "leads") {
        return {
          update: (payload) => ({
            eq: async (_col, id) => {
              updatedLeads.push({ id, payload })
              return { error: null }
            },
          }),
        }
      }
      return {}
    },
  }

  const engine = loadTs("lib/lead-relance-engine.ts", {
    react: { cache: (fn) => fn },
    resend: { Resend: class {} },
    "@/lib/supabase/admin": { createServiceRoleClient: () => mockSupabase },
    "@/lib/marketplace-pricing": { calculateMarketplaceFinancials: noop, calculateLeadCreditCost: () => 3 },
    "@/lib/email-templates/installer-lead-teaser": { renderInstallerLeadTeaserEmail: noop, buildLeadEmailSubject: () => "" },
    "@/lib/belgium-regions": belgiumMod,
    "@/lib/partner-notification-prefs": {
      doesSurfaceMatchPreference: () => true,
      getEffectivePartnerSegment: () => "BOTH",
      getPartnerNotificationMode: () => "all",
      OPTOUT_ALL_MARKER: "",
      OPTOUT_RELANCES_MARKER: "",
    },
    "@/lib/partner-notification-tokens": { buildPartnerNotificationUrls: noop },
    "@/lib/credit-pricing": { B2C_EXCLUSIVE_CREDIT_COST: 7, calculateOrderFinancials: noop },
    "@/lib/mollie": { createRecurringLeadPayment: noop, getMollieClient: noop, getValidMollieMandate: noop },
    "@/lib/mollie-fulfillment": { fulfillPaidLeadDirectPurchase: noop },
    "@/lib/notify-installateur": { sendLeadAssignedEmail: noop },
    "@/lib/admin-sales-emails": { sendAdminLeadSaleNotification: noop },
    "@/lib/prospect-exclusive-match-email": { sendProspectExclusiveMatchEmail: noop },
    "@/lib/prospect-reconfirm-email": { sendProspectReconfirmEmail: noop },
    "@/lib/prospect-referral-email": {
      sendProspectReferralEmail: async (p) => {
        sentTo.push(p.email)
        return { sent: true, emailId: "mock-id-1" }
      },
    },
  })

  assert.equal(engine.REFERRAL_WON_STABILIZATION_MS, 24 * 60 * 60 * 1000)
  const sentCount = await engine.processPendingProspectReferralEmails(mockSupabase, now)
  assert.equal(sentCount, 1)
  assert.deepEqual(sentTo, ["julien@example.be"])
  assert.equal(updatedLeads.length, 1)
  assert.equal(updatedLeads[0].id, "lead-eligible")
  assert.ok(updatedLeads[0].payload.qualification_metadata.referral_invite_sent_at)
  assert.equal(updatedLeads[0].payload.qualification_metadata.referral_trigger_purchase_id, "purch-eligible")
})
