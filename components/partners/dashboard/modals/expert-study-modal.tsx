"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  X,
  Sparkles,
  BarChart3,
  Cpu,
  TrendingUp,
  Handshake,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  MapPin,
  Zap,
  Phone,
  Mail,
  Loader2,
  Send,
  HelpCircle,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CustomSelect } from "@/components/ui/custom-select"

export interface ExpertStudyModalProps {
  partner: any
  purchases?: any[]
  initialLead?: any | null
  onClose: () => void
}

const STUDY_TYPES = [
  {
    id: "market_study",
    label: "Étude de marché locale (Wallonie)",
    shortDesc: "Densité solaire, concurrence locale & grille tarifaire recommandée",
    icon: BarChart3,
    badge: "Marché & Concurrence",
  },
  {
    id: "technical_sizing",
    label: "Dimensionnement & Faisabilité",
    shortDesc: "Calepinage estimatif, puissance kWc, toitures, onduleurs & batteries",
    icon: Cpu,
    badge: "Ingénierie & GRD",
  },
  {
    id: "financial_roi",
    label: "Rentabilité B2B & Fiscalité",
    shortDesc: "Calcul ROI, amortissement DPI 40%, arbitrage injection vs autoconsommation",
    icon: TrendingUp,
    badge: "Finances & Fiscalité",
  },
  {
    id: "closing_support",
    label: "Appui au closing client",
    shortDesc: "Argumentaire technique sur-mesure face à un devis concurrent",
    icon: Handshake,
    badge: "Vente & Négociation",
  },
] as const

const QUICK_PROMPTS = [
  "Validation contrainte injection GRD (ORES/RESA)",
  "Dimensionnement batterie pour optimiser l'autoconsommation",
  "Simulation rentabilité avec déduction fiscale DPI 40%",
  "Contre-expertise face à un devis concurrent agressif",
  "Audit de toiture complexe (charpente / étanchéité)",
]

