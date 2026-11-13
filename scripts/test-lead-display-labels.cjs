const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")

function loadTs(relPath, mocks = {}) {
  const fullPath = path.join(__dirname, "..", relPath)
  const source = fs.readFileSync(fullPath, "utf8")
  const context = {
    exports: {},
    module: { exports: {} },
    console,
    process,
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

function extractArrayBlock(source, varName) {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\](?:\\s+as\\s+const)?`, "m")
  const match = source.match(re)
  assert.ok(match, `Impossible de trouver le tableau ${varName}`)
  return match[1]
}

function extractPropValues(block, propName) {
  const re = new RegExp(`${propName}:\\s*["']([^"']+)["']`, "g")
  const values = []
  let m
  while ((m = re.exec(block)) !== null) {
    values.push(m[1])
  }
  assert.ok(values.length > 0, `Aucune valeur trouvée pour ${propName}`)
  return values
}

const helpers = loadTs("lib/lead-display-helpers.ts")

function assertHumanReadableLabel(label, rawKey, contextName) {
  assert.equal(typeof label, "string", `${contextName} (${rawKey}) doit retourner une string`)
  assert.ok(label.trim().length > 0, `${contextName} (${rawKey}) ne doit pas être vide`)
  assert.ok(
    /^[A-ZÀ-ÖØ-Þ0-9<>]/.test(label),
    `${contextName} (${rawKey}) doit commencer par une majuscule, un chiffre ou </> : "${label}"`
  )
  assert.ok(
    !label.includes("_"),
    `${contextName} (${rawKey}) contient un underscore interdit : "${label}"`
  )
  assert.ok(
    !/^(lt|gt)\s+\d+/i.test(label),
    `${contextName} (${rawKey}) affiche un préfixe technique brut : "${label}"`
  )
}

test("Contrat B2C Landing (devis-landing-client.tsx) : 100% des clés sont mappées proprement", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "app/devis-panneaux-solaires/devis-landing-client.tsx"),
    "utf8"
  )

  for (const id of extractPropValues(extractArrayBlock(src, "CONSUMPTION_OPTIONS"), "id")) {
    assert.ok(Object.hasOwn(helpers.CONSUMPTION_LABELS, id), `CONSUMPTION_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getConsumptionLabel(id), id, "CONSUMPTION_OPTIONS")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "PROPERTY_TYPES"), "id")) {
    assert.ok(Object.hasOwn(helpers.PROPERTY_TYPE_LABELS, id), `PROPERTY_TYPE_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getPropertyTypeLabel(id), id, "PROPERTY_TYPES")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "OWNERSHIP_OPTIONS"), "id")) {
    assert.ok(Object.hasOwn(helpers.OWNERSHIP_LABELS, id), `OWNERSHIP_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getOwnershipLabel(id), id, "OWNERSHIP_OPTIONS")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "ROOF_OPTIONS"), "id")) {
    assert.ok(Object.hasOwn(helpers.ROOF_MATERIAL_LABELS, id), `ROOF_MATERIAL_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getRoofMaterialLabel(id), id, "ROOF_OPTIONS")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "ROOF_SURFACES"), "id")) {
    assert.ok(Object.hasOwn(helpers.ROOF_SURFACE_LABELS, id), `ROOF_SURFACE_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getRoofSurfaceLabel(id), id, "ROOF_SURFACES")
  }
})

