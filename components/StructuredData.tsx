type FaqItem = {
  question: string
  answer: string
}

type OrganizationInput = {
  name: string
  url: string
  logoUrl: string
  description: string
  contact: {
    email: string
    availableLanguage: string
    areaServed: string[]
  }
}

function JsonLdScript({ json }: { json: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD doit rester strict et valide : on sérialise le JS natif.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}

function getDefaultOrganization(): OrganizationInput {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

  return {
    name: "Aegis Solaire",
    url: baseUrl,
    logoUrl: `${baseUrl}/logo-square.png`,
    description:
      "Plateforme de mise en relation et simulateur ROI photovoltaïque B2B pour entreprises. France, Belgique, francophonie. Conformité Loi LOM et Décret Tertiaire.",
    contact: {
      email: "contact@aegissolaire.com",
      availableLanguage: "French",
      areaServed: ["FR", "BE"],
    },
  }
}

export function StructuredData({
  includeOrganization = true,
  includeWebSite = true,
  organization,
  faq,
}: {
  includeOrganization?: boolean
  includeWebSite?: boolean
  organization?: OrganizationInput
  faq?: FaqItem[]
}) {
  const org = organization ?? getDefaultOrganization()

  const organizationSchema = includeOrganization
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: org.name,
        url: org.url,
        logo: org.logoUrl,
        description: org.description,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: org.contact.email,
          availableLanguage: org.contact.availableLanguage,
          areaServed: org.contact.areaServed,
        },
      }
    : null

  const websiteSchema = includeWebSite && includeOrganization
    ? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: org.name,
        url: org.url,
        description: "Simulateur ROI photovoltaïque B2B – Loi LOM, Décret Tertiaire. Valorisez toitures et parkings.",
        inLanguage: "fr-FR",
        publisher: { "@id": `${org.url}#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${org.url}/#simulator` },
          "query-input": "required name=search_term_string",
        },
      }
    : null

  const faqSchema =
    faq && faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null

  return (
    <>
      {organizationSchema ? <JsonLdScript json={organizationSchema} /> : null}
      {websiteSchema ? <JsonLdScript json={websiteSchema} /> : null}
      {faqSchema ? <JsonLdScript json={faqSchema} /> : null}
    </>
  )
}

export type { FaqItem, OrganizationInput }

