"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import {
  MapPin,
  Zap,
  TrendingUp,
  Lock,
  Unlock,
  Coins,
  ShieldCheck,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface MarketplaceFeedViewProps {
  leads: any[]
  partnerCredits: number
  onPurchaseSuccess: (lead: any, newCredits: number, purchaseRecord: any) => void
  onRequestTopUp: () => void
}

export function MarketplaceFeedView({
  leads,
  partnerCredits,
  onPurchaseSuccess,
  onRequestTopUp,
}: MarketplaceFeedViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredLeads = leads.filter((lead) => {
    if (segmentFilter !== "ALL" && lead.segment !== segmentFilter) return false
    if (selectedProvince !== "ALL" && lead.province?.toLowerCase() !== selectedProvince.toLowerCase()) {
      return false
    }
    return true
  })

  const handlePurchase = async (lead: any) => {
    const cost = lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)
    if (partnerCredits < cost) {
      toast.error(`Solde insuffisant (${cost} crédits requis, ${partnerCredits} disponibles).`)
      onRequestTopUp()
      return
    }

    if (!confirm(`Débloquer ce dossier ${lead.segment} pour ${cost} crédits ?`)) {
      return
    }

    setBuyingId(lead.id)
    try {
      const res = await fetch("/api/partners/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'achat")

      toast.success("Dossier débloqué avec succès ! Coordonnées ajoutées à votre CRM.")
      const newCredits = partnerCredits - cost
      const newRecord = {
        purchase_id: data.purchaseId || data.purchase?.id || `purch_${Date.now()}`,
        purchased_at: new Date().toISOString(),
        credits_spent: cost,
        pipeline_status: "to_contact",
        first_name: data.lead?.first_name || "Prospect",
        last_name: data.lead?.last_name || "",
        company: data.lead?.company || null,
        email: data.lead?.email || "—",
        phone: data.lead?.phone || "—",
        segment: lead.segment,
        province: lead.province,
        postal_code: lead.postal_code || lead.masked_postal_code,
        surface_area: lead.surface_area,
        annual_electricity_bill: lead.annual_electricity_bill,
      }
      onPurchaseSuccess(lead, newCredits, newRecord)
    } catch (err: any) {
      toast.error(err.message || "Impossible de finaliser l'achat.")
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barre de Filtres & Affichage */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segments */}
          <div className="inline-flex rounded-lg bg-neutral-100 p-0.5">
            {(["ALL", "B2B", "B2C"] as const).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSegmentFilter(seg)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  segmentFilter === seg
                    ? "bg-[#001D3D] text-white shadow-2xs"
                    : "text-neutral-600 hover:text-[#001D3D]"
                }`}
              >
                {seg === "ALL" ? "Tous" : seg}
              </button>
            ))}
          </div>

          {/* Provinces */}
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 outline-hidden"
          >
            <option value="ALL">Toute la Wallonie</option>
            <option value="liege">Liège</option>
            <option value="namur">Namur</option>
            <option value="hainaut">Hainaut</option>
            <option value="brabant_wallon">Brabant Wallon</option>
            <option value="luxembourg">Luxembourg</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium">
            {filteredLeads.length} opportunité{filteredLeads.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center rounded-lg border border-neutral-200 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-1 ${viewMode === "grid" ? "bg-[#001D3D] text-white" : "text-neutral-500"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded p-1 ${viewMode === "table" ? "bg-[#001D3D] text-white" : "text-neutral-500"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grille des opportunités */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-xs">
          <Sparkles className="mx-auto h-10 w-10 text-amber-500" />
          <h3 className="mt-3 text-base font-bold text-[#001D3D]">Aucun dossier disponible avec ces filtres</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Élargissez votre sélection de provinces ou réinitialisez les filtres.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => {
            const cost = lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)
            const isBuying = buyingId === lead.id
            const maxSlots = lead.max_slots ?? (lead.segment === "B2B" ? 1 : 3)
            const remainingSlots = lead.remaining_slots ?? maxSlots

            return (
              <div
                key={lead.id}
                className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-neutral-300 hover:shadow-sm transition-all"
              >
                <div>
                  {/* Badge Exclusivité & Province */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                        lead.segment === "B2B"
                          ? "bg-[#001D3D] text-[#FFB800]"
                          : "bg-blue-100 text-blue-900"
                      }`}
                    >
                      {lead.segment} • {lead.segment === "B2B" ? "Exclusif (1 seul installateur)" : `${remainingSlots} place(s) sur ${maxSlots}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500 capitalize">
                      <MapPin className="h-3 w-3 text-amber-500" /> {lead.province ? lead.province.replace("_", " ") : "Wallonie"}
                    </span>
                  </div>

                  {/* Détails techniques */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-neutral-500">Surface projetée</span>
                      <span className="text-base font-bold text-neutral-900">
                        {lead.surface_area ? `${lead.surface_area} m²` : "—"}{" "}
                        <span className="text-xs font-normal text-neutral-500">({lead.surface_type || "Toiture"})</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-neutral-500">Facture électrique</span>
                      <span className="text-sm font-semibold text-neutral-800">
                        {lead.annual_electricity_bill ? `${Number(lead.annual_electricity_bill).toLocaleString("fr-BE")} €/an` : "—"}
                      </span>
                    </div>

                    {lead.estimated_roi_years && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-neutral-500">Retour investissement</span>
                        <span className="text-xs font-bold text-emerald-700">
                          ~{lead.estimated_roi_years} ans
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Carte : Coût en crédits & Déblocage */}
                <div className="mt-5 border-t border-neutral-100 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-neutral-400">Tarif dossier</span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-black text-[#001D3D]">{cost}</span>
                      <span className="text-xs font-semibold text-neutral-600">crédits</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="accent"
                    disabled={isBuying}
                    onClick={() => handlePurchase(lead)}
                    className="h-10 px-4 text-xs font-bold"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Déblocage...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Débloquer ({cost} cr)</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Vue Table */
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase text-neutral-600">
              <tr>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Province / CP</th>
                <th className="px-4 py-3">Surface &amp; Facture</th>
                <th className="px-4 py-3">Créneaux</th>
                <th className="px-4 py-3 text-right">Déblocage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLeads.map((lead) => {
                const cost = lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)
                const isBuying = buyingId === lead.id
                return (
                  <tr key={lead.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                          lead.segment === "B2B" ? "bg-[#001D3D] text-[#FFB800]" : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {lead.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize font-medium text-neutral-700">
                      {lead.province ? lead.province.replace("_", " ") : "Wallonie"} ({lead.masked_postal_code || "—"})
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {lead.surface_area ? `${lead.surface_area} m²` : "—"} •{" "}
                      {lead.annual_electricity_bill ? `${Number(lead.annual_electricity_bill).toLocaleString("fr-BE")} €/an` : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {lead.segment === "B2B" ? "Exclusif (1 max)" : `${lead.remaining_slots || 3} place(s)`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={isBuying}
                        onClick={() => handlePurchase(lead)}
                        className="h-8 px-3 text-xs"
                      >
                        {isBuying ? "..." : `Débloquer (${cost} cr)`}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
