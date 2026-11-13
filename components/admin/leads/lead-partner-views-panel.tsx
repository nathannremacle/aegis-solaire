"use client"

import { useEffect, useState } from "react"
import { Eye, Clock, Flame, Camera, MousePointerClick, CheckCircle2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LeadEngagementSummary } from "@/lib/partner-telemetry"

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  if (totalSeconds < 60) return `${totalSeconds} s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return `${hours}h ${String(remMinutes).padStart(2, "0")}m`
}

export function LeadPartnerViewsPanel({ leadId }: { leadId: string }) {
  const [summary, setSummary] = useState<LeadEngagementSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    setLoading(true)

    fetch(`/api/admin/partner-telemetry?leadId=${encodeURIComponent(leadId)}&days=60&includeTest=false`, {
      headers: { "x-admin-request": "true" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        const leadData = data?.byLead?.[leadId] ?? null
        setSummary(leadData)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [leadId])

  return (
    <div className="rounded-md border border-border bg-card p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Intérêt &amp; Lectures Installateurs
          </span>
          {loading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>

        {summary ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
            <span className="rounded bg-secondary border border-border px-1.5 py-0.5 font-semibold text-foreground">
              {summary.uniquePartnersCount} installateur{summary.uniquePartnersCount > 1 ? "s" : ""}
            </span>
            <span className="rounded bg-accent/10 border border-accent/20 px-1.5 py-0.5 font-semibold text-accent">
              {formatDuration(summary.totalDurationMs)} cumulé
            </span>
          </div>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">0 consultation</span>
        )}
      </div>

      {!summary || summary.viewers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Aucun installateur partenaire n&apos;a encore ouvert la fiche technique de ce chantier.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-border bg-secondary/30 px-2.5 py-2 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Ouvertures</span>
              <span className="font-mono font-bold text-foreground tabular-nums">
                {summary.totalViews}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 px-2.5 py-2 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Temps moyen</span>
              <span className="font-mono font-bold text-foreground tabular-nums">
                {formatDuration(summary.avgDurationMs)}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 px-2.5 py-2 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Intentions achat</span>
              <span className="font-mono font-bold text-accent tabular-nums">
                {summary.unlockIntentsCount}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {summary.viewers.map((viewer) => {
              const isHot = !viewer.hasPurchased && (viewer.unlockIntent || viewer.totalDurationMs >= 20000)
              return (
                <div
                  key={viewer.partnerId}
                  className={cn(
                    "rounded-lg border p-2.5 flex flex-col gap-1.5 text-xs",
                    viewer.hasPurchased
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : isHot
                      ? "border-accent/40 bg-accent/5"
                      : "border-border bg-secondary/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isHot && <Flame className="h-3.5 w-3.5 text-accent shrink-0" />}
                      {viewer.hasPurchased && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                      <span className="font-semibold text-foreground truncate">
                        {viewer.companyName}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold tabular-nums text-foreground shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDuration(viewer.totalDurationMs)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono tabular-nums">
                        {viewer.viewsCount} clic{viewer.viewsCount > 1 ? "s" : ""}
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{viewer.credits} cr.</span>
                      {viewer.zoomedPhoto && (
                        <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 gap-1 border-border">
                          <Camera className="h-2.5 w-2.5" />
                          Zoom photo
                        </Badge>
                      )}
                      {viewer.unlockIntent && !viewer.hasPurchased && (
                        <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 gap-1 border-accent/40 text-accent bg-accent/10">
                          <MousePointerClick className="h-2.5 w-2.5" />
                          Clic Débloquer
                        </Badge>
                      )}
                      {viewer.hasPurchased && (
                        <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                          Acheté
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-[10px] tabular-nums">
                      {new Date(viewer.lastViewedAt).toLocaleString("fr-BE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
