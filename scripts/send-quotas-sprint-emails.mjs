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

  // Exclure impérativement toute liste noire (fichiers locaux + Supabase audit_log & partners)
  const optoutSet = new Set()
  const localOptoutFiles = [
    path.resolve(process.cwd(), "lib/data/optout-emails.json"),
    path.resolve(process.cwd(), "lib/data/b2c-optout-emails.json"),
  ]
  if (!fs.existsSync(localOptoutFiles[0])) {
    console.error("Fichier liste noire introuvable :", localOptoutFiles[0])
    process.exit(1)
  }
  for (const filePath of localOptoutFiles) {
    if (fs.existsSync(filePath)) {
      const list = JSON.parse(fs.readFileSync(filePath, "utf8"))
      for (const em of Array.isArray(list) ? list : []) {
        if (em) optoutSet.add(String(em).toLowerCase().trim())
      }
    }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Variables Supabase manquantes : impossible de vérifier la liste noire en base.")
    process.exit(1)
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const [optoutsRes, partnersRes] = await Promise.all([
    supabase.from("audit_log").select("entity_id").eq("action", "RESCERT_OUTREACH_OPTOUT"),
    supabase.from("partners").select("email, email_notifications_enabled, target_surfaces"),
  ])
  if (optoutsRes.error || partnersRes.error) {
    console.error("Erreur lecture liste noire Supabase :", optoutsRes.error || partnersRes.error)
    process.exit(1)
  }
  for (const r of optoutsRes.data || []) {
    if (r.entity_id) optoutSet.add(String(r.entity_id).toLowerCase().trim())
  }
  for (const p of partnersRes.data || []) {
    const em = String(p.email || "").toLowerCase().trim()
    if (!em) continue
    const surfaces = Array.isArray(p.target_surfaces) ? p.target_surfaces : []
    if (p.email_notifications_enabled === false || surfaces.includes("__optout_all__")) {
      optoutSet.add(em)
    }
  }
  console.log(`Liste noire chargée : ${optoutSet.size} e-mails exclus (fichiers + audit_log + partners).`)

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
    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr-BE">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#EEF2F4;font-family:Arial,Helvetica,sans-serif;color:#142D42;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#EEF2F4;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" style="width:100%;max-width:640px;background-color:#FFFFFF;border:1px solid #DCE5EB;border-radius:10px;overflow:hidden;border-collapse:separate;">
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #E6EDF1;">
              <img src="${baseUrl}/logo.png" alt="Aegis Solaire" width="132" height="72" style="display:block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:#305A76;">Contingent Provincial · ${provLabel}</p>
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;font-weight:bold;color:#142D42;">3 sièges prioritaires RESCERT ouverts</h1>
              <span style="display:inline-block;padding:4px 10px;border-radius:5px;background-color:#E8F2ED;color:#1D5D45;font-size:12px;font-weight:bold;font-variant-numeric:tabular-nums;">0 € d'abonnement · Garantie Cash-Back 45 jours</span>
              <p style="margin:16px 0 12px 0;font-size:15px;line-height:1.5;color:#142D42;">Bonjour, Aegis Solaire ouvre ce mois-ci <strong>3 Quotas Prioritaires en Auto-Pilot</strong> sur la province de <strong>${provLabel}</strong>.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0;background-color:#F0F5F8;border:1px solid #DCE5EB;border-radius:8px;">
                <tr>
                  <td width="50%" style="padding:12px 15px;vertical-align:top;">
                    <span style="display:block;font-size:13px;color:#4D6374;">Priorité chronologique</span>
                    <strong style="display:block;font-size:20px;color:#142D42;font-variant-numeric:tabular-nums;">T+0s (30 min avant Spot)</strong>
                    <span style="display:block;font-size:12px;color:#4D6374;">Max 3 B2C / Max 2 B2B</span>
                  </td>
                  <td width="50%" style="padding:12px 15px;border-left:1px solid #DCE5EB;vertical-align:top;">
                    <span style="display:block;font-size:13px;color:#4D6374;">Quotas sans risque</span>
                    <strong style="display:block;font-size:20px;color:#142D42;font-variant-numeric:tabular-nums;">198 € ou 450 € HTVA</strong>
                    <span style="display:block;font-size:12px;color:#4D6374;">Remboursé sous 48h si non livré à 45j</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;">
                <tr>
                  <td align="center">
                    <a href="${quotaUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background-color:#142D42;color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px;">Voir les places libres sur ${provLabel} &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0 0;font-size:13px;line-height:1.5;color:#4D6374;">Pas encore de compte ? Répondez simplement <strong>« OK ${provLabel} »</strong> avec vos communes cibles : nous configurons votre accès sous 2h sans aucun appel commercial.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px;background-color:#F6F8FA;border-top:1px solid #E6EDF1;font-size:12px;color:#4D6374;line-height:1.5;">
              <a href="mailto:contact@aegissolaire.com" style="color:#194767;text-decoration:underline;margin-right:12px;">contact@aegissolaire.com</a>
              <a href="${optoutUrl}" style="color:#194767;text-decoration:underline;">Ne plus recevoir d'alertes B2B</a><br />
              Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
        html,
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
