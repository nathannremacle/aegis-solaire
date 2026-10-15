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
      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 px-6 py-4 text-emerald-900 shadow-2xs">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Tour de contrôle à jour : aucune action urgente en attente (SLAs 24h respectés).</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" /> Tout est en ordre
        </span>
      </div>
    )
  }

  return (
    <section
      aria-label="Plateau de Décision Rapide"
      className="rounded-2xl border-2 border-[#001D3D]/15 bg-white shadow-sm overflow-hidden"
    >
      {/* En-tête de la Tour de Contrôle avec sélecteurs de files d'attente */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#001D3D] px-5 py-3.5 text-white">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-[#FFB800] animate-pulse" />
          <h2 className="text-sm font-bold tracking-wide uppercase">
            Tour de Contrôle • {totalUrgent} action{totalUrgent > 1 ? "s" : ""} requise{totalUrgent > 1 ? "s" : ""}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {badges.pending_disputes > 0 && (
            <button
              type="button"
              onClick={() => setActiveQueue("disputes")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeQueue === "disputes"
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-neutral-200 hover:bg-white/20"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Litiges 24h ({badges.pending_disputes})</span>
            </button>
          )}

          {badges.pending_credit_orders > 0 && (
            <button
              type="button"
              onClick={() => setActiveQueue("orders")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeQueue === "orders"
                  ? "bg-[#FFB800] text-[#001D3D]"
                  : "bg-white/10 text-neutral-200 hover:bg-white/20"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Virements SEPA ({badges.pending_credit_orders})</span>
            </button>
          )}

          {badges.pending_review_leads > 0 && (
            <button
              type="button"
              onClick={() => setActiveQueue("leads")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeQueue === "leads"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-neutral-200 hover:bg-white/20"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Leads à publier ({badges.pending_review_leads})</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenu dynamique de la file sélectionnée */}
      <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
        {activeQueue === "orders" &&
          (pendingOrders.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">Aucune commande de crédits en attente.</div>
          ) : (
            pendingOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#001D3D]">{order.partner_name}</span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                      +{order.credits} crédits ({order.pack_name || "Pack"})
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Réf. virement : <strong className="font-mono text-neutral-800">{order.transfer_reference || "Non renseignée"}</strong> •{" "}
                    {Number(order.price_htva || 0).toLocaleString("fr-BE")} € HTVA ({Number(order.price_ttc || 0).toLocaleString("fr-BE")} € TTC)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await validateCreditOrderAction(order.id, "admin@aegissolaire.be")
                          toast.success(`Crédits (+${order.credits}) débloqués pour ${order.partner_name}`)
                        } catch (err: any) {
                          toast.error(err.message || "Erreur lors de la validation")
                        }
                      })
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Valider réception SEPA</span>
                  </Button>
                </div>
              </div>
            ))
          ))}

        {activeQueue === "disputes" &&
          (pendingDisputes.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">Aucun litige en attente.</div>
          ) : (
            pendingDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-red-50/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase text-red-800">
                      {dispute.reason}
                    </span>
                    <span className="text-sm font-bold text-[#001D3D]">
                      {dispute.partner_name} → Lead {dispute.lead_name} ({dispute.segment})
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 line-clamp-1">{dispute.details}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500">
                    Enjeu : {dispute.credits_spent || "?"} crédits
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/leads?dispute=${dispute.id}`}>
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
            <div className="p-6 text-center text-sm text-neutral-500">Aucun lead en attente de validation.</div>
          ) : (
            needsReviewLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        lead.segment === "B2B"
                          ? "bg-[#001D3D] text-[#FFB800]"
                          : "bg-blue-100 text-blue-900"
                      }`}
                    >
                      {lead.segment} • {lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)} cr.
                    </span>
                    <span className="text-sm font-bold text-[#001D3D]">
                      {lead.company || `${lead.first_name || ""} ${lead.last_name || ""}`}
                    </span>
                    <span className="text-xs text-neutral-500">
                      ({lead.province || "Wallonie"} • Score {lead.lead_score ?? "N/A"}/100)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Surface : {lead.surface_area ?? "?"} m² • Facture : {lead.annual_electricity_bill ? `${lead.annual_electricity_bill} €/an` : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="accent"
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
                    <Link href={`/admin/leads?focus=${lead.id}`}>
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