test("Contrat Simulateur B2C (b2c-simulator.tsx) : 100% des clés sont mappées proprement", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "components/b2c-simulator.tsx"),
    "utf8"
  )

  for (const id of extractPropValues(extractArrayBlock(src, "OWNERSHIP_OPTIONS"), "id")) {
    assert.ok(Object.hasOwn(helpers.OWNERSHIP_LABELS, id), `OWNERSHIP_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getOwnershipLabel(id), id, "b2c OWNERSHIP_OPTIONS")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "ROOF_TYPES"), "id")) {
    assert.ok(Object.hasOwn(helpers.ROOF_MATERIAL_LABELS, id), `ROOF_MATERIAL_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getRoofMaterialLabel(id), id, "b2c ROOF_TYPES")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "ORIENTATIONS"), "id")) {
    assert.ok(Object.hasOwn(helpers.ORIENTATION_LABELS, id), `ORIENTATION_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getOrientationLabel(id), id, "b2c ORIENTATIONS")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "ROOF_SIZES"), "id")) {
    assert.ok(Object.hasOwn(helpers.ROOF_SURFACE_LABELS, id), `ROOF_SURFACE_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getRoofSurfaceLabel(id), id, "b2c ROOF_SIZES")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "HOUSEHOLD_SIZES"), "id")) {
    assert.ok(Object.hasOwn(helpers.HOUSEHOLD_SIZE_LABELS, id), `HOUSEHOLD_SIZE_LABELS doit contenir "${id}"`)
    assertHumanReadableLabel(helpers.getHouseholdSizeLabel(id), id, "b2c HOUSEHOLD_SIZES")
  }

  for (const id of extractPropValues(extractArrayBlock(src, "EV_OPTIONS"), "id")) {
    assert.ok(Object.hasOwn(helpers.EV_OPTION_LABELS, id), `EV_OPTION_LABELS doit contenir "${id}"`)
  }

  for (const id of extractPropValues(extractArrayBlock(src, "BATTERY_OPTIONS"), "id")) {
    assert.ok(Object.hasOwn(helpers.BATTERY_OPTION_LABELS, id), `BATTERY_OPTION_LABELS doit contenir "${id}"`)
  }
})

