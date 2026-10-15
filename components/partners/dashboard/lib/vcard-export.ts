/**
 * Génère et déclenche le téléchargement d'un fichier contact vCard (.vcf)
 * compatible avec iOS Contact et Android pour enregistrer le prospect en 1 tap.
 */
export function downloadLeadVCard(lead: {
  first_name: string
  last_name: string
  company?: string | null
  phone: string
  email: string
  province?: string | null
  postal_code?: string | null
  segment?: string | null
}) {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${lead.last_name};${lead.first_name};;;`,
    `FN:${lead.first_name} ${lead.last_name}${lead.segment ? ` (Aegis Solaire ${lead.segment})` : ""}`,
    lead.company ? `ORG:${lead.company}` : "",
    `TEL;TYPE=CELL,VOICE:${lead.phone}`,
    `EMAIL;TYPE=PREF,INTERNET:${lead.email}`,
    `ADR;TYPE=WORK:;;${lead.postal_code || ""};${lead.province || ""};;;Belgique`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n")

  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `lead-${lead.first_name}-${lead.last_name}.vcf`.toLowerCase().replace(/\s+/g, "-")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Construit un lien WhatsApp officiel (wa.me) avec un message d'accroche personnalisé
 * mentionnant la certification RESCERT et l'étude Aegis Solaire.
 */
export function buildWhatsAppLink(lead: {
  first_name: string
  phone: string
  segment?: string | null
  company?: string | null
}) {
  const cleanPhone = (lead.phone || "").replace(/[^0-9+]/g, "").replace(/^0/, "+32")
  const text = encodeURIComponent(
    `Bonjour ${lead.first_name}, suite à votre demande d'étude photovoltaïque ${
      lead.company ? `pour ${lead.company} ` : ""
    }sur Aegis Solaire, je vous contacte en tant qu'installateur certifié RESCERT pour convenir d'un échange rapide.`
  )
  return `https://wa.me/${cleanPhone.replace("+", "")}?text=${text}`
}
