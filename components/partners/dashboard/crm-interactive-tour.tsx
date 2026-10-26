"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  MessageCircle,
  UserPlus,
  Eye,
  Compass,
  Sparkles,
  Zap,
  Home,
  FileText,
  Calendar,
  Download,
  Clock,
  Briefcase,
  Layers,
  Check,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface CrmInteractiveTourProps {
  isOpen: boolean
  onClose: () => void
  onExploreMarketplace?: () => void
  hasPurchases: boolean
}

const CRM_TOUR_STEPS = [
  {
    stepNumber: "01",
    badge: "PORTEFEUILLE CLIENTS CENTRALISÉ",
    title: "Tous vos chantiers débloqués au même endroit",
    subtitle:
      "Dès qu'un dossier solaire est débloqué sur la Marketplace, il rejoint votre espace Mon CRM. Toutes les coordonnées réelles et confidentielles du décideur vous sont définitivement attribuées.",
  },
  {
    stepNumber: "02",
    badge: "RÉACTIVITÉ & CONVERSION ULTRA-RAPIDE",
    title: "Boutons « Appel » & « WhatsApp » en 1 clic",
    subtitle:
      "La réactivité est la clé : joindre le prospect dans les 15 minutes multiplie vos chances de signature par 3. Vous disposez des raccourcis téléphoniques directs sans ressaisie.",
  },
  {
    stepNumber: "03",
    badge: "PRODUCTIVITÉ TERRAIN & AUDIT EXPERT",
    title: "Boutons « vCard », « Fiche » & « Expert »",
    subtitle:
      "Synchronisez votre carnet d'adresses en un tap, consultez l'audit technique complet et sollicitez en 1 clic l'assistance de notre Cellule Technique & Ingénierie pour vos études de marché et dimensionnements complexes.",
  },
  {
    stepNumber: "04",
    badge: "PIPELINE COMMERCIAL & RELANCES",
    title: "Sélecteur de statut 1-Tap & Filtres de vente",
    subtitle:
      "Faites progresser chaque opportunité en direct à travers les 6 étapes de votre prospection. Vos modifications s'enregistrent instantanément sans recharger la page.",
  },
  {
    stepNumber: "05",
    badge: "SÉCURITÉ & GARANTIE 100%",
    title: "Bouton « 24h / Litige » : Zéro achat à perte",
    subtitle:
      "Numéro erroné ou prospect injoignable ? Cliquez sur « 24h » sous la carte : nos auditeurs traitent votre signalement et recréditent immédiatement votre solde.",
  },
]

