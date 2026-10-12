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
  creditCost: number
  createdAt: string
  grd: string | null
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

type PartnerInfo = { id: string; credits: number; companyName: string }

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

function label(map: Record<string, string>, key: string | null) {
  if (!key) return "—"
  return map[key.toLowerCase()] ?? key
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
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
            <span className="text-rose-600 font-bold">Complet (3/3)</span>
          ) : (
            <span>
              <strong className="text-emerald-700">{remaining}</strong> {remaining > 1 ? "places libres" : "place libre"}
            </span>
          )}
        </span>
        <span className="font-mono text-[10px] text-slate-400">max {max}</span>
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
   Dossier Dévoilé (Executive CRM Lead View)
   ═══════════════════════════════════════════════════════ */

function RevealedLeadPanel({ lead }: { lead: RevealedLead }) {
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

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 via-white to-slate-50/50 p-5 sm:p-6 shadow-inner">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-sm">
            <Unlock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-slate-900">
              {lead.first_name} {lead.last_name}
              {lead.company && <span className="font-normal text-slate-600"> · {lead.company}</span>}
            </h4>
            <p className="text-xs text-slate-500">
              Dossier débloqué · {lead.segment === "B2B" ? "Exclusivité B2B réservée" : "Attribution B2C partagée (max 3)"}
            </p>
          </div>
        </div>

        <button
          onClick={copyFullLead}
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Copy className="h-3.5 w-3.5 text-slate-400" />
          Copier la fiche pour CRM
        </button>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {/* Contact direct */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coordonnées prospect</p>
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
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Localisation &amp; Réseau</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{label(PROVINCE_LABELS, lead.province)}, Wallonie</span>
            </div>
            <div className="text-xs text-slate-500">
              Gestionnaire (GRD) : <strong className="text-slate-800">{label(GRD_LABELS, lead.grd)}</strong>
            </div>
            <div className="pt-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${label(PROVINCE_LABELS, lead.province)}, Belgique`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Ouvrir Google Maps
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Détails techniques */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Caractéristiques d'installation</p>
          <div className="mt-3 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Surface utile</span>
              <span className="font-semibold text-slate-900">
                {(lead.surface_area ?? 0).toLocaleString("fr-BE")} m² ({label(SURFACE_LABELS, lead.surface_type)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Facture réseau</span>
              <span className="font-bold text-[#001D3D]">
                {(lead.annual_electricity_bill ?? 0).toLocaleString("fr-BE")} €/an
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Puissance estimée</span>
              <span className="font-bold text-amber-600">
                {Math.round((lead.surface_area ?? 0) * 0.17).toLocaleString("fr-BE")} kWc
              </span>
            </div>
          </div>
        </div>
      </div>

      {(lead.project_details || lead.message) && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Commentaire &amp; besoins exprimés par le prospect
          </p>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line italic">
            "{lead.project_details || lead.message}"
          </p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Lead Card Component (Vue Cartes Grille)
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
  const isMine = lead.alreadyPurchased
  const isPurchasing = purchasing === lead.id
  const soldOut = lead.slots.taken >= lead.slots.max && !isMine
  const hasReveal = isMine && revealedLead

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 bg-white ${
        isMine
          ? "border-emerald-300 shadow-md ring-1 ring-emerald-200/50"
          : soldOut
          ? "border-slate-200 bg-slate-50/70 opacity-75"
          : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Header carte */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Badge segment & type */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isB2C ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                <Users className="h-3 w-3 text-emerald-600" />
                B2C Résidentiel
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                <Crown className="h-3 w-3 text-amber-500" />
                B2B Exclusif (1:1)
              </span>
            )}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {label(PROVINCE_LABELS, lead.province)}
            </span>
          </div>

          {/* Horodatage */}
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            {timeAgo(lead.createdAt)}
          </span>
        </div>

        {/* Titre & type de toiture */}
        <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-[#001D3D] transition-colors">
          Projet {label(SURFACE_LABELS, lead.surfaceType)}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          GRD : <strong className="text-slate-700">{label(GRD_LABELS, lead.grd)}</strong> · Wallonie
        </p>
      </div>

      {/* Métriques clés en grille 3 colonnes */}
      <div className="mx-5 my-2 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Surface</span>
          <p className="mt-0.5 font-sans text-sm font-bold tabular-nums text-slate-900">
            {lead.surfaceArea.toLocaleString("fr-BE")}{" "}
            <span className="text-[10px] font-normal text-slate-500">m²</span>
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Puissance</span>
          <p className="mt-0.5 font-sans text-sm font-extrabold tabular-nums text-amber-600">
            {lead.estimatedPowerKwc.toLocaleString("fr-BE")}{" "}
            <span className="text-[10px] font-normal text-slate-500">kWc</span>
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Économies</span>
          <p className="mt-0.5 font-sans text-sm font-bold tabular-nums text-[#001D3D]">
            {lead.estimatedRevenue.toLocaleString("fr-BE")}{" "}
            <span className="text-[10px] font-normal text-slate-500">€/an</span>
          </p>
        </div>
      </div>

      {/* Concurrence / Disponibilité */}
      <div className="px-5 py-2.5">
        {isB2C ? (
          <SegmentedSlotBar taken={lead.slots.taken} max={lead.slots.max} />
        ) : (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Disponibilité :</span>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] ${
                lead.slots.taken > 0
                  ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                  : "bg-blue-50 text-blue-700 border border-blue-200/60"
              }`}
            >
              {lead.slots.taken > 0 ? "Attribué à 1 installateur" : "Exclusivité disponible (0/1)"}
            </span>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="mt-auto border-t border-slate-100 p-4 pt-3">
        {isMine ? (
          <button
            onClick={() => setExpanded(!expanded)}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 active:scale-[0.99]"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>{expanded ? "Masquer les coordonnées" : "Consulter le dossier débloqué"}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        ) : soldOut ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-xs font-medium text-slate-400">
            <Lock className="h-3.5 w-3.5" />
            <span>Dossier complet (Clôturé)</span>
          </div>
        ) : (
          <button
            onClick={() => onPurchase(lead.id)}
            disabled={!!purchasing}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#001D3D] to-[#00152e] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#002855] active:translate-y-0.5 disabled:opacity-50"
          >
            {isPurchasing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>
              {isPurchasing ? "Déblocage en cours…" : `Débloquer ce dossier · ${lead.creditCost} crédits`}
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
   Table Row Component (Vue Tableau Compact)
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
  const isMine = lead.alreadyPurchased
  const isPurchasing = purchasing === lead.id
  const soldOut = lead.slots.taken >= lead.slots.max && !isMine
  const hasReveal = isMine && revealedLead

  return (
    <div className={`border-b border-slate-100 transition-colors ${hasReveal ? "bg-blue-50/30" : "hover:bg-slate-50/70"}`}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        {/* Col 1 — Projet, Région & Segment */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`flex h-7 shrink-0 items-center justify-center rounded-md px-2 text-[10px] font-bold uppercase tracking-wider ${
              isB2C ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-blue-50 text-blue-700 border border-blue-200/60"
            }`}
          >
            {lead.segment}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {label(PROVINCE_LABELS, lead.province)}
            </p>
            <p className="text-[11px] text-slate-500">
              {label(SURFACE_LABELS, lead.surfaceType)}
              {lead.grd ? ` · ${label(GRD_LABELS, lead.grd)}` : ""}
            </p>
          </div>
        </div>

        {/* Col 2 — Puissance */}
        <div className="hidden sm:block">
          <p className="font-sans text-sm font-bold tabular-nums text-amber-600">
            {lead.estimatedPowerKwc.toLocaleString("fr-BE")}{" "}
            <span className="text-[11px] font-normal text-slate-400">kWc</span>
          </p>
          <p className="text-[10px] text-slate-400">
            {(lead.surfaceArea ?? 0).toLocaleString("fr-BE")} m²
          </p>
        </div>

        {/* Col 3 — Économies */}
        <div className="hidden sm:block">
          <p className="font-sans text-sm font-bold tabular-nums text-[#001D3D]">
            {lead.estimatedRevenue.toLocaleString("fr-BE")}{" "}
            <span className="text-[11px] font-normal text-slate-400">€/an</span>
          </p>
          <p className="text-[10px] text-slate-400">
            Facture : {(lead.annualBill ?? 0).toLocaleString("fr-BE")} €
          </p>
        </div>

        {/* Col 4 — Concurrence */}
        <div className="hidden sm:block">
          {isB2C ? (
            <SegmentedSlotBar taken={lead.slots.taken} max={lead.slots.max} />
          ) : (
            <span
              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                lead.slots.taken > 0
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {lead.slots.taken > 0 ? "Attribué (1/1)" : "Exclusif (0/1)"}
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
              className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100"
            >
              <Unlock className="h-3.5 w-3.5" />
              Voir
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          ) : soldOut ? (
            <span className="flex h-8 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-400">
              <Lock className="h-3 w-3" />
              Complet
            </span>
          ) : (
            <button
              onClick={() => onPurchase(lead.id)}
              disabled={!!purchasing}
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-lg bg-[#001D3D] px-3.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#002855] active:scale-95 disabled:opacity-40"
            >
              {isPurchasing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-400" />
              )}
              {isPurchasing ? "…" : `${lead.creditCost} cr`}
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
  const [myLeads, setMyLeads] = useState<RevealedLead[]>([])
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

  // Modal de confirmation de déblocage
  const [leadToConfirm, setLeadToConfirm] = useState<MarketplaceLead | null>(null)

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
      const purchased = (data.purchases ?? [])
        .map((p: { leads: RevealedLead }) => p.leads)
        .filter(Boolean)
      setMyLeads(purchased)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    fetchMarketplace()
    fetchMyLeads()
  }, [fetchMarketplace, fetchMyLeads])

  // Provinces présentes
  const provinces = useMemo(
    () => Array.from(new Set(leads.map((l) => l.province).filter(Boolean))).sort(),
    [leads]
  )

  // Filtrage et Tri
  const filteredLeads = useMemo(() => {
    let result = leads.filter((l) => {
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
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                  <ShieldCheck className="h-3 w-3" />
                  RESCERT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Marketplace Installateur Agréé</p>
            </div>
          </div>

          {/* Statut Live & Crédits & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Flux Live Wallonie</span>
            </div>

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

      {/* ─── Executive KPI Metrics Deck ─── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {/* Card 1: Opportunités */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Opportunités</span>
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-extrabold tabular-nums text-slate-900">
                {filteredLeads.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                <strong className="text-blue-700">{b2bCount} B2B</strong> · <strong className="text-emerald-700">{b2cCount} B2C</strong>
              </p>
            </div>

            {/* Card 2: Puissance totale */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Puissance estimée</span>
                <Sun className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-extrabold tabular-nums text-amber-600">
                {totalPower.toLocaleString("fr-BE")} <span className="text-sm font-normal text-slate-500">kWc</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Capacité photovoltaïque totale
              </p>
            </div>

            {/* Card 3: Économies factures */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Économies réseau</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-extrabold tabular-nums text-[#001D3D]">
                {totalRevenue.toLocaleString("fr-BE")} <span className="text-sm font-normal text-slate-500">€/an</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                Factures annuelles auditées
              </p>
            </div>

            {/* Card 4: Vos dossiers acquis */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold">Mon Portefeuille</span>
                <FileText className="h-4 w-4 text-[#001D3D]" />
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-extrabold tabular-nums text-slate-900">
                {myLeads.length} <span className="text-sm font-normal text-slate-500">acquis</span>
              </p>
              <button
                onClick={() => setTab("portfolio")}
                className="mt-1 text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
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
              <div className="flex flex-wrap items-center gap-2">
                {/* Search input */}
                <div className="relative flex-1 sm:w-64 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer (Liège, ORES, toiture…)"
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
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
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

                {/* Filtre Province Dropdown */}
                <select
                  value={provinceFilter ?? ""}
                  onChange={(e) => setProvinceFilter(e.target.value || null)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:border-[#001D3D] focus:outline-none"
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
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:border-[#001D3D] focus:outline-none"
                >
                  <option value="recent">Plus récents</option>
                  <option value="power_desc">Puissance (kWc ↓)</option>
                  <option value="revenue_desc">Économies (€ ↓)</option>
                  <option value="surface_desc">Surface (m² ↓)</option>
                </select>

                {/* View switcher (Cartes / Tableau) */}
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

                {/* Actualiser */}
                <button
                  onClick={() => {
                    setLoading(true)
                    fetchMarketplace()
                    toast.info("Actualisation du flux…")
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  title="Actualiser la liste"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
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
                {myLeads.map((lead) => (
                  <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <RevealedLeadPanel lead={lead} />
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
