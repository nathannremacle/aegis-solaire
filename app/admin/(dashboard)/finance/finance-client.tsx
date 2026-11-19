"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { triggerAdminBadgesRefresh } from "@/components/admin/admin-badges-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpRight,
  Calculator,
  ChevronDown,
  FileText,
  Landmark,
  Receipt,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { STUDENT_TAX_THRESHOLDS_2026 } from "@/lib/accounting/belgian-tax-rules"
import type { UnifiedAccountingBundle } from "@/lib/accounting/invoice-service"
import { ExpensesInboxTab } from "./expenses-inbox-tab"
import { SalesPeppolTab } from "./sales-peppol-tab"
import { DeclareVatTab } from "./declare-vat-tab"

export type CreditOrder = {
  id: string
  partner_id: string
  pack_id?: string
  pack_name: string
  credits: number
  price_htva: number
  vat_amount?: number
  price_ttc: number
  transfer_reference: string
  status: "pending" | "paid" | "cancelled"
  created_at: string
  validated_at: string | null
  notes?: string | null
  payment_provider?: "bank_transfer" | "mollie" | string
  payment_id?: string | null
  checkout_url?: string | null
  partners?: {
    id: string
    company_name: string
    email: string
    phone: string | null
    credits: number
  } | null
}

export type FinanceKpis = {
  paid_htva_month: number
  paid_ttc_month: number
  pending_orders_count: number
  pending_htva: number
  pending_ttc: number
  paid_htva_total: number
  total_partner_credits_balance: number
}

interface FinanceClientProps {
  initialOrders: CreditOrder[]
  kpis: FinanceKpis
  adminEmail: string
  initialAccounting: UnifiedAccountingBundle
}

type FinanceTabId = "expenses" | "sales" | "declare"

