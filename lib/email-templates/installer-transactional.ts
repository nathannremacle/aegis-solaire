import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
  type EmailSpecRow,
} from "@/lib/email-templates/installer-email-layout"
import { getDisputeReasonConfig } from "@/lib/disputes-policy"

/* ==========================================================================
   1. CONFIRMATION & JUSTIFICATIF TVA — RECHARGE DE CRÉDITS (MOLLIE / VIREMENT)
   ========================================================================== */

export interface CreditOrderConfirmationEmailData {
  orderId: string
  invoiceRef: string
  companyName: string
  packName: string
  credits: number
  newCreditsBalance: number
  priceHtva: number | string
  vatAmount: number | string
  priceTtc: number | string
  paymentMethodLabel: string
  transactionId?: string | null
  issuedDate?: string
}

export function buildCreditOrderConfirmationEmail(data: CreditOrderConfirmationEmailData): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = getEmailSiteBaseUrl()
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`
  const issuedDate = data.issuedDate || new Date().toLocaleDateString("fr-BE")
  const priceHtva = Number(data.priceHtva ?? 0).toFixed(2).replace(".", ",")
  const vatAmount = Number(data.vatAmount ?? 0).toFixed(2).replace(".", ",")
  const priceTtc = Number(data.priceTtc ?? 0).toFixed(2).replace(".", ",")
  const company = data.companyName?.trim() || "Partenaire Installateur"

  const subject = `Confirmation & justificatif TVA (${data.invoiceRef}) — +${data.credits} crédits activés`

  const accountingRows: EmailSpecRow[] = [
    { label: "Référence pièce", value: data.invoiceRef },
    { label: "Date d'émission", value: issuedDate },
    { label: "Prestation", value: `${data.packName} (${data.credits} crédits leads PV)` },
    { label: "Montant HTVA", value: `${priceHtva} € HT` },
    { label: "TVA belge (21 %)", value: `${vatAmount} €` },
    { label: "Total TTC acquitté", value: `${priceTtc} € TTC` },
    {
      label: "Mode de règlement",
      value: data.transactionId
        ? `${data.paymentMethodLabel} (${data.transactionId})`
        : data.paymentMethodLabel,
    },
    { label: "Émetteur", value: "INIT42 · BCE / TVA BE 1039.899.980 · Liège" },
    { label: "Client B2B", value: company },
  ]

  const bodyHtml = `
    ${renderFiguresBox(
      {
        label: "Crédits activés",
        value: `+${data.credits} crédits`,
        sublabel: `Nouveau solde · ${data.newCreditsBalance} crédits`,
      },
      {
        label: "Total TTC acquitté",
        value: `${priceTtc} € TTC`,
        sublabel: `Dont TVA 21 % · ${vatAmount} €`,
      }
    )}

    ${renderActionBox({
      kicker: "Compte crédité immédiatement",
      title: `Solde disponible : ${data.newCreditsBalance} crédits`,
      subtext: "Vos crédits sont utilisables dès maintenant (validité 12 mois · Art. 4.3 des CGV).",
      ctaLabel: "Accéder aux dossiers →",
      ctaUrl: dashboardUrl,
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Justificatif comptable B2B
          </h2>
          ${renderSpecsTable(accountingRows)}
        </td>
      </tr>
    </table>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `+${data.credits} crédits activés sur votre compte (${priceTtc} € TTC acquittés · Réf. ${data.invoiceRef}).`,
    reference: `Pièce ${data.invoiceRef}`,
    context: "Confirmation & justificatif TVA",
    contextColor: "#1d5d45",
    headline: `+${data.credits} crédits activés`,
    subtitle: `${company} · ${data.packName}`,
    statusPill: { text: `Paiement acquitté · ${data.paymentMethodLabel}`, tone: "success" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Espace partenaire", href: dashboardUrl },
    ],
  })

  const text = `AEGIS SOLAIRE — CONFIRMATION & JUSTIFICATIF TVA
Pièce ${data.invoiceRef}

+${data.credits} crédits activés pour ${company}
Pack : ${data.packName}
Nouveau solde disponible : ${data.newCreditsBalance} crédits
Validité des crédits : 12 mois à compter de l'achat (Art. 4.3 des CGV).

JUSTIFICATIF COMPTABLE B2B (ACQUITTÉ) :
${accountingRows.map((r) => `• ${r.label} : ${r.value}`).join("\n")}

Accéder aux dossiers disponibles : ${dashboardUrl}

Assistance technique : contact@aegissolaire.com
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

  return { subject, text, html }
}

/* ==========================================================================
   2. CONFIRMATION & JUSTIFICATIF TVA — DÉBLOCAGE DIRECT DE LEAD (MOLLIE)
   ========================================================================== */

export interface LeadDirectPurchaseConfirmationData {
  leadId: string
  segment: string
  invoiceRef: string
  companyName: string
  leadName: string
  leadCompany?: string | null
  phone?: string | null
  email?: string | null
  addressLine: string
  locationSubtitle: string
  contactPreferenceLabel?: string | null
  priceHtva: number | string
  vatAmount: number | string
  priceTtc: number | string
  paymentMethodLabel: string
  transactionId: string
  issuedDate?: string
}

export function buildLeadDirectPurchaseConfirmationEmail(
  data: LeadDirectPurchaseConfirmationData
): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = getEmailSiteBaseUrl()
  const leadUrl = `${baseUrl}/partenaires/dashboard?lead=${encodeURIComponent(data.leadId)}`
  const issuedDate = data.issuedDate || new Date().toLocaleDateString("fr-BE")
  const priceHtva = Number(data.priceHtva ?? 0).toFixed(2).replace(".", ",")
  const vatAmount = Number(data.vatAmount ?? 0).toFixed(2).replace(".", ",")
  const priceTtc = Number(data.priceTtc ?? 0).toFixed(2).replace(".", ",")
  const leadRefCode = data.leadId.slice(0, 8).toUpperCase()
  const company = data.companyName?.trim() || "Partenaire Installateur"

  const subject = `Dossier #${leadRefCode} débloqué & justificatif TVA (${data.invoiceRef})`

  const accountingRows: EmailSpecRow[] = [
    { label: "Référence pièce", value: data.invoiceRef },
    { label: "Date d'émission", value: issuedDate },
    { label: "Prestation", value: `Déblocage dossier ${data.segment} (#${leadRefCode})` },
    { label: "Montant HTVA", value: `${priceHtva} € HT` },
    { label: "TVA belge (21 %)", value: `${vatAmount} €` },
    { label: "Total TTC acquitté", value: `${priceTtc} € TTC` },
    { label: "Règlement", value: `${data.paymentMethodLabel} (${data.transactionId})` },
    { label: "Émetteur", value: "INIT42 · BCE / TVA BE 1039.899.980 · Liège" },
    { label: "Client B2B", value: company },
  ]

  const bodyHtml = `
    <!-- Coordonnées complètes débloquées -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td style="padding: 14px 15px;">
          <h2 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Coordonnées complètes du prospect
          </h2>
          ${
            data.contactPreferenceLabel
              ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 10px; background-color: #fff5df; border-left: 3px solid #d69729; border-radius: 0 5px 5px 0;">
                      <span style="display: block; font-size: 13px; color: #684916; line-height: 1.35;">Premier contact souhaité par le prospect</span>
                      <strong style="display: block; font-size: 15px; line-height: 1.3; color: #142d42;">${escapeEmailHtml(data.contactPreferenceLabel)}</strong>
                    </td>
                  </tr>
                </table>`
              : ""
          }
          ${renderSpecsTable([
            { label: "Nom", value: data.leadCompany ? `${data.leadName} (${data.leadCompany})` : data.leadName },
            { label: "Téléphone", value: data.phone || "—" },
            { label: "E-mail", value: data.email || "—" },
            { label: "Adresse du chantier", value: data.addressLine },
          ])}
        </td>
      </tr>
    </table>

    ${renderActionBox({
      kicker: "Dossier enregistré dans votre CRM",
      title: `Dossier #${leadRefCode} · ${priceTtc} € TTC`,
      subtext: "Retrouvez la photo toiture et les estimations dans votre espace.",
      ctaLabel: "Ouvrir la fiche CRM →",
      ctaUrl: leadUrl,
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Justificatif comptable B2B
          </h2>
          ${renderSpecsTable(accountingRows)}
        </td>
      </tr>
    </table>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Coordonnées de ${data.leadName} (${data.locationSubtitle}) débloquées · Justificatif ${data.invoiceRef}.`,
    reference: `Pièce ${data.invoiceRef}`,
    context: "Dossier débloqué & justificatif TVA",
    contextColor: "#1d5d45",
    headline: data.leadName,
    subtitle: data.locationSubtitle,
    statusPill: {
      text: `Coordonnées débloquées · ${data.segment}`,
      tone: "success",
    },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Ouvrir le dossier", href: leadUrl },
    ],
  })

  const text = `AEGIS SOLAIRE — DOSSIER DÉBLOQUÉ & JUSTIFICATIF TVA
Pièce ${data.invoiceRef}

${data.leadName} (${data.locationSubtitle})
Segment : ${data.segment}

COORDONNÉES COMPLÈTES DU PROSPECT :
${data.contactPreferenceLabel ? `• Premier contact souhaité : ${data.contactPreferenceLabel}\n` : ""}• Nom : ${data.leadName}${data.leadCompany ? ` (${data.leadCompany})` : ""}
• Téléphone : ${data.phone || "—"}
• E-mail : ${data.email || "—"}
• Adresse : ${data.addressLine}

JUSTIFICATIF COMPTABLE B2B (ACQUITTÉ) :
${accountingRows.map((r) => `• ${r.label} : ${r.value}`).join("\n")}

Ouvrir la fiche complète dans votre CRM : ${leadUrl}

Assistance technique : contact@aegissolaire.com
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

  return { subject, text, html }
}

/* ==========================================================================
   3. GARANTIE LEAD CONFORME — DÉCISION SUR RÉCLAMATION (APPROUVÉE / REJETÉE)
   ========================================================================== */

export interface LeadDisputeResolutionEmailData {
  leadId: string
  companyName: string
  approved: boolean
  refundedCredits?: number
  adminNotes?: string | null
  reasonLabel?: string | null
  prospectName?: string | null
  prospectLocation?: string | null
}

export function buildLeadDisputeResolutionEmail(data: LeadDisputeResolutionEmailData): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = getEmailSiteBaseUrl()
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`
  const leadRefCode = String(data.leadId).slice(0, 8).toUpperCase()
  const company = data.companyName?.trim() || "Partenaire Installateur"
  const prospectName = data.prospectName?.trim() || null
  const prospectLocation = data.prospectLocation?.trim() || null
  const prospectLabel = [prospectName, prospectLocation].filter(Boolean).join(" · ") || null
  const dossierShortLabel = prospectName
    ? prospectLocation
      ? `${prospectName} (${prospectLocation})`
      : prospectName
    : `Dossier #${leadRefCode}`
  const dossierTextLabel = prospectName
    ? `le dossier ${dossierShortLabel} (#${leadRefCode})`
    : `le dossier #${leadRefCode}`

  if (data.approved) {
    const refunded = Number(data.refundedCredits || 0)
    const subject = prospectName
      ? `Garantie Lead Conforme approuvée (+${refunded} crédits · ${dossierShortLabel})`
      : `Garantie Lead Conforme approuvée (+${refunded} crédits recrédités · #${leadRefCode})`

    const bodyHtml = `
      ${renderFiguresBox(
        {
          label: "Crédits restitués",
          value: `+${refunded} crédit${refunded > 1 ? "s" : ""}`,
          sublabel: "Disponibles immédiatement",
        },
        {
          label: "Dossier concerné",
          value: prospectName || `#${leadRefCode}`,
          sublabel: prospectLocation
            ? `${prospectLocation} · #${leadRefCode}`
            : data.reasonLabel || "Garantie Lead Conforme",
        }
      )}
      ${
        data.adminNotes?.trim()
          ? renderCalloutBox({
              label: "Note de notre équipe conformité",
              value: data.adminNotes.trim(),
              tone: "info",
            })
          : ""
      }
      ${renderActionBox({
        kicker: "Solde mis à jour",
        title: `+${refunded} crédit${refunded > 1 ? "s" : ""} réintégré${refunded > 1 ? "s" : ""}`,
        subtext: "Utilisables sur n'importe quel chantier disponible.",
        ctaLabel: "Accéder à la Marketplace →",
        ctaUrl: dashboardUrl,
      })}
    `

    const html = renderInstallerEmailShell({
      subject,
      preheader: prospectName
        ? `Votre réclamation concernant ${dossierShortLabel} est approuvée : +${refunded} crédits recrédités.`
        : `Votre réclamation sur le dossier #${leadRefCode} est approuvée : +${refunded} crédits recrédités.`,
      reference: `Dossier #${leadRefCode}`,
      context: "Garantie Lead Conforme",
      contextColor: "#1d5d45",
      headline: `+${refunded} crédit${refunded > 1 ? "s" : ""} recrédité${refunded > 1 ? "s" : ""}`,
      subtitle: prospectLabel ? `${company} · ${prospectLabel}` : `${company} · Réclamation approuvée`,
      statusPill: { text: "Recrédit effectué", tone: "success" },
      bodyHtml,
      footerLinks: [
        { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
        { label: "Espace partenaire", href: dashboardUrl },
      ],
    })

    const text = `AEGIS SOLAIRE — GARANTIE LEAD CONFORME
Dossier #${leadRefCode}

Bonjour ${company},

Votre réclamation concernant ${dossierTextLabel} a été approuvée par notre équipe conformité.
+${refunded} crédit(s) ont été immédiatement réintégrés sur votre solde installateur.
${data.adminNotes?.trim() ? `\nNote de l'équipe : ${data.adminNotes.trim()}\n` : ""}
Accéder à votre espace partenaire : ${dashboardUrl}

