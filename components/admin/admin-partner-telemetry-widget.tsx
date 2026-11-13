import Link from "next/link"
import { Activity, Flame, Eye, Clock, ArrowRight, MousePointerClick } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatDurationCompact,
  type PartnerTelemetryAnalytics,
} from "@/lib/partner-telemetry"

export function AdminPartnerTelemetryWidget({
  telemetry,
}: {
  telemetry: PartnerTelemetryAnalytics
}) {
  return (
    <Card className="border-border bg-card shadow-2xs overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <CardTitle className="text-sm sm:text-base font-bold text-foreground">
              Intelligence Comportementale Installateurs (30 j)
            </CardTitle>
            {telemetry.kpis.hotSignalsCount > 0 && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] tabular-nums border-accent/40 bg-accent/10 text-accent font-bold"
              >
                {telemetry.kpis.hotSignalsCount} signal{telemetry.kpis.hotSignalsCount > 1 ? "aux" : ""} chaud{telemetry.kpis.hotSignalsCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Qui consulte quels chantiers, durée d&apos;étude active et intentions de déblocage non finalisées.
          </p>
        </div>

        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold gap-1.5 border-border">
          <Link href="/admin/partners">
            <span>Explorer dans Réseau</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-secondary/30 p-3 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Fiches leads consultées</span>
            </span>
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">
              {telemetry.kpis.totalLeadViews}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {telemetry.kpis.uniqueLeadsViewed} dossiers distincts · {telemetry.kpis.activePartnersCount} installateurs
            </span>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Temps moyen d&apos;étude</span>
            </span>
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">
              {formatDurationCompact(telemetry.kpis.avgStudyDurationMs)}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {formatDurationCompact(telemetry.kpis.totalStudyDurationMs)} cumulés sur 30 j
            </span>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5 text-accent" />
              <span>Intentions d&apos;achat</span>
            </span>
            <span className="font-mono text-xl font-bold tabular-nums text-accent">
              {telemetry.kpis.unlockIntentsCount}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Clics sur Débloquer / Payer en €
            </span>
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <span>Signaux chauds actifs</span>
            </span>
            <span className="font-mono text-xl font-bold tabular-nums text-accent">
              {telemetry.kpis.hotSignalsCount}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Installateurs à relancer en priorité
            </span>
          </div>
        </div>

        {telemetry.hotSignals.length > 0 ? (
          <div className="rounded-xl border border-border bg-secondary/20 divide-y divide-border overflow-hidden">
            {telemetry.hotSignals.slice(0, 4).map((sig) => (
              <div
                key={sig.id}
                className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Flame className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="font-semibold text-foreground truncate">{sig.companyName}</span>
                  <span className="text-muted-foreground truncate hidden sm:inline">· {sig.reason}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                  <span className="text-[11px] font-bold text-foreground">
                    {formatDurationCompact(sig.totalDurationMs)}
                  </span>
                  <Link
                    href={`/admin/leads?leadId=${sig.leadId}`}
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    {sig.leadLabel} &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            La collecte comportementale est active : dès qu&apos;un installateur ouvre un chantier sur la marketplace, son temps d&apos;étude et ses intentions s&apos;affichent ici en temps réel.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

