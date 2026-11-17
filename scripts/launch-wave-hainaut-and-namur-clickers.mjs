import fs from "node:fs"
import path from "node:path"
import dns from "node:dns/promises"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")

// Load .env.local
const envPath = path.join(ROOT, ".env.local")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

const SHOULD_SEND = process.argv.includes("--send")
const TEST_TO = process.argv.find((a) => a.startsWith("--test-to="))?.split("=")[1]?.trim() || ""
const DRY_RUN = (!SHOULD_SEND && !TEST_TO) || process.argv.includes("--dry-run")
const waveArg = process.argv.find((a) => a.startsWith("--wave="))?.split("=")[1] || "all"
const SEND_DELAY_MS = 1800

const HARD_BOUNCED_EMAILS = [
  "info.sowatts@gmail.com",
  "frederik.ruison@bilfinger.com",
  "contact@hotelec.be",
  "rc@hotelec.be",
  "frederic@homegridsolutions.be",
  "contact@wenergy-consulting.com",
  "thibaut.cougnet@we-green.be",
  "adriano.cremona@corelis.be",
  "tristan@electrici-t.be",
  "info@renovalenergie.be",
  "bensilvio2000@yahoo.fr",
  "olivier@carodel.net",
  "gert@aaves.be",
  "contact@performa.be",
  "info@lazogroup.be",
  "berardozzi@outlook.fr",
  "pro@ecotoit-energie.be",
  "contact@solaris-wallonie.be",
  "direction@ardenne-watts.be",
  "rh@monnaie.be",
  "pierregomand@gogui.be",
  "anthony.devleeshouwer@gmail.com",
  "info@elthium.be",
  "val@renovalenergie.be",
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
  "rudyboudin@gmail.com",
  "support@msi-corporation.com",
  "info@sprlboag.be",
  "pierre@lagaese.be",
  "peb@energytips.be",
]

const PRIOR_REPORT_FILES = [
  "scratch/wave1-execution-report.json",
  "scratch/wave2-execution-report.json",
  "scratch/wave-liege1-execution-report.json",
  "scratch/wave-namur1-execution-report.json",
  "scratch/wave-batch2-execution-report.json",
  "scratch/wave-real-leads-4waves-report.json",
]

const NAMUR_WARM_CLICKER_EMAILS = [
  "info@electrobruyr.be",
  "ldcproject.srl@gmail.com",
  "myriam.taymans@groupvhc.be",
  "donatienne.portugaels@gmail.com",
]

const BLACKLIST_TERMS = [
  "auvray",
  "housing energy",
  "ideal energy",
  "ideal-energy",
  "watup",
  "mc industry",
  "mc-industry",
  "mcindustry",
  "batelex",
  "hotelec",
  "etienne botman",
  "giacomo zenoni",
  "enolix",
  "bryan lardinois",
]

// Interdiction absolue : noms personnels, noms de prospects, leads retirés (5630 Cerfontaine, 4300 Bovenistier), émojis, clés brutes
const STRICT_GLOBAL_PATTERNS = [
  /nathan\s+remacle/i,
  /fabrice\s+remacle/i,
  /vermeulen/i,
  /maadaoui/i,
  /hermine/i,
  /philippekin/i,
  /marcelino/i,
  /carlos/i,
  /jancar/i,
  /verlaers/i,
  /jenny/i,
  /rousseau/i,
  /cerfontaine/i,
  /\b5630\b/,
  /76c42ad7/i,
  /bovenistier/i,
  /\b4300\b/,
  /98c09b29/i,
  /owner_occupied/i,
  /cost_reduction/i,
  /3_months/i,
  /[🔒🛡️⚡🎯👉✅]/u,
]

const FORBIDDEN_TEMPLATE_PATTERNS = [
  ...STRICT_GLOBAL_PATTERNS,
  /nathan/i,
  /fabrice/i,
  /remacle/i,
  /serge/i,
  /pascal/i,
  /nathalie/i,
  /olivier/i,
]

