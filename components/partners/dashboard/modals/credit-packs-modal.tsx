"use client"

import * as React from "react"
import Link from "next/link"
import { Coins, CheckCircle2, ArrowRight, X, Building, ShieldCheck } from "lucide-react"
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#001D3D]">Recharger mon Solde de Crédits</h3>
            <p className="text-xs text-neutral-500">
              Solde actuel : <strong className="text-neutral-800">{partner.credits ?? 0} crédits</strong> • 1 crédit = ~15 € HTVA
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                pack.popular
                  ? "border-[#001D3D] bg-blue-50/20 shadow-2xs"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-[#FFB800] px-2 py-0.5 text-[10px] font-black uppercase text-[#001D3D]">
                  Recommandé
                </span>
              )}

              <div>
                <h4 className="font-bold text-sm text-[#001D3D]">{pack.name}</h4>
                <div className="mt-2">
                  <span className="text-2xl font-black text-neutral-900">{pack.credits}</span>
                  <span className="text-xs text-neutral-500"> crédits</span>
                </div>
                <p className="text-xs font-semibold text-neutral-600 mt-1">
                  {pack.priceHtva} € <span className="text-[10px] text-neutral-400">HTVA</span>
                </p>
                <p className="text-[11px] text-neutral-400">
                  ({pack.pricePerCredit.toFixed(2)} € / crédit)
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100">
                <Button size="sm" variant={pack.popular ? "accent" : "outline"} className="w-full text-xs" asChild>
                  <Link href={`/partenaires/dashboard/credits?pack=${pack.id}`}>
                    <span>Commander</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Facturation conforme avec TVA 21% déductible (SPRL / SA / Indépendant).</span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs font-bold text-[#001D3D]" asChild>
            <Link href="/partenaires/dashboard/credits">
              <span>Page crédits complète</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