L'équipe Support Aegis Solaire · contact@aegissolaire.com
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

    return { subject, text, html }
  }

  const resolvedReasonLabel = data.reasonLabel
    ? getDisputeReasonConfig(data.reasonLabel).label
    : null
  const decisionReason =
    data.adminNotes?.trim() ||
    "Réclamation non conforme aux conditions de la Garantie Lead Conforme (Article 5 des CGV)."
  const subject = prospectName
    ? `Décision concernant votre réclamation — ${dossierShortLabel}`
    : `Décision concernant votre réclamation (Dossier #${leadRefCode})`

  const bodyHtml = `
    ${renderCalloutBox({
      label: "Motif de la décision · Article 5 des CGV",
      value: decisionReason,
      tone: "warning",
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 14px; border-top: 1px solid #e4edf1;">
          ${renderSpecsTable([
            ...(prospectLabel
              ? [
                  { label: "Dossier concerné", value: prospectLabel },
                  { label: "Référence", value: `#${leadRefCode}` },
                ]
              : [{ label: "Dossier concerné", value: `#${leadRefCode}` }]),
            ...(resolvedReasonLabel ? [{ label: "Motif déclaré", value: resolvedReasonLabel }] : []),
            { label: "Statut", value: "Clôturée · Non retenue" },
            { label: "Recours / Précisions", value: "Répondez à contact@aegissolaire.com" },
          ])}
        </td>
      </tr>
    </table>

    ${renderActionBox({
      kicker: "Une question sur cette analyse ?",
      title: "Notre équipe support reste disponible",
      subtext: "Transmettez tout élément complémentaire à contact@aegissolaire.com.",
      ctaLabel: "Accéder à mon espace →",
      ctaUrl: dashboardUrl,
      secondaryLabel: "Contacter le support",
      secondaryUrl: "mailto:contact@aegissolaire.com",
    })}
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: prospectName
      ? `Analyse clôturée pour votre réclamation concernant ${dossierShortLabel}.`
      : `Analyse clôturée pour votre réclamation sur le dossier #${leadRefCode}.`,
    reference: `Dossier #${leadRefCode}`,
    context: "Garantie Lead Conforme",
    contextColor: "#89610e",
    headline: "Décision sur votre réclamation",
    subtitle: prospectLabel ? `${company} · ${prospectLabel}` : `${company} · Dossier #${leadRefCode}`,
    statusPill: { text: "Demande non retenue", tone: "warning" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Espace partenaire", href: dashboardUrl },
    ],
  })

  const text = `AEGIS SOLAIRE — GARANTIE LEAD CONFORME
Dossier #${leadRefCode}

Bonjour ${company},

Après vérification de votre signalement concernant ${dossierTextLabel}, notre équipe conformité n'a pas pu donner une suite favorable à la demande de recrédit.

Motif / Précision : ${decisionReason}

Pour toute question complémentaire, écrivez à contact@aegissolaire.com.

Accéder à votre espace partenaire : ${dashboardUrl}

L'équipe Support Aegis Solaire · contact@aegissolaire.com
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

  return { subject, text, html }
}

/* ==========================================================================
   4. CELLULE TECHNIQUE — ACCUSÉ DE RÉCEPTION D'UNE DEMANDE D'ÉTUDE EXPERT
   ========================================================================== */

export interface ExpertRequestAckEmailData {
  companyName?: string | null
  studyLabel: string
  leadReference?: string | null
  message: string
  preferredContact?: "phone" | "email" | "both" | string | null
}

export function buildExpertRequestAckEmail(data: ExpertRequestAckEmailData): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = getEmailSiteBaseUrl()
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`
  const channelLabel =
    data.preferredContact === "phone"
      ? "Par téléphone"
      : data.preferredContact === "email"
        ? "Par e-mail"
        : "Par téléphone ou e-mail"

  const subject = `Prise en charge de votre demande d'étude expert — Aegis Solaire`

  const specRows: EmailSpecRow[] = [
    { label: "Type d'étude", value: data.studyLabel },
    ...(data.leadReference ? [{ label: "Dossier concerné", value: data.leadReference }] : []),
    { label: "Canal de retour souhaité", value: channelLabel },
    { label: "Délai d'engagement", value: "Sous 24 heures ouvrées" },
  ]

  const bodyHtml = `
    ${renderCalloutBox({
      label: "Récapitulatif de votre demande",
      value: `« ${data.message.trim()} »`,
      tone: "info",
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 14px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Paramètres de l'étude
          </h2>
          ${renderSpecsTable(specRows)}
        </td>
      </tr>
    </table>

    <p style="margin: 14px 0 0 0; font-size: 14px; line-height: 1.5; color: #4d6374;">
      Notre cellule technique analyse les spécificités de votre dossier (raccordement GRD, faisabilité PEB/PACE 2030, dimensionnement et rentabilité) et reviendra vers vous pour convenir des modalités d'accompagnement.
    </p>

    ${renderActionBox({
      kicker: "Suivi partenaire",
      title: "Cellule Technique & Ingénierie",
      subtext: "Contact direct : contact@aegissolaire.com",
      ctaLabel: "Retour à mon espace →",
      ctaUrl: dashboardUrl,
    })}
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Votre demande d'étude (${data.studyLabel}) est prise en charge. Réponse sous 24h ouvrées.`,
    reference: data.leadReference ? `${data.leadReference}` : "Cellule Technique",
    context: "Cellule Technique Aegis Solaire",
    headline: "Demande d’étude enregistrée",
    subtitle: data.companyName?.trim()
      ? `${data.companyName.trim()} · ${data.studyLabel}`
      : data.studyLabel,
    statusPill: { text: "Réponse sous 24 h ouvrées", tone: "success" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Espace partenaire", href: dashboardUrl },
    ],
  })

  const text = `AEGIS SOLAIRE — CELLULE TECHNIQUE
Demande d'étude expert enregistrée

${specRows.map((r) => `• ${r.label} : ${r.value}`).join("\n")}

Votre note :
« ${data.message.trim()} »

Un auditeur de notre cellule technique vous recontactera sous 24 heures ouvrées (${channelLabel}).

Espace partenaire : ${dashboardUrl}
Contact : contact@aegissolaire.com
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

  return { subject, text, html }
}
