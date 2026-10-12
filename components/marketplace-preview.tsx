"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Crown,
  Users,
  MapPin,
  Clock,
  Zap,
  Lock,
  Unlock,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Layers,
} from "lucide-react"

type DemoLead = {
  id: string
  segment: "B2B" | "B2C"
  title: string
  province: string
  grd: string
  surfaceArea: number
  powerKwc: number
  annualSavings: number
  annualBill: number
  creditCost: number
  timeAgo: string
  slotsTaken: number
  slotsMax: number
  contact: {
    name: string
    company?: string
    vat?: string
    phone: string
    email: string
    notes: string
  }
}

const DEMO_LEADS: DemoLead[] = [
  {
    id: "demo-b2b-1",
    segment: "B2B",
    title: "Toiture Industrielle · Hall Logistique",
    province: "Liège (Hauts-Sarts)",
    grd: "RESA",
    surfaceArea: 2400,
    powerKwc: 408,
    annualSavings: 18500,
    annualBill: 46000,
    creditCost: 5,
    timeAgo: "Il y a 14 min",
    slotsTaken: 0,
    slotsMax: 1,
    contact: {
      name: "Marc Vandamme",
      company: "Vandamme Logistique SA",
      vat: "BE 0442.819.301",
      phone: "+32 4 220 48 10",
      email: "m.vandamme@vandamme-log.be",
      notes: "Audit toiture 2024 ok. Souhaite une offre avec tiers-investissement et autoconsommation maximale.",
    },
  },
  {
    id: "demo-b2c-1",
    segment: "B2C",
    title: "Maison 4 façades + Borne VE",
    province: "Brabant Wallon (Wavre)",
    grd: "ORES",
    surfaceArea: 140,
    powerKwc: 24,
    annualSavings: 1850,
    annualBill: 3400,
    creditCost: 2,
    timeAgo: "Il y a 32 min",
    slotsTaken: 1,
    slotsMax: 3,
    contact: {
      name: "Sophie Lambert",
      phone: "+32 478 52 19 44",
      email: "sophie.lambert@skynet.be",
      notes: "Compteur bidirectionnel déjà installé. Demande d'installation au printemps avec batterie 10 kWh.",
    },
  },
  {
    id: "demo-b2b-2",
    segment: "B2B",
    title: "Ombrière de Parking · Retail & Bureaux",
    province: "Hainaut (Charleroi Aéropole)",
    grd: "ORES",
    surfaceArea: 1600,
    powerKwc: 272,
    annualSavings: 12800,
    annualBill: 32000,
    creditCost: 5,
    timeAgo: "Il y a 1h",
    slotsTaken: 0,
    slotsMax: 1,
    contact: {
      name: "Didier Renard",
      company: "AeroTech Park SCRL",
      vat: "BE 0812.903.441",
      phone: "+32 71 89 20 15",
      email: "direction@aerotech-park.be",
      notes: "Parking 80 places. Projet d'ombrières avec 4 bornes de recharge rapide DC.",
    },
  },
]

export function MarketplaceLivePreview() {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [unlockedIds, setUnlockedIds] = useState<Record<string, boolean>>({ "demo-b2b-1": true })

  const filtered = DEMO_LEADS.filter((l) => (activeFilter === "ALL" ? true : l.segment === activeFilter))

  const toggleUnlock = (id: string) => {
    setUnlockedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 lg:p-10">
      {/* Header simulateur */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Live Feed Démonstration · Wallonie
            </span>
          </div>
          <h3 className="mt-1 text-xl font-extrabold text-[#001D3D] sm:text-2xl">
            Aperçu interactif de votre futur espace installateur
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Cliquez sur <strong>« Simuler le déblocage »</strong> pour découvrir la granularité des données fournies.
          </p>
        </div>

        {/* Filtres de démonstration */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0">
          {(["ALL", "B2B", "B2C"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                activeFilter === filter
                  ? "bg-[#001D3D] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {filter === "ALL" ? "Tous" : filter === "B2B" ? "B2B (Exclusif)" : "B2C (3 max)"}
            </button>
          ))}
        </div>
      </div>

      {/* Grille de leads démo */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lead) => {
          const isUnlocked = !!unlockedIds[lead.id]
          const isB2C = lead.segment === "B2C"

          return (
            <div
              key={lead.id}
              className={`flex flex-col rounded-2xl border transition-all duration-200 bg-white ${
                isUnlocked
                  ? "border-emerald-300 shadow-md ring-1 ring-emerald-200"
                  : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {/* Carte Top */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
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
                      {lead.province}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    {lead.timeAgo}
                  </span>
                </div>

                <h4 className="mt-3 text-sm font-bold text-slate-900 line-clamp-1">{lead.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Réseau : <strong className="text-slate-700">{lead.grd}</strong>
                </p>
              </div>

              {/* 3 Métriques clés */}
              <div className="mx-5 my-2 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Surface</span>
                  <p className="font-sans text-xs sm:text-sm font-bold tabular-nums text-slate-900">
                    {lead.surfaceArea.toLocaleString("fr-BE")} m²
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Puissance</span>
                  <p className="font-sans text-xs sm:text-sm font-extrabold tabular-nums text-amber-600">
                    {lead.powerKwc} kWc
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Économies</span>
                  <p className="font-sans text-xs sm:text-sm font-bold tabular-nums text-[#001D3D]">
                    {lead.annualSavings.toLocaleString("fr-BE")} €/an
                  </p>
                </div>
              </div>

              {/* Concurrence Bar */}
              <div className="px-5 py-2">
                {isB2C ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-sm ${
                            i < lead.slotsTaken ? "bg-amber-500" : "bg-emerald-400"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      <strong>{lead.slotsMax - lead.slotsTaken} places disponibles</strong> sur 3
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Attribution :</span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 font-bold uppercase text-[10px] text-blue-700 border border-blue-200/80">
                      Exclusif 1 seul acheteur (0/1)
                    </span>
                  </div>
                )}
              </div>

              {/* Bouton d'action toggle */}
              <div className="mt-auto border-t border-slate-100 p-4 pt-3">
                <button
                  type="button"
                  onClick={() => toggleUnlock(lead.id)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    isUnlocked
                      ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "bg-[#001D3D] text-white hover:bg-[#002855] shadow-sm"
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Coordonnées visibles (Cliquer pour masquer)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Simuler le déblocage · {lead.creditCost} crédits</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dossier déroulé */}
              <AnimatePresence>
                {isUnlocked && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-slate-100 bg-slate-50/80 p-4 text-xs"
                  >
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span>{lead.contact.name}</span>
                        {lead.contact.company && (
                          <span className="font-normal text-slate-600">({lead.contact.company})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        <span className="font-mono">{lead.contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-600">
                        <Mail className="h-3 w-3 text-blue-500" />
                        <span>{lead.contact.email}</span>
                      </div>
                      {lead.contact.vat && (
                        <div className="text-[11px] font-mono text-slate-500">
                          TVA : {lead.contact.vat}
                        </div>
                      )}
                      <p className="mt-2 text-[11px] text-slate-600 italic border-t border-slate-100 pt-2">
                        "{lead.contact.notes}"
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer incitatif */}
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 text-slate-800 font-medium">
          <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
          <span>
            Les coordonnées complètes ne sont révélées qu'aux installateurs après contrôle de leur agrément RESCERT.
          </span>
        </div>
        <a href="#candidature" className="shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#001D3D] px-4 py-2 font-bold text-white shadow-sm hover:bg-[#002855] transition-all"
          >
            Rejoindre le réseau
            <ArrowRight className="h-4 w-4" />
          </button>
        </a>
      </div>
    </div>
  )
}
