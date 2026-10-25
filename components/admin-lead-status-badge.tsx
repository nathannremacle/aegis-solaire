import { cn } from "@/lib/utils"
import { deriveOpsStatus, OPS_STATUS_CONFIG, type LeadOpsInput } from "@/lib/admin/ops-status"

export function LeadStatusBadge({
  status,
  marketplaceStatus,
  archivedAt,
  hasDispute,
  purchasesCount,
  className,
}: {
  status?: string | null
  marketplaceStatus?: string | null
  archivedAt?: string | null
  hasDispute?: boolean
  purchasesCount?: number
  className?: string
}) {
  const opsInput: LeadOpsInput = {
    status,
    marketplace_status: marketplaceStatus,
    archived_at: archivedAt,
    has_dispute: hasDispute,
    purchases_count: purchasesCount,
  }
  const opsStatus = deriveOpsStatus(opsInput)
  const config = OPS_STATUS_CONFIG[opsStatus]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-5 px-2 rounded-sm border font-mono text-[11px] font-medium tracking-tight whitespace-nowrap",
        config.badgeClass,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dotClass)} />
      <span>{config.label}</span>
    </span>
  )
}
