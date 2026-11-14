import fs from "node:fs"
import path from "node:path"
import dns from "node:dns/promises"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")

// Load .env.local
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
]

// Checked on neutral test payloads to ensure templates/leads never leak internal keys, prospect names, or personal names
const FORBIDDEN_TEMPLATE_PATTERNS = [
  /owner_occupied/i,
  /cost_reduction/i,
  /3_months/i,
  /nathan/i,
  /fabrice/i,
  /remacle/i,
  /vermeulen/i,
  /serge/i,
  /maadaoui/i,
  /hermine/i,
  /philippekin/i,
  /pascal/i,
  /marcelino/i,
  /carlos/i,
  /[🔒🛡️⚡🎯👉✅]/u,
]

// Checked on EVERY real outgoing email (excluding greeting/company name where an installer might share a first name like Nathan)
const STRICT_GLOBAL_PATTERNS = [
  /nathan\s+remacle/i,
  /fabrice\s+remacle/i,
  /vermeulen/i,
  /maadaoui/i,
  /hermine/i,
  /philippekin/i,
  /marcelino/i,
  /carlos/i,
  /owner_occupied/i,
  /cost_reduction/i,
  /3_months/i,
  /[🔒🛡️⚡🎯👉✅]/u,
]

const REAL_LEADS = {
  roly_5600: {
    key: "roly_5600",
    id: "413e8eae-8168-4907-bcaa-558204ac6aba",
    postalCode: "5600",
    city: "Roly",
    province: "Province de Namur (Philippeville)",
    badge: "PROJET VÉRIFIÉ · APPEL DIRECT AUTORISÉ (9H–18H)",
    exclusivityShort: "Plafonné à 3 installateurs max · 0/3 place prise",
    housingType: "Maison 4 façades · Toiture ~65 m² tuiles",
    systemSpec: "Estimation ~6,1 kWc (14 panneaux)",
    billSpec: "2 300 €/an (> 6 000 kWh/an)",
    highlights: "Propriétaire occupant · Appel téléphonique direct autorisé (9h–18h)",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-roly-5600-blurred.jpg",
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
  gerpinnes_6280: {
    key: "gerpinnes_6280",
    id: "bd3d6c78-0acb-4b59-8f96-ff9817f634f7",
    postalCode: "6280",
    city: "Gerpinnes",
    province: "Lisière Namur / Entre-Sambre-et-Meuse",
    badge: "NOUVEAU DOSSIER VÉRIFIÉ · ADRESSE CERTIFIÉE SPW",
    exclusivityShort: "Plafonné à 3 installateurs max · 0/3 place prise",
    housingType: "Maison 4 façades isolée · Toiture ~42 m² tuiles",
    systemSpec: "Estimation ~4,8 kWc (11 panneaux)",
    billSpec: "1 820 €/an (5 000 – 6 000 kWh/an)",
    highlights: "Propriétaire occupant · Adresse exacte certifiée SPW ICAR 100 %",
    imageUrl: "", // STRICT: Aucune photo (maison floutée sur Street View)
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
  nameche_5300: {
    key: "nameche_5300",
    id: "a63dd867-8e1c-47e9-b4d0-93818b0a667a",
    postalCode: "5300",
    city: "Namêche (Andenne)",
    province: "Namur · Vallée de la Meuse",
    badge: "DOSSIER VÉRIFIÉ · ADRESSE CERTIFIÉE SPW",
    exclusivityShort: "Plafonné à 3 installateurs max · 0/3 place prise",
    housingType: "Maison 4 façades · Toiture 42 m² tuiles",
    systemSpec: "Estimation ~3,0 kWc (7 panneaux)",
    billSpec: "1 150 €/an (3 500 kWh/an)",
    highlights: "Propriétaire occupant · Adresse exacte certifiée SPW ICAR 100 %",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-nameche-5300-blurred.jpg",
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
  wemmel_1780: {
    key: "wemmel_1780",
    id: "e597cc47-01f2-47e4-a953-c7e6902b2028",
    postalCode: "1780",
    city: "Wemmel",
    province: "Périphérie Nord Bruxelles",
    badge: "PROJET VÉRIFIÉ · PLAFONNÉ À 3 INSTALLATEURS",
    exclusivityShort: "Plafonné à 3 installateurs max · 0/3 place prise",
    housingType: "Maison unifamiliale · Toiture 42 m² tuiles",
    systemSpec: "Estimation ~5,4 kWc (environ 12 panneaux)",
    billSpec: "1 150 €/an facture",
    highlights: "Propriétaire occupant · Dossier disponible immédiatement",
    imageUrl:
      "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-wemmel-1780-blurred.jpg",
    priceLabel: "29,50 € HTVA (3 crédits)",
  },
}

const WAVE_A_RECOVERED = [
  {
    installerId: "rescert-5651-506",
    companyName: "RenoVal Energie",
    certifiedPerson: "Valentin Chaussée",
    postalCode: "5651",
    city: "Thy-le-Château",
    email: "val@renovalenergie.be",
    phone: "071497749",
    leads: [REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280],
    subjectPrefix: "2 chantiers photovoltaïques vérifiés à Roly (5600) et Gerpinnes (6280)",
    introText:
      "En tant qu'installateur certifié RESCERT actif dans le secteur de Walcourt et du Sud-Namurois, nous mettons à votre disposition deux dossiers photovoltaïques réels vérifiés par notre cellule technique dans votre zone directe : un projet à forte consommation à Roly (5600) et une maison 4 façades à Gerpinnes (6280).",
  },
  {
    installerId: "rescert-5060-418",
    companyName: "So Watts",
    certifiedPerson: "Quentin Van Oostveldt",
    postalCode: "5060",
    city: "Sambreville",
    email: "info@so-watts.be",
    phone: "+32492246719",
    leads: [REAL_LEADS.gerpinnes_6280, REAL_LEADS.roly_5600, REAL_LEADS.nameche_5300],
    subjectPrefix: "3 chantiers solaires vérifiés près de Sambreville : Gerpinnes (6280), Roly (5600) & Namêche (5300)",
    introText:
      "En tant qu'installateur certifié RESCERT actif autour de Sambreville et de la Basse-Sambre, nous vous soumettons trois dossiers photovoltaïques réels disponibles immédiatement dans votre rayon d'intervention (Gerpinnes, Roly et Namêche).",
  },
  {
    installerId: "rescert-5190-432",
    companyName: "Energie Rénovations",
    certifiedPerson: "Silvio Ben",
    postalCode: "5190",
    city: "Jemeppe-sur-Sambre",
    email: "info@energie-renovations.be",
    phone: "+32472459457",
    leads: [REAL_LEADS.gerpinnes_6280, REAL_LEADS.roly_5600, REAL_LEADS.nameche_5300],
    subjectPrefix: "3 chantiers solaires vérifiés autour de Jemeppe-sur-Sambre : Gerpinnes, Roly & Namêche",
    introText:
      "En tant qu'installateur certifié RESCERT actif dans l'axe Jemeppe-sur-Sambre / Namur, nous vous transmettons trois demandes photovoltaïques réelles vérifiées par notre cellule technique et prêtes à être débloquées dans votre secteur.",
  },
  {
    installerId: "rescert-4260-194",
    companyName: "Carodel SRL",
    certifiedPerson: "Olivier de l'Escaille",
    postalCode: "4260",
    city: "Braives",
    email: "info@carodel.net",
    phone: "019567001",
    leads: [REAL_LEADS.nameche_5300],
    subjectPrefix: "Chantier photovoltaïque 4 façades vérifié à Namêche / Andenne (5300)",
    introText:
      "En tant qu'installateur certifié RESCERT actif entre la Hesbaye et la vallée de la Meuse, nous vous proposons un dossier photovoltaïque réel qualifié à Namêche (5300 Andenne), avec adresse exacte certifiée au cadastre SPW.",
  },
  {
    installerId: "rescert-4432-224",
    companyName: "B.S.S Energy",
    certifiedPerson: "Steven Berardozzi",
    postalCode: "4432",
    city: "Ans",
    email: "bss.energy@outlook.com",
    phone: "+32499740653",
    leads: [REAL_LEADS.nameche_5300],
    subjectPrefix: "Chantier photovoltaïque 4 façades vérifié à Namêche / Andenne (5300)",
    introText:
      "En tant qu'installateur certifié RESCERT actif sur l'axe Liège – Meuse, nous vous proposons un dossier photovoltaïque réel qualifié à Namêche (5300 Andenne), avec adresse exacte certifiée au cadastre SPW.",
  },
  {
    installerId: "rescert-1130-29",
    companyName: "Elthium BV",
    certifiedPerson: "Frédéric Engelen",
    postalCode: "1130",
    city: "Haren (Bruxelles)",
    email: "info@elthium.be",
    phone: "",
    leads: [REAL_LEADS.wemmel_1780],
    subjectPrefix: "Projet photovoltaïque 42 m² vérifié à Wemmel (1780)",
    introText:
      "En tant qu'installateur certifié RESCERT actif en région bruxelloise et périphérie Nord, nous vous soumettons un dossier photovoltaïque réel disponible à Wemmel (1780) pour maison unifamiliale.",
  },
  {
    installerId: "rescert-1020-6",
    companyName: "We-Green / Seasquare",
    certifiedPerson: "Thibaut Cougnet",
    postalCode: "1020",
    city: "Laeken (Bruxelles)",
    email: "info@we-green.be",
    phone: "+3224760076",
    leads: [REAL_LEADS.wemmel_1780],
    subjectPrefix: "Projet photovoltaïque 42 m² vérifié à Wemmel (1780)",
    introText:
      "En tant qu'installateur certifié RESCERT actif sur Bruxelles et sa périphérie Nord, nous vous soumettons un dossier photovoltaïque réel disponible à Wemmel (1780) pour maison unifamiliale.",
  },
  {
    installerId: "rescert-1030-770",
    companyName: "Atlas Contrôle",
    certifiedPerson: "Simon Lemaître",
    postalCode: "1030",
    city: "Schaerbeek (Bruxelles)",
    email: "info@atlascontrole.be",
    phone: "",
    leads: [REAL_LEADS.wemmel_1780],
    subjectPrefix: "Projet photovoltaïque 42 m² vérifié à Wemmel (1780)",
    introText:
      "En tant qu'installateur certifié RESCERT actif à Bruxelles et en périphérie Nord, nous vous soumettons un dossier photovoltaïque réel disponible à Wemmel (1780) pour maison unifamiliale.",
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

async function fetchAllResendEmails(apiKey) {
  const all = []
  let after = null
  for (let page = 0; page < 25; page++) {
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
    const err = new Error(`Resend HTTP ${res.status}: ${JSON.stringify(payload)}`)
    err.status = res.status
    err.payload = payload
    throw err
  }
  return payload
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY missing")

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

  const instByEmail = new Map()
  for (const inst of installers) {
    const em = normalizeEmail(inst.email)
    if (em && !instByEmail.has(em)) instByEmail.set(em, inst)
  }

  console.log("Fetching existing Resend email engagement history...")
  const resendHistory = await fetchAllResendEmails(apiKey)
  console.log(`Fetched ${resendHistory.length} historical emails from Resend.`)

  const fromHeader = getResendFromHeader()
  console.log(`Using From header: ${fromHeader}`)
  for (const rx of FORBIDDEN_TEMPLATE_PATTERNS) {
    if (rx.test(fromHeader)) {
      throw new Error(`Forbidden pattern (${rx}) in From header: ${fromHeader}`)
    }
  }

  // Neutral template safety checks across all 4 lead objects and single/multi-lead combinations
  const dummyInst = {
    certifiedPerson: "Jean Test",
    companyName: "TestSolar SRL",
    postalCode: "5000",
    email: "test@example.com",
    phone: "0470000000",
  }
  const templateCheckConfigs = [
    {
      name: "roly_gerpinnes",
      leads: [REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280],
      subjectPrefix: "2 chantiers photovoltaïques vérifiés à Roly (5600) et Gerpinnes (6280)",
      introText: "Test intro",
      campaignKey: "test_ab",
      preheaderText: "Test preheader",
    },
    {
      name: "namur_3leads",
      leads: [REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280, REAL_LEADS.nameche_5300],
      subjectPrefix: "3 nouveaux chantiers photovoltaïques vérifiés ouverts dans le secteur de Namur (places disponibles)",
      introText: "Test intro 3 leads",
      campaignKey: "test_c",
      preheaderText: "Test preheader",
    },
    {
      name: "wemmel_lead",
      leads: [REAL_LEADS.wemmel_1780],
      subjectPrefix: "Suite à votre consultation : le dossier photovoltaïque à Wemmel (1780) dispose encore de places disponibles",
      introText: "Test intro wemmel",
      campaignKey: "test_d",
      preheaderText: "Test preheader",
    },
  ]

  for (const cfg of templateCheckConfigs) {
    const built = buildMultiLeadEmail({ installer: dummyInst, ...cfg })
    assertGerpinnesHasNoRoofImage(built.html)
    for (const rx of FORBIDDEN_TEMPLATE_PATTERNS) {
      if (rx.test(built.subject) || rx.test(built.html) || rx.test(built.text)) {
        throw new Error(`Forbidden template content match (${rx}) in template check ${cfg.name}`)
      }
    }
  }
  console.log("Template safety & Gerpinnes no-image checks passed.")

  const seenEmailsInRun = new Set()
  const waves = {
    wave_a_recovered: { label: "Vague A — Installateurs récupérés (nouvelles adresses vérifiées)", items: [] },
    wave_b_hainaut_virgin: { label: "Vague B — Hainaut vierge CP 60/61/62/64/65 (Gerpinnes + Roly)", items: [] },
    wave_c_namur_engaged: { label: "Vague C — Namur engagés (clicked/opened) sur 3 vrais leads", items: [] },
    wave_d1_bxl_bw_clickers: { label: "Vague D1 — BXL/BW cliqueurs non-inscrits (1780 Wemmel)", items: [] },
    wave_d2_hainaut78_virgin: { label: "Vague D2 — Hainaut vierge CP 78xx (1780 Wemmel)", items: [] },
  }

  // --- WAVE A ---
  for (const target of WAVE_A_RECOVERED) {
    const email = normalizeEmail(target.email)
    if (excluded.has(email) || seenEmailsInRun.has(email) || isBlacklisted(target)) continue
    const mxOk = await hasValidMxRecord(email)
    if (!mxOk) {
      console.warn(`[Wave A] Skipping ${email}: no valid MX`)
      continue
    }
    seenEmailsInRun.add(email)
    const built = buildMultiLeadEmail({
      installer: target,
      leads: target.leads,
      subjectPrefix: target.subjectPrefix,
      introText: target.introText,
      campaignKey: "wave_a_recovered",
      preheaderText: `${target.leads.length} dossier(s) réel(s) vérifié(s) dans votre secteur d'intervention.`,
    })
    assertGerpinnesHasNoRoofImage(built.html)
    waves.wave_a_recovered.items.push({
      waveKey: "wave_a_recovered",
      installerId: target.installerId,
      companyName: target.companyName,
      certifiedPerson: target.certifiedPerson,
      postalCode: target.postalCode,
      city: target.city,
      email,
      leadIds: target.leads.map((l) => l.id),
      ...built,
    })
  }

  // --- WAVE B ---
  for (const inst of installers) {
    if (inst.provinceKey !== "hainaut") continue
    const cp2 = String(inst.postalCode || "").trim().slice(0, 2)
    if (!["60", "61", "62", "64", "65"].includes(cp2)) continue
    const email = normalizeEmail(inst.email)
    if (!email || !email.includes("@")) continue
    if (excluded.has(email) || seenEmailsInRun.has(email) || isBlacklisted(inst)) continue

    const mxOk = await hasValidMxRecord(email)
    if (!mxOk) {
      console.log(`[Wave B] Skipping invalid MX: ${email}`)
      continue
    }

    seenEmailsInRun.add(email)
    const isSouth6465 = ["64", "65"].includes(cp2)
    const orderedLeads = isSouth6465
      ? [REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280]
      : [REAL_LEADS.gerpinnes_6280, REAL_LEADS.roly_5600]

    const subjectPrefix = isSouth6465
      ? "2 chantiers photovoltaïques vérifiés à Roly (5600) et Gerpinnes (6280)"
      : "2 chantiers photovoltaïques 4 façades vérifiés à Gerpinnes (6280) et Roly (5600)"

    const introText = isSouth6465
      ? "En tant qu'installateur certifié RESCERT actif dans le sud du Hainaut et l'Entre-Sambre-et-Meuse, nous vous proposons deux dossiers photovoltaïques réels vérifiés et disponibles immédiatement tout près de chez vous : Roly (5600, facture 2 300 €/an, appel direct autorisé) et Gerpinnes (6280, facture 1 820 €/an)."
      : "En tant qu'installateur certifié RESCERT actif dans le bassin de Charleroi / Gerpinnes / Entre-Sambre-et-Meuse, nous vous proposons deux dossiers photovoltaïques réels en maison 4 façades vérifiés par notre cellule technique : Gerpinnes (6280, adresse certifiée SPW) et Roly (5600, facture 2 300 €/an, appel direct autorisé)."

    const built = buildMultiLeadEmail({
      installer: inst,
      leads: orderedLeads,
      subjectPrefix,
      introText,
      campaignKey: "wave_b_hainaut_60_65",
      preheaderText: "2 dossiers réels 4 façades disponibles : 6280 Gerpinnes (1 820 €/an) & 5600 Roly (2 300 €/an).",
    })
    assertGerpinnesHasNoRoofImage(built.html)
    waves.wave_b_hainaut_virgin.items.push({
      waveKey: "wave_b_hainaut_virgin",
      installerId: inst.id,
      companyName: inst.companyName,
      certifiedPerson: inst.certifiedPerson,
      postalCode: inst.postalCode,
      city: inst.city,
      email,
      leadIds: orderedLeads.map((l) => l.id),
      ...built,
    })
  }

  // --- WAVE C (Namur engaged clicked/opened) ---
  const namurEngaged = new Map()
  for (const e of resendHistory) {
    const to = normalizeEmail(e.to?.[0])
    const inst = instByEmail.get(to)
    if (!inst || inst.provinceKey !== "namur") continue
    if (excluded.has(to) || seenEmailsInRun.has(to) || isBlacklisted(inst)) continue
    if (e.last_event === "clicked" || e.last_event === "opened") {
      const prev = namurEngaged.get(to)
      if (!prev || e.last_event === "clicked") {
        namurEngaged.set(to, { inst, event: e.last_event })
      }
    }
  }

  for (const [email, { inst }] of namurEngaged.entries()) {
    if (seenEmailsInRun.has(email)) continue
    const mxOk = await hasValidMxRecord(email)
    if (!mxOk) {
      console.log(`[Wave C] Skipping invalid MX: ${email}`)
      continue
    }
    seenEmailsInRun.add(email)

    const cp2 = String(inst.postalCode || "").trim().slice(0, 2)
    const orderedLeads =
      cp2 === "53"
        ? [REAL_LEADS.nameche_5300, REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280]
        : [REAL_LEADS.roly_5600, REAL_LEADS.gerpinnes_6280, REAL_LEADS.nameche_5300]

    const built = buildMultiLeadEmail({
      installer: inst,
      leads: orderedLeads,
      subjectPrefix: "3 nouveaux chantiers photovoltaïques vérifiés ouverts dans le secteur de Namur (places disponibles)",
      introText:
        "Suite à l'intérêt que vous avez manifesté pour nos opportunités régionales, voici les 3 nouveaux dossiers photovoltaïques réels vérifiés par notre cellule technique dans la province de Namur et sa bordure immédiate. Chacun de ces 3 chantiers dispose actuellement de ses 3 créneaux libres (0/3 place prise).",
      campaignKey: "wave_c_namur_3_real",
      preheaderText: "3 chantiers réels disponibles : 5600 Roly (2 300 €/an), 6280 Gerpinnes (1 820 €/an) & 5300 Namêche.",
    })
    assertGerpinnesHasNoRoofImage(built.html)
    waves.wave_c_namur_engaged.items.push({
      waveKey: "wave_c_namur_engaged",
      installerId: inst.id,
      companyName: inst.companyName,
      certifiedPerson: inst.certifiedPerson,
      postalCode: inst.postalCode,
      city: inst.city,
      email,
      leadIds: orderedLeads.map((l) => l.id),
      ...built,
    })
  }

  // --- WAVE D1 (BXL/BW non-registered clickers on 1780 Wemmel) ---
  const bxlBwClickers = new Map()
  for (const e of resendHistory) {
    const to = normalizeEmail(e.to?.[0])
    const inst = instByEmail.get(to)
    if (!inst || !["bruxelles", "brabant_wallon"].includes(inst.provinceKey)) continue
    if (excluded.has(to) || seenEmailsInRun.has(to) || isBlacklisted(inst)) continue
    if (e.last_event === "clicked") {
      bxlBwClickers.set(to, inst)
    }
  }

  for (const [email, inst] of bxlBwClickers.entries()) {
    if (seenEmailsInRun.has(email)) continue
    const mxOk = await hasValidMxRecord(email)
    if (!mxOk) {
      console.log(`[Wave D1] Skipping invalid MX: ${email}`)
      continue
    }
    seenEmailsInRun.add(email)
    const built = buildMultiLeadEmail({
      installer: inst,
      leads: [REAL_LEADS.wemmel_1780],
      subjectPrefix: "Suite à votre consultation : le dossier photovoltaïque à Wemmel (1780) dispose encore de places disponibles",
      introText:
        "Vous avez récemment consulté l'invitation relative au projet photovoltaïque résidentiel à Wemmel (1780). Ce dossier réel vérifié par notre cellule technique est toujours ouvert à l'attribution (places encore disponibles) et peut être consulté immédiatement après validation de votre compte RESCERT.",
      campaignKey: "wave_d1_bxl_bw_clickers",
      preheaderText: "Dossier 1780 Wemmel (42 m² tuiles, ~5,4 kWc) toujours disponible.",
    })
    waves.wave_d1_bxl_bw_clickers.items.push({
      waveKey: "wave_d1_bxl_bw_clickers",
      installerId: inst.id,
      companyName: inst.companyName,
      certifiedPerson: inst.certifiedPerson,
      postalCode: inst.postalCode,
      city: inst.city,
      email,
      leadIds: [REAL_LEADS.wemmel_1780.id],
      ...built,
    })
  }

  // --- WAVE D2 (Hainaut CP 78xx uncontacted on 1780 Wemmel) ---
  for (const inst of installers) {
    if (inst.provinceKey !== "hainaut") continue
    const cp2 = String(inst.postalCode || "").trim().slice(0, 2)
    if (cp2 !== "78") continue
    const email = normalizeEmail(inst.email)
    if (!email || !email.includes("@")) continue
    if (excluded.has(email) || seenEmailsInRun.has(email) || isBlacklisted(inst)) continue

    const mxOk = await hasValidMxRecord(email)
    if (!mxOk) {
      console.log(`[Wave D2] Skipping invalid MX: ${email}`)
      continue
    }
    seenEmailsInRun.add(email)
    const built = buildMultiLeadEmail({
      installer: inst,
      leads: [REAL_LEADS.wemmel_1780],
      subjectPrefix: "Projet photovoltaïque 42 m² vérifié à Wemmel (1780)",
      introText:
        "En tant qu'installateur certifié RESCERT actif sur l'axe Enghien / Silly / Ath et la périphérie bruxelloise, nous vous soumettons un dossier photovoltaïque réel qualifié disponible dans le secteur de Wemmel (1780).",
      campaignKey: "wave_d2_hainaut_78_wemmel",
      preheaderText: "Projet photovoltaïque 42 m² tuiles à Wemmel (1780) — Plafonné à 3 installateurs.",
    })
    waves.wave_d2_hainaut78_virgin.items.push({
      waveKey: "wave_d2_hainaut78_virgin",
      installerId: inst.id,
      companyName: inst.companyName,
      certifiedPerson: inst.certifiedPerson,
      postalCode: inst.postalCode,
      city: inst.city,
      email,
      leadIds: [REAL_LEADS.wemmel_1780.id],
      ...built,
    })
  }

  // Strict per-recipient validation before sending ANY email
  let grandTotal = 0
  console.log("\n=== 4-WAVES REAL LEADS PLAN ===")
  for (const [k, w] of Object.entries(waves)) {
    grandTotal += w.items.length
    console.log(`- ${w.label} [${k}] -> ${w.items.length} recipients`)
    for (const item of w.items) {
      assertGerpinnesHasNoRoofImage(item.html)
      for (const rx of STRICT_GLOBAL_PATTERNS) {
        if (rx.test(item.subject) || rx.test(item.html) || rx.test(item.text)) {
          throw new Error(`Strict pattern match (${rx}) in outgoing email for ${item.email} (${k})`)
        }
      }
    }
  }
  console.log(`TOTAL UNIQUE RECIPIENTS ACROSS ALL WAVES: ${grandTotal}`)

  if (DRY_RUN) {
    const samples = {}
    for (const [k, w] of Object.entries(waves)) {
      samples[k] = {
        count: w.items.length,
        recipients: w.items.map((i) => ({ email: i.email, cp: i.postalCode, company: i.companyName })),
        firstSample: w.items[0]
          ? {
              to: w.items[0].email,
              subject: w.items[0].subject,
              leadIds: w.items[0].leadIds,
              primaryInviteUrl: w.items[0].primaryInviteUrl,
            }
          : null,
      }
    }
    console.log("\nDry-run summary:", JSON.stringify(samples, null, 2))
    return
  }

  const report = {
    executedAt: new Date().toISOString(),
    fromHeader,
    totalPlanned: grandTotal,
    totalSent: 0,
    totalFailed: 0,
    stoppedEarlyDueToQuota: false,
    byWave: {},
    sent: [],
    failed: [],
  }

  let index = 0
  let quotaAbort = false

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
          idempotencyKey: `aegis-real4waves-20261114-${waveKey}-${r.email}`,
        })
        report.totalSent += 1
        report.byWave[waveKey].sent += 1
        report.sent.push({
          waveKey,
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

  const reportPath = path.join(ROOT, "scratch/wave-real-leads-4waves-report.json")
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

