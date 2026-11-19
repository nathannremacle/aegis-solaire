const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

function loadTs(relPath, mocks = {}, cache = new Map()) {
  if (cache.has(relPath)) return cache.get(relPath).exports

  const fullPath = path.join(__dirname, "..", relPath)
  const source = fs.readFileSync(fullPath, "utf8")
  const moduleObj = { exports: {} }
  cache.set(relPath, moduleObj)

  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name]
    if (name.startsWith("@/")) {
      return loadTs(name.slice(2) + ".ts", mocks, cache)
    }
    if (name.startsWith("./") || name.startsWith("../")) {
      const joined = path.posix.normalize(
        path.posix.join(path.posix.dirname(relPath.replace(/\\/g, "/")), name)
      )
      const withExt = joined.endsWith(".ts") || joined.endsWith(".json") ? joined : `${joined}.ts`
      return loadTs(withExt, mocks, cache)
    }
    return require(name)
  }

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText

  const fn = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    transpiled
  )
  fn(moduleObj.exports, localRequire, moduleObj, fullPath, path.dirname(fullPath))
  return moduleObj.exports
}

const leadImages = loadTs("lib/lead-images.ts")
const pricing = loadTs("lib/marketplace-pricing.ts")
const teaser = loadTs("lib/email-templates/installer-lead-teaser.ts")
const notifyInstallateur = loadTs("lib/notify-installateur.ts")

test("Rétrocompatibilité legacy : roof_image_url seul et site_image_url seul", () => {
  assert.deepEqual(
    leadImages.getLeadImages({
      qualification_metadata: {
        roof_image_url: "https://cdn.example.com/roof-1.jpg",
        site_image_url: "https://cdn.example.com/roof-1.jpg",
      },
    }),
    ["https://cdn.example.com/roof-1.jpg"]
  )
  assert.equal(
    leadImages.getPrimaryLeadImage({
      qualification_metadata: {
        site_image_url: "https://cdn.example.com/site-only.jpg",
      },
    }),
    "https://cdn.example.com/site-only.jpg"
  )
  assert.deepEqual(
    leadImages.getLeadImages({
      qualification_metadata: {
        roof_images: ["https://cdn.example.com/b.jpg", "https://cdn.example.com/c.jpg"],
        roof_image_url: "https://cdn.example.com/a.jpg",
      },
    }),
    [
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
      "https://cdn.example.com/c.jpg",
    ]
  )
  assert.deepEqual(leadImages.getLeadImages(null), [])
  assert.equal(leadImages.getPrimaryLeadImage(undefined), null)
})

test("Multi-images ordonnées : ajout, déduplication, makeFirst et plafond MAX_LEAD_IMAGES", () => {
  const existing = ["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"]
  const appended = leadImages.appendLeadImages(existing, [
    "https://cdn.example.com/2.jpg",
    "https://cdn.example.com/3.jpg",
  ])
  assert.deepEqual(appended, [
    "https://cdn.example.com/1.jpg",
    "https://cdn.example.com/2.jpg",
    "https://cdn.example.com/3.jpg",
  ])

  const makeFirst = leadImages.appendLeadImages(
    existing,
    ["https://cdn.example.com/hero.jpg"],
    { makeFirst: true }
  )
  assert.deepEqual(makeFirst, [
    "https://cdn.example.com/hero.jpg",
    "https://cdn.example.com/1.jpg",
    "https://cdn.example.com/2.jpg",
  ])

  const many = Array.from({ length: 15 }, (_, i) => `https://cdn.example.com/p-${i}.jpg`)
  const capped = leadImages.appendLeadImages([], many)
  assert.equal(capped.length, leadImages.MAX_LEAD_IMAGES)
  assert.equal(capped[0], "https://cdn.example.com/p-0.jpg")
  assert.equal(capped[9], "https://cdn.example.com/p-9.jpg")
})

