"use client"

import * as React from "react"
import { Award, Check, Sparkles, X, Crown, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PartnerTierModalProps {
  partner: any
  onClose: () => void
}

export default function PartnerTierModal({ partner, onClose }: PartnerTierModalProps) {
  const purchasesCount = partner.purchasesCount ?? 0
  const currentTier = purchasesCount >= 15 ? "gold" : purchasesCount >= 5 ? "silver" : "certified"

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
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#001D3D]">Paliers &amp; Avantages Installateurs</h3>
            <p className="text-xs text-neutral-500">
              Votre palier actuel : <strong className="capitalize text-neutral-800">{currentTier}</strong> ({purchasesCount} dossier{purchasesCount > 1 ? "s" : ""} traité{purchasesCount > 1 ? "s" : ""})
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Certified */}
          <div className={`rounded-xl border p-4 ${currentTier === "certified" ? "border-[#001D3D] bg-neutral-50/80 ring-1 ring-[#001D3D]" : "border-neutral-200"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-neutral-700">Certified</span>
              <Shield className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Dès l'inscription validée</p>
            <ul className="mt-3 space-y-2 text-xs text-neutral-600">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Accès feed standard</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Garantie litige 24h</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Mini-CRM Pipeline</li>
            </ul>
          </div>

          {/* Silver */}
          <div className={`rounded-xl border p-4 ${currentTier === "silver" ? "border-[#001D3D] bg-blue-50/30 ring-1 ring-[#001D3D]" : "border-neutral-200"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-blue-900">Silver</span>
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Dès 5 dossiers achetés</p>
            <ul className="mt-3 space-y-2 text-xs text-neutral-600">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> <strong>+15 min d'avance</strong> sur les leads</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Support prioritaire</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Badge Certifié Silver</li>
            </ul>
          </div>

          {/* Gold */}
          <div className={`rounded-xl border p-4 ${currentTier === "gold" ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-400" : "border-neutral-200"}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-amber-900">Gold</span>
              <Crown className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Dès 15 dossiers achetés</p>
            <ul className="mt-3 space-y-2 text-xs text-neutral-600">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> <strong>+30 min d'avance</strong> exclusive</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Interlocuteur dédié</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Remises volume sur les packs</li>
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