function formatEur(val: number): string {
  return val.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function FinanceClient({
  initialOrders,
  kpis,
  initialAccounting,
}: FinanceClientProps) {
  const [orders, setOrders] = useState<CreditOrder[]>(initialOrders)
  const [accounting, setAccounting] = useState<UnifiedAccountingBundle>(initialAccounting)
  const [selectedYear, setSelectedYear] = useState<number>(initialAccounting.year)
  const [selectedQuarter, setSelectedQuarter] = useState<0 | 1 | 2 | 3 | 4>(
    initialAccounting.quarter
  )
  const [activeTab, setActiveTab] = useState<FinanceTabId>("expenses")
  const [loading, setLoading] = useState(false)
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false)

  useEffect(() => {
    triggerAdminBadgesRefresh()
  }, [])

  const reloadAccounting = async (year = selectedYear, quarter = selectedQuarter) => {
    setLoading(true)
    try {
      const [accRes, ordRes] = await Promise.all([
        fetch(`/api/admin/accounting?year=${year}&quarter=${quarter}`),
        fetch("/api/admin/credit-orders", { headers: { "x-admin-request": "true" } }),
      ])
      if (accRes.ok) {
        const accJson = await accRes.json()
        setAccounting(accJson)
      }
      if (ordRes.ok) {
        const ordJson = await ordRes.json()
        setOrders(Array.isArray(ordJson) ? ordJson : [])
      }
    } catch {
      toast.error("Impossible de rafraîchir les données comptables.")
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = async (nextYear: number, nextQuarter: 0 | 1 | 2 | 3 | 4) => {
    setSelectedYear(nextYear)
    setSelectedQuarter(nextQuarter)
    await reloadAccounting(nextYear, nextQuarter)
  }

  const handleToggleChecklistTask = async (taskId: string, nextCompleted: boolean) => {
    const periodKey = `${selectedYear}-Q${selectedQuarter}`
    const res = await fetch("/api/admin/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_checklist",
        period_key: periodKey,
        task_id: taskId,
        completed: nextCompleted,
      }),
    })
    if (!res.ok) {
      toast.error("Erreur lors de la sauvegarde de l'étape.")
      return
    }
    setAccounting((prev) => {
      const nextIds = nextCompleted
        ? Array.from(new Set([...prev.checklistCompletedIds, taskId]))
        : prev.checklistCompletedIds.filter((id) => id !== taskId)
      return { ...prev, checklistCompletedIds: nextIds }
    })
  }

  const iv = accounting.intervat
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length
  const pendingDraftsCount = accounting.pendingDrafts.length
  const currentYear = new Date().getFullYear()
  const availableYears = [currentYear - 1, currentYear, currentYear + 1]

  const tabs: Array<{
    id: FinanceTabId
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
    highlight?: boolean
  }> = [
    {
      id: "expenses",
      label: "Factures d'achats",
      icon: Receipt,
      badge:
        pendingDraftsCount > 0
          ? `${pendingDraftsCount} à valider`
          : `${iv.expensesCount}`,
      highlight: pendingDraftsCount > 0,
    },
    {
      id: "sales",
      label: "Ventes & Peppol",
      icon: FileText,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} vir.` : `${iv.invoicesCount}`,
      highlight: pendingOrdersCount > 0,
    },
    {
      id: "declare",
      label: "Déclarer (TVA & Calendrier)",
      icon: Calculator,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* 1. En-tête épuré + 3 KPI essentiels + barre Étudiant repliable */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--aegis-divider)] pb-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--aegis-ink)]">
                Finances, Factures &amp; TVA
              </h1>
              <Badge
                variant="outline"
                className="font-mono tabular-nums text-xs bg-[var(--aegis-summary)] text-[var(--aegis-ink)] border-[var(--aegis-border)]"
              >
                INIT42 · BE 1039.899.980
              </Badge>
              <Badge
                variant="outline"
                className="font-mono tabular-nums text-xs bg-muted text-foreground border-border"
              >
                Échéance : {iv.deadlineLabel}
              </Badge>
            </div>
            <p className="text-xs text-[var(--aegis-muted)]">
              Glisse tes PDF d&apos;achats, vérifie le calcul TVA/IPP, exporte tes factures Peppol en 1 lot .zip et recopie tes grilles Intervat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Année fiscale"
              value={selectedYear}
              onChange={(e) => handlePeriodChange(Number(e.target.value), selectedQuarter)}
              className="h-8 rounded-lg border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] px-2.5 text-xs font-mono tabular-nums font-semibold text-[var(--aegis-ink)]"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <div className="flex items-center rounded-lg border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] p-0.5 text-xs">
              {([1, 2, 3, 4, 0] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handlePeriodChange(selectedYear, q)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-mono tabular-nums transition-colors cursor-pointer",
                    selectedQuarter === q
                      ? "bg-card text-[var(--aegis-ink)] font-bold shadow-2xs"
                      : "text-[var(--aegis-muted)] hover:text-foreground"
                  )}
                >
                  {q === 0 ? "Année" : `T${q}`}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => reloadAccounting()}
              disabled={loading}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span>Actualiser</span>
            </Button>
          </div>
        </div>

        {/* 3 KPI clairs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[var(--aegis-muted)]">
              <span className="text-xs font-medium">Chiffre d&apos;affaires HTVA · {iv.periodLabel}</span>
              <ArrowUpRight className="h-4 w-4 text-[var(--aegis-ink)]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--aegis-ink)]">
                {formatEur(iv.totalSalesHtva)} €
              </span>
              <span className="text-xs font-mono text-[var(--aegis-muted)]">Grille [03]</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--aegis-muted)]">
              {iv.invoicesCount} facture(s) · {formatEur(iv.totalSalesTtc)} € TTC encaissés
            </span>
          </div>

          <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-availability-bg)] p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[var(--aegis-availability-text)]">
              <span className="text-xs font-semibold">Frais &amp; Achats validés</span>
              {pendingDraftsCount > 0 ? (
                <Badge
                  variant="outline"
                  className="font-mono tabular-nums text-[10px] bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)] border-[var(--aegis-preference-accent)]"
                >
                  {pendingDraftsCount} à valider
                </Badge>
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--aegis-ink)]">
                {formatEur(iv.totalExpensesHtva)} €
              </span>
              <span className="text-xs text-[var(--aegis-availability-text)]">HTVA</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--aegis-availability-text)]">
              TVA récup. [59] : {formatEur(iv.grid59)} € · Déduct. IPP : {formatEur(iv.totalTaxDeductibleExpenses)} €
            </span>
          </div>

          <div className="rounded-xl border border-[var(--aegis-preference-accent)]/70 bg-[var(--aegis-preference-bg)] p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[var(--aegis-preference-label)]">
              <span className="text-xs font-semibold">
                {iv.grid71 > 0 ? "TVA nette à payer [71]" : "Crédit de TVA [72]"}
              </span>
              <Landmark className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--aegis-ink)]">
                {formatEur(iv.grid71 > 0 ? iv.grid71 : iv.grid72)} €
              </span>
              <span className="text-xs font-mono text-[var(--aegis-preference-label)]">
                {iv.deadlineLabel}
              </span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--aegis-preference-label)]">
              Réserve totale (TVA + Social + IPP) : {formatEur(iv.totalReserveRecommended)} €
            </span>
          </div>
        </div>

        {/* Barre compacte repliable : Seuils Étudiant-Indépendant */}
        <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] px-4 py-2.5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setStudentDetailsOpen((v) => !v)}
            className="flex flex-wrap items-center justify-between gap-2 text-xs cursor-pointer w-full text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                Statut Étudiant-Indépendant {selectedYear} :
              </span>
              <span className="font-mono tabular-nums font-bold text-foreground">
                {formatEur(iv.studentStatus.annualNetProfit)} € net
              </span>
              <span className="text-muted-foreground font-mono tabular-nums">
                / {formatEur(STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet)} € seuil 0 € social
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  iv.studentStatus.bracket === "exempt_0"
                    ? "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]"
                    : "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)]"
                )}
              >
                {iv.studentStatus.statusLabel}
              </Badge>
            </div>
            <span className="flex items-center gap-1 text-muted-foreground font-medium">
              <span>{studentDetailsOpen ? "Masquer" : "Voir les 4 plafonds"}</span>
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", studentDetailsOpen && "rotate-180")}
              />
            </span>
          </button>

          {studentDetailsOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1 border-t border-border">
              {[
                {
                  title: "1. Lois Sociales (0 €)",
                  limit: STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet,
                  remaining: iv.studentStatus.remainingBeforeSocial,
                },
                {
                  title: "2. Impôt IPP (0 €)",
                  limit: STUDENT_TAX_THRESHOLDS_2026.ippExemptMaxNet,
                  remaining: iv.studentStatus.remainingBeforeIpp,
                },
                {
                  title: "3. À charge parents",
                  limit: STUDENT_TAX_THRESHOLDS_2026.parentChargeMaxNet,
                  remaining: iv.studentStatus.remainingBeforeParentChargeLoss,
                },
                {
                  title: "4. Plafond Étudiant",
                  limit: STUDENT_TAX_THRESHOLDS_2026.principalSwitchMinNet - 0.01,
                  remaining: iv.studentStatus.remainingBeforePrincipalSwitch,
                },
              ].map((g) => {
                const pct = Math.min(100, Math.round((iv.studentStatus.annualNetProfit / g.limit) * 100))
                return (
                  <div key={g.title} className="rounded-lg border border-border bg-card p-2.5 flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{g.title}</span>
                      <span className="font-mono tabular-nums text-[11px]">{formatEur(g.limit)} €</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn("h-full", g.remaining <= 0 ? "bg-destructive" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                      {g.remaining > 0 ? `Marge : +${formatEur(g.remaining)} €` : "Seuil dépassé"}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Barre de navigation à 3 Onglets */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-[var(--aegis-muted)] hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded-full",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : tab.highlight
                        ? "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)]"
                        : "bg-secondary text-foreground"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 3. Contenu des 3 onglets */}
      {activeTab === "expenses" && (
        <ExpensesInboxTab
          year={selectedYear}
          quarter={selectedQuarter}
          expenses={accounting.expenses}
          pendingDrafts={accounting.pendingDrafts}
          intervat={iv}
          configStatus={accounting.configStatus}
          mediaCommissionsDue={accounting.mediaCommissionsDueEur}
          onRefreshAccounting={() => reloadAccounting()}
        />
      )}

      {activeTab === "sales" && (
        <SalesPeppolTab
          year={selectedYear}
          quarter={selectedQuarter}
          periodLabel={iv.periodLabel}
          invoices={accounting.invoices}
          orders={orders}
          kpis={kpis}
          configStatus={accounting.configStatus}
          missingVatPartnersCount={accounting.missingVatPartnersCount}
          hasDedicatedTables={accounting.hasDedicatedTables}
          onRefreshAccounting={() => reloadAccounting()}
        />
      )}

      {activeTab === "declare" && (
        <DeclareVatTab
          year={selectedYear}
          quarter={selectedQuarter}
          intervat={iv}
          quarterSchedule={accounting.quarterSchedule}
          clientListing={accounting.clientListing}
          routineTasks={accounting.routineTasks}
          checklistCompletedIds={accounting.checklistCompletedIds}
          onSelectQuarter={(q) => handlePeriodChange(selectedYear, q)}
          onToggleTask={handleToggleChecklistTask}
        />
      )}
    </div>
  )
}
