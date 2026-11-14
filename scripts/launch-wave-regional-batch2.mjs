import fs from "node:fs"
import path from "node:path"
import dns from "node:dns/promises"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")

// Load .env.local if present
const envPath = path.join(ROOT, ".env.local")
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

const DRY_RUN = process.argv.includes("--dry-run")
const SEND_DELAY_MS = 2500

const HARD_BOUNCED_EMAILS = [
  "info.sowatts@gmail.com",
  "frederik.ruison@bilfinger.com",
  "contact@hotelec.be",
  "frederic@homegridsolutions.be",
  "contact@wenergy-consulting.com",
  "thibaut.cougnet@we-green.be",
  "rh@monnaie.be",
]

const ALREADY_REGISTERED_EMAILS = [
  "info@c-teamtechnologie.be",
  "energyhome.pro@gmail.com",
  "adamboum@hotmail.com",
  "contact@init42.be",
  "contact@ardennes-solaire.be",
  "mrnathanrem@gmail.com",
  "fabrice.remacle@gmail.com",
  "info@solarity.be",
  "eleva.belgique@gmail.com",
  "fde@lightselec.be",
]

const PRIOR_REPORT_FILES = [
  "scratch/wave1-execution-report.json",
  "scratch/wave2-execution-report.json",
  "scratch/wave-liege1-execution-report.json",
  "scratch/wave-namur1-execution-report.json",
]

const LIEGE_BLACKLIST = ["mc industry", "mc-industry", "mcindustry"]
const NAMUR_BLACKLIST = [
  "auvray",
  "housing energy",
  "ideal energy",
  "ideal-energy",
  "watup",
]

const FORBIDDEN_PATTERNS = [
  /owner_occupied/i,
  /cost_reduction/i,
  /3_months/i,
  /nathan/i,
  /fabrice/i,
  /remacle/i,
  /alfieri/i,
  /mathieu/i,
  /vaassen/i,
  /botelho/i,
  /bauwens/i,
  /marcelino/i,
  /[🔒🛡️⚡🎯👉✅]/u,
]

