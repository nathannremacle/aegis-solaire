"use client"

import * as React from "react"
import { useState } from "react"
import {
  Bell,
  BellOff,
  Check,
  Layers,
  MailCheck,
  MapPin,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const PROVINCES = [
  { id: "liege", label: "Liège", cp: "4000 – 4999" },
  { id: "hainaut", label: "Hainaut", cp: "6000 – 7999" },
  { id: "namur", label: "Namur", cp: "5000 – 5680" },
  { id: "brabant_wallon", label: "Brabant Wallon", cp: "1300 – 1499" },
  { id: "luxembourg", label: "Luxembourg", cp: "6600 – 6999" },
] as const

const FREQUENCIES = [
  {
    id: "new_only",
    label: "Nouveaux chantiers uniquement",
    badge: "0 relance",
    desc: "1 seul e-mail à la publication dans votre secteur. Aucun rappel.",
    icon: MailCheck,
  },
  {
    id: "all",
    label: "Toutes les alertes",
    badge: "Flux complet",
    desc: "Nouveaux dossiers + alertes créneaux restants.",
    icon: Bell,
  },
  {
    id: "none",
    label: "Pause en 1 clic",
    badge: "0 e-mail",
    desc: "Consultation directe sur votre portail quand votre planning se libère.",
    icon: BellOff,
  },
] as const

export function AlertsAutopilotShowcase() {
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(["liege", "namur"])
  const [segment, setSegment] = useState<"B2B" | "B2C" | "BOTH">("BOTH")
  const [minKwc, setMinKwc] = useState<number>(4)
  const [frequency, setFrequency] = useState<"new_only" | "all" | "none">("new_only")
  const [autoPilot, setAutoPilot] = useState<boolean>(true)
  const [weeklyCap, setWeeklyCap] = useState<number>(5)
  const [autoExclusiveB2c, setAutoExclusiveB2c] = useState<boolean>(false)

  const toggleProvince = (id: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((p) => p !== id) : prev) : [...prev, id]
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Colonne Gauche : Configuration des alertes personnalisées */}
      <div className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent shrink-0">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent block">
                  Périmètre &amp; Filtrage Chirurgical
                </span>
                <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">
                  Vous ne recevez que les chantiers qui rentrent dans vos critères
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-secondary border border-border px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground tabular-nums">
              {selectedProvinces.length}/5 provinces
            </span>
          </div>

          {/* 1. Provinces wallonnes */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              <span>Provinces wallonnes ciblées</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {PROVINCES.map((prov) => {
                const active = selectedProvinces.includes(prov.id)
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => toggleProvince(prov.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                        : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{prov.label}</span>
                    <span className={`font-mono text-[10px] tabular-nums ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      ({prov.cp})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Segment & Puissance min */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-accent" />
                <span>Segments &amp; typologies</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "B2C" as const, label: "B2C" },
                  { id: "B2B" as const, label: "B2B" },
                  { id: "BOTH" as const, label: "B2B & B2C" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSegment(opt.id)}
                    className={`h-9 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      segment === opt.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Filtrable aussi par toiture, ombrière de parking ou installation au sol.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span>Seuil d&apos;envergure minimal</span>
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[4, 8, 20, 50].map((kwc) => (
                  <button
                    key={kwc}
                    type="button"
                    onClick={() => setMinKwc(kwc)}
                    className={`h-9 rounded-xl border font-mono text-xs font-bold tabular-nums transition-all cursor-pointer ${
                      minKwc === kwc
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    &ge; {kwc}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Filtre actif : projets dès <strong className="font-mono tabular-nums text-foreground">{minKwc} kWc</strong> uniquement.
              </span>
            </div>
          </div>

          {/* 3. Fréquence anti-spam */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Fréquence e-mail (anti-spam strict)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FREQUENCIES.map((freq) => {
                const Icon = freq.icon
                const active = frequency === freq.id
                return (
                  <button
                    key={freq.id}
                    type="button"
                    onClick={() => setFrequency(freq.id)}
                    className={`rounded-2xl border p-3 text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                        {freq.badge}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-0.5">{freq.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-snug">{freq.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Colonne Droite : Mode Auto-Pilot Plafonné & Paiement 1-Clic */}
      <div className="lg:col-span-5 rounded-3xl border-2 border-primary/25 bg-card p-6 sm:p-8 shadow-xs flex flex-col justify-between gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--aegis-availability-bg)] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--aegis-availability-text)]">
                Mode Auto-Pilot Plafonné
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-foreground font-heading">
                Réservation prioritaire avant envoi aux confrères
              </h3>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={autoPilot}
              aria-label="Tester le switch Auto-Pilot"
              onClick={() => setAutoPilot((v) => !v)}
              className={`relative mt-1 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                autoPilot ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow-xs transition-transform ${
                  autoPilot ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Activez l&apos;Auto-Pilot quand vos commerciaux ont besoin d&apos;un flux régulier sans surveiller leur boîte mail : dès qu&apos;un dossier validé correspond à vos filtres, il vous est réservé automatiquement avant la diffusion générale.
          </p>

          {/* Plafond hebdomadaire interactif */}
          <div className="rounded-2xl border border-border bg-secondary/35 p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">
                Plafond strict sur <span className="font-mono tabular-nums">7</span> jours glissants
              </span>
              <span className="rounded-md bg-card border border-border px-2 py-0.5 font-mono text-xs font-bold text-primary tabular-nums">
                Max {weeklyCap} / 7 j.
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[2, 5, 10, 15].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setWeeklyCap(cap)}
                  className={`h-8 rounded-lg border font-mono text-xs font-bold tabular-nums transition-all cursor-pointer ${
                    weeklyCap === cap
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              Zéro dépassement de budget : l&apos;Auto-Pilot s&apos;arrête dès le quota atteint et tourne de façon équitable entre partenaires.
            </p>
          </div>

          {/* Option Exclusivité Totale B2C auto */}
          <button
            type="button"
            onClick={() => setAutoExclusiveB2c((v) => !v)}
            className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
              autoExclusiveB2c
                ? "border-[var(--aegis-availability-text)]/40 bg-[var(--aegis-availability-bg)]/60"
                : "border-border bg-card hover:bg-secondary/40"
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">
                Option Exclusivité Totale B2C automatique (<span className="font-mono tabular-nums">7</span> cr.)
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">
                Réserve les <span className="font-mono tabular-nums">3</span> places d&apos;un coup (<span className="font-mono tabular-nums">0</span> concurrent) et notifie le particulier de votre attribution prioritaire.
              </span>
            </div>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                autoExclusiveB2c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {autoExclusiveB2c && <Check className="h-3 w-3 stroke-[3]" />}
            </span>
          </button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              Alimenté par vos crédits ou par mandat sécurisé Mollie <span className="font-mono tabular-nums">1</span>-clic (résiliable en <span className="font-mono tabular-nums">1</span> clic).
            </span>
          </div>
        </div>

        <Button asChild className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-xs">
          <a href="#candidature">
            <ShieldCheck className="h-4 w-4 mr-1.5 text-accent" />
            <span>Configurer mes alertes sur le portail</span>
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </a>
        </Button>
      </div>
    </div>
  )
}