test("Sélection d'image principale et synchronisation stricte des métadonnées", () => {
  const initial = [
    "https://cdn.example.com/a.jpg",
    "https://cdn.example.com/b.jpg",
    "https://cdn.example.com/c.jpg",
  ]
  const promoted = leadImages.setPrimaryLeadImage(initial, "https://cdn.example.com/c.jpg")
  assert.deepEqual(promoted, [
    "https://cdn.example.com/c.jpg",
    "https://cdn.example.com/a.jpg",
    "https://cdn.example.com/b.jpg",
  ])

  // Cible absente => liste inchangée
  assert.deepEqual(
    leadImages.setPrimaryLeadImage(initial, "https://cdn.example.com/inconnue.jpg"),
    initial
  )

  const synced = leadImages.syncLeadImagesMetadata(
    { propertyType: "maison", roof_image_url: "https://cdn.example.com/a.jpg" },
    promoted,
    "2026-11-19T21:00:00.000Z"
  )
  assert.equal(synced.propertyType, "maison")
  assert.deepEqual(synced.roof_images, promoted)
  assert.equal(synced.roof_image_url, "https://cdn.example.com/c.jpg")
  assert.equal(synced.site_image_url, "https://cdn.example.com/c.jpg")
  assert.equal(synced.roof_image_updated_at, "2026-11-19T21:00:00.000Z")
  assert.equal(
    leadImages.getPrimaryLeadImage({ qualification_metadata: synced }),
    "https://cdn.example.com/c.jpg"
  )
})

test("Réordonnancement : reorderLeadImages et moveLeadImage", () => {
  const imgs = [
    "https://cdn.example.com/1.jpg",
    "https://cdn.example.com/2.jpg",
    "https://cdn.example.com/3.jpg",
  ]

  // Ne supprime jamais une image existante omise et ignore les URLs étrangères
  const reordered = leadImages.reorderLeadImages(imgs, [
    "https://cdn.example.com/3.jpg",
    "https://cdn.example.com/intruder.jpg",
  ])
  assert.deepEqual(reordered, [
    "https://cdn.example.com/3.jpg",
    "https://cdn.example.com/1.jpg",
    "https://cdn.example.com/2.jpg",
  ])

  assert.deepEqual(leadImages.moveLeadImage(imgs, 0, "left"), imgs)
  assert.deepEqual(leadImages.moveLeadImage(imgs, 2, "right"), imgs)
  assert.deepEqual(leadImages.moveLeadImage(imgs, 1, "left"), [
    "https://cdn.example.com/2.jpg",
    "https://cdn.example.com/1.jpg",
    "https://cdn.example.com/3.jpg",
  ])
  assert.deepEqual(leadImages.moveLeadImage(imgs, 1, "right"), [
    "https://cdn.example.com/1.jpg",
    "https://cdn.example.com/3.jpg",
    "https://cdn.example.com/2.jpg",
  ])
})

test("Suppression de la 1ère image (promotion de la 2e) et suppression totale des clés", () => {
  const imgs = [
    "https://cdn.example.com/1.jpg",
    "https://cdn.example.com/2.jpg",
    "https://cdn.example.com/3.jpg",
  ]

  const afterRemoveFirst = leadImages.removeLeadImage(imgs, "https://cdn.example.com/1.jpg")
  assert.deepEqual(afterRemoveFirst, [
    "https://cdn.example.com/2.jpg",
    "https://cdn.example.com/3.jpg",
  ])
  const metaAfterFirst = leadImages.syncLeadImagesMetadata({}, afterRemoveFirst)
  assert.equal(metaAfterFirst.roof_image_url, "https://cdn.example.com/2.jpg")
  assert.equal(metaAfterFirst.site_image_url, "https://cdn.example.com/2.jpg")

  const metaEmpty = leadImages.syncLeadImagesMetadata(metaAfterFirst, [])
  assert.equal("roof_images" in metaEmpty, false)
  assert.equal("roof_image_url" in metaEmpty, false)
  assert.equal("site_image_url" in metaEmpty, false)
  assert.equal("roof_image_updated_at" in metaEmpty, false)
})

test("Rejet des URLs invalides et dangereuses", () => {
  assert.equal(leadImages.isValidLeadImageUrl("javascript:alert(1)"), false)
  assert.equal(leadImages.isValidLeadImageUrl("data:image/png;base64,AAAA"), false)
  assert.equal(leadImages.isValidLeadImageUrl(""), false)
  assert.equal(leadImages.isValidLeadImageUrl("   "), false)
  assert.equal(leadImages.isValidLeadImageUrl("//evil.com/x.jpg"), false)
  assert.equal(leadImages.isValidLeadImageUrl("https://cdn.example.com/ok.jpg"), true)
  assert.equal(leadImages.isValidLeadImageUrl("http://localhost:3000/ok.png"), true)
  assert.equal(leadImages.isValidLeadImageUrl("/solar/b2c-lead-preview.jpg"), true)

  const sanitized = leadImages.syncLeadImagesMetadata({}, [
    "javascript:alert(1)",
    "",
    "data:image/jpeg;base64,xxx",
    "https://cdn.example.com/valid.jpg",
  ])
  assert.deepEqual(sanitized.roof_images, ["https://cdn.example.com/valid.jpg"])
  assert.equal(sanitized.roof_image_url, "https://cdn.example.com/valid.jpg")
})

