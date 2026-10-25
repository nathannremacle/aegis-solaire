"use client"

import * as React from "react"
import { useOptimistic, useTransition, useState } from "react"
import {
  Phone,
  MessageCircle,
  UserPlus,
  LayoutGrid,
  List,
  ShieldAlert,
  MapPin,
  Building2,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { downloadLeadVCard, buildWhatsAppLink } from "./lib/vcard-export"
import LeadDetailModal from "./modals/lead-detail-modal"

const PIPELINE_STAGES = [
  { id: "to_contact", label: "À contacter", activeClass: "bg-accent text-accent-foreground border-accent font-bold shadow-2xs" },
  { id: "contacted", label: "Contacté", activeClass: "bg-secondary text-secondary-foreground border-border font-bold shadow-2xs" },
  { id: "meeting_scheduled", label: "RDV fixé", activeClass: "bg-primary text-primary-foreground border-primary font-bold shadow-2xs" },
  { id: "quote_sent", label: "Devis envoyé", activeClass: "bg-secondary text-primary border-primary/40 font-bold shadow-2xs" },
  { id: "won", label: "Gagné", activeClass: "bg-primary text-accent border-accent font-bold shadow-2xs" },
  { id: "lost", label: "Perdu", activeClass: "bg-muted text-muted-foreground border-border font-semibold" },
] as const

interface CrmPortfolioViewProps {
  purchases: any[]
  onOpenDispute: (purchase: any) => void
}

export function CrmPortfolioView({ purchases, onOpenDispute }: CrmPortfolioViewProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [isPending, startTransition] = useTransition()
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<any | null>(null)

  // React 19 Optimistic UI : changement de colonne instantané sans attendre le serveur
  const [optimisticPurchases, setOptimisticStatus] = useOptimistic(
    purchases,
    (state: any[], { purchaseId, newStatus }: { purchaseId: string; newStatus: string }) =>
      state.map((item) =>
        item.purchase_id === purchaseId ? { ...item, pipeline_status: newStatus } : item
      )
  )

  const handleStatusChange = (purchaseId: string, newStatus: string) => {
    startTransition(async () => {
      setOptimisticStatus({ purchaseId, newStatus })
      try {
        const res = await fetch("/api/partners/pipeline-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseId, pipeline_status: newStatus }),
        })
        if (!res.ok) {
          toast.error("Erreur lors de la mise à jour du statut pipeline.")
        }
      } catch {
        toast.error("Échec réseau.")
      }
    })
  }

  if (optimisticPurchases.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-base font-bold text-foreground">Votre portefeuille est vide</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          Débloquez des leads qualifiés dans l&apos;onglet Marketplace pour les suivre et les convertir ici.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils CRM : Switcher Kanban / Liste dense */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Portefeuille &amp; Suivi Commercial ({optimisticPurchases.length} dossier{optimisticPurchases.length > 1 ? "s" : ""})
          </h2>
          <p className="text-xs text-muted-foreground">Coordonnées complètes débloquées et actions directes</p>
        </div>

        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              viewMode === "list" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Liste dense</span>
          </button>
        </div>
      </div>

      {/* Mode 1 : Pipeline Kanban / Cards Mobile-First */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {optimisticPurchases.map((item) => (
            <div
              key={item.purchase_id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs hover:border-border/80 transition-all"
            >
              <div>
                {/* En-tête de la carte : Segment, Province & Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                      item.segment === "B2B"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground border border-border"
                    }`}
                  >
                    {item.segment}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
                    <MapPin className="h-3 w-3 text-accent shrink-0" />
                    <span>{item.city || item.postal_code || "Wallonie"} ({item.postal_code || ""})</span>
                  </span>
                </div>

                {/* Titre & Contact prospect */}
                <div
                  onClick={() => setSelectedLeadForModal({ ...item, already_purchased: true })}
                  className="mt-3 cursor-pointer group"
                  title="Voir la fiche complète du projet"
                >
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.company ? `${item.company} — ` : ""}
                    {item.first_name} {item.last_name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {item.email} • {item.phone}
                  </p>
                  <p className="text-xs text-foreground mt-1.5">
                    {item.surface_area ? <span className="font-mono tabular-nums">{item.surface_area} m² • </span> : ""}
                    Facture : <span className="font-mono font-bold tabular-nums">{Number(item.annual_electricity_bill || 0).toLocaleString("fr-BE")} € HT/an</span>
                  </p>
                </div>

                {/* Sélecteur de statut Pipeline 1-Tap (Défilement fluide mobile) */}
                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 overscroll-x-contain">
                  {PIPELINE_STAGES.map((stage) => {
                    const active = item.pipeline_status === stage.id
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStatusChange(item.purchase_id, stage.id)}
                        className={`rounded-md border px-2.5 py-1 text-[11px] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                          active
                            ? stage.activeClass
                            : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {stage.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Barre d'actions terrain : Optimisée Mobile (Appel + WA en grand) & Desktop 5 colonnes */}
              <div className="mt-4 border-t border-border pt-3">
                {/* Disposition Mobile (< 640px) */}
                <div className="block sm:hidden space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${item.phone}`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
                      title="Appeler directement"
                    >
                      <Phone className="h-4 w-4 text-accent" />
                      <span>Appeler</span>
                    </a>

                    <a
                      href={buildWhatsAppLink(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors shadow-2xs"
                      title="Ouvrir WhatsApp pré-rempli"
                    >
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLeadForModal({ ...item, already_purchased: true })}
                      className="h-9 px-2 text-xs font-medium justify-center cursor-pointer"
                      title="Fiche technique complète"
                    >
                      <Info className="h-3.5 w-3.5 mr-1 text-accent" />
                      <span>Fiche</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => downloadLeadVCard(item)}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
                      title="Enregistrer le contact (.vcf)"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>vCard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDispute(item)}
                      disabled={Boolean(item.dispute_id)}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors cursor-pointer"
                      title="Signaler un litige sous 24h"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>{item.dispute_id ? "Litige" : "24h"}</span>
                    </button>
                  </div>
                </div>

                {/* Disposition Desktop (>= 640px) */}
                <div className="hidden sm:grid sm:grid-cols-5 sm:gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedLeadForModal({ ...item, already_purchased: true })}
                    className="col-span-1 h-9 px-1 text-xs"
                    title="Fiche technique complète"
                  >
                    <Info className="h-3.5 w-3.5 mr-1 text-accent" />
                    <span>Fiche</span>
                  </Button>

                  <a
                    href={`tel:${item.phone}`}
                    className="col-span-1 inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Appeler directement"
                  >
                    <Phone className="h-3.5 w-3.5 text-accent" />
                    <span>Appel</span>
                  </a>

                  <a
                    href={buildWhatsAppLink(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-1 inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                    title="Ouvrir WhatsApp pré-rempli"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    <span>WA</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => downloadLeadVCard(item)}
                    className="col-span-1 inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
                    title="Enregistrer le contact (.vcf)"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>vCard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenDispute(item)}
                    disabled={Boolean(item.dispute_id)}
                    className="col-span-1 inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors cursor-pointer"
                    title="Signaler un litige sous 24h"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>{item.dispute_id ? "Litige" : "24h"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode 2 : Table Haute Densité */
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 text-[11px] font-bold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Client / Contact</th>
                <th className="px-4 py-3">Province</th>
                <th className="px-4 py-3">Statut Pipeline</th>
                <th className="px-4 py-3 text-right">Actions directes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {optimisticPurchases.map((item) => (
                <tr key={item.purchase_id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                        item.segment === "B2B" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"
                      }`}
                    >
                      {item.segment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadForModal({ ...item, already_purchased: true })}
                      className="text-left font-bold text-foreground hover:underline cursor-pointer"
                    >
                      {item.company ? `${item.company} — ` : ""}
                      {item.first_name} {item.last_name}
                    </button>
                    <p className="text-muted-foreground text-[11px] font-mono">{item.phone} • {item.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-foreground font-medium">
                    {item.city ? `${item.city} (${item.postal_code || ""})` : (item.province ? item.province.replace("_", " ") : "Wallonie")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.pipeline_status || "to_contact"}
                      onChange={(e) => handleStatusChange(item.purchase_id, e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground"
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLeadForModal({ ...item, already_purchased: true })}
                        className="h-7 px-2 text-[11px]"
                      >
                        Fiche
                      </Button>
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex h-7 items-center justify-center rounded bg-primary px-2 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        Appel
                      </a>
                      <a
                        href={buildWhatsAppLink(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center justify-center rounded bg-secondary border border-border px-2 text-[11px] font-bold text-foreground hover:bg-secondary/80"
                      >
                        WA
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadLeadVCard(item)}
                        className="inline-flex h-7 items-center justify-center rounded border border-border bg-card px-2 text-[11px] font-semibold text-foreground hover:bg-secondary/50 cursor-pointer"
                      >
                        vCard
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Fiche Lead Débloqué */}
      {selectedLeadForModal && (
        <LeadDetailModal
          lead={selectedLeadForModal}
          partnerCredits={0}
          isBuying={false}
          onClose={() => setSelectedLeadForModal(null)}
          onPurchase={() => {}}
          onRequestTopUp={() => {}}
        />
      )}
    </div>
  )
}
