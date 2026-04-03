"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import {
  Building2,
  MapPin,
  Zap,
  CreditCard,
  TrendingUp,
  Lock,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  User,
  Mail,
  Phone,
  Hash,
  LogOut,
  Clock,
} from "lucide-react"

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

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
}

type PartnerInfo = { id: string; credits: number; companyName: string }

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

const PROVINCE_LABELS: Record<string, string> = {
  liege: "Liège",
  hainaut: "Hainaut",
  namur: "Namur",
  brabant_wallon: "Brabant wallon",
  luxembourg: "Luxembourg",
}

function formatProvince(p: string | null) {
  if (!p) return "—"
  return PROVINCE_LABELS[p.toLowerCase()] ?? p
}

function formatSurface(t: string | null) {
  if (!t) return "—"
  const m: Record<string, string> = {
    toiture: "Toiture",
    parking: "Parking",
    friche: "Friche",
    terrain: "Terrain",
  }
  return m[t.toLowerCase()] ?? t
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}j`
}

/* ═══════════════════════════════════════════════
   Shared Components
   ═══════════════════════════════════════════════ */

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
}

const revealVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

/* ═══════════════════════════════════════════════
   FOMO Slot Indicators (B2C)
   ═══════════════════════════════════════════════ */

function SlotIndicators({ slots }: { slots: MarketplaceLead["slots"] }) {
  if (slots.max <= 1) return null
  const items = Array.from({ length: slots.max }, (_, i) => {
    const buyer = slots.buyers[i]
    if (buyer) {
      return buyer.isMe
        ? { label: "Vous", color: "bg-accent/20 text-accent border-accent/30" }
        : { label: buyer.name, color: "bg-red-500/15 text-red-400 border-red-500/30" }
    }
    return { label: "Disponible", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" }
  })

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${item.color}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Lead Card (Marketplace Teaser)
   ═══════════════════════════════════════════════ */

function LeadCard({
  lead,
  index,
  onPurchase,
  purchasing,
  revealedLead,
}: {
  lead: MarketplaceLead
  index: number
  onPurchase: (id: string) => void
  purchasing: string | null
  revealedLead: RevealedLead | null
}) {
  const isB2C = lead.segment === "B2C"
  const isMine = lead.alreadyPurchased
  const isPurchasing = purchasing === lead.id
  const soldOut = lead.slots.taken >= lead.slots.max && !isMine

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/25 hover:bg-white/[0.06] hover:shadow-[0_12px_30px_rgba(255,184,0,0.08)]">
        {/* Ambient glow on hover */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/[0.06] opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-100" />

        <div className="p-5">
          {/* Header: Province + Segment + Time */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/25">
                <MapPin className="h-4.5 w-4.5 text-accent drop-shadow-[0_0_4px_rgba(255,184,0,0.5)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{formatProvince(lead.province)}</p>
                <p className="text-[11px] text-neutral-500">{formatSurface(lead.surfaceType)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-neutral-600">
                <Clock className="h-3 w-3" />
                {timeAgo(lead.createdAt)}
              </span>
              <Badge
                className={`shrink-0 border text-[10px] font-bold uppercase tracking-wider ${
                  isB2C
                    ? "border-blue-400/30 bg-blue-400/15 text-blue-300"
                    : "border-accent/30 bg-accent/15 text-accent"
                }`}
              >
                {lead.segment}
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-accent/70" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Puissance
                </span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">
                {lead.estimatedPowerKwc}{" "}
                <span className="text-xs font-normal text-neutral-500">kWc</span>
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-400/70" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Économies est.
                </span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-accent">
                {lead.estimatedRevenue.toLocaleString("fr-BE")}{" "}
                <span className="text-xs font-normal text-accent/60">€/an</span>
              </p>
            </div>
          </div>

          {/* B2C: FOMO Slot indicators */}
          {isB2C && (
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                Places ({lead.slots.taken}/{lead.slots.max})
              </p>
              <SlotIndicators slots={lead.slots} />
            </div>
          )}

          {/* Purchase Button / Status */}
          {isMine ? (
            <div className="rounded-xl border border-accent/20 bg-accent/[0.06] px-4 py-3 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-accent" />
              <p className="mt-1 text-xs font-semibold text-accent">Débloqué</p>
            </div>
          ) : soldOut ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-center">
              <Lock className="mx-auto h-5 w-5 text-red-400" />
              <p className="mt-1 text-xs font-semibold text-red-400">Sold Out</p>
            </div>
          ) : (
            <Button
              onClick={() => onPurchase(lead.id)}
              disabled={!!purchasing}
              className="h-11 w-full gap-2 rounded-xl bg-accent text-sm font-bold text-[#001D3D] shadow-[0_0_20px_rgba(255,184,0,0.2)] transition-all hover:scale-[1.02] hover:bg-[#e6a600] hover:shadow-[0_0_30px_rgba(255,184,0,0.35)] disabled:opacity-50"
            >
              {isPurchasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {isPurchasing
                ? "Déblocage…"
                : `Débloquer (${lead.creditCost} crédit${lead.creditCost > 1 ? "s" : ""})`}
            </Button>
          )}
        </div>

        {/* Revealed Contact Info (after purchase) */}
        <AnimatePresence>
          {revealedLead && (
            <motion.div
              variants={revealVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="overflow-hidden"
            >
              <div className="border-t border-accent/20 bg-accent/[0.03] px-5 py-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                  Coordonnées débloquées
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <User className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    <span className="font-medium text-white">
                      {revealedLead.first_name} {revealedLead.last_name}
                    </span>
                  </div>
                  {revealedLead.company && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      <span className="text-neutral-300">{revealedLead.company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    <a
                      href={`mailto:${revealedLead.email}`}
                      className="text-blue-300 underline-offset-2 hover:underline"
                    >
                      {revealedLead.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    <a href={`tel:${revealedLead.phone}`} className="font-mono text-white">
                      {revealedLead.phone}
                    </a>
                  </div>
                  {revealedLead.company_vat && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Hash className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      <span className="font-mono text-neutral-400">
                        {revealedLead.company_vat}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   Purchased Lead Card (full PII)
   ═══════════════════════════════════════════════ */

function PurchasedLeadCard({
  lead,
  index,
}: {
  lead: RevealedLead
  index: number
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="group overflow-hidden rounded-2xl border border-accent/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-accent/25 hover:shadow-[0_12px_30px_rgba(255,184,0,0.08)]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
          <Badge className="border-accent/30 bg-accent/15 text-[10px] font-bold uppercase tracking-wider text-accent">
            Débloqué
          </Badge>
          <span className="text-xs text-neutral-500">
            {formatProvince(lead.province)} · {lead.segment} · {formatSurface(lead.surface_type)}
          </span>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/70">
              Contact
            </p>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-neutral-500" />
              <span className="font-medium text-white">
                {lead.first_name} {lead.last_name}
              </span>
            </div>
            {lead.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-3.5 w-3.5 text-neutral-500" />
                <span className="text-neutral-300">{lead.company}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-neutral-500" />
              <a
                href={`mailto:${lead.email}`}
                className="text-blue-300 underline-offset-2 hover:underline"
              >
                {lead.email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-neutral-500" />
              <a href={`tel:${lead.phone}`} className="font-mono text-white">
                {lead.phone}
              </a>
            </div>
            {lead.company_vat && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-3.5 w-3.5 text-neutral-500" />
                <span className="font-mono text-neutral-400">{lead.company_vat}</span>
              </div>
            )}
          </div>
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">
              Projet
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Surface</span>
                <span className="font-medium text-white">
                  {(lead.surface_area ?? 0).toLocaleString("fr-BE")} m²
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Facture élec.</span>
                <span className="font-medium text-accent">
                  {(lead.annual_electricity_bill ?? 0).toLocaleString("fr-BE")} €/an
                </span>
              </div>
              {lead.grd && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">GRD</span>
                  <span className="font-medium text-neutral-300">{lead.grd}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   Credit Counter (animated)
   ═══════════════════════════════════════════════ */

function CreditCounter({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="text-2xl font-bold tabular-nums text-accent"
    >
      {value}
    </motion.span>
  )
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [leads, setLeads] = useState<MarketplaceLead[]>([])
  const [myLeads, setMyLeads] = useState<RevealedLead[]>([])
  const [revealed, setRevealed] = useState<Record<string, RevealedLead>>({})
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState("marketplace")

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/marketplace")
      if (!res.ok) throw new Error("Erreur de chargement")
      const data = await res.json()
      setPartner(data.partner)
      setLeads(data.leads)
    } catch {
      setError("Impossible de charger la marketplace.")
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

  async function handlePurchase(leadId: string) {
    setPurchasing(leadId)
    setError(null)
    try {
      const res = await fetch("/api/partners/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? "Échec de l'achat.")
        setPurchasing(null)
        return
      }
      if (data.lead) {
        setRevealed((prev) => ({ ...prev, [leadId]: data.lead }))
      }
      setPartner((prev) =>
        prev ? { ...prev, credits: data.creditsRemaining } : prev
      )
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, alreadyPurchased: true } : l
        )
      )
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
      <div className="flex min-h-screen items-center justify-center bg-[#001D3D]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-neutral-500">Chargement de la marketplace…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#001D3D]">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-20 h-[600px] w-[600px] rounded-full bg-accent/[0.03] blur-[150px]" />
        <div className="absolute -right-32 bottom-10 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#001D3D]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Brand + Company */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="hidden sm:block shrink-0">
              <div className="relative h-7 w-28">
                <Image
                  src="/logo.png"
                  alt="Aegis Solaire"
                  fill
                  className="object-contain brightness-0 invert opacity-70"
                />
              </div>
            </Link>
            <div className="hidden sm:block h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/25">
                <Building2 className="h-4.5 w-4.5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {partner?.companyName ?? "—"}
                </p>
                <p className="text-[11px] text-neutral-500">Portail Installateur</p>
              </div>
            </div>
          </div>

          {/* Right: Credits + Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <GlassCard className="flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2">
              <Zap className="h-4 w-4 text-accent drop-shadow-[0_0_4px_rgba(255,184,0,0.5)]" />
              <div>
                <p className="hidden sm:block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  Crédits
                </p>
                <CreditCounter value={partner?.credits ?? 0} />
              </div>
            </GlassCard>

            <Link href="/partenaires/dashboard/credits">
              <Button className="h-9 gap-2 rounded-xl border border-accent/20 bg-accent/10 px-3 text-sm font-semibold text-accent transition-all hover:bg-accent/20 sm:px-4">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Recharger</span>
              </Button>
            </Link>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-neutral-500 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.08] hover:text-white"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-3 py-1 shadow-[0_0_10px_rgba(255,184,0,0.08)] backdrop-blur-md">
                <Zap className="h-3 w-3 text-accent drop-shadow-[0_0_4px_rgba(255,184,0,0.6)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                  Temps réel
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Marketplace{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#FFE066]">
                  Leads Solaires
                </span>
              </h1>
              <p className="mt-1.5 text-sm text-neutral-400">
                Leads qualifiés · Wallonie · Déblocage instantané
              </p>
            </motion.div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLoading(true)
                  fetchMarketplace()
                }}
                className="gap-1.5 text-neutral-400 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualiser
              </Button>
              <TabsList className="h-10 border border-white/[0.08] bg-white/[0.04]">
                <TabsTrigger
                  value="marketplace"
                  className="px-4 text-xs data-[state=active]:bg-accent/15 data-[state=active]:text-accent"
                >
                  Marketplace
                </TabsTrigger>
                <TabsTrigger
                  value="purchased"
                  className="px-4 text-xs data-[state=active]:bg-accent/15 data-[state=active]:text-accent"
                >
                  Mes Leads
                  {myLeads.length > 0 && (
                    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                      {myLeads.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="mt-0">
            {leads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="px-8 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 ring-1 ring-accent/20">
                    <Zap className="h-7 w-7 text-accent/60" />
                  </div>
                  <p className="text-base font-semibold text-white">Aucun lead disponible</p>
                  <p className="mt-1.5 text-sm text-neutral-500">
                    De nouveaux leads arrivent régulièrement. Revenez bientôt.
                  </p>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {leads.map((lead, i) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      index={i}
                      onPurchase={handlePurchase}
                      purchasing={purchasing}
                      revealedLead={revealed[lead.id] ?? null}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Purchased Leads Tab */}
          <TabsContent value="purchased" className="mt-0">
            {myLeads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="px-8 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
                    <Lock className="h-7 w-7 text-neutral-600" />
                  </div>
                  <p className="text-base font-semibold text-white">
                    Aucun lead débloqué
                  </p>
                  <p className="mt-1.5 text-sm text-neutral-500">
                    Débloquez votre premier lead depuis la marketplace.
                  </p>
                  <Button
                    onClick={() => setTab("marketplace")}
                    className="mt-6 gap-2 rounded-xl bg-accent/10 px-6 text-sm font-semibold text-accent transition-all hover:bg-accent/20"
                  >
                    Voir la marketplace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </GlassCard>
              </motion.div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {myLeads.map((lead, i) => (
                  <PurchasedLeadCard key={lead.id ?? i} lead={lead} index={i} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