test("E-mail teaser installateur : affiche uniquement la 1ère photo avec compteur multi-photos", () => {
  const financials = pricing.calculateMarketplaceFinancials({
    segment: "B2C",
    surfaceArea: 55,
    surfaceType: "toiture",
    roofMaterial: "tuiles",
    annualBill: 2400,
    creditCost: 3,
    qualificationMetadata: null,
  })

  const baseInput = {
    partner: {
      id: "11111111-1111-1111-1111-111111111111",
      companyName: "Solar Wallonie SRL",
      credits: 10,
    },
    lead: {
      id: "22222222-2222-2222-2222-222222222222",
      segment: "B2C",
      province: "liege",
      postalCode: "4300",
      city: "Bovenistier",
      surfaceType: "toiture",
      surfaceArea: 55,
      roofMaterial: "tuiles",
      annualElectricityBill: 2400,
      firstName: "Jean",
      lastName: "Dupont",
      roofImageUrl: "https://cdn.example.com/photo-1.jpg",
      roofImagesCount: 3,
      createdAt: "2026-11-19T10:00:00.000Z",
    },
    waveNumber: 1,
    takenSlots: 0,
    maxSlots: 3,
    creditCost: 3,
    financials,
  }

  const multiRes = teaser.renderInstallerLeadTeaserEmail(baseInput)
  assert.ok(multiRes.html.includes('src="https://cdn.example.com/photo-1.jpg"'))
  assert.equal(multiRes.html.includes("photo-2.jpg"), false)
  assert.ok(multiRes.html.includes("Photo du bâtiment · +"))
  assert.ok(multiRes.html.includes(">2</span> autres sur le dossier"))
  assert.ok(multiRes.text.includes("3 photos du bâtiment disponibles sur la fiche dossier"))

  const singleRes = teaser.renderInstallerLeadTeaserEmail({
    ...baseInput,
    lead: {
      ...baseInput.lead,
      roofImagesCount: 1,
    },
  })
  assert.ok(singleRes.html.includes('src="https://cdn.example.com/photo-1.jpg"'))
  assert.ok(singleRes.html.includes("<p style=\"margin: 4px 0 0 0; font-size: 12px; color: #4d6374;\">Photo du bâtiment</p>"))
  assert.ok(singleRes.text.includes("Photo du bâtiment disponible sur la fiche dossier"))

  const noneRes = teaser.renderInstallerLeadTeaserEmail({
    ...baseInput,
    lead: {
      ...baseInput.lead,
      roofImageUrl: null,
      roofImagesCount: 0,
    },
  })
  assert.equal(noneRes.html.includes("photo-1.jpg"), false)
  assert.equal(noneRes.text.includes("Photo du bâtiment"), false)
})

test("Métadonnées Projection 3D IA par image : lecture, conservation et purge automatique", () => {
  const url3d = "https://cdn.example.com/3d-render.jpg"
  const urlReal = "https://cdn.example.com/aerial-real.jpg"

  const initialMeta = leadImages.syncLeadImagesMetadata(
    {},
    [urlReal, url3d],
    "2026-11-19T21:00:00.000Z",
    { [url3d]: "ai_3d_projection" }
  )

  assert.deepEqual(initialMeta.roof_image_meta, {
    [url3d]: { kind: "ai_3d_projection" },
  })
  assert.deepEqual(leadImages.getLeadImageItems({ qualification_metadata: initialMeta }), [
    { url: urlReal, kind: "real", isAiProjection: false },
    { url: url3d, kind: "ai_3d_projection", isAiProjection: true },
  ])
  assert.deepEqual(leadImages.getPrimaryLeadImageItem({ qualification_metadata: initialMeta }), {
    url: urlReal,
    kind: "real",
    isAiProjection: false,
  })

  // Promotion de la vue 3D en photo n°1 => roof_image_meta est conservée
  const promoted = leadImages.setPrimaryLeadImage([urlReal, url3d], url3d)
  const promotedMeta = leadImages.syncLeadImagesMetadata(initialMeta, promoted)
  assert.equal(promotedMeta.roof_image_url, url3d)
  assert.deepEqual(promotedMeta.roof_image_meta, {
    [url3d]: { kind: "ai_3d_projection" },
  })
  assert.equal(
    leadImages.getPrimaryLeadImageItem({ qualification_metadata: promotedMeta })?.isAiProjection,
    true
  )

  // Suppression de la vue 3D => la map est purgée et la clé roof_image_meta disparaît
  const afterDelete = leadImages.removeLeadImage(promoted, url3d)
  const afterDeleteMeta = leadImages.syncLeadImagesMetadata(promotedMeta, afterDelete)
  assert.equal("roof_image_meta" in afterDeleteMeta, false)
  assert.deepEqual(leadImages.getLeadImageItems({ qualification_metadata: afterDeleteMeta }), [
    { url: urlReal, kind: "real", isAiProjection: false },
  ])
})

