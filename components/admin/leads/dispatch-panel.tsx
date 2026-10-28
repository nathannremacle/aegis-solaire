"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type CompatiblePartner = {
  id: string
  company_name: string
  credits: number
  segment?: string | null
  target_provinces?: string[] | null
  is_eligible?: boolean
  ineligibility_reason?: string
}

export function DispatchPanel({
  segment,
  province,
  creditCost,
  onCreditCostChange,
  partners = [],
  selectedPartnerIds,
  onSelectionChange,
  dispatchMode,
  onDispatchModeChange,
}: {
  segment: "B2B" | "B2C" | string
  province?: string | null
  creditCost: number
  onCreditCostChange: (cost: number) => void
  partners: CompatiblePartner[]
  selectedPartnerIds: string[]
  onSelectionChange: (ids: string[]) => void
  dispatchMode: "marketplace" | "direct"
  onDispatchModeChange: (mode: "marketplace" | "direct") => void
}) {
  const maxSlots = segment === "B2B" ? 1 : 3

  function togglePartner(id: string) {
    if (dispatchMode !== "direct") return
    if (segment === "B2B") {
      onSelectionChange(selectedPartnerIds.includes(id) ? [] : [id])
    } else {
      if (selectedPartnerIds.includes(id)) {
        onSelectionChange(selectedPartnerIds.filter((p) => p !== id))
      } else {
        if (selectedPartnerIds.length < maxSlots) {
          onSelectionChange([...selectedPartnerIds, id])
        }
      }
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-3.5 flex flex-col gap-3.5">
      {/* Mode de distribution */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Routage & Marketplace
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-muted-foreground">Créneaux :</span>
            <span className="font-semibold tabular-nums text-foreground">
              {maxSlots} max ({segment === "B2B" ? "Exclusif" : "Concurrent"})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onDispatchModeChange("marketplace")}
            className={cn(
              "flex flex-col text-left p-2.5 rounded-md border text-xs transition-colors",
              dispatchMode === "marketplace"
                ? "bg-primary/[0.04] border-primary text-foreground"
                : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <span className="font-semibold text-foreground">Vivier Marketplace</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Disponible à l'achat par les installateurs
            </span>
          </button>

          <button
            type="button"
            onClick={() => onDispatchModeChange("direct")}
            className={cn(
              "flex flex-col text-left p-2.5 rounded-md border text-xs transition-colors",
              dispatchMode === "direct"
                ? "bg-primary/[0.04] border-primary text-foreground"
                : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <span className="font-semibold text-foreground">Attribution Directe</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              Routage ciblé et déblocage immédiat
            </span>
          </button>
        </div>
      </div>

      {/* Coût en crédits (Barème V2 officiel fixe) */}
      <div className="flex items-center justify-between border-t border-border/80 pt-3 text-xs">
        <div>
          <Label className="text-muted-foreground block">Coût d'acquisition du lead</Label>
          <span className="text-[10px] text-muted-foreground font-mono">
            Barème V2 · {segment === "B2B" ? "B2B exclusif" : "B2C résidentiel"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-foreground border border-border tabular-nums">
            {segment === "B2B" ? 9 : 3} cr.
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            ({segment === "B2B" ? "103,50" : "34,50"} € HT)
          </span>
        </div>
      </div>

      {/* Liste des partenaires compatibles */}
      <div className="border-t border-border/80 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Installateurs compatibles {province ? `(${province.replace("_", " ")})` : ""}
          </span>
          {dispatchMode === "direct" && (
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {selectedPartnerIds.length} / {maxSlots} sélectionné{selectedPartnerIds.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {partners.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Aucun installateur certifié actif sur ce segment et cette province.
          </p>
        ) : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {partners.map((partner) => {
              const isSelected = selectedPartnerIds.includes(partner.id)
              const hasEnoughCredits = partner.credits >= creditCost
              const isEligible = (partner.is_eligible ?? true) && hasEnoughCredits

              return (
                <div
                  key={partner.id}
                  onClick={() => isEligible && togglePartner(partner.id)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md border text-xs transition-colors",
                    !isEligible && "opacity-50 bg-secondary/30 border-border cursor-not-allowed",
                    isEligible && isSelected && "bg-primary/[0.04] border-primary",
                    isEligible && !isSelected && "bg-card border-border hover:bg-secondary/40 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {dispatchMode === "direct" && (
                      <Checkbox
                        checked={isSelected}
                        disabled={!isEligible || (!isSelected && selectedPartnerIds.length >= maxSlots)}
                        onCheckedChange={() => togglePartner(partner.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {partner.company_name}
                      </span>
                      {!hasEnoughCredits && (
                        <span className="text-[10px] text-destructive font-mono">
                          Crédits insuffisants ({partner.credits} &lt; {creditCost})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {partner.credits} cr.
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
