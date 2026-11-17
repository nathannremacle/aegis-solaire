"use client"

import { useState, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { triggerAdminBadgesRefresh } from "@/components/admin/admin-badges-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Copy,
  Check,
  Building2,
  Download,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  FileCode2,
  Receipt,
  Calculator,
  CalendarClock,
  BookOpen,
  Landmark,
  Wallet,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  AccountingExpenseRecord,
  UnifiedInvoiceRecord,
} from "@/lib/accounting/belgian-tax-rules"
import { isDateInPeriod } from "@/lib/accounting/belgian-tax-rules"
import type { UnifiedAccountingBundle } from "@/lib/accounting/invoice-service"
import {
  ExpensesTab,
  IntervatPeppolTab,
  RoutineChecklistTab,
  TaxCourseNaceTab,
} from "./accounting-tabs"

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

type FinanceTabId = "sales" | "expenses" | "intervat" | "checklist" | "course"

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
  const [activeTab, setActiveTab] = useState<FinanceTabId>("sales")
  const [loading, setLoading] = useState(false)
  const [enrichingBce, setEnrichingBce] = useState(false)
  const [syncingInvoices, setSyncingInvoices] = useState(false)

  // Filtres Onglet 1
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "pending" | "paid" | "cancelled">("ALL")
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  // Validation / Cancel / Reconcile modals
  const [selectedOrderToValidate, setSelectedOrderToValidate] = useState<CreditOrder | null>(null)
  const [validationNotes, setValidationNotes] = useState("")
  const [validating, setValidating] = useState(false)
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<CreditOrder | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false)
  const [reconcileCsvText, setReconcileCsvText] = useState("")
  const [selectedMatchedIds, setSelectedMatchedIds] = useState<Set<string>>(new Set())
  const [reconciling, setReconciling] = useState(false)

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

  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText)
    setCopiedRef(refText)
    toast.success(`Référence « ${refText} » copiée.`)
    setTimeout(() => setCopiedRef(null), 2500)
  }

  const handleEnrichAllBce = async () => {
    setEnrichingBce(true)
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enrich_bce" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Échec BCE")
      toast.success(
        `Synchronisation BCE terminée : ${json.enriched} partenaire(s) enrichi(s) sur ${json.checked} vérifié(s).`
      )
      await reloadAccounting()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'appel cbeapi.be")
    } finally {
      setEnrichingBce(false)
    }
  }

  const handleSyncInvoices = async () => {
    setSyncingInvoices(true)
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_invoices" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Erreur de synchronisation")
      toast.success(
        `Facturier séquentiel synchronisé (${json.synced} facture(s) vérifiée(s)).`
      )
      await reloadAccounting()
    } catch (err: any) {
      toast.error(err.message || "Impossible de synchroniser les factures")
    } finally {
      setSyncingInvoices(false)
    }
  }

  const handleConfirmValidate = async () => {
    if (!selectedOrderToValidate) return
    setValidating(true)
    try {
      const res = await fetch(`/api/admin/credit-orders/${selectedOrderToValidate.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({
          action: "validate",
          notes: validationNotes.trim() || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || "Erreur de validation")

      toast.success(
        `Commande validée ! +${selectedOrderToValidate.credits} crédits alloués et facture émise.`
      )
      setSelectedOrderToValidate(null)
      setValidationNotes("")
      triggerAdminBadgesRefresh()
      await reloadAccounting()
    } catch (err: any) {
      toast.error(err.message || "Impossible de valider cette commande")
    } finally {
      setValidating(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!selectedOrderToCancel) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/credit-orders/${selectedOrderToCancel.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({ action: "cancel" }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || "Erreur d'annulation")

      toast.info(`Commande #${selectedOrderToCancel.id.slice(0, 8)} annulée.`)
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrderToCancel.id ? { ...o, status: "cancelled" } : o))
      )
      setSelectedOrderToCancel(null)
    } catch (err: any) {
      toast.error(err.message || "Impossible d'annuler cette commande")
    } finally {
      setCancelling(false)
    }
  }

  const matchedPendingOrders = useMemo(() => {
    if (!reconcileCsvText.trim()) return []
    const normalizedInput = reconcileCsvText.toUpperCase().replace(/\s+/g, "")
    return orders
      .filter((o) => o.status === "pending")
      .filter((o) => {
        const cleanRef = (o.transfer_reference || "").toUpperCase().replace(/[\s\-_/]/g, "")
        if (cleanRef.length >= 4 && normalizedInput.includes(cleanRef)) return true
        return normalizedInput.includes(o.id.slice(0, 8).toUpperCase())
      })
  }, [orders, reconcileCsvText])

  const handleBatchReconcile = async () => {
    if (selectedMatchedIds.size === 0) return
    setReconciling(true)
    let successCount = 0
    for (const orderId of Array.from(selectedMatchedIds)) {
      try {
        const res = await fetch(`/api/admin/credit-orders/${orderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-request": "true",
          },
          body: JSON.stringify({
            action: "validate",
            notes: "Rapprochement automatique de commande",
          }),
        })
        if (res.ok) successCount++
      } catch (err) {
        console.error("Batch reconcile error:", orderId, err)
      }
    }
    setReconciling(false)
    setReconcileModalOpen(false)
    setSelectedMatchedIds(new Set())
    setReconcileCsvText("")
    if (successCount > 0) {
      triggerAdminBadgesRefresh()
      toast.success(`${successCount} commande(s) rapprochée(s) et facturée(s) !`)
      await reloadAccounting()
    } else {
      toast.error("Aucune commande n'a pu être validée.")
    }
  }

  // Factures de la période sélectionnée + recherche
  const periodInvoices = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    return accounting.invoices.filter((inv) => {
      if (!isDateInPeriod(inv.issued_at, selectedYear, selectedQuarter)) return false
      if (!q) return true
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_company_name.toLowerCase().includes(q) ||
        (inv.client_vat_number || "").toLowerCase().includes(q) ||
        (inv.payment_reference || "").toLowerCase().includes(q) ||
        inv.line_description.toLowerCase().includes(q)
      )
    })
  }, [accounting.invoices, selectedYear, selectedQuarter, searchTerm])

  // Commandes filtrées
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase().trim()
      return (
        (o.partners?.company_name || "").toLowerCase().includes(q) ||
        (o.partners?.email || "").toLowerCase().includes(q) ||
        (o.transfer_reference || "").toLowerCase().includes(q) ||
        (o.pack_name || "").toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      )
    })
  }, [orders, statusFilter, searchTerm])

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  )
  const paidCount = useMemo(
    () => orders.filter((o) => o.status === "paid").length,
    [orders]
  )
  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === "cancelled").length,
    [orders]
  )

  const handleExportAccountingJournalCsv = () => {
    if (periodInvoices.length === 0) {
      toast.error("Aucune facture sur cette période.")
      return
    }
    const headers = [
      "Numéro Facture",
      "Type",
      "Date Émission",
      "Client B2B",
      "Numéro TVA Client",
      "Adresse Siège",
      "Source",
      "Description",
      "Montant HTVA (€)",
      "TVA 21% (€)",
      "Montant TTC (€)",
      "Frais Mollie Est. (€)",
      "Mode Paiement",
      "Référence Paiement",
      "Statut Peppol",
    ]
    const rows = periodInvoices.map((inv: UnifiedInvoiceRecord) => [
      inv.invoice_number,
      inv.invoice_type === "credit_note" ? "Note de crédit" : "Facture",
      new Date(inv.issued_at).toISOString().slice(0, 10),
      `"${inv.client_company_name.replace(/"/g, '""')}"`,
      inv.client_vat_number || "",
      `"${[inv.client_street, inv.client_postal_code, inv.client_city].filter(Boolean).join(" ").replace(/"/g, '""')}"`,
      inv.source_kind === "lead_direct" ? "Lead direct Mollie" : "Pack de crédits",
      `"${inv.line_description.replace(/"/g, '""')}"`,
      inv.amount_htva.toFixed(2),
      inv.amount_vat.toFixed(2),
      inv.amount_ttc.toFixed(2),
      inv.processor_fee_eur.toFixed(2),
      `"${(inv.payment_method || "").replace(/"/g, '""')}"`,
      `"${(inv.payment_reference || "").replace(/"/g, '""')}"`,
      inv.peppol_status,
    ])
    const csv =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
    const link = document.createElement("a")
    link.href = encodeURI(csv)
    link.download = `init42_journal_ventes_${selectedYear}_T${selectedQuarter}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Journal des ventes complet (HTVA + TVA + Peppol) exporté.")
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

  const handleExpenseCreated = (_exp: AccountingExpenseRecord) => {
    reloadAccounting()
  }

  const handleExpenseDeleted = (_id: string) => {
    reloadAccounting()
  }

  const iv = accounting.intervat
  const completedTasksCount = accounting.routineTasks.filter((t) =>
    accounting.checklistCompletedIds.includes(t.id)
  ).length

  const tabs: Array<{
    id: FinanceTabId
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }> = [
    {
      id: "sales",
      label: "Factures & Commandes",
      icon: FileText,
      badge: `${periodInvoices.length}`,
    },
    {
      id: "expenses",
      label: "Dépenses & Récup. TVA",
      icon: Receipt,
      badge: `${iv.expensesCount}`,
    },
    {
      id: "intervat",
      label: "Déclaration TVA & Peppol",
      icon: Calculator,
    },
    {
      id: "checklist",
      label: "Parcours & Rappels",
      icon: CalendarClock,
      badge: `${completedTasksCount}/${accounting.routineTasks.length}`,
    },
    {
      id: "course",
      label: "Cours TVA & NACE INIT42",
      icon: BookOpen,
    },
  ]

  const currentYear = new Date().getFullYear()
  const availableYears = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="flex flex-col gap-6">
      {/* 1. En-tête Institutionnel Comptable INIT42 / Aegis Solaire */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--aegis-divider)] pb-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--aegis-ink)]">
                Cockpit Comptable, TVA &amp; Facturation B2B
              </h1>
              <Badge variant="outline" className="font-mono tabular-nums text-xs bg-[var(--aegis-summary)] text-[var(--aegis-ink)] border-[var(--aegis-border)]">
                INIT42 · BE 1039.899.980
              </Badge>
              {pendingCount > 0 && (
                <Badge className="font-mono tabular-nums text-xs bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)] border border-[var(--aegis-preference-accent)]">
                  {pendingCount} virement(s) en attente
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--aegis-muted)]">
              Gestion autonome 0 € d&apos;abonnement : facturation séquentielle (packs crédits + achats directs leads Mollie), exports Peppol UBL 2.1, calcul exact Intervat et réserve fiscale en temps réel.
            </p>
          </div>

          {/* Sélecteur de période fiscale & actions */}
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

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAccountingJournalCsv}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exporter Journal CSV</span>
            </Button>
          </div>
        </div>

        {/* 2. Bandeau des 4 Indicateurs Fiscaux & Trésorerie (Style FiguresBox Aegis) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* CA HTVA */}
          <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[var(--aegis-muted)]">
              <span className="text-xs font-medium">CA HTVA · {iv.periodLabel}</span>
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

          {/* Balance TVA trimestrielle */}
          <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[var(--aegis-muted)]">
              <span className="text-xs font-medium">
                {iv.grid71 > 0 ? "TVA nette à rendre à l'État" : "Crédit de TVA en ta faveur"}
              </span>
              <Landmark className="h-4 w-4 text-[var(--aegis-ink)]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--aegis-ink)]">
                {formatEur(iv.grid71 > 0 ? iv.grid71 : iv.grid72)} €
              </span>
              <span className="text-xs font-mono text-[var(--aegis-muted)]">
                Grille {iv.grid71 > 0 ? "[71]" : "[72]"}
              </span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--aegis-muted)]">
              Collectée +{formatEur(iv.totalVatCollectedOnSales)} € · Récupérée −{formatEur(iv.totalBeVatPaidAndDeductible)} €
            </span>
          </div>

          {/* Frais déductibles & économie d'impôt */}
          <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-availability-bg)] p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[var(--aegis-availability-text)]">
              <span className="text-xs font-semibold">Frais déductibles &amp; Gain fiscal</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--aegis-ink)]">
                {formatEur(iv.totalExpensesHtva)} €
              </span>
              <span className="text-xs text-[var(--aegis-availability-text)]">HTVA</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--aegis-availability-text)]">
              Économie impôt + social : ~{formatEur(iv.estimatedTaxSavedByExpenses)} €
            </span>
          </div>

          {/* Sous-compte Réserve Fiscale & Cash net en poche */}
          <div className="rounded-xl border border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)] p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[var(--aegis-preference-label)]">
              <span className="text-xs font-semibold">À bloquer en « Réserve Fiscale »</span>
              <Wallet className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-[var(--aegis-ink)]">
                {formatEur(iv.totalReserveRecommended)} €
              </span>
              <span className="text-xs text-[var(--aegis-preference-label)]">à ne pas toucher</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--aegis-preference-label)]">
              Cash 100 % net libre : {formatEur(iv.netCashInPocket)} €
            </span>
          </div>
        </div>

        {/* Alerte actionnable si des n° TVA partenaires ou migration manquent */}
        {(accounting.missingVatPartnersCount > 0 || !accounting.hasDedicatedTables) && (
          <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[var(--aegis-ink)]">
                Actions de mise en conformité automatique disponibles :
              </span>
              <span className="text-[var(--aegis-muted)]">
                {accounting.missingVatPartnersCount > 0
                  ? `${accounting.missingVatPartnersCount} partenaire(s) sans numéro de TVA/adresse siège synchronisé via BCE (cbeapi.be).`
                  : "Les tables SQL comptables dédiées (invoices, accounting_expenses) peuvent être activées via la migration 202611170001."}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={enrichingBce}
                onClick={handleEnrichAllBce}
                className="h-8 text-xs gap-1.5 bg-card"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{enrichingBce ? "Appel BCE…" : "Enrichir TVA via BCE"}</span>
              </Button>
              {accounting.hasDedicatedTables && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={syncingInvoices}
                  onClick={handleSyncInvoices}
                  className="h-8 text-xs gap-1.5 bg-card"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{syncingInvoices ? "Sync…" : "Numéroter factures"}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Barre de Navigation à 5 Onglets */}
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
                "px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer",
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
                    "font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
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

      {/* ====================================================================
          ONGLET 1 : FACTURES SÉQUENTIELLES & COMMANDES DE CRÉDITS
         ==================================================================== */}
      {activeTab === "sales" && (
        <div className="flex flex-col gap-6">
          {/* A. Grand Livre des Factures Émises (Packs crédits + Achats directs Mollie) */}
          <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
            <div className="p-4 border-b border-border bg-[var(--aegis-surface-subtle)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-heading text-base font-bold text-foreground">
                  Facturier Officiel des Ventes ({iv.periodLabel})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Regroupe automatiquement les packs de crédits ET les achats directs de leads via Mollie avec numérotation séquentielle sans trou et export XML Peppol UBL 2.1.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[230px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Facture, société, TVA, réf…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs bg-card"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleEnrichAllBce}
                  disabled={enrichingBce}
                  className="h-8 text-xs gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{enrichingBce ? "BCE…" : "Sync BCE"}</span>
                </Button>
              </div>
            </div>

            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead className="w-32 font-mono">N° Facture</TableHead>
                  <TableHead className="w-24 font-mono">Date</TableHead>
                  <TableHead className="min-w-[210px]">Client B2B &amp; N° TVA</TableHead>
                  <TableHead className="min-w-[210px]">Prestation &amp; Origine</TableHead>
                  <TableHead className="w-32 text-right font-mono">HTVA / TVA / TTC</TableHead>
                  <TableHead className="w-28 text-right font-mono">Frais Mollie</TableHead>
                  <TableHead className="w-44 text-right">Documents conformes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Aucune facture émise sur {iv.periodLabel}.
                    </TableCell>
                  </TableRow>
                ) : (
                  periodInvoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-secondary/20">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono tabular-nums font-bold text-foreground">
                            {inv.invoice_number}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {inv.payment_method || "Mollie"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono tabular-nums text-muted-foreground">
                        {new Date(inv.issued_at).toLocaleDateString("fr-BE")}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">
                            {inv.client_company_name}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {inv.client_vat_number || "TVA manquante (cliquer Sync BCE)"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground font-medium">{inv.line_description}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {inv.source_kind === "lead_direct" ? "Lead direct Mollie" : "Pack crédits"}
                            </Badge>
                            {inv.payment_reference && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {inv.payment_reference}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-foreground">
                            {formatEur(inv.amount_htva)} € HT
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            TVA {formatEur(inv.amount_vat)} € · {formatEur(inv.amount_ttc)} € TTC
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {inv.processor_fee_eur > 0 ? `−${formatEur(inv.processor_fee_eur)} €` : "0,00 €"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-[11px]">
                            <a
                              href={`/api/admin/invoices/${encodeURIComponent(inv.id)}?format=html`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              PDF
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="secondary" className="h-7 px-2.5 text-[11px]">
                            <a
                              href={`/api/admin/invoices/${encodeURIComponent(inv.id)}?format=ubl`}
                              download={`${inv.invoice_number}.xml`}
                            >
                              <FileCode2 className="h-3 w-3 mr-1" />
                              Peppol XML
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* B. Gestion opérationnelle des Commandes de Crédits (Validation manuelle / Rapprochement CSV) */}
          <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-[var(--aegis-surface-subtle)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-base font-bold text-foreground">
                    Ordres de Recharges &amp; Validation Virements
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                    {orders.length} ordres · {kpis.total_partner_credits_balance.toLocaleString("fr-BE")} cr. en circulation
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valide les virements bancaires manuels, annule les commandes abandonnées ou lance un rapprochement CSV.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReconcileModalOpen(true)}
                  className="h-8 text-xs gap-1.5 bg-card"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Rapprochement CSV</span>
                </Button>

                <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
                  {(
                    [
                      { id: "ALL", label: "Toutes", count: orders.length },
                      { id: "pending", label: "En attente", count: pendingCount },
                      { id: "paid", label: "Validées", count: paidCount },
                      { id: "cancelled", label: "Annulées", count: cancelledCount },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-sm font-medium transition-colors cursor-pointer flex items-center gap-1",
                        statusFilter === st.id
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{st.label}</span>
                      <span className="font-mono text-[10px] tabular-nums">({st.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead className="w-28 font-mono">Date</TableHead>
                  <TableHead className="min-w-[200px]">Installateur Partenaire</TableHead>
                  <TableHead className="w-40">Pack Commandé</TableHead>
                  <TableHead className="w-32 text-right font-mono">Montant HTVA / TTC</TableHead>
                  <TableHead className="min-w-[220px]">Référence / Mollie</TableHead>
                  <TableHead className="w-28 text-center font-mono">Statut</TableHead>
                  <TableHead className="w-44 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Aucune commande de crédits correspondante.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const isPending = order.status === "pending"
                    const isPaid = order.status === "paid"
                    const isCancelled = order.status === "cancelled"
                    const isCopied = copiedRef === order.transfer_reference
                    return (
                      <TableRow key={order.id} className="hover:bg-secondary/20">
                        <TableCell className="font-mono text-[11px] tabular-nums whitespace-nowrap text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{new Date(order.created_at).toLocaleDateString("fr-BE")}</span>
                            <span className="text-[10px] opacity-80">
                              {new Date(order.created_at).toLocaleTimeString("fr-BE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-foreground truncate">
                                {order.partners?.company_name || "Partenaire non renseigné"}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate pl-5">
                              {order.partners?.email || "—"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{order.pack_name}</span>
                            <span className="font-mono text-[11px] tabular-nums font-semibold bg-secondary px-1.5 py-0.5 rounded border border-border">
                              +{order.credits} cr.
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-mono tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-foreground">
                              {order.price_htva.toFixed(2)} €
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {order.price_ttc.toFixed(2)} € TTC
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs tabular-nums bg-secondary/80 border border-border px-2 py-0.5 rounded select-all font-semibold">
                              {order.transfer_reference}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => handleCopyRef(order.transfer_reference)}
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {isPending && (
                            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 font-medium text-[11px]">
                              <Clock className="h-3 w-3 mr-1" />
                              En attente
                            </Badge>
                          )}
                          {isPaid && (
                            <Badge variant="outline" className="bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] border-border font-medium text-[11px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Validé
                            </Badge>
                          )}
                          {isCancelled && (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-medium text-[11px]">
                              <XCircle className="h-3 w-3 mr-1" />
                              Annulé
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {isPending && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs font-medium"
                                onClick={() => {
                                  setSelectedOrderToValidate(order)
                                  setValidationNotes("")
                                }}
                              >
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => setSelectedOrderToCancel(order)}
                              >
                                Annuler
                              </Button>
                            </div>
                          )}
                          {isPaid && order.validated_at && (
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                              Validé le {new Date(order.validated_at).toLocaleDateString("fr-BE")}
                            </span>
                          )}
                          {isCancelled && (
                            <span className="text-[10px] text-muted-foreground italic">Annulé</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ONGLET 2 : DÉPENSES & SIMULATEUR TVA / IMPÔT */}
      {activeTab === "expenses" && (
        <ExpensesTab
          year={selectedYear}
          quarter={selectedQuarter}
          expenses={accounting.expenses}
          estimatedMollieFees={accounting.estimatedMollieFeesForPeriod}
          mediaCommissionsDue={accounting.mediaCommissionsDueEur}
          intervat={iv}
          onExpenseCreated={handleExpenseCreated}
          onExpenseDeleted={handleExpenseDeleted}
          onRefreshAccounting={() => reloadAccounting()}
        />
      )}

      {/* ONGLET 3 : DÉCLARATION TVA INTERVAT & PEPPOL */}
      {activeTab === "intervat" && (
        <IntervatPeppolTab
          year={selectedYear}
          intervat={iv}
          clientListing={accounting.clientListing}
        />
      )}

      {/* ONGLET 4 : PARCOURS & RAPPELS */}
      {activeTab === "checklist" && (
        <RoutineChecklistTab
          year={selectedYear}
          quarter={selectedQuarter}
          tasks={accounting.routineTasks}
          completedIds={accounting.checklistCompletedIds}
          onToggleTask={handleToggleChecklistTask}
        />
      )}

      {/* ONGLET 5 : COURS TVA & CODES NACE INIT42 */}
      {activeTab === "course" && <TaxCourseNaceTab />}

      {/* Dialog Validation Manuelle */}
      <Dialog
        open={Boolean(selectedOrderToValidate)}
        onOpenChange={(open) => !open && setSelectedOrderToValidate(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Validation manuelle du paiement</span>
            </DialogTitle>
            <DialogDescription>
              Créditera le compte partenaire, générera la facture séquentielle et notifiera l&apos;installateur.
            </DialogDescription>
          </DialogHeader>
          {selectedOrderToValidate && (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-md border border-border bg-secondary/30 p-3 flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installateur :</span>
                  <span className="font-semibold text-foreground">
                    {selectedOrderToValidate.partners?.company_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pack :</span>
                  <span className="font-medium text-foreground">
                    {selectedOrderToValidate.pack_name} (+{selectedOrderToValidate.credits} crédits)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant TTC :</span>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {selectedOrderToValidate.price_ttc.toFixed(2)} € TTC
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validationNotes" className="text-xs">
                  Note comptable interne (optionnel)
                </Label>
                <Textarea
                  id="validationNotes"
                  placeholder="Ex : Virement constaté sur relevé BNP/Revolut..."
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  className="text-xs resize-none h-20"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setSelectedOrderToValidate(null)} disabled={validating}>
              Fermer
            </Button>
            <Button size="sm" onClick={handleConfirmValidate} disabled={validating}>
              {validating ? "Validation…" : "Confirmer & facturer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Annulation */}
      <Dialog
        open={Boolean(selectedOrderToCancel)}
        onOpenChange={(open) => !open && setSelectedOrderToCancel(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Annuler la commande de crédits</span>
            </DialogTitle>
            <DialogDescription>
              Aucun crédit ni facture ne seront émis pour cet ordre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setSelectedOrderToCancel(null)} disabled={cancelling}>
              Retour
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmCancel} disabled={cancelling}>
              {cancelling ? "Annulation…" : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Rapprochement CSV */}
      <Dialog open={reconcileModalOpen} onOpenChange={setReconcileModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <span>Rapprochement bancaire CSV</span>
            </DialogTitle>
            <DialogDescription>
              Colle ici un extrait CSV bancaire : les références de commandes en attente détectées seront proposées pour validation groupée.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Colle les lignes de ton relevé bancaire (ex. AEGIS-2026-...)"
              value={reconcileCsvText}
              onChange={(e) => {
                setReconcileCsvText(e.target.value)
                setSelectedMatchedIds(new Set())
              }}
              className="h-32 font-mono text-xs"
            />
            {matchedPendingOrders.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-border rounded-md p-2">
                {matchedPendingOrders.map((m) => {
                  const checked = selectedMatchedIds.has(m.id)
                  return (
                    <label key={m.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-secondary/40 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(selectedMatchedIds)
                            if (e.target.checked) next.add(m.id)
                            else next.delete(m.id)
                            setSelectedMatchedIds(next)
                          }}
                        />
                        <span className="font-medium">{m.partners?.company_name}</span>
                        <code className="font-mono text-[11px]">{m.transfer_reference}</code>
                      </span>
                      <span className="font-mono tabular-nums font-bold">{m.price_ttc.toFixed(2)} €</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              reconcileCsvText.trim().length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucune commande en attente correspondante détectée dans le texte collé.
                </p>
              )
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReconcileModalOpen(false)}>
              Fermer
            </Button>
            <Button
              size="sm"
              disabled={reconciling || selectedMatchedIds.size === 0}
              onClick={handleBatchReconcile}
            >
              {reconciling ? "Validation…" : `Valider (${selectedMatchedIds.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
