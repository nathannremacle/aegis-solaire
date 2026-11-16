"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Coins,
  Search,
  ShoppingBag,
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
import type { AdminPartnerPurchaseSummary } from "@/lib/admin/partner-purchases"
import {
  PartnerPurchasesDialog,
  type PartnerDialogTarget,
} from "@/components/admin/partner-purchases-dialog"

interface AdminPartnersPurchasesWidgetProps {
  partners: AdminPartnerPurchaseSummary[]
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
  const [selectedPartner, setSelectedPartner] = useState<PartnerDialogTarget | null>(null)

  const visiblePartners = useMemo(() => {
    let list = includeTest ? partners : realPartners
    if (onlyWithPurchases) {
      list = list.filter((p) => p.leads_purchased_count > 0)
    }
    const q = search.toLowerCase().trim()
    if (!q) return list
    return list.filter((p) => {
      const name = (p.company_name || "").toLowerCase()
      const email = (p.email || "").toLowerCase()
      const lastLead = (p.last_purchase?.lead_label || "").toLowerCase()
      return name.includes(q) || email.includes(q) || lastLead.includes(q)
    })
  }, [partners, realPartners, includeTest, onlyWithPurchases, search])

  const totals = useMemo(() => {
    const scope = includeTest ? partners : realPartners
    return scope.reduce(
      (acc, p) => {
        acc.leads += p.leads_purchased_count
        acc.credits += p.total_credits_spent
        acc.htva += p.total_euros_htva
        if (p.leads_purchased_count > 0) acc.buyers += 1
        return acc
      },
      { leads: 0, credits: 0, htva: 0, buyers: 0 }
    )
  }, [partners, realPartners, includeTest])

  return (
    <>
      <Card className="border-border bg-card shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Achats de Leads par Installateur (Depuis le début)
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                {totals.leads} lead{totals.leads > 1 ? "s" : ""} · {formatEur(totals.htva)} € HT
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Cliquez sur un installateur pour voir chaque lead acheté, la date et l&apos;heure exacte, le prix payé et l&apos;historique complet.
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
          {/* Barre de filtres */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 bg-card">
            <div className="relative min-w-[220px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher installateur, e-mail, dernier lead…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

          {/* Table cliquable par installateur */}
          {visiblePartners.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground italic">
              Aucun installateur ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table className="text-xs">
                <TableHeader className="sticky top-0 z-10 bg-secondary/90 backdrop-blur-xs">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="min-w-[210px] pl-5">Installateur</TableHead>
                    <TableHead className="w-28 text-right font-mono text-[11px] text-muted-foreground">
                      Leads achetés
                    </TableHead>
                    <TableHead className="w-36 text-right font-mono text-[11px] text-muted-foreground">
                      Total dépensé
                    </TableHead>
                    <TableHead className="min-w-[230px]">
                      Dernier lead acheté (Date &amp; Heure)
                    </TableHead>
                    <TableHead className="w-24 text-right font-mono text-[11px] text-muted-foreground">
                      Solde
                    </TableHead>
                    <TableHead className="w-28 text-right pr-5">Détail</TableHead>
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

                    return (
                      <TableRow
                        key={partner.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedPartner(partner)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedPartner(partner)
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
                            <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                              {partner.email}
                            </span>
                          </div>
                        </TableCell>

                        {/* Leads achetés depuis le début */}
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

                        {/* Dernier achat (lead, date & heure, montant) */}
                        <TableCell>
                          {partner.last_purchase ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-medium text-foreground truncate max-w-[180px]">
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
                            <span>Voir achats</span>
                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
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
        onOpenChange={(open) => {
          if (!open) setSelectedPartner(null)
        }}
      />
    </>
  )
}
