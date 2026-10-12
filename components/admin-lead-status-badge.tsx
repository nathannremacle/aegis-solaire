import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  contacted: { label: "En attente client", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  qualified: { label: "Validé (Marketplace)", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  converted: { label: "Assigné (Direct)", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  lost: { label: "Rejeté / Spam", className: "bg-muted text-muted-foreground border-border" },
  HOT_LEAD: { label: "Urgent", className: "bg-purple-600/20 text-purple-800 dark:text-purple-200 border-purple-600/40" },
  NEEDS_HUMAN_REVIEW: { label: "À contrôler", className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
}

export function LeadStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground" }
  return (
    <Badge variant="outline" className={cn("font-medium", config.className, className)}>
      {config.label}
    </Badge>
  )
}
