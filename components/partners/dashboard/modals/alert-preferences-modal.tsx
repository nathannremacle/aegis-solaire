"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  Bell,
  MapPin,
  Check,
  Loader2,
  X,
  Layers,
  Sparkles,
  Zap,
  Building2,
  Home,
  CheckCircle2,
  RotateCcw,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface AlertPreferencesModalProps {
  partner: any
  onClose: () => void
}

interface WalloniaProvince {
  id: string
  label: string
  postalRange: string
  cities: string
}

const WALLONIA_PROVINCES: WalloniaProvince[] = [
  {
    id: "liege",
    label: "Liège",
    postalRange: "CP 4000 – 4999",
    cities: "Liège, Verviers, Huy, Waremme, Eupen",
  },
  {
    id: "hainaut",
    label: "Hainaut",
    postalRange: "CP 6000 – 7999",
    cities: "Charleroi, Mons, Tournai, La Louvière, Mouscron",
  },
  {
    id: "namur",
    label: "Namur",
    postalRange: "CP 5000 – 5680",
    cities: "Namur, Dinant, Gembloux, Ciney, Andenne",
  },
  {
    id: "brabant_wallon",
    label: "Brabant Wallon",
    postalRange: "CP 1300 – 1499",
    cities: "Wavre, Nivelles, Waterloo, Ottignies-LLN, Braine",
  },
  {
    id: "luxembourg",
    label: "Luxembourg",
    postalRange: "CP 6600 – 6999",
    cities: "Arlon, Bastogne, Marche, Libramont, Virton",
  },
]

const INSTALLATION_TYPES = [
  {
    id: "toiture",
    label: "Toitures résidentielles & bâtiments",
    description: "Tuiles, ardoises, bac acier et toitures plates (5 à 50 kWc)",
    icon: Home,
  },
  {
    id: "parking",
    label: "Ombrières photovoltaïques",
    description: "Parkings PME, commerces, supermarchés et cliniques (>20 kWc)",
    icon: Building2,
  },
  {
    id: "sol",
    label: "Installations au sol & Tertiaire",
    description: "Grands terrains, friches industrielles et parcs spécifiques (>40 kWc)",
    icon: Layers,
  },
]

const MIN_BILL_PRESETS = [
  {
    minFacture: 0,
    label: "Tous chantiers",
    powerHint: "Dès 4 kWc",
    context: "Résidentiel standard et tout projet éligible",
  },
  {
    minFacture: 2500,
    label: "Moyen & Grand Résidentiel",
    powerHint: "Dès 8 kWc",
    context: "Facture > 2 500 €/an · Grosses habitations et fermettes",
  },
  {
    minFacture: 6000,
    label: "PME & Tertiaire",
    powerHint: "Dès 20 kWc",
    context: "Facture > 6 000 €/an · Hangars, commerces et ateliers",
  },
  {
    minFacture: 15000,
    label: "Grands Comptes B2B",
    powerHint: "Dès 50 kWc",
    context: "Facture > 15 000 €/an · Industries et grandes surfaces",
  },
]

