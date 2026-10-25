import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { StructuredData } from '@/components/StructuredData'
import { Toaster } from '@/components/ui/sonner'
import { MediaPartnerRefTracker } from '@/components/media-partner-ref-tracker'
import { SiteHeader } from '@/components/site-header'
import { AdTrackingScripts } from '@/components/analytics/ad-tracking'
import { CookieConsentBanner } from '@/components/analytics/cookie-consent-banner'
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
    <html lang="fr-BE" suppressHydrationWarning>
      <head>
        {/* Ignore browser extension errors & hydration warnings (e.g. Bitdefender Anti-Tracker/TrafficLight injecting bis_skin_checked="1") from triggering the Next.js dev overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Intercept console.error to filter out extension-injected hydration mismatches (bis_skin_checked)
                try {
                  var origError = console.error;
                  var filterExtHydration = function(fn) {
                    return function() {
                      for (var i = 0; i < arguments.length; i++) {
                        var arg = arguments[i];
                        var str = typeof arg === 'string' ? arg : (arg && arg.message ? arg.message : '');
                        if (str && str.indexOf('bis_skin_checked') !== -1) {
                          return;
                        }
                        if (typeof arg === 'object' && arg !== null) {
                          try {
                            if (JSON.stringify(arg).indexOf('bis_skin_checked') !== -1) return;
                          } catch(err) {}
                        }
                      }
                      return fn.apply(console, arguments);
                    };
                  };

                  var customError = filterExtHydration(origError);

                  Object.defineProperty(console, 'error', {
                    configurable: true,
                    enumerable: true,
                    get: function() { return customError; },
                    set: function(newHandler) {
                      origError = newHandler;
                      customError = filterExtHydration(newHandler);
                    }
                  });
                } catch(e) {}

                // 2. Strip bis_skin_checked attributes injected by Bitdefender or VPN extensions before hydration
                try {
                  var cleanBis = function() {
                    var elms = document.querySelectorAll('[bis_skin_checked]');
                    for (var i = 0; i < elms.length; i++) {
                      elms[i].removeAttribute('bis_skin_checked');
                    }
                  };

                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                        if (m.target && m.target.removeAttribute) {
                          m.target.removeAttribute('bis_skin_checked');
                        }
                      }
                    }
                  });

                  if (document.documentElement) {
                    observer.observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: ['bis_skin_checked']
                    });
                  }

                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', cleanBis, { once: true });
                  } else {
                    cleanBis();
                  }
                } catch(e) {}

                // 3. Catch uncaught extension exceptions
                window.addEventListener('error', function(e) {
                  if (e.filename && e.filename.startsWith('chrome-extension://')) {
                    e.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason;
                  if (reason && ((reason.stack && reason.stack.indexOf('chrome-extension://') !== -1) || (reason.message && reason.message.indexOf('chrome-extension://') !== -1))) {
                    e.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${dmSans.variable} font-sans antialiased overflow-x-hidden min-w-0`}
      >
        <StructuredData />
        <Suspense fallback={null}>
          <MediaPartnerRefTracker />
        </Suspense>
        <SiteHeader />
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
        <AdTrackingScripts />
        <CookieConsentBanner />
      </body>
    </html>
  )
}