export function CrmInteractiveTour({
  isOpen,
  onClose,
  onExploreMarketplace,
  hasPurchases,
}: CrmInteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // États de simulation interactive interne au tutoriel
  const [simulatedStatus, setSimulatedStatus] = useState<string>("to_contact")
  const [activeTabContact, setActiveTabContact] = useState<"phone" | "whatsapp">("phone")
  const [copiedVcard, setCopiedVcard] = useState(false)

  // Navigation clavier : Flèche Droite (Suivant), Flèche Gauche (Précédent), Escape (Fermer)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowRight") {
        if (currentStep < CRM_TOUR_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1)
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1)
        }
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, currentStep, onClose])

  if (!isOpen) return null

  const step = CRM_TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === CRM_TOUR_STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-tour-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* ── 1. Barre de progression supérieure (Stepper animé 5 étapes) ── */}
        <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent">
                <Briefcase className="h-3.5 w-3.5" />
                GUIDE OFFICIEL · MON CRM
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground tabular-nums">
                {currentStep + 1} / {CRM_TOUR_STEPS.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Fermer le tutoriel (Échap)"
              aria-label="Fermer le tutoriel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 5 segments de progression interactifs */}
          <div className="grid grid-cols-5 gap-1.5">
            {CRM_TOUR_STEPS.map((s, idx) => (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className="group py-1 cursor-pointer"
                title={`Aller à l'étape ${idx + 1} : ${s.title}`}
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? "bg-accent shadow-xs"
                      : idx < currentStep
                      ? "bg-primary"
                      : "bg-secondary"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Corps du Slide interactif ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Titre et Contexte */}
          <div className="space-y-1.5">
            <span className="font-mono text-[11px] font-bold tracking-wider text-accent uppercase">
              {step.badge}
            </span>
            <h2
              id="crm-tour-title"
              className="text-xl sm:text-2xl font-heading font-extrabold text-foreground tracking-tight"
            >
              {step.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {step.subtitle}
            </p>
          </div>

          {/* ── Micro-Simulation UI selon l'étape ── */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5">
            {/* ══════════════════════════════════════════════════════════
                Slide 1 : Vue d'ensemble du Portefeuille & Données Débloquées
            ══════════════════════════════════════════════════════════ */}
            {currentStep === 0 && (
              <div className="space-y-3.5 text-left">
                {/* Exemple de carte portefeuille débloquée */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-[#0B1528] text-white px-2 py-0.5 text-[10px] font-bold">
                          B2C • Débloqué
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Contact vérifié
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground">
                        Jean-Marc Laurent
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Home className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>Rue de la Station 14, 4650 Herve (Liège)</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xl font-black text-foreground tabular-nums">
                        9.2 <span className="text-xs font-bold text-muted-foreground">kWc</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-accent tabular-nums block">
                        ~3 600 € HT marge
                      </span>
                    </div>
                  </div>

                  {/* Coordonnées révélées */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2 border border-border/60">
                      <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        +32 472 84 XX XX
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2 border border-border/60">
                      <Mail className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="font-mono text-foreground truncate">
                        jm.laurent@prospect.be
                      </span>
                    </div>
                  </div>
                </div>

                {/* Encadré d'explication des vues et KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-card border border-border p-3 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Layers className="h-3.5 w-3.5 text-accent" />
                      <span>Vue Grille vs Tableau</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Basculez à tout moment entre la vue cartes photographiques (idéale sur tablette) et la vue tableau dense (productivité bureau).
                    </p>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Indicateurs de pilotage</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Suivez en haut vos kWc cumulés, votre taux de signature (%) et le volume d&apos;affaires total estimé en k€.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Slide 2 : Boutons « Appel » & « WhatsApp »
            ══════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <div className="space-y-3.5 text-left">
                {/* Sélecteur de prévisualisation Appel vs WhatsApp */}
                <div className="flex items-center gap-2 border-b border-border/80 pb-2.5">
                  <span className="text-xs font-semibold text-muted-foreground mr-1">
                    Tester l&apos;option :
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTabContact("phone")}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      activeTabContact === "phone"
                        ? "bg-[#0B1528] text-white shadow-2xs"
                        : "border border-border bg-card text-foreground hover:bg-secondary font-medium"
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5 text-accent" />
                    <span>Bouton « Appel »</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabContact("whatsapp")}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      activeTabContact === "whatsapp"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "border border-border bg-card text-foreground hover:bg-secondary font-medium"
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Bouton « WA »</span>
                  </button>
                </div>

                {/* Rendu dynamique selon l'option choisie */}
                {activeTabContact === "phone" ? (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#0B1528] text-white px-3 py-1 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <Phone className="h-3.5 w-3.5 text-accent" />
                          <span>Appel</span>
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Lien direct <code className="font-mono text-accent">tel:+32472...</code>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                        1 tap smartphone / PC
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Cliquez sur <strong className="text-foreground">« Appel »</strong> pour composer immédiatement le numéro depuis votre smartphone ou lancer votre softphone sur ordinateur (FaceTime, Skype, Teams).
                    </p>

                    <div className="rounded-lg bg-secondary/50 p-2.5 text-[11px] text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent shrink-0" />
                      <span>
                        <strong className="font-semibold">Règle d&apos;or commerciale :</strong> un appel passé dans les 15 minutes suivant le déblocage multiplie par 3 le taux de conversion en rendez-vous.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-2xs">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WA</span>
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Message WhatsApp pré-formaté
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded">
                        Zéro saisie manuelle
                      </span>
                    </div>

                    <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground font-mono space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Aperçu du message injecté dans WhatsApp :
                      </span>
                      <p className="text-foreground italic">
                        « Bonjour Jean-Marc, suite à votre demande d&apos;étude photovoltaïque sur Aegis Solaire, je vous contacte en tant qu&apos;installateur certifié RESCERT pour convenir d&apos;un échange rapide. »
                      </p>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Parfait si le prospect ne décroche pas au premier appel : 68% des décideurs répondent plus vite par message direct.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 p-2.5 text-xs text-accent">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    Chaque numéro belge est pré-nettoyé, vérifié par nos algorithmes et prêt à l&apos;emploi.
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Slide 3 : Boutons « vCard » & « Fiche » (Inspection)
            ══════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <div className="space-y-3.5 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bouton vCard */}
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-border bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>vCard</span>
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground font-bold">
                        Format .VCF
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-foreground">
                      Export contact en 1 clic
                    </h4>

                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Télécharge un fichier contact compatible iOS (Contacts iPhone), Android, Outlook et CRM tiers.
                    </p>

                    <div className="rounded-lg bg-secondary/40 p-2 text-[10px] text-muted-foreground font-mono space-y-0.5">
                      <div>• Nom : Jean-Marc Laurent</div>
                      <div>• Organisme : Aegis Solaire B2C</div>
                      <div>• Tel : +32 472 84 XX XX</div>
                      <div>• Adresse : Herve (4650)</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCopiedVcard(true)
                        setTimeout(() => setCopiedVcard(false), 2000)
                      }}
                      className="w-full rounded-lg bg-secondary hover:bg-secondary/80 text-foreground py-1 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedVcard ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Fichier généré !</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 text-accent" />
                          <span>Tester l&apos;export vCard</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bouton Fiche */}
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-border bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-[#2563EB]" />
                        <span>Fiche</span>
                      </span>
                      <span className="font-mono text-[10px] text-[#2563EB] font-bold">
                        Audit complet
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-foreground">
                      Tiroir d&apos;audit technique
                    </h4>

                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Ouvre à tout moment le tiroir latéral détaillé pour préparer votre offre et votre visite :
                    </p>

                    <div className="rounded-lg bg-secondary/40 p-2 text-[10px] text-muted-foreground space-y-0.5">
                      <div>• Surface toiture utile &amp; matériau (Tuiles)</div>
                      <div>• Type de compteur (Mono / Triphasé)</div>
                      <div>• Facture annuelle &amp; consommation kWh</div>
                      <div>• Date d&apos;échéance souhaitée par le client</div>
                    </div>

                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-2 text-[10px] text-blue-900 dark:text-blue-300 font-medium">
                      Disponible 24/7 même après déblocage, sans expiration.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/25 p-2.5 text-xs text-foreground">
                  <Sparkles className="h-4 w-4 text-accent shrink-0" />
                  <span>
                    <strong>Bouton « Expert » inclus :</strong> Besoin d&apos;une étude de marché locale, d&apos;un calepinage technique, d&apos;un arbitrage batteries ou d&apos;un calcul de rentabilité B2B ? Notre Cellule Technique vous répond sous 24h ouvrées.
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-2.5 text-xs text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Vous partez en rendez-vous avec toutes les cartes en main : le prospect est déjà dans vos contacts et vous connaissez son toit avant de sonner à sa porte.
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Slide 4 : Sélecteur de statut 1-Tap & Filtres de relance
            ══════════════════════════════════════════════════════════ */}
            {currentStep === 3 && (
              <div className="space-y-3.5 text-left">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold">
                        DÉMO INTERACTIVE · CLIQUEZ POUR CHANGER DE STATUT
                      </span>
                      <h4 className="font-bold text-xs text-foreground">
                        Progression de la vente (React 19 Optimistic UI)
                      </h4>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                      Enregistrement instantané
                    </span>
                  </div>

                  {/* Boutons d'étape interactifs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {[
                      { id: "to_contact", label: "À contacter", color: "bg-amber-600 text-white" },
                      { id: "contacted", label: "Contacté", color: "bg-slate-800 text-white" },
                      { id: "meeting_scheduled", label: "RDV fixé", color: "bg-blue-600 text-white" },
                      { id: "quote_sent", label: "Devis envoyé", color: "bg-purple-600 text-white" },
                      { id: "won", label: "Gagné", color: "bg-emerald-600 text-white" },
                      { id: "lost", label: "Perdu", color: "bg-zinc-600 text-white" },
                    ].map((st) => {
                      const isActive = simulatedStatus === st.id
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSimulatedStatus(st.id)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isActive
                              ? `${st.color} border-transparent shadow-xs font-bold scale-105`
                              : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          {st.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="rounded-lg bg-secondary/40 p-2.5 text-xs text-foreground flex items-center justify-between">
                    <span className="text-muted-foreground">Statut actuellement sélectionné :</span>
                    <span className="font-bold text-foreground font-mono">
                      {simulatedStatus === "to_contact" && "🟡 1. À contacter (Nouveau prospect)"}
                      {simulatedStatus === "contacted" && "⚪ 2. Contacté (Échange téléphonique effectué)"}
                      {simulatedStatus === "meeting_scheduled" && "🔵 3. RDV fixé (Visite technique planifiée)"}
                      {simulatedStatus === "quote_sent" && "🟣 4. Devis envoyé (Offre en cours d'examen)"}
                      {simulatedStatus === "won" && "🟢 5. Gagné (Bon de commande signé !)"}
                      {simulatedStatus === "lost" && "⚫ 6. Perdu (Chantier sans suite)"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-card border border-border p-3 space-y-1">
                    <span className="font-bold text-foreground block">
                      Filtres de statut en haut de page
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Isolez vos « Devis envoyés » chaque lundi matin pour relancer vos offres, ou retrouvez vos « RDV fixés » de la semaine en 1 clic.
                    </p>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3 space-y-1">
                    <span className="font-bold text-foreground block">
                      Recherche universelle intelligente
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Retrouvez n&apos;importe quel dossier par nom de client, numéro de téléphone, commune wallonne ou code postal en temps réel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Slide 5 : Bouton « 24h / Litige » & Garantie Anti-Fake
            ══════════════════════════════════════════════════════════ */}
            {currentStep === 4 && (
              <div className="space-y-3.5 text-left">
                <div className="rounded-xl border border-destructive/30 bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-foreground">
                          Bouton « 24h / Litige » : Protection Intégrale
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Votre investissement est protégé à 100% sans discussion fastidieuse
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-destructive/30 bg-destructive/5 text-destructive px-2.5 py-1 text-xs font-semibold">
                      Bouton « 24h »
                    </span>
                  </div>

                  <div className="rounded-lg bg-secondary/50 p-3 space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Motifs légitimes de remboursement immédiat :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span>Numéro non attribué ou faux contact</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span>Client injoignable après relances</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span>Projet déjà installé ou hors critères</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                        <span>Demande test / faux prospect</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                    <span className="text-muted-foreground">Délai d&apos;arbitrage garanti :</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      Sous 24 heures ouvrées
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 p-2.5 text-xs text-accent">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Dès validation par notre équipe d&apos;audit, vos crédits dépensés sont automatiquement recrédités sur votre solde pour débloquer un autre chantier.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Pied de navigation du tutoriel ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-border bg-card">
          <div>
            {!isFirst ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Précédent</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Passer
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isLast ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
              >
                <span>Étape suivante</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {!hasPurchases && onExploreMarketplace && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onExploreMarketplace()
                    }}
                    className="rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-secondary text-foreground"
                  >
                    <Briefcase className="h-3.5 w-3.5 mr-1 text-accent" />
                    <span>Débloquer mon 1er chantier</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                >
                  <span>Accéder à Mon CRM</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
