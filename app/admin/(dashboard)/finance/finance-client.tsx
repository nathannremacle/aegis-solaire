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
} from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export function FinanceClient({ initialOrders, kpis, adminEmail }: FinanceClientProps) {
  const [orders, setOrders] = useState<CreditOrder[]>(initialOrders)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "pending" | "paid" | "cancelled">("ALL")
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  // Synchroniser les badges dès le montage
  useEffect(() => {
    triggerAdminBadgesRefresh()
  }, [])

  // Validation modal state
  const [selectedOrderToValidate, setSelectedOrderToValidate] = useState<CreditOrder | null>(null)
  const [validationNotes, setValidationNotes] = useState("")
  const [validating, setValidating] = useState(false)

  // Cancel modal state
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<CreditOrder | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // Reconciliation modal state
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false)
  const [reconcileCsvText, setReconcileCsvText] = useState("")
  const [selectedMatchedIds, setSelectedMatchedIds] = useState<Set<string>>(new Set())
  const [reconciling, setReconciling] = useState(false)

  // Copier la référence de commande
  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText)
    setCopiedRef(refText)
    toast.success(`Référence « ${refText} » copiée dans le presse-papier`)
    setTimeout(() => setCopiedRef(null), 2500)
  }

  // Rafraîchir les commandes depuis l'API
  const refreshOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/credit-orders", {
        headers: { "x-admin-request": "true" },
      })
      if (!res.ok) throw new Error("Échec du rechargement")
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
      toast.success("Commandes de crédits actualisées")
    } catch {
      toast.error("Impossible de rafraîchir les commandes")
    } finally {
      setLoading(false)
    }
  }

  // Validation d'une commande (crédit atomique du compte)
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
      if (!res.ok || result.error) {
        throw new Error(result.error || "Erreur de validation")
      }

      toast.success(
        `Commande validée avec succès ! ${selectedOrderToValidate.credits} crédits alloués à ${selectedOrderToValidate.partners?.company_name || "l'installateur"}.`
      )

      // Mise à jour optimiste de la liste locale
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderToValidate.id
            ? {
                ...o,
                status: "paid",
                validated_at: new Date().toISOString(),
                notes: validationNotes.trim() || o.notes,
              }
            : o
        )
      )

      setSelectedOrderToValidate(null)
      setValidationNotes("")
      triggerAdminBadgesRefresh()
    } catch (err: any) {
      toast.error(err.message || "Impossible de valider cette commande")
    } finally {
      setValidating(false)
    }
  }

  // Annulation d'une commande
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
        body: JSON.stringify({
          action: "cancel",
        }),
      })

      const result = await res.json()
      if (!res.ok || result.error) {
        throw new Error(result.error || "Erreur d'annulation")
      }

      toast.info(`Commande #${selectedOrderToCancel.id.slice(0, 8)} annulée.`)

      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderToCancel.id ? { ...o, status: "cancelled" } : o
        )
      )

      setSelectedOrderToCancel(null)
    } catch (err: any) {
      toast.error(err.message || "Impossible d'annuler cette commande")
    } finally {
      setCancelling(false)
    }
  }

  // Matching automatique des virements bancaires depuis le texte CSV/relevé
  const matchedPendingOrders = useMemo(() => {
    if (!reconcileCsvText.trim()) return []
    const normalizedInput = reconcileCsvText.toUpperCase().replace(/\s+/g, "")
    return orders
      .filter((o) => o.status === "pending")
      .filter((o) => {
        const cleanRef = (o.transfer_reference || "").toUpperCase().replace(/[\s\-_/]/g, "")
        if (cleanRef.length >= 4 && normalizedInput.includes(cleanRef)) return true
        const shortId = o.id.slice(0, 8).toUpperCase()
        return normalizedInput.includes(shortId)
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
            notes: "Rapprochement automatique relevé bancaire CSV",
          }),
        })

        if (res.ok) {
          successCount++
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    status: "paid",
                    validated_at: new Date().toISOString(),
                    notes: "Rapprochement automatique relevé bancaire CSV",
                  }
                : o
            )
          )
        }
      } catch (err) {
        console.error("Batch reconcile error on order:", orderId, err)
      }
    }

    setReconciling(false)
    setReconcileModalOpen(false)
    setSelectedMatchedIds(new Set())
    setReconcileCsvText("")

    if (successCount > 0) {
      triggerAdminBadgesRefresh()
      toast.success(`${successCount} commande(s) rapprochée(s) et validée(s) avec succès !`)
    } else {
      toast.error("Aucune commande n'a pu être validée.")
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    if (orders.length === 0) {
      toast.error("Aucune commande à exporter")
      return
    }

    const headers = [
      "ID",
      "Date de création",
      "Société partenaire",
      "Email partenaire",
      "Pack",
      "Crédits",
      "Prix HTVA (€)",
      "Prix TTC (€)",
      "Référence commande",
      "Statut",
      "Date de validation",
      "Notes",
    ]

    const rows = filteredOrders.map((o) => [
      o.id,
      new Date(o.created_at).toISOString(),
      `"${(o.partners?.company_name || "").replace(/"/g, '""')}"`,
      o.partners?.email || "",
      `"${o.pack_name.replace(/"/g, '""')}"`,
      o.credits,
      o.price_htva.toFixed(2),
      o.price_ttc.toFixed(2),
      `"${o.transfer_reference}"`,
      o.status,
      o.validated_at ? new Date(o.validated_at).toISOString() : "",
      `"${(o.notes || "").replace(/"/g, '""')}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `aegis_commandes_credits_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Fichier CSV généré")
  }

  // Filtrage
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase().trim()
      const company = o.partners?.company_name?.toLowerCase() || ""
      const email = o.partners?.email?.toLowerCase() || ""
      const ref = o.transfer_reference?.toLowerCase() || ""
      const pack = o.pack_name?.toLowerCase() || ""
      const id = o.id.toLowerCase()
      return (
        company.includes(q) ||
        email.includes(q) ||
        ref.includes(q) ||
        pack.includes(q) ||
        id.includes(q)
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

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Opérationnel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Finances &amp; Commandes de Crédits
            </h1>
            <span className="font-mono text-xs tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border">
              {orders.length} ordres
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Suivi des commandes de packs de crédits, paiements en ligne instantanés via Mollie (Bancontact, Payconiq, Cartes) et audit comptable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshOrders}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Actualiser</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exporter CSV</span>
          </Button>
        </div>
      </div>

      {/* 2. Cartes de Métriques Financières (Tokens sémantiques, zéro hex) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Encaissements MTD */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Encaissements ce mois (MTD)</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {kpis.paid_htva_month.toLocaleString("fr-BE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </span>
            <span className="text-xs text-muted-foreground">HTVA</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Total historique : {kpis.paid_htva_total.toLocaleString("fr-BE", { maximumFractionDigits: 0 })} € HTVA
          </span>
        </div>

        {/* Commandes en attente */}
        <div className={cn(
          "rounded-lg border p-4 flex flex-col gap-2 transition-colors",
          pendingCount > 0 ? "border-accent/40 bg-accent/5" : "border-border bg-card"
        )}>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">En attente de paiement</span>
            <div className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center",
              pendingCount > 0 ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-foreground"
            )}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {pendingCount}
            </span>
            <span className="text-xs text-muted-foreground">commandes en attente</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Volume en attente :{" "}
            {kpis.pending_ttc.toLocaleString("fr-BE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            € TTC
          </span>
        </div>

        {/* Crédits actifs réseau */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Crédits actifs en circulation</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {kpis.total_partner_credits_balance.toLocaleString("fr-BE")}
            </span>
            <span className="text-xs text-muted-foreground">crédits détenus</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Réserve liquide chez les installateurs certifiés
          </span>
        </div>

        {/* Commandes validées */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Commandes traitées</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {paidCount}
            </span>
            <span className="text-xs text-muted-foreground">commandes payées</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Taux d&apos;exécution : {orders.length > 0 ? Math.round((paidCount / orders.length) * 100) : 0} %
          </span>
        </div>
      </div>

      {/* 3. Filtres & Onglets de Statut */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Onglets de Statut */}
        <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "ALL"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Toutes</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({orders.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "pending"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>En attente</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-accent/20 px-1.5 py-0.2 font-mono text-[10px] tabular-nums font-bold text-accent-foreground">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("paid")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "paid"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Validées</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({paidCount})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("cancelled")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "cancelled"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Annulées</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({cancelledCount})
            </span>
          </button>
        </div>

        {/* Recherche Rapide */}
        <div className="relative min-w-[260px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher société, référence, email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* 4. Table Haute Densité des Commandes de Crédits */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
              <TableHead className="w-28 font-mono text-[11px] text-muted-foreground">Date</TableHead>
              <TableHead className="min-w-[200px]">Installateur Partenaire</TableHead>
              <TableHead className="w-40">Pack Commandé</TableHead>
              <TableHead className="w-32 text-right font-mono text-[11px] text-muted-foreground">Montant HTVA / TTC</TableHead>
              <TableHead className="min-w-[220px]">Référence Commande / Mollie</TableHead>
              <TableHead className="w-28 text-center font-mono text-[11px] text-muted-foreground">Statut</TableHead>
              <TableHead className="w-44 text-right">Action Opérationnelle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground italic">
                  Aucune commande ne correspond aux critères sélectionnés.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const isPending = order.status === "pending"
                const isPaid = order.status === "paid"
                const isCancelled = order.status === "cancelled"
                const isCopied = copiedRef === order.transfer_reference

                return (
                  <TableRow
                    key={order.id}
                    className="border-b border-border transition-colors hover:bg-secondary/20"
                  >
                    {/* Date */}
                    <TableCell className="font-mono text-[11px] tabular-nums whitespace-nowrap text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{new Date(order.created_at).toLocaleDateString("fr-BE")}</span>
                        <span className="text-[10px] text-muted-foreground/80">
                          {new Date(order.created_at).toLocaleTimeString("fr-BE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Société Partenaire */}
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

                    {/* Pack & Crédits */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{order.pack_name}</span>
                        <span className="font-mono text-[11px] tabular-nums font-semibold bg-secondary px-1.5 py-0.5 rounded border border-border">
                          +{order.credits} cr.
                        </span>
                      </div>
                    </TableCell>

                    {/* Montant */}
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

                    {/* Référence de Virement SEPA ou Mollie */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs tabular-nums bg-secondary/80 border border-border px-2 py-1 rounded select-all font-semibold tracking-wide">
                            {order.transfer_reference}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                            title="Copier la référence de virement"
                            onClick={() => handleCopyRef(order.transfer_reference)}
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                        {order.payment_provider === "mollie" ? (
                          <div className="flex items-center gap-1.5 text-[10px] text-accent font-medium">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                            <span>Paiement en ligne instantané (Mollie)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                            <span>Paiement en ligne</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="text-center">
                      {isPending && (
                        <Badge
                          variant="outline"
                          className="bg-accent/15 text-accent-foreground border-accent/30 font-medium text-[11px]"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                      {isPaid && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 font-medium text-[11px]"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Validé
                        </Badge>
                      )}
                      {isCancelled && (
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground border-border font-medium text-[11px]"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Annulé
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions Opérationnelles */}
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
                            Valider manuellement
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
                        <span className="text-[10px] text-muted-foreground italic">
                          Annulé par admin
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogue de Validation Manuelle */}
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
              Cette opération créditera immédiatement le compte de l&apos;installateur et lui enverra un email de confirmation.
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
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Référence commande :</span>
                  <code className="font-mono font-semibold bg-secondary px-1.5 py-0.5 rounded text-foreground">
                    {selectedOrderToValidate.transfer_reference}
                  </code>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validationNotes" className="text-xs">
                  Note comptable interne (optionnel)
                </Label>
                <Textarea
                  id="validationNotes"
                  placeholder="Ex : Constaté sur compte ou accord commercial..."
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  className="text-xs resize-none h-18"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrderToValidate(null)}
              disabled={validating}
            >
              Fermer
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmValidate}
              disabled={validating}
            >
              {validating ? "Crédit en cours…" : "Confirmer le crédit & notifier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue d'Annulation */}
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
              Êtes-vous certain de vouloir marquer cette commande comme annulée ? Aucun crédit ne sera injecté.
            </DialogDescription>
          </DialogHeader>

          {selectedOrderToCancel && (
            <div className="rounded-md border border-border bg-secondary/30 p-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Société :</span>
                <span className="font-semibold text-foreground">
                  {selectedOrderToCancel.partners?.company_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Référence :</span>
                <code className="font-mono text-foreground">
                  {selectedOrderToCancel.transfer_reference}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant :</span>
                <span className="font-mono font-bold text-foreground">
                  {selectedOrderToCancel.price_ttc.toFixed(2)} € TTC
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrderToCancel(null)}
              disabled={cancelling}
            >
              Retour
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelling}
            >
              {cancelling ? "Annulation…" : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
