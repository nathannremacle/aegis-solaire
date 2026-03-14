const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegis-solaire.fr'

/** Données structurées JSON-LD pour SEO (Organization + WebSite) */
export function JsonLd() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Aegis Solaire',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: "Plateforme de mise en relation et simulateur ROI photovoltaïque B2B pour entreprises. Conformité Loi LOM et Décret Tertiaire.",
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Paris',
      addressCountry: 'FR',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'contact@aegis-solaire.fr',
      availableLanguage: 'French',
      areaServed: 'FR',
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
