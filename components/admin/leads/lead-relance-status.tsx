"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, RefreshCw, CheckCircle2, Clock, AlertTriangle, Users, Flame } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface LeadRelanceInfo {
  leadId: string
  segment: string
  marketplaceStatus: string
  currentWave: number
  lastRelanceAt: string | null
  takenSlots: number
  maxSlots: number
  remainingSlots: number
  isFullySold: boolean
  dispatches: {
    id: string
    wave_number: number
    email_to: string
    sent_at: string
    matching_score: number
    matching_tier: string
    partners?: { company_name: string } | null
  }[]
  purchases: {
    id: string
    partner_id: string
    purchased_at: string
    credits_spent: number
    partners?: { company_name: string; email: string } | null
  }[]
}

export function LeadRelanceStatus({
  leadId,
  marketplaceStatus,
  segment,
}: {
  leadId: string
  marketplaceStatus?: string | null
  segment?: string | null
}) {
  const [data, setData] = useState<LeadRelanceInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/relance`, {
        headers: { "x-admin-request": "true" },
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error("[LeadRelanceStatus] error fetching status:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (leadId) {
      fetchStatus()
    }
  }, [leadId])

  async function handleTriggerWave(waveToTrigger?: number) {
    startTransition(async () => {
      try {
        const targetWave = waveToTrigger ?? ((data?.currentWave || 0) + 1)
        const res = await fetch(`/api/admin/leads/${leadId}/relance`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-request": "true" },
          body: JSON.stringify({ waveNumber: targetWave }),
        })
        const result = await res.json()

        if (!res.ok || result.error) {
          toast.error(result.error || "Échec de l'envoi de la relance")
          return
        }

        if (result.sentCount > 0) {
          toast.success(`Vague ${targetWave} envoyée avec succès à ${result.sentCount} installateur(s) !`)
        } else {
          toast.info(result.message || "Aucun nouvel installateur éligible pour cette vague.")
        }
        await fetchStatus()
      } catch (err: any) {
        toast.error(err.message || "Erreur lors du déclenchement de la relance")
      }
    })
  }

  const isB2B = segment === "B2B"
  const maxSlots = data?.maxSlots ?? (isB2B ? 1 : 3)
  const takenSlots = data?.takenSlots ?? 0
  const remainingSlots = Math.max(0, maxSlots - takenSlots)
  const isFullySold = takenSlots >= maxSlots || marketplaceStatus === "sold_out"
  const currentWave = data?.currentWave ?? 0

  return (
    <div className="rounded-md border border-border bg-card p-3.5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Relances & Vagues de Vente
          </span>
          {loading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-muted-foreground">Créneaux :</span>
          <span
            className={cn(
              "font-semibold tabular-nums px-1.5 py-0.5 rounded text-[11px]",
              isFullySold
                ? "bg-primary text-primary-foreground"
                : remainingSlots === 1
                ? "bg-accent/15 text-accent border border-accent/30"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {takenSlots} / {maxSlots} vendu{takenSlots > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Visual Slot Tracker */}
      <div className="grid grid-cols-3 gap-1.5 pt-0.5">
        {Array.from({ length: maxSlots }).map((_, index) => {
          const isSlotTaken = index < takenSlots
          const purchaseInfo = data?.purchases?.[index]
          return (
            <div
              key={index}
              className={cn(
                "p-2 rounded border flex flex-col gap-0.5 text-center transition-colors text-xs",
                isSlotTaken
                  ? "bg-primary/[0.06] border-primary text-foreground"
                  : "bg-secondary/30 border-dashed border-border text-muted-foreground"
              )}
            >
              <div className="flex items-center justify-center gap-1">
                {isSlotTaken ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Clock className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="font-mono font-medium text-[11px]">
                  Place {index + 1}
                </span>
              </div>
              <span className="text-[10px] truncate">
                {isSlotTaken
                  ? purchaseInfo?.partners?.company_name || "Vendu"
                  : "Disponible"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Wave Status Information */}
      <div className="border-t border-border/80 pt-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">État actuel :</span>
          <span className="font-mono font-medium text-foreground">
            {currentWave === 0
              ? "Aucune vague envoyée"
              : `Vague ${currentWave} active`}
          </span>
        </div>
        {data?.lastRelanceAt && (
          <span className="font-mono text-[11px] text-muted-foreground">
            Dernier envoi :{" "}
            {new Date(data.lastRelanceAt).toLocaleTimeString("fr-BE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      {!isFullySold && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            disabled={isPending || loading}
            onClick={() => handleTriggerWave(currentWave === 0 ? 1 : Math.min(3, currentWave + 1))}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs font-medium"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {currentWave === 0
              ? "Lancer la Vague 1 (Alerte Immédiate)"
              : `Déclencher la Vague ${Math.min(3, currentWave + 1)} (Relance)`}
          </Button>

          {currentWave > 0 && currentWave < 3 && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || loading}
              onClick={() => handleTriggerWave(currentWave)}
              className="shrink-0 h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
              title="Renvoyer la vague actuelle aux nouveaux installateurs éligibles"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {isFullySold && (
        <div className="p-2 bg-primary/[0.05] border border-primary/20 rounded text-center text-xs font-mono text-primary font-medium">
          ✓ Quota complet atteint. Les relances sont automatiquement closes.
        </div>
      )}

      {/* Dispatches summary table */}
      {data?.dispatches && data.dispatches.length > 0 && (
        <div className="border-t border-border/80 pt-2 flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            Historique des notifications ({data.dispatches.length})
          </span>
          <div className="flex flex-col gap-1">
            {data.dispatches.slice(0, 5).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-[11px] p-1.5 rounded bg-secondary/30"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4">
                    V{d.wave_number}
                  </Badge>
                  <span className="truncate text-foreground font-medium">
                    {d.partners?.company_name || d.email_to}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                  <span>Score: {d.matching_score}</span>
                  <span>
                    {new Date(d.sent_at).toLocaleTimeString("fr-BE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
