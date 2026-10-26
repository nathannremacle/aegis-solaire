import Link from "next/link"
import {
  SendHorizonal,
  Clock,
  ArrowRight,
  Zap,
  MailCheck,
  Flame,
  Timer,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getRelancesOverviewStats,
  getUpcomingRelancesSchedule,
} from "@/lib/lead-relance-engine"

export async function AdminRelancesCockpitWidget() {
  let stats = null
  let nextUpcoming = null

  try {
    const [statsData, upcomingData] = await Promise.all([
      getRelancesOverviewStats(),
      getUpcomingRelancesSchedule(),
    ])
    stats = statsData
    nextUpcoming = upcomingData.length > 0 ? upcomingData[0] : null
  } catch (err) {
    console.error("[AdminRelancesCockpitWidget] error loading stats:", err)
    return null
  }

  if (!stats) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SendHorizonal className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading font-bold text-sm sm:text-base text-foreground">
              Supervision des Relances Mails &amp; Cascades
            </span>
            <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
              {stats.activeCascadesCount} lead{stats.activeCascadesCount > 1 ? "s" : ""} en cours
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            {nextUpcoming ? (
              <span>
                Prochaine relance :{" "}
                <strong className="text-foreground">
                  Vague {nextUpcoming.nextWave} ({nextUpcoming.lead.city || "Wallonie"})
                </strong>{" "}
                pour {nextUpcoming.targetRecipients[0]?.companyName || "installateurs éligibles"} ·{" "}
                <span className="font-mono text-accent font-semibold">
                  {nextUpcoming.isReadyNow ? "Prête maintenant" : `Programmé (${nextUpcoming.effectiveSendAt.slice(11, 16)})`}
                </span>
              </span>
            ) : (
              <span>Tous les leads disponibles ont été notifiés. Moteur en veille active.</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="tabular-nums font-semibold text-foreground">
            {stats.totalSentCount}
          </span>
          <span>envoyé{stats.totalSentCount > 1 ? "s" : ""}</span>
          <span className="text-border">·</span>
          <span className="tabular-nums font-semibold text-accent">
            {stats.upcomingWavesCount}
          </span>
          <span>en attente</span>
        </div>

        <Button size="sm" asChild className="h-8 text-xs gap-1.5 shadow-2xs font-semibold">
          <Link href="/admin/relances">
            <span>Cockpit Relances</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
