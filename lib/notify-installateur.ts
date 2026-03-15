/**
 * Notification Speed-to-Lead : envoi des détails du lead à l'installateur assigné.
 * Pour l'instant : console.log. À brancher sur Resend / Nodemailer en production.
 */

export type LeadDetailsForEmail = {
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company: string | null
  surface_type: string
  surface_area: number
  annual_electricity_bill: number
  project_timeline?: string | null
  estimated_roi_years?: number | null
  estimated_savings?: number | null
  message?: string | null
}

export function sendLeadAssignedEmail(
  installateurEmail: string,
  lead: LeadDetailsForEmail
): Promise<void> {
  // En production : appeler Resend, Nodemailer, etc.
  // Exemple Resend : await resend.emails.send({ from: '...', to: installateurEmail, subject: '...', html: '...' })
  const payload = {
    to: installateurEmail,
    subject: `[Aegis Solaire] Nouveau lead assigné : ${lead.first_name} ${lead.last_name}`,
    lead: {
      ...lead,
      surface: `${lead.surface_area} m² (${lead.surface_type})`,
      facture: `${lead.annual_electricity_bill.toLocaleString("fr-FR")} € / an`,
    },
  }
  // eslint-disable-next-line no-console
  console.log("[Speed-to-Lead] E-mail transactionnel (à brancher Resend/Nodemailer):", JSON.stringify(payload, null, 2))
  return Promise.resolve()
}
