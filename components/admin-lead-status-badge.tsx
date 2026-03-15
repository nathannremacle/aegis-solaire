import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  contacted: { label: "Contacté", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  qualified: { label: "Qualifié", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  converted: { label: "Converti", className: "bg-primary/15 text-primary border-primary/30" },
  lost: { label: "Perdu", className: "bg-muted text-muted-foreground border-border" },
}

export function LeadStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground" }
  return (
    <Badge variant="outline" className={cn("font-medium", config.className, className)}>
      {config.label}
    </Badge>
  )
}
