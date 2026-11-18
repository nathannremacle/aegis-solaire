import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)

// 1. Charger les variables d'environnement depuis .env.local
const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf8")
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

function loadTsModule(relPath) {
  const fullPath = path.resolve(process.cwd(), relPath)
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
    process,
    Buffer,
    URL,
    URLSearchParams,
    require: (name) => {
      if (name.startsWith("@/")) {
        return loadTsModule(`${name.slice(2)}.ts`)
      }
      if (name.startsWith("./") || name.startsWith("../")) {
        const resolved = path.relative(process.cwd(), path.resolve(path.dirname(fullPath), `${name}.ts`))
        return loadTsModule(resolved)
      }
      return require(name)
    },
  }
  vm.runInNewContext(compiled, context)
  return context.exports
}

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY manquante dans .env.local")
    process.exit(1)
  }

  const targetEmail = "mrnathanrem@gmail.com"
  const { buildProspectReferralEmail, sendProspectReferralEmail } = loadTsModule("lib/prospect-referral-email.ts")

  const samplePayload = {
    email: targetEmail,
    firstName: "Julien",
    lastName: "Dubois",
    leadId: "aegis-referral-preview-01",
    city: "Chaudfontaine",
    province: "liege",
    segment: "B2C",
    estimatedPowerKwc: 6.2,
    partnerCompany: "SolarTech Liège SRL",
  }

  const built = buildProspectReferralEmail(samplePayload)
  console.log("Sujet :", built.subject)
  console.log("Lien partagé :", built.shareUrl)

  const res = await sendProspectReferralEmail(samplePayload)
  if (!res.sent) {
    console.error("Échec envoi Resend :", res.error)
    process.exit(1)
  }

  console.log("Aperçu envoyé avec succès à", targetEmail, "— Resend ID :", res.emailId)
}

main().catch((err) => {
  console.error("Erreur inattendue :", err)
  process.exit(1)
})
