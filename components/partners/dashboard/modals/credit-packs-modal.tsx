"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { Coins, ArrowRight, X, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CreditPacksModalProps {
  partner: any
  onClose: () => void
}

const PACKS = [
  { id: "pack_10", name: "Pack Découverte", credits: 10, priceHtva: 149, pricePerCredit: 14.9 },
  { id: "pack_50", name: "Pack Croissance", credits: 50, priceHtva: 599, pricePerCredit: 11.98, popular: true, saving: "-20%" },
  { id: "pack_100", name: "Pack Entreprise", credits: 100, priceHtva: 999, pricePerCredit: 9.99, saving: "-33%" },
]

export default function CreditPacksModal({ partner, onClose }: CreditPacksModalProps) {
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
          aria-label="Fermer la fenêtre de recharge"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent/15 p-2 text-accent border border-accent/20">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Recharger mon Solde de Crédits</h3>
            <p className="text-xs text-muted-foreground">
              Solde actuel : <strong className="font-mono text-foreground tabular-nums">{partner.credits ?? 0} crédits</strong> • 1 crédit = ~15 € HTVA
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                pack.popular
                  ? "border-accent bg-accent/[0.04] shadow-xs ring-1 ring-accent/30"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 right-3 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground tracking-wide">
                  Recommandé
                </span>
              )}

              <div>
                <h4 className="font-bold text-sm text-foreground">{pack.name}</h4>
                <div className="mt-2">
                  <span className="font-mono text-2xl font-black text-foreground tabular-nums">{pack.credits}</span>
                  <span className="text-xs text-muted-foreground"> crédits</span>
                </div>
                <p className="text-xs font-semibold text-foreground mt-1">
                  <span className="font-mono tabular-nums">{pack.priceHtva} €</span>{" "}
                  <span className="text-[10px] text-muted-foreground">HTVA</span>
                </p>
                <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  ({pack.pricePerCredit.toFixed(2)} € / crédit)
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <Button size="sm" variant={pack.popular ? "accent" : "outline"} className="w-full text-xs font-semibold h-9" asChild>
                  <Link href={`/partenaires/dashboard/credits?pack=${pack.id}`}>
                    <span>Commander</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-3.5 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>Facturation conforme avec TVA 21% déductible (SPRL / SA / Indépendant).</span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-bold text-foreground shrink-0" asChild>
            <Link href="/partenaires/dashboard/credits">
              <span>Page crédits complète</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
