/**
 * Primitives de mise en page partagées pour tous les e-mails envoyés aux installateurs Aegis Solaire.
 * Base visuelle unifiée : carte 640 px sur fond #eef2f4, en-tête à logo 132×72 (ratio exact 11:6),
 * typographie Arial tabulaire, blocs structurés compatibles Gmail / Outlook / Apple Mail.
 */

export function escapeEmailHtml(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function getEmailSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
}

export function getEmailLogoUrl(): string {
  return `${getEmailSiteBaseUrl()}/logo.png`
}

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info"

const TONE_STYLES: Record<StatusTone, { bg: string; color: string }> = {
  success: { bg: "#e8f2ed", color: "#1d5d45" },
  warning: { bg: "#fff5df", color: "#684916" },
  danger: { bg: "#fdecec", color: "#991b1b" },
  neutral: { bg: "#eef2f4", color: "#4d6374" },
  info: { bg: "#f0f5f8", color: "#305a76" },
}

export function renderStatusPill(text: string, tone: StatusTone = "success"): string {
  const { bg, color } = TONE_STYLES[tone]
  return `<span class="tabular" style="display: inline-block; margin-top: 10px; padding: 3px 9px; border-radius: 5px; background-color: ${bg}; color: ${color}; font-size: 12px; font-weight: bold; line-height: 1.4; font-variant-numeric: tabular-nums;">${escapeEmailHtml(text)}</span>`
}

export function renderInlineBadge(text: string, tone: StatusTone = "success"): string {
  const { bg, color } = TONE_STYLES[tone]
  return `<span class="tabular" style="display: inline-block; padding: 1px 6px; border-radius: 4px; background-color: ${bg}; color: ${color}; font-size: 11px; font-weight: bold; line-height: 1.4; margin-left: 6px; vertical-align: middle; font-variant-numeric: tabular-nums;">${escapeEmailHtml(text)}</span>`
}

export interface FiguresBoxItem {
  label: string
  value: string
  sublabel?: string | null
  width?: string
}

export function renderFiguresBox(left: FiguresBoxItem, right: FiguresBoxItem): string {
  const leftWidth = left.width || "45%"
  const rightWidth = right.width || "55%"
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; background-color: #f0f5f8; border: 1px solid #e2eaf0; border-radius: 8px; border-collapse: separate; border-spacing: 0; overflow: hidden;">
  <tr>
    <td class="figures-td" width="${leftWidth}" style="width: ${leftWidth}; padding: 12px 15px; vertical-align: top;">
      <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">${escapeEmailHtml(left.label)}</span>
      <strong class="figure tabular" style="display: block; margin: 2px 0; font-size: 21px; font-weight: bold; line-height: 1.15; letter-spacing: -0.025em; color: #142d42; font-variant-numeric: tabular-nums;">${escapeEmailHtml(left.value)}</strong>
      ${left.sublabel ? `<span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35; font-variant-numeric: tabular-nums;">${escapeEmailHtml(left.sublabel)}</span>` : ""}
    </td>
    <td class="figures-td" width="${rightWidth}" style="width: ${rightWidth}; padding: 12px 15px; vertical-align: top; border-left: 1px solid #d8e3eb;">
      <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">${escapeEmailHtml(right.label)}</span>
      <strong class="figure tabular" style="display: block; margin: 2px 0; font-size: 21px; font-weight: bold; line-height: 1.15; letter-spacing: -0.025em; color: #142d42; font-variant-numeric: tabular-nums;">${escapeEmailHtml(right.value)}</strong>
      ${right.sublabel ? `<span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35; font-variant-numeric: tabular-nums;">${escapeEmailHtml(right.sublabel)}</span>` : ""}
    </td>
  </tr>
</table>`
}

export function renderCalloutBox({
  label,
  value,
  tone = "warning",
}: {
  label: string
  value: string
  tone?: "warning" | "info" | "success"
}): string {
  const palette =
    tone === "info"
      ? { bg: "#f0f5f8", border: "#305a76", labelColor: "#305a76" }
      : tone === "success"
        ? { bg: "#e8f2ed", border: "#1d5d45", labelColor: "#1d5d45" }
        : { bg: "#fff5df", border: "#d69729", labelColor: "#684916" }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-top: 14px; border-collapse: collapse;">
  <tr>
    <td style="padding: 10px 12px; background-color: ${palette.bg}; border-left: 3px solid ${palette.border}; border-radius: 0 5px 5px 0;">
      <span style="display: block; font-size: 13px; color: ${palette.labelColor}; line-height: 1.35;">${escapeEmailHtml(label)}</span>
      <strong style="display: block; margin-top: 2px; font-size: 15px; line-height: 1.35; color: #142d42;">${escapeEmailHtml(value)}</strong>
    </td>
  </tr>
</table>`
}

