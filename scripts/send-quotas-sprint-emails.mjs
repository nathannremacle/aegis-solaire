import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let val = trimmed.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const PROVINCE_LABELS = {
  liege: "Liège",
  hainaut: "Hainaut",
  namur: "Namur",
  brabant_wallon: "Brabant wallon",
  bruxelles: "Bruxelles-Capitale",
  luxembourg: "Luxembourg",
}

function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function buildOptoutUrl(baseUrl, email) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXTAUTH_SECRET || "aegis-solaire-rescert-optout-v1"
  const normalized = email.toLowerCase().trim()
  const token = crypto
    .createHmac("sha256", secret)
    .update(`rescert_outreach_optout:${normalized}`)
    .digest("hex")
    .slice(0, 32)
  return `${baseUrl}/api/partners/rescert-optout?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`
}

async function main() {
  const isSendMode = process.argv.includes("--send")
  const provinceFilterArg = process.argv.find((a) => a.startsWith("--province="))
  const provinceFilter = provinceFilterArg ? provinceFilterArg.split("=")[1] : null

  const csvPath = path.resolve(process.cwd(), "scripts/output/rescert-quotas-sprint-120.csv")
  if (!fs.existsSync(csvPath)) {
    console.error("CSV introuvable:", csvPath)
    process.exit(1)
  }

  const logPath = path.resolve(process.cwd(), "scripts/output/sent-quotas-log.json")
  const sentLog = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : {}

  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean)
  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line)
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = cols[i] || ""
    })
    return obj
  })

  // Exclure les désinscrits rescert_optouts via Supabase
  const optoutSet = new Set()
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data } = await supabase.from("rescert_optouts").select("email")
    for (const r of data || []) {
      if (r.email) optoutSet.add(String(r.email).toLowerCase().trim())
    }
  }

  const targets = rows.filter((r) => {
    const email = (r.email || "").toLowerCase().trim()
    if (!email || !email.includes("@")) return false
    if (optoutSet.has(email)) return false
    if (sentLog[email]) return false
    if (provinceFilter && r.province !== provinceFilter) return false
    return true
  })

  console.log(`Mode: ${isSendMode ? "ENVOI RÉEL RESEND" : "DRY-RUN (simulation)"} | Cibles éligibles: ${targets.length}`)

  if (!isSendMode) {
    console.log("Aperçu des 5 premières cibles:", targets.slice(0, 5).map((t) => `${t.province} | ${t.company} | ${t.email}`))
    console.log("Relancez avec `--send` (ou `--send --province=liege`) pour envoyer réellement.")
    return
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY manquante dans .env.local")
    process.exit(1)
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

  let sentCount = 0
  for (const t of targets) {
    const provLabel = PROVINCE_LABELS[t.province] || t.province
    const email = t.email.toLowerCase().trim()
    const optoutUrl = buildOptoutUrl(baseUrl, email)
    const quotaUrl = `${baseUrl}/partenaires/dashboard/credits`
    const subject = `${provLabel} : 3 sièges prioritaires RESCERT (0 € d'abonnement · Garantie 45j)`
    const text = `Bonjour,

Aegis Solaire ouvre ce mois-ci 3 Quotas Prioritaires en Auto-Pilot sur la province de ${provLabel} (parmi les installateurs certifiés RESCERT de la zone).

Pourquoi 3 sièges maximum ?
En résidentiel, chaque dossier vérifié (SMS OTP + vue 3D toiture + facture réelle) est limité à 3 installateurs max (et 1 ou 2 max en B2B). Les 3 Titulaires de la province reçoivent les chantiers à T+0s, soit 30 minutes avant leur diffusion sur la marketplace ouverte.

Zéro abonnement · Zéro risque financier :
- Quota Accélération (198 € HTVA, -16 %) ou Quota Titulaire (450 € HTVA, -24 %)
- Garantie Contractuelle 45 Jours (Art. 4.4 CGV) : si nous ne vous livrons pas assez de dossiers conformes à vos filtres sous 45 jours, le solde non consommé vous est remboursé par virement sous 48h.

Activer ou vérifier les places restantes sur ${provLabel} :
${quotaUrl}

(Pas encore de compte ? Répondez simplement « OK ${provLabel} » à cet e-mail avec vos communes cibles : nous configurons votre accès sous 2h, sans aucun appel commercial.)

Cordialement,
La Direction des Partenariats Aegis Solaire
contact@aegissolaire.com

--
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique.
Ne plus recevoir d'alertes B2B : ${optoutUrl}`

    try {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: email,
        replyTo: "contact@aegissolaire.com",
        subject,
        text,
        headers: {
          "List-Unsubscribe": `<${optoutUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      })
      if (!error) {
        sentCount++
        sentLog[email] = new Date().toISOString()
        fs.writeFileSync(logPath, JSON.stringify(sentLog, null, 2), "utf8")
      } else {
        console.error("Erreur Resend pour", email, error)
      }
    } catch (err) {
      console.error("Exception pour", email, err)
    }

    await new Promise((r) => setTimeout(r, 250))
  }

  console.log(`Envoi terminé : ${sentCount}/${targets.length} e-mails délivrés.`)
}

main()
