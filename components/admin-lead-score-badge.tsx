import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Affiche le score lead : Rouge/Feu > 70, Orange 40–70, Gris < 40 */
export function LeadScoreBadge({
  score,
  className,
}: {
  score: number | null | undefined
  className?: string
}) {
  if (score == null) {
    return (
      <Badge variant="outline" className={cn("font-mono bg-muted text-muted-foreground", className)}>
        –
      </Badge>
    )
  }
  const s = Number(score)
  const isHot = s > 70
  const isMedium = s >= 40 && s <= 70
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono font-medium",
        isHot && "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
        isMedium && "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
        !isHot && !isMedium && "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {s}
    </Badge>
  )
}