export function renderActionBox({
  kicker,
  title,
  subtext,
  ctaLabel,
  ctaUrl,
  secondaryLabel,
  secondaryUrl,
}: {
  kicker: string
  title: string
  subtext?: string | null
  ctaLabel: string
  ctaUrl: string
  secondaryLabel?: string | null
  secondaryUrl?: string | null
}): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
  <tr>
    <td style="padding: 12px 15px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td class="actions-td" style="vertical-align: middle;">
            <span style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35;">${escapeEmailHtml(kicker)}</span>
            <strong class="tabular" style="display: block; margin: 2px 0; font-size: 18px; font-weight: bold; line-height: 1.25; letter-spacing: -0.02em; color: #142d42; font-variant-numeric: tabular-nums;">${escapeEmailHtml(title)}</strong>
            ${subtext ? `<span class="tabular" style="display: block; color: #4d6374; font-size: 13px; line-height: 1.35; font-variant-numeric: tabular-nums;">${escapeEmailHtml(subtext)}</span>` : ""}
          </td>
          <td class="actions-td action-cell" width="47%" style="width: 47%; padding-left: 14px; text-align: center; vertical-align: middle;">
            <a href="${escapeEmailHtml(ctaUrl)}" target="_blank" style="display: block; padding: 10px 12px; border: 1px solid #142d42; border-radius: 6px; background-color: #142d42; color: #ffffff; font-size: 14px; font-weight: bold; text-decoration: none; text-align: center;">${escapeEmailHtml(ctaLabel)}</a>
            ${secondaryLabel && secondaryUrl ? `<a href="${escapeEmailHtml(secondaryUrl)}" target="_blank" style="display: inline-block; margin-top: 6px; font-size: 13px; color: #194767; text-decoration: underline;">${escapeEmailHtml(secondaryLabel)}</a>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

export interface EmailSpecRow {
  label: string
  value: string
  italic?: boolean
}

export function renderSpecsTable(rows: EmailSpecRow[]): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
  ${rows
    .map((row, index) => {
      const isLast = index === rows.length - 1
      const borderStyle = isLast ? "border-bottom: 0;" : "border-bottom: 1px solid #e6edf1;"
      const valueStyle = row.italic
        ? "font-weight: normal; font-style: italic; color: #142d42;"
        : "font-weight: bold; color: #142d42;"
      return `<tr>
        <th scope="row" style="width: 46%; padding: 6px 8px 6px 0; ${borderStyle} text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">${escapeEmailHtml(row.label)}</th>
        <td style="padding: 6px 0; ${borderStyle} text-align: left; font-size: 13px; ${valueStyle} vertical-align: top; font-variant-numeric: tabular-nums;">${escapeEmailHtml(row.value)}</td>
      </tr>`
    })
    .join("")}
</table>`
}

export interface InstallerEmailShellOptions {
  subject: string
  preheader: string
  reference: string
  context: string
  contextColor?: string
  headline: string
  subtitle?: string | null
  statusPill?: { text: string; tone?: StatusTone } | null
  bodyHtml: string
  logoHref?: string
  footerLinks?: Array<{ label: string; href: string }>
  footerNote?: string | null
  footerLegalText?: string | null
}

