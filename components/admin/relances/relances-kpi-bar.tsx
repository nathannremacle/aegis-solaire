"use client"

import * as React from "react"
import {
  Mail,
  MailCheck,
  Clock,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Timer,
  Zap,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { RelancesOverviewStats } from "@/lib/lead-relance-engine"

interface RelancesKpiBarProps {
  stats: RelancesOverviewStats
  onRunCron?: () => void
  isRunningCron?: boolean
}

export function RelancesKpiBar({ stats, onRunCron, isRunningCron }: RelancesKpiBarProps) {
  const isBusinessHours = stats.isBusinessHoursNow

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Mails Envoyés */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Mails Envoyés
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MailCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.totalSentCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              notification{stats.totalSentCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-chart-3 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-chart-3" />
              {stats.sentTodayCount}
            </span>
            <span>aujourd'hui</span>
            <span className="text-border">·</span>
            <span className="text-foreground">V1: {stats.sentWave1Count}</span>
            <span className="text-border">·</span>
            <span className="text-foreground">V2: {stats.sentWave2Count}</span>
            <span className="text-border">·</span>
            <span className="text-foreground">V3: {stats.sentWave3Count}</span>
          </div>
        </div>
      </div>

      {/* 2. Relances Programmées & File d'attente */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            File d'Attente
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.upcomingWavesCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              vague{stats.upcomingWavesCount > 1 ? "s" : ""} programmée{stats.upcomingWavesCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-foreground font-medium tabular-nums">
              <Zap className="h-3 w-3 text-accent" />
              {stats.upcomingRecipientsCount} destinataire{stats.upcomingRecipientsCount > 1 ? "s" : ""}
            </span>
            {stats.readyNowCount > 0 ? (
              <span className="text-accent font-semibold">
                ● {stats.readyNowCount} prête{stats.readyNowCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">En cooldown</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Cascades Actives (Dossiers en cours) */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Cascades Actives
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground">
            <Flame className="h-4 w-4 text-accent" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {stats.activeCascadesCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              lead{stats.activeCascadesCount > 1 ? "s" : ""} en cours
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span>Cycle Waterfall :</span>
            <span className="text-foreground font-medium">H+0 → H+4h → H+24h</span>
          </div>
        </div>
      </div>

      {/* 4. Statut Moteur & Heures Ouvrées */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Plage Ouvrée Wallonie
          </span>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              isBusinessHours
                ? "bg-chart-3/15 text-chart-3"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full shrink-0",
                isBusinessHours ? "bg-chart-3 animate-pulse" : "bg-muted-foreground/60"
              )}
            />
            <span className="font-heading text-sm sm:text-base font-bold text-foreground">
              {isBusinessHours ? "Envois Actifs" : "Mode Veille Nocturne"}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>08h00 – 19h30 (Lun–Ven)</span>
            <span className="tabular-nums">Conv: {stats.conversionRatePercent}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
