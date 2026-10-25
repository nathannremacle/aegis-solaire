"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  ShieldCheck,
  Lock,
  Unlock,
  Info,
  Phone,
  Mail,
  Building2,
  Calendar,
  Zap,
  CheckCircle2,
  LayoutGrid,
  Table as TableIcon,
  X,
  FileCheck2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type DemoLead = {
  id: string
  segment: "B2B" | "B2C"
  city: string
  postalCode: string
  maskedPostalCode: string
  province: string
  grd: string
  surfaceArea: number
  roofMaterial: string
  powerKwc: number
  annualBill: number
  ownershipStatus: string
  timeframe: string
  projectDriver: string
  message: string
  estimatedContractValueRange: { min: number; max: number }
  estimatedInstallerMargin: number
  creditCost: number
  leadCostEuros: number
  maxSlots: number
  takenSlots: number
  remainingSlots: number
  timeAgo: string
  contact: {
    name: string
    company?: string
    vat?: string
    phone: string
    email: string
    street: string
    cityWithPostal: string
    notes: string
  }
}

const DEMO_LEADS: DemoLead[] = [
  {
    id: "demo-b2b-1",
    segment: "B2B",
    city: "Herstal",
    postalCode: "4040",
    maskedPostalCode: "40XX",
    province: "Liège (Hauts-Sarts)",
    grd: "RESA",
    surfaceArea: 2400,
    roofMaterial: "Bac acier / Sandwich",
    powerKwc: 408,
    annualBill: 46000,
    ownershipStatus: "Dirigeant propriétaire du bâtiment",
    timeframe: "Moins de 3 mois",
    projectDriver: "Réduction facture & Protection tarif injection",
    message: "Audit toiture 2024 ok. Souhaite une offre pour toiture industrielle avec injection réseau et autoconsommation maximale.",
    estimatedContractValueRange: { min: 285000, max: 345000 },
    estimatedInstallerMargin: 48500,
    creditCost: 8,
    leadCostEuros: 120,
    maxSlots: 1,
    takenSlots: 0,
    remainingSlots: 1,
    timeAgo: "Il y a 14 min",
    contact: {
      name: "Marc Vandamme",
      company: "Vandamme Logistique SA",
      vat: "BE 0442.819.301",
      phone: "+32 4 220 48 10",
      email: "m.vandamme@vandamme-log.be",
      street: "Rue de Hermée 185",
      cityWithPostal: "4040 Herstal (Parc Industriel des Hauts-Sarts)",
      notes: "Audit structurel toiture validé. Décideur unique joignable directement par téléphone. Compteur moyenne tension déjà équipé.",
    },
  },
  {
    id: "demo-b2c-1",
    segment: "B2C",
    city: "Wavre",
    postalCode: "1300",
    maskedPostalCode: "13XX",
    province: "Brabant Wallon",
    grd: "ORES",
    surfaceArea: 140,
    roofMaterial: "Tuiles plates",
    powerKwc: 24,
    annualBill: 3400,
    ownershipStatus: "Propriétaire occupant",
    timeframe: "1 à 3 mois",
    projectDriver: "Neutralité carbone & Borne VE à domicile",
    message: "Maison 4 façades bien orientée Sud-Sud-Est. Compteur bidirectionnel déjà installé. Souhaite ajouter une batterie domestique 10 kWh.",
    estimatedContractValueRange: { min: 14500, max: 19800 },
    estimatedInstallerMargin: 3800,
    creditCost: 2,
    leadCostEuros: 30,
    maxSlots: 3,
    takenSlots: 1,
    remainingSlots: 2,
    timeAgo: "Il y a 32 min",
    contact: {
      name: "Sophie Lambert",
      phone: "+32 478 52 19 44",
      email: "sophie.lambert@skynet.be",
      street: "Avenue Reine Astrid 42",
      cityWithPostal: "1300 Wavre",
      notes: "Numéro de téléphone vérifié par appel manuel Aegis Solaire. Projet mature, budget alloué, attend 2 devis comparatifs maximum.",
    },
  },
  {
    id: "demo-b2b-2",
    segment: "B2B",
    city: "Gosselies",
    postalCode: "6041",
    maskedPostalCode: "60XX",
    province: "Hainaut (Aéropole)",
    grd: "ORES",
    surfaceArea: 1600,
    roofMaterial: "Toiture terrasse / Étanchéité",
    powerKwc: 272,
    annualBill: 32000,
    ownershipStatus: "Gérant exploitant",
    timeframe: "Immédiat (compteur placé)",
    projectDriver: "Autoconsommation flotte de véhicules utilitaires",
    message: "Parking 80 places et toiture de bureaux. Projet d'ombrières avec 4 bornes de recharge rapide DC.",
    estimatedContractValueRange: { min: 195000, max: 240000 },
    estimatedInstallerMargin: 34000,
    creditCost: 8,
    leadCostEuros: 120,
    maxSlots: 1,
    takenSlots: 0,
    remainingSlots: 1,
    timeAgo: "Il y a 1 h",
    contact: {
      name: "Didier Renard",
      company: "AeroTech Park SCRL",
      vat: "BE 0812.903.441",
      phone: "+32 71 89 20 15",
      email: "direction@aerotech-park.be",
      street: "Avenue Jean Mermoz 24",
      cityWithPostal: "6041 Gosselies (Charleroi Aéropole)",
      notes: "Projet validé au conseil d'administration. Recherche un installateur RESCERT avec références tertiaires en Wallonie.",
    },
  },
  {
    id: "demo-b2c-2",
    segment: "B2C",
    city: "Namur",
    postalCode: "5100",
    maskedPostalCode: "51XX",
    province: "Namur (Naninne)",
    grd: "ORES",
    surfaceArea: 95,
    roofMaterial: "Ardoises naturelles",
    powerKwc: 14,
    annualBill: 2600,
    ownershipStatus: "Propriétaire occupant",
    timeframe: "Moins de 3 mois",
    projectDriver: "Réduction facture après fin compensation",
    message: "Pente de toit à 40 degrés, aucune ombre portée. Facture annuelle de 2600 € souhaitant être réduite au maximum.",
    estimatedContractValueRange: { min: 9800, max: 13200 },
    estimatedInstallerMargin: 2700,
    creditCost: 2,
    leadCostEuros: 30,
    maxSlots: 3,
    takenSlots: 0,
    remainingSlots: 3,
    timeAgo: "Il y a 2 h",
    contact: {
      name: "Benoît Dumont",
      phone: "+32 495 18 33 09",
      email: "b.dumont.namur@gmail.com",
      street: "Rue des Chasseurs Ardennais 12",
      cityWithPostal: "5100 Naninne (Namur)",
      notes: "Facture d'électricité et photos de toiture téléversées lors de la qualification. Téléphone vérifié.",
    },
  },
]

