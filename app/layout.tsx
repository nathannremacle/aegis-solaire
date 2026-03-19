import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { StructuredData } from '@/components/StructuredData'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Aegis Solaire | Rentabilité solaire B2B (Loi LOM, Décret Tertiaire) – PPA & Tiers-investissement',
    template: '%s | Aegis Solaire',
  },
  description: 'Rentabilité solaire B2B : conformité Loi LOM et Décret Tertiaire, solutions PPA et Tiers-investissement, simulation de ROI en 2 minutes pour entreprises (France, Belgique, francophonie).',
  keywords: ['photovoltaïque B2B', 'solaire entreprise', 'Loi LOM', 'Décret Tertiaire', 'PPA', 'ombrière parking', 'toiture solaire', 'ROI photovoltaïque', 'autoconsommation', 'énergie renouvelable', 'France', 'Belgique', 'francophonie'],
  authors: [{ name: 'Aegis Solaire', url: siteUrl }],
  creator: 'Aegis Solaire',
  publisher: 'Aegis Solaire',
  formatDetection: { email: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: siteUrl,
    siteName: 'Aegis Solaire',
    title: 'Aegis Solaire | Simulateur ROI Photovoltaïque pour Entreprises',
    description: 'Valorisez vos toitures et parkings. Conformité Loi LOM, Décret Tertiaire. ROI en 2 minutes.',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Aegis Solaire' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aegis Solaire | Simulateur ROI Photovoltaïque B2B',
    description: 'Conformité Loi LOM & Décret Tertiaire. Calculez votre ROI solaire en 2 minutes.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: siteUrl },
  category: 'technology',
  icons: {
    icon: '/logo-square.png',
    apple: '/logo-square.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#112f4b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased overflow-x-hidden min-w-0`}>
        <StructuredData />
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
