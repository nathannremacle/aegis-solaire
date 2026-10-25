import { cn } from "@/lib/utils"

/**
 * Affiche le score lead de manière sobre et architecturale (Swiss Design) :
 * - >= 70 : Haute valeur (Primary / Forest Green)
 * - 40–69 : Moyen (Muted)
 * - < 40 : À contrôler (Destructive)
 */
export function LeadScoreBadge({
  score,
  className,
}: {
  score: number | null | undefined
  className?: string
}) {
  if (score == null) {
    return (
      <span className={cn("inline-flex items-center justify-center h-5 px-1.5 rounded-sm font-mono text-[11px] text-muted-foreground bg-secondary border border-border tabular-nums", className)}>
        –
      </span>
    )
  }

  const s = Math.round(Number(score))
  const isHigh = s >= 70
  const isMedium = s >= 40 && s < 70
  const isLow = s < 40

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 h-5 px-1.5 rounded-sm font-mono text-[11px] font-medium tabular-nums border",
        isHigh && "bg-primary/10 text-primary border-primary/25",
        isMedium && "bg-secondary text-secondary-foreground border-border",
        isLow && "bg-destructive/10 text-destructive border-destructive/25",
        className
      )}
    >
      <span>{s}</span>
      <span className="text-[9px] text-muted-foreground font-mono">/100</span>
    </span>
  )
}
