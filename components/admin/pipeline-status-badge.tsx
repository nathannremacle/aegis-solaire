"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  PIPELINE_STATUS_META,
  PIPELINE_STATUS_ORDER,
  normalizePipelineStatus,
  type PipelineCounts,
  type PipelineStatusKey,
} from "@/lib/admin/partner-purchases"

interface PipelineStatusBadgeProps {
  status: string | null | undefined
  compact?: boolean
  className?: string
}

/**
 * Badge sémantique affichant le statut CRM déclaré par l'installateur sur un lead acheté.
 */
export function PipelineStatusBadge({
  status,
  compact = false,
  className,
}: PipelineStatusBadgeProps) {
  const key = normalizePipelineStatus(status)
  const meta = PIPELINE_STATUS_META[key]

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        compact ? "text-[10px] py-0 h-4 px-1.5" : "text-[11px] py-0.5 px-2",
        meta.badgeClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dotClass)} />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </Badge>
  )
}

interface PipelineStatusFilterBarProps {
  counts: PipelineCounts
  totalCount: number
  selectedStatus: PipelineStatusKey | "ALL"
  onSelectStatus: (status: PipelineStatusKey | "ALL") => void
  compact?: boolean
}

/**
 * Barre interactive de compteurs CRM par statut permettant de voir les volumes
 * et filtrer en 1 clic les leads correspondants.
 */
export function PipelineStatusFilterBar({
  counts,
  totalCount,
  selectedStatus,
  onSelectStatus,
  compact = false,
}: PipelineStatusFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSelectStatus("ALL")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border transition-colors cursor-pointer whitespace-nowrap",
          compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs",
          selectedStatus === "ALL"
            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
      >
        <span>Tous</span>
        <span className="font-mono tabular-nums font-bold">{totalCount}</span>
      </button>

      {PIPELINE_STATUS_ORDER.map((statusKey) => {
        const meta = PIPELINE_STATUS_META[statusKey]
        const count = counts[statusKey] ?? 0
        const isActive = selectedStatus === statusKey

        return (
          <button
            key={statusKey}
            type="button"
            onClick={() => onSelectStatus(isActive ? "ALL" : statusKey)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border transition-colors cursor-pointer whitespace-nowrap",
              compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs",
              isActive
                ? cn(meta.activeFilterClass, "font-semibold shadow-2xs")
                : count > 0
                  ? cn(meta.badgeClass, "hover:opacity-90")
                  : "bg-background border-border text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                isActive ? "bg-current" : meta.dotClass
              )}
            />
            <span>{meta.label}</span>
            <span className="font-mono tabular-nums font-bold">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Extrait les notes saisies manuellement par l'installateur en écartant la trace système Mollie.
 */
export function extractCustomPartnerNotes(notes: string | null | undefined): string | null {
  const trimmed = (notes || "").trim()
  if (!trimmed) return null
  if (/^Achat direct en euros\s*\(Mollie:[^)]+\)/i.test(trimmed)) {
    return null
  }
  return trimmed
}
