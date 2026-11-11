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
  MapPin,
  User,
  Zap,
  Building2,
  Calendar,
  Euro,
  TrendingUp,
  FileText,
  ShieldAlert,
  Percent,
  Camera,
  UploadCloud,
  Trash2,
  ImageIcon,
  Home,
  Ruler,
  BatteryCharging,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { LeadRiskBanner } from "./lead-risk-banner"
import { LeadScoreBreakdown } from "./lead-score-breakdown"
import { DispatchPanel, type CompatiblePartner } from "./dispatch-panel"
import { LeadRelanceStatus } from "./lead-relance-status"
import { calculateLeadScore } from "@/lib/lead-score"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { parseLeadProjectDetails } from "@/lib/lead-display-helpers"
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
  project_details?: string | null
  surface_type: string | null
  surface_area: number | null
  estimated_power_kwc?: number | null
  roof_material?: string | null
  ownership_status?: string | null
  project_timeline?: string | null
  annual_electricity_bill: number | null
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  qualification_metadata?: Record<string, unknown> | null
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
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([])
  const [roofImageUrl, setRoofImageUrl] = useState<string | null>(
    ((lead?.qualification_metadata?.roof_image_url || lead?.qualification_metadata?.site_image_url) as string) ?? null
  )
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [urlInputOpen, setUrlInputOpen] = useState(false)
  const [customUrlInput, setCustomUrlInput] = useState("")

  useEffect(() => {
    if (lead) {
      setNotes(lead.admin_notes ?? "")
      setCreditCost(lead.credit_cost ?? (lead.segment === "B2B" ? 9 : 3))
      setSelectedPartnerIds([])
      const currentImg = ((lead.qualification_metadata?.roof_image_url || lead.qualification_metadata?.site_image_url) as string) ?? null
      setRoofImageUrl(currentImg)
      setCustomUrlInput("")
      setUrlInputOpen(false)
    }
  }, [lead])

  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !lead) return

    setIsUploadingImage(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/image`, {
        method: "POST",
        headers: {
          "x-admin-request": "true",
        },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'upload")
      }
      setRoofImageUrl(data.imageUrl)
      if (lead.qualification_metadata) {
        lead.qualification_metadata.roof_image_url = data.imageUrl
        lead.qualification_metadata.site_image_url = data.imageUrl
      }
      toast.success("Photo de toiture / façade enregistrée avec succès")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Impossible de télécharger l'image")
    } finally {
      setIsUploadingImage(false)
      e.target.value = ""
    }
  }

  const handleAttachImageUrl = async () => {
    if (!customUrlInput.trim() || !lead) return
    setIsUploadingImage(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({ imageUrl: customUrlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement de l'URL")
      }
      setRoofImageUrl(data.imageUrl)
      if (lead.qualification_metadata) {
        lead.qualification_metadata.roof_image_url = data.imageUrl
        lead.qualification_metadata.site_image_url = data.imageUrl
      }
      setUrlInputOpen(false)
      setCustomUrlInput("")
      toast.success("URL de photo enregistrée avec succès")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement de l'URL")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!lead || !roofImageUrl) return
    if (!confirm("Voulez-vous vraiment retirer cette photo du lead ?")) return

    setIsUploadingImage(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/image`, {
        method: "DELETE",
        headers: {
          "x-admin-request": "true",
        },
      })
      if (!res.ok) {
        throw new Error("Erreur lors de la suppression")
      }
      setRoofImageUrl(null)
      if (lead.qualification_metadata) {
        delete lead.qualification_metadata.roof_image_url
        delete lead.qualification_metadata.site_image_url
      }
      toast.success("Photo retirée du dossier")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Impossible de supprimer la photo")
    } finally {
      setIsUploadingImage(false)
    }
  }

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

  const financials = calculateMarketplaceFinancials({
    segment: lead.segment ?? "B2B",
    surfaceArea: lead.surface_area,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: lead.annual_electricity_bill,
    creditCost: lead.credit_cost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details ?? lead.message,
    qualificationMetadata: lead.qualification_metadata ?? null,
  })

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
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                <User className="h-3.5 w-3.5 text-primary" />
                Contact & Coordonnées Prospect
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                {lead.segment === "B2B" ? "Dossier Professionnel" : "Particulier Résidentiel"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50">
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <User className="h-3 w-3 text-muted-foreground" />
                  Interlocuteur
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {lead.first_name} {lead.last_name || ""}
                </span>
                {lead.job_title && (
                  <span className="text-[11px] text-muted-foreground">
                    {lead.job_title}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50">
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Téléphone
                </span>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  {lead.phone ? (
                    <>
                      <a
                        href={`tel:${lead.phone}`}
                        className="font-bold text-foreground hover:text-primary transition-colors text-sm"
                      >
                        {lead.phone}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(lead.phone!, "Téléphone")}
                        className="p-1 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Copier le numéro (C)"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Non renseigné</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50 sm:col-span-2">
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  Adresse e-mail
                </span>
                <div className="flex items-center justify-between gap-2 font-mono">
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors text-xs truncate"
                  >
                    {lead.email}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(lead.email, "E-mail")}
                    className="p-1 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Copier l'e-mail"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {lead.company_vat && (
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50 sm:col-span-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    Numéro TVA / BCE
                  </span>
                  <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                    <span className="font-bold text-foreground">{lead.company_vat}</span>
                    <a
                      href={`${BCE_PUBLIC_SEARCH_URL}?action=search&zoekWaarde=${formatBceNumber(lead.company_vat)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded"
                      title="Vérifier sur la BCE"
                    >
                      <span>Vérifier BCE</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Localisation & Adresse exacte */}
            <div className="rounded-lg bg-secondary/50 border border-border p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider font-mono">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  Adresse du Chantier & Localisation
                </span>
                {lead.site_address && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      `${lead.site_address}, ${lead.postal_code || ""} ${lead.city || ""}`.trim(),
                      "Adresse complète"
                    )}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    Copier
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1 text-xs">
                {lead.site_address ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-muted-foreground text-[11px] shrink-0 font-medium">Adresse exacte :</span>
                    <span className="font-semibold text-foreground text-sm select-all">
                      {lead.site_address}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic">
                    Adresse exacte de voirie non renseignée (uniquement commune & CP)
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                  <span className="text-muted-foreground text-[11px] shrink-0">Ville & Province :</span>
                  <span className="font-mono tabular-nums font-bold text-foreground">
                    {lead.postal_code ? `${lead.postal_code} ` : ""}
                    {lead.city || "Non précisée"}
                    {lead.province ? ` · Province de ${lead.province.replace("_", " ")}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Visuel du Bâtiment & Toiture (Street View) */}
            <div className="rounded-lg bg-secondary/50 border border-border p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider font-mono">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Visuel Façade & Toiture (Street View)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                  Marketplace &amp; E-mails
                </span>
              </div>

              {roofImageUrl ? (
                <div className="flex flex-col gap-2">
                  <div className="relative rounded-lg overflow-hidden border border-border bg-card group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={roofImageUrl}
                      alt="Visuel Street View du bâtiment"
                      className="w-full h-44 object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <a
                        href={roofImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-foreground/80 hover:bg-foreground text-background shadow-xs transition-colors backdrop-blur-xs"
                        title="Ouvrir l'image originale en grand"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Agrandir</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted text-foreground cursor-pointer transition-colors">
                      {isUploadingImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>{isUploadingImage ? "Mise à jour..." : "Remplacer l'image"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleUploadImageFile}
                        disabled={isUploadingImage}
                        className="sr-only"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleDeleteImage}
                      disabled={isUploadingImage}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 border border-transparent transition-colors"
                      title="Retirer la photo du lead"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Retirer</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="border border-dashed border-border rounded-lg p-3 text-center bg-card/50 flex flex-col items-center justify-center gap-2">
                    <div className="p-2 rounded-full bg-secondary text-muted-foreground">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-foreground">
                        Aucun visuel associé
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Capturez la maison sur Google Street View et ajoutez-la pour rassurer les installateurs.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-colors">
                        {isUploadingImage ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5" />
                        )}
                        <span>{isUploadingImage ? "Envoi en cours..." : "Télécharger une photo"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleUploadImageFile}
                          disabled={isUploadingImage}
                          className="sr-only"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setUrlInputOpen(!urlInputOpen)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground underline decoration-dotted"
                      >
                        {urlInputOpen ? "Annuler" : "Ou coller une URL"}
                      </button>
                    </div>
                  </div>

                  {urlInputOpen && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="url"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        placeholder="https://.../photo.jpg"
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-input bg-card text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-ring"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleAttachImageUrl}
                        disabled={isUploadingImage || !customUrlInput.trim()}
                        className="text-xs h-8"
                      >
                        {isUploadingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : "Associer"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Données Techniques & Rentabilité Estimée du Projet Solaire */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5 text-accent-solar" />
                Spécifications Techniques & Rentabilité
              </span>
              <span className="font-mono tabular-nums text-xs px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold border border-border">
                {financials.estimatedPowerKwc} kWc · {financials.estimatedPanelCount} panneaux
              </span>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Puissance & Modules
                </dt>
                <dd className="font-mono tabular-nums font-bold text-foreground text-sm mt-0.5">
                  {financials.estimatedPowerKwc} kWc{" "}
                  <span className="font-normal text-muted-foreground text-[11px]">
                    ({financials.estimatedPanelCount} mod.)
                  </span>
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Building2 className="h-2.5 w-2.5" />
                  Surface Toiture
                </dt>
                <dd className="font-mono tabular-nums font-bold text-foreground text-sm mt-0.5">
                  {financials.normalizedSurfaceAreaM2} m²{" "}
                  <span className="font-normal text-muted-foreground text-[11px]">
                    (utile ≈ {financials.usableSurfaceM2} m²)
                  </span>
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Euro className="h-2.5 w-2.5" />
                  Facture & Conso
                </dt>
                <dd className="font-mono tabular-nums font-bold text-foreground text-sm mt-0.5">
                  {financials.normalizedAnnualBill.toLocaleString("fr-BE")} €/an{" "}
                  <span className="font-normal text-muted-foreground text-[11px]">
                    (≈ {financials.estimatedAnnualConsumptionKwh.toLocaleString("fr-BE")} kWh)
                  </span>
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Production attendue
                </dt>
                <dd className="font-mono tabular-nums font-bold text-foreground mt-0.5">
                  {financials.annualProductionKwh.toLocaleString("fr-BE")} kWh / an
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Percent className="h-2.5 w-2.5" />
                  Autoconsommation
                </dt>
                <dd className="font-mono tabular-nums font-bold text-foreground mt-0.5">
                  {financials.autoconsumptionRate} %{" "}
                  <span className="font-normal text-muted-foreground text-[11px]">
                    ({financials.selfConsumedKwh.toLocaleString("fr-BE")} kWh)
                  </span>
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Euro className="h-2.5 w-2.5" />
                  Économies client
                </dt>
                <dd className="font-mono tabular-nums font-bold text-primary mt-0.5">
                  +{financials.revenueEstimatePerYear.toLocaleString("fr-BE")} € / an
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  ROI Client
                </dt>
                <dd className="font-mono tabular-nums font-bold text-foreground mt-0.5">
                  {financials.estimatedRoiYears} ans
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5" />
                  Devis marché estimé
                </dt>
                <dd className="font-mono tabular-nums font-bold text-foreground mt-0.5">
                  {financials.estimatedContractValueRange.min.toLocaleString("fr-BE")} – {financials.estimatedContractValueRange.max.toLocaleString("fr-BE")} € HT
                </dd>
              </div>

              <div className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-border/50">
                <dt className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Marge installateur
                </dt>
                <dd className="font-mono tabular-nums font-bold text-primary mt-0.5">
                  ≈ {financials.estimatedInstallerMargin.toLocaleString("fr-BE")} € ({financials.installerMarginPercent}%)
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Couverture toiture :</span>
                <span className="font-semibold text-foreground capitalize">
                  {lead.roof_material ? lead.roof_material.replace("_", " ") : "Non spécifié"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Statut d'occupation :</span>
                <span className="font-semibold text-foreground">
                  {lead.ownership_status === "owner" ? "Propriétaire occupant" : lead.ownership_status === "tenant_unauthorized" ? "Locataire (sans accord)" : lead.ownership_status || "Non renseigné"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Topologie onduleur / GRD :</span>
                <span className="font-mono font-semibold text-foreground">
                  {financials.inverterType} {lead.grd ? `(${lead.grd.toUpperCase()})` : ""}
                </span>
              </div>
            </div>

            {/* Notes & Détails du projet (saisis par le prospect) */}
            {(() => {
              const notesText = lead.project_details || lead.message
              if (!notesText) return null

              const parsed = parseLeadProjectDetails(notesText)

              const getBadgeIcon = (iconName: string) => {
                switch (iconName) {
                  case "MapPin":
                    return <MapPin className="h-3.5 w-3.5 text-accent" />
                  case "Zap":
                    return <Zap className="h-3.5 w-3.5 text-accent-solar" />
                  case "Home":
                    return <Home className="h-3.5 w-3.5 text-primary" />
                  case "User":
                    return <User className="h-3.5 w-3.5 text-foreground" />
                  case "Building2":
                    return <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  case "Ruler":
                    return <Ruler className="h-3.5 w-3.5 text-primary" />
                  case "Phone":
                    return <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  case "BatteryCharging":
                    return <BatteryCharging className="h-3.5 w-3.5 text-amber-500" />
                  default:
                    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                }
              }

              return (
                <div className="border-t border-border/80 pt-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Critères Saisis par le Prospect
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                      Formulaire Devis
                    </span>
                  </div>

                  {parsed.badges.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsed.badges.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/40 border border-border/60 hover:bg-secondary/60 transition-colors"
                        >
                          <div className="p-1.5 rounded-md bg-card border border-border/70 shrink-0">
                            {getBadgeIcon(b.icon)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-muted-foreground truncate">
                              {b.label}
                            </span>
                            <span className="text-xs font-bold text-foreground truncate">
                              {b.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {parsed.remarks && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 flex flex-col gap-1">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Remarque libre du prospect :
                      </span>
                      <p className="text-xs italic text-foreground leading-relaxed">
                        &laquo; {parsed.remarks} &raquo;
                      </p>
                    </div>
                  )}

                  {parsed.badges.length === 0 && !parsed.remarks && (
                    <p className="text-xs text-foreground bg-secondary/60 rounded-lg p-2.5 border border-border/80 leading-relaxed font-sans">
                      {notesText}
                    </p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Module de Suivi des Relances & Vagues de Vente */}
          <LeadRelanceStatus
            leadId={lead.id}
            marketplaceStatus={lead.marketplace_status}
            segment={lead.segment}
          />

          {/* Module de Sélection et Routage Installateurs */}
          <DispatchPanel
            leadId={lead.id}
            segment={lead.segment ?? "B2B"}
            province={lead.province}
            creditCost={creditCost}
            onCreditCostChange={setCreditCost}
            partners={partners}
            selectedPartnerIds={selectedPartnerIds}
            onSelectionChange={setSelectedPartnerIds}
            dispatchMode={dispatchMode}
            onDispatchModeChange={setDispatchMode}
            existingPurchases={lead.lead_purchases as any}
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
