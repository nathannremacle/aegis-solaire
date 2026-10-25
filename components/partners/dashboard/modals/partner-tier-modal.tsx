"use client"

import * as React from "react"
import { useEffect } from "react"
import { Award, Check, Sparkles, X, Crown, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PartnerTierModalProps {
  partner: any
  onClose: () => void
}

export default function PartnerTierModal({ partner, onClose }: PartnerTierModalProps) {
  const purchasesCount = partner.purchasesCount ?? 0
  const currentTier = purchasesCount >= 15 ? "gold" : purchasesCount >= 5 ? "silver" : "certified"

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 overscroll-contain"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          aria-label="Fermer la boîte de dialogue"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent/15 p-2 text-accent border border-accent/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Paliers &amp; Avantages Installateurs</h3>
            <p className="text-xs text-muted-foreground">
              Votre palier actuel : <strong className="capitalize text-foreground">{currentTier}</strong> ({purchasesCount} dossier{purchasesCount > 1 ? "s" : ""} traité{purchasesCount > 1 ? "s" : ""})
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Certified */}
          <div className={`rounded-xl border p-4 ${currentTier === "certified" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-foreground">Certified</span>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Dès l'inscription validée</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Accès feed standard</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Garantie litige 24h</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Mini-CRM Pipeline</li>
            </ul>
          </div>

          {/* Silver */}
          <div className={`rounded-xl border p-4 ${currentTier === "silver" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-foreground">Silver</span>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Dès 5 dossiers achetés</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> <strong>+15 min d'avance</strong> sur les leads</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Support prioritaire</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Badge Certifié Silver</li>
            </ul>
          </div>

          {/* Gold */}
          <div className={`rounded-xl border p-4 ${currentTier === "gold" ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-border bg-card"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-foreground">Gold</span>
              <Crown className="h-4 w-4 text-accent" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Dès 15 dossiers achetés</p>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent shrink-0" /> <strong>+30 min d'avance</strong> exclusive</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent shrink-0" /> Interlocuteur dédié</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent shrink-0" /> Remises volume sur les packs</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}
