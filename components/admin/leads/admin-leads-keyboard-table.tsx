"use client"

import * as React from "react"
import { Check, Eye, Filter, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface LeadRow {
  id: string
  created_at: string
  first_name: string
  last_name: string | null
  company: string | null
  email: string
  phone: string | null
  segment: "B2B" | "B2C" | string
  province: string | null
  surface_area: number | null
  annual_electricity_bill: number | null
  status: string
  marketplace_status?: string | null
  credit_cost?: number | null
  lead_score?: number | null
}

interface AdminLeadsKeyboardTableProps {
  leads: LeadRow[]
  onOpenDetail: (lead: LeadRow) => void
  onQuickPublish: (leadId: string) => void
  onQuickFilterChange: (preset: "all" | "needs_review" | "b2b_high" | "available") => void
  activePreset: string
}

export function AdminLeadsKeyboardTable({
  leads,
  onOpenDetail,
  onQuickPublish,
  onQuickFilterChange,
  activePreset,
}: AdminLeadsKeyboardTableProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer les raccourcis si l'admin tape dans un input ou textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, leads.length - 1)))
      } else if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && leads[selectedIndex]) {
        e.preventDefault()
        onOpenDetail(leads[selectedIndex])
      } else if ((e.key === "p" || e.key === "P") && leads[selectedIndex]) {
        e.preventDefault()
        onQuickPublish(leads[selectedIndex].id)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [leads, selectedIndex, onOpenDetail, onQuickPublish])

  return (
    <div className="space-y-3">
      {/* Barre de Filtres Rapides 1-Clic + Légende Raccourcis Clavier */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 mr-1">
            <Filter className="h-3.5 w-3.5" /> Vues rapides :
          </span>
          {[
            { id: "all", label: "Tous les leads" },
            { id: "needs_review", label: "À qualifier" },
            { id: "b2b_high", label: "B2B Haute Valeur" },
            { id: "available", label: "En vente Marketplace" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onQuickFilterChange(preset.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activePreset === preset.id
                  ? "bg-[#001D3D] text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3 text-[11px] text-neutral-500">
          <span>
            Navigation : <kbd className="rounded border bg-neutral-100 px-1.5 py-0.5 font-mono">J</kbd> /{" "}
            <kbd className="rounded border bg-neutral-100 px-1.5 py-0.5 font-mono">K</kbd>
          </span>
          <span>
            Détail : <kbd className="rounded border bg-neutral-100 px-1.5 py-0.5 font-mono">Entrée</kbd>
          </span>
          <span>
            Publier : <kbd className="rounded border bg-neutral-100 px-1.5 py-0.5 font-mono">P</kbd>
          </span>
        </div>
      </div>

      {/* Table Haute Densité */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase text-neutral-600">
            <tr>
              <th className="px-4 py-3">Segment / Score</th>
              <th className="px-4 py-3">Prospect / Société</th>
              <th className="px-4 py-3">Province</th>
              <th className="px-4 py-3">Surface &amp; Facture</th>
              <th className="px-4 py-3">Statut Marketplace</th>
              <th className="px-4 py-3 text-right">Actions rapides</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Aucun lead ne correspond aux critères sélectionnés.
                </td>
              </tr>
            ) : (
              leads.map((lead, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <tr
                    key={lead.id}
                    onClick={() => {
                      setSelectedIndex(idx)
                      onOpenDetail(lead)
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#FFB800]/10 ring-1 ring-inset ring-[#FFB800]"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                          lead.segment === "B2B"
                            ? "bg-[#001D3D] text-[#FFB800]"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {lead.segment} ({lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)} cr)
                      </span>
                      {lead.lead_score !== null && lead.lead_score !== undefined && (
                        <span className="ml-2 font-semibold text-neutral-700">
                          {lead.lead_score}/100
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-neutral-900">
                        {lead.company ? `${lead.company} (${lead.first_name || ""} ${lead.last_name || ""})` : `${lead.first_name || ""} ${lead.last_name || ""}`}
                      </p>
                      <p className="text-neutral-500 text-[11px]">{lead.email} • {lead.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 capitalize font-medium text-neutral-700">
                      {lead.province ? lead.province.replace("_", " ") : "Wallonie"}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {lead.surface_area ? `${lead.surface_area} m²` : "—"} •{" "}
                      {lead.annual_electricity_bill ? `${Number(lead.annual_electricity_bill).toLocaleString("fr-BE")} €/an` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-800">
                        {lead.marketplace_status || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                      {lead.marketplace_status !== "available" && lead.marketplace_status !== "sold_out" && (
                        <Button
                          size="sm"
                          variant="accent"
                          className="h-8 px-2.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            onQuickPublish(lead.id)
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Publier (P)</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDetail(lead)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Détail</span>
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
