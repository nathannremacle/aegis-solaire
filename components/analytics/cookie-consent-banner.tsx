"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { readAdvertisingConsent, saveAdvertisingConsent, subscribeToConsent } from "@/lib/advertising-consent"
import { ShieldCheck } from "lucide-react"

export function CookieConsentBanner() {
  const [editing, setEditing] = useState(false)
  const consent = useSyncExternalStore(subscribeToConsent, readAdvertisingConsent, () => undefined)
  const handleConsent = (accepted: boolean) => {
    saveAdvertisingConsent(accepted)
    setEditing(false)
  }
  if (consent && !editing) return (
    <button type="button" onClick={() => setEditing(true)}
      className="fixed bottom-3 left-3 z-50 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground shadow-sm transition-colors cursor-pointer">
      Gérer mes cookies
    </button>
  )

  return (
    <aside
      aria-label="Consentement relatif aux cookies"
      className="fixed bottom-0 inset-x-0 sm:bottom-4 sm:right-5 sm:left-auto sm:max-w-sm z-50 bg-card/98 backdrop-blur-xs border-t border-border sm:rounded-xl sm:border px-3 py-2.5 sm:p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center sm:items-start gap-2.5 sm:gap-3">
        <div className="hidden sm:flex h-8 w-8 rounded-lg bg-primary/10 text-primary items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 text-[11px] sm:text-xs text-muted-foreground leading-snug">
          <p className="hidden sm:block font-bold text-foreground text-sm mb-1">Respect de votre vie privée</p>
          Cookies de mesure de campagne.{" "}
          <Link href="/politique-confidentialite" className="underline font-semibold text-primary">
            Politique
          </Link>
        </div>
      </div>
      <div className="mt-2 sm:mt-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleConsent(false)}
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => handleConsent(true)}
          className="flex-1 h-9 px-3 rounded-lg bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground shadow-2xs transition-colors cursor-pointer"
        >
          Accepter
        </button>
      </div>
    </aside>
  )
}
