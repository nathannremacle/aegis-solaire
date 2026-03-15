"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { toast } from "sonner"

type Lead = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company: string | null
  surface_type: string
  surface_area: number
  annual_electricity_bill: number
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  status: string
  created_at: string
  updated_at?: string
}

export function LeadDetailSheet({
  leadId,
  onClose,
  currentLeadFromList,
}: {
  leadId: string | null
  onClose: () => void
  currentLeadFromList?: Lead | null
}) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(currentLeadFromList ?? null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const open = !!leadId

  useEffect(() => {
    if (!leadId) {
      setLead(null)
      return
    }
    if (currentLeadFromList && currentLeadFromList.id === leadId) {
      setLead(currentLeadFromList)
      return
    }
    setLoading(true)
    fetch(`/api/admin/leads/${leadId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Lead introuvable")
        return res.json()
      })
      .then((data: Lead) => setLead(data))
      .catch(() => {
        toast.error("Impossible de charger le lead")
        onClose()
      })
      .finally(() => setLoading(false))
  }, [leadId, currentLeadFromList?.id])

  async function handleStatusChange(value: string) {
    if (!lead || value === lead.status) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      })
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setLead((prev) => (prev ? { ...prev, ...data } : null))
      toast.success("Statut mis à jour")
    } catch {
      toast.error("Erreur lors de la mise à jour du statut")
    } finally {
      setSaving(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Détail du lead</SheetTitle>
        </SheetHeader>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : lead ? (
          <div className="space-y-6 px-4 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-semibold">{lead.first_name} {lead.last_name}</span>
              <LeadStatusBadge status={lead.status} />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{lead.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Téléphone</Label>
                <p className="font-medium">{lead.phone}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Fonction</Label>
                <p className="font-medium">{lead.job_title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Entreprise</Label>
                <p className="font-medium">{lead.company ?? "–"}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <Label className="text-muted-foreground">Surface</Label>
                <p className="font-medium">{lead.surface_area} m² ({lead.surface_type})</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Facture annuelle</Label>
                <p className="font-medium">{lead.annual_electricity_bill.toLocaleString("fr-FR")} €</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ROI estimé</Label>
                <p className="font-medium">{lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"}</p>
              </div>
              {lead.autoconsumption_rate != null && (
                <div>
                  <Label className="text-muted-foreground">Taux d'autoconsommation</Label>
                  <p className="font-medium">{lead.autoconsumption_rate} %</p>
                </div>
              )}
              {lead.estimated_savings != null && (
                <div>
                  <Label className="text-muted-foreground">Économies estimées</Label>
                  <p className="font-medium">{lead.estimated_savings.toLocaleString("fr-FR")} € / an</p>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <Label className="text-muted-foreground mb-2 block">Changer le statut</Label>
              <Select value={lead.status} onValueChange={handleStatusChange} disabled={saving}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nouveau</SelectItem>
                  <SelectItem value="contacted">Contacté</SelectItem>
                  <SelectItem value="qualified">Qualifié</SelectItem>
                  <SelectItem value="converted">Converti</SelectItem>
                  <SelectItem value="lost">Perdu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Reçu le {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
