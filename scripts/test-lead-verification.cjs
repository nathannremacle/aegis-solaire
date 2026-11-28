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
    fetch: (...args) => globalThis.fetch(...args),
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
const display = loadTs("lib/lead-verification-display.ts")
const confirmEmail = loadTs("lib/prospect-confirmation-email.ts")
const disputesPolicy = loadTs("lib/disputes-policy.ts")
const notifyAdmin = loadTs("lib/notify-admin-lead.ts")
const installerTeaser = loadTs("lib/email-templates/installer-lead-teaser.ts")
const pricing = loadTs("lib/marketplace-pricing.ts")
const addressSpw = loadTs("lib/address-spw.ts")

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

test("Transparence Vérifié vs Plausible vs Aucun badge + Token e-mail 1-clic", () => {
  // 1. Dossier totalement certifié (OTP SMS + clic e-mail + SPW bâtiment + BCE active)
  const verifiedLead = display.getLeadVerificationSummary({
    segment: "B2B",
    phone: "+32495256301",
    email: "marc@entreprise.be",
    postal_code: "4000",
    company_vat: "BE0403170701",
    phone_verified: true,
    email_verified: true,
    qualification_metadata: {
      verifications: {
        phoneOtp: { verified: true, channel: "sms" },
        emailProof: { verified: true, method: "confirmation_link" },
        emailMx: { valid: true },
        walloniaAddress: { validInWallonia: true, houseVerified: true, streetVerified: true },
        cbeCompany: { verified: true, active: true, officialName: "ENTREPRISE SOLAIRE SA" },
      },
    },
  })
  assert.equal(verifiedLead.phone.tier, "verified")
  assert.equal(verifiedLead.email.tier, "verified")
  assert.equal(verifiedLead.address.tier, "verified")
  assert.equal(verifiedLead.company.tier, "verified")
  assert.equal(verifiedLead.verifiedCount, 4)

  // 2. Dossier uniquement plausible (MX + Lookup opérateur sans OTP ni clic)
  const plausibleLead = display.getLeadVerificationSummary({
    segment: "B2C",
    phone: "+32495256301",
    email: "jean@gmail.com",
    postal_code: "5300",
    qualification_metadata: {
      verifications: {
        emailMx: { valid: true },
        twilioLookup: { valid: true, carrierName: "TELENET n.v." },
        walloniaAddress: { validInWallonia: true, streetVerified: true, houseVerified: false },
      },
    },
  })
  assert.equal(plausibleLead.phone.tier, "plausible")
  assert.match(plausibleLead.phone.shortLabel, /sans SMS/i)
  assert.equal(/vérifié/i.test(plausibleLead.phone.shortLabel), false)
  assert.equal(plausibleLead.email.tier, "plausible")
  assert.match(plausibleLead.email.shortLabel, /non confirmé/i)
  assert.equal(/vérifié/i.test(plausibleLead.email.shortLabel), false)
  assert.equal(plausibleLead.address.tier, "plausible")

  // Vérification stricte : zéro jargon développeur dans les libellés installateurs
  const b2bFormatDeliveredLead = display.getLeadVerificationSummary({
    segment: "B2B",
    phone: "+32495256301",
    email: "contact@pme.be",
    postal_code: "4000",
    company_vat: "BE0403170701",
    email_delivery_status: "delivered",
    qualification_metadata: {
      verifications: {
        emailDelivery: { status: "delivered" },
      },
    },
  })
  const b2bEmailFormatOnlyLead = display.getLeadVerificationSummary({
    segment: "B2C",
    phone: "+32495256301",
    email: "client@skynet.be",
    postal_code: "5000",
  })
  const devJargonRegex = /\b(otp|lookup|mx|mod\s?97|modulo|icar|syntax|rebond)\b/i
  for (const s of [verifiedLead, plausibleLead, b2bFormatDeliveredLead, b2bEmailFormatOnlyLead]) {
    for (const badge of [s.phone, s.email, s.address, ...(s.company ? [s.company] : [])]) {
      for (const lbl of [badge.compactLabel, badge.shortLabel, badge.detailLabel]) {
        if (lbl) {
          assert.equal(devJargonRegex.test(lbl), false, `Jargon développeur détecté dans "${lbl}"`)
        }
      }
    }
  }

  // 3. Donnée fausse / rebond SMTP : aucun badge positif
  const suspectLead = display.getLeadVerificationSummary({
    segment: "B2C",
    phone: "+32470102030",
    email: "fake@yopmail.com",
    postal_code: "1780",
    email_delivery_status: "bounced",
    qualification_metadata: {
      verifications: {
        emailMx: { valid: false, isDisposable: true },
        emailDelivery: { status: "bounced" },
        walloniaAddress: { postalMismatch: true },
      },
    },
  })
  assert.equal(suspectLead.phone.tier, "none")
  assert.equal(suspectLead.phone.shortLabel, null)
  assert.equal(suspectLead.email.tier, "none")
  assert.equal(suspectLead.email.shortLabel, null)
  assert.equal(suspectLead.address.tier, "none")
  assert.equal(suspectLead.verifiedCount, 0)
  assert.equal(suspectLead.plausibleCount, 0)

  // 4. Token HMAC confirmation e-mail 1-clic & rendu dans l'e-mail
  const tok = confirmEmail.createProspectEmailVerifyToken("lead-uuid-1", "Jean@Gmail.com")
  assert.equal(confirmEmail.verifyProspectEmailVerifyToken("lead-uuid-1", "jean@gmail.com", tok), true)
  assert.equal(confirmEmail.verifyProspectEmailVerifyToken("lead-uuid-2", "jean@gmail.com", tok), false)

  const built = confirmEmail.buildProspectConfirmationEmail({
    leadId: "lead-uuid-1",
    email: "jean@gmail.com",
    firstName: "Jean",
    segment: "B2C",
    surfaceArea: 50,
    estimatedSavings: 1450,
    estimatedROIYears: 5.2,
  })
  assert.match(built.html, /\/api\/leads\/verify-email\?id=lead-uuid-1&(?:amp;)?token=/)
  assert.match(built.text, /\/api\/leads\/verify-email\?id=lead-uuid-1&token=/)
  assert.match(built.html, /de votre côté/i)
  assert.match(built.html, /mise en concurrence/i)
  assert.match(built.html, /meilleur prix/i)
  assert.match(built.html, /sans aucune contrepartie sur la qualité/i)
  assert.match(built.html, /Tier-1/i)
  assert.match(built.html, /RESCERT/)
  assert.match(built.text, /de votre côté/i)
  assert.match(built.text, /mise en concurrence/i)
  assert.match(built.text, /meilleur prix/i)
  assert.match(built.text, /sans aucune contrepartie sur la qualité/i)
  assert.equal(/<code>/i.test(built.html), false)
  assert.equal(/Fabrice Remacle/i.test(built.html), false)
  assert.equal(/Fabrice Remacle/i.test(built.text), false)
  assert.match(built.html, /INIT42 \(Nathan Remacle\)/)
  assert.match(built.text, /INIT42 \(Nathan Remacle\)/)
})

