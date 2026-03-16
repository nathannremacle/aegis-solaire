import { Resend } from "resend"

export type LeadDetailsForEmail = {
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  job_title: string
  company: string | null
  surface_type: string | null
  surface_area: number | null
  annual_electricity_bill: number | null
  project_timeline?: string | null
  estimated_roi_years?: number | null
  estimated_savings?: number | null
  message?: string | null
}

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

function buildLeadAssignedHtml(lead: LeadDetailsForEmail): string {
  const contactName = `${lead.first_name}${lead.last_name ? ` ${lead.last_name}` : ""}`
  const surface =
    lead.surface_area != null && lead.surface_type
      ? `${lead.surface_area.toLocaleString("fr-FR")} m² (${lead.surface_type})`
      : "–"
  const facture =
    lead.annual_electricity_bill != null
      ? `${lead.annual_electricity_bill.toLocaleString("fr-FR")} € HT / an`
      : "–"
  const roi = lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"
  const economies = lead.estimated_savings != null ? `${lead.estimated_savings.toLocaleString("fr-FR")} € / an` : "–"
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Nouveau lead Aegis Solaire</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #112f4b;">Nouveau lead assigné – Aegis Solaire</h2>
  <p>Un lead vous a été assigné. Coordonnées et résumé ci-dessous.</p>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${contactName}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Fonction</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.job_title}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Entreprise</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.company ?? "–"}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.email}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Téléphone</td><td style="padding: 8px; border: 1px solid #ddd;">${lead.phone ?? "–"}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Surface</td><td style="padding: 8px; border: 1px solid #ddd;">${surface}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Facture annuelle</td><td style="padding: 8px; border: 1px solid #ddd;">${facture}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">ROI estimé</td><td style="padding: 8px; border: 1px solid #ddd;">${roi}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;">Économies estimées</td><td style="padding: 8px; border: 1px solid #ddd;">${economies}</td></tr>
  </table>
  ${lead.message ? `<p><strong>Message du prospect :</strong><br/>${lead.message.replace(/\n/g, "<br/>")}</p>` : ""}
  <p style="margin-top: 24px; color: #666; font-size: 12px;">Cet e-mail a été envoyé automatiquement par Aegis Solaire (Speed-to-Lead).</p>
</body>
</html>
  `.trim()
}

export async function sendLeadAssignedEmail(
  installateurEmail: string,
  lead: LeadDetailsForEmail
): Promise<void> {
  const subject = `[Aegis Solaire] Nouveau lead assigné : ${lead.first_name}${lead.last_name ? ` ${lead.last_name}` : ""}`

  if (!resendApiKey) {
    console.log("[Speed-to-Lead] RESEND_API_KEY non définie – e-mail simulé:", { to: installateurEmail, subject, lead: lead.first_name + " " + lead.last_name })
    return
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: installateurEmail,
    subject,
    html: buildLeadAssignedHtml(lead),
  })

  if (error) {
    console.error("[Speed-to-Lead] Resend error:", error)
    throw new Error("Échec envoi e-mail")
  }
}