export function MarketplaceLivePreview() {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [unlockedIds, setUnlockedIds] = useState<Record<string, boolean>>({ "demo-b2b-1": true })
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<DemoLead | null>(null)

  const filtered = DEMO_LEADS.filter((l) => (activeFilter === "ALL" ? true : l.segment === activeFilter))

  const toggleUnlock = (id: string) => {
    setUnlockedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)]">
      {/* ── Header du flux marketplace ── */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              Flux Live Démonstration · Wallonie
            </span>
          </div>
          <h3 className="mt-1 font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Aperçu interactif de la marketplace Aegis Solaire
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Affichage identique à celui de votre espace installateur réel. Cliquez sur <strong className="text-foreground">« Fiche »</strong> pour inspecter le dossier ou sur <strong className="text-foreground">« Débloquer »</strong> pour simuler l'accès immédiat aux coordonnées complètes.
          </p>
        </div>

        {/* Contrôles : Filtres de segments & Toggle Grid/Table */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filtres de segment */}
          <div className="inline-flex items-center rounded-lg border border-border bg-secondary/50 p-1">
            {(["ALL", "B2B", "B2C"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-md px-3 py-1 font-mono text-xs transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? "bg-card text-foreground font-bold shadow-2xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
              >
                {filter === "ALL" ? "Tous les dossiers" : filter === "B2B" ? "B2B (Exclusif)" : "B2C (Max 3)"}
              </button>
            ))}
          </div>

          {/* Switch Grid / Table */}
          <div className="inline-flex items-center rounded-lg border border-border bg-secondary/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue Grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue Tableau"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mode Grille : Cartes identiques à MarketplaceFeedView ── */}
      {viewMode === "grid" ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => {
            const isUnlocked = !!unlockedIds[lead.id]
            const isB2B = lead.segment === "B2B"
            const postalCodeDisplay = isUnlocked ? lead.postalCode : lead.maskedPostalCode

            return (
              <div
                key={lead.id}
                className={`flex flex-col justify-between rounded-2xl border bg-card p-5 transition-all ${
                  isUnlocked
                    ? "border-primary ring-2 ring-primary/20 shadow-sm"
                    : "border-border shadow-xs hover:border-border hover:shadow-sm"
                }`}
              >
                <div>
                  {/* Badge Exclusivité / Scarcity & Localisation */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                        isB2B
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground border border-border"
                      }`}
                    >
                      {isB2B ? "B2B • Exclusif 100%" : `B2C • ${lead.remainingSlots} place(s) sur ${lead.maxSlots}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <MapPin className="h-3 w-3 text-accent shrink-0" />
                      <span>{lead.city} ({postalCodeDisplay})</span>
                    </span>
                  </div>

                  {/* Titre Projet & Puissance estimée (Clic pour ouvrir la fiche) */}
                  <div
                    onClick={() => setSelectedLeadForModal(lead)}
                    className="mt-3.5 flex items-baseline justify-between border-b border-border pb-3 cursor-pointer group"
                    title="Cliquer pour afficher la fiche détaillée"
                  >
                    <div>
                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        Installation Solaire à {lead.city}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Région : {lead.province} · GRD {lead.grd}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-foreground tabular-nums">
                        {lead.powerKwc} kWc
                      </span>
                    </div>
                  </div>

                  {/* Badges de réassurance technique */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground border border-border">
                      <ShieldCheck className="h-3 w-3 text-primary shrink-0" /> Téléphone OK
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground border border-border">
                      <ShieldCheck className="h-3 w-3 text-primary shrink-0" /> Propriétaire
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground border border-border">
                      <ShieldCheck className="h-3 w-3 text-primary shrink-0" /> Toiture OK
                    </span>
                  </div>

                  {/* Scarcity Slots B2C */}
                  {!isB2B && (
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {Array.from({ length: lead.maxSlots }).map((_, idx) => {
                        const isTaken = idx < lead.takenSlots
                        return (
                          <div
                            key={idx}
                            className={`rounded px-1.5 py-1 text-center font-mono text-[10px] font-bold ${
                              isTaken
                                ? "bg-secondary text-muted-foreground border border-border line-through"
                                : "bg-card text-foreground border border-dashed border-accent"
                            }`}
                          >
                            {isTaken ? `● Place ${idx + 1}` : `○ Place ${idx + 1}`}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Grille des caractéristiques techniques complètes */}
                  <div
                    onClick={() => setSelectedLeadForModal(lead)}
                    className="mt-4 space-y-2 text-xs cursor-pointer group"
                    title="Cliquer pour afficher la fiche détaillée"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Surface & Toiture</span>
                      <span className="font-semibold text-foreground text-right">
                        <span className="font-mono tabular-nums">{lead.surfaceArea.toLocaleString("fr-BE")} m²</span>
                        {" • "}
                        <span>{lead.roofMaterial}</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Facture d'électricité</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {lead.annualBill.toLocaleString("fr-BE")} € HT/an
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Décisionnaire</span>
                      <span className="font-medium text-foreground text-right truncate max-w-[55%]">
                        {lead.ownershipStatus}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Échéance souhaitée</span>
                      <span className="font-medium text-foreground text-right">
                        {lead.timeframe}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Objectif clé</span>
                      <span className="font-medium text-foreground text-right truncate max-w-[55%]">
                        {lead.projectDriver}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Message prospect */}
                  {lead.message && (
                    <div className="mt-3 rounded-lg bg-secondary/50 border border-border p-2.5 text-[11px] italic text-muted-foreground line-clamp-2">
                      « {lead.message} »
                    </div>
                  )}

                  {/* Estimations Économiques Installateur */}
                  <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Devis estimé</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {lead.estimatedContractValueRange.min.toLocaleString("fr-BE")} € à {lead.estimatedContractValueRange.max.toLocaleString("fr-BE")} €
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Marge brute indicative</span>
                      <span className="font-mono font-bold text-accent tabular-nums">
                        ~{lead.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT
                      </span>
                    </div>
                  </div>

                  {/* Coordonnées débloquées en direct */}
                  <AnimatePresence>
                    {isUnlocked && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 overflow-hidden rounded-xl border border-primary/30 bg-primary/[0.03] p-3 text-xs"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-border/80">
                          <span className="font-mono text-[11px] uppercase tracking-wider font-bold text-primary flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                            Dossier Débloqué
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">ID #{lead.id.toUpperCase()}</span>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{lead.contact.name}</span>
                            {lead.contact.company && (
                              <span className="font-normal text-muted-foreground text-[11px]">
                                ({lead.contact.company})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-foreground font-mono tabular-nums">
                            <Phone className="h-3 w-3 text-primary shrink-0" />
                            <a href={`tel:${lead.contact.phone}`} className="hover:underline text-primary font-bold">
                              {lead.contact.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-foreground font-mono text-[11px]">
                            <Mail className="h-3 w-3 text-primary shrink-0" />
                            <a href={`mailto:${lead.contact.email}`} className="hover:underline">
                              {lead.contact.email}
                            </a>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-sans">
                            📍 {lead.contact.street}, {lead.contact.cityWithPostal}
                          </div>
                          {lead.contact.vat && (
                            <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                              Numéro TVA : {lead.contact.vat}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Carte : Coût en crédits & Déblocage / Fiche */}
                <div className="mt-5 border-t border-border pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-baseline justify-between sm:justify-start gap-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Tarif acquisition</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-xl font-black text-foreground tabular-nums">{lead.creditCost}</span>
                        <span className="text-xs font-semibold text-muted-foreground">crédits</span>
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums ml-1">
                          (~{lead.leadCostEuros.toFixed(2)} € HT)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLeadForModal(lead)}
                      className="h-10 sm:h-9 px-3 text-xs font-medium cursor-pointer justify-center"
                      title="Voir tous les détails du projet"
                    >
                      <Info className="h-3.5 w-3.5 mr-1" />
                      Fiche
                    </Button>

                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => toggleUnlock(lead.id)}
                      className={`h-10 sm:h-9 px-4 text-xs font-bold cursor-pointer justify-center ${
                        isUnlocked
                          ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <Unlock className="h-3.5 w-3.5 mr-1 text-accent" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 mr-1 text-accent" />
                          <span>Débloquer</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Mode Table : Identique à MarketplaceFeedView ── */
        <div className="mt-6 space-y-1.5">
          <div className="block sm:hidden text-center text-[11px] font-mono text-muted-foreground py-0.5">
            ↔ Glisser horizontalement pour voir toutes les colonnes
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs overscroll-x-contain">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-border bg-secondary/50 text-[11px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Localisation & CP</th>
                  <th className="px-4 py-3">Puissance & Toiture</th>
                  <th className="px-4 py-3">Facture & Marge Est.</th>
                  <th className="px-4 py-3">Disponibilité</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lead) => {
                  const isB2B = lead.segment === "B2B"
                  const isUnlocked = !!unlockedIds[lead.id]
                  const postalCodeDisplay = isUnlocked ? lead.postalCode : lead.maskedPostalCode

                  return (
                    <tr key={lead.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                            isB2B ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"
                          }`}
                        >
                          {lead.segment}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        {lead.city} ({postalCodeDisplay})
                        <div className="text-[11px] text-muted-foreground">{lead.province}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="font-mono font-bold tabular-nums">{lead.powerKwc} kWc</div>
                        <div className="text-[11px] text-muted-foreground">
                          {lead.surfaceArea.toLocaleString("fr-BE")} m² · {lead.roofMaterial}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="font-mono font-semibold tabular-nums">
                          {lead.annualBill.toLocaleString("fr-BE")} €/an
                        </div>
                        <div className="font-mono text-[11px] text-accent tabular-nums">
                          Marge ~{lead.estimatedInstallerMargin.toLocaleString("fr-BE")} €
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {isB2B ? "Exclusif (1 max)" : `${lead.remainingSlots} place(s)`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLeadForModal(lead)}
                            className="h-8 px-2.5 text-xs"
                          >
                            Détails
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => toggleUnlock(lead.id)}
                            className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {isUnlocked ? "Visible" : `Débloquer (${lead.creditCost} cr)`}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer réassurance ── */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between text-xs">
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

      {/* ── Modale Fiche Technique Détaillée Démo ── */}
      {selectedLeadForModal && (
        <DemoLeadDetailModal
          lead={selectedLeadForModal}
          isUnlocked={!!unlockedIds[selectedLeadForModal.id]}
          onToggleUnlock={() => toggleUnlock(selectedLeadForModal.id)}
          onClose={() => setSelectedLeadForModal(null)}
        />
      )}
    </div>
  )
}

function DemoLeadDetailModal({
  lead,
  isUnlocked,
  onToggleUnlock,
  onClose,
}: {
  lead: DemoLead
  isUnlocked: boolean
  onToggleUnlock: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const isB2B = lead.segment === "B2B"
  const postalCodeDisplay = isUnlocked ? lead.postalCode : lead.maskedPostalCode

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header modale */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                  isB2B
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground border border-border"
                }`}
              >
                {isB2B ? "B2B • Exclusif 100%" : `B2C • ${lead.remainingSlots} place(s) disponible(s)`}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {lead.timeAgo}
              </span>
            </div>
            <h3 id="modal-preview-title" className="mt-2 text-xl font-bold text-foreground">
              Dossier Technique · Installation à {lead.city}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-accent" />
              <span>{lead.province} · {lead.city} ({postalCodeDisplay}) · GRD {lead.grd}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Coordonnées : Débloquées vs Verrouillées */}
        <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-foreground flex items-center gap-1.5">
              {isUnlocked ? (
                <>
                  <Unlock className="h-4 w-4 text-accent" />
                  Coordonnées Validées du Contact
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Coordonnées Réservées aux Installateurs Agréés
                </>
              )}
            </span>
            <Button
              size="sm"
              variant={isUnlocked ? "outline" : "default"}
              onClick={onToggleUnlock}
              className="h-8 px-3 text-xs font-bold"
            >
              {isUnlocked ? "Masquer la simulation" : `Simuler le déblocage (${lead.creditCost} cr)`}
            </Button>
          </div>

          {isUnlocked ? (
            <div className="space-y-2 text-xs bg-card rounded-lg border border-border p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contact :</span>
                <span className="font-bold text-foreground">
                  {lead.contact.name} {lead.contact.company && `(${lead.contact.company})`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Téléphone certifié :</span>
                <a href={`tel:${lead.contact.phone}`} className="font-mono font-bold text-primary hover:underline">
                  {lead.contact.phone}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Adresse e-mail :</span>
                <a href={`mailto:${lead.contact.email}`} className="font-mono text-foreground hover:underline">
                  {lead.contact.email}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Adresse d'installation :</span>
                <span className="font-medium text-foreground text-right">
                  {lead.contact.street}, {lead.contact.cityWithPostal}
                </span>
              </div>
              {lead.contact.vat && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Numéro de TVA belge :</span>
                  <span className="font-mono tabular-nums text-foreground">{lead.contact.vat}</span>
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground italic">
                « Note d'audit Aegis : {lead.contact.notes} »
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs">
              <p className="text-muted-foreground">
                Nom, numéro de téléphone direct, e-mail et adresse exacte masqués dans le flux public.
              </p>
              <p className="mt-1 font-mono text-[11px] text-accent font-semibold">
                Dossier audité et téléphone vérifié manuellement par nos équipes avant publication.
              </p>
            </div>
          )}
        </div>

        {/* Détails techniques & Cadastre */}
        <div className="mt-5 space-y-4">
          <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-muted-foreground">
            Spécifications Techniques Validées
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-muted-foreground block text-[11px]">Puissance cible</span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {lead.powerKwc} kWc
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-muted-foreground block text-[11px]">Surface toiture</span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {lead.surfaceArea.toLocaleString("fr-BE")} m²
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-muted-foreground block text-[11px]">Revêtement</span>
              <span className="font-semibold text-foreground truncate block">
                {lead.roofMaterial}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-muted-foreground block text-[11px]">Facture d'électricité</span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {lead.annualBill.toLocaleString("fr-BE")} €/an
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-muted-foreground block text-[11px]">Échéance projet</span>
              <span className="font-semibold text-foreground truncate block">
                {lead.timeframe}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <span className="text-muted-foreground block text-[11px]">Décisionnaire</span>
              <span className="font-semibold text-foreground truncate block">
                {lead.ownershipStatus}
              </span>
            </div>
          </div>

          {/* Synthèse économique */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Valeur estimée du marché</span>
              <span className="font-mono font-bold text-foreground tabular-nums">
                {lead.estimatedContractValueRange.min.toLocaleString("fr-BE")} € à {lead.estimatedContractValueRange.max.toLocaleString("fr-BE")} €
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Marge brute indicative installateur</span>
              <span className="font-mono font-bold text-accent tabular-nums">
                ~{lead.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT
              </span>
            </div>
          </div>
        </div>

        {/* Bouton de clôture */}
        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fermer la fiche
          </Button>
        </div>
      </div>
    </div>
  )
}