test("E-mails installateurs : bandeau « Projection 3D · Non contractuelle » quand photo n°1 taguée", () => {
  const financials = pricing.calculateMarketplaceFinancials({
    segment: "B2C",
    surfaceArea: 55,
    surfaceType: "toiture",
    roofMaterial: "tuiles",
    annualBill: 2400,
    creditCost: 3,
    qualificationMetadata: null,
  })

  const teaserInput = {
    partner: {
      id: "11111111-1111-1111-1111-111111111111",
      companyName: "Solar Wallonie SRL",
      credits: 10,
    },
    lead: {
      id: "22222222-2222-2222-2222-222222222222",
      segment: "B2C",
      province: "liege",
      postalCode: "4300",
      city: "Bovenistier",
      surfaceType: "toiture",
      surfaceArea: 55,
      roofMaterial: "tuiles",
      annualElectricityBill: 2400,
      firstName: "Jean",
      lastName: "Dupont",
      roofImageUrl: "https://cdn.example.com/3d-front.jpg",
      roofImagesCount: 2,
      roofImageIsAiProjection: true,
      createdAt: "2026-11-19T10:00:00.000Z",
    },
    waveNumber: 1,
    takenSlots: 0,
    maxSlots: 3,
    creditCost: 3,
    financials,
  }

  const teaserAiMulti = teaser.renderInstallerLeadTeaserEmail(teaserInput)
  assert.ok(teaserAiMulti.html.includes(leadImages.AI_PROJECTION_BADGE_SHORT))
  assert.ok(teaserAiMulti.html.includes(leadImages.AI_PROJECTION_EMAIL_CAPTION))
  assert.ok(teaserAiMulti.html.includes(">1</span> autre visuel sur le dossier"))
  assert.ok(teaserAiMulti.text.includes("projection 3D IA non contractuelle"))

  const teaserAiSingle = teaser.renderInstallerLeadTeaserEmail({
    ...teaserInput,
    lead: { ...teaserInput.lead, roofImagesCount: 1 },
  })
  assert.ok(teaserAiSingle.html.includes(leadImages.AI_PROJECTION_BADGE_SHORT))
  assert.equal(teaserAiSingle.html.includes("autre visuel sur le dossier"), false)

  const assignedAi = notifyInstallateur.buildLeadAssignedEmail({
    first_name: "Jean",
    last_name: "Dupont",
    email: "prospect@example.be",
    phone: "+32470000000",
    job_title: "Particulier",
    company: null,
    surface_type: "toiture",
    surface_area: 55,
    annual_electricity_bill: 2400,
    roof_image_url: "https://cdn.example.com/3d-front.jpg",
    roof_image_is_ai_projection: true,
    message: null,
  })
  assert.ok(assignedAi.html.includes(leadImages.AI_PROJECTION_BADGE_SHORT))
  assert.ok(assignedAi.html.includes(leadImages.AI_PROJECTION_EMAIL_CAPTION))
  assert.ok(assignedAi.text.includes(leadImages.AI_PROJECTION_BADGE_SHORT))

  const assignedReal = notifyInstallateur.buildLeadAssignedEmail({
    first_name: "Jean",
    last_name: "Dupont",
    email: "prospect@example.be",
    phone: "+32470000000",
    job_title: "Particulier",
    company: null,
    surface_type: "toiture",
    surface_area: 55,
    annual_electricity_bill: 2400,
    roof_image_url: "https://cdn.example.com/real.jpg",
    roof_image_is_ai_projection: false,
    message: null,
  })
  assert.equal(assignedReal.html.includes(leadImages.AI_PROJECTION_BADGE_SHORT), false)
  assert.ok(assignedReal.html.includes(">Photo du bâtiment</p>"))
})
