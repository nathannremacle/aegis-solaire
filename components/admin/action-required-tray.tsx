"use client"

import * as React from "react"
import { useTransition, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Clock,
  Layers,
  Building2,
  User
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { validateCreditOrderAction, publishLeadAction } from "@/app/admin/actions"
import { cn } from "@/lib/utils"

interface ActionRequiredTrayProps {
  badges: {
    pending_review_leads: number
    pending_credit_orders: number
    pending_installer_apps: number
    pending_media_apps?: number
    pending_disputes: number
  }
  needsReviewLeads: any[]
  pendingOrders: any[]
  pendingDisputes: any[]
}

export function ActionRequiredTray({
  badges,
  needsReviewLeads,
  pendingOrders,
  pendingDisputes,
}: ActionRequiredTrayProps) {
  const [activeQueue, setActiveQueue] = useState<"orders" | "disputes" | "leads">(
    badges.pending_disputes > 0
      ? "disputes"
      : badges.pending_credit_orders > 0
      ? "orders"
      : "leads"
  )
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const totalUrgent =
    badges.pending_credit_orders +
    badges.pending_disputes +
    badges.pending_review_leads +
    badges.pending_installer_apps

  if (totalUrgent === 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4 text-foreground shadow-2xs">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <div className="rounded-full bg-accent/10 p-1 text-accent">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span>Tour de contrôle à jour : aucune action urgente en attente (SLAs 24h respectés).</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Tout est en ordre
        </span>
      </div>
    )
  }

  return (
    <section
      aria-label="Tour de Contrôle et Décision Rapide"
      className="rounded-xl border border-border bg-card shadow-xs overflow-hidden"
    >
      {/* En-tête de la Tour de Contrôle avec sélecteurs de files d'attente */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 border-b border-border px-5 py-3.5 text-foreground">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <h2 className="text-xs font-bold tracking-wider uppercase text-foreground">
            Tour de Contrôle •{" "}
            <span className="font-mono tabular-nums">{totalUrgent}</span> action
            {totalUrgent > 1 ? "s" : ""} requise{totalUrgent > 1 ? "s" : ""}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {badges.pending_disputes > 0 && (
            <button
              type="button"
              onClick={() => setActiveQueue("disputes")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeQueue === "disputes"
                  ? "bg-destructive text-destructive-foreground shadow-xs font-bold"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                Litiges 24h (
                <span className="font-mono tabular-nums">{badges.pending_disputes}</span>)
              </span>
            </button>
          )}

          {badges.pending_credit_orders > 0 && (
            <button
              type="button"
              onClick={() => setActiveQueue("orders")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeQueue === "orders"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border"
              )}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>
                Virements SEPA (
                <span className="font-mono tabular-nums">{badges.pending_credit_orders}</span>)
              </span>
            </button>
          )}

          {badges.pending_review_leads > 0 && (
            <button
              type="button"
              onClick={() => setActiveQueue("leads")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeQueue === "leads"
                  ? "bg-accent text-accent-foreground shadow-xs font-bold"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                Leads à publier (
                <span className="font-mono tabular-nums">{badges.pending_review_leads}</span>)
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Contenu dynamique de la file sélectionnée */}
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {/* 1. File VIREMENTS SEPA */}
        {activeQueue === "orders" &&
          (pendingOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Aucune commande de crédits en attente de validation bancaire.
            </div>
          ) : (
            pendingOrders.map((order) => {
              const isCurrentProcessing = isPending && processingId === order.id

              return (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {order.partner_name}
                      </span>
                      <span className="rounded-md bg-secondary border border-border px-2 py-0.5 text-xs font-semibold text-foreground">
                        +<span className="font-mono tabular-nums">{order.credits}</span> crédits (
                        {order.pack_name || "Pack"})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>Réf. virement :</span>
                      <strong className="font-mono tabular-nums text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                        {order.transfer_reference || "Non renseignée"}
                      </strong>
                      <span>•</span>
                      <span className="font-mono tabular-nums font-semibold text-foreground">
                        {Number(order.price_htva || 0).toLocaleString("fr-BE")} € HTVA
                      </span>
                      <span className="text-muted-foreground">
                        ({Number(order.price_ttc || 0).toLocaleString("fr-BE")} € TTC)
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setProcessingId(order.id)
                        startTransition(async () => {
                          try {
                            await validateCreditOrderAction(order.id, "admin@aegissolaire.be")
                            toast.success(
                              `Crédits (+${order.credits}) validés avec succès pour ${order.partner_name}`
                            )
                          } catch (err: any) {
                            toast.error(err.message || "Erreur lors de la validation")
                          } finally {
                            setProcessingId(null)
                          }
                        })
                      }}
                      className="h-8 text-xs font-semibold gap-1.5 shadow-2xs"
                    >
                      {isCurrentProcessing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Validation...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Valider SEPA</span>
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" asChild className="h-8 text-xs border-border">
                      <Link href="/admin/finance">
                        <span>Détail</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          ))}

        {/* 2. File LITIGES */}
        {activeQueue === "disputes" &&
          (pendingDisputes.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Aucun litige en attente. Tous les arbitrages ont été rendus !
            </div>
          ) : (
            pendingDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[11px] font-bold text-destructive">
                      {dispute.reason}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {dispute.partner_name} → Lead {dispute.lead_name} ({dispute.segment})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                    {dispute.details}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    Enjeu : <strong className="text-foreground">{dispute.credits_spent || 2} crédits</strong>
                  </span>
                  <Button size="sm" variant="outline" asChild className="h-8 text-xs border-border">
                    <Link href="/admin/disputes">
                      <span>Arbitrer</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ))}

        {/* 3. File LEADS À PUBLIER */}
        {activeQueue === "leads" &&
          (needsReviewLeads.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Aucun lead en attente de validation. Le catalogue est 100% à jour.
            </div>
          ) : (
            needsReviewLeads.map((lead) => {
              const isCurrentProcessing = isPending && processingId === lead.id
              const isB2B = lead.segment === "B2B"

              return (
                <div
                  key={lead.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-mono tabular-nums font-bold",
                        isB2B 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-foreground border border-border"
                      )}>
                        {lead.segment} • {lead.credit_cost ?? (isB2B ? 5 : 2)} cr.
                      </span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {isB2B ? <Building2 className="h-3.5 w-3.5 text-accent" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                        {lead.company || `${lead.first_name || ""} ${lead.last_name || ""}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({lead.province || "Wallonie"} • Score{" "}
                        <span className="font-mono tabular-nums font-semibold text-foreground">
                          {lead.lead_score ?? "N/A"}
                        </span>/100)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Surface toiture :{" "}
                      <span className="font-mono tabular-nums font-semibold text-foreground">
                        {lead.surface_area ? `${lead.surface_area} m²` : "Non spécifiée"}
                      </span>{" "}
                      • Facture estimée :{" "}
                      <span className="font-mono tabular-nums font-semibold text-foreground">
                        {lead.annual_electricity_bill
                          ? `${Number(lead.annual_electricity_bill).toLocaleString("fr-BE")} €/an`
                          : "—"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setProcessingId(lead.id)
                        startTransition(async () => {
                          try {
                            await publishLeadAction(lead.id)
                            toast.success("Lead certifié et mis en vente sur la Marketplace !")
                          } catch (err: any) {
                            toast.error(err.message || "Erreur lors de la publication")
                          } finally {
                            setProcessingId(null)
                          }
                        })
                      }}
                      className="h-8 text-xs font-semibold gap-1.5 shadow-2xs"
                    >
                      {isCurrentProcessing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Publication...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Publier (1 clic)</span>
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" asChild className="h-8 text-xs border-border">
                      <Link href={`/admin/leads?leadId=${lead.id}`}>
                        <span>Détail</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          ))}
      </div>
    </section>
  )
}
