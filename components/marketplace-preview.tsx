"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Crown,
  Users,
  Clock,
  Lock,
  Unlock,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
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
    timeAgo: "Il y a 1 h",
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
    <div className="rounded-md border border-border bg-card p-5 sm:p-7 shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)]">
      {/* Header simulateur */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-medium">
              Flux Live Démonstration · Wallonie
            </span>
          </div>
          <h3 className="mt-1 font-heading text-lg sm:text-xl font-semibold tracking-tight text-foreground">
            Aperçu interactif de votre futur espace installateur
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Cliquez sur <strong className="text-foreground">« Simuler le déblocage »</strong> pour observer le niveau de détail des dossiers qualifiés.
          </p>
        </div>

        {/* Filtres de démonstration */}
        <div className="inline-flex items-center rounded-md border border-border bg-secondary/50 p-1 self-start sm:self-auto shrink-0">
          {(["ALL", "B2B", "B2C"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-sm px-3 py-1 font-mono text-xs transition-colors ${
                activeFilter === filter
                  ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              {filter === "ALL" ? "Tous les dossiers" : filter === "B2B" ? "B2B (Exclusif)" : "B2C (Max 3)"}
            </button>
          ))}
        </div>
      </div>

      {/* Grille de leads démo */}
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lead) => {
          const isUnlocked = !!unlockedIds[lead.id]
          const isB2C = lead.segment === "B2C"

          return (
            <div
              key={lead.id}
              className={`flex flex-col justify-between rounded-md border transition-all bg-card ${
                isUnlocked
                  ? "border-primary ring-1 ring-primary/20 shadow-xs"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Carte Top */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isB2C ? (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-secondary border border-border px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        B2C Résidentiel
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-primary/[0.06] border border-primary/20 px-2 py-0.5 font-mono text-[11px] font-medium text-primary">
                        <Crown className="h-3 w-3 text-accent" />
                        B2B Exclusif (1:1)
                      </span>
                    )}
                    <span className="rounded-sm bg-secondary/80 border border-border/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {lead.province}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {lead.timeAgo}
                  </span>
                </div>

                <h4 className="mt-3 font-heading font-semibold text-sm sm:text-base text-foreground line-clamp-1">
                  {lead.title}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground font-sans">
                  Gestionnaire réseau : <strong className="font-mono text-foreground font-medium">{lead.grd}</strong>
                </p>
              </div>

              {/* 3 Métriques clés */}
              <div className="mx-5 my-2 grid grid-cols-3 divide-x divide-border rounded-sm border border-border bg-secondary/30 p-2 text-center">
                <div className="px-1">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Surface</span>
                  <p className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                    {lead.surfaceArea.toLocaleString("fr-BE")} m²
                  </p>
                </div>
                <div className="px-1">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Puissance</span>
                  <p className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-accent">
                    {lead.powerKwc} kWc
                  </p>
                </div>
                <div className="px-1">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Économies</span>
                  <p className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-primary">
                    {lead.annualSavings.toLocaleString("fr-BE")} €/an
                  </p>
                </div>
              </div>

              {/* Concurrence Bar */}
              <div className="px-5 py-2">
                {isB2C ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-sm ${
                            i < lead.slotsTaken ? "bg-accent" : "bg-primary"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      <strong className="text-foreground">{lead.slotsMax - lead.slotsTaken}</strong> place(s) disponible(s) sur <strong className="text-foreground">{lead.slotsMax}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Attribution :</span>
                    <span className="rounded-sm bg-primary/[0.06] border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                      Exclusif 1 seul acheteur (0/1)
                    </span>
                  </div>
                )}
              </div>

              {/* Bouton d'action toggle */}
              <div className="mt-auto border-t border-border p-4 pt-3">
                <button
                  type="button"
                  onClick={() => toggleUnlock(lead.id)}
                  className={`flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-xs font-mono font-medium transition-colors ${
                    isUnlocked
                      ? "border border-border bg-secondary text-foreground hover:bg-secondary/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-accent" />
                      <span>Coordonnées visibles (Replier)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-accent" />
                      <span>Simuler le déblocage · <span className="font-mono tabular-nums">{lead.creditCost}</span> crédits</span>
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
                    className="overflow-hidden border-t border-border bg-secondary/30 p-4 text-xs"
                  >
                    <div className="flex flex-col gap-2 rounded-sm border border-border bg-card p-3 shadow-2xs">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span>{lead.contact.name}</span>
                        {lead.contact.company && (
                          <span className="font-normal text-muted-foreground">({lead.contact.company})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-mono tabular-nums">
                        <Phone className="h-3 w-3 text-primary shrink-0" />
                        <span>{lead.contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-mono">
                        <Mail className="h-3 w-3 text-primary shrink-0" />
                        <span>{lead.contact.email}</span>
                      </div>
                      {lead.contact.vat && (
                        <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          TVA : {lead.contact.vat}
                        </div>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground italic border-t border-border pt-2 leading-relaxed">
                        « {lead.contact.notes} »
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer réassurance */}
      <div className="mt-6 flex flex-col gap-3 rounded-md border border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between text-xs">
        <div className="flex items-center gap-2.5 text-foreground font-sans">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            Les coordonnées complètes ne sont révélées qu'après contrôle de la certification RESCERT en Wallonie.
          </span>
        </div>
        <a href="#activer" className="shrink-0">
          <span className="font-mono text-xs font-semibold text-primary hover:underline">
            Activer mon accès installateur →
          </span>
        </a>
      </div>
    </div>
  )
}
