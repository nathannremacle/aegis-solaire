"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Building2,
  MapPin,
  Zap,
  TrendingUp,
  Lock,
  Unlock,
  Loader2,
  RefreshCw,
  User,
  Mail,
  Phone,
  Hash,
  LogOut,
  ExternalLink,
  ChevronDown,
  Filter,
  LayoutGrid,
  List,
  FileText,
  Gauge,
  CreditCard,
  Search,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Sun,
  Layers,
  ArrowUpDown,
  Download,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Crown,
  Users,
  Flame,
  PhoneCall,
  Send,
  FileDown,
  Award,
  Bell,
  Sliders,
  X,
  Eye,
  BadgeAlert,
} from "lucide-react"

/* ═══════════════════════════════════════════════════════
   Types & Models
   ═══════════════════════════════════════════════════════ */

type SlotBuyer = { name: string; isMe: boolean }

type MarketplaceLead = {
  id: string
  province: string
  segment: "B2B" | "B2C"
  surfaceType: string
  surfaceArea: number
  annualBill: number
  estimatedPowerKwc: number
  estimatedRevenue: number
  estimatedContractValue?: number
  estimatedContractValueRange?: { min: number; max: number }
  estimatedInstallerMargin?: number
  roiMultiplier?: number
  roiDescription?: string
  creditCost: number
  creditCostEur?: number
  dataQuality?: "complete" | "partial"
  createdAt: string
  grd: string | null
  projectTimeline?: string | null
  estimatedRoiYears?: number | string | null
  wantsIrve?: boolean
  postalCode?: string | null
  roofMaterial?: string | null
  ownershipStatus?: string | null
  badges?: {
    isTopDeal: boolean
    isUrgent: boolean
    isHighVolume: boolean
    hasIrve: boolean
  }
  slots: { max: number; taken: number; buyers: SlotBuyer[] }
  alreadyPurchased: boolean
}

type RevealedLead = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string | null
  company_vat: string | null
  province: string
  segment: string
  surface_type: string
  surface_area: number
  annual_electricity_bill: number
  grd: string | null
  project_details: string | null
  message: string | null
}

type PortfolioLead = RevealedLead & {
  purchaseId?: string
  creditsSpent?: number
  purchasedAt?: string
  pipelineStatus?: "to_contact" | "contacted" | "meeting_scheduled" | "quote_sent" | "won" | "lost"
  notes?: string
  nextActionAt?: string | null
  dispute?: {
    id?: string
    reason: string
    details: string
    status: "pending" | "approved" | "rejected"
    credits_refunded?: number
  } | null
}

type PartnerInfo = {
  id: string
  credits: number
  companyName: string
  tier?: "certified" | "silver" | "gold"
  purchasesCount?: number
}

type SegmentFilter = "ALL" | "B2B" | "B2C"
type ProvinceFilter = string | null
type SortOption = "recent" | "power_desc" | "revenue_desc" | "surface_desc"
type ViewMode = "grid" | "table"

/* ═══════════════════════════════════════════════════════
   Data Maps & Helpers
   ═══════════════════════════════════════════════════════ */

const PROVINCE_LABELS: Record<string, string> = {
  liege: "Liège",
  hainaut: "Hainaut",
  namur: "Namur",
  brabant_wallon: "Brabant Wallon",
  luxembourg: "Luxembourg",
}

const GRD_LABELS: Record<string, string> = {
  ores: "ORES",
  resa: "RESA",
  aieg: "AIEG",
  rew: "REW",
  fluvius: "Fluvius",
}

const SURFACE_LABELS: Record<string, string> = {
  toiture: "Toiture",
  parking: "Ombrière de parking",
  friche: "Friche industrielle",
  terrain: "Terrain au sol",
}

const ROOF_LABELS: Record<string, string> = {
  tuiles: "Tuiles",
  ardoises: "Ardoises",
  zinc: "Zinc / Métal",
  toit_plat: "Toiture Plate",
  toit_incline: "Toiture Inclinée",
  bac_acier: "Bac Acier",
  epdm: "EPDM / Bitume",
}

function label(map: Record<string, string>, key: string | null) {
  if (!key) return "—"
  return map[key.toLowerCase()] ?? key
}

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return "Récemment"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "Récemment"
  const diff = Date.now() - d.getTime()
  if (diff < 0) return "À l'instant"
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

/* ═══════════════════════════════════════════════════════
   Micro-Components
   ═══════════════════════════════════════════════════════ */

