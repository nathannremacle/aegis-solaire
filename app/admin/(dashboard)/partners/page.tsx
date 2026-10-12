"use client"

import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Zap,
  CreditCard,
  ShoppingCart,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  Coins,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from "lucide-react"

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type Partner = {
  id: string
  company_name: string
  email: string
  phone: string | null
  credits: number
  segment: string | null
  target_provinces: string[] | null
  created_at: string
  stats: {
    leadsPurchased: number
    creditsSpent: number
    creditsTopupped: number
  }
}

type CreditOrder = {
  id: string
  partner_id: string
  pack_id: string
  pack_name: string
  credits: number
  price_htva: number
  vat_amount: number
  price_ttc: number
  transfer_reference: string
  status: "pending" | "paid" | "cancelled"
  created_at: string
  validated_at: string | null
  notes: string | null
  partners?: {
    id: string
    company_name: string
    email: string
    phone: string | null
    credits: number
  }
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

export default function AdminPartnersPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "partners">("orders")
  const [partners, setPartners] = useState<Partner[]>([])
  const [orders, setOrders] = useState<CreditOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)

  // Modals & Forms
  const [creditModal, setCreditModal] = useState<Partner | null>(null)
  const [creditAmount, setCreditAmount] = useState<number>(10)
  const [creditReason, setCreditReason] = useState<string>("Virement reçu")
  const [savingCredits, setSavingCredits] = useState(false)

  const [purchasesModal, setPurchasesModal] = useState<Partner | null>(null)
  const [purchasesData, setPurchasesData] = useState<any[]>([])
  const [loadingPurchases, setLoadingPurchases] = useState(false)

  // Filters
  const [searchPartner, setSearchPartner] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState<"ALL" | "pending" | "paid" | "cancelled">("ALL")
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  // Charger les partenaires
  const loadPartners = async () => {
    try {
      const res = await fetch("/api/admin/partners", { headers: { "x-admin-request": "true" } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPartners(data)
    } catch {
      toast.error("Impossible de charger les partenaires")
    } finally {
      setLoading(false)
    }
  }

  // Charger les commandes de crédits
  const loadOrders = async () => {
    setLoadingOrders(true)
    try {
      const res = await fetch("/api/admin/credit-orders", { headers: { "x-admin-request": "true" } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Impossible de charger les commandes de crédits")
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    loadPartners()
    loadOrders()
  }, [])

  // Validation manuelle d'une commande de virement
  async function handleValidateOrder(order: CreditOrder) {
    if (!confirm(`Confirmer la réception du virement de ${order.price_ttc.toFixed(2)} € TTC et attribuer ${order.credits} crédits à ${order.partners?.company_name || "l'installateur"} ?`)) {
      return
    }

    setProcessingOrderId(order.id)
    try {
      const res = await fetch(`/api/admin/credit-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ action: "validate" }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Échec validation")

      toast.success(`Virement validé ! ${order.credits} crédits ajoutés à ${order.partners?.company_name || "l'installateur"}.`)
      
      // Mettre à jour localement les commandes et le solde du partenaire en direct
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "paid", validated_at: new Date().toISOString() } : o))
      )
      setPartners((prev) =>
        prev.map((p) => (p.id === order.partner_id ? { ...p, credits: (p.credits || 0) + order.credits } : p))
      )
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation")
    } finally {
      setProcessingOrderId(null)
    }
  }

  // Annulation d'une commande
  async function handleCancelOrder(order: CreditOrder) {
    if (!confirm(`Annuler cette commande de ${order.credits} crédits pour ${order.partners?.company_name || "l'installateur"} ?`)) {
      return
    }

    setProcessingOrderId(order.id)
    try {
      const res = await fetch(`/api/admin/credit-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ action: "cancel" }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Échec annulation")

      toast.info("Commande marquée comme annulée.")
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "cancelled" } : o))
      )
    } catch (err: any) {
      toast.error(err.message || "Erreur")
    } finally {
      setProcessingOrderId(null)
    }
  }

  // Attribution manuelle de crédits
  async function handleManualAddCredits() {
    if (!creditModal || creditAmount === 0) return
    setSavingCredits(true)
    try {
      const res = await fetch(`/api/admin/partners/${creditModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({
          addCredits: creditAmount,
          reference: creditReason || "admin_manual",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur attribution")

      setPartners((prev) =>
        prev.map((p) => (p.id === creditModal.id ? { ...p, credits: data.newCredits } : p))
      )
      toast.success(`${creditAmount > 0 ? `+${creditAmount}` : creditAmount} crédits appliqués avec succès (${creditModal.company_name})`)
      setCreditModal(null)
      loadOrders()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'attribution des crédits")
    } finally {
      setSavingCredits(false)
    }
  }

  // Consultation des achats d'un partenaire
  async function openPurchases(partner: Partner) {
    if (partner.stats.leadsPurchased === 0) return
    setPurchasesModal(partner)
    setLoadingPurchases(true)
    setPurchasesData([])
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/purchases`, {
        headers: { "x-admin-request": "true" },
      })
      const data = await res.json()
      setPurchasesData(data)
    } catch {
      toast.error("Impossible de charger les achats")
    } finally {
      setLoadingPurchases(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedRef(text)
    toast.success("Référence copiée dans le presse-papier")
    setTimeout(() => setCopiedRef(null), 2000)
  }

  // Calculs KPI
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length
  const pendingOrdersAmount = orders
    .filter((o) => o.status === "pending")
    .reduce((s, o) => s + (Number(o.price_ttc) || 0), 0)

  const totalCreditsCirculation = partners.reduce((s, p) => s + p.credits, 0)
  const totalLeadsPurchased = partners.reduce((s, p) => s + p.stats.leadsPurchased, 0)
  const totalCreditsTopupped = partners.reduce((s, p) => s + p.stats.creditsTopupped, 0)

  // Filtrage
  const filteredPartners = useMemo(() => {
    if (!searchPartner.trim()) return partners
    const q = searchPartner.toLowerCase()
    return partners.filter(
      (p) => p.company_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
  }, [partners, searchPartner])

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === "ALL") return orders
    return orders.filter((o) => o.status === orderStatusFilter)
  }, [orders, orderStatusFilter])

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Marketplace &amp; Gestion des Crédits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Validation des virements bancaires, attribution manuelle de crédits et suivi du vivier partenaires.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadPartners()
              loadOrders()
              toast.info("Données actualisées")
            }}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* ─── Métriques KPI en grille ─── */}
      <div className="grid gap-4 sm:grid-cols-4">
        {/* Card 1 : Commandes en attente */}
        <div
          onClick={() => {
            setActiveTab("orders")
            setOrderStatusFilter("pending")
          }}
          className={`cursor-pointer rounded-2xl border p-4 shadow-xs transition-all ${
            pendingOrdersCount > 0
              ? "border-amber-300 bg-amber-50/60 hover:bg-amber-100/60"
              : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={pendingOrdersCount > 0 ? "text-amber-800" : "text-muted-foreground"}>
              Virements à vérifier
            </span>
            <Clock className={`h-4 w-4 ${pendingOrdersCount > 0 ? "text-amber-600 animate-pulse" : "text-muted-foreground"}`} />
          </div>
          <p className={`mt-2 text-2xl font-extrabold tabular-nums ${pendingOrdersCount > 0 ? "text-amber-900" : "text-foreground"}`}>
            {pendingOrdersCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {pendingOrdersCount > 0 ? `${pendingOrdersAmount.toFixed(2)} € TTC à encaisser` : "Toutes les commandes sont à jour"}
          </p>
        </div>

        {/* Card 2 : Crédits en circulation */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Crédits en circulation</span>
            <Zap className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">{totalCreditsCirculation}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{partners.length} partenaires actifs</p>
        </div>

        {/* Card 3 : Leads achetés */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Leads débloqués (total)</span>
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-600">{totalLeadsPurchased}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Sur la marketplace wallonne</p>
        </div>

        {/* Card 4 : Total rechargé */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Total crédits alloués</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">{totalCreditsTopupped}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cumul des recharges validées</p>
        </div>
      </div>

      {/* ─── Onglets Principaux ─── */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "orders"
              ? "bg-[#001D3D] text-white shadow-sm"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Commandes de crédits &amp; Virements
          {pendingOrdersCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-[#001D3D] animate-pulse">
              {pendingOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("partners")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "partners"
              ? "bg-[#001D3D] text-white shadow-sm"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Installateurs &amp; Soldes ({partners.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
          ONGLET 1 : COMMANDES DE CRÉDITS & VIREMENTS
          ═══════════════════════════════════════════════════ */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Barre d'outils commandes */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Filtrer par statut :</span>
              {(["ALL", "pending", "paid", "cancelled"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    orderStatusFilter === st
                      ? "bg-[#001D3D] text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st === "ALL"
                    ? "Toutes"
                    : st === "pending"
                    ? `En attente (${pendingOrdersCount})`
                    : st === "paid"
                    ? "Validées"
                    : "Annulées"}
                </button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground">
              Compte bénéficiaire : <strong>BE84 0020 3534 7259</strong> (INIT42)
            </div>
          </div>

          {loadingOrders ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement des commandes…
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <h3 className="font-bold text-foreground">Aucune commande de crédits trouvée</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {orderStatusFilter === "pending"
                  ? "Tous les virements ont été traités !"
                  : "Les demandes de recharges passées par les installateurs apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Installateur</th>
                      <th className="px-4 py-3">Pack &amp; Crédits</th>
                      <th className="px-4 py-3">Montant</th>
                      <th className="px-4 py-3">Communication virement</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOrders.map((order) => {
                      const isPending = order.status === "pending"
                      const isPaid = order.status === "paid"
                      const isCancelled = order.status === "cancelled"
                      const isProcessing = processingOrderId === order.id

                      return (
                        <tr
                          key={order.id}
                          className={`transition-colors ${
                            isPending ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-muted/40"
                          }`}
                        >
                          {/* Date */}
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString("fr-BE", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          {/* Installateur */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-foreground">
                              {order.partners?.company_name || "Installateur"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {order.partners?.email}
                            </div>
                          </td>

                          {/* Pack */}
                          <td className="px-4 py-3">
                            <span className="font-semibold text-foreground">{order.pack_name}</span>
                            <span className="ml-2 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-[#001D3D]">
                              +{order.credits} cr
                            </span>
                          </td>

                          {/* Montant */}
                          <td className="px-4 py-3">
                            <div className="font-extrabold text-foreground tabular-nums">
                              {Number(order.price_ttc).toFixed(2)} € <span className="text-[10px] text-muted-foreground font-normal">TTC</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground tabular-nums">
                              {Number(order.price_htva).toFixed(2)} € HTVA
                            </div>
                          </td>

                          {/* Référence communication */}
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-xs font-bold text-slate-800">
                              <span>{order.transfer_reference}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(order.transfer_reference)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Copier la référence de virement"
                              >
                                {copiedRef === order.transfer_reference ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Statut */}
                          <td className="px-4 py-3">
                            {isPending ? (
                              <Badge className="border-amber-300 bg-amber-100 text-amber-900 gap-1 font-bold">
                                <Clock className="h-3 w-3" />
                                En attente virement
                              </Badge>
                            ) : isPaid ? (
                              <Badge className="border-emerald-300 bg-emerald-100 text-emerald-900 gap-1 font-bold">
                                <CheckCircle2 className="h-3 w-3" />
                                Virement validé
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground gap-1">
                                <XCircle className="h-3 w-3" />
                                Annulée
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleValidateOrder(order)}
                                  disabled={isProcessing}
                                  className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-xs"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Valider (+{order.credits} cr)
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelOrder(order)}
                                  disabled={isProcessing}
                                  className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  Annuler
                                </Button>
                              </div>
                            ) : isPaid ? (
                              <span className="text-xs text-muted-foreground font-mono">
                                Traitée le {new Date(order.validated_at || order.created_at).toLocaleDateString("fr-BE")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Non encaissée</span>
                            )}
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

      {/* ═══════════════════════════════════════════════════
          ONGLET 2 : INSTALLATEURS & SOLDES CRÉDITS
          ═══════════════════════════════════════════════════ */}
      {activeTab === "partners" && (
        <div className="space-y-4">
          {/* Recherche & Filtres */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher une entreprise ou un email…"
                value={searchPartner}
                onChange={(e) => setSearchPartner(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
              {searchPartner && (
                <button
                  onClick={() => setSearchPartner("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground font-medium">
              {filteredPartners.length} partenaire{filteredPartners.length > 1 ? "s" : ""} référencé{filteredPartners.length > 1 ? "s" : ""}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement des partenaires…
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <h3 className="font-bold text-foreground">Aucun partenaire trouvé</h3>
              <p className="text-xs text-muted-foreground mt-1">Aucun installateur ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Entreprise</th>
                      <th className="px-4 py-3">Email &amp; Téléphone</th>
                      <th className="px-4 py-3">Segment</th>
                      <th className="px-4 py-3 text-right">Solde Crédits</th>
                      <th className="px-4 py-3 text-right">Leads Achetés</th>
                      <th className="px-4 py-3 text-right">Crédits Dépensés</th>
                      <th className="px-4 py-3 text-right">Total Rechargé</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPartners.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{p.company_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Inscrit le {new Date(p.created_at).toLocaleDateString("fr-BE")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-foreground">{p.email}</div>
                          {p.phone && <div className="text-muted-foreground font-mono">{p.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {p.segment ?? "B2B & B2C"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-sm font-extrabold tabular-nums ${
                              p.credits > 10
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : p.credits > 0
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            {p.credits} cr
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.stats.leadsPurchased > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 hover:bg-muted font-bold"
                              onClick={() => openPurchases(p)}
                              title="Voir les leads achetés"
                            >
                              <span className="tabular-nums">{p.stats.leadsPurchased}</span>
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          ) : (
                            <span className="tabular-nums text-muted-foreground mr-6">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground font-medium">
                          {p.stats.creditsSpent}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground font-bold">
                          +{p.stats.creditsTopupped}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCreditModal(p)
                              setCreditAmount(25)
                              setCreditReason("Virement reçu")
                            }}
                            className="h-8 gap-1.5 rounded-lg border-border font-semibold text-xs shadow-2xs hover:bg-[#001D3D] hover:text-white transition-all"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            Gérer les crédits
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

      {/* ─── Modal d'Attribution Manuelle de Crédits ─── */}
      <Dialog open={!!creditModal} onOpenChange={(o) => !o && setCreditModal(null)}>
        {creditModal && (
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-accent" />
                Ajuster les crédits — {creditModal.company_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3 text-xs">
                <span className="text-muted-foreground">Solde actuel :</span>
                <span className="font-extrabold text-foreground text-sm font-mono">{creditModal.credits} crédits</span>
              </div>

              {/* Raccourcis rapides */}
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">Montants rapides</Label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCreditAmount(amt)}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        creditAmount === amt
                          ? "border-[#001D3D] bg-[#001D3D] text-white shadow-xs"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      +{amt} cr
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ personnalisé */}
              <div className="space-y-1.5">
                <Label htmlFor="creditAmount" className="text-xs">Nombre de crédits (positif ou négatif)</Label>
                <Input
                  id="creditAmount"
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="rounded-xl h-10 font-mono font-bold"
                />
              </div>

              {/* Motif / Référence */}
              <div className="space-y-1.5">
                <Label htmlFor="creditReason" className="text-xs">Motif de l'opération (pour l'audit)</Label>
                <select
                  id="creditReason"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 h-10 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#001D3D]"
                >
                  <option value="Virement bancaire validé">Virement bancaire validé</option>
                  <option value="Pack Découverte offert">Pack Découverte offert</option>
                  <option value="Geste commercial / compensation">Geste commercial / compensation</option>
                  <option value="Régularisation administrative">Régularisation administrative</option>
                  <option value="Autre ajustement manuel">Autre ajustement manuel</option>
                </select>
              </div>

              {/* Aperçu nouveau solde */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
                <span className="font-semibold text-emerald-800">Nouveau solde calculé :</span>
                <span className="font-extrabold text-emerald-900 text-sm font-mono">
                  {creditModal.credits + creditAmount} crédits
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setCreditModal(null)} className="rounded-xl">
                Annuler
              </Button>
              <Button
                onClick={handleManualAddCredits}
                disabled={savingCredits || creditAmount === 0}
                className="rounded-xl bg-[#001D3D] font-bold text-white hover:bg-[#002855]"
              >
                {savingCredits ? "Enregistrement…" : `Appliquer (${creditAmount > 0 ? `+${creditAmount}` : creditAmount} cr)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ─── Modal Historique Achats Partenaire ─── */}
      <Dialog open={!!purchasesModal} onOpenChange={(o) => !o && setPurchasesModal(null)}>
        {purchasesModal && (
          <DialogContent className="max-w-3xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                Leads débloqués par {purchasesModal.company_name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {loadingPurchases ? (
                <p className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des achats…
                </p>
              ) : purchasesData.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Aucun achat enregistré.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky top-0 bg-muted/95 backdrop-blur z-10">
                      <th className="px-4 py-2.5 text-left">Date d'achat</th>
                      <th className="px-4 py-2.5 text-left">Contact lead</th>
                      <th className="px-4 py-2.5 text-left">Segment</th>
                      <th className="px-4 py-2.5 text-left">Caractéristiques</th>
                      <th className="px-4 py-2.5 text-right">Crédits déduits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchasesData.map((p, i) => {
                      const l = p.lead
                      return (
                        <tr key={i} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(p.purchased_at).toLocaleDateString("fr-BE", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-foreground">
                              {l?.first_name} {l?.last_name || l?.email?.split("@")[0]}
                            </div>
                            <div className="text-xs text-muted-foreground">{l?.email}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              {l?.segment ?? "B2B"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {l?.province?.replace("_", " ") ?? "—"} · {l?.surface_area} m²
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600">
                            -{p.credits_spent} cr
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
