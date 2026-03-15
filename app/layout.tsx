import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { JsonLd } from '@/components/json-ld'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aegis-solaire.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Aegis Solaire | Simulateur ROI Photovoltaïque B2B – Loi LOM & Décret Tertiaire',
    template: '%s | Aegis Solaire',
  },
  description: 'Valorisez vos toitures et parkings : mise en conformité Loi LOM et Décret Tertiaire. Calculez votre ROI photovoltaïque en 2 minutes. Solution B2B pour entreprises (France, Belgique, francophonie).',
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
        <JsonLd />
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