export function renderInstallerEmailShell(opts: InstallerEmailShellOptions): string {
  const baseUrl = getEmailSiteBaseUrl()
  const logoUrl = getEmailLogoUrl()
  const contextColor = opts.contextColor || "#305a76"

  const footerLinks = opts.footerLinks ?? [
    { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
    { label: "Espace partenaire", href: `${baseUrl}/partenaires/dashboard` },
  ]

  const footerLinksHtml = footerLinks
    .map(
      (l) =>
        `<a href="${escapeEmailHtml(l.href)}"${l.href.startsWith("mailto:") ? "" : ' target="_blank"'} style="display: inline-block; margin: 0 12px 3px 0; color: #194767; text-decoration: underline;">${escapeEmailHtml(l.label)}</a>`
    )
    .join("")

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr-BE">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeEmailHtml(opts.subject)}</title>
  <style type="text/css">
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #eef2f4;
      color: #142d42;
      font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { color: #194767; }
    .tabular { font-variant-numeric: tabular-nums; }
    @media only screen and (max-width: 520px) {
      .mail-outer { padding: 12px 6px 24px 6px !important; }
      .letterhead, .mail-footer { padding-left: 16px !important; padding-right: 16px !important; }
      .mail-body { padding: 18px 16px 20px 16px !important; }
      .mail-h1 { font-size: 25px !important; }
      .figures-td { padding: 10px !important; }
      .figure { font-size: 18px !important; }
      .actions-td { display: block !important; width: 100% !important; }
      .action-cell { padding: 12px 0 0 0 !important; }
      .photo-cell, .spec-cell { display: block !important; width: 100% !important; }
      .photo-cell { padding: 0 0 10px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #eef2f4; color: #142d42; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.5;">

  <!-- Preheader invisible -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    ${escapeEmailHtml(opts.preheader)}
  </div>

  <table role="presentation" class="mail-outer" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #eef2f4; padding: 20px 12px 32px 12px;">
    <tr>
      <td align="center" style="vertical-align: top;">
        <!--[if mso]><table role="presentation" width="640" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="mail" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d7e0e6; border-radius: 14px; border-collapse: separate; border-spacing: 0; overflow: hidden;">

          <!-- En-tête lettre -->
          <tr>
            <td class="letterhead" style="padding: 12px 28px; border-bottom: 1px solid #e6edf1; background-color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${escapeEmailHtml(opts.logoHref || baseUrl)}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${escapeEmailHtml(logoUrl)}" alt="Aegis Solaire" width="132" height="72" style="display: block; width: 132px; height: 72px; border: 0; outline: none; text-decoration: none;" />
                    </a>
                  </td>
                  <td align="right" valign="middle" style="text-align: right; color: #536776; font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; padding-left: 12px;">
                    ${escapeEmailHtml(opts.reference)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps principal -->
          <tr>
            <td class="mail-body" style="padding: 22px 28px 24px 28px; background-color: #ffffff;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: ${contextColor}; line-height: 1.4;">
                ${escapeEmailHtml(opts.context)}
              </p>
              <h1 class="mail-h1" style="margin: 2px 0 4px 0; font-size: 29px; font-weight: bold; line-height: 1.15; letter-spacing: -0.03em; color: #142d42;">
                ${escapeEmailHtml(opts.headline)}
              </h1>
              ${opts.subtitle ? `<p style="margin: 0; color: #4d6374; font-size: 15px; line-height: 1.45;">${escapeEmailHtml(opts.subtitle)}</p>` : ""}
              ${opts.statusPill ? renderStatusPill(opts.statusPill.text, opts.statusPill.tone || "success") : ""}

              ${opts.bodyHtml}
            </td>
          </tr>

          <!-- Pied de page institutionnel -->
          <tr>
            <td class="mail-footer" style="padding: 14px 28px; background-color: #f6f8fa; border-top: 1px solid #e3eaf0; color: #4d6374; font-size: 12px; line-height: 1.55;">
              <p style="margin: 0 0 4px 0;">
                ${footerLinksHtml}
              </p>
              ${opts.footerNote ? `<p style="margin: 0 0 4px 0; color: #4d6374;">${escapeEmailHtml(opts.footerNote)}</p>` : ""}
              <p style="margin: 0; color: #4d6374;">
                ${escapeEmailHtml(opts.footerLegalText ?? "Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique")}
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`
}
