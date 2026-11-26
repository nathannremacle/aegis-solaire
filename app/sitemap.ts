import { MetadataRoute } from 'next'
import { getAllRescertInstallers, PROVINCE_SEO_META } from '@/lib/rescert-directory'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/partenaires`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/partenaires/annuaire`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/partenaires/outils/calculateur-dpi-b2b`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/partenaires/distributeurs`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/webinaire`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq-technique`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.65,
    },
    {
      url: `${baseUrl}/devis-panneaux-solaires`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/media-partners`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/particuliers`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/politique-confidentialite`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cgv`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  const provinceRoutes: MetadataRoute.Sitemap = Object.keys(PROVINCE_SEO_META).map((prov) => ({
    url: `${baseUrl}/partenaires/annuaire/province/${prov}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  const installerRoutes: MetadataRoute.Sitemap = getAllRescertInstallers().map((inst) => ({
    url: `${baseUrl}/partenaires/annuaire/${inst.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...provinceRoutes, ...installerRoutes]
}
