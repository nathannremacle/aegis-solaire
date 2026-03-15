const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

/** Données structurées JSON-LD pour SEO (Organization + WebSite) */
export function JsonLd() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Aegis Solaire',
    url: baseUrl,
    logo: `${baseUrl}/logo-square.png`,
    description: "Plateforme de mise en relation et simulateur ROI photovoltaïque B2B pour entreprises. France, Belgique, francophonie. Conformité Loi LOM et Décret Tertiaire.",
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'contact@aegissolaire.com',
      availableLanguage: 'French',
      areaServed: ['FR', 'BE'],
    },
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Aegis Solaire',
    url: baseUrl,
    description: 'Simulateur ROI photovoltaïque B2B – Loi LOM, Décret Tertiaire. Valorisez toitures et parkings.',
    inLanguage: 'fr-FR',
    publisher: { '@id': `${baseUrl}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/#simulator` },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(website),
        }}
      />
    </>
  )
}
