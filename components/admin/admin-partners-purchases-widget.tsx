"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Coins,
  ExternalLink,
  ListChecks,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  PIPELINE_STATUS_META,
  PIPELINE_STATUS_ORDER,
  createEmptyPipelineCounts,
  type AdminPartnerPurchaseCrmItem,
  type AdminPartnerPurchaseSummary,
  type PipelineStatusKey,
} from "@/lib/admin/partner-purchases"
import {
  PartnerPurchasesDialog,
  type PartnerDialogTarget,
} from "@/components/admin/partner-purchases-dialog"
import {
  PipelineStatusBadge,
  PipelineStatusFilterBar,
} from "@/components/admin/pipeline-status-badge"

interface AdminPartnersPurchasesWidgetProps {
  partners: AdminPartnerPurchaseSummary[]
}

interface FlattenedCrmPurchaseItem extends AdminPartnerPurchaseCrmItem {
  partner: AdminPartnerPurchaseSummary
}

function formatDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" }
  return {
    date: d.toLocaleDateString("fr-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("fr-BE", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }
}

function formatEur(value: number): string {
  return value.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function AdminPartnersPurchasesWidget({
  partners,
}: AdminPartnersPurchasesWidgetProps) {
  const realPartners = useMemo(() => partners.filter((p) => !p.is_test), [partners])
  const testPartners = useMemo(() => partners.filter((p) => p.is_test), [partners])

  const realWithPurchases = useMemo(
    () => realPartners.filter((p) => p.leads_purchased_count > 0).length,
    [realPartners]
  )
  const testWithPurchases = useMemo(
    () => testPartners.filter((p) => p.leads_purchased_count > 0).length,
    [testPartners]
  )

  const [includeTest, setIncludeTest] = useState(
    realWithPurchases === 0 && testWithPurchases > 0
  )
  const [onlyWithPurchases, setOnlyWithPurchases] = useState(false)
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"partners" | "leads">("partners")
  const [selectedPipelineStatus, setSelectedPipelineStatus] = useState<
    PipelineStatusKey | "ALL"
  >("ALL")
  const [selectedPartner, setSelectedPartner] = useState<PartnerDialogTarget | null>(null)
  const [dialogInitialPipelineFilter, setDialogInitialPipelineFilter] = useState<
    PipelineStatusKey | "ALL"
  >("ALL")

  const scopedPartners = useMemo(
    () => (includeTest ? partners : realPartners),
    [partners, realPartners, includeTest]
  )

  const visiblePartners = useMemo(() => {
    let list = scopedPartners
    if (onlyWithPurchases) {
      list = list.filter((p) => p.leads_purchased_count > 0)
    }
    if (selectedPipelineStatus !== "ALL") {
      list = list.filter(
        (p) => (p.pipeline_counts?.[selectedPipelineStatus] ?? 0) > 0
      )
    }
    const q = search.toLowerCase().trim()
    if (!q) return list
    return list.filter((p) => {
      const name = (p.company_name || "").toLowerCase()
      const email = (p.email || "").toLowerCase()
      const lastLead = (p.last_purchase?.lead_label || "").toLowerCase()
      const hasMatchingPurchase = (p.purchases ?? []).some((item) => {
        const label = item.lead_label.toLowerCase()
        const city = (item.city || "").toLowerCase()
        const postal = (item.postal_code || "").toLowerCase()
        return label.includes(q) || city.includes(q) || postal.includes(q)
      })
      return (
        name.includes(q) ||
        email.includes(q) ||
        lastLead.includes(q) ||
        hasMatchingPurchase
      )
    })
  }, [scopedPartners, onlyWithPurchases, selectedPipelineStatus, search])

  const totals = useMemo(() => {
    const pipelineCounts = createEmptyPipelineCounts()
    const summary = scopedPartners.reduce(
      (acc, p) => {
        acc.leads += p.leads_purchased_count
        acc.credits += p.total_credits_spent
        acc.htva += p.total_euros_htva
        if (p.leads_purchased_count > 0) acc.buyers += 1
        for (const key of PIPELINE_STATUS_ORDER) {
          pipelineCounts[key] += p.pipeline_counts?.[key] ?? 0
        }
        return acc
      },
      { leads: 0, credits: 0, htva: 0, buyers: 0 }
    )
    return { ...summary, pipelineCounts }
  }, [scopedPartners])

  const flattenedLeads = useMemo<FlattenedCrmPurchaseItem[]>(() => {
    const items: FlattenedCrmPurchaseItem[] = []
    for (const p of scopedPartners) {
      for (const pur of p.purchases ?? []) {
        items.push({ ...pur, partner: p })
      }
    }

    const q = search.toLowerCase().trim()
    const filtered = items.filter((item) => {
      if (
        selectedPipelineStatus !== "ALL" &&
        item.pipeline_status !== selectedPipelineStatus
      ) {
        return false
      }
      if (!q) return true
      const statusLabel =
        PIPELINE_STATUS_META[item.pipeline_status].label.toLowerCase()
      return (
        item.lead_label.toLowerCase().includes(q) ||
        item.partner.company_name.toLowerCase().includes(q) ||
        item.partner.email.toLowerCase().includes(q) ||
        (item.city || "").toLowerCase().includes(q) ||
        (item.postal_code || "").toLowerCase().includes(q) ||
        (item.phone || "").toLowerCase().includes(q) ||
        statusLabel.includes(q)
      )
    })

    filtered.sort((a, b) => {
      const aDate = a.crm_updated_at || a.purchased_at
      const bDate = b.crm_updated_at || b.purchased_at
      return bDate.localeCompare(aDate)
    })
    return filtered
  }, [scopedPartners, selectedPipelineStatus, search])

  function openPartnerDialog(
    partner: PartnerDialogTarget,
    initialFilter: PipelineStatusKey | "ALL" = "ALL"
  ) {
    setDialogInitialPipelineFilter(initialFilter)
    setSelectedPartner(partner)
  }

  function handleSelectPipelinePill(status: PipelineStatusKey | "ALL") {
    setSelectedPipelineStatus(status)
    if (status !== "ALL") {
      setViewMode("leads")
    }
  }

  return (
    <>
      <Card className="border-border bg-card shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Achats &amp; Suivi CRM Installateurs (Depuis le début)
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                {totals.leads} lead{totals.leads > 1 ? "s" : ""} · {formatEur(totals.htva)} € HT
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Suivez en direct combien de leads chaque installateur a marqués comme contactés, en RDV, devis envoyés, gagnés ou perdus, et cliquez pour voir le détail exact.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs font-semibold gap-1.5 border-border"
          >
            <Link href="/admin/partners">
              <span>Gérer le réseau</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* Synthèse globale des statuts CRM déclarés par les installateurs */}
          <div className="border-b border-border bg-secondary/25 px-5 py-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Répartition CRM globale ({totals.leads} lead{totals.leads > 1 ? "s" : ""} acheté{totals.leads > 1 ? "s" : ""}) — Cliquer sur un statut pour voir les leads
              </span>
              <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode("partners")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-medium transition-colors cursor-pointer",
                    viewMode === "partners"
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-3 w-3" />
                  <span>Par installateur ({visiblePartners.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("leads")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-medium transition-colors cursor-pointer",
                    viewMode === "leads"
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListChecks className="h-3 w-3" />
                  <span className="font-mono tabular-nums">
                    Par statut &amp; leads ({flattenedLeads.length})
                  </span>
                </button>
              </div>
            </div>

            <PipelineStatusFilterBar
              counts={totals.pipelineCounts}
              totalCount={totals.leads}
              selectedStatus={selectedPipelineStatus}
              onSelectStatus={handleSelectPipelinePill}
              compact
            />
          </div>

          {/* Barre de filtres */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 bg-card">
            <div className="relative min-w-[220px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={
                  viewMode === "leads"
                    ? "Rechercher un lead, ville, installateur, statut…"
                    : "Rechercher installateur, e-mail, lead acheté…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {viewMode === "partners" && (
                <button
                  type="button"
                  onClick={() => setOnlyWithPurchases((prev) => !prev)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                    onlyWithPurchases
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  Avec achats ({totals.buyers})
                </button>
              )}

              {testPartners.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIncludeTest((prev) => !prev)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                    includeTest
                      ? "border-primary/40 bg-secondary text-foreground font-semibold"
                      : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {includeTest
                    ? `Comptes test inclus (${testPartners.length})`
                    : `Inclure comptes test (${testPartners.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Vue 1 : Par installateur */}
          {viewMode === "partners" ? (
            visiblePartners.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                Aucun installateur ne correspond aux filtres sélectionnés.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader className="sticky top-0 z-10 bg-secondary/90 backdrop-blur-xs">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="min-w-[200px] pl-5">Installateur</TableHead>
                      <TableHead className="w-24 text-right font-mono text-[11px] text-muted-foreground">
                        Achetés
                      </TableHead>
                      <TableHead className="min-w-[240px]">
                        Suivi CRM (Cliquer pour filtrer)
                      </TableHead>
                      <TableHead className="w-32 text-right font-mono text-[11px] text-muted-foreground">
                        Total dépensé
                      </TableHead>
                      <TableHead className="min-w-[220px]">
                        Dernier lead acheté
                      </TableHead>
                      <TableHead className="w-20 text-right font-mono text-[11px] text-muted-foreground">
                        Solde
                      </TableHead>
                      <TableHead className="w-24 text-right pr-5">Détail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePartners.map((partner) => {
                      const lastDt = formatDateTime(partner.last_purchase_at)
                      const isLowCredits = partner.credits < 5
                      const segmentLabel =
                        partner.segment === "B2B"
                          ? "B2B"
                          : partner.segment === "B2C"
                            ? "B2C"
                            : "B2B & B2C"

                      const nonZeroStatuses = PIPELINE_STATUS_ORDER.filter(
                        (key) => (partner.pipeline_counts?.[key] ?? 0) > 0
                      )

                      return (
                        <TableRow
                          key={partner.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openPartnerDialog(partner, "ALL")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openPartnerDialog(partner, "ALL")
                            }
                          }}
                          className="border-b border-border transition-colors hover:bg-muted/50 cursor-pointer group"
                        >
                          {/* Installateur */}
                          <TableCell className="pl-5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
                                <span className="font-semibold text-foreground group-hover:text-accent transition-colors">
                                  {partner.company_name}
                                </span>
                                <Badge variant="outline" className="font-mono text-[10px] py-0 h-4">
                                  {segmentLabel}
                                </Badge>
                                {partner.is_test && (
                                  <Badge variant="secondary" className="font-mono text-[9px] py-0 h-4">
                                    TEST
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                                {partner.email}
                              </span>
                            </div>
                          </TableCell>

                          {/* Leads achetés */}
                          <TableCell className="text-right font-mono tabular-nums">
                            {partner.leads_purchased_count > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-sm text-foreground">
                                  {partner.leads_purchased_count}
                                </span>
                                {partner.refunded_leads_count > 0 && (
                                  <span className="text-[10px] text-destructive">
                                    dont {partner.refunded_leads_count} remb.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>

                          {/* Suivi CRM par statut */}
                          <TableCell>
                            {partner.leads_purchased_count === 0 ? (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                {nonZeroStatuses.map((statusKey) => {
                                  const meta = PIPELINE_STATUS_META[statusKey]
                                  const count = partner.pipeline_counts[statusKey]
                                  return (
                                    <button
                                      key={statusKey}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openPartnerDialog(partner, statusKey)
                                      }}
                                      title={`Voir les ${count} lead(s) « ${meta.label} » de ${partner.company_name}`}
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-85 cursor-pointer",
                                        meta.badgeClass
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "h-1.5 w-1.5 rounded-full shrink-0",
                                          meta.dotClass
                                        )}
                                      />
                                      <span className="font-mono tabular-nums font-bold">
                                        {count}
                                      </span>
                                      <span>{meta.shortLabel}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </TableCell>

                          {/* Total dépensé */}
                          <TableCell className="text-right font-mono tabular-nums">
                            {partner.leads_purchased_count > 0 ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-bold text-foreground">
                                  {formatEur(partner.total_euros_htva)} €{" "}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    HT
                                  </span>
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {partner.total_credits_spent} cr.
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Dernier achat */}
                          <TableCell>
                            {partner.last_purchase ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-medium text-foreground truncate max-w-[150px]">
                                    {partner.last_purchase.lead_label}
                                  </span>
                                  {partner.last_purchase.segment && (
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-[9px] py-0 h-4 shrink-0"
                                    >
                                      {partner.last_purchase.segment}
                                    </Badge>
                                  )}
                                  <PipelineStatusBadge
                                    status={partner.last_purchase.pipeline_status}
                                    compact
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono tabular-nums text-muted-foreground">
                                  <span>
                                    {lastDt.date} à {lastDt.time}
                                  </span>
                                  <span>·</span>
                                  <span className="font-semibold text-foreground">
                                    {formatEur(partner.last_purchase.amount_htva)} € HT
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                Aucun lead acheté
                              </span>
                            )}
                          </TableCell>

                          {/* Solde */}
                          <TableCell className="text-right font-mono tabular-nums">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded border text-[11px]",
                                isLowCredits
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-secondary text-foreground border-border"
                              )}
                            >
                              <Coins className="h-3 w-3" />
                              <span>{partner.credits}</span>
                            </span>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-right pr-5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
                              <span>Détail</span>
                              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          ) : flattenedLeads.length === 0 ? (
            /* Vue 2 : Détail par lead et statut CRM */
            <div className="p-8 text-center text-xs text-muted-foreground italic">
              Aucun lead acheté ne correspond au statut ou à la recherche sélectionnée.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <Table className="text-xs">
                <TableHeader className="sticky top-0 z-10 bg-secondary/90 backdrop-blur-xs">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="min-w-[155px] pl-5">Statut CRM &amp; MàJ</TableHead>
                    <TableHead className="min-w-[230px]">Lead concerné</TableHead>
                    <TableHead className="min-w-[190px]">Installateur acheteur</TableHead>
                    <TableHead className="w-36 font-mono text-[11px] text-muted-foreground">
                      Acheté le
                    </TableHead>
                    <TableHead className="w-28 text-right pr-5 font-mono text-[11px] text-muted-foreground">
                      Montant
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flattenedLeads.map((item) => {
                    const boughtDt = formatDateTime(item.purchased_at)
                    const updatedDt = formatDateTime(item.crm_updated_at)
                    const hasUpdatedAfterBuy =
                      Boolean(item.crm_updated_at) &&
                      item.crm_updated_at!.slice(0, 16) !== item.purchased_at.slice(0, 16)
                    const locationText = [item.postal_code, item.city]
                      .filter(Boolean)
                      .join(" ")

                    return (
                      <TableRow
                        key={item.purchase_id}
                        className="border-b border-border transition-colors hover:bg-muted/40"
                      >
                        {/* Statut CRM & MàJ */}
                        <TableCell className="pl-5 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <PipelineStatusBadge status={item.pipeline_status} />
                              {item.dispute_status && (
                                <Badge
                                  variant={
                                    item.dispute_status === "approved"
                                      ? "destructive"
                                      : "outline"
                                  }
                                  className="text-[10px] font-mono py-0 h-4"
                                >
                                  {item.dispute_status === "pending"
                                    ? "Litige ouvert"
                                    : item.dispute_status === "approved"
                                      ? "Remboursé"
                                      : `Litige : ${item.dispute_status}`}
                                </Badge>
                              )}
                            </div>
                            {hasUpdatedAfterBuy && (
                              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                MàJ {updatedDt.date} à {updatedDt.time}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Lead concerné */}
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/admin/leads?leadId=${item.lead_id}`}
                                className="font-semibold text-foreground hover:text-accent hover:underline inline-flex items-center gap-1"
                              >
                                <span>{item.lead_label}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </Link>
                              {item.segment && (
                                <Badge
                                  variant={item.segment === "B2B" ? "default" : "secondary"}
                                  className="font-mono text-[9px] py-0 h-4"
                                >
                                  {item.segment}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-muted-foreground">
                              {locationText && (
                                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {locationText}
                                </span>
                              )}
                              {item.phone && (
                                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {item.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Installateur acheteur */}
                        <TableCell className="align-top">
                          <button
                            type="button"
                            onClick={() =>
                              openPartnerDialog(item.partner, item.pipeline_status)
                            }
                            className="flex flex-col text-left group/partner cursor-pointer"
                          >
                            <span className="font-medium text-foreground group-hover/partner:text-accent group-hover/partner:underline flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>{item.partner.company_name}</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[190px]">
                              {item.partner.email}
                            </span>
                          </button>
                        </TableCell>

                        {/* Date achat */}
                        <TableCell className="align-top font-mono text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium">
                              {boughtDt.date}
                            </span>
                            <span>{boughtDt.time}</span>
                          </div>
                        </TableCell>

                        {/* Montant */}
                        <TableCell className="align-top text-right pr-5 font-mono tabular-nums whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-foreground">
                              {formatEur(item.amount_htva)} €{" "}
                              <span className="text-[10px] font-normal text-muted-foreground">
                                HT
                              </span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.credits_spent} cr.
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PartnerPurchasesDialog
        partner={selectedPartner}
        open={Boolean(selectedPartner)}
        initialPipelineFilter={dialogInitialPipelineFilter}
        onOpenChange={(open) => {
          if (!open) setSelectedPartner(null)
        }}
      />
    </>
  )
}
