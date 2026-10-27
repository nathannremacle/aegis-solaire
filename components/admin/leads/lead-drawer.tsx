"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Phone,
  Mail,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Archive,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { LeadRiskBanner } from "./lead-risk-banner"
import { LeadScoreBreakdown } from "./lead-score-breakdown"
import { DispatchPanel, type CompatiblePartner } from "./dispatch-panel"
import { LeadRelanceStatus } from "./lead-relance-status"
import { calculateLeadScore } from "@/lib/lead-score"
import { detectLeadRiskFlags } from "@/lib/admin/lead-risk"
import { formatBceNumber, BCE_PUBLIC_SEARCH_URL } from "@/lib/leads-schema"
import {
  publishLeadAction,
  rejectLeadAction,
  archiveLeadAction,
  assignLeadAction,
} from "@/app/admin/actions"
import { useAdminHotkeys } from "@/hooks/use-admin-hotkeys"

export type LeadDetail = {
  id: string
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  job_title: string
  company: string | null
  company_vat?: string | null
  message?: string | null
  surface_type: string | null
  surface_area: number | null
  roof_material?: string | null
  ownership_status?: string | null
  project_timeline?: string | null
  annual_electricity_bill: number | null
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  status: string
  marketplace_status?: string | null
  credit_cost?: number | null
  lead_score?: number | null
  installateur_id?: string | null
  wants_irve?: boolean
  segment?: string | null
  province?: string | null
  postal_code?: string | null
  city?: string | null
  site_address?: string | null
  grd?: string | null
  media_partner_code?: string | null
  admin_notes?: string | null
  created_at: string
  lead_purchases?: {
    id: string
    partner_id: string
    purchased_at?: string
    partners?:
      | {
          id: string
          company_name: string
          email: string
          is_test?: boolean
        }
      | {
          id: string
          company_name: string
          email: string
          is_test?: boolean
        }[]
      | null
  }[]
}