const CAMPAIGNS = [
  {
    key: "liege2a_remicourt_4350",
    name: "Liège 2a — Remicourt (4350)",
    leadId: "lead_remicourt_4350",
    cpPrefixes: ["41", "44", "45"],
    blacklist: LIEGE_BLACKLIST,
    city: "Remicourt",
    postalCode: "4350",
    province: "Liège (Hesbaye)",
    badge: "PROJET VÉRIFIÉ · PLAFONNÉ À 2 INSTALLATEURS",
    exclusivityShort: "Plafonné à 2 installateurs max",
    subjectPrefix: "Chantier photovoltaïque 4 façades à Remicourt (4350)",
    housingType: "Maison 4 façades · Toiture 38 m² tuiles",
    systemSpec: "Estimation ~6,2 kWc (14 panneaux) + Batterie",
    billSpec: "1 850 €/an (> 5 400 kWh)",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-remicourt-4350-blurred.jpg",
    priceLabel: "29,50 € HTVA",
    matchFilter: (inst) => {
      const cp = String(inst.postalCode || "").trim()
      return ["41", "44", "45"].includes(cp.slice(0, 2))
    },
  },
  {
    key: "liege2b_gingelom_3890",
    name: "Liège 2b — Gingelom (3890)",
    leadId: "lead_gingelom_3890",
    cpPrefixes: ["42", "43"],
    blacklist: LIEGE_BLACKLIST,
    city: "Gingelom",
    postalCode: "3890",
    province: "Hesbaye (axe Hannut / Waremme)",
    badge: "0 CONCURRENT DÉCLARÉ · PLAFONNÉ À 2 INSTALLATEURS",
    exclusivityShort: "Plafonné à 2 installateurs max",
    subjectPrefix: "Projet solaire 34 m² plein Sud à Gingelom (3890)",
    housingType: "Maison unifamiliale · Toiture moderne 34 m² plein Sud",
    systemSpec: "Estimation ~5,2 kWc (12 panneaux 440 Wc)",
    billSpec: "1 560 €/an (4 600 kWh)",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-gingelom-3890-blurred.jpg",
    priceLabel: "29,50 € HTVA",
    matchFilter: (inst) => {
      const cp = String(inst.postalCode || "").trim()
      return ["42", "43"].includes(cp.slice(0, 2))
    },
  },
  {
    key: "namur2a_assesse_5330",
    name: "Namur 2a — Assesse (5330)",
    leadId: "lead_assesse_5330",
    cpPrefixes: ["51", "55"],
    blacklist: NAMUR_BLACKLIST,
    city: "Assesse",
    postalCode: "5330",
    province: "Namur (Condroz)",
    badge: "EXCLUSIVITÉ 1 INSTALLATEUR MAX",
    exclusivityShort: "Exclusivité · 1 installateur max",
    subjectPrefix: "Exclusivité 1 pro : projet solaire + batterie à Assesse (5330)",
    housingType: "Plain-pied · Toiture 36 m² plein Sud",
    systemSpec: "Estimation ~5,5 kWc (12 à 14 panneaux) + Batterie",
    billSpec: "1 600 €/an",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-assesse-5330-blurred.jpg",
    priceLabel: "29,50 € HTVA",
    matchFilter: (inst) => {
      const cp = String(inst.postalCode || "").trim()
      return ["51", "55"].includes(cp.slice(0, 2))
    },
  },
  {
    key: "namur2b_ohey_5350",
    name: "Namur 2b — Ohey (5350)",
    leadId: "lead_ohey_5350",
    cpPrefixes: ["56"],
    blacklist: NAMUR_BLACKLIST,
    city: "Ohey",
    postalCode: "5350",
    province: "Namur (Condroz)",
    badge: "EXCLUSIVITÉ 1 INSTALLATEUR MAX",
    exclusivityShort: "Exclusivité · 1 installateur max",
    subjectPrefix: "Exclusivité 1 pro : toiture 38 m² + recharge VE à Ohey (5350)",
    housingType: "Maison unifamiliale · Toiture 38 m² Sud-Est",
    systemSpec: "Estimation ~6,0 kWc (14 panneaux 440 Wc)",
    billSpec: "1 150 €/an + recharge VE en cours",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-ohey-5350-blurred.jpg",
    priceLabel: "29,50 € HTVA",
    matchFilter: (inst) => {
      const cp = String(inst.postalCode || "").trim()
      return cp.slice(0, 2) === "56"
    },
  },
  {
    key: "bw_wemmel_1780",
    name: "Brabant wallon — Wemmel (1780)",
    leadId: "e597cc47-01f2-47e4-a953-c7e6902b2028",
    cpPrefixes: ["13", "14"],
    blacklist: [],
    city: "Wemmel",
    postalCode: "1780",
    province: "Périphérie Nord Bruxelles",
    badge: "PROJET VÉRIFIÉ · PLAFONNÉ À 3 INSTALLATEURS",
    exclusivityShort: "Plafonné à 3 installateurs max",
    subjectPrefix: "Projet photovoltaïque 42 m² vérifié à Wemmel (1780)",
    housingType: "Maison unifamiliale · Toiture 42 m² tuiles",
    systemSpec: "Estimation ~5,4 kWc (environ 12 panneaux)",
    billSpec: "1 150 €/an facture",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-wemmel-1780-blurred.jpg",
    priceLabel: "29,50 € HTVA",
    matchFilter: (inst) => {
      const cp = String(inst.postalCode || "").trim()
      return ["13", "14"].includes(cp.slice(0, 2)) || inst.provinceKey === "brabant_wallon"
    },
  },
]

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
}

