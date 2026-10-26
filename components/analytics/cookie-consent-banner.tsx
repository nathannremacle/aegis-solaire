"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = document.cookie
      .split("; ")
      .find((row) => row.startsWith("aegis_cookie_consent="))
      ?.split("=")[1]

    if (!consent) {
      queueMicrotask(() => setShowBanner(true))
    }
  }, [])

  const handleConsent = (accepted: boolean) => {
    const value = accepted ? "granted" : "denied"
    const maxAge = 180 * 24 * 60 * 60 // 6 mois
    document.cookie = `aegis_cookie_consent=${value}; path=/; max-age=${maxAge}; SameSite=Lax`

    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("consent", accepted ? "grant" : "revoke")
    }

    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <aside
      aria-label="Consentement relatif aux cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 text-xs text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-900 text-sm mb-1">Respect de votre vie privée</p>
          Aegis Solaire utilise des traceurs pour mesurer l&apos;efficacité de ses campagnes et optimiser la simulation de devis.{" "}
          <Link href="/politique-confidentialite" className="underline font-semibold text-primary">
            En savoir plus
          </Link>.
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => handleConsent(false)}
          className="flex-1 h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Continuer sans accepter
        </button>
        <button
          type="button"
          onClick={() => handleConsent(true)}
          className="flex-1 h-10 px-3 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-primary-foreground shadow-xs transition-colors cursor-pointer"
        >
          Accepter
        </button>
      </div>
    </aside>
  )
}
