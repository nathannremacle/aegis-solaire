"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2,
  CalendarClock,
  Coins,
  CreditCard,
  Download,
  ExternalLink,
  Gift,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  User,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  PIPELINE_STATUS_META,
  createEmptyPipelineCounts,
  formatLeadPurchaseLabel,
  normalizePipelineStatus,
  type PartnerPurchaseLeadItem,
  type PartnerPurchasesResponse,
  type PipelineStatusKey,
} from "@/lib/admin/partner-purchases"
import {
  PipelineStatusBadge,
  PipelineStatusFilterBar,
  extractCustomPartnerNotes,
} from "@/components/admin/pipeline-status-badge"

export interface PartnerDialogTarget {
  id: string
  company_name: string
  email?: string | null
  credits?: number | null
  segment?: string | null
}

interface PartnerPurchasesDialogProps {
  partner: PartnerDialogTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPipelineFilter?: PipelineStatusKey | "ALL"
}

function formatEur(value: number): string {
  return value.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDateParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "—", time: "—" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" }
  return {
    date: d.toLocaleDateString("fr-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("fr-BE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }
}

function formatDateTimeInline(iso: string | null | undefined): string {
  const { date, time } = formatDateParts(iso)
  if (date === "—") return "—"
  return `${date} à ${time.slice(0, 5)}`
}

function formatSegmentBadge(segment: string | null | undefined): string {
  if (!segment) return ""
  return segment.toUpperCase() === "BOTH" ? "B2B & B2C" : segment.toUpperCase()
}

function PaymentModeBadge({
  paymentMode,
  paymentMethod,
}: {
  paymentMode: PartnerPurchaseLeadItem["paymentMode"]
  paymentMethod: string | null
}) {
  if (paymentMode === "direct_mollie") {
    return (
      <Badge
        variant="outline"
        className="w-fit text-[10px] font-mono gap-1 border-accent/40 text-accent bg-accent/10 whitespace-nowrap"
      >
        <CreditCard className="h-2.5 w-2.5 shrink-0" />
        <span>Direct {paymentMethod ? `(${paymentMethod})` : "Mollie"}</span>
      </Badge>
    )
  }
  if (paymentMode === "free_assigned") {
    return (
      <Badge variant="outline" className="w-fit text-[10px] font-mono gap-1 whitespace-nowrap">
        <Gift className="h-2.5 w-2.5 shrink-0" />
        <span>Attribution offerte</span>
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="w-fit text-[10px] font-mono gap-1 whitespace-nowrap">
      <Coins className="h-2.5 w-2.5 shrink-0" />
      <span>Crédits marketplace</span>
    </Badge>
  )
}

function DisputeStatusBadge({
  dispute,
  creditsSpent,
}: {
  dispute: PartnerPurchaseLeadItem["dispute"]
  creditsSpent: number
}) {
  if (!dispute) return null
  const isRefunded = dispute.status === "approved"
  return (
    <Badge
      variant={isRefunded ? "destructive" : "outline"}
      className="text-[10px] font-mono tabular-nums py-0 h-5 whitespace-nowrap"
    >
      {isRefunded
        ? `Remboursé (+${dispute.creditsRefunded ?? creditsSpent} cr.)`
        : dispute.status === "pending"
          ? "Litige en cours"
          : `Litige : ${dispute.status}`}
    </Badge>
  )
}

/**
 * Modale détaillée de l'historique d'achats et du suivi CRM d'un installateur.
 */
export function PartnerPurchasesDialog({
  partner,
  open,
  onOpenChange,
  initialPipelineFilter = "ALL",
}: PartnerPurchasesDialogProps) {
  const [data, setData] = useState<PartnerPurchasesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [pipelineFilter, setPipelineFilter] = useState<PipelineStatusKey | "ALL">(
    initialPipelineFilter
  )
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc">("newest")

  const fetchPurchases = useCallback(async (partnerId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}/purchases`, {
        headers: { "x-admin-request": "true" },
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Impossible de charger l'historique des achats")
      }
      setData(json)
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement des achats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && partner?.id) {
      setSearch("")
      setSegmentFilter("ALL")
      setPipelineFilter(initialPipelineFilter)
      setSortBy("newest")
      setData(null)
      void fetchPurchases(partner.id)
    }
  }, [open, partner?.id, initialPipelineFilter, fetchPurchases])

  const pipelineCounts = useMemo(() => {
    if (data?.summary?.pipelineCounts) return data.summary.pipelineCounts
    const counts = createEmptyPipelineCounts()
    for (const item of data?.purchases ?? []) {
      counts[normalizePipelineStatus(item.pipelineStatus)] += 1
    }
    return counts
  }, [data])

  const filteredPurchases = useMemo(() => {
    const list = data?.purchases ?? []
    const q = search.toLowerCase().trim()

    const filtered = list.filter((item) => {
      if (segmentFilter !== "ALL" && item.lead?.segment !== segmentFilter) {
        return false
      }
      if (
        pipelineFilter !== "ALL" &&
        normalizePipelineStatus(item.pipelineStatus) !== pipelineFilter
      ) {
        return false
      }
      if (!q) return true
      const label = formatLeadPurchaseLabel(item.lead).toLowerCase()
      const email = (item.lead?.email || "").toLowerCase()
      const phone = (item.lead?.phone || "").toLowerCase()
      const city = (item.lead?.city || "").toLowerCase()
      const province = (item.lead?.province || "").toLowerCase()
      const postal = (item.lead?.postalCode || "").toLowerCase()
      const statusLabel =
        PIPELINE_STATUS_META[normalizePipelineStatus(item.pipelineStatus)].label.toLowerCase()
      return (
        label.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        province.includes(q) ||
        postal.includes(q) ||
        statusLabel.includes(q)
      )
    })

    const sorted = [...filtered]
    if (sortBy === "oldest") {
      sorted.sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt))
    } else if (sortBy === "amount_desc") {
      sorted.sort((a, b) => b.amountHtva - a.amountHtva || b.creditsSpent - a.creditsSpent)
    } else {
      sorted.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
    }
    return sorted
  }, [data?.purchases, search, segmentFilter, pipelineFilter, sortBy])

  function handleExportCsv() {
    if (!data || filteredPurchases.length === 0) return
    const escapeCell = (val: unknown) => {
      const s = String(val ?? "").replace(/"/g, '""')
      return `"${s}"`
    }

    const headers = [
      "Date",
      "Heure",
      "Lead",
      "Société",
      "Email",
      "Téléphone",
      "Segment",
      "Ville",
      "Code postal",
      "Province",
      "Mode paiement",
      "Crédits",
      "Montant HTVA (€)",
      "Montant TTC (€)",
      "Statut CRM",
      "MàJ CRM",
      "Litige",
    ]

    const rows = filteredPurchases.map((item) => {
      const { date, time } = formatDateParts(item.purchasedAt)
      const modeLabel =
        item.paymentMode === "direct_mollie"
          ? `Mollie Direct (${item.paymentMethod || "Bancontact"})`
          : item.paymentMode === "free_assigned"
            ? "Attribution offerte"
            : "Crédits marketplace"
      const disputeLabel = item.dispute
        ? `${item.dispute.status} (${item.dispute.creditsRefunded ?? 0} cr.)`
        : ""
      const statusLabel =
        PIPELINE_STATUS_META[normalizePipelineStatus(item.pipelineStatus)].label
      const crmUpdatedLabel =
        item.crmUpdatedAt && item.crmUpdatedAt !== item.purchasedAt
          ? formatDateTimeInline(item.crmUpdatedAt)
          : ""
      return [
        date,
        time,
        `${item.lead?.firstName || ""} ${item.lead?.lastName || ""}`.trim(),
        item.lead?.company || "",
        item.lead?.email || "",
        item.lead?.phone || "",
        item.lead?.segment || "",
        item.lead?.city || "",
        item.lead?.postalCode || "",
        item.lead?.province || "",
        modeLabel,
        item.creditsSpent,
        item.amountHtva.toFixed(2),
        item.amountTtc.toFixed(2),
        statusLabel,
        crmUpdatedLabel,
        disputeLabel,
      ]
        .map(escapeCell)
        .join(";")
    })

    const csvContent = "\uFEFF" + [headers.map(escapeCell).join(";"), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const slug = (partner?.company_name || "installateur")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
    link.href = url
    link.download = `achats-leads-${slug}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const displayPartner = data?.partner ?? partner
  const summary = data?.summary
  const segmentBadgeText = formatSegmentBadge(displayPartner?.segment)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[calc(100%-1.25rem)] sm:max-w-5xl max-h-[92dvh] flex flex-col gap-0 p-0 bg-card border-border overflow-hidden"
      >
        {/* 1. En-tête fixe */}
        <DialogHeader className="shrink-0 gap-2 border-b border-border px-4 sm:px-6 py-4 bg-card text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary border border-border text-foreground mt-0.5">
                <Building2 className="h-4 w-4 text-accent" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                    {displayPartner?.company_name || "Installateur"}
                  </DialogTitle>
                  {segmentBadgeText && (
                    <Badge variant="outline" className="font-mono text-[10px] py-0 h-5">
                      {segmentBadgeText}
                    </Badge>
                  )}
                  {displayPartner?.credits !== undefined && displayPartner?.credits !== null && (
                    <Badge
                      variant="secondary"
                      className="font-mono tabular-nums text-[11px] font-semibold py-0 h-5"
                    >
                      Solde : {displayPartner.credits} cr.
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {displayPartner?.email && (
                    <span className="truncate">{displayPartner.email}</span>
                  )}
                  {summary?.firstPurchaseAt && (
                    <span className="font-mono tabular-nums whitespace-nowrap">
                      1er achat : {formatDateTimeInline(summary.firstPurchaseAt)}
                    </span>
                  )}
                  {summary?.lastPurchaseAt && (
                    <span className="font-mono tabular-nums whitespace-nowrap">
                      Dernier : {formatDateTimeInline(summary.lastPurchaseAt)}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>

            {partner?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPurchases(partner.id)}
                disabled={loading}
                className="h-8 text-xs gap-1.5 shrink-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                <span>Actualiser</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 2. Corps défilant unique (confortable sur mobile comme sur desktop) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
          {/* Résumé chiffré */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                  <ShoppingBag className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="truncate">Leads achetés</span>
                </span>
                <span className="font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground">
                  {summary.totalLeadsPurchased}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground truncate">
                  {summary.b2bCount} B2B · {summary.b2cCount} B2C
                  {summary.refundedCount > 0 ? ` · ${summary.refundedCount} remb.` : ""}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                  <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">Montant leads</span>
                </span>
                <div className="flex items-baseline gap-1 font-mono tabular-nums whitespace-nowrap">
                  <span className="text-lg sm:text-xl font-bold text-foreground">
                    {formatEur(summary.totalAmountHtva)} €
                  </span>
                  <span className="text-[11px] text-muted-foreground">HT</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground truncate">
                  {formatEur(summary.totalAmountTtc)} € TTC
                </span>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                  <Coins className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="truncate">Crédits utilisés</span>
                </span>
                <span className="font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground whitespace-nowrap">
                  {summary.creditsDebitedCount} cr.
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground truncate">
                  {summary.creditPurchasesCount} via crédits
                  {summary.directMollieCount > 0
                    ? ` · ${summary.directMollieCount} direct`
                    : ""}
                  {summary.freeAssignedCount > 0
                    ? ` · ${summary.freeAssignedCount} offert(s)`
                    : ""}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">Packs payés</span>
                </span>
                <div className="flex items-baseline gap-1 font-mono tabular-nums whitespace-nowrap">
                  <span className="text-lg sm:text-xl font-bold text-foreground">
                    {formatEur(summary.totalOrdersPaidHtva)} €
                  </span>
                  <span className="text-[11px] text-muted-foreground">HT</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground truncate">
                  {summary.totalCreditsOrdered} cr. rechargés
                </span>
              </div>
            </div>
          )}

          {/* Barre CRM par statut (filtrage 1 clic) */}
          {data && data.purchases.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex flex-col gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Suivi CRM déclaré par l&apos;installateur
              </span>
              <PipelineStatusFilterBar
                counts={pipelineCounts}
                totalCount={data.purchases.length}
                selectedStatus={pipelineFilter}
                onSelectStatus={setPipelineFilter}
                compact
              />
            </div>
          )}

          {/* Barre de recherche, filtres et export */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrer par lead, ville, tél, statut…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
                {(["ALL", "B2B", "B2C"] as const).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => setSegmentFilter(seg)}
                    className={cn(
                      "px-2.5 py-1 rounded-sm font-medium transition-colors cursor-pointer",
                      segmentFilter === seg
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {seg === "ALL" ? "Tous" : seg}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === "newest" ? "oldest" : prev === "oldest" ? "amount_desc" : "newest"
                  )
                }
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {sortBy === "newest"
                    ? "Plus récents"
                    : sortBy === "oldest"
                      ? "Plus anciens"
                      : "Montant décroissant"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={!data || filteredPurchases.length === 0}
                onClick={handleExportCsv}
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </Button>
            </div>
          </div>

          {/* Liste des leads achetés */}
          {loading ? (
            <div className="rounded-lg border border-border p-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-accent" />
              <span>Chargement de l&apos;historique complet des achats…</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-border p-8 text-center flex flex-col items-center gap-3 text-xs">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-destructive font-medium">{error}</span>
              {partner?.id && (
                <Button size="sm" variant="outline" onClick={() => fetchPurchases(partner.id)}>
                  Réessayer
                </Button>
              )}
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="rounded-lg border border-border p-10 text-center text-xs text-muted-foreground italic">
              {data && data.purchases.length > 0
                ? "Aucun lead acheté ne correspond à ce filtre."
                : "Aucun lead acheté par cet installateur depuis son inscription."}
            </div>
          ) : (
            <>
              {/* Vue Mobile / Tablette : cartes empilées sans aucun débordement horizontal */}
              <div className="flex flex-col gap-2.5 md:hidden">
                {filteredPurchases.map((item: PartnerPurchaseLeadItem) => {
                  const { date, time } = formatDateParts(item.purchasedAt)
                  const lead = item.lead
                  const isB2B = lead?.segment === "B2B"
                  const isRefunded = item.dispute?.status === "approved"
                  const locationText = [
                    lead?.city,
                    lead?.postalCode ? `(${lead.postalCode})` : null,
                    !lead?.city && lead?.province ? lead.province.replace(/_/g, " ") : null,
                  ]
                    .filter(Boolean)
                    .join(" ")
                  const customNote = extractCustomPartnerNotes(item.notes)

                  return (
                    <div
                      key={item.purchaseId}
                      className={cn(
                        "rounded-lg border border-border bg-card p-3 flex flex-col gap-2.5",
                        isRefunded && "opacity-80 bg-destructive/5 border-destructive/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isB2B ? (
                              <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <Link
                              href={`/admin/leads?leadId=${item.leadId}`}
                              className="font-semibold text-sm text-foreground hover:text-accent hover:underline inline-flex items-center gap-1 min-w-0"
                            >
                              <span className="truncate">{formatLeadPurchaseLabel(lead)}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                            </Link>
                            {lead?.segment && (
                              <Badge
                                variant={isB2B ? "default" : "secondary"}
                                className="font-mono text-[10px] py-0 h-4 shrink-0"
                              >
                                {lead.segment}
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            Acheté le {date} à {time.slice(0, 5)}
                          </span>
                        </div>

                        <div className="flex flex-col items-end font-mono tabular-nums shrink-0">
                          <span
                            className={cn(
                              "font-bold text-sm text-foreground whitespace-nowrap",
                              isRefunded && "line-through text-muted-foreground"
                            )}
                          >
                            {formatEur(item.amountHtva)} € HT
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatEur(item.amountTtc)} € TTC ·{" "}
                            {item.paymentMode === "direct_mollie"
                              ? `éq. ${item.creditsSpent} cr.`
                              : `${item.creditsSpent} cr.`}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <PipelineStatusBadge status={item.pipelineStatus} />
                        <DisputeStatusBadge
                          dispute={item.dispute}
                          creditsSpent={item.creditsSpent}
                        />
                        <PaymentModeBadge
                          paymentMode={item.paymentMode}
                          paymentMethod={item.paymentMethod}
                        />
                      </div>

                      {item.crmUpdatedAt &&
                        item.crmUpdatedAt.slice(0, 16) !== item.purchasedAt.slice(0, 16) && (
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                            MàJ CRM : {formatDateTimeInline(item.crmUpdatedAt)}
                          </span>
                        )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                        {locationText && (
                          <span className="inline-flex items-center gap-1 capitalize">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="font-mono tabular-nums">{locationText}</span>
                          </span>
                        )}
                        {lead?.surfaceArea && (
                          <span className="font-mono tabular-nums">{lead.surfaceArea} m²</span>
                        )}
                        {lead?.estimatedPowerKwc && (
                          <span className="font-mono tabular-nums">
                            {lead.estimatedPowerKwc} kWc
                          </span>
                        )}
                        {lead?.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1 font-mono tabular-nums hover:text-foreground hover:underline"
                          >
                            <Phone className="h-3 w-3 shrink-0" />
                            {lead.phone}
                          </a>
                        )}
                        {lead?.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1 hover:text-foreground hover:underline truncate max-w-full"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        )}
                      </div>

                      {customNote && (
                        <p className="text-[11px] text-muted-foreground italic bg-muted/40 rounded px-2 py-1">
                          « {customNote} »
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Vue Desktop : table pleine largeur */}
              <div className="hidden md:block rounded-lg border border-border overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-secondary/70">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-32 font-mono text-[11px] text-muted-foreground">
                        Date &amp; Heure
                      </TableHead>
                      <TableHead className="min-w-[230px]">Lead acheté &amp; Coordonnées</TableHead>
                      <TableHead className="min-w-[180px]">Statut CRM &amp; Mode</TableHead>
                      <TableHead className="w-36 text-right font-mono text-[11px] text-muted-foreground">
                        Montant
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((item: PartnerPurchaseLeadItem) => {
                      const { date, time } = formatDateParts(item.purchasedAt)
                      const lead = item.lead
                      const isB2B = lead?.segment === "B2B"
                      const isRefunded = item.dispute?.status === "approved"
                      const locationText = [
                        lead?.city,
                        lead?.postalCode ? `(${lead.postalCode})` : null,
                        !lead?.city && lead?.province ? lead.province.replace(/_/g, " ") : null,
                      ]
                        .filter(Boolean)
                        .join(" ")
                      const customNote = extractCustomPartnerNotes(item.notes)

                      return (
                        <TableRow
                          key={item.purchaseId}
                          className={cn(
                            "border-b border-border transition-colors hover:bg-secondary/20",
                            isRefunded && "opacity-75 bg-destructive/5"
                          )}
                        >
                          <TableCell className="align-top font-mono tabular-nums whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground">{date}</span>
                              <span className="text-[11px] text-muted-foreground">{time}</span>
                            </div>
                          </TableCell>

                          <TableCell className="align-top">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isB2B ? (
                                  <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                                ) : (
                                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                )}
                                <Link
                                  href={`/admin/leads?leadId=${item.leadId}`}
                                  className="font-semibold text-foreground hover:text-accent hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{formatLeadPurchaseLabel(lead)}</span>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </Link>
                                {lead?.segment && (
                                  <Badge
                                    variant={isB2B ? "default" : "secondary"}
                                    className="font-mono text-[10px] py-0 h-4"
                                  >
                                    {lead.segment}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                {locationText && (
                                  <span className="inline-flex items-center gap-1 capitalize">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="font-mono tabular-nums">{locationText}</span>
                                  </span>
                                )}
                                {lead?.surfaceArea && (
                                  <span className="font-mono tabular-nums">
                                    {lead.surfaceArea} m²
                                  </span>
                                )}
                                {lead?.estimatedPowerKwc && (
                                  <span className="font-mono tabular-nums">
                                    {lead.estimatedPowerKwc} kWc
                                  </span>
                                )}
                              </div>

                              {(lead?.phone || lead?.email) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                  {lead?.phone && (
                                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                      <Phone className="h-3 w-3 shrink-0" />
                                      {lead.phone}
                                    </span>
                                  )}
                                  {lead?.email && (
                                    <span className="inline-flex items-center gap-1">
                                      <Mail className="h-3 w-3 shrink-0" />
                                      {lead.email}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="align-top">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <PipelineStatusBadge status={item.pipelineStatus} />
                                <DisputeStatusBadge
                                  dispute={item.dispute}
                                  creditsSpent={item.creditsSpent}
                                />
                              </div>

                              {item.crmUpdatedAt &&
                                item.crmUpdatedAt.slice(0, 16) !==
                                  item.purchasedAt.slice(0, 16) && (
                                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                    MàJ CRM : {formatDateTimeInline(item.crmUpdatedAt)}
                                  </span>
                                )}

                              {customNote && (
                                <span
                                  className="text-[11px] text-muted-foreground italic line-clamp-2"
                                  title={customNote}
                                >
                                  « {customNote} »
                                </span>
                              )}

                              <PaymentModeBadge
                                paymentMode={item.paymentMode}
                                paymentMethod={item.paymentMethod}
                              />
                            </div>
                          </TableCell>

                          <TableCell className="align-top text-right font-mono tabular-nums whitespace-nowrap">
                            <div className="flex flex-col items-end gap-0.5">
                              <span
                                className={cn(
                                  "font-bold text-sm text-foreground",
                                  isRefunded && "line-through text-muted-foreground"
                                )}
                              >
                                {formatEur(item.amountHtva)} €{" "}
                                <span className="text-[10px] font-normal text-muted-foreground">
                                  HT
                                </span>
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatEur(item.amountTtc)} € TTC
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {item.paymentMode === "direct_mollie"
                                  ? `(éq. ${item.creditsSpent} cr.)`
                                  : `${item.creditsSpent} cr.`}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* 3. Pied de modale fixe (toujours visible) */}
        <DialogFooter className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 sm:px-6 py-3 sm:justify-between">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {data
              ? `${filteredPurchases.length} / ${data.purchases.length} lead${data.purchases.length > 1 ? "s" : ""}`
              : ""}
          </span>

          <div className="flex items-center gap-2">
            {partner?.id && (
              <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
                <Link href={`/admin/partners?partnerId=${partner.id}`}>
                  <span>Fiche réseau</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Fermer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