test("Soft OTP & Politique de Litiges alignée : non-bloquant à la soumission, délai 24h injoignable, written_first et seuil 8 %", () => {
  // 1. Contrat Soft OTP : app/api/leads/route.ts ne bloque plus avec requirePhoneOtp: true
  const leadsApiSrc = fs.readFileSync(
    path.join(__dirname, "..", "app", "api", "leads", "route.ts"),
    "utf8"
  )
  assert.equal(/requirePhoneOtp:\s*true/.test(leadsApiSrc), false)

  const verifyApiSrc = fs.readFileSync(
    path.join(__dirname, "..", "app", "api", "leads", "phone-otp", "verify", "route.ts"),
    "utf8"
  )
  assert.match(verifyApiSrc, /phone_verified:\s*true/)

  // 2. Politique de litiges : 24h minimum pour 'unreachable', immédiat pour 'wrong_number' / 'already_equipped'
  const now = Date.UTC(2026, 10, 18, 12, 0, 0)
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString()
  const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000).toISOString()
  const elevenDaysAgo = new Date(now - 11 * 24 * 60 * 60 * 1000).toISOString()
  const validDetails = "Appelé le 18/11 à 10h, 15h et 19/11 à 11h + SMS envoyé sans réponse."
  const validWrongNumberDetails =
    "Appelé le 18/11 à 10h15, message opérateur numéro non attribué et e-mail en erreur."

  const tooEarlyUnreachable = disputesPolicy.checkDisputeEligibility({
    reason: "unreachable",
    purchasedAt: twoHoursAgo,
    nowMs: now,
    details: validDetails,
    contactPreference: "written_first",
    diligenceConfirmed: true,
  })
  assert.equal(tooEarlyUnreachable.eligible, false)
  assert.equal(tooEarlyUnreachable.code, "TOO_EARLY_FOR_UNREACHABLE")
  assert.equal(tooEarlyUnreachable.remainingHoursForUnreachable, 22)
  assert.match(tooEarlyUnreachable.error, /Approche écrite d'abord/)

  const immediateWrongNumber = disputesPolicy.checkDisputeEligibility({
    reason: "wrong_number",
    purchasedAt: twoHoursAgo,
    nowMs: now,
    details: validWrongNumberDetails,
    wrongNumberProof: "operator_unassigned",
    requireWrongNumberProof: true,
  })
  assert.equal(immediateWrongNumber.eligible, true)

  // Garde-fou anti-contournement : "Ne répond pas après 6 appelés" sous wrong_number doit être bloqué
  const misclassifiedWrongNumber = disputesPolicy.checkDisputeEligibility({
    reason: "wrong_number",
    purchasedAt: twoHoursAgo,
    nowMs: now,
    details: "Ne répond pas après 6 appelés",
    contactPreference: "written_first",
    wrongNumberProof: "operator_unassigned",
    requireWrongNumberProof: true,
    phoneVerified: true,
    wrongNumberVerifiedAck: true,
  })
  assert.equal(misclassifiedWrongNumber.eligible, false)
  assert.equal(misclassifiedWrongNumber.code, "MISCLASSIFIED_UNREACHABLE")
  assert.match(misclassifiedWrongNumber.error, /Écrit d'abord/)

  const missingProofWrongNumber = disputesPolicy.checkDisputeEligibility({
    reason: "wrong_number",
    purchasedAt: twoHoursAgo,
    nowMs: now,
    details: validWrongNumberDetails,
    requireWrongNumberProof: true,
  })
  assert.equal(missingProofWrongNumber.eligible, false)
  assert.equal(missingProofWrongNumber.code, "WRONG_NUMBER_PROOF_REQUIRED")

  const missingOtpAckWrongNumber = disputesPolicy.checkDisputeEligibility({
    reason: "wrong_number",
    purchasedAt: twoHoursAgo,
    nowMs: now,
    details: validWrongNumberDetails,
    wrongNumberProof: "operator_unassigned",
    requireWrongNumberProof: true,
    phoneVerified: true,
    wrongNumberVerifiedAck: false,
  })
  assert.equal(missingOtpAckWrongNumber.eligible, false)
  assert.equal(missingOtpAckWrongNumber.code, "WRONG_NUMBER_VERIFIED_ACK_REQUIRED")

  const validOtpAckWrongNumber = disputesPolicy.checkDisputeEligibility({
    reason: "wrong_number",
    purchasedAt: twoHoursAgo,
    nowMs: now,
    details: validWrongNumberDetails,
    wrongNumberProof: "operator_unassigned",
    requireWrongNumberProof: true,
    phoneVerified: true,
    wrongNumberVerifiedAck: true,
  })
  assert.equal(validOtpAckWrongNumber.eligible, true)

  // Garde-fou exclusions Art. 5.4 CGV sous motif 'other'
  for (const excludedText of [
    "La personne a changé d avis ne veut plus installer de panneaux.",
    "Le prospect trouve le devis trop cher et refuse le devis.",
    "Présence d'amiante découverte sur la toiture lors de la visite.",
  ]) {
    const resArt54 = disputesPolicy.checkDisputeEligibility({
      reason: "other",
      purchasedAt: twoHoursAgo,
      nowMs: now,
      details: excludedText,
    })
    assert.equal(resArt54.eligible, false, `Aurait dû bloquer Art. 5.4 : ${excludedText}`)
    assert.equal(resArt54.code, "EXCLUDED_BY_ART_5_4")
  }

  const validOtherAnomaly = disputesPolicy.checkDisputeEligibility({
    reason: "other",
    purchasedAt: twoHoursAgo,
    nowMs: now,
    details: "Fausse identité manifeste sur la fiche : nom et adresse totalement incohérents.",
  })
  assert.equal(validOtherAnomaly.eligible, true)

  const missingDiligence = disputesPolicy.checkDisputeEligibility({
    reason: "unreachable",
    purchasedAt: thirtyHoursAgo,
    nowMs: now,
    details: validDetails,
    contactPreference: "written_first",
    diligenceConfirmed: false,
  })
  assert.equal(missingDiligence.eligible, false)
  assert.equal(missingDiligence.code, "DILIGENCE_NOT_CONFIRMED")

  const okUnreachable = disputesPolicy.checkDisputeEligibility({
    reason: "unreachable",
    purchasedAt: thirtyHoursAgo,
    nowMs: now,
    details: validDetails,
    contactPreference: "written_first",
    diligenceConfirmed: true,
  })
  assert.equal(okUnreachable.eligible, true)

  const expiredWindow = disputesPolicy.checkDisputeEligibility({
    reason: "wrong_number",
    purchasedAt: elevenDaysAgo,
    nowMs: now,
    details: validDetails,
  })
  assert.equal(expiredWindow.eligible, false)
  assert.equal(expiredWindow.code, "WINDOW_EXPIRED")

  // 3. Calcul anti-abus 30 jours (> 8 % avec >= 2 litiges sur 30j)
  const stats = disputesPolicy.computePartnerDisputeStats30d({
    nowMs: now,
    purchases: [
      ...Array.from({ length: 10 }, (_, i) => ({
        partner_id: "p-abuser",
        purchased_at: new Date(now - (i + 1) * 86400000).toISOString(),
      })),
      {
        partner_id: "p-new-partner",
        purchased_at: twoHoursAgo,
      },
      ...Array.from({ length: 20 }, (_, i) => ({
        partner_id: "p-clean",
        purchased_at: new Date(now - (i + 1) * 86400000).toISOString(),
      })),
    ],
    disputes: [
      { partner_id: "p-abuser", status: "pending", created_at: twoHoursAgo },
      { partner_id: "p-abuser", status: "approved", created_at: thirtyHoursAgo },
      // 1 seul achat / 1 litige ne déclenche pas d'alerte fausse sur un nouveau compte
      { partner_id: "p-new-partner", status: "pending", created_at: twoHoursAgo },
      // 1/20 = 5% <= 8%
      { partner_id: "p-clean", status: "approved", created_at: thirtyHoursAgo },
    ],
  })

  const abuser = stats.get("p-abuser")
  assert.equal(abuser.purchases30d, 10)
  assert.equal(abuser.disputes30d, 2)
  assert.equal(abuser.disputeRatePct, 20)
  assert.equal(abuser.exceedsAbuseThreshold, true)

  const newbie = stats.get("p-new-partner")
  assert.equal(newbie.disputeRatePct, 100)
  assert.equal(newbie.exceedsAbuseThreshold, false)

  const clean = stats.get("p-clean")
  assert.equal(clean.disputeRatePct, 5)
  assert.equal(clean.exceedsAbuseThreshold, false)
})

test("Diagnostic téléphonique 2 couches (Lookup vs SMS/Appel OTP) : tous les statuts sans ambiguïté", () => {
  // 1. Cas Didier Dumont : Lookup ORANGE Belgium + SMS OTP validé en +56 s
  const dumontDiag = display.getPhoneVerificationDiagnostic({
    segment: "B2C",
    phone: "+32491148065",
    created_at: "2026-11-19T17:30:20.178Z",
    phone_verified: true,
    phone_verified_at: "2026-11-19T17:31:16.381Z",
    phone_verification_method: "twilio_sms",
    phone_carrier: "ORANGE Belgium (MOBISTAR)",
    phone_line_type: "mobile",
    qualification_metadata: {
      verifications: {
        twilioLookup: {
          configured: true,
          valid: true,
          lineType: "mobile",
          carrierName: "ORANGE Belgium (MOBISTAR)",
          checkedAt: "2026-11-19T17:30:20.000Z",
        },
        phoneOtp: {
          verified: true,
          status: "verified",
          channel: "sms",
          sentAt: "2026-11-19T17:30:20.381Z",
          verifiedAt: "2026-11-19T17:31:16.381Z",
        },
      },
    },
  })
  assert.equal(dumontDiag.lookup.status, "valid")
  assert.equal(dumontDiag.lookup.lineTypeLabel, "Mobile")
  assert.match(dumontDiag.lookup.detailText, /ORANGE Belgium/)
  assert.equal(dumontDiag.otp.verified, true)
  assert.equal(dumontDiag.otp.status, "verified")
  assert.equal(dumontDiag.otp.delaySeconds, 56)
  assert.match(dumontDiag.otp.detailText, /\+56 s/)
  assert.equal(dumontDiag.overallBadge.text, "SMS OTP vérifié")
  assert.equal(dumontDiag.overallBadge.tone, "success")

  // 2. Appel vocal OTP vérifié
  const callDiag = display.getPhoneVerificationDiagnostic({
    segment: "B2C",
    phone: "+3243669111",
    phone_verified: true,
    phone_verification_method: "twilio_call",
    qualification_metadata: {
      verifications: {
        twilioLookup: { configured: true, valid: true, lineType: "landline", carrierName: "Proximus" },
        phoneOtp: { verified: true, status: "verified", channel: "call", verifiedAt: "2026-11-19T10:00:30Z" },
      },
    },
  })
  assert.equal(callDiag.lookup.lineTypeLabel, "Fixe")
  assert.equal(callDiag.otp.badgeText, "Appel OTP vérifié")

  // 3. SMS bien envoyé, prospect n'a pas encore saisi le code (sent_pending)
  const pendingDiag = display.getPhoneVerificationDiagnostic({
    segment: "B2C",
    phone: "+32495256301",
    phone_verified: false,
    qualification_metadata: {
      verifications: {
        twilioLookup: { configured: true, valid: true, lineType: "mobile", carrierName: "TELENET n.v." },
        phoneOtp: { verified: false, status: "sent_pending", channel: "sms", sentAt: "2026-11-19T14:00:00Z", verifyFailedAttempts: 2 },
      },
    },
  })
  assert.equal(pendingDiag.otp.isTechnicalFailure, false)
  assert.equal(pendingDiag.otp.isProspectNotValidated, true)
  assert.match(pendingDiag.otp.detailText, /SMS OTP bien envoyé/)
  assert.match(pendingDiag.otp.detailText, /2 essai/)
  assert.equal(pendingDiag.overallBadge.text, "Lookup seul · SMS non validé")

  // 4. Prospect a cliqué "Continuer sans confirmer" après envoi SMS réussi
  const skippedDiag = display.getPhoneVerificationDiagnostic({
    segment: "B2C",
    phone: "+32495256301",
    qualification_metadata: {
      verifications: {
        twilioLookup: { configured: true, valid: true, lineType: "mobile", carrierName: "Proximus" },
        phoneOtp: {
          verified: false,
          status: "skipped_by_prospect",
          channel: "sms",
          sentAt: "2026-11-19T14:00:00Z",
          skippedAt: "2026-11-19T14:00:45Z",
        },
      },
    },
  })
  assert.equal(skippedDiag.otp.isTechnicalFailure, false)
  assert.equal(skippedDiag.otp.isProspectNotValidated, true)
  assert.match(skippedDiag.otp.detailText, /Continuer sans confirmer/)
  assert.equal(skippedDiag.overallBadge.text, "Lookup seul · SMS ignoré")

  // 5. Prospect a cliqué "Continuer sans confirmer" après échec technique Twilio -> reste classé échec technique
  const skippedAfterFailDiag = display.getPhoneVerificationDiagnostic({
    segment: "B2C",
    phone: "+32495256301",
    qualification_metadata: {
      verifications: {
        twilioLookup: { configured: true, valid: true, lineType: "mobile", carrierName: "Proximus" },
        phoneOtp: {
          verified: false,
          status: "skipped_by_prospect",
          failedAt: "2026-11-19T14:00:02Z",
          twilioCode: 21608,
          error: "Compte Twilio en attente de validation TrustHub",
        },
      },
    },
  })
  assert.equal(skippedAfterFailDiag.otp.isTechnicalFailure, true)
  assert.equal(skippedAfterFailDiag.otp.twilioCode, 21608)
  assert.equal(skippedAfterFailDiag.overallBadge.text, "Lookup seul · Échec SMS")

  // 6. Échec technique send_failed, rate_limited, not_configured, not_attempted_voip, awaiting_send, transientError Lookup
  const sendFailedDiag = display.getPhoneVerificationDiagnostic({
    phone: "+32495256301",
    qualification_metadata: {
      verifications: {
        twilioLookup: { configured: true, valid: true, transientError: true },
        phoneOtp: { verified: false, status: "send_failed", twilioCode: 60200, error: "Numéro injoignable" },
      },
    },
  })
  assert.equal(sendFailedDiag.lookup.status, "transient_error")
  assert.equal(sendFailedDiag.otp.isTechnicalFailure, true)
  assert.match(sendFailedDiag.otp.badgeText, /#60200/)

  const rateLimitedDiag = display.getPhoneVerificationDiagnostic({
    phone: "+32495256301",
    qualification_metadata: {
      verifications: {
        phoneOtp: { verified: false, status: "rate_limited", error: "Trop de demandes" },
      },
    },
  })
  assert.equal(rateLimitedDiag.otp.status, "rate_limited")
  assert.match(rateLimitedDiag.otp.badgeText, /rate limit/i)

  const notConfDiag = display.getPhoneVerificationDiagnostic({
    phone: "+32495256301",
    qualification_metadata: { verifications: { phoneOtp: { verified: false, status: "not_configured" } } },
  })
  assert.equal(notConfDiag.otp.isTechnicalFailure, true)

  const voipDiag = display.getPhoneVerificationDiagnostic({
    phone: "+32495256301",
    qualification_metadata: { verifications: { phoneOtp: { verified: false, status: "not_attempted_voip" } } },
  })
  assert.match(voipDiag.otp.badgeText, /VoIP/)

  const awaitingDiag = display.getPhoneVerificationDiagnostic({
    phone: "+32495256301",
    qualification_metadata: { verifications: { phoneOtp: { verified: false, status: "awaiting_send" } } },
  })
  assert.equal(awaitingDiag.otp.isProspectNotValidated, true)

  // 7. Vérification Summary : Lookup transientError ne doit JAMAIS produire "Ligne active"
  const transientSummary = display.getLeadVerificationSummary({
    segment: "B2C",
    phone: "+32495256301",
    qualification_metadata: {
      verifications: {
        twilioLookup: { valid: true, transientError: true, carrierName: "Fake" },
      },
    },
  })
  assert.equal(transientSummary.phone.tier, "plausible")
  assert.equal(transientSummary.phone.compactLabel, "Numéro valide (sans SMS)")

  const lookupOnlySummary = display.getLeadVerificationSummary({
    segment: "B2C",
    phone: "+32495256301",
    qualification_metadata: {
      verifications: {
        twilioLookup: { valid: true, carrierName: "Proximus" },
      },
    },
  })
  assert.equal(lookupOnlySummary.phone.compactLabel, "Ligne active (sans SMS)")
  assert.match(lookupOnlySummary.phone.shortLabel, /sans SMS/)

  const smsVerifiedSummary = display.getLeadVerificationSummary({
    segment: "B2C",
    phone: "+32495256301",
    phone_verified: true,
    phone_verification_method: "twilio_sms",
    phone_carrier: "Proximus",
  })
  assert.equal(smsVerifiedSummary.phone.tier, "verified")
  assert.equal(smsVerifiedSummary.phone.compactLabel, "Tél. vérifié SMS")
})

test("E-mails Admin & Installateur : clarté Lookup vs SMS OTP, alertes techniques, conformité charte", () => {
  // 1. E-mail Admin cas échec technique SMS -> alerte critique + objet [ATTENTION] + 2 lignes Lookup/OTP
  const failedAdminMail = notifyAdmin.buildAdminLeadAlertEmail({
    leadId: "0ea4c999-656b-4dfa-b1d2-a211692bf331",
    firstName: "Didier",
    lastName: "Dumont",
    email: "didier.dumont@hotmail.com",
    phone: "+32491148065",
    segment: "B2C",
    postalCode: "7000",
    city: "Mons",
    province: "hainaut",
    siteAddress: "Rue Massart 101",
    surfaceArea: 45,
    annualBill: 2200,
    leadScore: 60,
    creditCost: 3,
    verifications: {
      emailMx: { valid: true, isDisposable: false, domain: "hotmail.com", mxServers: ["mx.hotmail.com"] },
      twilioLookup: { configured: true, valid: true, lineType: "mobile", carrierName: "ORANGE Belgium (MOBISTAR)" },
      phoneOtp: { verified: false, status: "send_failed", channel: "sms", twilioCode: 21608, error: "Restriction TrustHub" },
    },
  })
  assert.match(failedAdminMail.subject, /^\[ATTENTION \d+ ALERTE/)
  assert.match(failedAdminMail.html, /Contrôle Lookup/)
  assert.match(failedAdminMail.html, /Vérification SMS \/ Appel/)
  assert.match(failedAdminMail.html, /ORANGE Belgium/)
  assert.match(failedAdminMail.html, /#21608/)
  assert.match(failedAdminMail.html, /Google Earth/)
  assert.match(failedAdminMail.html, /WalOnMap/)
  assert.equal(/Street View/i.test(failedAdminMail.html), false)
  assert.match(failedAdminMail.text, /Contrôle opérateur \(Lookup\)/)
  assert.match(failedAdminMail.text, /Vérification SMS\/Appel \(OTP\)/)
  assert.equal(/<code>/i.test(failedAdminMail.html), false)
  assert.equal(/Fabrice Remacle/i.test(failedAdminMail.html), false)

  // 2. E-mail Admin confirmation SMS tardive
  const lateOtpMail = notifyAdmin.buildAdminLeadOtpConfirmedEmail({
    leadId: "0ea4c999-656b-4dfa-b1d2-a211692bf331",
    firstName: "Didier",
    lastName: "Dumont",
    email: "didier.dumont@hotmail.com",
    phone: "+32491148065",
    phoneVerified: true,
    phoneVerifiedAt: "2026-11-19T17:31:16.381Z",
    phoneVerificationMethod: "twilio_sms",
    phoneCarrier: "ORANGE Belgium (MOBISTAR)",
    phoneLineType: "mobile",
    createdAt: "2026-11-19T17:30:20.178Z",
    segment: "B2C",
    postalCode: "7000",
    city: "Mons",
    leadScore: 75,
    creditCost: 3,
  })
  assert.match(lateOtpMail.subject, /SMS OTP vérifié/)
  assert.match(lateOtpMail.html, /75\/100/)
  assert.match(lateOtpMail.html, /\+56 s/)
  assert.equal(/<code>/i.test(lateOtpMail.html), false)

  // 3. E-mail Installateur Teaser : distinction claire SMS vérifié vs Lookup seul sans SMS
  const financials = pricing.calculateMarketplaceFinancials({
    segment: "B2C",
    surfaceArea: 45,
    surfaceType: "toiture",
    annualBill: 2200,
    creditCost: 3,
  })
  const baseLead = {
    id: "0ea4c999-656b-4dfa-b1d2-a211692bf331",
    segment: "B2C",
    province: "hainaut",
    postalCode: "7000",
    city: "Mons",
    surfaceType: "toiture",
    surfaceArea: 45,
    annualElectricityBill: 2200,
    phone: "+32491148065",
    firstName: "Didier",
    lastName: "Dumont",
    createdAt: "2026-11-19T17:30:20.178Z",
  }
  const verifiedTeaser = installerTeaser.renderInstallerLeadTeaserEmail({
    partner: { id: "p-1", companyName: "Solaire Mons SRL", credits: 10 },
    lead: {
      ...baseLead,
      phoneVerified: true,
      phoneVerificationMethod: "twilio_sms",
      phoneCarrier: "ORANGE Belgium (MOBISTAR)",
    },
    waveNumber: 1,
    takenSlots: 0,
    maxSlots: 3,
    creditCost: 3,
    financials,
  })
  assert.match(verifiedTeaser.html, /Téléphone vérifié par SMS/)
  assert.match(verifiedTeaser.text, /Téléphone vérifié par SMS/)
  assert.equal(/\b(otp|lookup|mx|mod\s?97|modulo|icar)\b/i.test(verifiedTeaser.html), false)
  assert.equal(/\b(otp|lookup|mx|mod\s?97|modulo|icar)\b/i.test(verifiedTeaser.text), false)

  const lookupTeaser = installerTeaser.renderInstallerLeadTeaserEmail({
    partner: { id: "p-1", companyName: "Solaire Mons SRL", credits: 10 },
    lead: {
      ...baseLead,
      phoneVerified: false,
      phoneVerificationMethod: "twilio_lookup",
      phoneCarrier: "ORANGE Belgium (MOBISTAR)",
    },
    waveNumber: 1,
    takenSlots: 0,
    maxSlots: 3,
    creditCost: 3,
    financials,
  })
  assert.match(lookupTeaser.html, /Ligne active · sans SMS/)
  assert.match(lookupTeaser.text, /Ligne active · sans SMS/)
  assert.equal(/Téléphone vérifié/i.test(lookupTeaser.html), false)
  assert.equal(/\b(otp|lookup|mx|mod\s?97|modulo|icar)\b/i.test(lookupTeaser.html), false)
  assert.equal(/\b(otp|lookup|mx|mod\s?97|modulo|icar)\b/i.test(lookupTeaser.text), false)
})

test("buildMapLinks : deep-links directs Maps, Google Earth et WalOnMap par coordonnées SPW ICAR et fallbacks", () => {
  // 1. Avec coordonnées SPW ICAR exactes (Rue Max Houben 5, 4800 Lambermont)
  const withCoords = addressSpw.buildMapLinks({
    streetAddress: "Rue Max Houben 5",
    postalCode: "4800",
    city: "Lambermont",
    coordinates: { lat: 50.58715549461765, lng: 5.826576687520938 },
  })
  assert.equal(
    withCoords.googleMapsUrl,
    "https://www.google.com/maps/search/?api=1&query=50.5871555,5.8265767"
  )
  assert.equal(
    withCoords.googleEarthUrl,
    "https://earth.google.com/web/search/50.5871555,5.8265767"
  )
  assert.equal(
    withCoords.walOnMapUrl,
    "https://geoportail.wallonie.be/carte#COOR=50.5871555,5.8265767,4326|SHOW=true"
  )

  // 2. Sans coordonnées mais avec adresse complète -> fallback recherche par adresse
  const withoutCoords = addressSpw.buildMapLinks({
    streetAddress: "Rue Max Houben 5",
    postalCode: "4800",
    city: "Lambermont",
    coordinates: null,
  })
  assert.equal(
    withoutCoords.googleMapsUrl,
    "https://www.google.com/maps/search/?api=1&query=Rue%20Max%20Houben%205%2C%204800%2C%20Lambermont%2C%20Belgique"
  )
  assert.equal(
    withoutCoords.googleEarthUrl,
    "https://earth.google.com/web/search/Rue%20Max%20Houben%205%2C%204800%2C%20Lambermont%2C%20Belgique"
  )
  assert.equal(
    withoutCoords.walOnMapUrl,
    "https://geoportail.wallonie.be/carte#ADR=Rue%20Max%20Houben%205%204800%20Lambermont|SHOW=true"
  )

  // 3. Entrées vides -> fallback propre vers la racine WalOnMap / Wallonie
  const empty = addressSpw.buildMapLinks({})
  assert.equal(
    empty.googleMapsUrl,
    "https://www.google.com/maps/search/?api=1&query=Wallonie%2C%20Belgique"
  )
  assert.equal(
    empty.googleEarthUrl,
    "https://earth.google.com/web/search/Wallonie%2C%20Belgique"
  )
  assert.equal(empty.walOnMapUrl, "https://geoportail.wallonie.be/carte")

  // 4. Coordonnées de niveau "street" / "locality" -> ignorées (jamais de centroïde de rue sur Maps/WalOnMap)
  const streetPrecision = addressSpw.buildMapLinks({
    streetAddress: "Rue du Centre 33/2",
    postalCode: "5170",
    city: "Lesve",
    coordinates: { lat: 50.3703345, lng: 4.7685551 },
    coordinatesPrecision: "street",
  })
  assert.equal(
    streetPrecision.googleMapsUrl,
    "https://www.google.com/maps/search/?api=1&query=Rue%20du%20Centre%2033%2F2%2C%205170%2C%20Lesve%2C%20Belgique"
  )
  assert.equal(
    streetPrecision.walOnMapUrl,
    "https://geoportail.wallonie.be/carte#ADR=Rue%20du%20Centre%2033%2F2%205170%20Lesve|SHOW=true"
  )
})

test("verifyWalloniaAddressStrict : ne retourne jamais street.geometry quand house.geometry manque (ancrage SPW + OSM + interpolation)", async () => {
  const originalFetch = globalThis.fetch
  const mkResp = (body, ok = true) => ({
    ok,
    status: ok ? 200 : 500,
    async json() {
      return body
    },
  })

  try {
    // Cas 1 : SPW confirme le n° 33 sans house.geometry (Rue du Centre 33/2, 5170 Lesve) -> OSM ancré SPW validé
    globalThis.fetch = async (url) => {
      const u = String(url)
      if (u.includes("/geolist?zone=5170&street=*")) {
        return mkResp({
          candidates: [
            {
              city: { ident: "92101", name: "Profondeville" },
              zone: { ident: "5170", name: "Lesve" },
              street: { ident: 7754984, name: "Rue du Centre" },
            },
          ],
        })
      }
      if (u.includes("/geocode?")) {
        return mkResp({
          candidates: [
            {
              score: 112,
              city: { ident: "92101", name: "Profondeville" },
              zone: { ident: "5170", name: "Lesve" },
              street: {
                ident: 7754984,
                name: "Rue du Centre",
                geometry: { type: "Point", coordinates: [4.7685551, 50.3703345] }, // centroïde dans les champs !
              },
              house: { ident: 411034, name: "33", rrn: "4801" }, // PAS de house.geometry !
            },
          ],
        })
      }
      if (u.includes("/geolist?street=7754984")) {
        return mkResp({
          candidates: [
            {
              house: { name: "31", geometry: { coordinates: [4.7779819, 50.3761059] } },
            },
            {
              house: { name: "35", geometry: { coordinates: [4.7770101, 50.3753542] } },
            },
          ],
        })
      }
      if (u.includes("photon.komoot.io")) {
        return mkResp({
          features: [
            // Mauvais résultat hors CP (5537) qui doit être rejeté
            {
              properties: {
                countrycode: "BE",
                postcode: "5537",
                street: "Rue du Centre",
                housenumber: "33",
              },
              geometry: { coordinates: [4.8410914, 50.3037686] },
            },
            // Bon bâtiment dans 5170 Lesve juste entre SPW 31 et 35
            {
              properties: {
                countrycode: "BE",
                postcode: "5170",
                street: "Rue du Centre",
                housenumber: "33",
              },
              geometry: { coordinates: [4.777221, 50.375473] },
            },
          ],
        })
      }
      return mkResp({}, false)
    }

    const res = await addressSpw.verifyWalloniaAddressStrict({
      postalCode: "5170",
      city: "Lesve",
      streetAddress: "Rue du Centre 33/2",
    })
    assert.equal(res.houseVerified, true)
    assert.equal(res.coordinatesPrecision, "house")
    assert.equal(res.coordinatesSource, "OSM_BUILDING_SPW_ANCHORED")
    assert.ok(res.coordinates)
    assert.ok(Math.abs(res.coordinates.lat - 50.375473) < 1e-5)
    assert.ok(Math.abs(res.coordinates.lng - 4.777221) < 1e-5)
    assert.notEqual(Number(res.coordinates.lat.toFixed(4)), 50.3703)
    assert.match(res.googleMapsUrl, /50\.375473,4\.777221/)

    // Cas 2 : Même situation mais OSM ne trouve rien -> interpolation entre SPW 31 et 35
    const freshSpw = loadTs("lib/address-spw.ts")
    globalThis.fetch = async (url) => {
      const u = String(url)
      if (u.includes("/geolist?zone=5170&street=*")) {
        return mkResp({
          candidates: [
            {
              city: { ident: "92101", name: "Profondeville" },
              zone: { ident: "5170", name: "Lesve" },
              street: { ident: 7754984, name: "Rue du Centre" },
            },
          ],
        })
      }
      if (u.includes("/geocode?")) {
        return mkResp({
          candidates: [
            {
              score: 112,
              city: { ident: "92101", name: "Profondeville" },
              zone: { ident: "5170", name: "Lesve" },
              street: {
                ident: 7754984,
                name: "Rue du Centre",
                geometry: { type: "Point", coordinates: [4.7685551, 50.3703345] },
              },
              house: { ident: 411034, name: "33", rrn: "4801" },
            },
          ],
        })
      }
      if (u.includes("/geolist?street=7754984")) {
        return mkResp({
          candidates: [
            { house: { name: "31", geometry: { coordinates: [4.7779819, 50.3761059] } } },
            { house: { name: "35", geometry: { coordinates: [4.7770101, 50.3753542] } } },
          ],
        })
      }
      if (u.includes("photon.komoot.io") || u.includes("nominatim.openstreetmap.org")) {
        return mkResp({ features: [] })
      }
      return mkResp({}, false)
    }

    const interp = await freshSpw.verifyWalloniaAddressStrict({
      postalCode: "5170",
      city: "Lesve",
      streetAddress: "Rue du Centre 33/2",
    })
    assert.equal(interp.coordinatesPrecision, "interpolated")
    assert.equal(interp.coordinatesSource, "SPW_NEIGHBORS_INTERPOLATED")
    assert.ok(interp.coordinates)
    assert.ok(interp.coordinates.lat > 50.3753 && interp.coordinates.lat < 50.3762)
    assert.ok(interp.coordinates.lng > 4.777 && interp.coordinates.lng < 4.778)
  } finally {
    globalThis.fetch = originalFetch
  }
})



