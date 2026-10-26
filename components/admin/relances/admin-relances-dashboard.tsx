"use client"

import * as React from "react"
import { useState, useMemo, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  Mail,
  Send,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  X,
  Filter,
  Eye,
  Zap,
  MapPin,
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Coins,
  LayoutGrid,
  List,
  Loader2,
  Calendar,
  Sparkles,
  Info,
  Timer,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { RelancesKpiBar } from "./relances-kpi-bar"
import { EmailPreviewDrawer } from "./email-preview-drawer"
import type {
  UpcomingRelanceItem,
  SentRelanceItem,
  RelancesOverviewStats,
} from "@/lib/lead-relance-engine"

interface AdminRelancesDashboardProps {
  initialStats: RelancesOverviewStats
  initialUpcoming: UpcomingRelanceItem[]
  initialSent: SentRelanceItem[]
}

type TabType = "upcoming" | "sent" | "matrix"

export function AdminRelancesDashboard({
  initialStats,
  initialUpcoming,
  initialSent,
}: AdminRelancesDashboardProps) {
  const [stats, setStats] = useState<RelancesOverviewStats>(initialStats)
  const [upcoming, setUpcoming] = useState<UpcomingRelanceItem[]>(initialUpcoming)
  const [sent, setSent] = useState<SentRelanceItem[]>(initialSent)
  const [activeTab, setActiveTab] = useState<TabType>("upcoming")

  const [searchQuery, setSearchQuery] = useState("")
  const [filterWave, setFilterWave] = useState<string>("ALL")
  const [filterSegment, setFilterSegment] = useState<string>("ALL")
  const [displayMode, setDisplayMode] = useState<"cards" | "table">("cards")

  const [currentTime, setCurrentTime] = useState(Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [triggeringLeadId, setTriggeringLeadId] = useState<string | null>(null)
  const [runningCron, setRunningCron] = useState(false)

  // Preview Drawer State
  const [previewDrawer, setPreviewDrawer] = useState<{
    isOpen: boolean
    leadId: string | null
    partnerId?: string | null
    waveNumber?: number
    subject?: string
    recipientEmail?: string
    recipientCompany?: string
    isSentItem?: boolean
  }>({
    isOpen: false,
    leadId: null,
  })

  // Live timer update every 10 seconds for precise countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // Refresh data from API
  async function refreshData(silent = false) {
    if (!silent) setIsRefreshing(true)
    try {
      const res = await fetch("/api/admin/relances")
      if (res.ok) {
        const json = await res.json()
        if (json.stats) setStats(json.stats)
        if (json.upcoming) setUpcoming(json.upcoming)
        if (json.sent) setSent(json.sent)
      }
    } catch (err) {
      if (!silent) toast.error("Erreur lors de l'actualisation des relances.")
    } finally {
      if (!silent) setIsRefreshing(false)
    }
  }

  // Trigger manual wave immediately
  async function handleTriggerWave(leadId: string, waveNumber: number) {
    setTriggeringLeadId(leadId)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/relances", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-request": "1",
          },
          body: JSON.stringify({
            action: "dispatch_wave",
            leadId,
            waveNumber,
            force: true,
          }),
        })
        const json = await res.json()

        if (!res.ok || json.error) {
          toast.error(json.error || "Échec de l'envoi de la relance.")
          return
        }

        const sentCount = json.result?.sentCount ?? 0
        if (sentCount > 0) {
          toast.success(`Vague ${waveNumber} envoyée avec succès à ${sentCount} installateur(s) !`)
        } else {
          toast.info(json.result?.message || "Aucun nouvel installateur notifié pour cette vague.")
        }

        // Close preview if open
        setPreviewDrawer((prev) => ({ ...prev, isOpen: false }))
        await refreshData(true)
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'exécution de la relance.")
      } finally {
        setTriggeringLeadId(null)
      }
    })
  }

  // Run full pending Cron cycle
  async function handleRunCron() {
    setRunningCron(true)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/relances", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-request": "1",
          },
          body: JSON.stringify({ action: "run_cron" }),
        })
        const json = await res.json()

        if (!res.ok || json.error) {
          toast.error(json.error || "Échec de l'exécution du cycle cron.")
          return
        }

        const triggered = json.summary?.triggeredWaves?.length || 0
        if (triggered > 0) {
          toast.success(`Cycle terminé : ${triggered} vague(s) de relance déclenchée(s) !`)
        } else {
          toast.info("Cycle exécuté : aucune vague n'était en attente immédiate de déclenchement.")
        }

        await refreshData(true)
      } catch (err: any) {
        toast.error("Erreur de connexion au moteur de relance.")
      } finally {
        setRunningCron(false)
      }
    })
  }

  // Format countdown string
  function formatCountdown(effectiveSendAt: string, isReadyNow: boolean) {
    const targetMs = new Date(effectiveSendAt).getTime()
    const diff = targetMs - currentTime

    if (isReadyNow || diff <= 0) {
      return {
        label: "Prêt à l'envoi",
        subtext: "Prochain cycle cron ou clic immédiat",
        isReady: true,
      }
    }

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) {
      return {
        label: `Dans ${minutes} min`,
        subtext: new Date(effectiveSendAt).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" }),
        isReady: false,
      }
    }

    if (hours < 24) {
      const remainingMinutes = minutes % 60
      return {
        label: `Dans ${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ""}`,
        subtext: `Aujourd'hui à ${new Date(effectiveSendAt).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}`,
        isReady: false,
      }
    }

    const remainingHours = hours % 24
    return {
      label: `Dans ${days}j ${remainingHours > 0 ? `${remainingHours}h` : ""}`,
      subtext: new Date(effectiveSendAt).toLocaleDateString("fr-BE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      isReady: false,
    }
  }

  // Filtered Upcoming items
  const filteredUpcoming = useMemo(() => {
    return upcoming.filter((item) => {
      if (filterWave !== "ALL" && item.nextWave.toString() !== filterWave) return false
      if (filterSegment !== "ALL" && item.lead.segment !== filterSegment) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCity = item.lead.city?.toLowerCase().includes(q)
        const matchPostal = item.lead.postalCode?.toLowerCase().includes(q)
        const matchLeadId = item.leadId.toLowerCase().includes(q)
        const matchPartner = item.targetRecipients.some(
          (r) => r.companyName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
        )
        if (!matchCity && !matchPostal && !matchLeadId && !matchPartner) return false
      }
      return true
    })
  }, [upcoming, filterWave, filterSegment, searchQuery])

  // Filtered Sent items
  const filteredSent = useMemo(() => {
    return sent.filter((item) => {
      if (filterWave !== "ALL" && item.waveNumber.toString() !== filterWave) return false
      if (filterSegment !== "ALL" && item.lead?.segment !== filterSegment) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCompany = item.partner?.companyName.toLowerCase().includes(q)
        const matchEmail = item.emailTo.toLowerCase().includes(q)
        const matchSubject = item.emailSubject.toLowerCase().includes(q)
        const matchCity = item.lead?.city?.toLowerCase().includes(q)
        const matchPostal = item.lead?.postalCode?.toLowerCase().includes(q)
        if (!matchCompany && !matchEmail && !matchSubject && !matchCity && !matchPostal) return false
      }
      return true
    })
  }, [sent, filterWave, filterSegment, searchQuery])

  // Grouped by lead for Waterfall Matrix view
  const matrixLeads = useMemo(() => {
    const map = new Map<
      string,
      {
        lead: any
        upcomingWaves: UpcomingRelanceItem[]
        sentDispatches: SentRelanceItem[]
      }
    >()

    for (const u of upcoming) {
      const existing = map.get(u.leadId) || { lead: u.lead, upcomingWaves: [], sentDispatches: [] }
      existing.upcomingWaves.push(u)
      map.set(u.leadId, existing)
    }

    for (const s of sent) {
      const existing = map.get(s.leadId) || { lead: s.lead, upcomingWaves: [], sentDispatches: [] }
      existing.sentDispatches.push(s)
      map.set(s.leadId, existing)
    }

    return Array.from(map.values())
  }, [upcoming, sent])

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Header Opérationnel Bento Style */}
      <header className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary border border-border px-2.5 py-1 text-xs font-semibold text-foreground w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                <span>Supervision des Relances Mails &amp; Cascades</span>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono tabular-nums">
                Waterfall Séquentiel (H+0 / H+4h / H+24h)
              </Badge>
            </div>

            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Relances Automatiques des Leads
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Consultez en temps réel quels e-mails ont été expédiés, à quels installateurs, et suivez la file d'attente des prochaines alertes avec leur compte à rebours précis.
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={() => refreshData()}
              className="h-8 text-xs gap-1.5 border-border"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              <span>Actualiser</span>
            </Button>

            <Button
              size="sm"
              disabled={runningCron}
              onClick={handleRunCron}
              className="h-8 text-xs gap-1.5 shadow-2xs font-semibold"
            >
              {runningCron ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>Exécuter le cycle de relances</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Bento KPIs Bar */}
      <RelancesKpiBar
        stats={stats}
        onRunCron={handleRunCron}
        isRunningCron={runningCron}
      />

      {/* 3. Navigation par Onglets Segmentés (Marketplace Style) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1 border border-border w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === "upcoming"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="h-3.5 w-3.5 text-accent" />
              <span>Relances Programmées</span>
              <span className="rounded-md bg-secondary px-1.5 py-0.2 font-mono text-[10px] tabular-nums text-foreground border border-border">
                {upcoming.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sent")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === "sent"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              <span>Mails Envoyés</span>
              <span className="rounded-md bg-secondary px-1.5 py-0.2 font-mono text-[10px] tabular-nums text-foreground border border-border">
                {sent.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === "matrix"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="h-3.5 w-3.5 text-foreground" />
              <span>Matrice par Dossier</span>
              <span className="rounded-md bg-secondary px-1.5 py-0.2 font-mono text-[10px] tabular-nums text-foreground border border-border">
                {matrixLeads.length}
              </span>
            </button>
          </div>

          {/* View Mode Switcher */}
          {activeTab !== "matrix" && (
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDisplayMode("cards")}
                className={cn(
                  "h-8 w-8 rounded-lg border",
                  displayMode === "cards"
                    ? "bg-secondary text-foreground border-border shadow-2xs"
                    : "border-transparent text-muted-foreground"
                )}
                title="Affichage en cartes"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDisplayMode("table")}
                className={cn(
                  "h-8 w-8 rounded-lg border",
                  displayMode === "table"
                    ? "bg-secondary text-foreground border-border shadow-2xs"
                    : "border-transparent text-muted-foreground"
                )}
                title="Affichage en tableau compact"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 4. Filtres & Barre de Recherche (Marketplace Style) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par installateur, email, ville ou CP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs rounded-lg border-border bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Wave Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground uppercase">Vague :</span>
              <select
                value={filterWave}
                onChange={(e) => setFilterWave(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Toutes les vagues</option>
                <option value="1">Vague 1 (Alerte Immédiate)</option>
                <option value="2">Vague 2 (Relance Élargie H+4)</option>
                <option value="3">Vague 3 (Clôture H+24)</option>
              </select>
            </div>

            {/* Segment Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground uppercase">Segment :</span>
              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Tous les segments</option>
                <option value="B2B">B2B Tertiaire (Exclusif)</option>
                <option value="B2C">B2C Résidentiel (Max 3)</option>
              </select>
            </div>

            {(searchQuery || filterWave !== "ALL" || filterSegment !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setFilterWave("ALL")
                  setFilterSegment("ALL")
                }}
                className="h-9 text-xs text-muted-foreground hover:text-foreground px-2"
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </div>

        {/* 5. VUES DU CONTENU SELON L'ONGLET ACTIF */}

        {/* ---------------- ONGLET 1 : RELANCES PROGRAMMÉES ---------------- */}
        {activeTab === "upcoming" && (
          <div className="flex flex-col gap-4">
            {filteredUpcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Aucune relance programmée en attente
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Tous les leads disponibles ont terminé leurs cycles de vagues ou n'ont pas encore atteint leur prochain délai de cooldown (H+4h / H+24h).
                  </p>
                </div>
              </div>
            ) : displayMode === "cards" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredUpcoming.map((item) => {
                  const countdown = formatCountdown(item.effectiveSendAt, item.isReadyNow)
                  const isB2B = item.lead.segment === "B2B"
                  const isCurrentTriggering = triggeringLeadId === item.leadId

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-card p-5 shadow-2xs hover:border-primary/40 transition-colors flex flex-col justify-between gap-4"
                    >
                      {/* Top Bar : Urgency / Countdown + Wave Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "font-mono text-[10px] font-semibold px-2 py-0.5 tabular-nums border",
                              item.nextWave === 1
                                ? "bg-primary text-primary-foreground border-primary"
                                : item.nextWave === 2
                                ? "bg-accent/15 text-accent border-accent/30"
                                : "bg-secondary text-foreground border-border"
                            )}
                          >
                            Vague {item.nextWave} ({item.nextWave === 1 ? "Alerte Immédiate" : item.nextWave === 2 ? "Relance H+4" : "Dernière Chance"})
                          </Badge>

                          <Badge variant="outline" className="font-mono text-[10px]">
                            {isB2B ? "B2B Exclusif (1 place)" : "B2C Partagé (3 max)"}
                          </Badge>
                        </div>

                        {/* Countdown Pill */}
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold border",
                            countdown.isReady
                              ? "bg-chart-3/15 text-chart-3 border-chart-3/30 animate-pulse"
                              : "bg-secondary text-foreground border-border"
                          )}
                          title={`Prévu pour : ${item.effectiveSendAt}`}
                        >
                          <Timer className="h-3.5 w-3.5 shrink-0" />
                          <span className="tabular-nums">{countdown.label}</span>
                        </div>
                      </div>

                      {/* Lead Details Banner */}
                      <div className="flex items-start justify-between gap-3 bg-secondary/30 rounded-lg p-3 border border-border">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                            <span className="font-semibold text-xs text-foreground truncate">
                              {item.lead.postalCode ? `${item.lead.postalCode} ` : ""}
                              {item.lead.city || item.lead.province || "Wallonie"}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              #{item.leadId.slice(0, 8)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                            {item.lead.estimatedPowerKwc > 0 && (
                              <span className="flex items-center gap-1 text-foreground font-medium">
                                <Zap className="h-3 w-3 text-accent" />
                                {item.lead.estimatedPowerKwc} kWc
                              </span>
                            )}
                            {item.lead.surfaceArea && (
                              <span>{item.lead.surfaceArea} m² ({item.lead.surfaceType || "Toiture"})</span>
                            )}
                            {item.lead.marginEur > 0 && (
                              <span className="text-chart-3 font-semibold">
                                ~{item.lead.marginEur.toLocaleString("fr-BE")} € HT marge
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Slots remaining meter */}
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {item.takenSlots} / {item.maxSlots} vendu{item.takenSlots > 1 ? "s" : ""}
                          </span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: item.maxSlots }).map((_, idx) => (
                              <span
                                key={idx}
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  idx < item.takenSlots
                                    ? "bg-primary"
                                    : "bg-secondary border border-border"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Target Recipients List */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>
                            Installateurs ciblés par matching ({item.targetCount}{item.targetRecipients.some((r) => r.isTest) ? " + TEST" : ""}) :
                          </span>
                          <span>Score &amp; Solde</span>
                        </div>

                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {item.targetRecipients.map((rec) => (
                            <div
                              key={rec.partnerId}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/20 border border-border/80 text-xs hover:bg-secondary/40 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold">
                                  {rec.companyName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-medium text-foreground truncate text-xs">
                                      {rec.companyName}
                                    </span>
                                    {rec.isTest && (
                                      <span className="shrink-0 text-[9px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded border border-amber-500/20">
                                        DEV TEST
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[10px] text-muted-foreground truncate">
                                    {rec.email}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0 h-4.5 font-mono",
                                    rec.score >= 70
                                      ? "border-chart-3/40 text-chart-3 bg-chart-3/5"
                                      : "border-border text-muted-foreground"
                                  )}
                                >
                                  Score: {rec.score}
                                </Badge>
                                <span
                                  className={cn(
                                    "tabular-nums text-[10px] px-1.5 py-0.5 rounded",
                                    rec.hasEnoughCredits
                                      ? "bg-secondary text-foreground"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {rec.credits} cr.
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Actions Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPreviewDrawer({
                              isOpen: true,
                              leadId: item.leadId,
                              partnerId: item.targetRecipients[0]?.partnerId,
                              waveNumber: item.nextWave,
                              subject: item.subjectPreview,
                              recipientEmail: item.targetRecipients[0]?.email,
                              recipientCompany: item.targetRecipients[0]?.companyName,
                              isSentItem: false,
                            })
                          }
                          className="h-8 text-xs gap-1.5 border-border"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Aperçu de l'e-mail</span>
                        </Button>

                        <Button
                          size="sm"
                          disabled={isCurrentTriggering || isPending}
                          onClick={() => handleTriggerWave(item.leadId, item.nextWave)}
                          className="h-8 text-xs gap-1.5 shadow-2xs font-semibold"
                        >
                          {isCurrentTriggering ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          <span>Envoyer maintenant</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Vue Tableau Compact pour Relances Programmées */
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border font-mono text-[11px] text-muted-foreground uppercase">
                      <tr>
                        <th className="p-3">Échéance &amp; Décompte</th>
                        <th className="p-3">Vague</th>
                        <th className="p-3">Dossier / Ville</th>
                        <th className="p-3">Installateurs Cibles</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUpcoming.map((item) => {
                        const countdown = formatCountdown(item.effectiveSendAt, item.isReadyNow)
                        const isCurrentTriggering = triggeringLeadId === item.leadId
                        return (
                          <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                            <td className="p-3 font-mono">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 font-semibold tabular-nums px-2 py-0.5 rounded text-[11px]",
                                  countdown.isReady
                                    ? "bg-chart-3/15 text-chart-3 animate-pulse"
                                    : "bg-secondary text-foreground"
                                )}
                              >
                                {countdown.label}
                              </span>
                              <div className="text-[10px] text-muted-foreground pt-0.5">
                                {countdown.subtext}
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <Badge variant="outline" className="text-[10px]">
                                Vague {item.nextWave}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-foreground">
                                {item.lead.postalCode ? `${item.lead.postalCode} ` : ""}
                                {item.lead.city || item.lead.province || "Wallonie"}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                #{item.leadId.slice(0, 8)} · {item.lead.segment} · {item.takenSlots}/{item.maxSlots} slots
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {item.targetRecipients[0]?.companyName || "Aucun"}
                                  {item.targetRecipients.length > 1 && ` +${item.targetRecipients.length - 1}`}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {item.targetCount} artisan{item.targetCount > 1 ? "s" : ""} éligible{item.targetCount > 1 ? "s" : ""}
                                  {item.targetRecipients.some((r) => r.isTest) && (
                                    <span className="ml-1 text-[10px] font-mono text-amber-600 dark:text-amber-400">(+ DEV TEST)</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setPreviewDrawer({
                                      isOpen: true,
                                      leadId: item.leadId,
                                      partnerId: item.targetRecipients[0]?.partnerId,
                                      waveNumber: item.nextWave,
                                      subject: item.subjectPreview,
                                      recipientEmail: item.targetRecipients[0]?.email,
                                      recipientCompany: item.targetRecipients[0]?.companyName,
                                      isSentItem: false,
                                    })
                                  }
                                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Aperçu
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isCurrentTriggering || isPending}
                                  onClick={() => handleTriggerWave(item.leadId, item.nextWave)}
                                  className="h-7 text-xs px-2.5 font-semibold"
                                >
                                  {isCurrentTriggering ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3 mr-1" />
                                  )}
                                  Envoyer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- ONGLET 2 : HISTORIQUE DES MAILS ENVOYÉS ---------------- */}
        {activeTab === "sent" && (
          <div className="flex flex-col gap-4">
            {filteredSent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Aucun e-mail de relance envoyé pour le moment
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Les notifications envoyées apparaîtront ici dès que la première vague sera lancée manuellement ou par le cron automatique.
                  </p>
                </div>
              </div>
            ) : displayMode === "cards" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSent.map((item) => {
                  const sentDate = new Date(item.sentAt)
                  const formattedDate = sentDate.toLocaleDateString("fr-BE", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-card p-5 shadow-2xs hover:border-primary/40 transition-colors flex flex-col justify-between gap-3"
                    >
                      {/* Top Bar : Sent Date + Wave Badge + Outcome */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                            Vague {item.waveNumber}
                          </Badge>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {formattedDate}
                          </span>
                        </div>

                        {/* Outcome Tag */}
                        {item.outcome === "purchased_by_recipient" ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-chart-3 bg-chart-3/10 px-2 py-0.5 rounded border border-chart-3/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Acheté par ce partenaire
                          </span>
                        ) : item.outcome === "sold_out" ? (
                          <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            Dossier complet (Sold Out)
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                            Dossier toujours disponible
                          </span>
                        )}
                      </div>

                      {/* Recipient Details */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">
                            {item.partner?.companyName.slice(0, 2).toUpperCase() || "IN"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {item.partner?.companyName || "Installateur"}
                              </span>
                              {item.isTest && (
                                <span className="shrink-0 text-[9px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded border border-amber-500/20">
                                  DEV TEST
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs text-muted-foreground truncate">
                              {item.emailTo}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 font-mono text-[11px]">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4.5 font-mono",
                              item.matchingScore >= 70
                                ? "border-chart-3/40 text-chart-3 bg-chart-3/5"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            Score: {item.matchingScore}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground pt-0.5">
                            Solde: {item.creditsAtSend} cr.
                          </span>
                        </div>
                      </div>

                      {/* Email Subject preview */}
                      <div className="bg-secondary/30 rounded-lg p-2.5 border border-border text-xs flex flex-col gap-1">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">
                          Objet envoyé :
                        </span>
                        <p className="font-medium text-foreground truncate">
                          {item.emailSubject}
                        </p>
                      </div>

                      {/* Bottom Lead reference and preview action */}
                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3 text-accent" />
                          <span>
                            {item.lead?.postalCode ? `${item.lead.postalCode} ` : ""}
                            {item.lead?.city || item.lead?.province || "Dossier"} (#{item.leadId.slice(0, 8)})
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPreviewDrawer({
                              isOpen: true,
                              leadId: item.leadId,
                              partnerId: item.partnerId,
                              waveNumber: item.waveNumber,
                              subject: item.emailSubject,
                              recipientEmail: item.emailTo,
                              recipientCompany: item.partner?.companyName,
                              isSentItem: true,
                            })
                          }
                          className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Revoir l'e-mail
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Vue Tableau Compact pour Mails Envoyés */
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border font-mono text-[11px] text-muted-foreground uppercase">
                      <tr>
                        <th className="p-3">Horodatage</th>
                        <th className="p-3">Vague</th>
                        <th className="p-3">Destinataire</th>
                        <th className="p-3">Objet E-mail</th>
                        <th className="p-3">Dossier Lié</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSent.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-muted-foreground">
                            {new Date(item.sentAt).toLocaleDateString("fr-BE", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-3 font-mono">
                            <Badge variant="outline" className="text-[10px]">
                              V{item.waveNumber}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-foreground">
                                {item.partner?.companyName || "Installateur"}
                              </span>
                              {item.isTest && (
                                <span className="shrink-0 text-[9px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded border border-amber-500/20">
                                  DEV TEST
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {item.emailTo}
                            </div>
                          </td>
                          <td className="p-3 max-w-[280px]">
                            <p className="truncate font-medium text-foreground">
                              {item.emailSubject}
                            </p>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-muted-foreground">
                            {item.lead?.city || "Dossier"} (#{item.leadId.slice(0, 8)})
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPreviewDrawer({
                                  isOpen: true,
                                  leadId: item.leadId,
                                  partnerId: item.partnerId,
                                  waveNumber: item.waveNumber,
                                  subject: item.emailSubject,
                                  recipientEmail: item.emailTo,
                                  recipientCompany: item.partner?.companyName,
                                  isSentItem: true,
                                })
                              }
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Revoir
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- ONGLET 3 : MATRICE DES CASCADES PAR DOSSIER ---------------- */}
        {activeTab === "matrix" && (
          <div className="flex flex-col gap-4">
            {matrixLeads.map(({ lead, upcomingWaves, sentDispatches }) => {
              if (!lead) return null
              const isB2B = lead.segment === "B2B"
              const maxSlots = isB2B ? 1 : 3

              // Calculate unique partner recipients for this lead
              const sentPartnersCount = new Set(sentDispatches.map((s) => s.partnerId)).size
              const nextUpcoming = upcomingWaves[0]

              return (
                <div
                  key={lead.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col gap-4"
                >
                  {/* Lead Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                        <Flame className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm sm:text-base text-foreground">
                            {lead.postalCode ? `${lead.postalCode} ` : ""}
                            {lead.city || lead.province || "Projet Photovoltaïque"}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {lead.segment}
                          </Badge>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{lead.id.slice(0, 8)}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          Publié le {new Date(lead.createdAt || Date.now()).toLocaleDateString("fr-BE")}
                        </span>
                      </div>
                    </div>

                    {/* Quick Trigger button if upcoming */}
                    {nextUpcoming && (
                      <Button
                        size="sm"
                        disabled={triggeringLeadId === lead.id || isPending}
                        onClick={() => handleTriggerWave(lead.id, nextUpcoming.nextWave)}
                        className="h-8 text-xs gap-1.5 font-semibold"
                      >
                        {triggeringLeadId === lead.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        <span>Lancer Vague {nextUpcoming.nextWave} maintenant</span>
                      </Button>
                    )}
                  </div>

                  {/* 3 Waves Progression Pipeline */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map((waveNum) => {
                      const waveDispatches = sentDispatches.filter((s) => s.waveNumber === waveNum)
                      const isUpcomingWave = nextUpcoming?.nextWave === waveNum
                      const isPast = waveDispatches.length > 0
                      const isFuture = !isPast && !isUpcomingWave

                      return (
                        <div
                          key={waveNum}
                          className={cn(
                            "rounded-lg border p-3.5 flex flex-col justify-between gap-2.5 text-xs transition-colors",
                            isPast
                              ? "bg-primary/[0.04] border-primary/40 text-foreground"
                              : isUpcomingWave
                              ? "bg-accent/10 border-accent/40 text-foreground"
                              : "bg-secondary/30 border-border text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[11px] uppercase tracking-wider">
                              Vague {waveNum}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono text-[9px] px-1.5 py-0 h-4",
                                isPast
                                  ? "border-primary text-primary"
                                  : isUpcomingWave
                                  ? "border-accent text-accent animate-pulse"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {isPast ? "Envoyée" : isUpcomingWave ? "Programmée" : "En attente"}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-1">
                            {isPast ? (
                              <div className="font-mono text-[11px] text-foreground">
                                ✓ {waveDispatches.length} artisan{waveDispatches.length > 1 ? "s" : ""} notifié{waveDispatches.length > 1 ? "s" : ""}
                              </div>
                            ) : isUpcomingWave ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-[11px] text-accent font-semibold">
                                  {formatCountdown(nextUpcoming.effectiveSendAt, nextUpcoming.isReadyNow).label}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {nextUpcoming.targetRecipients.length} destinataire{nextUpcoming.targetRecipients.length > 1 ? "s" : ""} éligible{nextUpcoming.targetRecipients.length > 1 ? "s" : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                Déclenchement conditionnel
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 6. Slide-Over Email Preview Drawer */}
      <EmailPreviewDrawer
        isOpen={previewDrawer.isOpen}
        onClose={() => setPreviewDrawer((prev) => ({ ...prev, isOpen: false }))}
        leadId={previewDrawer.leadId}
        partnerId={previewDrawer.partnerId}
        waveNumber={previewDrawer.waveNumber}
        defaultSubject={previewDrawer.subject}
        recipientEmail={previewDrawer.recipientEmail}
        recipientCompany={previewDrawer.recipientCompany}
        onTriggerNow={handleTriggerWave}
        isTriggering={triggeringLeadId === previewDrawer.leadId}
        isSentItem={previewDrawer.isSentItem}
      />
    </div>
  )
}
