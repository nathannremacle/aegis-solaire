"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
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
  FileText,
  Gauge,
  CreditCard,
} from "lucide-react"

/* ═══════════════════════════════════════════════════════
   Types
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

/* ═══════════════════════════════════════════════════════
   Data maps
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
  parking: "Parking",
  friche: "Friche",
  terrain: "Terrain",
}

function label(map: Record<string, string>, key: string | null) {
  if (!key) return "—"
  return map[key.toLowerCase()] ?? key
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

/* ═══════════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════════ */

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const fadeRow = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

/* ═══════════════════════════════════════════════════════
   Slot progress bar (B2C concurrence)
   ═══════════════════════════════════════════════════════ */

function SlotProgress({ taken, max }: { taken: number; max: number }) {
  const remaining = max - taken
  const pct = Math.round((taken / max) * 100)
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 66 ? "bg-amber-500" : "bg-emerald-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-slate-500">
        {remaining > 0 ? `${remaining}/${max}` : "complet"}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   Locked Lead Row — light institutional style
   ═══════════════════════════════════════════════════════ */

function LockedLeadRow({
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
    <motion.div variants={fadeRow} layout className="group">
      <div
        className={`relative grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-3.5 transition-colors sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] ${
          hasReveal ? "bg-[#001D3D]/[0.015]" : "hover:bg-slate-50/60"
        }`}
      >
        {/* Col 1 — Province + Segment + Surface */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`flex h-7 shrink-0 items-center justify-center rounded-md px-2 text-[10px] font-bold uppercase tracking-wider ${
              isB2C
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {lead.segment}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {label(PROVINCE_LABELS, lead.province)}
            </p>
            <p className="text-[11px] text-slate-400">
              {label(SURFACE_LABELS, lead.surfaceType)}
              {lead.grd ? ` · ${label(GRD_LABELS, lead.grd)}` : ""}
            </p>
          </div>
        </div>

        {/* Col 2 — Puissance */}
        <div className="hidden sm:block">
          <p className="font-mono text-sm font-semibold tabular-nums text-slate-900">
            {lead.estimatedPowerKwc.toLocaleString("fr-BE")}{" "}
            <span className="text-[11px] font-normal text-slate-400">kWc</span>
          </p>
        </div>

        {/* Col 3 — Économies */}
        <div className="hidden sm:block">
          <p className="font-mono text-sm font-semibold tabular-nums text-[#001D3D]">
            {lead.estimatedRevenue.toLocaleString("fr-BE")}{" "}
            <span className="text-[11px] font-normal text-slate-400">€/an</span>
          </p>
        </div>

        {/* Col 4 — Concurrence / Slot */}
        <div className="hidden sm:block">
          {isB2C ? (
            <SlotProgress taken={lead.slots.taken} max={lead.slots.max} />
          ) : (
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                lead.slots.taken > 0
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {lead.slots.taken > 0 ? "attribué" : "exclusif"}
            </span>
          )}
        </div>

        {/* Col 5 — Age */}
        <div className="hidden sm:block">
          <p className="text-[11px] text-slate-400">{timeAgo(lead.createdAt)}</p>
        </div>

        {/* Col 6 — Action */}
        <div className="flex items-center gap-2">
          {isMine ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[#001D3D]/15 bg-[#001D3D]/[0.04] px-3 text-xs font-semibold text-[#001D3D] transition-all hover:bg-[#001D3D]/[0.08]"
            >
              <Unlock className="h-3.5 w-3.5" />
              Voir
              <ChevronDown
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          ) : soldOut ? (
            <span className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-400">
              <Lock className="h-3 w-3" />
              Complet
            </span>
          ) : (
            <button
              onClick={() => onPurchase(lead.id)}
              disabled={!!purchasing}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-[#001D3D] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#00152e] hover:shadow-md disabled:opacity-40"
            >
              {isPurchasing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {isPurchasing ? "…" : `Débloquer · ${lead.creditCost} cr`}
            </button>
          )}
        </div>
      </div>

      {/* Expanded unlock panel */}
      <AnimatePresence>
        {expanded && hasReveal && revealedLead && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-5">
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Contact */}
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#001D3D]/50">
                    Contact
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {revealedLead.first_name} {revealedLead.last_name}
                      </span>
                    </div>
                    {revealedLead.company && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-slate-600">{revealedLead.company}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <a
                        href={`tel:${revealedLead.phone}`}
                        className="font-mono text-[#001D3D] underline-offset-2 hover:underline"
                      >
                        {revealedLead.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <a
                        href={`mailto:${revealedLead.email}`}
                        className="text-blue-600 underline-offset-2 hover:underline"
                      >
                        {revealedLead.email}
                      </a>
                    </div>
                    {revealedLead.company_vat && (
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="font-mono text-slate-500">
                          TVA {revealedLead.company_vat}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Localisation */}
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Localisation
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="text-slate-900">
                        {label(PROVINCE_LABELS, revealedLead.province)}, Belgique
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${label(PROVINCE_LABELS, revealedLead.province)}, Belgique`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 underline-offset-2 hover:underline"
                    >
                      Voir sur Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Détails techniques */}
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Détails techniques
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Surface</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {(revealedLead.surface_area ?? 0).toLocaleString("fr-BE")} m²
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Facture élec.</span>
                      <span className="font-mono font-semibold text-[#001D3D]">
                        {(revealedLead.annual_electricity_bill ?? 0).toLocaleString("fr-BE")} €
                      </span>
                    </div>
                    {revealedLead.grd && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">GRD</span>
                        <span className="font-medium text-slate-600">
                          {label(GRD_LABELS, revealedLead.grd)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(revealedLead.project_details || revealedLead.message) && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Commentaire prospect
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {revealedLead.project_details || revealedLead.message}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   Purchased Lead Row (for "Mes Leads" tab)
   ═══════════════════════════════════════════════════════ */

function PurchasedRow({ lead, index }: { lead: RevealedLead; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div variants={fadeRow} custom={index}>
      <button
        onClick={() => setOpen(!open)}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/60 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`flex h-7 shrink-0 items-center justify-center rounded-md px-2 text-[10px] font-bold uppercase tracking-wider ${
              lead.segment === "B2C"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {lead.segment}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {lead.first_name} {lead.last_name}
            </p>
            <p className="text-[11px] text-slate-400">
              {label(PROVINCE_LABELS, lead.province)} · {label(SURFACE_LABELS, lead.surface_type)}
            </p>
          </div>
        </div>
        <div className="hidden sm:block">
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-sm text-[#001D3D] underline-offset-2 hover:underline"
          >
            {lead.phone}
          </a>
        </div>
        <div className="hidden sm:block">
          <p className="font-mono text-sm font-semibold tabular-nums text-[#001D3D]">
            {(lead.annual_electricity_bill ?? 0).toLocaleString("fr-BE")} €
          </p>
        </div>
        <div className="hidden sm:block">
          {lead.company ? (
            <p className="truncate text-sm text-slate-600">{lead.company}</p>
          ) : (
            <p className="text-sm text-slate-400">Particulier</p>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-5">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#001D3D]/50">
                    Contact
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a href={`tel:${lead.phone}`} className="font-mono text-[#001D3D] underline-offset-2 hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <a href={`mailto:${lead.email}`} className="text-blue-600 underline-offset-2 hover:underline">
                      {lead.email}
                    </a>
                  </div>
                  {lead.company_vat && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-mono text-slate-500">TVA {lead.company_vat}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Localisation
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-900">{label(PROVINCE_LABELS, lead.province)}, Belgique</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${label(PROVINCE_LABELS, lead.province)}, Belgique`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 underline-offset-2 hover:underline"
                  >
                    Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Technique
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Surface</span>
                    <span className="font-mono text-slate-900">{(lead.surface_area ?? 0).toLocaleString("fr-BE")} m²</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Facture</span>
                    <span className="font-mono text-[#001D3D]">{(lead.annual_electricity_bill ?? 0).toLocaleString("fr-BE")} €/an</span>
                  </div>
                  {lead.grd && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">GRD</span>
                      <span className="text-slate-600">{label(GRD_LABELS, lead.grd)}</span>
                    </div>
                  )}
                </div>
              </div>
              {(lead.project_details || lead.message) && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Commentaire
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {lead.project_details || lead.message}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   Filter Chip — light style
   ═══════════════════════════════════════════════════════ */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all ${
        active
          ? "bg-[#001D3D] text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [leads, setLeads] = useState<MarketplaceLead[]>([])
  const [myLeads, setMyLeads] = useState<RevealedLead[]>([])
  const [revealed, setRevealed] = useState<Record<string, RevealedLead>>({})
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<"feed" | "portfolio">("feed")
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("ALL")
  const [provinceFilter, setProvinceFilter] = useState<ProvinceFilter>(null)

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/marketplace")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPartner(data.partner)
      setLeads(data.leads)
    } catch {
      setError("Impossible de charger le feed.")
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
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchMarketplace()
    fetchMyLeads()
  }, [fetchMarketplace, fetchMyLeads])

  const provinces = useMemo(
    () => Array.from(new Set(leads.map((l) => l.province).filter(Boolean))).sort(),
    [leads]
  )

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (segmentFilter !== "ALL" && l.segment !== segmentFilter) return false
      if (provinceFilter && l.province !== provinceFilter) return false
      return true
    })
  }, [leads, segmentFilter, provinceFilter])

  const totalPower = filteredLeads.reduce((s, l) => s + l.estimatedPowerKwc, 0)
  const totalRevenue = filteredLeads.reduce((s, l) => s + l.estimatedRevenue, 0)
  const b2bCount = filteredLeads.filter((l) => l.segment === "B2B").length
  const b2cCount = filteredLeads.filter((l) => l.segment === "B2C").length

  async function handlePurchase(leadId: string) {
    setPurchasing(leadId)
    setError(null)
    try {
      const res = await fetch("/api/partners/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? "Échec de l'achat.")
        return
      }
      if (data.lead) setRevealed((p) => ({ ...p, [leadId]: data.lead }))
      setPartner((p) => (p ? { ...p, credits: data.creditsRemaining } : p))
      setLeads((p) => p.map((l) => (l.id === leadId ? { ...l, alreadyPurchased: true } : l)))
      fetchMyLeads()
    } catch {
      setError("Erreur réseau.")
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#001D3D]" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 font-sans">
      {/* ─── Header — mirrors main site header ─── */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-18 sm:px-6 lg:px-8">
          {/* Left */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="shrink-0">
              <div className="relative h-10 w-36 sm:h-12 sm:w-44">
                <Image src="/logo.png" alt="Aegis Solaire" fill className="object-contain object-left" priority />
              </div>
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{partner?.companyName}</p>
              <p className="text-[11px] text-slate-400">Portail Installateur</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <Zap className="h-4 w-4 text-accent" />
              <div className="text-right">
                <p className="hidden text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:block">
                  Crédits
                </p>
                <motion.span
                  key={partner?.credits}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-mono text-lg font-bold tabular-nums text-[#001D3D]"
                >
                  {partner?.credits ?? 0}
                </motion.span>
              </div>
            </div>

            <Link href="/partenaires/dashboard/credits">
              <Button size="sm" className="bg-[#001D3D] font-bold text-white shadow-md hover:bg-[#00152e]">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Recharger
              </Button>
            </Link>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── KPI Strip ─── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3 sm:gap-10 sm:px-6 lg:px-8">
          {[
            { icon: LayoutGrid, label: "Leads", value: String(filteredLeads.length), color: "text-slate-900" },
            { icon: Gauge, label: "Puissance tot.", value: `${totalPower.toLocaleString("fr-BE")} kWc`, color: "text-slate-900" },
            { icon: TrendingUp, label: "Économies tot.", value: `${totalRevenue.toLocaleString("fr-BE")} €`, color: "text-[#001D3D]" },
          ].map((kpi) => (
            <div key={kpi.label} className="flex items-center gap-2 whitespace-nowrap">
              <kpi.icon className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">{kpi.label}</span>
              <span className={`font-mono text-sm font-bold ${kpi.color}`}>{kpi.value}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[11px] text-slate-400">B2B</span>
            <span className="font-mono text-sm font-bold text-slate-900">{b2bCount}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-400">B2C</span>
            <span className="font-mono text-sm font-bold text-slate-900">{b2cCount}</span>
          </div>
        </div>
      </div>

      {/* ─── Tab Bar + Filters ─── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            <Chip active={tab === "feed"} onClick={() => setTab("feed")}>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Live Feed
              </span>
            </Chip>
            <Chip active={tab === "portfolio"} onClick={() => setTab("portfolio")}>
              <span className="flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Mes Leads
                {myLeads.length > 0 && (
                  <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#001D3D] px-1.5 text-[9px] font-bold text-white">
                    {myLeads.length}
                  </span>
                )}
              </span>
            </Chip>
          </div>

          {tab === "feed" && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Filter className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
              <Chip active={segmentFilter === "ALL"} onClick={() => setSegmentFilter("ALL")}>
                Tous
              </Chip>
              <Chip active={segmentFilter === "B2B"} onClick={() => setSegmentFilter("B2B")}>
                B2B
              </Chip>
              <Chip active={segmentFilter === "B2C"} onClick={() => setSegmentFilter("B2C")}>
                B2C
              </Chip>
              <div className="hidden h-4 w-px bg-slate-200 sm:block" />
              <Chip active={provinceFilter === null} onClick={() => setProvinceFilter(null)}>
                Wallonie
              </Chip>
              {provinces.map((p) => (
                <Chip
                  key={p}
                  active={provinceFilter === p}
                  onClick={() => setProvinceFilter(provinceFilter === p ? null : p)}
                >
                  {label(PROVINCE_LABELS, p)}
                </Chip>
              ))}
              <button
                onClick={() => { setLoading(true); fetchMarketplace() }}
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Actualiser"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Error ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-red-200 bg-red-50"
          >
            <div className="mx-auto max-w-7xl px-4 py-2.5 text-sm text-red-700 sm:px-6 lg:px-8">{error}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Content ─── */}
      <main className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-b-2xl bg-white shadow-sm sm:mx-4 sm:my-4 sm:rounded-2xl sm:border sm:border-slate-200 lg:mx-6">
          {tab === "feed" && (
            <>
              {/* Column headers */}
              <div className="hidden border-b border-slate-100 bg-slate-50/50 sm:grid sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] items-center gap-4 px-5 py-2.5">
                {["Projet", "Puissance", "Économies", "Disponibilité", "Reçu", "Action"].map((h) => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {h}
                  </span>
                ))}
              </div>

              {filteredLeads.length === 0 ? (
                <div className="px-5 py-20 text-center">
                  <p className="text-sm text-slate-400">Aucun lead ne correspond aux filtres actuels.</p>
                </div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="visible">
                  <AnimatePresence mode="popLayout">
                    {filteredLeads.map((lead) => (
                      <LockedLeadRow
                        key={lead.id}
                        lead={lead}
                        onPurchase={handlePurchase}
                        purchasing={purchasing}
                        revealedLead={revealed[lead.id] ?? null}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </>
          )}

          {tab === "portfolio" && (
            <>
              <div className="hidden border-b border-slate-100 bg-slate-50/50 sm:grid sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] items-center gap-4 px-5 py-2.5">
                {["Contact", "Téléphone", "Facture", "Entreprise", ""].map((h, i) => (
                  <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {h}
                  </span>
                ))}
              </div>

              {myLeads.length === 0 ? (
                <div className="px-5 py-20 text-center">
                  <Lock className="mx-auto mb-3 h-5 w-5 text-slate-300" />
                  <p className="text-sm text-slate-400">Aucun lead dans votre portfolio.</p>
                  <button
                    onClick={() => setTab("feed")}
                    className="mt-4 text-xs font-semibold text-[#001D3D] underline-offset-4 hover:underline"
                  >
                    Ouvrir le Live Feed
                  </button>
                </div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="visible">
                  {myLeads.map((lead, i) => (
                    <PurchasedRow key={lead.id ?? i} lead={lead} index={i} />
                  ))}
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
