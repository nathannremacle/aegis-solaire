"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { Coins, ArrowRight, X, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

import { CREDIT_PACKS_LIST, CREDIT_UNIT_PRICE_EUR } from "@/lib/credit-pricing"

interface CreditPacksModalProps {
  partner: any
  onClose: () => void
}

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border-t sm:border border-border bg-card px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overscroll-contain"
      >
        <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-border sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-accent/15 p-2 text-accent border border-accent/20 shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                Recharger mon Solde de Crédits
              </h3>
              <p className="text-xs text-muted-foreground">
                Solde actuel : <strong className="font-mono text-foreground tabular-nums">{partner.credits ?? 0} crédits</strong> • 1 crédit = {CREDIT_UNIT_PRICE_EUR.toFixed(2).replace(".", ",")} € HTVA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer la fenêtre de recharge"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CREDIT_PACKS_LIST.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                pack.popular
                  ? "border-accent bg-accent/[0.04] shadow-xs ring-1 ring-accent/30"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              {pack.popular ? (
                <span className="absolute -top-2.5 right-3 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground tracking-wide">
                  Recommandé · -{pack.savingsPercent} %
                </span>
              ) : pack.savingsPercent > 0 ? (
                <span className="absolute -top-2.5 right-3 rounded-md border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 font-mono tabular-nums">
                  -{pack.savingsPercent.toString().replace(".", ",")} %
                </span>
              ) : null}

              <div>
                <h4 className="font-bold text-sm text-foreground">{pack.name}</h4>
                <div className="mt-2">
                  <span className="font-mono text-2xl font-black text-foreground tabular-nums">{pack.credits}</span>
                  <span className="text-xs text-muted-foreground"> crédits</span>
                </div>
                <p className="text-xs font-semibold text-foreground mt-1">
                  <span className="font-mono tabular-nums">{pack.priceHtva.toFixed(0)} €</span>{" "}
                  <span className="text-[10px] text-muted-foreground">HTVA</span>
                  <span className="ml-1.5 font-mono text-[11px] font-bold text-emerald-700 tabular-nums">
                    ({pack.pricePerCredit.toFixed(2).replace(".", ",")} €/cr.)
                  </span>
                </p>
                <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  ({pack.priceTtc.toFixed(2).replace(".", ",")} € TTC · zéro crédit bloqué)
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <Button size="sm" variant={pack.popular ? "accent" : "outline"} className="w-full text-xs font-semibold min-h-[42px] sm:h-9 rounded-xl" asChild>
                  <Link href={`/partenaires/dashboard/credits?pack=${pack.id}`}>
                    <span>Commander</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-3.5 text-xs text-muted-foreground flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>
                Facturation conforme avec TVA <span className="font-mono tabular-nums">21 %</span> déductible. Vous pouvez aussi régler à l&apos;unité ou compléter un solde partiel directement en euros (zéro crédit bloqué).
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-foreground shrink-0" asChild>
              <Link href="/partenaires/dashboard/credits">
                <span>Page crédits complète</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="pt-2 border-t border-border/70 text-[11px] text-foreground flex items-center justify-between gap-2">
            <span>
              Astuce : invitez un confrère certifié RESCERT via <strong className="text-primary">Parrainage</strong> pour recevoir{" "}
              <strong className="font-mono tabular-nums text-accent">+3 crédits offerts</strong> chacun dès son <span className="font-mono tabular-nums">1er</span> achat.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
