"use client"

import Script from "next/script"
import { useSyncExternalStore } from "react"
import { hasAdvertisingConsent, readAdvertisingConsent, subscribeToConsent } from "@/lib/advertising-consent"

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
  }
}

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

/**
 * Envoie un événement de conversion Lead optimisé pour Meta Ads & Google Ads
 */
export function trackLeadConversion(params?: {
  segment?: "B2B" | "B2C"
  leadId?: string
  value?: number
  currency?: string
}) {
  if (typeof window === "undefined" || !hasAdvertisingConsent(readAdvertisingConsent())) return

  const eventData = {
    content_name: params?.segment === "B2C" ? "Lead Solaire Résidentiel" : "Lead Solaire B2B",
    content_category: "Solar Lead Wallonie",
    value: params?.value ?? (params?.segment === "B2C" ? 35 : 120),
    currency: params?.currency ?? "EUR",
    lead_id: params?.leadId,
  }

  // 1. Meta Pixel (Facebook Ads)
  if (typeof window.fbq === "function") {
    try {
      if (params?.leadId) {
        window.fbq("track", "Lead", eventData, { eventID: params.leadId })
      } else {
        window.fbq("track", "Lead", eventData)
      }
    } catch (e) {
      console.warn("Meta Pixel track error:", e)
    }
  }

  // 2. Google Tag / Ads
  if (typeof window.gtag === "function" && GOOGLE_ADS_ID) {
    try {
      window.gtag("event", "conversion", {
        send_to: GOOGLE_ADS_ID,
        value: eventData.value,
        currency: eventData.currency,
        transaction_id: params?.leadId,
      })
    } catch (e) {
      console.warn("Google Ads conversion track error:", e)
    }
  }

  // 3. Google Tag Manager DataLayer
  if (Array.isArray(window.dataLayer)) {
    try {
      window.dataLayer.push({
        event: "generate_lead",
        lead_segment: params?.segment ?? "B2B",
        lead_value: eventData.value,
        lead_currency: eventData.currency,
      })
    } catch (e) {
      console.warn("GTM push error:", e)
    }
  }
}

/**
 * Composant client pour injecter les balises de tracking publicitaire sans blocage
 */
export function AdTrackingScripts() {
  const consent = useSyncExternalStore(subscribeToConsent, readAdvertisingConsent, () => undefined)
  if (!hasAdvertisingConsent(consent)) return null
  return (
    <>
      {/* ── Meta Pixel ── */}
      {META_PIXEL_ID && (
        <>
          <Script
            id="meta-pixel-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('consent', 'grant');
                fbq('init', '${META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />

        </>
      )}

      {/* ── Google Ads / gtag.js ── */}
      {GOOGLE_ADS_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-ads-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GOOGLE_ADS_ID}');
              `,
            }}
          />
        </>
      )}

      {/* ── Google Tag Manager ── */}
      {GTM_ID && (
        <Script
          id="gtm-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />
      )}
    </>
  )
}
