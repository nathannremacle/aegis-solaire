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
    Buffer,
    URLSearchParams,
    require: (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (name.startsWith("@/")) {
        const subRel = name.slice(2)
        if (subRel.endsWith(".json")) {
          return JSON.parse(fs.readFileSync(path.join(__dirname, "..", subRel), "utf8"))
        }
        return loadTs(subRel + ".ts", mocks)
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

const notifPrefs = loadTs("lib/partner-notification-prefs.ts")
const rescertDirectory = loadTs("lib/rescert-directory.ts", {
  "@/lib/supabase/admin": { createServiceRoleClient: () => ({}) },
})
const b2bCfoBrief = loadTs("lib/b2b-cfo-brief.ts")

test("normalizeBelgianPhoneToE164 normalise correctement les numéros belges et rejette les invalides", () => {
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("0476 12 34 56"), "+32476123456")
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("0032 476 12 34 56"), "+32476123456")
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("+32 (0)476 12.34.56"), "+32476123456")
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("+32476123456"), "+32476123456")
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("04 222 33 44"), "+3242223344")
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("476123456"), "+32476123456")
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("+33612345678"), "+33612345678")
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164("12345"), null)
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164(""), null)
  assert.equal(notifPrefs.normalizeBelgianPhoneToE164(null), null)
})

test("Annuaire RESCERT génère des slugs uniques pour l'ensemble du registre et couvre les 6 provinces", () => {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "lib/data/rescert-wallonie-installateurs.json"), "utf8")
  )
  const all = rescertDirectory.getAllRescertInstallers()
  assert.ok(all.length >= 784, `Attendu au moins 784 installateurs RESCERT, trouvé ${all.length}`)
  assert.equal(all.length, raw.length, "Tous les enregistrements JSON doivent être indexés")

  const slugs = new Set(all.map((x) => x.slug))
  assert.equal(slugs.size, all.length, "Chaque installateur doit avoir un slug strictement unique")

  for (const entry of all) {
    assert.ok(/^[a-z0-9-]+$/.test(entry.slug), `Slug invalide: ${entry.slug}`)
    const resolved = rescertDirectory.getRescertInstallerBySlug(entry.slug)
    assert.ok(resolved && resolved.id === entry.id, `Lookup par slug échoué pour ${entry.slug}`)
  }

  const provinces = Object.keys(rescertDirectory.PROVINCE_SEO_META)
  assert.deepEqual(
    provinces.sort(),
    ["brabant_wallon", "bruxelles", "hainaut", "liege", "luxembourg", "namur"]
  )
  for (const p of provinces) {
    const list = rescertDirectory.getRescertInstallersByProvince(p)
    assert.ok(list.length > 0, `Province ${p} ne doit pas être vide`)
  }
})

test("buildDetailedDpiSimulation calcule DPI 40 %, bouclier ISoc et payback réduit", () => {
  const sim25 = b2bCfoBrief.buildDetailedDpiSimulation({
    powerKwc: 100,
    capexPerWc: 1.0,
    annualBillEur: 45000,
    isocRate: 0.25,
    clientCompanyName: "Atelier Test SA",
  })

  assert.equal(sim25.estimatedCapexHtva, 100000)
  assert.equal(sim25.dpi40DeductionBaseEur, 40000)
  assert.equal(sim25.isocTaxShieldEur, 10000)
  assert.equal(sim25.netEffectiveCapexEur, 90000)
  assert.ok(sim25.paybackYearsWithDpi < sim25.paybackYearsWithoutDpi)
  assert.equal(sim25.cvEligible, true)
  assert.equal(sim25.easyGreenEligible, true)
  assert.ok(sim25.cumulativeNetGain25YearsEur > sim25.cumulativeNetGain15YearsEur)

  const sim20 = b2bCfoBrief.buildDetailedDpiSimulation({
    powerKwc: 10,
    capexPerWc: 1.2,
    isocRate: 0.2,
  })
  assert.equal(sim20.isocTaxShieldEur, Math.round(12000 * 0.4 * 0.2))
  assert.equal(sim20.cvEligible, false)
  assert.equal(sim20.easyGreenEligible, false)
})

test("Règle stricte d'anonymat : zéro mention Nathan/Fabrice hors footer légal INIT42", () => {
  const filesToCheck = [
    "lib/partner-growth-engine.ts",
    "lib/rescert-directory.ts",
    "lib/distributor-partners.ts",
    "app/api/partners/feedback-1click/route.ts",
    "app/api/cron/partner-growth-engine/route.ts",
    "app/api/admin/growth/run/route.ts",
    "app/api/badges/rescert/[slug]/route.ts",
    "app/partenaires/annuaire/[slug]/page.tsx",
    "app/partenaires/annuaire/province/[province]/page.tsx",
    "app/partenaires/outils/calculateur-dpi-b2b/page.tsx",
    "components/partners/dpi-calculator-client.tsx",
    "components/partners/dashboard/modals/partner-tools-badge-modal.tsx",
    "app/partenaires/distributeurs/page.tsx",
    "app/partenaires/distributeurs/[slug]/page.tsx",
    "app/admin/(dashboard)/distributeurs/page.tsx",
    "app/admin/(dashboard)/distributeurs/[id]/fiche/page.tsx",
    "components/admin/admin-distributors-client.tsx",
  ]

  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(__dirname, "..", rel), "utf8")
    const sanitized = content.replace(
      /Plateforme éditée par INIT42 \(Nathan Remacle\) · BCE BE 1039\.899\.980 · Liège, Belgique/g,
      ""
    )
    assert.equal(
      /\b(nathan|fabrice)\b/i.test(sanitized),
      false,
      `Mention interdite de Nathan/Fabrice détectée dans ${rel}`
    )
  }
})

test("Opt-out SMS présent dans l'onglet Alertes et la page Notifications", () => {
  const modalSource = fs.readFileSync(
    path.join(__dirname, "..", "components/partners/dashboard/modals/alert-preferences-modal.tsx"),
    "utf8"
  )
  assert.ok(modalSource.includes("smsAlertsOptIn"), "alert-preferences-modal doit gérer smsAlertsOptIn")
  assert.ok(
    modalSource.includes("Alertes SMS temps réel"),
    "alert-preferences-modal doit afficher la section Alertes SMS temps réel"
  )

  const notifSource = fs.readFileSync(
    path.join(__dirname, "..", "components/partners/partner-notifications-client.tsx"),
    "utf8"
  )
  assert.ok(notifSource.includes("smsOptIn"), "partner-notifications-client doit gérer smsOptIn")
  assert.ok(
    notifSource.includes("Alertes SMS temps réel"),
    "partner-notifications-client doit permettre d'activer/désactiver les SMS"
  )
})