export function LeadDrawer({
  lead,
  open,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  partners = [],
  onLeadActionDone,
}: {
  lead: LeadDetail | null
  open: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  partners?: CompatiblePartner[]
  onLeadActionDone?: (id: string, action: "qualified" | "rejected" | "archived") => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(lead?.admin_notes ?? "")
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [creditCost, setCreditCost] = useState<number>(
    lead?.credit_cost ?? (lead?.segment === "B2B" ? 5 : 2)
  )
  const [dispatchMode, setDispatchMode] = useState<"marketplace" | "direct">("marketplace")
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>(
    lead?.installateur_id ? [lead.installateur_id] : []
  )

  useEffect(() => {
    if (lead) {
      setNotes(lead.admin_notes ?? "")
      setCreditCost(lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2))
      setSelectedPartnerIds(lead.installateur_id ? [lead.installateur_id] : [])
    }
  }, [lead])

  // Sauvegarde des notes avec debounce
  useEffect(() => {
    if (!lead || notes === (lead.admin_notes ?? "")) return

    setNotesSaving(true)
    const leadId = lead.id
    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/admin/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-admin-request": "true" },
          body: JSON.stringify({ admin_notes: notes }),
        })
        setNotesSaved(true)
        setTimeout(() => setNotesSaved(false), 2000)
      } catch {
        // non blocking
      } finally {
        setNotesSaving(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [notes, lead])

  // Détection des risques et calcul du score
  const riskFlags = lead
    ? detectLeadRiskFlags({
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        postalCode: lead.postal_code,
        province: lead.province,
        segment: lead.segment,
        company: lead.company,
        companyVat: lead.company_vat,
        ownershipStatus: lead.ownership_status,
        surfaceArea: lead.surface_area,
        annualElectricityBill: lead.annual_electricity_bill,
      })
    : []

  const scoreResult = lead
    ? calculateLeadScore({
        firstName: lead.first_name,
        lastName: lead.last_name || "",
        jobTitle: lead.job_title,
        surfaceArea: lead.surface_area ?? 0,
        annualElectricityBill: lead.annual_electricity_bill ?? 0,
        segment: lead.segment ?? "B2B",
        grd: lead.grd,
      })
    : { score: 0, status: "new" as const, factors: [] }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié dans le presse-papiers`)
  }

  async function handleQualifyAndPublish() {
    if (!lead) return
    const leadId = lead.id

    if (dispatchMode === "direct") {
      if (selectedPartnerIds.length === 0) {
        toast.error("Veuillez sélectionner au moins un installateur pour l'attribution directe.")
        return
      }

      startTransition(async () => {
        try {
          await assignLeadAction(leadId, selectedPartnerIds, true)
          toast.success(
            `Lead attribué en direct à ${selectedPartnerIds.length} installateur(s)`
          )
          onLeadActionDone?.(leadId, "qualified")
          router.refresh()
          if (hasNext && onNext) {
            onNext()
          } else {
            onClose()
          }
        } catch (err: any) {
          toast.error(err.message || "Échec de l'attribution directe")
        }
      })
      return
    }

    startTransition(async () => {
      try {
        await publishLeadAction(leadId, creditCost)
        toast.success(`Lead #${leadId.slice(0, 8)} qualifié et publié sur la marketplace`)
        onLeadActionDone?.(leadId, "qualified")
        router.refresh()
        if (hasNext && onNext) {
          onNext()
        } else {
          onClose()
        }
      } catch {
        toast.error("Échec de la publication du lead")
      }
    })
  }

  async function handleReject(reason: string) {
    if (!lead) return
    const leadId = lead.id
    startTransition(async () => {
      try {
        await rejectLeadAction(leadId, reason, notes)
        toast.success(`Lead #${leadId.slice(0, 8)} rejeté (${reason})`)
        onLeadActionDone?.(leadId, "rejected")
        router.refresh()
        if (hasNext && onNext) {
          onNext()
        } else {
          onClose()
        }
      } catch {
        toast.error("Échec du rejet du lead")
      }
    })
  }

  async function handleArchive() {
    if (!lead) return
    const leadId = lead.id
    startTransition(async () => {
      try {
        await archiveLeadAction(leadId)
        toast.success(`Lead #${leadId.slice(0, 8)} archivé`)
        onLeadActionDone?.(leadId, "archived")
        router.refresh()
        if (hasNext && onNext) {
          onNext()
        } else {
          onClose()
        }
      } catch {
        toast.error("Échec de l'archivage")
      }
    })
  }

  // Raccourcis clavier contextuels dans le Drawer
  useAdminHotkeys(
    {
      "cmd+enter": () => handleQualifyAndPublish(),
      q: () => handleQualifyAndPublish(),
      e: () => handleArchive(),
      c: () => lead?.phone && copyToClipboard(lead.phone, "Numéro de téléphone"),
    },
    open && !!lead
  )

  if (!lead) return null

  const shortId = lead.id.slice(0, 8).toUpperCase()
  const prospectTitle = lead.segment === "B2B" && lead.company ? lead.company : `${lead.first_name} ${lead.last_name || ""}`

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        hasOverlay={false}
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-card text-foreground border-l border-border h-full shadow-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Inspection du Lead {shortId}</SheetTitle>
        </SheetHeader>

        {/* Header Sticky */}
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card px-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              #{shortId}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground border border-border">
              {lead.segment ?? "B2B"}
            </span>
            <LeadStatusBadge
              status={lead.status}
              marketplaceStatus={lead.marketplace_status}
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={!hasPrevious}
              onClick={onPrevious}
              title="Lead précédent (K)"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={!hasNext}
              onClick={onNext}
              title="Lead suivant (J)"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground ml-1"
              onClick={onClose}
              title="Fermer (Échap)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contenu Défilant */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 custom-scrollbar">
          {/* Titre du prospect et délai */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                {prospectTitle}
              </h2>
              <span className="text-xs text-muted-foreground">
                Reçu le {new Date(lead.created_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Bandeau d'Alertes et Vigilance */}
          <LeadRiskBanner flags={riskFlags} />

          {/* Score de Qualification Décomposé */}
          <LeadScoreBreakdown
            score={lead.lead_score ?? scoreResult.score}
            factors={scoreResult.factors}
          />

          {/* Carte Coordonnées & Contact */}
          <div className="rounded-md border border-border bg-card p-3.5 flex flex-col gap-3">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              Contact & Entreprise
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Interlocuteur</span>
                <span className="font-medium text-foreground">
                  {lead.first_name} {lead.last_name || ""}
                  {lead.job_title ? ` · ${lead.job_title}` : ""}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Téléphone</span>
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  {lead.phone ? (
                    <>
                      <a
                        href={`tel:${lead.phone}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {lead.phone}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(lead.phone!, "Téléphone")}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        title="Copier le numéro (C)"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">Non renseigné</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Adresse e-mail</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium text-foreground hover:text-primary transition-colors truncate"
                  >
                    {lead.email}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(lead.email, "E-mail")}
                    className="text-muted-foreground hover:text-foreground p-0.5 shrink-0"
                    title="Copier l'e-mail"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {lead.company_vat && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Numéro TVA / BCE</span>
                  <div className="flex items-center gap-1.5 font-mono tabular-nums">
                    <span className="font-medium text-foreground">{lead.company_vat}</span>
                    <a
                      href={`${BCE_PUBLIC_SEARCH_URL}?action=search&zoekWaarde=${formatBceNumber(lead.company_vat)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2"
                      title="Vérifier sur la BCE"
                    >
                      <span>BCE</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Localisation */}
            <div className="border-t border-border/80 pt-2.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Localisation :</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
                {lead.postal_code ? `${lead.postal_code} ` : ""}
                {lead.city || ""}
                {lead.province ? ` (${lead.province.replace("_", " ")})` : ""}
              </span>
            </div>
          </div>

          {/* Données Techniques du Projet Solaire */}
          <div className="rounded-md border border-border bg-card p-3.5 flex flex-col gap-3">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              Spécifications Techniques
            </span>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div className="flex flex-col">
                <dt className="text-muted-foreground">Surface</dt>
                <dd className="font-mono tabular-nums font-semibold text-foreground">
                  {lead.surface_area != null ? `${lead.surface_area} m²` : "–"}{" "}
                  <span className="font-sans font-normal text-muted-foreground">
                    ({lead.surface_type || "toiture"})
                  </span>
                </dd>
              </div>

              <div className="flex flex-col">
                <dt className="text-muted-foreground">Facture d'électricité</dt>
                <dd className="font-mono tabular-nums font-semibold text-foreground">
                  {lead.annual_electricity_bill != null
                    ? `${lead.annual_electricity_bill.toLocaleString("fr-BE")} € / an`
                    : "–"}
                </dd>
              </div>

              <div className="flex flex-col">
                <dt className="text-muted-foreground">Revêtement toiture</dt>
                <dd className="font-medium text-foreground capitalize">
                  {lead.roof_material ? lead.roof_material.replace("_", " ") : "–"}
                </dd>
              </div>

              <div className="flex flex-col">
                <dt className="text-muted-foreground">Statut d'occupation</dt>
                <dd className="font-medium text-foreground">
                  {lead.ownership_status === "owner" ? "Propriétaire" : lead.ownership_status === "tenant_unauthorized" ? "Locataire (sans accord)" : lead.ownership_status || "–"}
                </dd>
              </div>

              <div className="flex flex-col">
                <dt className="text-muted-foreground">GRD Réseau</dt>
                <dd className="font-mono font-medium uppercase text-foreground">
                  {lead.grd || "–"}
                </dd>
              </div>

              <div className="flex flex-col">
                <dt className="text-muted-foreground">ROI estimé</dt>
                <dd className="font-mono tabular-nums font-medium text-foreground">
                  {lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"}
                </dd>
              </div>
            </dl>

            {lead.message && (
              <div className="border-t border-border/80 pt-2.5 flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground font-medium">Notes du client :</span>
                <p className="text-xs text-foreground bg-secondary/40 rounded p-2 italic leading-relaxed">
                  "{lead.message}"
                </p>
              </div>
            )}
          </div>

          {/* Module de Suivi des Relances & Vagues de Vente */}
          <LeadRelanceStatus
            leadId={lead.id}
            marketplaceStatus={lead.marketplace_status}
            segment={lead.segment}
          />

          {/* Module de Sélection et Routage Installateurs */}
          <DispatchPanel
            segment={lead.segment ?? "B2B"}
            province={lead.province}
            creditCost={creditCost}
            onCreditCostChange={setCreditCost}
            partners={partners}
            selectedPartnerIds={selectedPartnerIds}
            onSelectionChange={setSelectedPartnerIds}
            dispatchMode={dispatchMode}
            onDispatchModeChange={setDispatchMode}
          />

          {/* Notes Internes Admin */}
          <div className="rounded-md border border-border bg-card p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Notes Internes
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {notesSaving && <span className="text-muted-foreground">Enregistrement…</span>}
                {notesSaved && <span className="text-primary font-medium">✓ Enregistré</span>}
              </div>
            </div>
            <Textarea
              placeholder="Commentaires d'audit, échanges téléphoniques..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[70px] resize-y"
            />
          </div>
        </div>

        {/* Footer Sticky */}
        <div className="sticky bottom-0 z-10 flex h-14 items-center justify-between border-t border-border bg-card px-5">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  <span>Rejeter</span>
                  <span className="font-mono text-[10px] text-muted-foreground ml-1">R</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem onClick={() => handleReject("Hors zone wallonne")}>
                  1. Hors zone wallonne
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject("Spam ou données factices")}>
                  2. Spam ou données factices
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject("Numéro injoignable")}>
                  3. Numéro injoignable
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject("Doublon existant")}>
                  4. Doublon existant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject("Locataire non autorisé")}>
                  5. Locataire non autorisé
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject("Autre motif")}>
                  6. Autre motif
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archiver</span>
            </Button>
          </div>

          <Button
            size="sm"
            onClick={handleQualifyAndPublish}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>
              {dispatchMode === "marketplace"
                ? "Qualifier & publier"
                : `Attribuer (${selectedPartnerIds.length})`}
            </span>
            <span className="font-mono text-[10px] opacity-70 ml-1">⌘⏎</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
