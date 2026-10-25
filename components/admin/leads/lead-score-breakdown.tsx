import { type ScoreFactor } from "@/lib/lead-score"
import { cn } from "@/lib/utils"

export function LeadScoreBreakdown({
  score,
  factors,
}: {
  score: number
  factors: ScoreFactor[]
}) {
  const isHigh = score >= 70
  const isLow = score < 40

  return (
    <div className="rounded-md border border-border bg-card p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Indice de Qualification
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "font-mono text-2xl font-semibold tabular-nums",
                isHigh && "text-primary",
                isLow && "text-destructive",
                !isHigh && !isLow && "text-foreground"
              )}
            >
              {score}
            </span>
            <span className="font-mono text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Barre de progression segmentée */}
        <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden border border-border">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isHigh && "bg-primary",
              isLow && "bg-destructive",
              !isHigh && !isLow && "bg-accent"
            )}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      </div>

      {factors.length > 0 && (
        <div className="border-t border-border/80 pt-2.5 flex flex-col gap-1.5">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Facteurs déterminants
          </span>
          <div className="flex flex-col gap-1">
            {factors.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-0.5"
              >
                <span className="text-muted-foreground truncate mr-2">
                  {factor.label}
                </span>
                <span
                  className={cn(
                    "font-mono tabular-nums font-medium shrink-0",
                    factor.delta > 0 ? "text-primary" : "text-destructive"
                  )}
                >
                  {factor.delta > 0 ? `+${factor.delta}` : factor.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
