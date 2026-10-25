import { AlertTriangle, ShieldAlert } from "lucide-react"
import { type RiskFlag } from "@/lib/admin/lead-risk"
import { cn } from "@/lib/utils"

export function LeadRiskBanner({ flags }: { flags: RiskFlag[] }) {
  if (flags.length === 0) return null

  const hasCritical = flags.some((f) => f.severity === "critical")

  return (
    <div
      className={cn(
        "rounded-md border p-3 flex flex-col gap-2",
        hasCritical
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-status-review/10 border-status-review/30 text-status-review"
      )}
    >
      <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider">
        {hasCritical ? (
          <ShieldAlert className="h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        )}
        <span>{flags.length} signalement{flags.length > 1 ? "s" : ""} de vigilance</span>
      </div>
      <div className="flex flex-col gap-1.5 pt-0.5">
        {flags.map((flag) => (
          <div key={flag.code} className="flex items-start gap-2 text-xs">
            <span
              className={cn(
                "inline-block size-1.5 rounded-full mt-1.5 shrink-0",
                flag.severity === "critical" ? "bg-destructive" : "bg-status-review"
              )}
            />
            <div className="flex-1">
              <span className="font-semibold">{flag.label} :</span>{" "}
              <span className="opacity-90">{flag.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
