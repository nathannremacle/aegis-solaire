"use client"

import * as React from "react"
import { useTransition } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
  const [activeQueue, setActiveQueue] = React.useState<"orders" | "disputes" | "leads">(
    badges.pending_disputes > 0
      ? "disputes"
      : badges.pending_credit_orders > 0
      ? "orders"
      : "leads"
  )
  const [isPending, startTransition] = useTransition()

  const totalUrgent =
    badges.pending_credit_orders +
    badges.pending_disputes +
    badges.pending_review_leads +
    badges.pending_installer_apps

  if (totalUrgent === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-6 py-4 text-foreground shadow-2xs">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <span>Tour de contrôle à jour : aucune action urgente en attente (SLAs 24h respectés).</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Tout est en ordre
        </span>
      </div>
    )
  }

  return (
    <section
      aria-label="Plateau de Décision Rapide"
      className="rounded-lg border border-border bg-card shadow-xs overflow-hidden"
    >
      {/* En-tête de la Tour de Contrôle avec sélecteurs de files d'attente */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/80 border-b border-border px-5 py-3 text-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-accent" />
          <h2 className="text-xs font-semibold tracking-wider uppercase text-foreground">
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
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeQueue === "disputes"
                  ? "bg-destructive text-destructive-foreground shadow-2xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
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
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeQueue === "orders"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
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
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeQueue === "leads"
                  ? "bg-accent text-accent-foreground shadow-2xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
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
        {activeQueue === "orders" &&
          (pendingOrders.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Aucune commande de crédits en attente.
            </div>
          ) : (
            pendingOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {order.partner_name}
                    </span>
                    <span className="rounded bg-secondary border border-border px-1.5 py-0.5 text-xs font-medium text-foreground">
                      +<span className="font-mono tabular-nums">{order.credits}</span> crédits (
                      {order.pack_name || "Pack"})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Réf. virement :{" "}
                    <strong className="font-mono tabular-nums text-foreground">
                      {order.transfer_reference || "Non renseignée"}
                    </strong>{" "}
                    •{" "}
                    <span className="font-mono tabular-nums">
                      {Number(order.price_htva || 0).toLocaleString("fr-BE")} € HTVA
                    </span>{" "}
                    (
                    <span className="font-mono tabular-nums">
                      {Number(order.price_ttc || 0).toLocaleString("fr-BE")} € TTC
                    </span>
                    )
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await validateCreditOrderAction(order.id, "admin@aegissolaire.be")
                          toast.success(
                            `Crédits (+${order.credits}) débloqués pour ${order.partner_name}`
                          )
                        } catch (err: any) {
                          toast.error(err.message || "Erreur lors de la validation")
                        }
                      })
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Valider SEPA</span>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/finance">
                      <span>Détail</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ))}

        {activeQueue === "disputes" &&
          (pendingDisputes.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Aucun litige en attente.
            </div>
          ) : (
            pendingDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
                      {dispute.reason}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {dispute.partner_name} → Lead {dispute.lead_name} ({dispute.segment})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {dispute.details}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    Enjeu : {dispute.credits_spent || 2} crédits
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/disputes">
                      <span>Arbitrer</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ))}

        {activeQueue === "leads" &&
          (needsReviewLeads.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Aucun lead en attente de validation.
            </div>
          ) : (
            needsReviewLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-secondary border border-border px-1.5 py-0.5 text-[11px] font-mono tabular-nums font-semibold text-foreground">
                      {lead.segment} • {lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)} cr.
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {lead.company || `${lead.first_name || ""} ${lead.last_name || ""}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({lead.province || "Wallonie"} • Score{" "}
                      <span className="font-mono tabular-nums">{lead.lead_score ?? "N/A"}</span>/100)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Surface :{" "}
                    <span className="font-mono tabular-nums">{lead.surface_area ?? "?"} m²</span> •
                    Facture :{" "}
                    <span className="font-mono tabular-nums">
                      {lead.annual_electricity_bill
                        ? `${lead.annual_electricity_bill} €/an`
                        : "—"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await publishLeadAction(lead.id)
                          toast.success("Lead publié sur la Marketplace !")
                        } catch (err: any) {
                          toast.error(err.message || "Erreur lors de la publication")
                        }
                      })
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Publier (1 clic)</span>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/leads?leadId=${lead.id}`}>
                      <span>Détail</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ))}
      </div>
    </section>
  )
}
