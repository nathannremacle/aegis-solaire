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
    default:
      'Panneaux solaires B2B Wallonie | Obligations PEB & rentabilité entreprises | Aegis Solaire',
    template: '%s | Aegis Solaire',
  },
  description:
    'Panneaux solaires B2B en Wallonie : obligations PEB, Certificats Verts (CWaPE), PACE 2030 et rentabilité entreprises. Simulateur ROI, Corporate PPA et tiers-investissement — étude de faisabilité en quelques minutes.',
  keywords: [
    'panneaux solaires B2B Wallonie',
    'obligations PEB',
    'rentabilité entreprises',
    'photovoltaïque entreprise Belgique',
    'Certificats Verts CWaPE',
    'PACE 2030',
    'Corporate PPA',
    'tiers-investissement',
    'ombrière parking',
    'toiture solaire industriel',
    'autoconsommation',
    'GRD Wallonie',
  ],
  authors: [{ name: 'Aegis Solaire', url: siteUrl }],
  creator: 'Aegis Solaire',
  publisher: 'Aegis Solaire',
  formatDetection: { email: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'fr_BE',
    url: siteUrl,
    siteName: 'Aegis Solaire',
    title: 'Panneaux solaires B2B Wallonie | Obligations PEB & rentabilité entreprises',
    description:
      'Obligations PEB, rentabilité entreprises et solaire B2B en Wallonie. Simulateur ROI, PPA et tiers-investissement.',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'Aegis Solaire' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Panneaux solaires B2B Wallonie | Aegis Solaire',
    description:
      'Obligations PEB et rentabilité entreprises. Simulateur photovoltaïque B2B pour la Wallonie.',
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
    <html lang="fr-BE">
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased overflow-x-hidden min-w-0`}>
        <StructuredData />
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
