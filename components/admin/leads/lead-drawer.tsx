"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  ChevronLeft,
  ChevronRight,
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
  Star,
  Plus,
  Home,
  CheckCircle2,
  Ruler,
  BatteryCharging,
  MessageSquare,
  Sparkles,
  Pencil,
  Send,
  AlertTriangle,
  PauseCircle,
  RotateCcw,
  Box,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { LeadRiskBanner } from "./lead-risk-banner"
import { LeadScoreBreakdown } from "./lead-score-breakdown"
import { DispatchPanel, type CompatiblePartner } from "./dispatch-panel"
import { LeadRelanceStatus } from "./lead-relance-status"
import { LeadPartnerViewsPanel } from "./lead-partner-views-panel"
import {
  BelgianLocalityField,
  BelgianStreetNumberFields,
} from "@/components/address/belgian-address-fields"
import { hasBelgianHouseNumber } from "@/lib/leads-validation"
import { buildMapLinks, type AddressCoordinatesPrecision } from "@/lib/address-spw"
import { calculateLeadScore } from "@/lib/lead-score"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { parseLeadProjectDetails } from "@/lib/lead-display-helpers"
import { getPhoneVerificationDiagnostic } from "@/lib/lead-verification-display"
import { detectLeadRiskFlags } from "@/lib/admin/lead-risk"
import {
  AI_PROJECTION_BADGE_SHORT,
  AI_PROJECTION_EXPLANATION_BODY,
  AI_PROJECTION_EXPLANATION_TITLE,
  getLeadImageItems,
  MAX_LEAD_IMAGES,
  moveLeadImage,
  type LeadImageItem,
} from "@/lib/lead-images"
import { formatBceNumber, BCE_PUBLIC_SEARCH_URL } from "@/lib/leads-schema"
import {
  publishLeadAction,
  unpublishLeadAction,
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
  phone_verified?: boolean | null
  phone_verified_at?: string | null
  phone_verification_method?: string | null
  phone_carrier?: string | null
  phone_line_type?: string | null
  email_verified?: boolean | null
  email_verified_at?: string | null
  email_delivery_status?: string | null
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
    pipeline_status?: string | null
    updated_at?: string | null
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
  onLeadActionDone?: (
    id: string,
    action: "qualified" | "unpublished" | "rejected" | "archived"
  ) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [marketplacePatch, setMarketplacePatch] = useState<{
    marketplace_status?: string
    status?: string
    withdrawn?: boolean
  } | null>(null)
  const [notes, setNotes] = useState(lead?.admin_notes ?? "")
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [creditCost, setCreditCost] = useState<number>(
    lead?.credit_cost ?? (lead?.segment === "B2B" ? 5 : 2)
  )
  const [dispatchMode, setDispatchMode] = useState<"marketplace" | "direct">("marketplace")
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([])
  const [leadImageItems, setLeadImageItems] = useState<LeadImageItem[]>(() =>
    getLeadImageItems(lead)
  )
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [showAiPreviewInfo, setShowAiPreviewInfo] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [urlInputOpen, setUrlInputOpen] = useState(false)
  const [customUrlInput, setCustomUrlInput] = useState("")

  // État d'édition locale d'adresse & relance précision adresse prospect
  const [addressPatch, setAddressPatch] = useState<{
    site_address?: string | null
    postal_code?: string | null
    city?: string | null
    province?: string | null
    qualification_metadata?: Record<string, unknown> | null
  } | null>(null)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [editSiteAddress, setEditSiteAddress] = useState(lead?.site_address ?? "")
  const [editPostalCode, setEditPostalCode] = useState(lead?.postal_code ?? "")
  const [editCity, setEditCity] = useState(lead?.city ?? "")
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  const [isComposingAddressEmail, setIsComposingAddressEmail] = useState(false)
  const [reqEmailSubject, setReqEmailSubject] = useState("")
  const [reqEmailBody, setReqEmailBody] = useState("")
  const [isSendingAddressEmail, setIsSendingAddressEmail] = useState(false)
  const [addressRequestSentAt, setAddressRequestSentAt] = useState<string | null>(
    (lead?.qualification_metadata?.addressRequestSentAt as string | undefined) ?? null
  )

  // État d'édition locale des coordonnées prospect
  const [contactPatch, setContactPatch] = useState<{
    first_name?: string
    last_name?: string | null
    email?: string
    phone?: string | null
    job_title?: string
    company?: string | null
    company_vat?: string | null
    segment?: string | null
  } | null>(null)
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [editFirstName, setEditFirstName] = useState(lead?.first_name ?? "")
  const [editLastName, setEditLastName] = useState(lead?.last_name ?? "")
  const [editEmail, setEditEmail] = useState(lead?.email ?? "")
  const [editPhone, setEditPhone] = useState(lead?.phone ?? "")
  const [editJobTitle, setEditJobTitle] = useState(lead?.job_title ?? "")
  const [editCompany, setEditCompany] = useState(lead?.company ?? "")
  const [editCompanyVat, setEditCompanyVat] = useState(lead?.company_vat ?? "")
  const [editSegment, setEditSegment] = useState<string>(lead?.segment ?? "B2C")
  const autoReverifiedMetaRef = useRef<Map<string, Record<string, unknown>>>(new Map())

  useEffect(() => {
    if (lead) {
      setNotes(lead.admin_notes ?? "")
      setCreditCost(lead.credit_cost ?? (lead.segment === "B2B" ? 9 : 3))
      setSelectedPartnerIds([])
      setLeadImageItems(getLeadImageItems(lead))
      setActiveImageIndex(0)
      setShowAiPreviewInfo(false)
      setCustomUrlInput("")
      setUrlInputOpen(false)
      setAddressPatch(null)
      setIsEditingAddress(false)
      setEditSiteAddress(lead.site_address ?? "")
      setEditPostalCode(lead.postal_code ?? "")
      setEditCity(lead.city ?? "")
      setIsComposingAddressEmail(false)
      setAddressRequestSentAt(
        (lead.qualification_metadata?.addressRequestSentAt as string | undefined) ?? null
      )
      setContactPatch(null)
      setIsEditingContact(false)
      setEditFirstName(lead.first_name ?? "")
      setEditLastName(lead.last_name ?? "")
      setEditEmail(lead.email ?? "")
      setEditPhone(lead.phone ?? "")
      setEditJobTitle(lead.job_title ?? "")
      setEditCompany(lead.company ?? "")
      setEditCompanyVat(lead.company_vat ?? "")
      setEditSegment(lead.segment ?? "B2C")
      setMarketplacePatch(null)
    }
  }, [lead])

  // Auto-réparation silencieuse des leads existants vérifiés avant la mise à jour de précision GPS
  useEffect(() => {
    if (!open || !lead?.id || !lead.site_address || !lead.postal_code) return
    const existingSpw = (
      (lead.qualification_metadata?.verifications as Record<string, unknown> | undefined)
        ?.walloniaAddress as Record<string, unknown> | undefined
    )
    if (existingSpw?.coordinatesPrecision !== undefined) return

    const cachedMeta = autoReverifiedMetaRef.current.get(lead.id)
    if (cachedMeta) {
      setAddressPatch((prev) => ({
        ...(prev ?? {}),
        qualification_metadata: cachedMeta,
      }))
      return
    }

    autoReverifiedMetaRef.current.set(lead.id, lead.qualification_metadata ?? {})
    let cancelled = false
    fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-request": "true" },
      body: JSON.stringify({ reverify_address: true }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.qualification_metadata) {
          autoReverifiedMetaRef.current.set(lead.id, json.qualification_metadata)
          if (!cancelled) {
            setAddressPatch((prev) => ({
              ...(prev ?? {}),
              qualification_metadata: json.qualification_metadata,
            }))
            router.refresh()
          }
        }
      })
      .catch(() => {
        autoReverifiedMetaRef.current.delete(lead.id)
      })

    return () => {
      cancelled = true
    }
  }, [open, lead, router])

  const effectiveFirstName =
    contactPatch && "first_name" in contactPatch
      ? contactPatch.first_name ?? ""
      : lead?.first_name ?? ""
  const effectiveLastName =
    contactPatch && "last_name" in contactPatch
      ? contactPatch.last_name
      : lead?.last_name
  const effectiveEmail =
    contactPatch && "email" in contactPatch
      ? contactPatch.email ?? ""
      : lead?.email ?? ""
  const effectivePhone =
    contactPatch && "phone" in contactPatch
      ? contactPatch.phone
      : lead?.phone
  const effectiveJobTitle =
    contactPatch && "job_title" in contactPatch
      ? contactPatch.job_title ?? ""
      : lead?.job_title ?? ""
  const effectiveCompany =
    contactPatch && "company" in contactPatch
      ? contactPatch.company
      : lead?.company
  const effectiveCompanyVat =
    contactPatch && "company_vat" in contactPatch
      ? contactPatch.company_vat
      : lead?.company_vat
  const effectiveSegment =
    contactPatch && "segment" in contactPatch
      ? contactPatch.segment
      : lead?.segment

  const effectiveSiteAddress =
    addressPatch && "site_address" in addressPatch
      ? addressPatch.site_address
      : lead?.site_address
  const effectivePostalCode =
    addressPatch && "postal_code" in addressPatch
      ? addressPatch.postal_code
      : lead?.postal_code
  const effectiveCity =
    addressPatch && "city" in addressPatch
      ? addressPatch.city
      : lead?.city
  const effectiveProvince =
    addressPatch && "province" in addressPatch
      ? addressPatch.province
      : lead?.province
  const effectiveMeta =
    addressPatch?.qualification_metadata ?? lead?.qualification_metadata ?? null

  async function handleSaveContact() {
    if (!lead) return
    const cleanFirst = editFirstName.trim()
    const cleanEmail = editEmail.trim().toLowerCase()
    if (!cleanFirst) {
      toast.error("Le prénom est requis.")
      return
    }
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      toast.error("Adresse e-mail invalide.")
      return
    }
    setIsSavingContact(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({
          first_name: cleanFirst,
          last_name: editLastName.trim() || null,
          email: cleanEmail,
          phone: editPhone.trim() || null,
          job_title: editJobTitle.trim() || "Particulier",
          company: editCompany.trim() || null,
          company_vat: editCompanyVat.trim() || null,
          segment: editSegment === "B2B" || editSegment === "B2C" ? editSegment : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || "Échec de mise à jour des coordonnées")
        return
      }
      setContactPatch({
        first_name: json.first_name,
        last_name: json.last_name,
        email: json.email,
        phone: json.phone,
        job_title: json.job_title,
        company: json.company,
        company_vat: json.company_vat,
        segment: json.segment,
      })
      setIsEditingContact(false)
      toast.success("Coordonnées du prospect mises à jour")
      router.refresh()
    } catch {
      toast.error("Erreur réseau lors de l'enregistrement des coordonnées")
    } finally {
      setIsSavingContact(false)
    }
  }

  async function handleSaveAddress() {
    if (!lead) return
    const cleanCp = editPostalCode.replace(/\D/g, "").slice(0, 4)
    if (cleanCp && cleanCp.length !== 4) {
      toast.error("Le code postal belge doit comporter 4 chiffres.")
      return
    }
    setIsSavingAddress(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({
          site_address: editSiteAddress.trim() || null,
          postal_code: cleanCp || null,
          city: editCity.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || "Échec de mise à jour de l'adresse")
        return
      }
      setAddressPatch({
        site_address: json.site_address,
        postal_code: json.postal_code,
        city: json.city,
        province: json.province,
        qualification_metadata: json.qualification_metadata,
      })
      setIsEditingAddress(false)
      const spwOk = (json.qualification_metadata?.verifications?.walloniaAddress as Record<string, unknown> | undefined)?.houseVerified
      toast.success(
        spwOk
          ? "Adresse mise à jour et certifiée par le cadastre SPW ICAR"
          : "Adresse mise à jour et re-vérifiée"
      )
      router.refresh()
    } catch {
      toast.error("Erreur réseau lors de l'enregistrement de l'adresse")
    } finally {
      setIsSavingAddress(false)
    }
  }

  function openAddressEmailComposer() {
    if (!lead) return
    const locality = [effectivePostalCode, effectiveCity].filter(Boolean).join(" ") || "Wallonie"
    const firstName = (effectiveFirstName || "").trim() || "Bonjour"
    const currentAddr = (effectiveSiteAddress || "").trim()
    setReqEmailSubject(`Précision requise pour votre étude solaire (${locality}) — Aegis Solaire`)
    setReqEmailBody(
      `Bonjour ${firstName},\n\n` +
        `Nous finalisons la vérification technique de votre projet photovoltaïque situé sur ${locality} afin de sélectionner les installateurs certifiés RESCERT les plus adaptés.\n\n` +
        `Pour réaliser le repérage satellite préalable de votre toiture et établir un dimensionnement fiable, il nous manque le numéro exact de votre habitation` +
        (currentAddr ? ` (vous aviez indiqué « ${currentAddr} »)` : "") +
        `.\n\n` +
        `Pourriez-vous simplement répondre à cet e-mail en nous confirmant votre adresse complète (rue et numéro) ?\n\n` +
        `Dès réception, nous validons votre dossier dans les plus brefs délais.\n\n` +
        `Bien cordialement,\nLa Cellule Technique Aegis Solaire\ncontact@aegissolaire.com`
    )
    setIsComposingAddressEmail(true)
  }

  async function handleSendAddressEmail() {
    if (!lead) return
    setIsSendingAddressEmail(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/request-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({
          subject: reqEmailSubject,
          message: reqEmailBody,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || "Échec de l'envoi de l'e-mail")
        return
      }
      if (json.updatedNotes) setNotes(json.updatedNotes)
      setAddressRequestSentAt(json.sentAt || new Date().toISOString())
      setIsComposingAddressEmail(false)
      toast.success(`E-mail de demande de précision envoyé à ${effectiveEmail}`)
      router.refresh()
    } catch {
      toast.error("Erreur réseau lors de l'envoi de l'e-mail")
    } finally {
      setIsSendingAddressEmail(false)
    }
  }

  const leadImages = leadImageItems.map((i) => i.url)
  const safeActiveIndex =
    leadImageItems.length > 0 ? Math.min(activeImageIndex, leadImageItems.length - 1) : 0
  const activeImageItem = leadImageItems[safeActiveIndex] ?? null
  const activeImageUrl = activeImageItem?.url ?? null

  useEffect(() => {
    setShowAiPreviewInfo(false)
  }, [lead?.id, safeActiveIndex])

  function syncLocalLeadImages(
    nextItems: LeadImageItem[],
    nextMeta?: Record<string, unknown> | null,
    nextActiveIdx?: number
  ) {
    setLeadImageItems(nextItems)
    if (typeof nextActiveIdx === "number") {
      setActiveImageIndex(
        nextItems.length > 0 ? Math.max(0, Math.min(nextActiveIdx, nextItems.length - 1)) : 0
      )
    } else {
      setActiveImageIndex((prev) =>
        nextItems.length > 0 ? Math.min(prev, nextItems.length - 1) : 0
      )
    }

    if (nextMeta && typeof nextMeta === "object") {
      if (lead) {
        lead.qualification_metadata = nextMeta
      }
      setAddressPatch((prev) =>
        prev ? { ...prev, qualification_metadata: nextMeta } : prev
      )
    }
    router.refresh()
  }

  const handleUploadImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !lead) return

    if (leadImages.length + files.length > MAX_LEAD_IMAGES) {
      const remaining = Math.max(0, MAX_LEAD_IMAGES - leadImages.length)
      toast.error(
        `Limite atteinte : maximum ${MAX_LEAD_IMAGES} photos par dossier (${remaining} emplacement${remaining > 1 ? "s" : ""} disponible${remaining > 1 ? "s" : ""}).`
      )
      e.target.value = ""
      return
    }

    setIsUploadingImage(true)
    const formData = new FormData()
    for (const file of files) {
      formData.append("files", file)
    }

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
      const nextItems: LeadImageItem[] = Array.isArray(data.imageItems)
        ? data.imageItems
        : getLeadImageItems(data.qualification_metadata)
      const firstNewIdx =
        leadImages.length === 0
          ? 0
          : Math.min(leadImages.length, Math.max(0, nextItems.length - 1))
      syncLocalLeadImages(nextItems, data.qualification_metadata, firstNewIdx)
      toast.success(
        files.length > 1
          ? `${files.length} photos ajoutées au dossier`
          : "Photo ajoutée au dossier"
      )
    } catch (err: any) {
      toast.error(err.message || "Impossible de télécharger l'image")
    } finally {
      setIsUploadingImage(false)
      e.target.value = ""
    }
  }

  const handleAttachImageUrl = async () => {
    const trimmed = customUrlInput.trim()
    if (!trimmed || !lead) return

    if (leadImages.length >= MAX_LEAD_IMAGES && !leadImages.includes(trimmed)) {
      toast.error(`Limite atteinte : maximum ${MAX_LEAD_IMAGES} photos par dossier.`)
      return
    }

    setIsUploadingImage(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({ imageUrl: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement de l'URL")
      }
      const nextItems: LeadImageItem[] = Array.isArray(data.imageItems)
        ? data.imageItems
        : getLeadImageItems(data.qualification_metadata)
      const targetIdx = nextItems.findIndex((i) => i.url === trimmed)
      syncLocalLeadImages(
        nextItems,
        data.qualification_metadata,
        targetIdx >= 0 ? targetIdx : 0
      )
      setUrlInputOpen(false)
      setCustomUrlInput("")
      toast.success("URL de photo ajoutée au dossier")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement de l'URL")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSetPrimaryImage = async (targetUrl: string) => {
    if (!lead || !targetUrl) return
    setIsUploadingImage(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/image`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({ primaryUrl: targetUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la sélection de l'image principale")
      }
      const nextItems: LeadImageItem[] = Array.isArray(data.imageItems)
        ? data.imageItems
        : getLeadImageItems(data.qualification_metadata)
      syncLocalLeadImages(nextItems, data.qualification_metadata, 0)
      toast.success("Photo définie en n°1 (envoyée dans les e-mails)")
    } catch (err: any) {
      toast.error(err.message || "Impossible de définir cette image en n°1")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleMoveImage = async (index: number, direction: "left" | "right") => {
    if (!lead) return
    const reordered = moveLeadImage(leadImages, index, direction)
    if (reordered.every((u, i) => u === leadImages[i])) return
    const targetNewIndex = direction === "left" ? index - 1 : index + 1

    setIsUploadingImage(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/image`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({ images: reordered }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du réordonnancement")
      }
      const nextItems: LeadImageItem[] = Array.isArray(data.imageItems)
        ? data.imageItems
        : getLeadImageItems(data.qualification_metadata)
      syncLocalLeadImages(nextItems, data.qualification_metadata, targetNewIndex)
      toast.success(
        targetNewIndex === 0
          ? "Photo placée en n°1 (envoyée dans les e-mails)"
          : "Ordre des photos mis à jour"
      )
    } catch (err: any) {
      toast.error(err.message || "Impossible de réordonner les photos")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleToggleAiProjection = async (item: LeadImageItem) => {
    if (!lead || !item) return
    const nextKind = item.isAiProjection ? "real" : "ai_3d_projection"
    setIsUploadingImage(true)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/image`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({ imageUrl: item.url, kind: nextKind }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour du bandeau 3D")
      }
      const nextItems: LeadImageItem[] = Array.isArray(data.imageItems)
        ? data.imageItems
        : getLeadImageItems(data.qualification_metadata)
      syncLocalLeadImages(nextItems, data.qualification_metadata, safeActiveIndex)
      if (nextKind === "ai_3d_projection") {
        toast.success(`Bandeau « ${AI_PROJECTION_BADGE_SHORT} » activé sur cette photo`)
      } else {
        setShowAiPreviewInfo(false)
        toast.success("Bandeau « Projection 3D » retiré de cette photo")
      }
    } catch (err: any) {
      toast.error(err.message || "Impossible de mettre à jour le bandeau 3D")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleDeleteImage = async (targetUrl: string) => {
    if (!lead || !targetUrl) return
    if (!confirm("Voulez-vous vraiment retirer cette photo du lead ?")) return

    const wasPrimary = leadImages[0] === targetUrl
    setIsUploadingImage(true)
    try {
      const res = await fetch(
        `/api/admin/leads/${lead.id}/image?imageUrl=${encodeURIComponent(targetUrl)}`,
        {
          method: "DELETE",
          headers: {
            "x-admin-request": "true",
          },
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la suppression")
      }
      const nextItems: LeadImageItem[] = Array.isArray(data.imageItems)
        ? data.imageItems
        : []
      syncLocalLeadImages(nextItems, data.qualification_metadata)
      if (wasPrimary && nextItems.length > 0) {
        toast.success("Photo n°1 retirée. La photo suivante devient la photo n°1 des e-mails.")
      } else {
        toast.success("Photo retirée du dossier")
      }
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
        firstName: effectiveFirstName,
        lastName: effectiveLastName,
        email: effectiveEmail,
        phone: effectivePhone,
        postalCode: effectivePostalCode,
        city: effectiveCity,
        siteAddress: effectiveSiteAddress,
        province: effectiveProvince,
        segment: effectiveSegment,
        company: effectiveCompany,
        companyVat: effectiveCompanyVat,
        ownershipStatus: lead.ownership_status,
        surfaceArea: lead.surface_area,
        annualElectricityBill: lead.annual_electricity_bill,
        qualificationMetadata: effectiveMeta,
      })
    : []

  const scoreResult = lead
    ? calculateLeadScore({
        firstName: effectiveFirstName,
        lastName: effectiveLastName || "",
        jobTitle: effectiveJobTitle,
        surfaceArea: lead.surface_area ?? 0,
        annualElectricityBill: lead.annual_electricity_bill ?? 0,
        segment: effectiveSegment ?? "B2B",
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
        setMarketplacePatch({
          marketplace_status: "available",
          status: "qualified",
          withdrawn: false,
        })
        toast.success(
          isWithdrawnFromMarketplace
            ? `Lead #${leadId.slice(0, 8)} remis en ligne sur la marketplace`
            : `Lead #${leadId.slice(0, 8)} approuvé et publié sur la marketplace`
        )
        onLeadActionDone?.(leadId, "qualified")
        router.refresh()
        if (hasNext && onNext) {
          onNext()
        } else {
          onClose()
        }
      } catch (err: any) {
        toast.error(err?.message || "Échec de la publication du lead")
      }
    })
  }

  async function handleUnpublish() {
    if (!lead) return
    const leadId = lead.id
    startTransition(async () => {
      try {
        await unpublishLeadAction(leadId)
        setMarketplacePatch({
          marketplace_status: "pending_review",
          withdrawn: true,
        })
        toast.success(
          `Lead #${leadId.slice(0, 8)} retiré de la marketplace (conservé en base pour remise en ligne ultérieure).`
        )
        onLeadActionDone?.(leadId, "unpublished")
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || "Échec du retrait de la marketplace")
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

  const effectiveMarketplaceStatus =
    marketplacePatch?.marketplace_status ?? lead?.marketplace_status ?? null
  const effectiveLeadStatus = marketplacePatch?.status ?? lead?.status ?? null
  const isPublishedOnMarketplace = Boolean(
    lead && effectiveMarketplaceStatus === "available"
  )
  const isSoldOutOnMarketplace = Boolean(
    lead && effectiveMarketplaceStatus === "sold_out"
  )
  const isWithdrawnFromMarketplace = Boolean(
    lead &&
      !isPublishedOnMarketplace &&
      !isSoldOutOnMarketplace &&
      (marketplacePatch?.withdrawn !== undefined
        ? marketplacePatch.withdrawn
        : (effectiveMeta as Record<string, unknown> | null)?.withdrawn_from_marketplace === true)
  )

  // Raccourcis clavier contextuels dans le Drawer
  useAdminHotkeys(
    {
      "cmd+enter": () => {
        if ((!isPublishedOnMarketplace && !isSoldOutOnMarketplace) || dispatchMode === "direct") {
          handleQualifyAndPublish()
        } else if (hasNext && onNext) {
          onNext()
        }
      },
      q: () => {
        if ((!isPublishedOnMarketplace && !isSoldOutOnMarketplace) || dispatchMode === "direct") {
          handleQualifyAndPublish()
        }
      },
      e: () => handleArchive(),
      c: () => effectivePhone && copyToClipboard(effectivePhone, "Numéro de téléphone"),
    },
    open && !!lead
  )

  if (!lead) return null

  const shortId = lead.id.slice(0, 8).toUpperCase()
  const prospectTitle = effectiveSegment === "B2B" && effectiveCompany ? effectiveCompany : `${effectiveFirstName} ${effectiveLastName || ""}`

  const financials = calculateMarketplaceFinancials({
    segment: effectiveSegment ?? "B2B",
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
              {effectiveSegment ?? "B2B"}
            </span>
            <LeadStatusBadge
              status={effectiveLeadStatus}
              marketplaceStatus={effectiveMarketplaceStatus}
            />
            {isWithdrawnFromMarketplace && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground border border-border whitespace-nowrap">
                Pause Marketplace
              </span>
            )}
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
            <div className="flex items-center justify-between pb-2 border-b border-border gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                <User className="h-3.5 w-3.5 text-primary" />
                Contact & Coordonnées Prospect
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                  {effectiveSegment === "B2B" ? "Dossier Professionnel" : "Particulier Résidentiel"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingContact) {
                      setEditFirstName(effectiveFirstName)
                      setEditLastName(effectiveLastName ?? "")
                      setEditEmail(effectiveEmail)
                      setEditPhone(effectivePhone ?? "")
                      setEditJobTitle(effectiveJobTitle ?? "")
                      setEditCompany(effectiveCompany ?? "")
                      setEditCompanyVat(effectiveCompanyVat ?? "")
                      setEditSegment(effectiveSegment === "B2C" ? "B2C" : "B2B")
                    }
                    setIsEditingContact((v) => !v)
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary"
                >
                  <Pencil className="h-2.5 w-2.5" />
                  {isEditingContact ? "Annuler" : "Modifier"}
                </button>
              </div>
            </div>

            {isEditingContact ? (
              <div className="rounded-lg border border-border bg-secondary/20 p-3 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Prénom</span>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Prénom"
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Nom</span>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Nom"
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Téléphone</span>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+32..."
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Segment</span>
                    <select
                      value={editSegment}
                      onChange={(e) => setEditSegment(e.target.value === "B2C" ? "B2C" : "B2B")}
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="B2C">B2C (Particulier)</option>
                      <option value="B2B">B2B (Professionnel)</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Adresse e-mail</span>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@exemple.be"
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Fonction / Qualité</span>
                    <input
                      type="text"
                      value={editJobTitle}
                      onChange={(e) => setEditJobTitle(e.target.value)}
                      placeholder="Ex: Particulier, Gérant..."
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Société</span>
                    <input
                      type="text"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      placeholder="Nom de l'entreprise"
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Numéro TVA / BCE</span>
                    <input
                      type="text"
                      value={editCompanyVat}
                      onChange={(e) => setEditCompanyVat(e.target.value)}
                      placeholder="BE0123456789"
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    disabled={isSavingContact}
                    className="h-8 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    disabled={isSavingContact}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSavingContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50">
                <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <User className="h-3 w-3 text-muted-foreground" />
                  Interlocuteur
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {effectiveFirstName} {effectiveLastName || ""}
                </span>
                {effectiveJobTitle && (
                  <span className="text-[11px] text-muted-foreground">
                    {effectiveJobTitle}
                  </span>
                )}
              </div>

              {(() => {
                const phoneDiag = getPhoneVerificationDiagnostic({
                  segment: effectiveSegment,
                  phone: effectivePhone,
                  email: effectiveEmail,
                  postal_code: effectivePostalCode,
                  company_vat: effectiveCompanyVat,
                  phone_verified: lead.phone_verified,
                  phone_verified_at: lead.phone_verified_at,
                  phone_verification_method: lead.phone_verification_method,
                  phone_carrier: lead.phone_carrier,
                  phone_line_type: lead.phone_line_type,
                  created_at: lead.created_at,
                  qualification_metadata: effectiveMeta,
                })
                const badgeToneClass =
                  phoneDiag.overallBadge.tone === "success"
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                    : phoneDiag.overallBadge.tone === "danger"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : phoneDiag.overallBadge.tone === "warning"
                        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        : phoneDiag.overallBadge.tone === "info"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-secondary text-muted-foreground border-border"
                const otpDetailColor = phoneDiag.otp.isTechnicalFailure
                  ? "text-destructive"
                  : phoneDiag.otp.verified
                    ? "text-emerald-700"
                    : "text-muted-foreground"

                return (
                  <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        Téléphone
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-semibold border",
                          badgeToneClass
                        )}
                      >
                        {phoneDiag.otp.verified && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {phoneDiag.otp.isTechnicalFailure && <AlertTriangle className="h-2.5 w-2.5" />}
                        <span>{phoneDiag.overallBadge.text}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      {effectivePhone ? (
                        <>
                          <a
                            href={`tel:${effectivePhone}`}
                            className="font-bold text-foreground hover:text-primary transition-colors text-sm"
                          >
                            {effectivePhone}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(effectivePhone, "Téléphone")}
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
                    <div className="flex flex-col gap-0.5 pt-1 border-t border-border/40 text-[10.5px] leading-snug font-mono tabular-nums">
                      <span className="text-muted-foreground">
                        <strong className="text-foreground font-semibold">Lookup :</strong>{" "}
                        {phoneDiag.lookup.detailText}
                      </span>
                      <span className={otpDetailColor}>
                        <strong className="text-foreground font-semibold">SMS OTP :</strong>{" "}
                        {phoneDiag.otp.detailText}
                      </span>
                    </div>
                  </div>
                )
              })()}

              <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    Adresse e-mail
                  </span>
                  {(() => {
                    const v = effectiveMeta?.verifications as Record<string, any> | undefined
                    const deliveryStatus = lead.email_delivery_status || v?.emailDelivery?.status
                    const isEmailVerified = Boolean(lead.email_verified || v?.emailProof?.verified)
                    const emailVerifiedAtRaw = lead.email_verified_at || v?.emailProof?.verifiedAt || null
                    const emailVerifiedTime = emailVerifiedAtRaw
                      ? new Date(emailVerifiedAtRaw).toLocaleString("fr-BE", {
                          timeZone: "Europe/Brussels",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null
                    if (deliveryStatus === "bounced" || deliveryStatus === "complained") {
                      return (
                        <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-destructive border border-destructive/20">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Rebond SMTP
                        </span>
                      )
                    }
                    if (isEmailVerified) {
                      return (
                        <span
                          title={emailVerifiedTime ? `Confirmé par clic le ${emailVerifiedTime}` : "Confirmé par clic"}
                          className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 border border-emerald-500/20"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          E-mail vérifié (clic{emailVerifiedTime ? ` · ${emailVerifiedTime}` : ""})
                        </span>
                      )
                    }
                    if (deliveryStatus === "delivered") {
                      return (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-700 border border-blue-500/20">
                          Remis · MX plausible
                        </span>
                      )
                    }
                    if (v?.emailMx?.valid) {
                      return (
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border">
                          MX plausible
                        </span>
                      )
                    }
                    return null
                  })()}
                </div>
                <div className="flex items-center justify-between gap-2 font-mono">
                  <a
                    href={`mailto:${effectiveEmail}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors text-xs truncate"
                  >
                    {effectiveEmail}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(effectiveEmail, "E-mail")}
                    className="p-1 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Copier l'e-mail"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {effectiveCompany && (
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50 sm:col-span-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    Société
                  </span>
                  <span className="font-semibold text-foreground text-xs">{effectiveCompany}</span>
                </div>
              )}

              {effectiveCompanyVat && (
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-secondary/30 border border-border/50 sm:col-span-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    Numéro TVA / BCE
                  </span>
                  <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                    <span className="font-bold text-foreground">{effectiveCompanyVat}</span>
                    <a
                      href={`${BCE_PUBLIC_SEARCH_URL}?action=search&zoekWaarde=${formatBceNumber(effectiveCompanyVat)}`}
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
            )}

            {/* Localisation & Adresse exacte (avec édition, re-vérification SPW & demande prospect) */}
            {(() => {
              const spwVerif = (
                (effectiveMeta?.verifications as Record<string, unknown> | undefined)
                  ?.walloniaAddress as Record<string, unknown> | undefined
              )
              const hasHouse = hasBelgianHouseNumber(effectiveSiteAddress)
              const isHouseVerified = Boolean(spwVerif?.houseVerified)
              const isStreetVerified = Boolean(spwVerif?.streetVerified)
              const coords = (spwVerif?.coordinates as { lat: number; lng: number } | null | undefined) ?? null
              const coordsPrecision = (spwVerif?.coordinatesPrecision as AddressCoordinatesPrecision | undefined) ?? null
              const coordsSource = (spwVerif?.coordinatesSource as string | null | undefined) ?? null
              const canonicalStreetAddr =
                typeof spwVerif?.canonicalStreet === "string" &&
                (typeof spwVerif?.houseNumber === "string" || effectiveSiteAddress)
                  ? [spwVerif.canonicalStreet, typeof spwVerif?.houseNumber === "string" ? spwVerif.houseNumber : null]
                      .filter(Boolean)
                      .join(" ") || effectiveSiteAddress
                  : effectiveSiteAddress
              const mapLinks = buildMapLinks({
                streetAddress: canonicalStreetAddr,
                postalCode:
                  (typeof spwVerif?.officialPostalCode === "string" ? spwVerif.officialPostalCode : null) ||
                  effectivePostalCode,
                city:
                  (typeof spwVerif?.officialSection === "string" ? spwVerif.officialSection : null) ||
                  (typeof spwVerif?.officialCity === "string" ? spwVerif.officialCity : null) ||
                  effectiveCity,
                coordinates: coords,
                coordinatesPrecision: coordsPrecision,
              })
              const contactPref = (effectiveMeta?.contactPreference as string | undefined) || "written_first"
              const hasValidBuildingCoords =
                Boolean(coords) &&
                typeof coords?.lat === "number" &&
                typeof coords?.lng === "number" &&
                Number.isFinite(coords.lat) &&
                Number.isFinite(coords.lng) &&
                coordsPrecision !== "street" &&
                coordsPrecision !== "locality" &&
                coordsPrecision !== "none"

              return (
                <div className="rounded-lg bg-secondary/50 border border-border p-3 flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider font-mono">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        Adresse du Chantier
                      </span>
                      {isHouseVerified ? (
                        <span
                          title={
                            coordsSource === "OSM_BUILDING_SPW_ANCHORED"
                              ? "Numéro certifié SPW ICAR · Point bâtiment localisé et validé par les numéros SPW encadrants"
                              : coordsSource === "SPW_NEIGHBORS_INTERPOLATED"
                                ? "Numéro certifié SPW ICAR · Point GPS interpolé entre les bâtiments SPW voisins de la rue"
                                : hasValidBuildingCoords
                                  ? "Adresse et point bâtiment certifiés SPW ICAR"
                                  : "Numéro certifié administrativement SPW ICAR sans point GPS cadastral (liens cartes par adresse officielle)"
                          }
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {coordsSource === "SPW_NEIGHBORS_INTERPOLATED"
                            ? "SPW ICAR exacte · GPS interpolé"
                            : !hasValidBuildingCoords
                              ? "SPW ICAR · sans point GPS"
                              : "SPW ICAR exacte"}
                        </span>
                      ) : !effectiveSiteAddress || !hasHouse ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {!effectiveSiteAddress ? "Adresse absente" : "N° maison manquant"}
                        </span>
                      ) : isStreetVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          Voirie OK · n° non cadastré
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {effectiveSiteAddress && (
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              `${effectiveSiteAddress}, ${effectivePostalCode || ""} ${effectiveCity || ""}`.trim(),
                              "Adresse complète"
                            )
                          }
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono"
                        >
                          <Copy className="h-2.5 w-2.5" />
                          Copier
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditingAddress) {
                            setEditSiteAddress(effectiveSiteAddress ?? "")
                            setEditPostalCode(effectivePostalCode ?? "")
                            setEditCity(effectiveCity ?? "")
                          }
                          setIsEditingAddress(!isEditingAddress)
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-primary hover:underline"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        {isEditingAddress ? "Annuler" : "Corriger"}
                      </button>
                    </div>
                  </div>

                  {isEditingAddress ? (
                    <div className="flex flex-col gap-2.5 rounded-md border border-border bg-card p-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2">
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="admin-edit-cp" className="text-[11px]">
                            Code postal
                          </Label>
                          <Input
                            id="admin-edit-cp"
                            value={editPostalCode}
                            maxLength={4}
                            onChange={(e) =>
                              setEditPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                            }
                            placeholder="5300"
                            className="h-9 font-mono tabular-nums text-xs"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="admin-edit-city" className="text-[11px]">
                            Commune / Localité
                          </Label>
                          <BelgianLocalityField
                            id="admin-edit-city"
                            postalCode={editPostalCode}
                            value={editCity}
                            onChange={setEditCity}
                            inputClassName="h-9 text-xs"
                            showQuickChips={false}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label htmlFor="admin-edit-street" className="text-[11px]">
                          Rue &amp; Numéro (autocomplétion SPW ICAR)
                        </Label>
                        <BelgianStreetNumberFields
                          streetId="admin-edit-street"
                          houseId="admin-edit-house"
                          value={editSiteAddress}
                          onChange={setEditSiteAddress}
                          postalCode={editPostalCode}
                          city={editCity}
                          onSuggestionSelect={(s) => {
                            if (s.section) setEditCity(s.section)
                          }}
                          required={false}
                          requireHouseNumber={false}
                          compact
                          inputHeightClass="h-9"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingAddress(false)}
                          className="h-7 text-xs"
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveAddress}
                          disabled={isSavingAddress}
                          className="h-7 text-xs gap-1"
                        >
                          {isSavingAddress ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Enregistrer &amp; re-vérifier SPW
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 text-xs">
                      {effectiveSiteAddress ? (
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-muted-foreground text-[11px] shrink-0 font-medium">
                            Adresse exacte :
                          </span>
                          <span className="font-semibold text-foreground text-sm select-all">
                            {effectiveSiteAddress}
                          </span>
                          {typeof spwVerif?.canonicalStreet === "string" &&
                            spwVerif.canonicalStreet.toLowerCase() !==
                              effectiveSiteAddress.toLowerCase() && (
                              <span className="text-[11px] text-primary font-mono">
                                (SPW ICAR : {spwVerif.canonicalStreet}
                                {spwVerif.officialSection ? ` · ${String(spwVerif.officialSection)}` : ""})
                              </span>
                            )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-destructive italic">
                          Adresse exacte de voirie non renseignée (uniquement commune &amp; CP)
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[11px] shrink-0">
                            Ville &amp; Province :
                          </span>
                          <span className="font-mono tabular-nums font-bold text-foreground">
                            {effectivePostalCode ? `${effectivePostalCode} ` : ""}
                            {effectiveCity || "Non précisée"}
                            {effectiveProvince
                              ? ` · Province de ${effectiveProvince.replace("_", " ")}`
                              : ""}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const hasCoords = hasValidBuildingCoords
                            const coordsLabel = hasCoords && coords
                              ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                              : ""
                            const coordsSourceLabel =
                              coordsSource === "OSM_BUILDING_SPW_ANCHORED"
                                ? "coordonnées bâtiment OSM ancrées SPW"
                                : coordsSource === "SPW_NEIGHBORS_INTERPOLATED"
                                  ? "coordonnées interpolées entre voisins SPW"
                                  : "coordonnées SPW ICAR"

                            return (
                              <>
                                <a
                                  href={mapLinks.googleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={
                                    hasCoords
                                      ? `Ouvrir Google Maps sur les ${coordsSourceLabel} (${coordsLabel})`
                                      : "Rechercher l'adresse officielle sur Google Maps"
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-foreground"
                                >
                                  Maps <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                                <a
                                  href={mapLinks.googleEarthUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={
                                    hasCoords
                                      ? `Ouvrir Google Earth sur les ${coordsSourceLabel} (${coordsLabel})`
                                      : "Rechercher l'adresse officielle sur Google Earth"
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-foreground"
                                >
                                  Google Earth <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                                <a
                                  href={mapLinks.walOnMapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={
                                    hasCoords
                                      ? `Ouvrir WalOnMap sur les ${coordsSourceLabel} (${coordsLabel})`
                                      : "Rechercher l'adresse officielle sur WalOnMap"
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-card hover:bg-muted text-foreground"
                                >
                                  WalOnMap <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Outil de récupération rapide si adresse ou numéro manquant */}
                  {(!effectiveSiteAddress || !hasHouse) && (
                    <div className="mt-1 rounded-md border border-destructive/25 bg-destructive/5 p-2.5 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-foreground leading-snug">
                          <span className="font-semibold text-destructive">
                            Adresse incomplète avant mise en vente :
                          </span>{" "}
                          {contactPref === "written_first"
                            ? "le prospect préfère un contact écrit d'abord (e-mail / SMS)."
                            : "demandez la précision d'adresse avant publication."}
                          {addressRequestSentAt && (
                            <span className="block text-[10px] text-primary font-mono mt-0.5">
                              ✓ Demande envoyée par e-mail le{" "}
                              {new Date(addressRequestSentAt).toLocaleDateString("fr-BE")}
                            </span>
                          )}
                        </div>
                        {!isComposingAddressEmail && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={openAddressEmailComposer}
                            className="h-7 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 text-foreground shrink-0"
                          >
                            <Send className="h-3 w-3 text-primary" />
                            Demander par e-mail
                          </Button>
                        )}
                      </div>

                      {isComposingAddressEmail && (
                        <div className="flex flex-col gap-2 pt-1.5 border-t border-destructive/15">
                          <Input
                            value={reqEmailSubject}
                            onChange={(e) => setReqEmailSubject(e.target.value)}
                            placeholder="Objet de l'e-mail"
                            className="h-8 text-xs bg-card"
                          />
                          <Textarea
                            value={reqEmailBody}
                            onChange={(e) => setReqEmailBody(e.target.value)}
                            rows={6}
                            className="text-xs bg-card resize-y"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsComposingAddressEmail(false)}
                              className="h-7 text-xs"
                            >
                              Fermer
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSendAddressEmail}
                              disabled={isSendingAddressEmail || !reqEmailBody.trim()}
                              className="h-7 text-xs gap-1.5"
                            >
                              {isSendingAddressEmail ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Envoyer à {effectiveEmail}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Visuels du Bâtiment & Toiture (Galerie Multi-Photos) */}
            <div className="rounded-lg bg-secondary/50 border border-border p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider font-mono">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  <span>Visuels Façade &amp; Toiture</span>
                  {leadImages.length > 0 && (
                    <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded bg-card text-foreground border border-border font-semibold normal-case">
                      {leadImages.length}/{MAX_LEAD_IMAGES}
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold shrink-0">
                  1ère = E-mail
                </span>
              </div>

              {leadImageItems.length > 0 && activeImageItem && activeImageUrl ? (
                <div className="flex flex-col gap-2.5">
                  <div className="relative rounded-lg overflow-hidden border border-border bg-card group aspect-[3/2]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeImageUrl}
                      alt={`Visuel bâtiment n°${safeActiveIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      {safeActiveIndex === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground shadow-xs font-mono tabular-nums">
                          <Star className="h-3 w-3 fill-current" />
                          <span>Photo #1 · E-mail &amp; Vignette</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-foreground/80 text-background shadow-xs backdrop-blur-xs font-mono tabular-nums">
                          <span>Photo #{safeActiveIndex + 1} · Galerie portail</span>
                        </span>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <a
                        href={activeImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-foreground/80 hover:bg-foreground text-background shadow-xs transition-colors backdrop-blur-xs"
                        title="Ouvrir l'image originale en grand"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Agrandir</span>
                      </a>
                    </div>
                    {leadImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIndex(
                              (safeActiveIndex - 1 + leadImages.length) % leadImages.length
                            )
                          }
                          aria-label="Photo précédente"
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-foreground/75 hover:bg-foreground text-background shadow-xs transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImageIndex((safeActiveIndex + 1) % leadImages.length)
                          }
                          aria-label="Photo suivante"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-foreground/75 hover:bg-foreground text-background shadow-xs transition-colors cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {activeImageItem.isAiProjection && (
                      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 bg-foreground/85 text-background px-2.5 py-1.5 backdrop-blur-xs">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold min-w-0 truncate">
                          <span className="h-2 w-2 rounded-full bg-accent-solar shrink-0" />
                          <span className="truncate">{AI_PROJECTION_BADGE_SHORT}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAiPreviewInfo((v) => !v)}
                          aria-expanded={showAiPreviewInfo}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-background/15 hover:bg-background/25 text-background shrink-0 transition-colors cursor-pointer"
                        >
                          <Info className="h-3 w-3" />
                          <span>{showAiPreviewInfo ? "Masquer" : "Infos"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {activeImageItem.isAiProjection && showAiPreviewInfo && (
                    <div className="rounded-lg border border-border border-l-2 border-l-accent-solar bg-card p-2.5 flex flex-col gap-1 text-[11px] leading-relaxed text-foreground">
                      <span className="font-bold text-foreground">
                        {AI_PROJECTION_EXPLANATION_TITLE}
                      </span>
                      <p className="text-muted-foreground">
                        {AI_PROJECTION_EXPLANATION_BODY}
                      </p>
                    </div>
                  )}

                  {/* Barre d'actions sur la photo active */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {safeActiveIndex > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(activeImageUrl)}
                          disabled={isUploadingImage}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingImage ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Star className="h-3.5 w-3.5" />
                          )}
                          <span className="font-mono tabular-nums">
                            Définir comme photo n°1 (e-mail)
                          </span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          <Star className="h-3 w-3 fill-current" />
                          <span>Envoyée en priorité dans les e-mails</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleAiProjection(activeImageItem)}
                        disabled={isUploadingImage}
                        aria-pressed={activeImageItem.isAiProjection}
                        title={
                          activeImageItem.isAiProjection
                            ? "Retirer le bandeau Projection 3D non contractuelle"
                            : "Ajouter le bandeau Projection 3D · Non contractuelle avec explication"
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50",
                          activeImageItem.isAiProjection
                            ? "bg-accent-solar/15 text-foreground border border-accent-solar/40 font-semibold"
                            : "border border-border bg-card hover:bg-muted text-foreground"
                        )}
                      >
                        <Box
                          className={cn(
                            "h-3.5 w-3.5",
                            activeImageItem.isAiProjection
                              ? "text-accent-solar"
                              : "text-muted-foreground"
                          )}
                        />
                        <span>
                          {activeImageItem.isAiProjection
                            ? "Projection 3D (actif)"
                            : "Marquer « Projection 3D »"}
                        </span>
                      </button>

                      {leadImages.length > 1 && (
                        <div className="inline-flex items-center rounded-md border border-border bg-card overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleMoveImage(safeActiveIndex, "left")}
                            disabled={isUploadingImage || safeActiveIndex === 0}
                            title="Déplacer avant"
                            aria-label="Déplacer la photo vers la gauche"
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-1.5 text-[11px] font-mono tabular-nums text-muted-foreground border-x border-border">
                            {safeActiveIndex + 1}/{leadImages.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(safeActiveIndex, "right")}
                            disabled={isUploadingImage || safeActiveIndex === leadImages.length - 1}
                            title="Déplacer après"
                            aria-label="Déplacer la photo vers la droite"
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(activeImageUrl)}
                      disabled={isUploadingImage}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 border border-transparent transition-colors cursor-pointer disabled:opacity-50"
                      title="Retirer cette photo du lead"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Retirer</span>
                    </button>
                  </div>

                  {/* Grille de miniatures */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {leadImageItems.map((item, idx) => {
                      const url = item.url
                      const isActive = idx === safeActiveIndex
                      return (
                        <div
                          key={url}
                          className={cn(
                            "relative rounded-md overflow-hidden border bg-card aspect-[3/2] transition-all",
                            isActive
                              ? "ring-2 ring-primary border-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            className="block w-full h-full cursor-pointer"
                            aria-label={`Afficher la photo ${idx + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Miniature ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>

                          <span
                            className={cn(
                              "absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-mono tabular-nums font-bold pointer-events-none",
                              idx === 0
                                ? "bg-primary text-primary-foreground"
                                : "bg-foreground/75 text-background"
                            )}
                          >
                            #{idx + 1}
                          </span>

                          {item.isAiProjection && (
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-foreground/85 text-background pointer-events-none">
                              3D
                            </span>
                          )}

                          <div className="absolute top-1 right-1 flex items-center gap-0.5">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(url)}
                                disabled={isUploadingImage}
                                title="Mettre en photo n°1 (e-mails)"
                                aria-label={`Définir la photo ${idx + 1} comme principale`}
                                className="p-0.5 rounded bg-foreground/75 hover:bg-primary text-background hover:text-primary-foreground transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Star className="h-2.5 w-2.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(url)}
                              disabled={isUploadingImage}
                              title="Retirer cette photo"
                              aria-label={`Supprimer la photo ${idx + 1}`}
                              className="p-0.5 rounded bg-foreground/75 hover:bg-destructive text-background transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {leadImages.length < MAX_LEAD_IMAGES && (
                      <label className="aspect-[3/2] rounded-md border border-dashed border-border bg-card/60 hover:bg-muted/70 flex flex-col items-center justify-center gap-1 cursor-pointer text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                        {isUploadingImage ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span>Ajouter</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleUploadImageFiles}
                          disabled={isUploadingImage}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>

                  {/* Actions d'ajout et explication */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-border/60">
                    {leadImages.length < MAX_LEAD_IMAGES && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted text-foreground cursor-pointer transition-colors">
                          {isUploadingImage ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <UploadCloud className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span>{isUploadingImage ? "Envoi en cours..." : "Ajouter photo(s)"}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleUploadImageFiles}
                            disabled={isUploadingImage}
                            className="sr-only"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setUrlInputOpen(!urlInputOpen)}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground underline decoration-dotted cursor-pointer"
                        >
                          {urlInputOpen ? "Annuler URL" : "+ Coller une URL"}
                        </button>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground leading-snug">
                      La photo <span className="font-mono tabular-nums font-semibold text-foreground">#1</span> est envoyée dans les e-mails ; toutes les photos sont consultables sur le portail installateur.
                    </p>
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
                        Ajoutez une ou plusieurs photos (Street View, vue aérienne, toiture). La 1ère sera envoyée dans les e-mails.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-colors">
                        {isUploadingImage ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="h-3.5 w-3.5" />
                        )}
                        <span>{isUploadingImage ? "Envoi en cours..." : "Télécharger photo(s)"}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleUploadImageFiles}
                          disabled={isUploadingImage}
                          className="sr-only"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setUrlInputOpen(!urlInputOpen)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground underline decoration-dotted cursor-pointer"
                      >
                        {urlInputOpen ? "Annuler" : "Ou coller une URL"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {urlInputOpen && leadImages.length < MAX_LEAD_IMAGES && (
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
                  Marge nette installateur
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
            marketplaceStatus={effectiveMarketplaceStatus}
            segment={effectiveSegment}
          />

          {/* Télémétrie Comportementale Installateurs sur ce Lead */}
          <LeadPartnerViewsPanel leadId={lead.id} />

          {/* Module de Sélection et Routage Installateurs */}
          <DispatchPanel
            leadId={lead.id}
            segment={effectiveSegment ?? "B2B"}
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

          <div className="flex items-center gap-2">
            {dispatchMode === "direct" ? (
              <Button
                size="sm"
                onClick={handleQualifyAndPublish}
                disabled={isPending || selectedPartnerIds.length === 0}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Attribuer ({selectedPartnerIds.length})</span>
                <span className="font-mono text-[10px] opacity-70 ml-1">⌘⏎</span>
              </Button>
            ) : isPublishedOnMarketplace ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-accent/10 text-accent border border-accent/25 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  <span>En ligne sur la Marketplace</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleUnpublish}
                  disabled={isPending}
                  className="h-8 gap-1.5 text-xs font-medium border-border"
                  title="Retirer ce lead de la marketplace sans le supprimer (réactivable plus tard)"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>Retirer de la Marketplace</span>
                </Button>
                {hasNext && onNext && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onNext}
                    className="h-8 gap-1 text-xs font-medium"
                    title="Passer au lead suivant (J)"
                  >
                    <span>Suivant</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : isSoldOutOnMarketplace ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-secondary text-foreground border border-border text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Complet (Quota atteint)</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleUnpublish}
                  disabled={isPending}
                  className="h-8 gap-1.5 text-xs font-medium border-border"
                  title="Retirer ce lead de la marketplace sans le supprimer"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>Retirer</span>
                </Button>
                {hasNext && onNext && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onNext}
                    className="h-8 gap-1 text-xs font-medium"
                    title="Passer au lead suivant (J)"
                  >
                    <span>Suivant</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleQualifyAndPublish}
                disabled={isPending}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isWithdrawnFromMarketplace ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>
                  {isWithdrawnFromMarketplace
                    ? "Remettre sur la Marketplace"
                    : "Approuver & Publier"}
                </span>
                <span className="font-mono text-[10px] opacity-70 ml-1">⌘⏎</span>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
