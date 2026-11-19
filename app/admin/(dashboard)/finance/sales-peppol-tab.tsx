"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { triggerAdminBadgesRefresh } from "@/components/admin/admin-badges-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Download,
  FileCode2,
  FileText,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { isDateInPeriod, type UnifiedInvoiceRecord } from "@/lib/accounting/belgian-tax-rules"
import type { AccountingConfigStatus } from "@/lib/accounting/invoice-service"
import type { CreditOrder, FinanceKpis } from "./finance-client"

function formatEur(val: number): string {
  return val.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface SalesPeppolTabProps {
  year: number
  quarter: 0 | 1 | 2 | 3 | 4
  periodLabel: string
  invoices: UnifiedInvoiceRecord[]
  orders: CreditOrder[]
  kpis: FinanceKpis
  configStatus: AccountingConfigStatus
  missingVatPartnersCount: number
  hasDedicatedTables: boolean
  onRefreshAccounting: () => Promise<void>
}

export function SalesPeppolTab({
  year,
  quarter,
  periodLabel,
  invoices,
  orders,
  kpis,
  configStatus,
  missingVatPartnersCount,
  hasDedicatedTables,
  onRefreshAccounting,
}: SalesPeppolTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "pending" | "paid" | "cancelled">("ALL")
  const [copiedRef, setCopiedRef] = useState<string | null>(null)
  const [enrichingBce, setEnrichingBce] = useState(false)
  const [syncingInvoices, setSyncingInvoices] = useState(false)
  const [markingBatchPeppol, setMarkingBatchPeppol] = useState(false)
  const [togglingInvoiceId, setTogglingInvoiceId] = useState<string | null>(null)

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

  const periodInvoices = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    return invoices.filter((inv) => {
      if (!isDateInPeriod(inv.issued_at, year, quarter)) return false
      if (!q) return true
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_company_name.toLowerCase().includes(q) ||
        (inv.client_vat_number || "").toLowerCase().includes(q) ||
        (inv.payment_reference || "").toLowerCase().includes(q) ||
        inv.line_description.toLowerCase().includes(q)
      )
    })
  }, [invoices, year, quarter, searchTerm])

  const pendingPeppolPersistedIds = useMemo(
    () =>
      periodInvoices
        .filter(
          (inv) =>
            !inv.is_synthesized &&
            inv.status !== "cancelled" &&
            inv.peppol_status !== "sent" &&
            /^[0-9a-f-]{36}$/i.test(inv.id)
        )
        .map((inv) => inv.id),
    [periodInvoices]
  )

  const pendingPeppolCount = useMemo(
    () =>
      periodInvoices.filter((inv) => inv.status !== "cancelled" && inv.peppol_status !== "sent")
        .length,
    [periodInvoices]
  )

  const pendingCount = useMemo(() => orders.filter((o) => o.status === "pending").length, [orders])
  const paidCount = useMemo(() => orders.filter((o) => o.status === "paid").length, [orders])
  const cancelledCount = useMemo(() => orders.filter((o) => o.status === "cancelled").length, [orders])

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
      await onRefreshAccounting()
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
      toast.success(`Facturier séquentiel synchronisé (${json.synced} facture(s) vérifiée(s)).`)
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err.message || "Impossible de synchroniser les factures")
    } finally {
      setSyncingInvoices(false)
    }
  }

  const handleTogglePeppolStatus = async (inv: UnifiedInvoiceRecord) => {
    if (inv.is_synthesized) {
      toast.info("Clique d'abord sur « Numéroter factures » pour figer cette facture en base.")
      return
    }
    const nextStatus = inv.peppol_status === "sent" ? "ready_ubl" : "sent"
    setTogglingInvoiceId(inv.id)
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_peppol_sent",
          invoiceId: inv.id,
          peppolStatus: nextStatus,
        }),
      })
      if (!res.ok) throw new Error("Échec mise à jour statut Peppol")
      toast.success(
        nextStatus === "sent"
          ? `${inv.invoice_number} marquée comme envoyée sur Peppol.`
          : `${inv.invoice_number} remise « À envoyer ».`
      )
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible de mettre à jour le statut Peppol")
    } finally {
      setTogglingInvoiceId(null)
    }
  }

  const handleMarkBatchPeppolSent = async () => {
    if (pendingPeppolPersistedIds.length === 0) {
      toast.info("Toutes les factures enregistrées sur cette période sont déjà marquées envoyées.")
      return
    }
    setMarkingBatchPeppol(true)
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_peppol_batch_sent",
          invoiceIds: pendingPeppolPersistedIds,
          peppolStatus: "sent",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Échec mise à jour lot")
      toast.success(`${json.updatedCount} facture(s) marquée(s) comme envoyée(s) sur Peppol.`)
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible de marquer le lot comme envoyé")
    } finally {
      setMarkingBatchPeppol(false)
    }
  }

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
      "Mode Paiement",
      "Référence Paiement",
      "Statut Peppol",
    ]
    const rows = periodInvoices.map((inv) => [
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
      `"${(inv.payment_method || "").replace(/"/g, '""')}"`,
      `"${(inv.payment_reference || "").replace(/"/g, '""')}"`,
      inv.peppol_status,
    ])
    const csv =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
    const link = document.createElement("a")
    link.href = encodeURI(csv)
    link.download = `init42_journal_ventes_${year}_T${quarter}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Journal des ventes exporté.")
  }

  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText)
    setCopiedRef(refText)
    toast.success(`Référence « ${refText} » copiée.`)
    setTimeout(() => setCopiedRef(null), 2500)
  }

  const handleConfirmValidate = async () => {
    if (!selectedOrderToValidate) return
    setValidating(true)
    try {
      const res = await fetch(`/api/admin/credit-orders/${selectedOrderToValidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
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
      await onRefreshAccounting()
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
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ action: "cancel" }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || "Erreur d'annulation")
      toast.info(`Commande #${selectedOrderToCancel.id.slice(0, 8)} annulée.`)
      setSelectedOrderToCancel(null)
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err.message || "Impossible d'annuler cette commande")
    } finally {
      setCancelling(false)
    }
  }

  const handleBatchReconcile = async () => {
    if (selectedMatchedIds.size === 0) return
    setReconciling(true)
    let successCount = 0
    for (const orderId of Array.from(selectedMatchedIds)) {
      try {
        const res = await fetch(`/api/admin/credit-orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-request": "true" },
          body: JSON.stringify({
            action: "validate",
            notes: "Rapprochement automatique de commande",
          }),
        })
        if (res.ok) successCount += 1
      } catch {
        // Ignorer ligne en erreur
      }
    }
    setReconciling(false)
    setReconcileModalOpen(false)
    setSelectedMatchedIds(new Set())
    setReconcileCsvText("")
    if (successCount > 0) {
      triggerAdminBadgesRefresh()
      toast.success(`${successCount} commande(s) rapprochée(s) et facturée(s) !`)
      await onRefreshAccounting()
    } else {
      toast.error("Aucune commande n'a pu être validée.")
    }
  }

  const ordersTableContent = (
    <div className="flex flex-col">
      <div className="p-4 border-b border-border bg-[var(--aegis-surface-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums font-semibold text-foreground">
            {orders.length} ordres · {kpis.total_partner_credits_balance.toLocaleString("fr-BE")} cr. en circulation
          </span>
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
            <TableHead className="min-w-[200px]">Référence</TableHead>
            <TableHead className="w-28 text-center font-mono">Statut</TableHead>
            <TableHead className="w-40 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
                  <TableCell className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("fr-BE")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {order.partners?.company_name || "Partenaire"}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {order.partners?.email || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{order.pack_name}</span>
                      <span className="font-mono text-[11px] tabular-nums bg-secondary px-1.5 py-0.5 rounded border border-border">
                        +{order.credits} cr.
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-foreground">
                        {formatEur(order.price_htva)} €
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatEur(order.price_ttc)} € TTC
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs tabular-nums bg-secondary/80 border border-border px-2 py-0.5 rounded select-all font-semibold">
                        {order.transfer_reference}
                      </span>
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
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-[11px]">
                        <Clock className="h-3 w-3 mr-1" />
                        En attente
                      </Badge>
                    )}
                    {isPaid && (
                      <Badge variant="outline" className="bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] border-border text-[11px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Validé
                      </Badge>
                    )}
                    {isCancelled && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
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
                          className="h-7 text-xs"
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
                        {new Date(order.validated_at).toLocaleDateString("fr-BE")}
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
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Alertes actionnables Peppol / BCE */}
      {(!configStatus.peppolAddressReady || missingVatPartnersCount > 0) && (
        <div className="rounded-xl border border-[var(--aegis-preference-accent)]/60 bg-[var(--aegis-preference-bg)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--aegis-preference-label)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              {!configStatus.peppolAddressReady && (
                <span>
                  <strong>Adresse légale Peppol à configurer :</strong> ajoute{" "}
                  <code className="font-mono font-semibold">INIT42_LEGAL_STREET</code>,{" "}
                  <code className="font-mono font-semibold">INIT42_LEGAL_POSTAL_CODE</code> et{" "}
                  <code className="font-mono font-semibold">INIT42_LEGAL_CITY</code> dans Vercel avant d&apos;importer tes XML dans Odoo.
                </span>
              )}
              {missingVatPartnersCount > 0 && (
                <span>
                  {missingVatPartnersCount} partenaire(s) sans n° de TVA/siège synchronisé via BCE.
                </span>
              )}
            </div>
          </div>
          {missingVatPartnersCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={enrichingBce}
              onClick={handleEnrichAllBce}
              className="h-7 text-xs bg-card"
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              {enrichingBce ? "Appel BCE…" : "Enrichir TVA via BCE"}
            </Button>
          )}
        </div>
      )}

      {/* A. Facturier des Ventes & Export Peppol Lot (.zip) */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-[var(--aegis-surface-subtle)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-bold text-foreground">
              Factures émises &amp; Export Peppol ({periodLabel})
            </h2>
            <p className="text-xs text-muted-foreground">
              Télécharge toutes tes factures B2B en 1 seul fichier <span className="font-mono">.zip</span> pour les importer d&apos;un coup dans Odoo Facturation gratuit, puis marque le lot envoyé.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Facture, client, TVA…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>

            {hasDedicatedTables && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSyncInvoices}
                disabled={syncingInvoices}
                className="h-8 text-xs gap-1.5 bg-card"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{syncingInvoices ? "Sync…" : "Numéroter factures"}</span>
              </Button>
            )}

            <Button
              asChild
              size="sm"
              variant="default"
              disabled={pendingPeppolCount === 0}
              className="h-8 text-xs gap-1.5"
            >
              <a
                href={`/api/admin/invoices/peppol-batch?year=${year}&quarter=${quarter}&onlyPending=true`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Télécharger lot Peppol .zip ({pendingPeppolCount})</span>
              </a>
            </Button>

            {pendingPeppolPersistedIds.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={markingBatchPeppol}
                onClick={handleMarkBatchPeppolSent}
                className="h-8 text-xs gap-1.5 bg-card"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {markingBatchPeppol
                    ? "Mise à jour…"
                    : `Marquer lot envoyé (${pendingPeppolPersistedIds.length})`}
                </span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportAccountingJournalCsv}
              className="h-8 text-xs gap-1.5 bg-card"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </Button>
          </div>
        </div>

        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="w-32 font-mono">N° Facture</TableHead>
              <TableHead className="w-24 font-mono">Date</TableHead>
              <TableHead className="min-w-[200px]">Client B2B &amp; N° TVA</TableHead>
              <TableHead className="min-w-[200px]">Prestation</TableHead>
              <TableHead className="w-36 text-right font-mono">HTVA / TVA / TTC</TableHead>
              <TableHead className="w-32 text-center">Peppol</TableHead>
              <TableHead className="w-36 text-right">Documents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aucune facture émise sur {periodLabel}.
                </TableCell>
              </TableRow>
            ) : (
              periodInvoices.map((inv) => {
                const isSent = inv.peppol_status === "sent"
                return (
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
                        <span className="font-semibold text-foreground">{inv.client_company_name}</span>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {inv.client_vat_number || "TVA manquante"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-foreground font-medium">{inv.line_description}</span>
                        <Badge variant="outline" className="w-fit text-[10px]">
                          {inv.source_kind === "lead_direct" ? "Lead direct Mollie" : "Pack crédits"}
                        </Badge>
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
                    <TableCell className="text-center">
                      <button
                        type="button"
                        disabled={togglingInvoiceId === inv.id}
                        onClick={() => handleTogglePeppolStatus(inv)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer transition-colors",
                          isSent
                            ? "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] border-border"
                            : "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)] border-[var(--aegis-preference-accent)]/50 hover:opacity-90"
                        )}
                        title="Cliquer pour basculer le statut Peppol"
                      >
                        {isSent ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Envoyée</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>À envoyer</span>
                          </>
                        )}
                      </button>
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
                            XML
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* B. Virements & Commandes de Crédits (ouvert si pendingCount > 0, sinon replié) */}
      {pendingCount > 0 ? (
        <div className="rounded-2xl border border-[var(--aegis-preference-accent)] bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-[var(--aegis-preference-bg)] flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-[var(--aegis-preference-label)]">
              Virements bancaires à valider ({pendingCount})
            </h2>
          </div>
          {ordersTableContent}
        </div>
      ) : (
        <Accordion type="single" collapsible className="rounded-2xl border border-[var(--aegis-border)] bg-card px-4">
          <AccordionItem value="orders">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <span>Historique des commandes de crédits &amp; Rapprochement CSV ({orders.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-1">
              <div className="rounded-xl border border-border overflow-hidden">{ordersTableContent}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

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
                    {formatEur(selectedOrderToValidate.price_ttc)} € TTC
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validationNotes" className="text-xs">
                  Note comptable interne (optionnel)
                </Label>
                <Textarea
                  id="validationNotes"
                  placeholder="Ex : Virement constaté sur relevé..."
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
            {matchedPendingOrders.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-border rounded-md p-2">
                {matchedPendingOrders.map((m) => (
                  <label key={m.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-secondary/40 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedMatchedIds.has(m.id)}
                        onChange={(e) => {
                          const next = new Set(selectedMatchedIds)
                          if (e.target.checked) next.add(m.id)
                          else next.delete(m.id)
                          setSelectedMatchedIds(next)
                        }}
                      />
                      <span className="font-medium">{m.partners?.company_name}</span>
                      <span className="font-mono text-[11px]">{m.transfer_reference}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold">{formatEur(m.price_ttc)} €</span>
                  </label>
                ))}
              </div>
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
