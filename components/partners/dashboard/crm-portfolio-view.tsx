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
  Clock,
  Euro,
  Zap,
  Building2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { downloadLeadVCard, buildWhatsAppLink } from "./lib/vcard-export"

const PIPELINE_STAGES = [
  { id: "to_contact", label: "À contacter", color: "bg-amber-100 text-amber-900 border-amber-300" },
  { id: "contacted", label: "Contacté", color: "bg-blue-100 text-blue-900 border-blue-300" },
  { id: "meeting_scheduled", label: "RDV fixé", color: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  { id: "quote_sent", label: "Devis envoyé", color: "bg-purple-100 text-purple-900 border-purple-300" },
  { id: "won", label: "Gagné", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { id: "lost", label: "Perdu", color: "bg-neutral-200 text-neutral-700 border-neutral-300" },
] as const

interface CrmPortfolioViewProps {
  purchases: any[]
  onOpenDispute: (purchase: any) => void
}

export function CrmPortfolioView({ purchases, onOpenDispute }: CrmPortfolioViewProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [isPending, startTransition] = useTransition()

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
      <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-xs">
        <Building2 className="mx-auto h-12 w-12 text-neutral-300" />
        <h3 className="mt-4 text-base font-bold text-[#001D3D]">Votre portefeuille est vide</h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          Débloquez des leads qualifiés dans l'onglet Marketplace pour les suivre et les convertir ici.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils CRM : Switcher Kanban / Liste dense */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#001D3D]">
            Portefeuille &amp; Suivi Commercial ({optimisticPurchases.length} dossier{optimisticPurchases.length > 1 ? "s" : ""})
          </h2>
          <p className="text-xs text-neutral-500">Coordonnées complètes débloquées et actions directes</p>
        </div>

        <div className="flex items-center rounded-lg border border-neutral-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "kanban" ? "bg-[#001D3D] text-white shadow-2xs" : "text-neutral-600 hover:text-[#001D3D]"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "list" ? "bg-[#001D3D] text-white shadow-2xs" : "text-neutral-600 hover:text-[#001D3D]"
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
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-xs hover:border-neutral-300 transition-all"
            >
              <div>
                {/* En-tête de la carte : Segment, Province & Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                      item.segment === "B2B"
                        ? "bg-[#001D3D] text-[#FFB800]"
                        : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    {item.segment}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500 capitalize">
                    <MapPin className="h-3 w-3 text-amber-500" /> {item.postal_code || ""} ({item.province ? item.province.replace("_", " ") : "Wallonie"})
                  </span>
                </div>

                <h3 className="mt-2.5 text-base font-bold text-[#001D3D]">
                  {item.company ? `${item.company} — ` : ""}
                  {item.first_name} {item.last_name}
                </h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{item.email} • {item.phone}</p>
                <p className="text-xs text-neutral-600 mt-1">
                  {item.surface_area ? `${item.surface_area} m² • ` : ""}
                  Facture : {Number(item.annual_electricity_bill || 0).toLocaleString("fr-BE")} €/an
                </p>

                {/* Sélecteur de statut Pipeline 1-Tap */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map((stage) => {
                    const active = item.pipeline_status === stage.id
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStatusChange(item.purchase_id, stage.id)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-all ${
                          active
                            ? stage.color + " shadow-2xs font-bold"
                            : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100"
                        }`}
                      >
                        {stage.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Barre d'actions terrain Mobile-First (Cibles 44px+) */}
              <div className="mt-4 grid grid-cols-4 gap-2 border-t border-neutral-100 pt-3">
                <a
                  href={`tel:${item.phone}`}
                  className="col-span-1 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#001D3D] text-xs font-semibold text-white hover:bg-[#002855] transition-colors"
                  title="Appeler directement"
                >
                  <Phone className="h-3.5 w-3.5 text-[#FFB800]" />
                  <span className="hidden sm:inline">Appeler</span>
                </a>

                <a
                  href={buildWhatsAppLink(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-1 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  title="Ouvrir WhatsApp pré-rempli"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => downloadLeadVCard(item)}
                  className="col-span-1 flex h-10 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
                  title="Enregistrer le contact (.vcf)"
                >
                  <UserPlus className="h-3.5 w-3.5 text-neutral-500" />
                  <span className="hidden sm:inline">vCard</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDispute(item)}
                  disabled={Boolean(item.dispute_id)}
                  className="col-span-1 flex h-10 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50/60 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  title="Signaler un litige sous 24h"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>{item.dispute_id ? "Litige" : "24h"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode 2 : Table Haute Densité */
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase text-neutral-600">
              <tr>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Client / Contact</th>
                <th className="px-4 py-3">Province</th>
                <th className="px-4 py-3">Statut Pipeline</th>
                <th className="px-4 py-3 text-right">Actions directes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {optimisticPurchases.map((item) => (
                <tr key={item.purchase_id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                        item.segment === "B2B" ? "bg-[#001D3D] text-[#FFB800]" : "bg-blue-100 text-blue-900"
                      }`}
                    >
                      {item.segment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-neutral-900">
                      {item.company ? `${item.company} — ` : ""}
                      {item.first_name} {item.last_name}
                    </p>
                    <p className="text-neutral-500 text-[11px]">{item.phone} • {item.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-neutral-700 font-medium">
                    {item.province ? item.province.replace("_", " ") : "Wallonie"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.pipeline_status || "to_contact"}
                      onChange={(e) => handleStatusChange(item.purchase_id, e.target.value)}
                      className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-800"
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                    <a
                      href={`tel:${item.phone}`}
                      className="inline-flex h-7 items-center justify-center rounded bg-[#001D3D] px-2 text-[11px] font-bold text-white"
                    >
                      Appel
                    </a>
                    <a
                      href={buildWhatsAppLink(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center justify-center rounded bg-emerald-600 px-2 text-[11px] font-bold text-white"
                    >
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadLeadVCard(item)}
                      className="inline-flex h-7 items-center justify-center rounded border border-neutral-200 bg-neutral-50 px-2 text-[11px] font-semibold text-neutral-700"
                    >
                      vCard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
