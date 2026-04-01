"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { LeadScoreBadge } from "@/components/admin-lead-score-badge"
import { toast } from "sonner"

function NotifyInstallateurButton({ leadId, className }: { leadId: string; className?: string }) {
  const [loading, setLoading] = useState(false)
  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notify-installateur`, { 
        method: "POST",
        headers: { "x-admin-request": "true" }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur")
      toast.success(data.message ?? "Email envoyé à l'installateur.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi.")
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("w-full gap-2", className)}
      onClick={handleClick}
      disabled={loading}
    >
      <Mail className="h-4 w-4" />
      {loading ? "Envoi…" : "Renvoyer l'email à l'installateur"}
    </Button>
  )
}

const PROJECT_TIMELINE_LABELS: Record<string, string> = {
  urgent: "Urgent (Moins de 3 mois)",
  "3_6_months": "3 à 6 mois",
  "6_plus_months": "Plus de 6 mois (Exploratoire)",
}

type Installateur = { id: string; name: string; email: string; actif: boolean }

type Lead = {
  id: string
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  job_title: string
  company: string | null
  message?: string | null
  surface_type: string | null
  surface_area: number | null
  project_timeline?: string | null
  annual_electricity_bill: number | null
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  status: string
  lead_score?: number | null
  installateur_id?: string | null
  wants_irve?: boolean
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
  const [installateurs, setInstallateurs] = useState<Installateur[]>([])
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
    } else {
      setLoading(true)
      fetch(`/api/admin/leads/${leadId}`, {
        headers: { "x-admin-request": "true" }
      })
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
    }
  }, [leadId, currentLeadFromList?.id])

  useEffect(() => {
    if (!open) return
    fetch("/api/admin/installateurs", {
      headers: { "x-admin-request": "true" }
    })
      .then((res) => res.ok ? res.json() : [])
      .then((data: Installateur[]) => setInstallateurs(data))
      .catch(() => setInstallateurs([]))
  }, [open])

  async function handleStatusChange(value: string) {
    if (!lead || value === lead.status) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-request": "true"
        },
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

  async function handleInstallateurChange(value: string) {
    if (!lead) return
    const installateurId = value === "none" ? null : value
    if (installateurId === lead.installateur_id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-request": "true"
        },
        body: JSON.stringify({ installateur_id: installateurId }),
      })
      if (!res.ok) throw new Error("Erreur")
      const data = await res.json()
      setLead((prev) => (prev ? { ...prev, ...data } : null))
      if (data.installateur_notified) {
        toast.success("Lead assigné et envoyé à l'installateur par e-mail")
      } else {
        toast.success("Installateur assigné")
      }
    } catch {
      toast.error("Erreur lors de l'assignation")
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
              <span className="text-lg font-semibold">{lead.first_name}{lead.last_name ? ` ${lead.last_name}` : ""}</span>
              <div className="flex items-center gap-2">
                <LeadScoreBadge score={lead.lead_score} />
                <LeadStatusBadge status={lead.status} />
              </div>
            </div>

            {/* Assignation et statut en premier pour être visibles sans scroller */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div>
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
                    <SelectItem value="HOT_LEAD">Lead chaud</SelectItem>
                    <SelectItem value="NEEDS_HUMAN_REVIEW">À contrôler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground mb-2 block">Assigner à un installateur</Label>
                <Select
                  value={lead.installateur_id ?? "none"}
                  onValueChange={handleInstallateurChange}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {installateurs.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}{!i.actif ? " (inactif)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {installateurs.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Aucun installateur. Allez dans <strong>Installateurs</strong> (menu) pour en ajouter un, puis vous pourrez l’assigner ici.
                  </p>
                )}
                {lead.installateur_id && (
                  <NotifyInstallateurButton leadId={lead.id} className="mt-2" />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{lead.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Téléphone</Label>
                <p className="font-medium">{lead.phone ?? "–"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Fonction</Label>
                <p className="font-medium">{lead.job_title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Entreprise</Label>
                <p className="font-medium">{lead.company ?? "–"}</p>
              </div>
              {lead.message?.trim() ? (
                <div>
                  <Label className="text-muted-foreground">Message / précisions</Label>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{lead.message}</p>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <Label className="text-muted-foreground">Surface</Label>
                <p className="font-medium">
                  {lead.surface_area != null && lead.surface_type ? `${lead.surface_area} m² (${lead.surface_type})` : "–"}
                </p>
              </div>
              {lead.project_timeline ? (
                <div>
                  <Label className="text-muted-foreground">Délai projet</Label>
                  <p className="font-medium">{PROJECT_TIMELINE_LABELS[lead.project_timeline] ?? lead.project_timeline}</p>
                </div>
              ) : null}
              <div>
                <Label className="text-muted-foreground">Facture annuelle</Label>
                <p className="font-medium">
                  {lead.annual_electricity_bill != null ? `${lead.annual_electricity_bill.toLocaleString("fr-FR")} €` : "–"}
                </p>
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
              {lead.wants_irve && (
                <div>
                  <Label className="text-muted-foreground">Option IRVE</Label>
                  <p className="font-medium">Oui – souhaite coupler avec bornes de recharge</p>
                </div>
              )}
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