test("Contrat Simulateur B2B (roi-simulator.tsx) & Schéma canonique (leads-schema.ts) : 100% des clés sont mappées", () => {
  const b2bSrc = fs.readFileSync(
    path.join(__dirname, "..", "components/roi-simulator.tsx"),
    "utf8"
  )

  for (const val of extractPropValues(extractArrayBlock(b2bSrc, "surfaceRangeOptions"), "value")) {
    assert.ok(Object.hasOwn(helpers.ROOF_SURFACE_LABELS, val), `ROOF_SURFACE_LABELS doit contenir "${val}"`)
    assertHumanReadableLabel(helpers.getRoofSurfaceLabel(val), val, "b2b surfaceRangeOptions")
  }

  for (const val of extractPropValues(extractArrayBlock(b2bSrc, "roofMaterialOptions"), "value")) {
    assert.ok(Object.hasOwn(helpers.ROOF_MATERIAL_LABELS, val), `ROOF_MATERIAL_LABELS doit contenir "${val}"`)
    assertHumanReadableLabel(helpers.getRoofMaterialLabel(val), val, "b2b roofMaterialOptions")
  }

  for (const val of extractPropValues(extractArrayBlock(b2bSrc, "ownershipStatusOptions"), "value")) {
    assert.ok(Object.hasOwn(helpers.OWNERSHIP_LABELS, val), `OWNERSHIP_LABELS doit contenir "${val}"`)
    assertHumanReadableLabel(helpers.getOwnershipLabel(val), val, "b2b ownershipStatusOptions")
  }

  for (const val of extractPropValues(extractArrayBlock(b2bSrc, "grdOptions"), "value")) {
    assert.ok(Object.hasOwn(helpers.GRD_LABELS, val), `GRD_LABELS doit contenir "${val}"`)
  }

  const schemaSrc = fs.readFileSync(path.join(__dirname, "..", "lib/leads-schema.ts"), "utf8")
  const parseStringArray = (name) => {
    const m = schemaSrc.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`))
    assert.ok(m, `${name} introuvable dans leads-schema.ts`)
    return [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1])
  }

  for (const k of parseStringArray("OWNERSHIP_STATUS_OPTIONS")) {
    assert.ok(Object.hasOwn(helpers.OWNERSHIP_LABELS, k), `OWNERSHIP_LABELS doit contenir "${k}"`)
  }
  for (const k of parseStringArray("ROOF_MATERIAL_OPTIONS")) {
    assert.ok(Object.hasOwn(helpers.ROOF_MATERIAL_LABELS, k), `ROOF_MATERIAL_LABELS doit contenir "${k}"`)
  }
  for (const k of parseStringArray("PROJECT_DRIVER_OPTIONS")) {
    assert.ok(Object.hasOwn(helpers.PROJECT_DRIVER_LABELS, k), `PROJECT_DRIVER_LABELS doit contenir "${k}"`)
  }
  for (const k of parseStringArray("TIMEFRAME_OPTIONS")) {
    assert.ok(Object.hasOwn(helpers.TIMEFRAME_LABELS, k), `TIMEFRAME_LABELS doit contenir "${k}"`)
  }
})

test("Cas réel (lead de Roly) : gt_6000 et toutes les tranches B2C s'affichent sans code technique brut", () => {
  assert.equal(helpers.getConsumptionLabel("gt_6000"), "> 6 000 kWh/an")
  assert.equal(helpers.getConsumptionLabel("lt_3000"), "< 3 000 kWh/an")
  assert.equal(helpers.getConsumptionLabel("3000_4000"), "3 000 – 4 000 kWh/an")
  assert.equal(helpers.getConsumptionLabel("4000_5000"), "4 000 – 5 000 kWh/an")
  assert.equal(helpers.getConsumptionLabel("5000_6000"), "5 000 – 6 000 kWh/an")

  // Garde-fou pour tranches futures non listées
  assert.equal(helpers.getConsumptionLabel("lt_2000"), "< 2 000 kWh/an")
  assert.equal(helpers.getConsumptionLabel("gt_12000"), "> 12 000 kWh/an")
  assert.equal(helpers.getConsumptionLabel("6000_8000"), "6 000 – 8 000 kWh/an")

  const details = [
    "Précision localisation : 5600 Roly",
    "Consommation annuelle: gt_6000 | Type de bien: maison_4f | Statut: proprietaire | Couverture: plat | Surface toiture: large | Règle contact client: Écrit d'abord (E-mail/SMS) | Précisions: Pompe à chaleur installée",
    "Newsletter Aegis Solaire : Opt-in consenti",
  ].join("\n\n")

  const sanitized = helpers.sanitizeLeadNotes(details, details)
  assert.equal(sanitized.specs.consumption, "> 6 000 kWh/an")
  assert.equal(sanitized.specs.propertyType, "Maison 4 façades (Isolée)")
  assert.equal(sanitized.specs.ownership, "Propriétaire occupant")
  assert.equal(sanitized.specs.roofMaterial, "Toit plat (Roofing / EPDM)")
  assert.equal(sanitized.specs.roofSurface, "Grande (~60 à 100 m²)")
  assert.equal(sanitized.specs.contactPreference, "Écrit d'abord (E-mail/SMS)")
  assert.equal(sanitized.cleanRemarks, "Pompe à chaleur installée")
  assert.ok(!sanitized.specs.contactPreference.includes("Newsletter"))
})

test("Cas réel Simulateur B2C (b2c-simulator.tsx) : aucun débordement ni faux positif batterie/IRVE", () => {
  const b2cDetails = [
    "Statut: locataire_sans_accord",
    "Toiture: plat",
    "Orientation: sud_est_ouest",
    "Taille toiture: medium (~5.5 kWc)",
    "Ménage: 3_4",
    "VE: non",
    "Batterie: non",
    "Notes: J'ai une preuve: toiture plein sud sans ombrage",
  ].join(" | ")

  const sanitized = helpers.sanitizeLeadNotes(b2cDetails, b2cDetails)
  assert.equal(sanitized.specs.ownership, "Locataire (sans accord préalable)")
  assert.equal(sanitized.specs.roofMaterial, "Toit plat (Roofing / EPDM)")
  assert.equal(sanitized.specs.orientation, "Sud-Est / Sud-Ouest")
  assert.equal(sanitized.specs.roofSurface, "Moyenne (~35 à 60 m²) (~5.5 kWc)")
  assert.equal(sanitized.specs.householdSize, "3 – 4 personnes")
  assert.equal(sanitized.specs.hasBattery, false)
  assert.equal(sanitized.specs.hasIrve, false)
  assert.equal(sanitized.cleanRemarks, "J'ai une preuve: toiture plein sud sans ombrage")
})

test("Normalisation amont (API canonicalizeProjectDetailsText) : traduit avant stockage et reste idempotente", () => {
  const rawLegacy = [
    "Précision localisation : 5600 Roly",
    "Consommation annuelle: gt_6000 | Type de bien: maison_4f | Statut: proprietaire | Couverture: plat | Surface toiture: large | Règle contact client: Écrit d'abord (E-mail/SMS) | Précisions: Toiture orientée sud",
    "Newsletter Aegis Solaire : Opt-in consenti",
  ].join("\n\n")

  const canonical = helpers.canonicalizeProjectDetailsText(rawLegacy)
  assert.ok(canonical)
  assert.ok(!canonical.includes("gt_6000"))
  assert.ok(!canonical.includes("maison_4f"))
  assert.ok(canonical.includes("> 6 000 kWh/an"))
  assert.ok(canonical.includes("Maison 4 façades (Isolée)"))
  assert.ok(canonical.includes("Toit plat (Roofing / EPDM)"))
  assert.ok(canonical.includes("Grande (~60 à 100 m²)"))
  assert.ok(canonical.includes("Newsletter Aegis Solaire : Opt-in consenti"))

  // Idempotence absolue : re-normaliser ou re-parser une chaîne déjà normalisée ne doit rien altérer
  assert.equal(helpers.canonicalizeProjectDetailsText(canonical), canonical)
  const reparsed = helpers.sanitizeLeadNotes(canonical, canonical)
  assert.equal(reparsed.specs.consumption, "> 6 000 kWh/an")
  assert.equal(reparsed.specs.propertyType, "Maison 4 façades (Isolée)")
  assert.equal(reparsed.specs.ownership, "Propriétaire occupant")
  assert.equal(reparsed.specs.roofMaterial, "Toit plat (Roofing / EPDM)")
  assert.equal(reparsed.specs.roofSurface, "Grande (~60 à 100 m²)")
  assert.equal(reparsed.cleanRemarks, "Toiture orientée sud")

  // Texte libre pur B2B sans clés structurées : préservé intact
  const freeText = "Entrepôt logistique 1200 m², raccordement triphasé 400V."
  assert.equal(helpers.canonicalizeProjectDetailsText(freeText), freeText)
})

test("Pricing / Dimensionnement (marketplace-pricing.ts) : résultats identiques sur texte brut et texte normalisé en amont", () => {
  const solar = loadTs("lib/solar-assumptions.ts")
  const pricing = loadTs("lib/marketplace-pricing.ts", {
    "./credit-pricing": loadTs("lib/credit-pricing.ts"),
    "./solar-assumptions": solar,
    "@/lib/credit-pricing": loadTs("lib/credit-pricing.ts"),
    "@/lib/solar-assumptions": solar,
  })

  const rawDetails = "Consommation annuelle: gt_6000 | Type de bien: maison_4f | Statut: proprietaire | Couverture: plat | Surface toiture: large"
  const canonicalDetails = helpers.canonicalizeProjectDetailsText(rawDetails)

  const finRaw = pricing.calculateMarketplaceFinancials({
    segment: "B2C",
    surfaceArea: 65,
    surfaceType: "toiture",
    roofMaterial: "plat_epdm",
    annualBill: 2300,
    projectDetails: rawDetails,
    qualificationMetadata: null,
  })

  const finCanonical = pricing.calculateMarketplaceFinancials({
    segment: "B2C",
    surfaceArea: 65,
    surfaceType: "toiture",
    roofMaterial: "plat_epdm",
    annualBill: 2300,
    projectDetails: canonicalDetails,
    qualificationMetadata: null,
  })

  assert.equal(finCanonical.estimatedPowerKwc, finRaw.estimatedPowerKwc)
  assert.equal(finCanonical.normalizedAnnualBill, finRaw.normalizedAnnualBill)
  assert.equal(finCanonical.normalizedSurfaceAreaM2, finRaw.normalizedSurfaceAreaM2)
  assert.equal(finCanonical.estimatedInstallerMargin, finRaw.estimatedInstallerMargin)
})

test("Garde-fou amont formulaires & API : les producteurs appellent les helpers de traduction", () => {
  const landingSrc = fs.readFileSync(
    path.join(__dirname, "..", "app/devis-panneaux-solaires/devis-landing-client.tsx"),
    "utf8"
  )
  assert.ok(landingSrc.includes("getConsumptionLabel(consumption)"))
  assert.ok(landingSrc.includes("getPropertyTypeLabel(propertyType)"))
  assert.ok(landingSrc.includes("getOwnershipLabel(ownership)"))

  const b2cSimSrc = fs.readFileSync(
    path.join(__dirname, "..", "components/b2c-simulator.tsx"),
    "utf8"
  )
  assert.ok(b2cSimSrc.includes("getOwnershipLabel(fd.ownershipStatus)"))
  assert.ok(b2cSimSrc.includes("getRoofMaterialLabel(fd.roofType)"))
  assert.ok(b2cSimSrc.includes("getOrientationLabel(fd.orientation)"))

  const apiLeadsSrc = fs.readFileSync(
    path.join(__dirname, "..", "app/api/leads/route.ts"),
    "utf8"
  )
  assert.ok(apiLeadsSrc.includes("canonicalizeProjectDetailsText("))
})