const REAL_LEADS = {
  moulbaix_7812: {
    key: "moulbaix_7812",
    id: "1867cfb3-2bc0-4589-bba8-64946229c254",
    postalCode: "7812",
    city: "Moulbaix (Ath)",
    province: "Hainaut Occidental",
    badge: "NOUVEAU DOSSIER VÉRIFIÉ · 0/3 PLACE PRISE",
    exclusivityShort: "Plafonné à 3 installateurs max · 0/3 place prise",
    housingType: "Maison mitoyenne · Grande toiture tuiles (~65 m²)",
    systemSpec: "Estimation ~3,9 kWc (9 panneaux · ~3 229 kWh/an)",
    billSpec: "~1 480 €/an (4 000 – 5 000 kWh/an)",
    highlights: "Propriétaire occupant · Adresse exacte certifiée SPW ICAR 100 % · 1er contact par écrit",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-moulbaix-7812-blurred.jpg",
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
  gerpinnes_6280: {
    key: "gerpinnes_6280",
    id: "bd3d6c78-0acb-4b59-8f96-ff9817f634f7",
    postalCode: "6280",
    city: "Gerpinnes",
    province: "Hainaut / Entre-Sambre-et-Meuse",
    badge: "DERNIÈRE PLACE DISPONIBLE · 2/3 PRISES",
    exclusivityShort: "Plafonné à 3 installateurs max · 1 dernière place restante",
    housingType: "Maison 4 façades isolée · Toiture ~42 m² tuiles",
    systemSpec: "Estimation ~4,8 kWc (11 panneaux)",
    billSpec: "1 820 €/an (5 000 – 6 000 kWh/an)",
    highlights: "Propriétaire occupant · Adresse exacte certifiée SPW ICAR 100 %",
    imageUrl: "", // STRICT: Aucune photo pour Gerpinnes
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
  nameche_5300: {
    key: "nameche_5300",
    id: "a63dd867-8e1c-47e9-b4d0-93818b0a667a",
    postalCode: "5300",
    city: "Namêche (Andenne)",
    province: "Namur · Vallée de la Meuse",
    badge: "DOSSIER VÉRIFIÉ · 2 PLACES RESTANTES (1/3 PRISE)",
    exclusivityShort: "Plafonné à 3 installateurs max · 2 places restantes",
    housingType: "Maison 4 façades · Toiture ~42 m² tuiles",
    systemSpec: "Estimation ~3,0 kWc (7 panneaux)",
    billSpec: "1 150 €/an (3 500 kWh/an)",
    highlights: "Propriétaire occupant · Adresse exacte certifiée SPW ICAR 100 %",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-nameche-5300-blurred.jpg",
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
  roly_5600: {
    key: "roly_5600",
    id: "413e8eae-8168-4907-bcaa-558204ac6aba",
    postalCode: "5600",
    city: "Roly (Philippeville)",
    province: "Province de Namur",
    badge: "DERNIÈRE PLACE DISPONIBLE · APPEL DIRECT AUTORISÉ",
    exclusivityShort: "Plafonné à 3 installateurs max · 1 dernière place restante (2/3 prises)",
    housingType: "Maison 4 façades · Toiture ~65 m² tuiles",
    systemSpec: "Estimation ~6,1 kWc (14 panneaux)",
    billSpec: "2 300 €/an (> 6 000 kWh/an)",
    highlights: "Propriétaire occupant · Appel téléphonique direct autorisé (9h–18h)",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-roly-5600-blurred.jpg",
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
}

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

function isBlacklisted(installer) {
  const haystack = `${installer.companyName || ""} ${installer.email || ""} ${installer.certifiedPerson || ""}`.toLowerCase()
  return BLACKLIST_TERMS.some((t) => haystack.includes(t))
}

function formatDisplayPerson(raw) {
  const s = decodeHtmlEntities(raw).trim()
  if (!s) return ""
  return s
    .split(/\s+/)
    .map((w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ")
}

function buildInviteUrl(installer, leadId, campaignKey) {
  const url = new URL("https://www.aegissolaire.com/partenaires/invitation")
  const cleanName = formatDisplayPerson(installer.certifiedPerson)
  const cleanCompany = decodeHtmlEntities(installer.companyName).trim()
  if (cleanName) url.searchParams.set("nom", cleanName)
  if (cleanCompany) url.searchParams.set("cie", cleanCompany)
  if (installer.postalCode) url.searchParams.set("code", String(installer.postalCode).trim())
  url.searchParams.set("email", normalizeEmail(installer.email))
  if (installer.phone) url.searchParams.set("phone", String(installer.phone).trim())
  url.searchParams.set("leadId", leadId)
  url.searchParams.set("utm_source", "outreach_rescert")
  url.searchParams.set("utm_medium", "email")
  url.searchParams.set("utm_campaign", campaignKey)
  return url.toString()
}

function renderLeadCardHtml(installer, lead, campaignKey) {
  const inviteUrl = buildInviteUrl(installer, lead.id, campaignKey)
  const photoRow = lead.imageUrl
    ? `
      <tr>
        <td style="padding:0;">
          <img src="${escapeHtml(lead.imageUrl)}" alt="Aperçu toiture ${escapeHtml(lead.postalCode)} ${escapeHtml(lead.city)}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;" />
        </td>
      </tr>`
    : ""

  return `
    <!-- CARD:${lead.id} -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:18px;border:1px solid #CBD5E1;border-radius:8px;overflow:hidden;background-color:#F8FAFC;">
      <tr>
        <td style="padding:10px 16px;background-color:#0F172A;color:#F8FAFC;font-family:'SFMono-Regular',Consolas,monospace;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
          ${escapeHtml(lead.badge)}
        </td>
      </tr>${photoRow}
      <tr>
        <td style="padding:18px 18px 16px 18px;background-color:#FFFFFF;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:0 0 8px 0;font-size:16px;font-weight:700;color:#0F172A;">
                Projet ${escapeHtml(lead.postalCode)} ${escapeHtml(lead.city)} · ${escapeHtml(lead.province)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#334155;">
                <strong>Bâtiment :</strong> ${escapeHtml(lead.housingType)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#334155;">
                <strong>Dimensionnement :</strong> ${escapeHtml(lead.systemSpec)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#334155;">
                <strong>Consommation :</strong> ${escapeHtml(lead.billSpec)}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#334155;">
                <strong>Qualification :</strong> ${escapeHtml(lead.highlights)}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0 14px 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:13px;font-weight:700;color:#0F172A;">
                Tarif d&apos;accès unitaire : ${escapeHtml(lead.priceLabel)} · ${escapeHtml(lead.exclusivityShort)}
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:6px;background-color:#D97706;">
                      <a href="${escapeHtml(inviteUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;">
                        Activer mon accès et consulter le dossier (${escapeHtml(lead.postalCode)})
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!-- /CARD:${lead.id} -->`
}

function buildMultiLeadEmail({ installer, leads, subjectPrefix, introText, campaignKey, preheaderText }) {
  const personName = formatDisplayPerson(installer.certifiedPerson)
  const company = decodeHtmlEntities(installer.companyName).trim()
  const greeting = personName ? `Bonjour ${personName},` : "Bonjour,"
  const subject = company ? `${company} — ${subjectPrefix}` : subjectPrefix

  const cardsHtml = leads.map((l) => renderLeadCardHtml(installer, l, campaignKey)).join("\n")
  const primaryInviteUrl = buildInviteUrl(installer, leads[0].id, campaignKey)

  const cardsText = leads
    .map((l, idx) => {
      const url = buildInviteUrl(installer, l.id, campaignKey)
      return `DOSSIER #${idx + 1} — ${l.postalCode} ${l.city} (${l.province})
- Bâtiment : ${l.housingType}
- Dimensionnement : ${l.systemSpec}
- Consommation : ${l.billSpec}
- Qualification : ${l.highlights}
- Accès : ${l.priceLabel} (${l.exclusivityShort})
- Consulter & débloquer : ${url}`
    })
    .join("\n\n")

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
  <div style="display:none;max-height:0px;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheaderText)}
  </div>
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
                ${escapeHtml(introText)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:4px 28px 12px 28px;">
              ${cardsHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 22px 28px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
                Contrairement aux comparateurs classiques, Aegis Solaire ne vend jamais un même prospect à 5 ou 10 concurrents, n&apos;impose aucun abonnement mensuel et ne prélève aucune commission sur vos devis signés. Les coordonnées complètes, l&apos;adresse certifiée et les données techniques sont débloquées directement dans votre espace partenaire après validation de votre agrément RESCERT.
              </p>
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

${introText}

${cardsText}

Contrairement aux comparateurs classiques : zéro abonnement mensuel, zéro commission sur vos devis signés, maximum 3 installateurs par dossier B2C.

La Direction des Partenariats — Aegis Solaire
contact@aegissolaire.com

Pour ne plus recevoir d'opportunités de chantiers régionaux, répondez simplement « STOP » à cet e-mail.`

  return { subject, html, text, primaryInviteUrl }
}

function getResendFromHeader() {
  const raw = (process.env.OUTREACH_FROM_EMAIL || "partenaires@partenaires.aegissolaire.com").trim()
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

async function fetchAllResendEmails(apiKey) {
  const all = []
  let after = null
  for (let page = 0; page < 30; page++) {
    const url = "https://api.resend.com/emails?limit=100" + (after ? "&after=" + after : "")
    const res = await fetch(url, { headers: { Authorization: "Bearer " + apiKey } })
    const json = await res.json()
    if (!json.data || json.data.length === 0) break
    all.push(...json.data)
    if (!json.has_more) break
    after = json.data[json.data.length - 1].id
  }
  return all
}

function extractSentFromReports() {
  const emailed = new Set()
  for (const relPath of PRIOR_REPORT_FILES) {
    const full = path.join(ROOT, relPath)
    if (!fs.existsSync(full)) continue
    const data = JSON.parse(fs.readFileSync(full, "utf8"))
    for (const arr of [data.sent, data.sentEmails, data.results, data.recipients, data.emails, data.logs]) {
      if (!Array.isArray(arr)) continue
      for (const item of arr) {
        const em = normalizeEmail(typeof item === "string" ? item : item?.email || item?.to || item?.recipient)
        if (em) emailed.add(em)
      }
    }
  }
  return emailed
}

function assertGerpinnesHasNoRoofImage(html) {
  const markerStart = `<!-- CARD:${REAL_LEADS.gerpinnes_6280.id} -->`
  const markerEnd = `<!-- /CARD:${REAL_LEADS.gerpinnes_6280.id} -->`
  const startIdx = html.indexOf(markerStart)
  if (startIdx === -1) return
  const endIdx = html.indexOf(markerEnd, startIdx)
  if (endIdx === -1) throw new Error("Gerpinnes card closing marker missing")
  const cardSlice = html.slice(startIdx, endIdx)
  if (/<img\b/i.test(cardSlice)) {
    throw new Error("SECURITY/RULE VIOLATION: <img> found inside Gerpinnes (6280) card!")
  }
}

async function sendViaResend({ to, subject, html, text, tag, idempotencyKey }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY missing in environment")

  const mxOk = await hasValidMxRecord(to)
  if (!mxOk) throw new Error(`Invalid recipient domain (no MX record): ${to}`)

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
    const err = new Error(`Resend HTTP ${res.status}: ${JSON.stringify(payload)}`)
    err.status = res.status
    err.payload = payload
    throw err
  }
  return payload
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY missing")
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase credentials missing")

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

  // 1. Read-only live verification of the 4 active leads (never touches withdrawn leads!)
  const activeIds = Object.values(REAL_LEADS).map((l) => l.id)
  const [{ data: liveLeads, error: lErr }, { data: livePurchases, error: pErr }, { data: partners }, { data: apps }] =
    await Promise.all([
      supabase.from("leads").select("id,postal_code,city,status,marketplace_status").in("id", activeIds),
      supabase.from("lead_purchases").select("lead_id").in("lead_id", activeIds),
      supabase.from("partners").select("email"),
      supabase.from("installer_applications").select("email,status"),
    ])

  if (lErr) throw lErr
  if (pErr) throw pErr

  const slotCounts = {}
  for (const row of livePurchases || []) {
    slotCounts[row.lead_id] = (slotCounts[row.lead_id] || 0) + 1
  }
  const liveLeadMap = new Map((liveLeads || []).map((l) => [l.id, l]))

  console.log("=== LIVE READ-ONLY MARKETPLACE LEAD CHECK ===")
  for (const lead of Object.values(REAL_LEADS)) {
    const row = liveLeadMap.get(lead.id)
    const sold = slotCounts[lead.id] || 0
    if (!row || row.marketplace_status !== "available" || sold >= 3) {
      throw new Error(
        `Lead ${lead.postalCode} (${lead.id}) is not available for outreach! status=${row?.marketplace_status}, sold=${sold}/3`
      )
    }
    if (lead.imageUrl) {
      const head = await fetch(lead.imageUrl, { method: "HEAD" })
      if (!head.ok) {
        throw new Error(`Blurred photo unreachable for ${lead.postalCode}: ${lead.imageUrl} (HTTP ${head.status})`)
      }
    }
    console.log(`  ✓ ${lead.postalCode} ${lead.city} (${lead.id.slice(0, 8)}) : ${row.marketplace_status}, ${sold}/3 slots prises`)
  }

  // 2. Exclusions & historical outreach tracking
  const rescertPath = path.join(ROOT, "lib/data/rescert-wallonie-installateurs.json")
  const optoutPath = path.join(ROOT, "lib/data/optout-emails.json")
  const b2cOptoutPath = path.join(ROOT, "lib/data/b2c-optout-emails.json")

  const installers = JSON.parse(fs.readFileSync(rescertPath, "utf8"))
  const optouts = JSON.parse(fs.readFileSync(optoutPath, "utf8")).map(normalizeEmail)
  const b2cOptouts = fs.existsSync(b2cOptoutPath)
    ? JSON.parse(fs.readFileSync(b2cOptoutPath, "utf8")).map(normalizeEmail)
    : []

  console.log("\nFetching live Resend email history...")
  const resendHistory = await fetchAllResendEmails(apiKey)
  const resendEmailed = new Set()
  const resendBouncedOrComplained = new Set()
  for (const e of resendHistory) {
    for (const to of e.to || []) {
      const em = normalizeEmail(to)
      if (!em) continue
      resendEmailed.add(em)
      if (e.last_event === "bounced" || e.last_event === "complained") {
        resendBouncedOrComplained.add(em)
      }
    }
  }

  const dbRegisteredEmails = new Set([
    ...(partners || []).map((p) => normalizeEmail(p.email)),
    ...(apps || []).filter((a) => a.status !== "rejected").map((a) => normalizeEmail(a.email)),
  ])

  const excluded = new Set([
    ...optouts,
    ...b2cOptouts,
    ...HARD_BOUNCED_EMAILS.map(normalizeEmail),
    ...ALREADY_REGISTERED_EMAILS.map(normalizeEmail),
    ...resendBouncedOrComplained,
    ...dbRegisteredEmails,
  ])

  const reportEmailed = extractSentFromReports()
  const previouslyEmailed = new Set([...reportEmailed, ...resendEmailed])

  // Check From header & neutral templates
  const fromHeader = getResendFromHeader()
  console.log(`From header: ${fromHeader} | Resend history: ${resendHistory.length} | Excluded: ${excluded.size}`)

  const dummyInst = {
    certifiedPerson: "Jean Test",
    companyName: "TestSolar SRL",
    postalCode: "7000",
    email: "test@example.com",
    phone: "0470000000",
  }
  for (const cfg of [
    {
      name: "hainaut_moulbaix_first",
      leads: [REAL_LEADS.moulbaix_7812, REAL_LEADS.gerpinnes_6280],
      subjectPrefix: "Chantier photovoltaïque vérifié à Moulbaix / Ath (7812) + Gerpinnes (6280)",
      introText: "Test intro hainaut",
      campaignKey: "test_h",
      preheaderText: "Test preheader",
    },
    {
      name: "namur_clickers_3_active",
      leads: [REAL_LEADS.nameche_5300, REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280],
      subjectPrefix: "Derniers créneaux disponibles : Namêche (5300, 2 places), Roly (5600) & Gerpinnes (6280)",
      introText: "Test intro namur",
      campaignKey: "test_n",
      preheaderText: "Test preheader",
    },
  ]) {
    const built = buildMultiLeadEmail({ installer: dummyInst, ...cfg })
    assertGerpinnesHasNoRoofImage(built.html)
    for (const rx of FORBIDDEN_TEMPLATE_PATTERNS) {
      if (rx.test(built.subject) || rx.test(built.html) || rx.test(built.text) || rx.test(built.primaryInviteUrl)) {
        throw new Error(`Forbidden template content match (${rx}) in ${cfg.name}`)
      }
    }
  }

  const instByEmail = new Map()
  for (const inst of installers) {
    const em = normalizeEmail(inst.email)
    if (em && !instByEmail.has(em)) instByEmail.set(em, inst)
  }

  const waves = {
    wave_hainaut_west_moulbaix_gerpinnes: {
      label: "Vague 1 — Hainaut vierge (113) + 78xx non-inscrits (ex-Wemmel) -> 7812 Moulbaix (0/3) + 6280 Gerpinnes (2/3)",
      items: [],
    },
    wave_namur_clickers_update: {
      label: "Vague 2 — 4 cliqueurs chauds de Namur -> 5300 Namêche (2 places), 5600 Roly (1 place) & 6280 Gerpinnes (1 place)",
      items: [],
    },
  }

  const seenEmailsInRun = new Set()
  let skippedInvalidMx = []

  // --- WAVE 1: Hainaut never emailed + 78xx unregistered ---
  if (waveArg === "all" || waveArg === "hainaut") {
    // Track who was in wave_d2_hainaut78_virgin for reporting distinction
    const rep4 = fs.existsSync(path.join(ROOT, "scratch/wave-real-leads-4waves-report.json"))
      ? JSON.parse(fs.readFileSync(path.join(ROOT, "scratch/wave-real-leads-4waves-report.json"), "utf8"))
      : { sent: [] }
    const d2Emails = new Set(
      (rep4.sent || []).filter((s) => s.waveKey === "wave_d2_hainaut78_virgin").map((s) => normalizeEmail(s.email))
    )

    for (const inst of installers) {
      if (inst.provinceKey !== "hainaut") continue
      const email = normalizeEmail(inst.email)
      if (!email || !email.includes("@")) continue
      if (excluded.has(email) || seenEmailsInRun.has(email) || isBlacklisted(inst)) continue

      const cp = String(inst.postalCode || "").trim()
      const cp2 = cp.slice(0, 2)
      const isVirgin = !previouslyEmailed.has(email)
      const is78WemmelOnly = cp2 === "78" && d2Emails.has(email)
      if (!isVirgin && !is78WemmelOnly) continue

      const mxOk = await hasValidMxRecord(email)
      if (!mxOk) {
        skippedInvalidMx.push({ wave: "hainaut", email, company: inst.companyName, cp })
        continue
      }

      seenEmailsInRun.add(email)
      const isSouthCharleroi = ["60", "64", "65"].includes(cp2)
      const orderedLeads = isSouthCharleroi
        ? [REAL_LEADS.gerpinnes_6280, REAL_LEADS.moulbaix_7812]
        : [REAL_LEADS.moulbaix_7812, REAL_LEADS.gerpinnes_6280]

      const subjectPrefix = isSouthCharleroi
        ? "Dernière place à Gerpinnes (6280) + nouveau dossier à Moulbaix / Ath (7812)"
        : "Nouveau chantier photovoltaïque vérifié à Moulbaix / Ath (7812) + Gerpinnes (6280)"

      const introText = isSouthCharleroi
        ? "En tant qu'installateur certifié RESCERT actif en Hainaut, nous vous soumettons deux dossiers photovoltaïques réels actuellement ouverts sur notre réseau : la dernière place disponible à Gerpinnes (6280, maison 4 façades) et un nouveau projet vérifié à Moulbaix / Ath (7812, 0/3 place prise)."
        : is78WemmelOnly
          ? "Suite à notre récente prise de contact pour la périphérie bruxelloise, nous ouvrons aujourd'hui un premier dossier photovoltaïque réel au cœur de votre secteur direct : à Moulbaix / Ath (7812, 0/3 place prise, adresse certifiée SPW), accompagné d'une dernière place disponible à Gerpinnes (6280)."
          : "En tant qu'installateur certifié RESCERT actif en Hainaut, nous vous soumettons un nouveau dossier photovoltaïque réel qualifié aujourd'hui dans votre région à Moulbaix / Ath (7812, 0/3 place prise, adresse certifiée SPW), ainsi qu'une dernière place disponible à Gerpinnes (6280)."

      const preheaderText =
        "Dossier réel 7812 Moulbaix (0/3 place prise, 4 500 kWh/an) + dernière place 6280 Gerpinnes."

      const templateConfig = {
        leads: orderedLeads,
        subjectPrefix,
        introText,
        campaignKey: "wave_hainaut_west_moulbaix_gerpinnes",
        preheaderText,
      }
      const built = buildMultiLeadEmail({
        installer: inst,
        ...templateConfig,
      })

      waves.wave_hainaut_west_moulbaix_gerpinnes.items.push({
        waveKey: "wave_hainaut_west_moulbaix_gerpinnes",
        subGroup: is78WemmelOnly ? "78xx_ex_wemmel" : `virgin_${cp2}`,
        installerId: inst.id,
        companyName: inst.companyName,
        certifiedPerson: inst.certifiedPerson,
        postalCode: cp,
        city: inst.city,
        email,
        leadIds: orderedLeads.map((l) => l.id),
        templateConfig,
        ...built,
      })
    }
  }

  // --- WAVE 2: 4 Namur warm clickers (STRICTLY without 5630 Cerfontaine) ---
  if (waveArg === "all" || waveArg === "namur") {
    for (const targetEmail of NAMUR_WARM_CLICKER_EMAILS) {
      const email = normalizeEmail(targetEmail)
      const inst = instByEmail.get(email)
      if (!inst) throw new Error(`Namur clicker missing from RESCERT JSON: ${email}`)
      if (excluded.has(email) || seenEmailsInRun.has(email) || isBlacklisted(inst)) {
        console.log(`[Wave Namur] Skipping excluded: ${email}`)
        continue
      }
      const mxOk = await hasValidMxRecord(email)
      if (!mxOk) {
        skippedInvalidMx.push({ wave: "namur", email, company: inst.companyName, cp: inst.postalCode })
        continue
      }

      seenEmailsInRun.add(email)
      const cp2 = String(inst.postalCode || "").trim().slice(0, 2)
      const orderedLeads =
        cp2 === "53"
          ? [REAL_LEADS.nameche_5300, REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280]
          : [REAL_LEADS.nameche_5300, REAL_LEADS.gerpinnes_6280, REAL_LEADS.roly_5600]

      const templateConfig = {
        leads: orderedLeads,
        subjectPrefix: "Derniers créneaux disponibles : Namêche (5300, 2 places), Roly (5600) & Gerpinnes (6280)",
        introText:
          "Suite à l'intérêt que vous avez manifesté récemment, voici l'état actualisé des dossiers photovoltaïques vérifiés encore ouverts en province de Namur et en bordure immédiate : 2 places restent disponibles à Namêche (5300), et 1 seule dernière place est encore ouverte à Roly (5600) ainsi qu'à Gerpinnes (6280) avant clôture définitive.",
        campaignKey: "wave_namur_clickers_update",
        preheaderText: "Point créneaux Namur : 5300 Namêche (2 places), 5600 Roly (1 place), 6280 Gerpinnes (1 place).",
      }
      const built = buildMultiLeadEmail({
        installer: inst,
        ...templateConfig,
      })

      waves.wave_namur_clickers_update.items.push({
        waveKey: "wave_namur_clickers_update",
        subGroup: "namur_warm_clicker",
        installerId: inst.id,
        companyName: inst.companyName,
        certifiedPerson: inst.certifiedPerson,
        postalCode: inst.postalCode,
        city: inst.city,
        email,
        leadIds: orderedLeads.map((l) => l.id),
        templateConfig,
        ...built,
      })
    }
  }

  // 3. Strict per-recipient validation across ALL generated emails
  let grandTotal = 0
  console.log("\n=== PLAN DES 2 VAGUES (SANS TOUCHER AUX 2 LEADS RETIRÉS) ===")
  for (const [k, w] of Object.entries(waves)) {
    grandTotal += w.items.length
    const bySub = {}
    for (const item of w.items) {
      bySub[item.subGroup] = (bySub[item.subGroup] || 0) + 1
      assertGerpinnesHasNoRoofImage(item.html)
      const recipientTokens = [
        item.certifiedPerson,
        formatDisplayPerson(item.certifiedPerson),
        item.companyName,
        decodeHtmlEntities(item.companyName).trim(),
        item.email,
      ]
        .filter((v) => v && v.length >= 2)
        .flatMap((v) => [
          v,
          escapeHtml(v),
          encodeURIComponent(v),
          encodeURIComponent(v).replace(/%20/g, "+"),
          escapeHtml(encodeURIComponent(v).replace(/%20/g, "+")),
        ])
      const maskRecipient = (str) => {
        let out = str
        for (const tok of recipientTokens) {
          out = out.split(tok).join("[RECIPIENT]")
        }
        return out
      }
      const safeSubject = maskRecipient(item.subject)
      const safeHtml = maskRecipient(item.html)
      const safeText = maskRecipient(item.text)
      for (const rx of STRICT_GLOBAL_PATTERNS) {
        if (rx.test(safeSubject) || rx.test(safeHtml) || rx.test(safeText)) {
          throw new Error(`Strict pattern match (${rx}) in outgoing email for ${item.email} (${k})`)
        }
      }
    }
    console.log(`- ${w.label}`)
    console.log(`  Total: ${w.items.length} destinataires | Détail:`, JSON.stringify(bySub))
  }
  if (skippedInvalidMx.length > 0) {
    console.log(`Skipped invalid MX (${skippedInvalidMx.length}):`, JSON.stringify(skippedInvalidMx))
  }
  console.log(`TOTAL DESTINATAIRES VALIDES PRÊTS : ${grandTotal}`)

  // Save HTML previews in scratch/previews for inspection
  const previewDir = path.join(ROOT, "scratch/previews")
  fs.mkdirSync(previewDir, { recursive: true })
  const w1Main = waves.wave_hainaut_west_moulbaix_gerpinnes.items.find((i) => i.subGroup.startsWith("virgin_7"))
  const w1ExWemmel = waves.wave_hainaut_west_moulbaix_gerpinnes.items.find((i) => i.subGroup === "78xx_ex_wemmel")
  const w1South = waves.wave_hainaut_west_moulbaix_gerpinnes.items.find((i) =>
    ["virgin_60", "virgin_64", "virgin_65"].includes(i.subGroup)
  )
  const w2Namur = waves.wave_namur_clickers_update.items[0]

  const previewMap = [
    ["email-preview-wave1-hainaut-7xxx.html", w1Main],
    ["email-preview-wave1-hainaut-78xx.html", w1ExWemmel],
    ["email-preview-wave1-hainaut-6xxx.html", w1South],
    ["email-preview-wave2-namur-clickers.html", w2Namur],
  ]
  for (const [fname, item] of previewMap) {
    if (item) {
      fs.writeFileSync(path.join(previewDir, fname), item.html, "utf8")
    }
  }

  if (TEST_TO) {
    const samples = [
      { label: "Vague 1 — Hainaut vierge (7xxx, 106 dest.)", sample: w1Main },
      { label: "Vague 1 — Hainaut 78xx (ex-Wemmel, 15 dest.)", sample: w1ExWemmel },
      { label: "Vague 2 — Namur cliqueurs chauds (4 dest.)", sample: w2Namur },
    ].filter((s) => Boolean(s.sample))

    console.log(`\n[TEST MODE] Envoi des ${samples.length} variantes vers ${TEST_TO}...`)
    const testKeySuffix = Date.now()
    for (let i = 0; i < samples.length; i++) {
      const { label, sample } = samples[i]
      const testBuilt = buildMultiLeadEmail({
        installer: {
          certifiedPerson: "Jean Dupont",
          companyName: "Solar Test SRL",
          postalCode: sample.postalCode,
          email: TEST_TO,
          phone: "0470000000",
        },
        ...sample.templateConfig,
      })
      assertGerpinnesHasNoRoofImage(testBuilt.html)
      const testSubject = `[TEST ${i + 1}/${samples.length}] ${testBuilt.subject}`
      const res = await sendViaResend({
        to: TEST_TO,
        subject: testSubject,
        html: testBuilt.html,
        text: testBuilt.text,
        tag: `test_${sample.subGroup}`,
        idempotencyKey: `aegis-test-${testKeySuffix}-${i}-${TEST_TO}`,
      })
      console.log(`  ✓ [${i + 1}/${samples.length}] ${label} -> ${TEST_TO} (Resend ID: ${res.id})`)
      if (i < samples.length - 1) await sleep(1200)
    }
    console.log("\n[TEST MODE] Terminé. Aucun installateur réel n'a été contacté.")
    return
  }

  if (DRY_RUN) {
    console.log("\n[DRY-RUN] Aucun e-mail envoyé. Aperçus HTML générés dans scratch/previews/.")
    console.log("\nÉchantillons :")
    for (const [k, w] of Object.entries(waves)) {
      console.log(`\n>> ${k} (${w.items.length})`)
      console.log(
        "  Destinataires (extrait):",
        w.items.slice(0, 10).map((i) => `${i.postalCode} ${i.companyName} <${i.email}> [${i.subGroup}]`)
      )
      if (w.items[0]) {
        console.log("  Objet exemple:", w.items[0].subject)
        console.log("  Lead IDs:", w.items[0].leadIds.join(", "))
        console.log("  URL exemple:", w.items[0].primaryInviteUrl)
      }
    }
    console.log("\nPour envoyer réellement : node scripts/launch-wave-hainaut-and-namur-clickers.mjs --send")
    return
  }

  // 4. Live execution via Resend
  const report = {
    executedAt: new Date().toISOString(),
    fromHeader,
    totalPlanned: grandTotal,
    totalSent: 0,
    totalFailed: 0,
    stoppedEarlyDueToQuota: false,
    skippedInvalidMx,
    byWave: {},
    sent: [],
    failed: [],
  }

  let index = 0
  let quotaAbort = false
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "")

  for (const [waveKey, wave] of Object.entries(waves)) {
    report.byWave[waveKey] = {
      label: wave.label,
      planned: wave.items.length,
      sent: 0,
      failed: 0,
    }

    for (const r of wave.items) {
      if (quotaAbort) break
      index += 1
      try {
        const res = await sendViaResend({
          to: r.email,
          subject: r.subject,
          html: r.html,
          text: r.text,
          tag: waveKey,
          idempotencyKey: `aegis-${dateKey}-${waveKey}-${r.email}`,
        })
        report.totalSent += 1
        report.byWave[waveKey].sent += 1
        report.sent.push({
          waveKey,
          subGroup: r.subGroup,
          leadIds: r.leadIds,
          email: r.email,
          companyName: r.companyName,
          postalCode: r.postalCode,
          resendId: res.id || null,
          sentAt: new Date().toISOString(),
        })
        console.log(`[${index}/${grandTotal}] SENT ${waveKey} -> ${r.email} (${res.id})`)
      } catch (err) {
        report.totalFailed += 1
        report.byWave[waveKey].failed += 1
        const msg = err instanceof Error ? err.message : String(err)
        report.failed.push({
          waveKey,
          subGroup: r.subGroup,
          email: r.email,
          companyName: r.companyName,
          postalCode: r.postalCode,
          error: msg,
        })
        console.error(`[${index}/${grandTotal}] FAIL ${waveKey} -> ${r.email}: ${msg}`)
        if (err.status === 429 || /daily_quota_exceeded|quota/i.test(msg)) {
          console.error("Resend quota / 429 hit — aborting remaining sends cleanly.")
          report.stoppedEarlyDueToQuota = true
          quotaAbort = true
          break
        }
      }

      if (index < grandTotal && !quotaAbort) {
        await sleep(SEND_DELAY_MS)
      }
    }
    if (quotaAbort) break
  }

  const reportPath = path.join(ROOT, "scratch/wave-hainaut-namur-clickers-report.json")
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8")
  console.log(`\nSaved execution report to ${reportPath}`)
  console.log(`Summary: ${report.totalSent} sent, ${report.totalFailed} failed.`)
  if (report.stoppedEarlyDueToQuota) {
    process.exitCode = 2
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