export default function AlertPreferencesModal({ partner, onClose }: AlertPreferencesModalProps) {
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(() => {
    if (Array.isArray(partner?.target_provinces) && partner.target_provinces.length > 0) {
      return partner.target_provinces
    }
    return ["liege", "namur", "hainaut", "brabant_wallon", "luxembourg"]
  })

  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() => {
    if (Array.isArray(partner?.target_surfaces) && partner.target_surfaces.length > 0) {
      return partner.target_surfaces
    }
    return ["toiture", "parking"]
  })

  const [minFacture, setMinFacture] = useState<number>(() => {
    if (typeof partner?.min_facture === "number") {
      return partner.min_facture
    }
    return 0
  })

  const [saving, setSaving] = useState(false)

  // Fermeture clavier avec Escape
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

  const toggleProvince = (pId: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(pId) ? prev.filter((p) => p !== pId) : [...prev, pId]
    )
  }

  const selectAllProvinces = () => {
    setSelectedProvinces(WALLONIA_PROVINCES.map((p) => p.id))
  }

  const clearProvinces = () => {
    setSelectedProvinces([])
  }

  const toggleSurface = (sId: string) => {
    setSelectedSurfaces((prev) =>
      prev.includes(sId) ? prev.filter((s) => s !== sId) : [...prev, sId]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedProvinces.length === 0) {
      toast.error("Veuillez sélectionner au moins une province pour recevoir des alertes.")
      return
    }

    if (selectedSurfaces.length === 0) {
      toast.error("Veuillez sélectionner au moins un type d'installation.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/partners/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provinces: selectedProvinces,
          surfaces: selectedSurfaces,
          minFacture,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement des préférences")
      }

      // Mise à jour de l'objet partenaire en mémoire
      if (partner) {
        partner.target_provinces = selectedProvinces
        partner.target_surfaces = selectedSurfaces
        partner.min_facture = minFacture
      }

      toast.success("Vos alertes et votre périmètre wallon ont été enregistrés avec succès !")
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement des préférences")
    } finally {
      setSaving(false)
    }
  }

  const allSelected = selectedProvinces.length === WALLONIA_PROVINCES.length
  const currentPreset =
    MIN_BILL_PRESETS.find((p) => p.minFacture === minFacture) || MIN_BILL_PRESETS[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-preferences-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* ── 1. En-tête de la Fenêtre ── */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent">
                  <Bell className="h-3.5 w-3.5" />
                  PÉRIMÈTRE D&apos;INTERVENTION &amp; ALERTES DIRECTES
                </span>
              </div>
              <h2
                id="alert-preferences-title"
                className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-foreground"
              >
                Alertes &amp; Périmètre Wallon
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Configurez votre rayon d&apos;intervention et vos critères techniques pour recevoir en avant-première les opportunités photovoltaïques dès leur parution.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
              title="Fermer la fenêtre (Échap)"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── 2. Corps Formulaire Déroulant ── */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ════════ Section A : Sélection des Provinces Wallonnes ════════ */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Provinces d&apos;intervention</span>
                </label>
                <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-mono font-bold text-foreground tabular-nums">
                  {selectedProvinces.length} / {WALLONIA_PROVINCES.length} active{selectedProvinces.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Raccourcis Tout sélectionner / Réinitialiser */}
              <div className="flex items-center gap-2 text-xs">
                {!allSelected ? (
                  <button
                    type="button"
                    onClick={selectAllProvinces}
                    className="font-mono text-[11px] font-bold text-accent hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    <span>Toute la Wallonie (5)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={clearProvinces}
                    className="font-mono text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Désélectionner tout</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grille des 5 cartes provinces */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WALLONIA_PROVINCES.map((prov) => {
                const isActive = selectedProvinces.includes(prov.id)
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => toggleProvince(prov.id)}
                    className={`group relative flex items-start justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 cursor-pointer shadow-2xs ${
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-secondary/40 text-muted-foreground hover:border-slate-300 dark:hover:border-border/80"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-sm leading-tight transition-colors ${
                            isActive ? "text-foreground font-heading" : "text-slate-700 dark:text-muted-foreground"
                          }`}
                        >
                          {prov.label}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-secondary/80 px-1.5 py-0.2 rounded">
                          {prov.postalRange}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-normal truncate">
                        {prov.cities}
                      </p>
                    </div>

                    {/* Case à cocher custom */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                        isActive
                          ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                          : "border-border bg-card group-hover:border-slate-400"
                      }`}
                    >
                      {isActive && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ════════ Section B : Types d'installations & Surfaces ════════ */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Layers className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>Typologie de chantiers souhaitée</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Multi-choix
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {INSTALLATION_TYPES.map((type) => {
                const Icon = type.icon
                const isActive = selectedSurfaces.includes(type.id)
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleSurface(type.id)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 cursor-pointer shadow-2xs ${
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "bg-secondary text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            isActive
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border bg-card"
                          }`}
                        >
                          {isActive && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>

                      <h4
                        className={`text-xs font-bold leading-tight ${
                          isActive ? "text-foreground" : "text-slate-700 dark:text-muted-foreground"
                        }`}
                      >
                        {type.label}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        {type.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ════════ Section C : Envergure & Seuil minimal de facture ════════ */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>Envergure minimale du projet</span>
              </label>
              <span className="font-mono text-xs font-bold text-accent tabular-nums">
                {currentPreset.powerHint}
              </span>
            </div>

            {/* Presets rapides de puissance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MIN_BILL_PRESETS.map((preset) => {
                const isActive = minFacture === preset.minFacture
                return (
                  <button
                    key={preset.minFacture}
                    type="button"
                    onClick={() => setMinFacture(preset.minFacture)}
                    className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "border-border bg-card hover:bg-secondary/60 text-foreground font-semibold"
                    }`}
                  >
                    <div className="text-xs font-bold">{preset.label}</div>
                    <div
                      className={`font-mono text-[10px] tabular-nums ${
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {preset.powerHint}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Explication du seuil sélectionné */}
            <div className="rounded-xl bg-secondary/40 border border-border/70 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground block">
                  Filtrage actif : {currentPreset.label} ({currentPreset.powerHint})
                </span>
                <p className="text-[11px] leading-relaxed">
                  {currentPreset.context}. Les chantiers d&apos;envergure inférieure ne vous enverront aucune notification intempestive.
                </p>
              </div>
            </div>
          </div>

          {/* ════════ Section D : Canal de Notification & Transparence ════════ */}
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 sm:p-4 space-y-2.5 text-xs text-foreground">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-foreground block">
                    Canal d&apos;alerte direct
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {partner?.email || "Adresse certifiée installateur"}
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Actif · 0 spam
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/15">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                Accès prioritaire en tant qu&apos;artisan agréé : vous recevez l&apos;alerte dès qu&apos;un dossier de votre zone est qualifié.
              </span>
            </div>
          </div>
        </form>

        {/* ── 3. Pied d'Actions Fixe ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-border bg-card">
          <div className="text-xs text-muted-foreground hidden sm:block">
            <span className="font-mono font-bold text-foreground tabular-nums">
              {selectedProvinces.length}
            </span>{" "}
            province{selectedProvinces.length > 1 ? "s" : ""} ·{" "}
            <span className="font-mono font-bold text-foreground tabular-nums">
              {selectedSurfaces.length}
            </span>{" "}
            surface{selectedSurfaces.length > 1 ? "s" : ""}
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-secondary text-foreground"
            >
              Annuler
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs cursor-pointer min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-accent" />
                  <span>Enregistrer</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
