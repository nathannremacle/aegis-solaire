"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Euro,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
  Target,
} from "lucide-react"

type Stats = {
  totalLeads: number
  qualifiedB2B: number
  qualifiedB2C: number
  totalQualified: number
  rejected: number
  qualificationRate: number
  commissionB2B: number
  commissionB2C: number
  totalCommission: number
  trackingCode: string
  commissionRateB2B: number
  commissionRateB2C: number
}

type LeadRow = {
  id: string
  segment: string
  province: string | null
  status: string
  commission: number
  created_at: string
}

type LeadsResponse = {
  leads: LeadRow[]
  total: number
  page: number
  limit: number
}

type Period = "week" | "month" | "all"

const PERIOD_LABELS: Record<Period, string> = {
  week: "Cette semaine",
  month: "Ce mois",
  all: "Tout",
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-blue-400/20 text-blue-300" },
  contacted: { label: "Contacté", color: "bg-sky-400/20 text-sky-300" },
  qualified: { label: "Qualifié", color: "bg-emerald-400/20 text-emerald-300" },
  converted: { label: "Converti", color: "bg-emerald-400/20 text-emerald-300" },
  HOT_LEAD: { label: "Hot Lead", color: "bg-amber-400/20 text-amber-300" },
  lost: { label: "Rejeté", color: "bg-red-400/20 text-red-300" },
  NEEDS_HUMAN_REVIEW: { label: "En review", color: "bg-purple-400/20 text-purple-300" },
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatMoney(n: number) {
  return n.toLocaleString("fr-BE") + " €"
}

export default function MediaPartnerDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [leads, setLeads] = useState<LeadsResponse | null>(null)
  const [period, setPeriod] = useState<Period>("month")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchData = useCallback(async (p: Period, pg: number) => {
    setLoading(true)
    try {
      const [statsRes, leadsRes] = await Promise.all([
        fetch(`/api/media-partners/stats?period=${p}`),
        fetch(`/api/media-partners/leads?period=${p}&page=${pg}&limit=15`),
      ])

      if (statsRes.status === 401 || leadsRes.status === 401) {
        router.push("/media-partners/login")
        return
      }

      const [statsData, leadsData] = await Promise.all([
        statsRes.json(),
        leadsRes.json(),
      ])

      setStats(statsData)
      setLeads(leadsData)
    } catch {
      // Network error
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData(period, page)
  }, [period, page, fetchData])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    setPage(1)
  }

  const handleCopy = () => {
    if (!stats) return
    const baseUrl = window.location.origin
    navigator.clipboard.writeText(`${baseUrl}?ref=${stats.trackingCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/media-partners/login")
    router.refresh()
  }

  const totalPages = leads ? Math.ceil(leads.total / leads.limit) : 1

  return (
    <div className="min-h-screen bg-[#000a19]">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-accent/[0.04] blur-[120px]" />
        <div className="absolute -right-32 bottom-20 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
              <Euro className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Media Partners</p>
              <p className="text-xs text-neutral-500">Aegis Solaire</p>
            </div>
          </div>

          {stats && (
            <div className="hidden items-center gap-3 sm:flex">
              <GlassCard className="flex items-center gap-2 px-3 py-2">
                <code className="text-xs font-bold text-accent">{stats.trackingCode}</code>
                <button
                  onClick={handleCopy}
                  className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
                  title="Copier le lien de tracking"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </GlassCard>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Period selector */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Suivi de vos leads et commissions en temps réel.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  period === p
                    ? "bg-accent/15 text-accent"
                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <GlassCard className="group p-6 transition-all duration-300 hover:border-accent/20 hover:bg-white/[0.06]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-neutral-500">Total</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalLeads}</p>
                <p className="mt-1 text-sm text-neutral-500">Leads envoyés</p>
              </GlassCard>

              <GlassCard className="group p-6 transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.06]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-neutral-500">Qualifiés</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalQualified}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {stats.qualifiedB2B} B2B · {stats.qualifiedB2C} B2C
                </p>
              </GlassCard>

              <GlassCard className="group p-6 transition-all duration-300 hover:border-accent/20 hover:bg-white/[0.06]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-neutral-500">Taux</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.qualificationRate}%</p>
                <p className="mt-1 text-sm text-neutral-500">Taux de qualification</p>
              </GlassCard>

              <GlassCard className="group relative overflow-hidden p-6 transition-all duration-300 hover:border-accent/25 hover:shadow-[0_0_40px_rgba(255,184,0,0.06)]">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] to-transparent" />
                <div className="relative z-10">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
                      <Euro className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-xs font-medium text-accent/70">Commissions</span>
                  </div>
                  <p className="text-3xl font-extrabold text-accent">
                    {formatMoney(stats.totalCommission)}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {formatMoney(stats.commissionB2B)} B2B · {formatMoney(stats.commissionB2C)} B2C
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* Tracking code mobile */}
            <div className="mb-6 sm:hidden">
              <GlassCard className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Tracking :</span>
                  <code className="text-sm font-bold text-accent">{stats.trackingCode}</code>
                </div>
                <button
                  onClick={handleCopy}
                  className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </GlassCard>
            </div>

            {/* Commission rates */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <GlassCard className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Commission B2B</p>
                  <p className="text-lg font-bold text-accent">
                    {stats.commissionRateB2B} € <span className="text-sm font-normal text-neutral-500">/ lead qualifié</span>
                  </p>
                </div>
              </GlassCard>
              <GlassCard className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/10">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Commission B2C</p>
                  <p className="text-lg font-bold text-blue-300">
                    {stats.commissionRateB2C} € <span className="text-sm font-normal text-neutral-500">/ lead qualifié</span>
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* Leads table */}
            <GlassCard className="overflow-hidden">
              <div className="border-b border-white/5 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-white">Leads attribués</h2>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {leads?.total ?? 0} lead{(leads?.total ?? 0) > 1 ? "s" : ""} · Page {page}/{totalPages}
                </p>
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Segment</th>
                      <th className="px-6 py-3 font-medium">Province</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 text-right font-medium">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leads?.leads.map((lead) => {
                      const st = STATUS_MAP[lead.status] ?? {
                        label: lead.status,
                        color: "bg-neutral-400/20 text-neutral-300",
                      }
                      return (
                        <tr
                          key={lead.id}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-neutral-300">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className={`border-0 ${
                                lead.segment === "B2B"
                                  ? "bg-accent/15 text-accent"
                                  : "bg-blue-400/15 text-blue-300"
                              }`}
                            >
                              {lead.segment}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 capitalize text-neutral-300">
                            {lead.province ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right font-bold">
                            {lead.commission > 0 ? (
                              <span className="text-accent">
                                +{formatMoney(lead.commission)}
                              </span>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {(!leads || leads.leads.length === 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-neutral-500"
                        >
                          Aucun lead pour cette période.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 p-4 md:hidden">
                {leads?.leads.map((lead) => {
                  const st = STATUS_MAP[lead.status] ?? {
                    label: lead.status,
                    color: "bg-neutral-400/20 text-neutral-300",
                  }
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`border-0 text-[10px] ${
                              lead.segment === "B2B"
                                ? "bg-accent/15 text-accent"
                                : "bg-blue-400/15 text-blue-300"
                            }`}
                          >
                            {lead.segment}
                          </Badge>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.color}`}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          {formatDate(lead.created_at)} · {lead.province ?? "—"}
                        </p>
                      </div>
                      {lead.commission > 0 ? (
                        <span className="text-sm font-bold text-accent">
                          +{lead.commission} €
                        </span>
                      ) : (
                        <span className="text-sm text-neutral-600">—</span>
                      )}
                    </div>
                  )
                })}
                {(!leads || leads.leads.length === 0) && (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    Aucun lead pour cette période.
                  </p>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 px-5 py-3 sm:px-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="gap-1 text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Préc.
                  </Button>
                  <span className="text-xs text-neutral-500">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="gap-1 text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    Suiv.
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </GlassCard>
          </>
        ) : null}
      </main>
    </div>
  )
}
