"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  MapPin,
  Zap,
  Lock,
  Unlock,
  Coins,
  ShieldCheck,
  LayoutGrid,
  List,
  Sparkles,
  Loader2,
  Calendar,
  Layers,
  Building2,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import {
  getSurfaceTypeLabel,
  getRoofMaterialLabel,
  getTimeframeLabel,
  getOwnershipLabel,
  getProjectDriverLabel,
} from "@/lib/lead-display-helpers"
import LeadDetailModal from "./modals/lead-detail-modal"

interface MarketplaceFeedViewProps {
  leads: any[]
  partnerCredits: number
  targetLeadId?: string
  onPurchaseSuccess: (lead: any, newCredits: number, purchaseRecord: any) => void
  onRequestTopUp: () => void
}

export function MarketplaceFeedView({
  leads,
  partnerCredits,
  targetLeadId,
  onPurchaseSuccess,
  onRequestTopUp,
}: MarketplaceFeedViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<any | null>(null)

  // Gestion du deep-linking direct vers le lead (?lead=[id])
  useEffect(() => {
    if (targetLeadId) {
      const targetLead = leads.find((l) => l.id === targetLeadId)
      if (targetLead) {
        setSelectedLeadForModal(targetLead)
        // Auto-scroll vers la carte avec animation fluide
        const timer = setTimeout(() => {
          const el = document.getElementById(`lead-${targetLeadId}`)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        }, 180)
        return () => clearTimeout(timer)
      } else {
        toast.info(
          "Ce dossier a déjà été attribué au nombre maximum d'installateurs partenaires ou n'est plus disponible.",
          { duration: 5000 }
        )
      }
    }
  }, [targetLeadId, leads])

  const filteredLeads = leads.filter((lead) => {
    if (segmentFilter !== "ALL" && lead.segment !== segmentFilter) return false
    if (selectedProvince !== "ALL" && lead.province?.toLowerCase() !== selectedProvince.toLowerCase()) {
      return false
    }
    return true
  })

  const handlePurchase = async (lead: any) => {
    const isB2B = lead.segment === "B2B"
    const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
    if (partnerCredits < cost) {
      toast.error(`Solde insuffisant (${cost} crédits requis, ${partnerCredits} disponibles).`)
      onRequestTopUp()
      return
    }

    if (!confirm(`Débloquer ce dossier ${lead.segment} pour ${cost} crédits ?\nVous obtiendrez immédiatement le nom, téléphone, email et adresse exacte du prospect.`)) {
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
        first_name: data.lead?.first_name || lead.first_name || "Prospect",
        last_name: data.lead?.last_name || lead.last_name || "",
        company: data.lead?.company || null,
        email: data.lead?.email || "—",
        phone: data.lead?.phone || "—",
        site_address: data.lead?.site_address || lead.site_address,
        segment: lead.segment,
        province: lead.province,
        city: lead.city,
        postal_code: lead.postal_code || lead.masked_postal_code,
        surface_area: lead.surface_area,
        annual_electricity_bill: lead.annual_electricity_bill,
      }

      if (selectedLeadForModal?.id === lead.id) {
        setSelectedLeadForModal(null)
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segments */}
          <div className="inline-flex rounded-lg bg-secondary p-0.5 border border-border">
            {(["ALL", "B2B", "B2C"] as const).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSegmentFilter(seg)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  segmentFilter === seg
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {seg === "ALL" ? "Tous les dossiers" : seg}
              </button>
            ))}
          </div>

          {/* Provinces */}
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground outline-hidden"
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
          <span className="text-xs text-muted-foreground font-medium">
            <strong className="font-mono text-foreground tabular-nums">{filteredLeads.length}</strong> opportunité{filteredLeads.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-card">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-1 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Vue grille"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded p-1 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Vue tableau"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grille des opportunités avec TOUTES les informations riches */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <Sparkles className="mx-auto h-10 w-10 text-accent" />
          <h3 className="mt-3 text-base font-bold text-foreground">Aucun dossier disponible avec ces filtres</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Élargissez votre sélection de provinces ou réinitialisez les filtres.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => {
            const isB2B = lead.segment === "B2B"
            const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
            const remainingSlots = lead.remaining_slots ?? maxSlots
            const takenSlots = lead.taken_slots ?? Math.max(0, maxSlots - remainingSlots)
            const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
            const isBuying = buyingId === lead.id
            const isTargeted = targetLeadId === lead.id

            const surfaceArea = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
            const annualBill = Math.max(0, Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0)

            const financials = calculateMarketplaceFinancials({
              segment: lead.segment,
              surfaceArea,
              surfaceType: lead.surface_type,
              annualBill,
              creditCost: cost,
            })

            const provinceLabel = getProvinceDisplayLabel(lead.province, lead.province_free_text)
            const city = lead.city?.trim() || provinceLabel
            const postalCode = lead.postal_code?.trim() || lead.masked_postal_code || "—"
            const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc

            return (
              <div
                key={lead.id}
                id={`lead-${lead.id}`}
                className={`flex flex-col justify-between rounded-2xl border bg-card p-5 transition-all ${
                  isTargeted
                    ? "border-accent ring-2 ring-accent/30 shadow-md bg-accent/[0.02]"
                    : "border-border shadow-xs hover:border-border hover:shadow-sm"
                }`}
              >
                <div>
                  {/* Badge ciblé par e-mail si présent */}
                  {isTargeted && (
                    <div className="mb-3 flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent border border-accent/20">
                      <span>⭐ Dossier ciblé pour vous (reçu par e-mail)</span>
                    </div>
                  )}

                  {/* Header : Segment & Localisation */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                        isB2B
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground border border-border"
                      }`}
                    >
                      {isB2B ? "B2B • Exclusif 100%" : `B2C • ${remainingSlots} place(s) sur ${maxSlots}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <MapPin className="h-3 w-3 text-accent shrink-0" />
                      <span>{city} ({postalCode})</span>
                    </span>
                  </div>

                  {/* Titre Projet & Puissance estimée */}
                  <div className="mt-3.5 flex items-baseline justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        Installation Solaire à {city}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Région : {provinceLabel} {lead.grd ? `· GRD ${lead.grd}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-foreground tabular-nums">
                        {powerKwc > 0 ? `${powerKwc} kWc` : "PV"}
                      </span>
                    </div>
                  </div>

                  {/* Badges de réassurance technique */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground border border-border">
                      <ShieldCheck className="h-3 w-3 text-primary" /> Téléphone OK
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground border border-border">
                      <ShieldCheck className="h-3 w-3 text-primary" /> Propriétaire
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground border border-border">
                      <ShieldCheck className="h-3 w-3 text-primary" /> Toiture OK
                    </span>
                  </div>

                  {/* Scarcity Slots B2C */}
                  {!isB2B && (
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {Array.from({ length: maxSlots }).map((_, idx) => {
                        const isTaken = idx < takenSlots
                        return (
                          <div
                            key={idx}
                            className={`rounded px-1.5 py-1 text-center font-mono text-[10px] font-bold ${
                              isTaken
                                ? "bg-secondary text-muted-foreground border border-border line-through"
                                : "bg-card text-foreground border border-dashed border-accent"
                            }`}
                          >
                            {isTaken ? `● Place ${idx + 1}` : `○ Place ${idx + 1}`}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Grille des caractéristiques techniques complètes */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Surface & Toiture</span>
                      <span className="font-semibold text-foreground text-right">
                        <span className="font-mono tabular-nums">{surfaceArea > 0 ? `${surfaceArea} m²` : "—"}</span>
                        {" • "}
                        <span>{getRoofMaterialLabel(lead.roof_material)}</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Facture d&apos;électricité</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} € HT/an` : "—"}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Décisionnaire</span>
                      <span className="font-medium text-foreground text-right">
                        {getOwnershipLabel(lead.ownership_status)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Échéance souhaitée</span>
                      <span className="font-medium text-foreground text-right">
                        {getTimeframeLabel(lead.timeframe || lead.project_timeline)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Objectif clé</span>
                      <span className="font-medium text-foreground text-right truncate max-w-[55%]">
                        {getProjectDriverLabel(lead.project_driver)}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Message prospect si renseigné */}
                  {(lead.project_details || lead.message) && (
                    <div className="mt-3 rounded-lg bg-secondary/50 border border-border p-2.5 text-[11px] italic text-muted-foreground line-clamp-2">
                      « {lead.project_details || lead.message} »
                    </div>
                  )}

                  {/* Estimations Économiques Installateur */}
                  <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Devis estimé</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {financials.estimatedContractValueRange.min.toLocaleString("fr-BE")} € à {financials.estimatedContractValueRange.max.toLocaleString("fr-BE")} €
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Marge brute indicative</span>
                      <span className="font-mono font-bold text-accent tabular-nums">
                        ~{financials.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Carte : Coût en crédits & Déblocage / Fiche */}
                <div className="mt-5 border-t border-border pt-4 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-muted-foreground">Tarif acquisition</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-xl font-black text-foreground tabular-nums">{cost}</span>
                      <span className="text-xs font-semibold text-muted-foreground">crédits</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLeadForModal(lead)}
                      className="h-9 px-2.5 text-xs font-medium"
                      title="Voir tous les détails du projet"
                    >
                      <Info className="h-3.5 w-3.5 mr-1" />
                      Fiche
                    </Button>

                    <Button
                      size="sm"
                      variant="default"
                      disabled={isBuying}
                      onClick={() => handlePurchase(lead)}
                      className="h-9 px-3.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isBuying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5 mr-1" />
                          <span>Débloquer</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Vue Table enrichie */
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/50 text-[11px] font-bold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3">Localisation & CP</th>
                <th className="px-4 py-3">Puissance & Toiture</th>
                <th className="px-4 py-3">Facture & Marge Est.</th>
                <th className="px-4 py-3">Disponibilité</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.map((lead) => {
                const isB2B = lead.segment === "B2B"
                const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
                const isBuying = buyingId === lead.id
                const surfaceArea = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
                const annualBill = Math.max(0, Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0)

                const financials = calculateMarketplaceFinancials({
                  segment: lead.segment,
                  surfaceArea,
                  surfaceType: lead.surface_type,
                  annualBill,
                  creditCost: cost,
                })

                const provinceLabel = getProvinceDisplayLabel(lead.province, lead.province_free_text)
                const city = lead.city?.trim() || provinceLabel
                const postalCode = lead.postal_code?.trim() || lead.masked_postal_code || "—"
                const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc

                return (
                  <tr key={lead.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                          isB2B ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"
                        }`}
                      >
                        {lead.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {city} ({postalCode})
                      <div className="text-[11px] text-muted-foreground">{provinceLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <div className="font-mono font-bold tabular-nums">{powerKwc > 0 ? `${powerKwc} kWc` : "PV"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {surfaceArea > 0 ? `${surfaceArea} m²` : ""} · {getRoofMaterialLabel(lead.roof_material)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <div className="font-mono font-semibold tabular-nums">
                        {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} €/an` : "—"}
                      </div>
                      <div className="font-mono text-[11px] text-accent tabular-nums">
                        Marge ~{financials.estimatedInstallerMargin.toLocaleString("fr-BE")} €
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">
                      {isB2B ? "Exclusif (1 max)" : `${lead.remaining_slots || 3} place(s)`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLeadForModal(lead)}
                          className="h-8 px-2.5 text-xs"
                        >
                          Détails
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={isBuying}
                          onClick={() => handlePurchase(lead)}
                          className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isBuying ? "..." : `Débloquer (${cost} cr)`}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Fiche Technique Complète */}
      {selectedLeadForModal && (
        <LeadDetailModal
          lead={selectedLeadForModal}
          partnerCredits={partnerCredits}
          isBuying={buyingId === selectedLeadForModal.id}
          onClose={() => setSelectedLeadForModal(null)}
          onPurchase={(lead) => handlePurchase(lead)}
          onRequestTopUp={onRequestTopUp}
        />
      )}
    </div>
  )
}