function escapeHtml(value) {
  return decodeHtmlEntities(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase()
}

function extractExcludedFromReport(filePath) {
  const fullPath = path.join(ROOT, filePath)
  if (!fs.existsSync(fullPath)) return []
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8"))
  const emails = new Set()

  const collect = (arr) => {
    if (!Array.isArray(arr)) return
    for (const item of arr) {
      if (typeof item === "string") {
        const e = normalizeEmail(item)
        if (e) emails.add(e)
      } else if (item && typeof item === "object") {
        const candidate = item.email || item.to || item.recipient
        if (candidate) emails.add(normalizeEmail(candidate))
      }
    }
  }

  collect(data.sent)
  collect(data.sentEmails)
  collect(data.results)
  collect(data.recipients)
  collect(data.emails)
  collect(data.logs)
  if (Array.isArray(data)) collect(data)

  return [...emails]
}

function isBlacklisted(installer, terms) {
  if (!terms || terms.length === 0) return false
  const haystack = `${installer.companyName || ""} ${installer.email || ""} ${installer.certifiedPerson || ""}`.toLowerCase()
  return terms.some((t) => haystack.includes(t))
}

function formatDisplayPerson(raw) {
  const s = decodeHtmlEntities(raw).trim()
  if (!s) return ""
  return s
    .split(/\s+/)
    .map((w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ")
}

function buildInviteUrl(installer, campaign) {
  const url = new URL("https://www.aegissolaire.com/partenaires/invitation")
  const cleanName = formatDisplayPerson(installer.certifiedPerson)
  const cleanCompany = decodeHtmlEntities(installer.companyName).trim()
  if (cleanName) url.searchParams.set("nom", cleanName)
  if (cleanCompany) url.searchParams.set("cie", cleanCompany)
  if (installer.postalCode) url.searchParams.set("code", String(installer.postalCode).trim())
  url.searchParams.set("email", normalizeEmail(installer.email))
  if (installer.phone) url.searchParams.set("phone", String(installer.phone).trim())
  url.searchParams.set("leadId", campaign.leadId)
  url.searchParams.set("utm_source", "outreach_rescert")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", campaign.key)
  return url.toString()
}

function buildCampaignEmail(installer, campaign) {
  const personName = formatDisplayPerson(installer.certifiedPerson)
  const company = decodeHtmlEntities(installer.companyName).trim()
  const inviteUrl = buildInviteUrl(installer, campaign)
  const greeting = personName ? `Bonjour ${personName},` : "Bonjour,"
  const subject = company
    ? `${company} — ${campaign.subjectPrefix}`
    : campaign.subjectPrefix

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:22px 28px;border-bottom:1px solid #E2E8F0;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="https://www.aegissolaire.com/logo.png" alt="Aegis Solaire" width="136" style="display:block;height:auto;max-width:136px;border:0;" />
                  </td>
                  <td align="right" style="vertical-align:middle;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:0.06em;color:#475569;text-transform:uppercase;">
                    RÉSEAU RESCERT WALLONIE
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#0F172A;">
                ${escapeHtml(greeting)}
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                En tant qu&apos;installateur certifié RESCERT actif dans votre zone${company ? ` (${escapeHtml(company)})` : ""}, nous vous soumettons un dossier photovoltaïque qualifié disponible dans le secteur de <strong>${escapeHtml(campaign.city)} (${escapeHtml(campaign.postalCode)})</strong>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:4px 28px 20px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #CBD5E1;border-radius:8px;overflow:hidden;background-color:#F8FAFC;">
                <tr>
                  <td style="padding:10px 16px;background-color:#0F172A;color:#F8FAFC;font-family:'SFMono-Regular',Consolas,monospace;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
                    ${escapeHtml(campaign.badge)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <img src="${escapeHtml(campaign.imageUrl)}" alt="Aperçu toiture ${escapeHtml(campaign.postalCode)} ${escapeHtml(campaign.city)}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 18px 16px 18px;background-color:#FFFFFF;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 0 8px 0;font-size:16px;font-weight:700;color:#0F172A;">
                          Projet ${escapeHtml(campaign.postalCode)} ${escapeHtml(campaign.city)} · ${escapeHtml(campaign.province)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#334155;">
                          <strong>Bâtiment :</strong> ${escapeHtml(campaign.housingType)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#334155;">
                          <strong>Dimensionnement :</strong> ${escapeHtml(campaign.systemSpec)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#334155;">
                          <strong>Consommation :</strong> ${escapeHtml(campaign.billSpec)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 0 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;font-weight:700;color:#0F172A;">
                          Tarif d&apos;accès unitaire : ${escapeHtml(campaign.priceLabel)} · ${escapeHtml(campaign.exclusivityShort)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 20px 28px;">
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#334155;">
                Contrairement aux comparateurs classiques, Aegis Solaire ne vend jamais un même prospect à 5 ou 10 concurrents, n&apos;impose aucun abonnement mensuel et ne prélève aucune commission sur vos devis signés. Les coordonnées complètes, le dossier photo haute définition et le calcul d&apos;implantation sont débloqués directement dans votre espace partenaire après validation de votre agrément RESCERT.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius:6px;background-color:#D97706;">
                    <a href="${escapeHtml(inviteUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;">
                      Activer mon accès et consulter le dossier (${escapeHtml(campaign.postalCode)})
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 24px 28px;border-top:1px solid #E2E8F0;background-color:#F8FAFC;">
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#0F172A;font-weight:600;">
                La Direction des Partenariats — Aegis Solaire
              </p>
              <p style="margin:0 0 10px 0;font-size:12px;line-height:1.5;color:#64748B;">
                Réseau d&apos;ingénierie &amp; qualification photovoltaïque · Wallonie &amp; Bruxelles · <a href="mailto:contact@aegissolaire.com" style="color:#475569;text-decoration:underline;">contact@aegissolaire.com</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#94A3B8;">
                Invitation B2B adressée aux professionnels certifiés RESCERT. Si vous ne souhaitez plus recevoir nos alertes de chantiers régionaux, répondez simplement « STOP » à cet e-mail ou cliquez sur <a href="mailto:contact@aegissolaire.com?subject=D%C3%A9sinscription%20r%C3%A9seau%20Aegis%20Solaire" style="color:#64748B;text-decoration:underline;">se désinscrire</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${greeting}

En tant qu'installateur certifié RESCERT actif dans votre zone${company ? ` (${company})` : ""}, nous vous soumettons un dossier photovoltaïque qualifié disponible dans le secteur de ${campaign.city} (${campaign.postalCode}).

DÉTAILS DU PROJET (${campaign.exclusivityShort})
- Localisation : ${campaign.postalCode} ${campaign.city} (${campaign.province})
- Bâtiment : ${campaign.housingType}
- Dimensionnement : ${campaign.systemSpec}
- Consommation : ${campaign.billSpec}
- Tarif d'accès unitaire : ${campaign.priceLabel} (sans abonnement ni commission)

Activer votre accès et consulter le dossier complet :
${inviteUrl}

La Direction des Partenariats — Aegis Solaire
contact@aegissolaire.com

Pour ne plus recevoir d'opportunités de chantiers régionaux, répondez simplement « STOP » à cet e-mail.`

  return { subject, html, text, inviteUrl }
}

function getResendFromHeader() {
  const raw = (process.env.OUTREACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com").trim()
  const angleMatch = raw.match(/<([^>]+)>/)
  const emailAddr = (angleMatch ? angleMatch[1] : raw).trim()
  return `Aegis Solaire <${emailAddr}>`
}

const mxCache = new Map()
async function hasValidMxRecord(email) {
  const domain = String(email || "").split("@")[1]?.toLowerCase().trim()
  if (!domain) return false
  if (mxCache.has(domain)) return mxCache.get(domain)
  try {
    const records = await dns.resolveMx(domain)
    const ok = Array.isArray(records) && records.length > 0
    mxCache.set(domain, ok)
    return ok
  } catch {
    mxCache.set(domain, false)
    return false
  }
}

async function sendViaResend({ to, subject, html, text, tag, idempotencyKey }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY missing in environment")

  const mxOk = await hasValidMxRecord(to)
  if (!mxOk) {
    throw new Error(`Invalid recipient domain (no MX record): ${to}`)
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: getResendFromHeader(),
      to: [to],
      reply_to: "contact@aegissolaire.com",
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": "<mailto:contact@aegissolaire.com?subject=Desinscription>",
      },
      tags: [{ name: "campaign", value: tag }],
    }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Resend HTTP ${res.status}: ${JSON.stringify(payload)}`)
  }
  return payload
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const rescertPath = path.join(ROOT, "lib/data/rescert-wallonie-installateurs.json")
  const optoutPath = path.join(ROOT, "lib/data/optout-emails.json")
  const b2cOptoutPath = path.join(ROOT, "lib/data/b2c-optout-emails.json")

  const installers = JSON.parse(fs.readFileSync(rescertPath, "utf8"))
  const optouts = JSON.parse(fs.readFileSync(optoutPath, "utf8")).map(normalizeEmail)
  const b2cOptouts = fs.existsSync(b2cOptoutPath)
    ? JSON.parse(fs.readFileSync(b2cOptoutPath, "utf8")).map(normalizeEmail)
    : []

  const excluded = new Set([
    ...optouts,
    ...b2cOptouts,
    ...HARD_BOUNCED_EMAILS.map(normalizeEmail),
    ...ALREADY_REGISTERED_EMAILS.map(normalizeEmail),
  ])

  const priorCounts = {}
  for (const relPath of PRIOR_REPORT_FILES) {
    const list = extractExcludedFromReport(relPath)
    priorCounts[relPath] = list.length
    for (const email of list) excluded.add(email)
  }

  console.log("Prior report exclusions:", priorCounts)
  console.log("Total unique excluded emails:", excluded.size)

  const fromHeader = getResendFromHeader()
  for (const rx of FORBIDDEN_PATTERNS) {
    if (rx.test(fromHeader)) {
      throw new Error(`Forbidden content match (${rx}) in From header: ${fromHeader}`)
    }
  }
  for (const campaign of CAMPAIGNS) {
    const neutral = buildCampaignEmail(
      {
        certifiedPerson: "Jean Test",
        companyName: "TestSolar SRL",
        postalCode: campaign.postalCode,
        email: "test@example.com",
        phone: "0470000000",
      },
      campaign
    )
    for (const rx of FORBIDDEN_PATTERNS) {
      if (
        rx.test(neutral.subject) ||
        rx.test(neutral.html) ||
        rx.test(neutral.text) ||
        rx.test(neutral.inviteUrl)
      ) {
        throw new Error(`Forbidden template content match (${rx}) in ${campaign.key}`)
      }
    }
  }

  const seenEmailsInBatch = new Set()
  const plannedByCampaign = []

  for (const campaign of CAMPAIGNS) {
    const recipients = []
    for (const inst of installers) {
      const email = normalizeEmail(inst.email)
      if (!email || !email.includes("@")) continue
      if (excluded.has(email)) continue
      if (seenEmailsInBatch.has(email)) continue
      if (!campaign.matchFilter(inst)) continue
      if (isBlacklisted(inst, campaign.blacklist)) continue

      seenEmailsInBatch.add(email)
      const built = buildCampaignEmail(inst, campaign)

      recipients.push({
        installerId: inst.id,
        companyName: inst.companyName,
        certifiedPerson: inst.certifiedPerson,
        postalCode: inst.postalCode,
        city: inst.city,
        email,
        ...built,
      })
    }

    plannedByCampaign.push({
      campaign,
      recipients,
    })
  }

  let grandTotal = 0
  console.log("\n=== WAVE BATCH 2 PLAN ===")
  for (const { campaign, recipients } of plannedByCampaign) {
    grandTotal += recipients.length
    console.log(`- ${campaign.name} [${campaign.key}] -> ${recipients.length} recipients`)
  }
  console.log(`TOTAL RECIPIENTS: ${grandTotal}`)

  if (DRY_RUN) {
    const previewSample = plannedByCampaign
      .filter((x) => x.recipients.length > 0)
      .map(({ campaign, recipients }) => ({
        key: campaign.key,
        count: recipients.length,
        sample: {
          to: recipients[0].email,
          company: recipients[0].companyName,
          postalCode: recipients[0].postalCode,
          subject: recipients[0].subject,
          inviteUrl: recipients[0].inviteUrl,
        },
      }))
    console.log("\nDry-run samples:", JSON.stringify(previewSample, null, 2))
    return
  }

  const report = {
    executedAt: new Date().toISOString(),
    totalPlanned: grandTotal,
    totalSent: 0,
    totalFailed: 0,
    byCampaign: {},
    sent: [],
    failed: [],
  }

  let index = 0
  for (const { campaign, recipients } of plannedByCampaign) {
    report.byCampaign[campaign.key] = {
      name: campaign.name,
      leadId: campaign.leadId,
      planned: recipients.length,
      sent: 0,
      failed: 0,
    }

    for (const r of recipients) {
      index += 1
      try {
        const res = await sendViaResend({
          to: r.email,
          subject: r.subject,
          html: r.html,
          text: r.text,
          tag: campaign.key,
          idempotencyKey: `aegis-batch2-${campaign.key}-${r.email}`,
        })
        report.totalSent += 1
        report.byCampaign[campaign.key].sent += 1
        report.sent.push({
          campaignKey: campaign.key,
          leadId: campaign.leadId,
          email: r.email,
          companyName: r.companyName,
          postalCode: r.postalCode,
          resendId: res.id || null,
          sentAt: new Date().toISOString(),
        })
        console.log(`[${index}/${grandTotal}] SENT ${campaign.key} -> ${r.email} (${res.id})`)
      } catch (err) {
        report.totalFailed += 1
        report.byCampaign[campaign.key].failed += 1
        report.failed.push({
          campaignKey: campaign.key,
          email: r.email,
          companyName: r.companyName,
          error: err instanceof Error ? err.message : String(err),
        })
        console.error(`[${index}/${grandTotal}] FAIL ${campaign.key} -> ${r.email}: ${err.message}`)
      }

      if (index < grandTotal) {
        await sleep(SEND_DELAY_MS)
      }
    }
  }

  const reportPath = path.join(ROOT, "scratch/wave-batch2-execution-report.json")
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8")
  console.log(`\nSaved execution report to ${reportPath}`)
  console.log(`Summary: ${report.totalSent} sent, ${report.totalFailed} failed.`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