/** Jauge segmentée à 3 crans pour le B2C (Max 3 installateurs) */
function SegmentedSlotBar({ taken, max }: { taken: number; max: number }) {
  const remaining = Math.max(0, max - taken)
  const isFull = remaining === 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const isTaken = i < taken
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-sm transition-colors ${
                isTaken
                  ? isFull
                    ? "bg-rose-500"
                    : "bg-amber-500"
                  : "bg-emerald-400/80"
              }`}
              title={isTaken ? `Place ${i + 1} attribuée` : `Place ${i + 1} disponible`}
            />
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-500">
          {isFull ? (
            <span className="text-rose-600 font-bold">Complet ({max}/{max})</span>
          ) : (
            <span>
              <strong className="text-emerald-700">{remaining} place{remaining > 1 ? "s" : ""} disponible{remaining > 1 ? "s" : ""} sur {max}</strong>
            </span>
          )}
        </span>
        <span className="font-mono text-[10px] text-slate-400">max {max} installateurs</span>
      </div>
    </div>
  )
}

/** Bouton de copie rapide avec retour visuel */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copié dans le presse-papier`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-800"
      title={`Copier ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════
   Fil d'actualité en Direct (Social Proof & Tension)
   ═══════════════════════════════════════════════════════ */

function MarketplaceLiveTicker() {
  const [items, setItems] = useState<Array<{ id: string; message: string; badge: string; timestamp: string }>>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetch("/api/partners/marketplace/ticker")
      .then((res) => res.json())
      .then((data) => {
        if (data?.items?.length) {
          setItems(data.items)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (items.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [items])

  if (!items.length) return null

  const currentItem = items[currentIndex] || items[0]
  if (!currentItem) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-slate-50 to-amber-50/70 p-3 sm:px-5 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 hidden sm:inline">
            Direct Réseau
          </span>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 truncate text-xs text-slate-800"
            >
              <span className="inline-flex items-center rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-black text-[#001D3D] shadow-2xs">
                {currentItem.badge}
              </span>
              <span className="font-semibold truncate">{currentItem.message}</span>
              <span className="text-slate-400 text-[11px] hidden md:inline font-mono">
                · {timeAgo(currentItem.timestamp)}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-slate-400">
          <span>{currentIndex + 1}/{items.length}</span>
        </div>
      </div>
    </div>
  )
}

/** Génération et téléchargement instantané d'une fiche vCard */
function downloadVCard(lead: RevealedLead) {
  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${lead.first_name} ${lead.last_name}
ORG:${lead.company || "Particulier Solaire"}
TEL;TYPE=CELL:${lead.phone}
EMAIL:${lead.email}
ADR;TYPE=WORK:;;${label(PROVINCE_LABELS, lead.province)};;;Belgique
NOTE:Projet Aegis Solaire - Surface: ${lead.surface_area} m2 - Facture: ${lead.annual_electricity_bill} EUR
END:VCARD`

  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", `Lead_${lead.first_name}_${lead.last_name}.vcf`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success("Contact vCard téléchargé ! Prêt pour votre répertoire.")
}

/* ═══════════════════════════════════════════════════════
   Dossier Dévoilé (Executive CRM Lead View)
   ═══════════════════════════════════════════════════════ */

function RevealedLeadPanel({
  lead,
  purchaseId,
  pipelineStatus = "to_contact",
  notes = "",
  dispute,
  onUpdatePipeline,
  onOpenDispute,
}: {
  lead: RevealedLead
  purchaseId?: string
  pipelineStatus?: "to_contact" | "contacted" | "meeting_scheduled" | "quote_sent" | "won" | "lost"
  notes?: string
  dispute?: {
    id?: string
    reason: string
    details: string
    status: "pending" | "approved" | "rejected"
    credits_refunded?: number
  } | null
  onUpdatePipeline?: (purchaseId: string, status: string, notes?: string) => void
  onOpenDispute?: (lead: RevealedLead, purchaseId?: string) => void
}) {
  const [leadNotes, setLeadNotes] = useState(notes)
  const [savingNote, setSavingNote] = useState(false)

  const handleSaveNote = async () => {
    if (!purchaseId || !onUpdatePipeline) return
    setSavingNote(true)
    await onUpdatePipeline(purchaseId, pipelineStatus, leadNotes)
    setSavingNote(false)
  }
  const copyFullLead = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = `--- DOSSIER LEAD AEGIS SOLAIRE ---
Contact : ${lead.first_name} ${lead.last_name}
${lead.company ? `Société : ${lead.company} (TVA : ${lead.company_vat || "N/A"})` : "Particulier résidentiel"}
Téléphone : ${lead.phone}
Email : ${lead.email}
Région : ${label(PROVINCE_LABELS, lead.province)}, Belgique
Surface : ${(lead.surface_area ?? 0).toLocaleString("fr-BE")} m² (${label(SURFACE_LABELS, lead.surface_type)})
Facture annuelle : ${(lead.annual_electricity_bill ?? 0).toLocaleString("fr-BE")} €
GRD : ${label(GRD_LABELS, lead.grd)}
Détails : ${lead.project_details || lead.message || "Aucun commentaire supplémentaire."}
----------------------------------`
    navigator.clipboard.writeText(text)
    toast.success("Fiche complète copiée ! Prête pour votre CRM.")
  }

  const emailSubject = encodeURIComponent(`Aegis Solaire — Étude de faisabilité de votre projet à ${label(PROVINCE_LABELS, lead.province)}`)
  const emailBody = encodeURIComponent(
    `Bonjour ${lead.first_name} ${lead.last_name},\n\n` +
    `Faisant suite à votre demande sur la plateforme Aegis Solaire concernant votre projet photovoltaïque (${lead.surface_area} m² - ${label(SURFACE_LABELS, lead.surface_type)}), ` +
    `nous avons examiné vos données techniques et souhaitons vous proposer une étude personnalisée.\n\n` +
    `Quand seriez-vous disponible pour un court échange téléphonique ?\n\n` +
    `Bien cordialement,\nVotre installateur certifié Aegis Solaire`
  )

  return (
    <div className="rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 via-white to-slate-50/50 p-5 sm:p-6 shadow-sm">
      {/* Header fiche débloquée */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
            <Unlock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-extrabold text-slate-900">
                {lead.first_name} {lead.last_name}
              </h4>
              {lead.company && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {lead.company}
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-800 font-semibold mt-0.5">
              ✓ Dossier complet débloqué · {lead.segment === "B2B" ? "Exclusivité B2B réservée" : "Attribution B2C exclusive"}
            </p>
          </div>
        </div>

        {/* Boutons d'actions CRM rapides */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-black text-white shadow-xs transition-all active:scale-95"
            title="Appeler immédiatement"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Appeler</span>
          </a>

          <a
            href={`mailto:${lead.email}?subject=${emailSubject}&body=${emailBody}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#001D3D] hover:bg-[#002D5A] px-3.5 py-2 text-xs font-black text-white shadow-xs transition-all active:scale-95"
            title="Envoyer un email d'étude"
          >
            <Send className="h-3.5 w-3.5 text-amber-400" />
            <span>Envoyer email</span>
          </a>

          <button
            onClick={(e) => {
              e.stopPropagation()
              downloadVCard(lead)
            }}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all"
            title="Télécharger la fiche contact (.vcf)"
          >
            <FileDown className="h-3.5 w-3.5 text-slate-500" />
            <span>vCard</span>
          </button>

          <button
            onClick={copyFullLead}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all"
            title="Copier le texte formaté pour votre CRM"
          >
            <Copy className="h-3.5 w-3.5 text-slate-400" />
            <span>Copier CRM</span>
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {/* Contact direct */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Coordonnées directes</p>
          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-2 font-mono font-bold text-[#001D3D] hover:text-blue-700 hover:underline"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                {lead.phone}
              </a>
              <CopyButton text={lead.phone} label="Numéro de téléphone" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-2 truncate text-blue-600 hover:underline font-medium text-xs sm:text-sm"
              >
                <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </a>
              <CopyButton text={lead.email} label="Adresse email" />
            </div>

            {lead.company_vat && (
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 pt-1 border-t border-slate-100">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                <span>TVA : {lead.company_vat}</span>
              </div>
            )}
          </div>
        </div>

        {/* Localisation & Réseau */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Localisation &amp; GRD</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{label(PROVINCE_LABELS, lead.province)}, Wallonie</span>
            </div>
            <div className="text-xs text-slate-600">
              Gestionnaire (GRD) : <strong className="text-slate-900">{label(GRD_LABELS, lead.grd)}</strong>
            </div>
            <div className="pt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${label(PROVINCE_LABELS, lead.province)}, Belgique`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Ouvrir sur Maps
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Détails techniques */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dimensionnement projet</p>
          <div className="mt-3 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Surface utile</span>
              <span className="font-bold text-slate-900">
                {(lead.surface_area ?? 0).toLocaleString("fr-BE")} m² ({label(SURFACE_LABELS, lead.surface_type)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Facture actuelle</span>
              <span className="font-extrabold text-[#001D3D]">
                {(lead.annual_electricity_bill ?? 0).toLocaleString("fr-BE")} €/an
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Puissance estimée</span>
              <span className="font-extrabold text-amber-600">
                {Math.round((lead.surface_area ?? 0) * 0.17).toLocaleString("fr-BE")} kWc
              </span>
            </div>
          </div>
        </div>
      </div>

      {(lead.project_details || lead.message) && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Besoins &amp; précisions exprimés par le client
          </p>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line italic">
            "{lead.project_details || lead.message}"
          </p>
        </div>
      )}

      {/* ─── Module CRM : Pipeline de Conversion & Suivi Commercial ─── */}
      {purchaseId && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                Pipeline Commercial &amp; Suivi Prospect
              </span>
            </div>

            {/* Bouton ou Badge Garantie 24h ouvrées */}
            {dispute ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                <span>
                  Garantie 24h ouvrées : {dispute.status === "approved" ? "Validée (Crédits remboursés)" : dispute.status === "rejected" ? "Refusée" : "En cours d'examen"}
                </span>
              </div>
            ) : onOpenDispute ? (
              <button
                type="button"
                onClick={() => onOpenDispute(lead, purchaseId)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors"
                title="Numéro faux, injoignable après 3 tentatives ou hors cible ? Déposez un signalement garanti 24h ouvrées."
              >
                <AlertCircle className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                <span>Garantie 24h ouvrées · Signaler un problème</span>
              </button>
            ) : null}
          </div>

          {/* Stepper Pipeline 6 étapes */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {[
              { id: "to_contact", label: "À contacter", bg: "bg-amber-100 border-amber-300 text-amber-950" },
              { id: "contacted", label: "Contacté", bg: "bg-blue-100 border-blue-300 text-blue-950" },
              { id: "meeting_scheduled", label: "RDV fixé", bg: "bg-indigo-100 border-indigo-300 text-indigo-950" },
              { id: "quote_sent", label: "Devis envoyé", bg: "bg-purple-100 border-purple-300 text-purple-950" },
              { id: "won", label: "Signé / Gagné", bg: "bg-emerald-100 border-emerald-300 text-emerald-950" },
              { id: "lost", label: "Sans suite", bg: "bg-slate-200 border-slate-300 text-slate-800" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onUpdatePipeline?.(purchaseId, st.id, leadNotes)}
                className={`rounded-xl border px-2.5 py-2 text-center text-xs font-bold transition-all ${
                  pipelineStatus === st.id
                    ? `${st.bg} shadow-xs ring-2 ring-black/5 scale-[1.02]`
                    : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Bloc Notes de suivi */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                placeholder="Ajouter une note interne (ex: Rappeler jeudi 14h, toiture ardoise, devis 12 kWc…)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#001D3D] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#001D3D] hover:bg-[#002D5A] px-3 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50"
            >
              {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>Sauvegarder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Lead Card Component (Vue Cartes Grille Persuasive)
   ═══════════════════════════════════════════════════════ */

function LeadProjectCard({
  lead,
  onPurchase,
  purchasing,
  revealedLead,
}: {
  lead: MarketplaceLead
  onPurchase: (id: string) => void
  purchasing: string | null
  revealedLead: RevealedLead | null
}) {
  const [expanded, setExpanded] = useState(false)
  const isB2C = lead.segment === "B2C"
  const isMine = Boolean(lead.alreadyPurchased)
  const isPurchasing = purchasing === lead.id
  const slotsTaken = lead.slots?.taken ?? 0
  const slotsMax = lead.slots?.max ?? (isB2C ? 3 : 1)
  const soldOut = slotsTaken >= slotsMax && !isMine
  const hasReveal = isMine && Boolean(revealedLead)

  // Calculs financiers pour l'ancrage de valeur
  // Plafonnement d'affichage résidentiel en cohérence avec le cap 10 kVA wallon
  const displaySurfaceArea = isB2C && (lead.surfaceArea ?? 0) > 150 ? Math.min(lead.surfaceArea, 80) : (lead.surfaceArea ?? 0)
  const powerKwc = isB2C && (lead.estimatedPowerKwc ?? 0) > 10 ? 10 : (lead.estimatedPowerKwc ?? 0)

  const contractValue =
    lead.estimatedContractValue ||
    Math.max(isB2C ? 7500 : 24000, Math.round(powerKwc * (isB2C ? 1450 : 1150)))
  const installerMargin =
    lead.estimatedInstallerMargin || Math.round(contractValue * 0.22)
  const creditCost = lead.creditCost ?? (isB2C ? 2 : 5)
  const leadEuroCost = lead.creditCostEur ?? Math.round(creditCost * 11.98)
  const acqCostPercent = contractValue > 0 ? ((leadEuroCost / contractValue) * 100).toFixed(1) : "0.3"

  // Titre & Sous-titre dynamiques réalistes
  const roofMat = lead.roofMaterial ? label(ROOF_LABELS, lead.roofMaterial) : label(SURFACE_LABELS, lead.surfaceType) || "Tuiles"
  const postal = lead.postalCode ? `${lead.postalCode} ` : ""
  const provLabel = label(PROVINCE_LABELS, lead.province)
  const provName = provLabel !== "—" ? provLabel : "Wallonie"
  const cardTitle = `Toiture ${roofMat} — ${postal}${provName}`
  const grdLabel = label(GRD_LABELS, lead.grd)
  const grdName = grdLabel !== "—" ? grdLabel : "ORES"
  const cardSubtitle = `GRD : ${grdName} · Propriétaire vérifié · Il y a ${timeAgo(lead.createdAt)}`

  // Rareté B2C
  const isLastSlot = isB2C && slotsTaken === slotsMax - 1

  return (
    <div
      className={`group relative flex flex-col rounded-3xl border transition-all duration-200 bg-white ${
        isMine
          ? "border-emerald-300 shadow-md ring-2 ring-emerald-200/60"
          : soldOut
          ? "border-slate-200 bg-slate-50/70 opacity-70"
          : isLastSlot
          ? "border-amber-300 shadow-md ring-1 ring-amber-300/60 hover:shadow-lg hover:-translate-y-0.5"
          : "border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Bandeau supérieur de Rareté ou d'Opportunité */}
      {!isMine && !soldOut && (
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-2 text-[11px]">
          {isLastSlot ? (
            <span className="inline-flex items-center gap-1 font-black text-rose-600 animate-pulse">
              <BadgeAlert className="h-3.5 w-3.5" />
              Dernière place disponible !
            </span>
          ) : !isB2C ? (
            <span className="inline-flex items-center gap-1 font-bold text-blue-900">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              Exclusivité B2B 1:1 garantie
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Projet vérifié · {slotsMax - slotsTaken} {slotsMax - slotsTaken > 1 ? "places libres" : "place libre"}
            </span>
          )}

          <span className="font-mono text-[10px] text-slate-400">
            {timeAgo(lead.createdAt)}
          </span>
        </div>
      )}

      {/* Header carte */}
      <div className="p-4 pb-2">
        {/* Badges d'opportunité dynamique */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {isB2C ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
              <Users className="h-3 w-3 text-emerald-600" />
              B2C Résidentiel
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[10px] font-extrabold text-blue-900">
              <Crown className="h-3 w-3 text-amber-500" />
              B2B Exclusif (1:1)
            </span>
          )}

          {lead.badges?.isTopDeal && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900 shadow-2xs">
              <Flame className="h-3 w-3 text-amber-500 fill-amber-500" />
              Meilleur Deal ROI
            </span>
          )}

          {lead.badges?.isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
              ⚡ Décision Immédiate
            </span>
          )}

          {lead.badges?.hasIrve && (
            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-800">
              🔌 + Bornes IRVE
            </span>
          )}

          {provLabel !== "—" && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {provLabel}
            </span>
          )}
        </div>

        {/* Titre & type de toiture */}
        <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#001D3D] transition-colors leading-snug">
          {cardTitle}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {cardSubtitle}
        </p>
      </div>

      {/* Métriques techniques clés */}
      <div className="mx-4 my-1 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Surface</span>
          <p className="mt-0.5 font-sans text-sm font-extrabold tabular-nums text-slate-900">
            {displaySurfaceArea.toLocaleString("fr-BE")}{" "}
            <span className="text-[10px] font-normal text-slate-500">m²</span>
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Puissance</span>
          <p className="mt-0.5 font-sans text-sm font-black tabular-nums text-amber-600">
            {powerKwc.toLocaleString("fr-BE")}{" "}
            <span className="text-[10px] font-normal text-slate-500">kWc</span>
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FACTURE ÉLEC.</span>
          <p className="mt-0.5 font-sans text-sm font-extrabold tabular-nums text-[#001D3D]">
            {(lead.annualBill || lead.estimatedRevenue || 1850).toLocaleString("fr-BE")}{" "}
            <span className="text-[10px] font-normal text-slate-500">€/an</span>
          </p>
        </div>
      </div>

      {/* BLOC D'ANCRAGE DE RENTABILITÉ FINANCIÈRE (POUSSE À L'ACHAT) */}
      <div className="mx-4 mt-1.5 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/60 via-blue-50/40 to-white p-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-600">CA prévisionnel chantier :</span>
          <span className="font-black text-slate-900 font-sans">
            ~{(contractValue ?? 0).toLocaleString("fr-BE")} €
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-200/50">
          <span className="text-slate-500 text-[10px]">
            Marge indicative (~22%) : <strong className="text-slate-700">~{(installerMargin ?? 0).toLocaleString("fr-BE")} €</strong>
          </span>
          <span className="rounded bg-emerald-100/90 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
            Coût d'acquisition : ~{acqCostPercent} % du chantier
          </span>
        </div>
      </div>

      {/* Concurrence & Places restantes */}
      <div className="px-4 py-2.5">
        {isB2C ? (
          <SegmentedSlotBar taken={slotsTaken} max={slotsMax} />
        ) : (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Disponibilité :</span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-black uppercase tracking-wider text-[10px] ${
                slotsTaken > 0
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              {slotsTaken > 0 ? "Attribué à 1 installateur (Vendu)" : "Exclusivité disponible (0/1)"}
            </span>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="mt-auto border-t border-slate-100 p-3 pt-2.5">
        {isMine ? (
          <button
            onClick={() => setExpanded(!expanded)}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-800 transition-all hover:bg-emerald-100 active:scale-[0.99]"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>{expanded ? "Masquer les coordonnées" : "Consulter le dossier débloqué"}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        ) : soldOut ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-400">
            <Lock className="h-3.5 w-3.5" />
            <span>Dossier clôturé (Complet)</span>
          </div>
        ) : (
          <button
            onClick={() => onPurchase(lead.id)}
            disabled={!!purchasing}
            type="button"
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white shadow-md transition-all active:translate-y-0.5 disabled:opacity-50 ${
              isLastSlot
                ? "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 shadow-amber-500/20"
                : "bg-gradient-to-b from-[#001D3D] to-[#00152e] hover:bg-[#002855] shadow-slate-900/10"
            }`}
          >
            {isPurchasing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4 text-amber-400" />
            )}
            <span>
              {isPurchasing
                ? "Déblocage en cours…"
                : `Débloquer les coordonnées (${creditCost} crédits)`}
            </span>
          </button>
        )}
      </div>

      {/* Expandable Reveal Panel */}
      <AnimatePresence>
        {expanded && hasReveal && revealedLead && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-slate-100 bg-slate-50/50 p-4"
          >
            <RevealedLeadPanel lead={revealedLead} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Table Row Component (Vue Tableau Compact Persuasive)
   ═══════════════════════════════════════════════════════ */

function LeadTableRow({
  lead,
  onPurchase,
  purchasing,
  revealedLead,
}: {
  lead: MarketplaceLead
  onPurchase: (id: string) => void
  purchasing: string | null
  revealedLead: RevealedLead | null
}) {
  const [expanded, setExpanded] = useState(false)
  const isB2C = lead.segment === "B2C"
  const isMine = Boolean(lead.alreadyPurchased)
  const isPurchasing = purchasing === lead.id
  const slotsTaken = lead.slots?.taken ?? 0
  const slotsMax = lead.slots?.max ?? (isB2C ? 3 : 1)
  const soldOut = slotsTaken >= slotsMax && !isMine
  const hasReveal = isMine && Boolean(revealedLead)

  const powerKwc = lead.estimatedPowerKwc ?? 0
  const contractValue =
    lead.estimatedContractValue ||
    Math.max(isB2C ? 7500 : 24000, Math.round(powerKwc * (isB2C ? 1450 : 1150)))
  const creditCost = lead.creditCost ?? (isB2C ? 2 : 5)
  const leadEuroCost = lead.creditCostEur ?? Math.round(creditCost * 11.98)
  const isLastSlot = isB2C && slotsTaken === slotsMax - 1

  return (
    <div className={`border-b border-slate-100 transition-colors ${hasReveal ? "bg-emerald-50/20" : isLastSlot ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-slate-50/70"}`}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        {/* Col 1 — Projet, Région & Segment */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col gap-1 shrink-0">
            <span
              className={`flex h-6 items-center justify-center rounded-md px-2 text-[10px] font-black uppercase tracking-wider ${
                isB2C ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              {lead.segment}
            </span>
            {lead.badges?.isTopDeal && (
              <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-black text-amber-900">
                <Flame className="h-2.5 w-2.5 text-amber-600 fill-amber-600" />
                Deal
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">
              {label(PROVINCE_LABELS, lead.province)}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {label(SURFACE_LABELS, lead.surfaceType)}
              {lead.grd ? ` · ${label(GRD_LABELS, lead.grd)}` : ""}
            </p>
          </div>
        </div>

        {/* Col 2 — Puissance */}
        <div className="hidden sm:block">
          <p className="font-sans text-sm font-black tabular-nums text-amber-600">
            {(lead.estimatedPowerKwc ?? 0).toLocaleString("fr-BE")}{" "}
            <span className="text-[11px] font-normal text-slate-400">kWc</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {(lead.surfaceArea ?? 0).toLocaleString("fr-BE")} m²
          </p>
        </div>

        {/* Col 3 — Valorisation Chantier & Marge */}
        <div className="hidden sm:block">
          <p className="font-sans text-sm font-extrabold tabular-nums text-[#001D3D]">
            ~{(contractValue ?? 0).toLocaleString("fr-BE")}{" "}
            <span className="text-[11px] font-normal text-slate-400">€ CA</span>
          </p>
          <p className="text-[10px] text-emerald-700 font-bold">
            Coût d'acq. : ~{contractValue > 0 ? ((leadEuroCost / contractValue) * 100).toFixed(1) : "0.3"} %
          </p>
        </div>

        {/* Col 4 — Concurrence */}
        <div className="hidden sm:block">
          {isB2C ? (
            <div>
              <SegmentedSlotBar taken={slotsTaken} max={slotsMax} />
              {isLastSlot && (
                <span className="text-[10px] font-black text-rose-600">Dernier slot !</span>
              )}
            </div>
          ) : (
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                slotsTaken > 0
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              {slotsTaken > 0 ? "Vendu (1/1)" : "Exclusif (0/1)"}
            </span>
          )}
        </div>

        {/* Col 5 — Âge */}
        <div className="hidden sm:block">
          <p className="text-xs text-slate-400 font-mono">{timeAgo(lead.createdAt)}</p>
        </div>

        {/* Col 6 — Action */}
        <div className="flex items-center gap-2">
          {isMine ? (
            <button
              onClick={() => setExpanded(!expanded)}
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-black text-emerald-800 transition-all hover:bg-emerald-100"
            >
              <Unlock className="h-3.5 w-3.5" />
              Voir
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          ) : soldOut ? (
            <span className="flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-400">
              <Lock className="h-3 w-3" />
              Complet
            </span>
          ) : (
            <button
              onClick={() => onPurchase(lead.id)}
              disabled={!!purchasing}
              type="button"
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-black text-white shadow-xs transition-all active:scale-95 disabled:opacity-40 ${
                isLastSlot
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400"
                  : "bg-[#001D3D] hover:bg-[#002855]"
              }`}
            >
              {isPurchasing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-400" />
              )}
              {isPurchasing ? "…" : `${creditCost} cr`}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Accordion Panel */}
      <AnimatePresence>
        {expanded && hasReveal && revealedLead && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-slate-100 p-4 sm:p-5"
          >
            <RevealedLeadPanel lead={revealedLead} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Main Partner Dashboard Component
   ═══════════════════════════════════════════════════════ */

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [leads, setLeads] = useState<MarketplaceLead[]>([])
  const [myLeads, setMyLeads] = useState<PortfolioLead[]>([])
  const [revealed, setRevealed] = useState<Record<string, RevealedLead>>({})
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & State
  const [tab, setTab] = useState<"feed" | "portfolio">("feed")
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("ALL")
  const [provinceFilter, setProvinceFilter] = useState<ProvinceFilter>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Pipeline Filter for Portfolio
  const [portfolioPipelineFilter, setPortfolioPipelineFilter] = useState<string>("ALL")

  // Modal de réclamation (Garantie 48h)
  const [disputeModalLead, setDisputeModalLead] = useState<PortfolioLead | null>(null)
  const [disputeReason, setDisputeReason] = useState<"unreachable" | "wrong_number" | "out_of_scope" | "already_equipped" | "other">("unreachable")
  const [disputeDetails, setDisputeDetails] = useState("")
  const [submittingDispute, setSubmittingDispute] = useState(false)

  // Modal de confirmation de déblocage
  const [leadToConfirm, setLeadToConfirm] = useState<MarketplaceLead | null>(null)

  // Modales d'alertes personnalisées & de palier de fidélité
  const [showAlertsModal, setShowAlertsModal] = useState(false)
  const [alertProvinces, setAlertProvinces] = useState<string[]>(["liege", "namur", "hainaut"])
  const [alertMinSurface, setAlertMinSurface] = useState<number>(200)
  const [alertNotifyEmail, setAlertNotifyEmail] = useState(true)
  const [showTierModal, setShowTierModal] = useState(false)
  const [filterMyZone, setFilterMyZone] = useState(false)
  const [savingAlerts, setSavingAlerts] = useState(false)

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/preferences")
      if (!res.ok) return
      const data = await res.json()
      if (data?.preferences?.provinces?.length) {
        setAlertProvinces(data.preferences.provinces)
      }
      if (data?.preferences?.minFacture) {
        setAlertMinSurface(Math.round(data.preferences.minFacture / 25))
      }
    } catch {
      /* silent */
    }
  }, [])

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/marketplace")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPartner(data.partner)
      setLeads(data.leads)
    } catch {
      setError("Impossible de charger le feed de la marketplace.")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMyLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/credits")
      if (!res.ok) return
      const data = await res.json()
      const purchased: PortfolioLead[] = (data.purchases ?? [])
        .map((p: any) => ({
          ...p.leads,
          purchaseId: p.id,
          creditsSpent: p.credits_spent,
          purchasedAt: p.purchased_at,
          pipelineStatus: p.pipeline_status || "to_contact",
          notes: p.notes || "",
          nextActionAt: p.next_action_at || null,
          dispute: p.dispute || null,
        }))
        .filter((l: any) => Boolean(l.id))
      setMyLeads(purchased)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    fetchMarketplace()
    fetchMyLeads()
    fetchPreferences()
  }, [fetchMarketplace, fetchMyLeads, fetchPreferences])

  async function handleUpdatePipeline(purchaseId: string, status: string, notes?: string) {
    try {
      const res = await fetch(`/api/partners/purchases/${purchaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_status: status, notes }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      toast.success("Suivi commercial mis à jour !")
      setMyLeads((prev) =>
        prev.map((item) =>
          item.purchaseId === purchaseId
            ? { ...item, pipelineStatus: status as any, ...(notes !== undefined ? { notes } : {}) }
            : item
        )
      )
    } catch (err: any) {
      toast.error(err.message || "Erreur de mise à jour")
    }
  }

  async function handleSubmitDispute() {
    if (!disputeModalLead || !disputeModalLead.purchaseId) return
    if (!disputeDetails.trim()) {
      toast.error("Veuillez décrire le problème rencontré.")
      return
    }
    setSubmittingDispute(true)
    try {
      const res = await fetch("/api/partners/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: disputeModalLead.id,
          purchaseId: disputeModalLead.purchaseId,
          reason: disputeReason,
          details: disputeDetails,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      toast.success("Signalement transmis ! Examen sous 24h ouvrées.")
      setMyLeads((prev) =>
        prev.map((item) =>
          item.purchaseId === disputeModalLead.purchaseId
            ? { ...item, dispute: data.dispute || { status: "pending", reason: disputeReason, details: disputeDetails } }
            : item
        )
      )
      setDisputeModalLead(null)
      setDisputeDetails("")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de la réclamation")
    } finally {
      setSubmittingDispute(false)
    }
  }

  async function handleSaveAlerts() {
    setSavingAlerts(true)
    try {
      const res = await fetch("/api/partners/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provinces: alertProvinces,
          minFacture: alertMinSurface * 25,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      toast.success("Vos préférences d'alerte ont été enregistrées avec succès !")
      setShowAlertsModal(false)
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement.")
    } finally {
      setSavingAlerts(false)
    }
  }

  // Provinces présentes
  const provinces = useMemo(
    () => Array.from(new Set(leads.map((l) => l.province).filter(Boolean))).sort(),
    [leads]
  )

  // Filtrage et Tri
  const filteredLeads = useMemo(() => {
    let result = leads.filter((l) => {
      if (filterMyZone && !alertProvinces.includes(l.province?.toLowerCase() ?? "")) return false
      if (segmentFilter !== "ALL" && l.segment !== segmentFilter) return false
      if (provinceFilter && l.province !== provinceFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const prov = label(PROVINCE_LABELS, l.province).toLowerCase()
        const grd = (l.grd ?? "").toLowerCase()
        const surf = label(SURFACE_LABELS, l.surfaceType).toLowerCase()
        if (!prov.includes(q) && !grd.includes(q) && !surf.includes(q) && !l.segment.toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })

    // Tri
    result = [...result].sort((a, b) => {
      if (sortBy === "power_desc") return b.estimatedPowerKwc - a.estimatedPowerKwc
      if (sortBy === "revenue_desc") return b.estimatedRevenue - a.estimatedRevenue
      if (sortBy === "surface_desc") return b.surfaceArea - a.surfaceArea
      // "recent" par défaut
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return result
  }, [leads, segmentFilter, provinceFilter, searchQuery, sortBy])

  // Métriques globales
  const totalPower = filteredLeads.reduce((s, l) => s + l.estimatedPowerKwc, 0)
  const totalRevenue = filteredLeads.reduce((s, l) => s + l.estimatedRevenue, 0)
  const totalContractPotential = useMemo(() => {
    return filteredLeads.reduce((acc, l) => {
      const kwc = l.estimatedPowerKwc || 0
      const val = l.estimatedContractValue || (kwc > 0 ? Math.round(kwc * (l.segment === "B2C" ? 1450 : 1150)) : (l.segment === "B2C" ? 11875 : 35625))
      return acc + val
    }, 0)
  }, [filteredLeads])
  const leadsInMyZoneCount = useMemo(() => {
    return leads.filter((l) => alertProvinces.some((p) => p.toLowerCase() === (l.province ?? "").toLowerCase())).length
  }, [leads, alertProvinces])
  const b2bCount = filteredLeads.filter((l) => l.segment === "B2B").length
  const b2cCount = filteredLeads.filter((l) => l.segment === "B2C").length

  // Déblocage avec confirmation
  function requestPurchase(leadId: string) {
    const targetLead = leads.find((l) => l.id === leadId)
    if (!targetLead) return
    if ((partner?.credits ?? 0) < targetLead.creditCost) {
      toast.error(`Crédits insuffisants. Vous disposez de ${partner?.credits ?? 0} crédits, ce dossier en requiert ${targetLead.creditCost}.`, {
        action: {
          label: "Recharger",
          onClick: () => { window.location.href = "/partenaires/dashboard/credits" },
        },
      })
      return
    }
    setLeadToConfirm(targetLead)
  }

  async function confirmPurchase() {
    if (!leadToConfirm) return
    const leadId = leadToConfirm.id
    setPurchasing(leadId)
    setError(null)
    setLeadToConfirm(null)

    try {
      const res = await fetch("/api/partners/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Échec du déblocage.")
        return
      }

      toast.success("Dossier débloqué avec succès !")
      if (data.lead) setRevealed((p) => ({ ...p, [leadId]: data.lead }))
      setPartner((p) => (p ? { ...p, credits: data.creditsRemaining } : p))
      setLeads((p) => p.map((l) => (l.id === leadId ? { ...l, alreadyPurchased: true } : l)))
      fetchMyLeads()
    } catch {
      toast.error("Erreur réseau lors de la transaction.")
    } finally {
      setPurchasing(null)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/partenaires/login"
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#001D3D]" />
        <p className="text-sm font-semibold text-slate-600">Connexion sécurisée à la marketplace…</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans">
      {/* ─── Confirmation Modal ─── */}
      <AnimatePresence>
        {leadToConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Confirmer le déblocage</h3>
                  <p className="text-xs text-slate-500">
                    Projet {label(PROVINCE_LABELS, leadToConfirm.province)} · {leadToConfirm.segment}
                  </p>
                </div>
              </div>

              <div className="my-4 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Coût de déblocage :</span>
                  <span className="font-bold text-slate-900">{leadToConfirm.creditCost} crédits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Votre solde actuel :</span>
                  <span className="font-medium text-slate-700">{partner?.credits ?? 0} crédits</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-2 font-semibold">
                  <span className="text-slate-700">Solde restant après achat :</span>
                  <span className="text-emerald-700">{(partner?.credits ?? 0) - leadToConfirm.creditCost} crédits</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Le contact direct (nom, numéro de téléphone, email, TVA) et les caractéristiques techniques détaillées vous seront immédiatement restitués.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLeadToConfirm(null)}
                  className="rounded-xl border-slate-200"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={confirmPurchase}
                  className="rounded-xl bg-[#001D3D] font-bold text-white hover:bg-[#00152e]"
                >
                  Confirmer et débloquer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modale 2 : Préférences d'Alertes Métier (SMS / Email) ─── */}
      <AnimatePresence>
        {showAlertsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Vos Alertes Leads en Temps Réel</h3>
                    <p className="text-xs text-slate-500">
                      Soyez alerté instantanément dès qu'un chantier qualifié est publié dans votre zone.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAlertsModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="my-5 space-y-4">
                {/* Sélection des provinces */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Provinces d'intervention privilégiées
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(PROVINCE_LABELS).map(([key, name]) => {
                      const selected = alertProvinces.includes(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setAlertProvinces((prev) =>
                              selected ? prev.filter((p) => p !== key) : [...prev, key]
                            )
                          }}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                            selected
                              ? "border-[#001D3D] bg-[#001D3D] text-white shadow-2xs"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <span>{name}</span>
                          {selected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Surface minimum */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Surface toiture minimale
                    </label>
                    <span className="text-xs font-mono font-extrabold text-[#001D3D]">
                      ≥ {alertMinSurface} m² (~{Math.round(alertMinSurface * 0.17)} kWc)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={50}
                    value={alertMinSurface}
                    onChange={(e) => setAlertMinSurface(Number(e.target.value))}
                    className="w-full accent-[#001D3D]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>50 m² (Résidentiel)</span>
                    <span>500 m² (Industriel)</span>
                    <span>1000 m²+</span>
                  </div>
                </div>

                {/* Canaux de notification */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">Notification Email Instantanée</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alertNotifyEmail}
                      onChange={(e) => setAlertNotifyEmail(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#001D3D]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Envoyé à l'adresse de votre compte dès validation d'un lead par Aegis Solaire.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAlertsModal(false)}
                  className="rounded-xl border-slate-200"
                >
                  Fermer
                </Button>
                <Button
                  size="sm"
                  disabled={savingAlerts}
                  onClick={handleSaveAlerts}
                  className="rounded-xl bg-[#001D3D] font-bold text-white hover:bg-[#002D5A]"
                >
                  {savingAlerts ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    "Enregistrer mes alertes"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modale 3 : Paliers de Fidélité & Avantages Partenaire ─── */}
      <AnimatePresence>
        {showTierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Programme Partenaires Aegis</h3>
                    <p className="text-xs text-slate-500">
                      Plus vous débloquez de leads qualifiés, plus vos avantages grandissent.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTierModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="my-5 space-y-3">
                {/* Palier Certifié */}
                <div className={`rounded-2xl border p-4 transition-all ${partner?.tier === "certified" || !partner?.tier ? "border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200" : "border-slate-200 bg-white opacity-70"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="font-extrabold text-sm text-slate-900">Installateur Certifié (0 à 4 leads)</span>
                    </div>
                    {(partner?.tier === "certified" || !partner?.tier) && (
                      <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                        Votre palier actuel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">
                    Accès à l'ensemble du flux public de la marketplace Wallonie, garantie lead qualifié.
                  </p>
                </div>

                {/* Palier Silver */}
                <div className={`rounded-2xl border p-4 transition-all ${partner?.tier === "silver" ? "border-slate-400 bg-slate-100/60 ring-1 ring-slate-300" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-slate-600" />
                      <span className="font-extrabold text-sm text-slate-900">Partenaire Silver (5 à 14 leads)</span>
                    </div>
                    {partner?.tier === "silver" && (
                      <span className="rounded-full bg-slate-300 px-2 py-0.5 text-[10px] font-black text-slate-900">
                        Votre palier actuel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">
                    <strong>Avantage :</strong> -5% de réduction permanente sur tous les packs de crédits additionnels.
                  </p>
                </div>

                {/* Palier Gold */}
                <div className={`rounded-2xl border p-4 transition-all ${partner?.tier === "gold" ? "border-amber-300 bg-amber-50 ring-2 ring-amber-300" : "border-amber-200/80 bg-amber-50/30"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="font-extrabold text-sm text-amber-950">Partenaire Gold (15+ leads)</span>
                    </div>
                    {partner?.tier === "gold" && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#001D3D]">
                        Votre palier actuel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-900 mt-1.5 font-medium">
                    🔥 <strong>Accès Prioritaire 30 minutes :</strong> Les nouveaux leads B2B vous sont proposés en exclusivité 30 minutes avant leur publication sur le réseau général + support dédié 7j/7.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={() => setShowTierModal(false)}
                  className="rounded-xl bg-[#001D3D] font-bold text-white hover:bg-[#002D5A]"
                >
                  Compris
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modale 4 : Réclamation Garantie 48h ─── */}
      <AnimatePresence>
        {disputeModalLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Garantie 48h · Signaler une anomalie</h3>
                    <p className="text-xs text-slate-500">
                      Remboursement garanti en cas de fausse coordonnée ou d'incompatibilité.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDisputeModalLead(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Résumé du lead concerné */}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <span className="font-bold text-slate-800">
                  {disputeModalLead.first_name} {disputeModalLead.last_name}
                </span>{" "}
                · <span className="font-mono text-slate-600">{disputeModalLead.phone}</span> ·{" "}
                <span className="text-slate-500">{label(PROVINCE_LABELS, disputeModalLead.province)}</span>
              </div>

              <div className="my-4 space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Motif de la réclamation
                  </label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value as any)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:border-[#001D3D] focus:outline-none"
                  >
                    <option value="unreachable">Prospect injoignable (au moins 3 tentatives sur 48h sans réponse)</option>
                    <option value="wrong_number">Numéro faux ou non attribué</option>
                    <option value="already_equipped">Déjà équipé d'une installation photovoltaïque</option>
                    <option value="out_of_scope">Bâtiment non compatible ou locataire sans accord</option>
                    <option value="other">Autre motif justifié</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Précisions obligatoires
                  </label>
                  <textarea
                    rows={3}
                    value={disputeDetails}
                    onChange={(e) => setDisputeDetails(e.target.value)}
                    placeholder="Indiquez les dates/heures de vos appels ou l'échange justifiant la réclamation…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#001D3D] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisputeModalLead(null)}
                  className="rounded-xl border-slate-200"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  disabled={submittingDispute}
                  onClick={handleSubmitDispute}
                  className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700"
                >
                  {submittingDispute ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    "Transmettre la réclamation"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Top Enterprise Header ─── */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-18 sm:px-6 lg:px-8">
          {/* Logo & Identité Installateur */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="shrink-0" title="Retour au site Aegis Solaire">
              <div className="relative h-10 w-36 sm:h-12 sm:w-44">
                <Image src="/logo.png" alt="Aegis Solaire" fill className="object-contain object-left" priority />
              </div>
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 md:block" />
            <div className="hidden md:flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                  {partner?.companyName || "Mon Entreprise"}
                </p>
                {/* Palier cliquable */}
                <button
                  onClick={() => setShowTierModal(true)}
                  type="button"
                  className="transition-transform hover:scale-105"
                  title="Voir les avantages de mon palier"
                >
                  {partner?.tier === "gold" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300 shadow-2xs">
                      <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />
                      Partenaire Gold (Prioritaire)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300 shadow-2xs">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      ✓ Certifié RESCERT
                    </span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Marketplace Installateur Agréé Wallonie</p>
            </div>
          </div>

          {/* Statut Live & Crédits & Actions */}
          <div className="flex items-center gap-3">
            {/* Bouton Alertes */}
            <button
              onClick={() => setShowAlertsModal(true)}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:border-amber-300"
              title="Configurer mes notifications"
            >
              <Bell className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Mes Alertes</span>
            </button>

            {/* Solde Crédits Pill */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Zap className="h-4 w-4" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">Crédits</p>
                <motion.span
                  key={partner?.credits}
                  initial={{ y: -4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-sans text-lg font-extrabold tabular-nums text-[#001D3D]"
                >
                  {partner?.credits ?? 0}
                </motion.span>
              </div>
            </div>

            {/* Bouton Recharger */}
            <Link href="/partenaires/dashboard/credits">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-3.5 text-xs font-extrabold text-[#001D3D] shadow-[0_2px_0_#b47e00] hover:from-amber-300 hover:to-amber-400 active:translate-y-0.5 active:shadow-none transition-all"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Recharger</span>
              </button>
            </Link>

            {/* Bouton Déconnexion */}
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Executive KPI Metrics Deck (Compact -35% height) ─── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {/* Card 1: Opportunités */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 sm:p-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Opportunités</span>
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900">
                {filteredLeads.length}
              </p>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500 truncate">
                <strong className="text-blue-700">{b2bCount} B2B</strong> · <strong className="text-emerald-700">{b2cCount} B2C</strong>
              </p>
            </div>

            {/* Card 2: Puissance totale */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 sm:p-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Puissance estimée</span>
                <Sun className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-extrabold tabular-nums text-amber-600">
                {totalPower.toLocaleString("fr-BE")} <span className="text-xs font-normal text-slate-500">kWc</span>
              </p>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500 truncate">
                Capacité photovoltaïque totale
              </p>
            </div>

            {/* Card 3: Potentiel Chantiers */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 sm:p-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Potentiel Chantiers</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-extrabold tabular-nums text-[#001D3D]">
                ~{(totalContractPotential || 35625).toLocaleString("fr-BE")} <span className="text-xs font-normal text-slate-500">€ HTVA</span>
              </p>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500 truncate">
                Chiffre d'affaires estimé sur le vivier disponible
              </p>
            </div>

            {/* Card 4: Vos dossiers acquis */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 sm:p-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Mon Portefeuille</span>
                <FileText className="h-4 w-4 text-[#001D3D]" />
              </div>
              <p className="mt-1 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900">
                {myLeads.length} <span className="text-xs font-normal text-slate-500">acquis</span>
              </p>
              <button
                onClick={() => setTab("portfolio")}
                className="mt-0.5 text-[10px] sm:text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Consulter mes dossiers →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Tabs & Controls Toolbar ─── */}
      <section className="sticky top-16 sm:top-18 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Onglets Feed vs Portfolio */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("feed")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  tab === "feed"
                    ? "bg-[#001D3D] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Live Feed
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 font-mono text-[10px]">
                  {leads.length}
                </span>
              </button>

              <button
                onClick={() => setTab("portfolio")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  tab === "portfolio"
                    ? "bg-[#001D3D] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Mes Leads Débloqués
                {myLeads.length > 0 && (
                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 font-mono text-[10px] text-white font-extrabold">
                    {myLeads.length}
                  </span>
                )}
              </button>
            </div>

            {/* Barre de Recherche, Filtres & Vue Switcher */}
            {tab === "feed" && (
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
                {/* Search input */}
                <div className="relative flex-1 sm:w-56 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer (Liège, ORES…)"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#001D3D] focus:bg-white focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filtre Segment */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0">
                  {(["ALL", "B2B", "B2C"] as SegmentFilter[]).map((seg) => (
                    <button
                      key={seg}
                      onClick={() => setSegmentFilter(seg)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                        segmentFilter === seg
                          ? "bg-white text-[#001D3D] shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {seg === "ALL" ? "Tous" : seg}
                    </button>
                  ))}
                </div>

                {/* Filtre Rapide : Ma Zone */}
                <button
                  onClick={() => setFilterMyZone(!filterMyZone)}
                  className={`rounded-xl border px-3 h-9 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    filterMyZone
                      ? "bg-amber-400 border-amber-500 text-[#001D3D] shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title={filterMyZone ? "Afficher toutes les zones" : "Filtrer uniquement sur mes provinces d'alerte"}
                >
                  <MapPin className={`h-3.5 w-3.5 ${filterMyZone ? "text-[#001D3D]" : "text-amber-500"}`} />
                  <span>Ma Zone ({leadsInMyZoneCount})</span>
                </button>

                {/* Filtre Province Dropdown */}
                <select
                  value={provinceFilter ?? ""}
                  onChange={(e) => setProvinceFilter(e.target.value || null)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:border-[#001D3D] focus:outline-none shrink-0"
                >
                  <option value="">Toute la Wallonie</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {label(PROVINCE_LABELS, p)}
                    </option>
                  ))}
                </select>

                {/* Tri Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:border-[#001D3D] focus:outline-none shrink-0"
                >
                  <option value="recent">Plus récents</option>
                  <option value="power_desc">Puissance (kWc ↓)</option>
                  <option value="revenue_desc">Économies (€ ↓)</option>
                  <option value="surface_desc">Surface (m² ↓)</option>
                </select>

                {/* View switcher (Cartes / Tableau) & Actualiser regroupés sur la même ligne */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`rounded-lg p-1 text-slate-600 transition-colors ${
                        viewMode === "grid" ? "bg-white text-[#001D3D] shadow-xs" : "hover:text-slate-900"
                      }`}
                      title="Vue Grille de Projets"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`rounded-lg p-1 text-slate-600 transition-colors ${
                        viewMode === "table" ? "bg-white text-[#001D3D] shadow-xs" : "hover:text-slate-900"
                      }`}
                      title="Vue Tableau Compact"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setLoading(true)
                      fetchMarketplace()
                      toast.info("Actualisation du flux…")
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0"
                    title="Actualiser la liste"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Main Content Area ─── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Erreur */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchMarketplace()}>
              Réessayer
            </Button>
          </div>
        )}

        {/* ─── VUE 1 : LIVE FEED ─── */}
        {tab === "feed" && (
          <div>

            {/* Alerte solde faible / Incitation au réapprovisionnement */}
            {(partner?.credits ?? 0) <= 4 && (
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#001D3D] shadow-xs">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-950">
                      Votre réserve de crédits est faible ({partner?.credits ?? 0} crédit{partner?.credits ? "s" : ""})
                    </h4>
                    <p className="text-[11px] text-amber-900/90">
                      Un projet B2B exclusif requiert 5 crédits. Évitez de vous faire doubler par un autre installateur dès la mise en ligne d'un gros chantier.
                    </p>
                  </div>
                </div>
                <Link href="/partenaires/dashboard/credits" className="shrink-0">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#001D3D] hover:bg-[#002D5A] px-3.5 py-2 text-xs font-black text-white shadow-xs transition-all"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    Recharger en 1 clic
                  </button>
                </Link>
              </div>
            )}

            {/* Bannière de gouvernance claire */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:px-5 text-xs text-slate-600 shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Garantie de qualité :</strong> Chaque lead a fait l'objet d'un contrôle anti-spam et d'une validation technique par Aegis Solaire.
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  B2B : 1 seul installateur (Exclusif)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  B2C : 3 installateurs max
                </span>
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <Search className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-900">Aucun dossier ne correspond à vos filtres</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Essayez d'élargir votre recherche géographique ou de réinitialiser vos critères pour afficher l'ensemble des opportunités wallonnes.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setSegmentFilter("ALL")
                    setProvinceFilter(null)
                  }}
                  className="mt-4 inline-flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Vue Grille de Projets */
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLeads.map((lead) => (
                  <LeadProjectCard
                    key={lead.id}
                    lead={lead}
                    onPurchase={requestPurchase}
                    purchasing={purchasing}
                    revealedLead={revealed[lead.id] ?? null}
                  />
                ))}
              </div>
            ) : (
              /* Vue Tableau Dense */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="hidden border-b border-slate-100 bg-slate-50/70 sm:grid sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] items-center gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Projet &amp; Localisation</span>
                  <span>Puissance &amp; Surface</span>
                  <span>Économies &amp; Facture</span>
                  <span>Disponibilité</span>
                  <span>Reçu</span>
                  <span>Action</span>
                </div>
                <div>
                  {filteredLeads.map((lead) => (
                    <LeadTableRow
                      key={lead.id}
                      lead={lead}
                      onPurchase={requestPurchase}
                      purchasing={purchasing}
                      revealedLead={revealed[lead.id] ?? null}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── VUE 2 : MES LEADS (PORTFOLIO) ─── */}
        {tab === "portfolio" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Vos dossiers débloqués</h3>
                <p className="text-xs text-slate-500">
                  Historique complet de vos leads acquis. Toutes les coordonnées restent consultables sans limite de temps.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const csvRows = [
                      ["Nom", "Prénom", "Société", "Téléphone", "Email", "Province", "Surface", "Facture", "GRD"],
                      ...myLeads.map((l) => [
                        l.last_name,
                        l.first_name,
                        l.company || "",
                        l.phone,
                        l.email,
                        l.province,
                        l.surface_area,
                        l.annual_electricity_bill,
                        l.grd || "",
                      ]),
                    ]
                    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(";")).join("\n")
                    const encodedUri = encodeURI(csvContent)
                    const link = document.createElement("a")
                    link.setAttribute("href", encodedUri)
                    link.setAttribute("download", `aegis-leads-export-${new Date().toISOString().slice(0, 10)}.csv`)
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    toast.success("Export CSV téléchargé !")
                  }}
                  disabled={myLeads.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Exporter en CSV
                </button>
              </div>
            </div>

            {/* Filtres par étapes de conversion du pipeline */}
            {myLeads.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
                {[
                  { id: "ALL", label: `Tous (${myLeads.length})` },
                  { id: "to_contact", label: `À contacter (${myLeads.filter((l) => (l.pipelineStatus || "to_contact") === "to_contact").length})` },
                  { id: "contacted", label: `Contacté (${myLeads.filter((l) => l.pipelineStatus === "contacted").length})` },
                  { id: "meeting_scheduled", label: `RDV fixé (${myLeads.filter((l) => l.pipelineStatus === "meeting_scheduled").length})` },
                  { id: "quote_sent", label: `Devis envoyé (${myLeads.filter((l) => l.pipelineStatus === "quote_sent").length})` },
                  { id: "won", label: `Signé / Gagné (${myLeads.filter((l) => l.pipelineStatus === "won").length})` },
                  { id: "lost", label: `Sans suite (${myLeads.filter((l) => l.pipelineStatus === "lost").length})` },
                ].map((filterTab) => (
                  <button
                    key={filterTab.id}
                    onClick={() => setPortfolioPipelineFilter(filterTab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      portfolioPipelineFilter === filterTab.id
                        ? "bg-white text-[#001D3D] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {filterTab.label}
                  </button>
                ))}
              </div>
            )}

            {myLeads.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <Lock className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-900">Aucun lead débloqué pour le moment</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Consultez le Live Feed pour débloquer votre premier dossier B2B ou B2C en Wallonie.
                </p>
                <button
                  onClick={() => setTab("feed")}
                  className="mt-4 inline-flex items-center gap-1 rounded-xl bg-[#001D3D] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#002855] transition-all"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Ouvrir le Live Feed
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myLeads
                  .filter((lead) => {
                    if (portfolioPipelineFilter === "ALL") return true
                    return (lead.pipelineStatus || "to_contact") === portfolioPipelineFilter
                  })
                  .map((lead) => (
                    <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <RevealedLeadPanel
                        lead={lead}
                        purchaseId={lead.purchaseId}
                        pipelineStatus={lead.pipelineStatus}
                        notes={lead.notes}
                        dispute={lead.dispute}
                        onUpdatePipeline={handleUpdatePipeline}
                        onOpenDispute={(l, pId) => {
                          setDisputeModalLead({ ...l, purchaseId: pId } as any)
                        }}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
