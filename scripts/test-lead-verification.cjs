const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")

function loadTs(relPath, cache = new Map()) {
  const fullPath = path.join(__dirname, "..", relPath)
  if (cache.has(fullPath)) return cache.get(fullPath).exports

  const source = fs.readFileSync(fullPath, "utf8")
  const mod = { exports: {} }
  cache.set(fullPath, mod)

  const context = {
    exports: mod.exports,
    module: mod,
    console,
    process,
    Buffer,
    URL,
    AbortSignal,
    setTimeout,
    clearTimeout,
    require: (name) => {
      if (name.startsWith("@/")) {
        const resolved = resolveTsFile(path.join(__dirname, "..", name.slice(2)))
        return loadTs(path.relative(path.join(__dirname, ".."), resolved), cache)
      }
      if (name.startsWith("./") || name.startsWith("../")) {
        const baseDir = path.dirname(fullPath)
        const resolved = resolveTsFile(path.resolve(baseDir, name))
        return loadTs(path.relative(path.join(__dirname, ".."), resolved), cache)
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
  return mod.exports
}

function resolveTsFile(basePath) {
  if (fs.existsSync(basePath + ".ts")) return basePath + ".ts"
  if (fs.existsSync(basePath + ".tsx")) return basePath + ".tsx"
  if (fs.existsSync(path.join(basePath, "index.ts"))) return path.join(basePath, "index.ts")
  return basePath
}

const validation = loadTs("lib/leads-validation.ts")
const schema = loadTs("lib/leads-schema.ts")
const quality = loadTs("lib/lead-quality.ts")
const risk = loadTs("lib/admin/lead-risk.ts")
const engine = loadTs("lib/lead-verification-engine.ts")
const twilioVerify = loadTs("lib/twilio-verify.ts")

test("Téléphone BE/FR : rejette +32470102030 et toutes les suites/répétitions factices", () => {
  const fakeNumbers = [
    "+32470102030",
    "0470 10 20 30",
    "0470 20 30 40",
    "0475 12 34 56",
    "0475 65 43 21",
    "0475 11 22 33",
    "0475 45 45 45",
    "0475 45 64 56",
    "0475 11 44 77",
    "0475 00 00 00",
    "0475 55 55 55",
    "070 22 21 20",
    "0800 12 345",
    "0900 10 200",
    "+33 6 12 34 56 78",
  ]

  for (const num of fakeNumbers) {
    assert.equal(validation.isValidFrBePhone(num), false, `isValidFrBePhone aurait dû rejeter ${num}`)
    assert.equal(
      validation.formatAndValidateBelgianPhone(num).isValid,
      false,
      `formatAndValidateBelgianPhone aurait dû rejeter ${num}`
    )
  }
})

test("Téléphone BE/FR : préserve 100% des numéros réels (GSM, fixes Liège/Charleroi/Namur, +32(0), +33)", () => {
  const realNumbers = [
    { input: "+32495256301", expectedE164: "+32495256301" },
    { input: "+32472612237", expectedE164: "+32472612237" },
    { input: "+32456540472", expectedE164: "+32456540472" },
    { input: "+32471267503", expectedE164: "+32471267503" },
    { input: "+32475524637", expectedE164: "+32475524637" },
    { input: "+32498863785", expectedE164: "+32498863785" },
    { input: "+32 (0)475 82 91 43", expectedE164: "+32475829143" },
    { input: "04 366 91 11", expectedE164: "+3243669111" },
    { input: "071 32 45 67", expectedE164: "+3271324567" },
    { input: "081 24 68 10", expectedE164: "+3281246810" },
    { input: "+33 6 82 41 73 59", expectedE164: "+33682417359" },
  ]

  for (const { input, expectedE164 } of realNumbers) {
    assert.equal(validation.isValidFrBePhone(input), true, `Numéro réel rejeté par isValidFrBePhone : ${input}`)
    assert.equal(
      validation.normalizeFrBePhone(input),
      expectedE164,
      `Normalisation E.164 incorrecte pour ${input}`
    )
  }
})

test("E-mail & Identité : bloque fautes de frappe, jetables, placeholders et faux noms tout en acceptant les vrais prospects", () => {
  assert.match(validation.getEmailError("jean@gmail.be") || "", /gmail\.com/i)
  assert.match(validation.getEmailError("jean@gmal.com") || "", /gmail\.com/i)
  assert.match(validation.getEmailError("jean@skynet.com") || "", /skynet\.be/i)
  assert.ok(validation.getEmailError("prospect@yopmail.com"))
  assert.ok(validation.getEmailError("prospect@mohmal.com"))
  assert.ok(validation.getEmailError("test@gmail.com"))
  assert.ok(validation.getEmailError("azerty@skynet.be"))
  assert.ok(validation.getEmailError("john@example.com"))
  assert.equal(validation.getEmailError("serge.vermeulen@hotmail.com"), null)
  assert.equal(validation.getEmailError("contact@entreprise-wallonne.be"), null)

  assert.equal(validation.isSuspiciousPersonName("test"), true)
  assert.equal(validation.isSuspiciousPersonName("azerty"), true)
  assert.equal(validation.isSuspiciousPersonName("Jean123"), true)
  assert.equal(validation.isSuspiciousPersonName("http://spam.be"), true)
  assert.equal(validation.isSuspiciousPersonName("Jean Dupont"), false)
  assert.equal(validation.isSuspiciousPersonName("Maadaoui"), false)
  assert.equal(validation.isSuspiciousPersonName("Jean-François"), false)
})

test("Géographie & Adresses : bloque 1780 Wemmel / contradictions sans faux positifs sur Chaussée de Bruxelles ou Saint-Nicolas", () => {
  assert.ok(
    validation.detectCityPostalContradiction({
      postalCode: "4000",
      city: "Wemmel Bruxelles",
      siteAddress: "Avenue Roi Albert 1. 18",
      walloniaOnly: true,
    })
  )
  assert.ok(
    validation.detectCityPostalContradiction({
      postalCode: "4000",
      city: "Liège",
      siteAddress: "Avenue Roi Albert 1. 18, 1780 Wemmel",
      walloniaOnly: true,
    })
  )
  assert.equal(
    validation.detectCityPostalContradiction({
      postalCode: "1410",
      city: "Waterloo",
      siteAddress: "Chaussée de Bruxelles 45",
      walloniaOnly: true,
    }),
    null
  )
  assert.equal(
    validation.detectCityPostalContradiction({
      postalCode: "4420",
      city: "Saint-Nicolas",
      siteAddress: "Rue du Centre 12",
      walloniaOnly: true,
    }),
    null
  )
  assert.equal(
    validation.detectCityPostalContradiction({
      postalCode: "1348",
      city: "Louvain-la-Neuve",
      siteAddress: "Grand-Place 1",
      walloniaOnly: true,
    }),
    null
  )
  assert.equal(
    validation.detectCityPostalContradiction({
      postalCode: "7910",
      city: "Forest",
      siteAddress: "Rue de Merbes 5",
      walloniaOnly: true,
    }),
    null
  )
})

test("Schéma Zod leadSubmitSchema : bloque cas Maadaoui/Carlos tout en acceptant B2C Wallonie et B2B Belgique", () => {
  const baseValidB2C = {
    segment: "B2C",
    sourceForm: "b2c_simulator",
    firstName: "Serge",
    lastName: "Vermeulen",
    email: "serge.vermeulen@hotmail.com",
    phone: "+32471267503",
    province: "namur",
    postalCode: "5600",
    city: "Roly",
    siteAddress: "Rue de Senzeilles 14",
    surfaceType: "toiture",
    surfaceArea: 65,
    annualElectricityBill: 2800,
    marketingConsent: true,
  }

  assert.equal(schema.leadSubmitSchema.safeParse(baseValidB2C).success, true)

  assert.equal(
    schema.leadSubmitSchema.safeParse({ ...baseValidB2C, phone: "+32470102030" }).success,
    false
  )
  assert.equal(
    schema.leadSubmitSchema.safeParse({ ...baseValidB2C, postalCode: "1780", city: "Wemmel" }).success,
    false
  )
  assert.equal(
    schema.leadSubmitSchema.safeParse({
      ...baseValidB2C,
      siteAddress: "Avenue Roi Albert 1. 18, 1780 Wemmel Bruxelles",
    }).success,
    false
  )
  assert.equal(
    schema.leadSubmitSchema.safeParse({ ...baseValidB2C, email: "serge@gmail.be" }).success,
    false
  )

  const validB2BBrussels = {
    segment: "B2B",
    sourceForm: "b2b_simulator",
    firstName: "Marc",
    lastName: "Lemaire",
    email: "marc.lemaire@entreprise.be",
    phone: "+32495256301",
    province: "bruxelles",
    postalCode: "1000",
    city: "Bruxelles",
    siteAddress: "Rue Royale 120",
    surfaceType: "toiture",
    surfaceArea: 450,
    annualElectricityBill: 25000,
    company: "Entreprise Solaire SA",
    companyVat: "BE0403170701",
    jobTitle: "Dirigeant",
    marketingConsent: true,
  }
  assert.equal(schema.leadSubmitSchema.safeParse(validB2BBrussels).success, true)
})

test("Gate Publication & Risk Flags : bloque publication des leads invalides et signale les anomalies", () => {
  const fakePhonePublish = quality.evaluateLeadPublishability({
    segment: "B2C",
    province: "hainaut",
    postal_code: "6280",
    city: "Gerpinnes",
    site_address: "Rue Neuve 8",
    surface_area: 42,
    surface_type: "toiture",
    annual_electricity_bill: 2200,
    email: "vdmeiren@gmail.com",
    phone: "+32470102030",
  })
  assert.equal(fakePhonePublish.isPublishable, false)
  assert.ok(fakePhonePublish.missingFields.some((m) => /téléphone/i.test(m)))

  const wemmelPublish = quality.evaluateLeadPublishability({
    segment: "B2C",
    province: "liege",
    postal_code: "1780",
    city: "Wemmel Bruxelles",
    site_address: "Avenue Roi Albert 1. 18",
    surface_area: 50,
    surface_type: "toiture",
    annual_electricity_bill: 2400,
    email: "carlos@gmail.com",
    phone: "+32475524637",
  })
  assert.equal(wemmelPublish.isPublishable, false)
  assert.ok(wemmelPublish.missingFields.length >= 2)

  const validMarketplaceProjection = quality.evaluateLeadPublishability({
    segment: "B2C",
    province: "namur",
    postal_code: "5600",
    city: "Roly",
    surface_area: 65,
    surface_type: "toiture",
    annual_electricity_bill: 2800,
    qualification_metadata: {
      verifications: {
        emailMx: { valid: true, isDisposable: false },
        walloniaAddress: { validInWallonia: true, postalMismatch: false },
      },
    },
  })
  assert.equal(validMarketplaceProjection.isPublishable, true)

  const flags = risk.detectLeadRiskFlags({
    firstName: "Carlos",
    lastName: "Carlos",
    email: "fake@yopmail.com",
    phone: "+32470102030",
    postalCode: "1780",
    city: "Wemmel Bruxelles",
    siteAddress: "Avenue Roi Albert 1. 18",
    province: "liege",
    segment: "B2C",
    qualificationMetadata: {
      verifications: {
        emailMx: { valid: false, isDisposable: true },
        duplicateCheck: { hasDuplicatePhone: true, hasDuplicateEmail: false },
      },
    },
  })
  const codes = new Set(flags.map((f) => f.code))
  assert.ok(codes.has("INVALID_PHONE"))
  assert.ok(codes.has("DISPOSABLE_EMAIL"))
  assert.ok(codes.has("OUT_OF_WALLONIA"))
  assert.ok(codes.has("GEO_CONTRADICTION"))
  assert.ok(codes.has("IDENTICAL_FIRST_LAST_NAME"))
  assert.ok(codes.has("DUPLICATE_CONTACT"))
})

test("Moteur d'enrichissement : DNS MX réel, typo, domaine inexistant, phoneAnalysis et identityAnalysis", async () => {
  const typoMx = await engine.verifyEmailDomainMx("jean@gmail.be")
  assert.equal(typoMx.valid, false)
  assert.equal(typoMx.typoSuggestion, "gmail.com")

  const disposableMx = await engine.verifyEmailDomainMx("spam@tempmailo.com")
  assert.equal(disposableMx.valid, false)
  assert.equal(disposableMx.isDisposable, true)

  const fakeDomainMx = await engine.verifyEmailDomainMx("contact@domaine-inexistant-aegis-999999.be")
  assert.equal(fakeDomainMx.valid, false)
  assert.equal(Boolean(fakeDomainMx.transientError), false)

  const realGmailMx = await engine.verifyEmailDomainMx("contact@gmail.com")
  assert.equal(realGmailMx.valid, true)
  assert.ok(realGmailMx.mxServers.length > 0)

  const fakePhoneRes = engine.verifyPhoneIntegrity("0470 10 20 30")
  assert.equal(fakePhoneRes.valid, false)
  assert.equal(fakePhoneRes.fakePattern, true)

  const validMobileRes = engine.verifyPhoneIntegrity("0495 25 63 01")
  assert.equal(validMobileRes.valid, true)
  assert.equal(validMobileRes.lineType, "mobile")
  assert.equal(validMobileRes.e164, "+32495256301")

  const identRes = engine.verifyIdentityIntegrity({ firstName: "azerty", lastName: "Dupont" })
  assert.equal(identRes.suspiciousName, true)
})

test("Preuve HMAC Twilio Verify & résolution téléphone par segment : anti-spoofing", () => {
  const token = twilioVerify.createPhoneVerificationProof({
    phoneE164: "+32495256301",
    channel: "sms",
    lineType: "mobile",
    carrierName: "Orange Belgium",
  })

  const ok = twilioVerify.verifyPhoneVerificationProof(token, "+32495256301")
  assert.ok(ok)
  assert.equal(ok.channel, "sms")
  assert.equal(ok.carrierName, "Orange Belgium")

  // Rejet si le client change le numéro après avoir validé l'OTP
  assert.equal(twilioVerify.verifyPhoneVerificationProof(token, "+32472612237"), null)

  // Rejet si le jeton est altéré ou expiré
  assert.equal(twilioVerify.verifyPhoneVerificationProof(token + "x", "+32495256301"), null)
  const expired = twilioVerify.createPhoneVerificationProof({
    phoneE164: "+32495256301",
    channel: "sms",
    ttlSeconds: -10,
  })
  assert.equal(twilioVerify.verifyPhoneVerificationProof(expired, "+32495256301"), null)

  // Masquage propre
  assert.equal(twilioVerify.maskPhoneForDisplay("+32495256301"), "+32495 •• •• 01")

  // Résolution par segment (B2C strict belge vs B2B BE/FR)
  assert.equal(validation.resolveLeadPhoneE164("+33 6 82 41 73 59", "B2C").valid, false)
  assert.equal(validation.resolveLeadPhoneE164("+33 6 82 41 73 59", "B2B").e164, "+33682417359")
  assert.equal(validation.resolveLeadPhoneE164("0495 25 63 01", "B2C").e164, "+32495256301")
})