export default function ExpertStudyModal({
  partner,
  purchases = [],
  initialLead = null,
  onClose,
}: ExpertStudyModalProps) {
  const [selectedType, setSelectedType] = useState<string>("market_study")
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    initialLead?.id || initialLead?.purchase_id || "none"
  )
  const [message, setMessage] = useState("")
  const [phone, setPhone] = useState(partner?.phone || "")
  const [preferredContact, setPreferredContact] = useState<"phone" | "email" | "both">("phone")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Fermeture clavier via Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Déterminer les informations du dossier ciblé
  const activeLead = React.useMemo(() => {
    if (initialLead && (selectedLeadId === initialLead.id || selectedLeadId === initialLead.purchase_id)) {
      return initialLead
    }
    if (selectedLeadId && selectedLeadId !== "none") {
      return purchases.find(
        (p) => p.id === selectedLeadId || p.purchase_id === selectedLeadId || p.lead_id === selectedLeadId
      )
    }
    return null
  }, [initialLead, selectedLeadId, purchases])

  const leadOptions = React.useMemo(
    () => [
      {
        value: "none",
        label: "Dossier externe / Hors marketplace (prospection générale Wallonie)",
      },
      ...purchases.map((p) => {
        const id = p.purchase_id || p.id
        const title = `${p.company ? `${p.company} — ` : ""}${p.first_name || ""} ${p.last_name || ""} (${p.city || p.province || "Chantier"})`
        return { value: id, label: title }
      }),
    ],
    [purchases]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || message.trim().length < 5) {
      toast.error("Veuillez préciser votre demande ou vos questions pour nos ingénieurs.")
      return
    }

    setIsSubmitting(true)

    try {
      const leadRefText = activeLead
        ? `${activeLead.company ? `${activeLead.company} — ` : ""}${activeLead.first_name || ""} ${activeLead.last_name || ""} (${activeLead.city || activeLead.province || "Wallonie"})`
        : selectedLeadId === "none"
        ? "Dossier externe / Prospection générale"
        : null

      const res = await fetch("/api/partners/expert-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyType: selectedType,
          leadId: activeLead?.id || activeLead?.lead_id || null,
          leadReference: leadRefText,
          message: message.trim(),
          phone: phone.trim(),
          preferredContact,
          additionalDetails: activeLead
            ? {
                segment: activeLead.segment,
                city: activeLead.city,
                postal_code: activeLead.postal_code,
                power_kwc: activeLead.estimated_power_kwc,
                annual_bill: activeLead.annual_electricity_bill,
              }
            : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue.")

      setIsSuccess(true)
      toast.success("Demande d'étude envoyée à la Cellule Technique !", {
        description: "Un ingénieur Aegis Solaire traitera votre dossier sous 24h ouvrées.",
      })
    } catch (err: any) {
      toast.error(err.message || "Impossible d'envoyer votre demande.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expert-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* ── 1. En-tête Institutionnel FinTech Slate ── */}
        <div className="shrink-0 flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border bg-card">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent border border-accent/25 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-bold">
                  CELLULE TECHNIQUE &amp; INGÉNIERIE
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-accent/10 border border-accent/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-foreground">
                  % Projet · À négocier
                </span>
              </div>
              <h2
                id="expert-modal-title"
                className="text-base sm:text-lg font-bold text-foreground truncate"
              >
                Aide d&apos;un Expert &amp; Étude de Marché
              </h2>
              <p className="text-xs text-muted-foreground">
                Accompagnement expert et ingénierie : dimensionnement, marché Wallonie et closing B2B en échange d&apos;un pourcentage du projet, à négocier selon son envergure.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── 2. Corps Formulaire ou Vue de Succès ── */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 space-y-5 text-center my-auto">
            <div className="h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-foreground">
                Demande transmise avec succès !
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Notre Cellule Technique &amp; Ingénierie a bien reçu votre demande. Un ingénieur dédié analyse vos éléments et vous recontactera sous <strong>24 heures ouvrées</strong> pour convenir des modalités techniques et du pourcentage d&apos;honoraires applicable au succès du chantier.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3.5 max-w-md mx-auto text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Type d&apos;étude :</span>
                <strong className="text-foreground">
                  {STUDY_TYPES.find((s) => s.id === selectedType)?.label}
                </strong>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Rappel privilégié :</span>
                <span className="font-mono text-foreground font-semibold">
                  {preferredContact === "phone" ? phone || partner?.phone : partner?.email}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Délai de traitement :</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Sous 24h ouvrées
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="default"
                onClick={onClose}
                className="h-10 px-6 text-xs font-bold cursor-pointer"
              >
                Fermer et retourner au portail
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
            {/* A. Choix du type d'accompagnement */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                1. Type d&apos;expertise souhaitée
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STUDY_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-border bg-card hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isSelected ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {type.label}
                          </span>
                        </div>
                        <span className="rounded bg-secondary text-muted-foreground text-[9px] font-mono font-semibold px-1.5 py-0.5 border border-border shrink-0">
                          {type.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {type.shortDesc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* B. Rattachement à un dossier client / Chantier */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  2. Dossier rattaché (Optionnel)
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {purchases.length} dossier(s) dans votre CRM
                </span>
              </div>

              {activeLead ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-bold bg-primary text-primary-foreground">
                        {activeLead.segment || "B2B"}
                      </span>
                      <strong className="text-xs font-bold text-foreground truncate">
                        {activeLead.company ? `${activeLead.company} — ` : ""}
                        {activeLead.first_name} {activeLead.last_name}
                      </strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>{activeLead.city || activeLead.province || "Wallonie"}</span>
                      {activeLead.estimated_power_kwc && (
                        <span>• {activeLead.estimated_power_kwc} kWc</span>
                      )}
                      {activeLead.annual_electricity_bill && (
                        <span>
                          • {Number(activeLead.annual_electricity_bill).toLocaleString("fr-BE")} €/an
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedLeadId("none")}
                    className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer shrink-0"
                  >
                    Détacher
                  </button>
                </div>
              ) : (
                <CustomSelect
                  value={selectedLeadId}
                  onChange={setSelectedLeadId}
                  options={leadOptions}
                  className="w-full"
                  triggerClassName="w-full justify-between"
                  contentClassName="w-[calc(100vw-2rem)] max-w-xl"
                  ariaLabel="Sélectionner un chantier pour l'étude expert"
                />
              )}
            </div>

            {/* C. Précisions & Questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="expert-message"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground block"
                >
                  3. Vos questions précises pour nos ingénieurs *
                </label>
                <span className="text-[11px] text-muted-foreground">Minimum 5 caractères</span>
              </div>

              <textarea
                id="expert-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Ex : Pour ce chantier B2B, le client hésite entre un onduleur hybride avec batterie 20 kWh ou une revente totale d'injection. Pouvez-vous modéliser le temps de retour sur investissement selon la déduction fiscale DPI 40 % ?"
                className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden resize-none transition-all"
                required
              />

              {/* Suggestions rapides */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground font-medium mr-1">
                  Exemples :
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setMessage((prev) =>
                        prev ? `${prev.trim()}\n- ${prompt}` : prompt
                      )
                    }
                    className="inline-flex items-center rounded-md border border-border bg-secondary/60 hover:bg-secondary px-2 py-0.5 text-[10px] text-foreground transition-colors cursor-pointer"
                  >
                    + {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* D. Coordonnées de contact pour le retour */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                4. Canal de retour privilégié
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Numéro direct pour rappel rapide
                  </span>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+32 4XX XX XX XX"
                      className="w-full rounded-xl border border-border bg-card pl-8.5 pr-3 py-1.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary outline-hidden h-9"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Préférence de communication
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setPreferredContact("phone")}
                      className={`h-9 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        preferredContact === "phone"
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "border-border bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      Téléphone
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredContact("email")}
                      className={`h-9 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        preferredContact === "email"
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "border-border bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      E-mail
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredContact("both")}
                      className={`h-9 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        preferredContact === "both"
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "border-border bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      Les deux
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Note d'honoraires et engagement bilatéral */}
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Handshake className="h-4 w-4 text-accent shrink-0" />
                <span>Modalités d&apos;accompagnement : Pourcentage du projet à négocier</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                L&apos;intervention de la Cellule Technique (dimensionnement, calepinage, validation GRD ORES/RESA, closing B2B) n&apos;est pas gratuite : elle s&apos;effectue en échange d&apos;un <strong>pourcentage convenu sur le montant du projet signé</strong>, à négocier et fixer ensemble selon la puissance (kWc) et la complexité du chantier.
              </p>
            </div>

            {/* ── 3. Pied de Formulaire avec CTA ── */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-border">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>Réponse garantie sous 24h ouvrées</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="h-10 px-4 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="h-10 px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Transmission...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Envoyer ma demande d&apos;étude
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
