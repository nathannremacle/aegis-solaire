"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Coins, Store, Briefcase, Bell, LogOut, FileText, ShieldCheck, Users2, Sparkles, ArrowRight, Menu, X, ChevronRight, CheckCircle2, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { MarketplaceFeedView } from "./marketplace-feed-view"
import { CrmPortfolioView } from "./crm-portfolio-view"
import { trackPartnerActivity } from "@/lib/client/partner-tracker"

// Code-splitting : ces modales ne sont téléchargées par le navigateur qu'à la demande
const DisputeClaimModal = dynamic(() => import("./modals/dispute-claim-modal"), { ssr: false })
const AlertPreferencesModal = dynamic(() => import("./modals/alert-preferences-modal"), { ssr: false })
const CreditPacksModal = dynamic(() => import("./modals/credit-packs-modal"), { ssr: false })
const ExpertStudyModal = dynamic(() => import("./modals/expert-study-modal"), { ssr: false })
const PartnerReferralModal = dynamic(() => import("./modals/partner-referral-modal"), { ssr: false })
const PartnerToolsBadgeModal = dynamic(() => import("./modals/partner-tools-badge-modal"), { ssr: false })

export interface PartnerDashboardShellProps {
  initialPartner: any
  initialMarketplace: any[]
  initialPortfolio: any[]
  initialRecentlyClosedLeads?: any[]
  targetLeadId?: string
  targetedClosedLead?: any
  initialCheckoutDirect?: boolean
}

export function PartnerDashboardShell({
  initialPartner,
  initialMarketplace,
  initialPortfolio,
  initialRecentlyClosedLeads = [],
  targetLeadId,
  targetedClosedLead,
  initialCheckoutDirect,
}: PartnerDashboardShellProps) {
  const [activeTargetLeadId, setActiveTargetLeadId] = React.useState<string | undefined>(targetLeadId)

  React.useEffect(() => {
    setActiveTargetLeadId(targetLeadId)
  }, [targetLeadId])

  // Détection si le lead ciblé a déjà été acheté
  const [credits, setCredits] = React.useState<number>(initialPartner?.credits ?? 0)
  const [marketplace, setMarketplace] = React.useState(initialMarketplace ?? [])
  const [portfolio, setPortfolio] = React.useState(initialPortfolio ?? [])

  const targetedPurchasedLead = React.useMemo(() => {
    if (!activeTargetLeadId) return null
    return (
      portfolio.find(
        (p: any) =>
          p.id === activeTargetLeadId ||
          p.lead_id === activeTargetLeadId ||
          p.purchase_id === activeTargetLeadId
      ) || null
    )
  }, [activeTargetLeadId, portfolio])

  const isAlreadyPurchased = Boolean(targetedPurchasedLead)

  const [activeTab, setActiveTab] = React.useState<"marketplace" | "portfolio">("marketplace")
  const isFocusedLeadView = activeTab === "marketplace" && Boolean(activeTargetLeadId)

  // Modales lazy-loadées
  const [disputePurchase, setDisputePurchase] = React.useState<any | null>(null)
  const [isPrefsOpen, setIsPrefsOpen] = React.useState(false)
  const [isCreditsOpen, setIsCreditsOpen] = React.useState(false)
  const [isExpertOpen, setIsExpertOpen] = React.useState(false)
  const [isReferralOpen, setIsReferralOpen] = React.useState(false)
  const [isToolsOpen, setIsToolsOpen] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [selectedLeadForExpert, setSelectedLeadForExpert] = React.useState<any | null>(null)
  const sessionTrackedRef = React.useRef(false)
  const deepLinkTrackedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!isMobileMenuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isMobileMenuOpen])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("alerts") === "1" || params.get("preferences") === "1") {
      setIsPrefsOpen(true)
    }
  }, [])

  React.useEffect(() => {
    if (sessionTrackedRef.current) return
    sessionTrackedRef.current = true
    trackPartnerActivity({
      eventType: "session_start",
      source: targetLeadId ? "email_deep_link" : "dashboard",
      metadata: {
        marketplaceCount: (initialMarketplace ?? []).length,
        portfolioCount: (initialPortfolio ?? []).length,
        partnerCredits: initialPartner?.credits ?? 0,
      },
    })
  }, [targetLeadId, initialMarketplace, initialPortfolio, initialPartner?.credits])

  React.useEffect(() => {
    if (!targetLeadId || deepLinkTrackedRef.current === targetLeadId) return
    deepLinkTrackedRef.current = targetLeadId
    trackPartnerActivity({
      eventType: "email_deep_link",
      leadId: targetLeadId,
      leadRef: targetLeadId.slice(0, 8),
      source: "email_deep_link",
      metadata: {
        alreadyPurchased: isAlreadyPurchased,
      },
    })
  }, [targetLeadId, isAlreadyPurchased])

  const openCreditsModal = React.useCallback(
    (origin: string) => {
      setIsCreditsOpen(true)
      trackPartnerActivity({
        eventType: "credit_modal_open",
        source: origin,
        metadata: { currentCredits: credits },
      })
    },
    [credits]
  )

  const handleSelectTab = React.useCallback((tab: "marketplace" | "portfolio", origin: string) => {
    setActiveTab(tab)
    if (tab === "portfolio") {
      trackPartnerActivity({
        eventType: "crm_tab_open",
        source: origin,
      })
    }
  }, [])

  const handleUpdatePipelineStatus = React.useCallback(
    (purchaseId: string, newStatus: string) => {
      setPortfolio((prev) =>
        prev.map((item) => {
          const match =
            (item.purchase_id && item.purchase_id === purchaseId) ||
            (item.id && item.id === purchaseId) ||
            (item.lead_id && item.lead_id === purchaseId)
          return match ? { ...item, pipeline_status: newStatus } : item
        })
      )
    },
    []
  )

  // Gestion du retour d'une session de paiement direct par lead en euros via Mollie
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    const isLeadReturn = url.searchParams.get("lead_payment") === "return"
    const leadId = url.searchParams.get("lead_id")

    if (isLeadReturn && leadId) {
      const toastId = toast.loading("Vérification du paiement direct et déblocage du dossier...")

      fetch(`/api/partners/leads/${encodeURIComponent(leadId)}/check-payment`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "paid" && data.lead) {
            toast.success("Dossier débloqué avec succès par paiement direct ! Coordonnées ajoutées à votre CRM.", { id: toastId })
            const purchaseRecord = {
              id: data.lead.id,
              lead_id: data.lead.id,
              purchase_id: data.purchaseId || data.purchase?.id || `purch_${Date.now()}`,
              purchased_at: data.purchase?.purchased_at || new Date().toISOString(),
              credits_spent: data.purchase?.credits_spent || (data.lead.segment === "B2B" ? 9 : 3),
              pipeline_status: data.purchase?.pipeline_status || "to_contact",
              first_name: data.lead.first_name || "Prospect",
              last_name: data.lead.last_name || "",
              company: data.lead.company || null,
              email: data.lead.email || "—",
              phone: data.lead.phone || "—",
              site_address: data.lead.site_address || `${data.lead.city || ""} (${data.lead.postal_code || ""})`,
              segment: data.lead.segment,
              province: data.lead.province,
              city: data.lead.city,
              postal_code: data.lead.postal_code,
              surface_area: data.lead.surface_area,
              annual_electricity_bill: data.lead.annual_electricity_bill,
            }
            setMarketplace((prev) => prev.filter((item) => item.id !== leadId))
            setPortfolio((prev) => [purchaseRecord, ...prev])
            if (typeof data.newCredits === "number") {
              setCredits(data.newCredits)
            }
            setActiveTab("portfolio")
          } else if (data.status === "cancelled") {
            toast.error("Le paiement direct a été interrompu ou refusé.", { id: toastId })
          } else {
            toast.info("Paiement direct en cours de confirmation bancaire. Votre dossier sera activé automatiquement sous peu.", { id: toastId })
          }
        })
        .catch((err) => {
          console.error("Check lead payment error:", err)
          toast.dismiss(toastId)
        })
        .finally(() => {
          try {
            url.searchParams.delete("lead_payment")
            url.searchParams.delete("lead_id")
            window.history.replaceState({}, "", url.pathname)
          } catch {
            /* ignore */
          }
        })
    }
  }, [])

  return (
    <div className={`min-h-screen ${isFocusedLeadView ? "bg-[var(--aegis-canvas)]" : "bg-background"}`}>
      {/* ── 1. Topbar Applicative Unique ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-15 md:h-16 max-w-[1720px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          {/* Gauche : Logo Aegis + Navigation par Onglets Intégrés (Desktop) */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <Link
              href="/"
              className="relative h-11 w-[108px] min-[360px]:h-12 min-[360px]:w-[128px] sm:h-12 sm:w-40 md:h-13 md:w-36 lg:w-44 shrink-0 transition-opacity hover:opacity-90"
              title="Retour au site Aegis Solaire"
            >
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                sizes="(max-width: 640px) 140px, 180px"
                className="object-contain object-left"
                priority
              />
            </Link>

            {/* Navigation Tabs Intégrée (Hiérarchie chirurgicale anti-collision : Market & CRM dès md, Expert dès xl, Outils dès 2xl) */}
            <nav aria-label="Espaces du portail" className="hidden md:flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleSelectTab("marketplace", "topbar")}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "marketplace"
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
              >
                <Store className="h-4 w-4 text-accent shrink-0" />
                <span className="whitespace-nowrap font-bold">Marketplace</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] font-mono font-bold tabular-nums shrink-0 ${activeTab === "marketplace"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary text-foreground"
                    }`}
                >
                  {marketplace.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab("portfolio", "topbar")}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "portfolio"
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
              >
                <Briefcase className="h-4 w-4 text-accent shrink-0" />
                <span className="whitespace-nowrap font-bold">Mon CRM</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] font-mono font-bold tabular-nums shrink-0 ${activeTab === "portfolio"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary text-foreground"
                    }`}
                >
                  {portfolio.length}
                </span>
              </button>

              {/* Raccourci Aide Expert & Étude (Visible uniquement dès xl >= 1280px pour garantir 0 collision à 768-1200px) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedLeadForExpert(null)
                  setIsExpertOpen(true)
                }}
                className="hidden xl:inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                title="Demander l'aide d'un expert Aegis Solaire (étude de marché, dimensionnement, rentabilité B2B)"
                aria-label="Aide Expert"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="whitespace-nowrap">Aide Expert</span>
                <span className="hidden 2xl:inline rounded bg-accent/20 text-accent font-mono text-[9px] px-1 py-0.2 uppercase font-extrabold tracking-wider">
                  Inclus
                </span>
              </button>

              {/* Raccourcis Outils Complémentaires */}
              <button
                type="button"
                onClick={() => setIsPrefsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Gérer mes alertes e-mail et fréquences"
              >
                <Bell className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="hidden md:inline">Alertes</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReferralOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Parrainer un confrère RESCERT (+3 crédits offerts chacun)"
              >
                <Users2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="hidden lg:inline">Parrainage</span>
                <span className="hidden xl:inline rounded bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] font-mono tabular-nums text-[10px] px-1.5 py-0.2 font-bold">
                  +3 cr.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsToolsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Récupérer mon badge RESCERT Vérifié & Calculateur DPI 40 %"
              >
                <Award className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="hidden lg:inline">Badge &amp; Outils</span>
              </button>

              <Link
                href="/partenaires/dashboard/credits"
                className="hidden 2xl:inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all whitespace-nowrap shrink-0"
                title="Historique des factures et achats de packs"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Factures</span>
              </Link>
            </nav>
          </div>

          {/* Droite : Badge Statut, Solde Portefeuille & Outils Mobile / Déconnexion */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Badge de statut partenaire (Affiché dès xl >= 1280px pour protéger l'espace des onglets) */}
            <div
              className="hidden xl:inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground whitespace-nowrap shrink-0"
              title="Compte installateur vérifié RESCERT"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold truncate max-w-[140px]">
                {initialPartner?.segment === "B2B" ? "Partenaire B2B" : "Artisan Agréé"}
              </span>
            </div>

            {/* Composant Unique du Portefeuille (Coins + Montant + CTA Recharger) */}
            <button
              type="button"
              onClick={() => openCreditsModal("topbar")}
              className="flex items-center gap-1.5 sm:gap-2 min-h-[38px] sm:min-h-0 rounded-full sm:rounded-xl border border-accent/30 bg-accent/10 hover:bg-accent/15 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Gérer mes crédits de déblocage"
              aria-label={`Solde ${credits} crédits, recharger`}
            >
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
              <span className="font-mono tabular-nums text-foreground">{credits}</span>
              <span className="hidden sm:inline text-muted-foreground font-normal">crédits</span>
              <span className="rounded-full sm:rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-[10px] font-bold tracking-tight">
                <span className="hidden sm:inline">+ Recharger</span>
                <span className="sm:hidden">+</span>
              </span>
            </button>

            {/* Raccourci Alertes & Auto-Pilot (Mobile uniquement) */}
            <button
              type="button"
              onClick={() => setIsPrefsOpen(true)}
              className="md:hidden relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
              aria-label="Alertes et Auto-Pilot"
              title="Alertes et Auto-Pilot"
            >
              <Bell className="h-4.5 w-4.5 text-accent" />
              {initialPartner?.auto_buy_enabled && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-card" />
              )}
            </button>

            {/* Menu Outils & Compte (Mobile uniquement) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
              aria-label="Menu compte et outils"
              title="Menu compte et outils"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            {/* Menu déconnexion compact (Desktop uniquement — déplacé dans le menu mobile sur smartphone) */}
            <form action="/api/partners/logout" method="POST" className="hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="h-8 w-8 sm:w-auto p-0 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap shrink-0"
                title="Déconnexion de l'espace partenaire"
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Quitter</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* ── 2. Contenu Principal ── */}
      <main
        className={
          isFocusedLeadView
            ? "pb-[calc(9.5rem+env(safe-area-inset-bottom))] min-[900px]:pb-12"
            : "mx-auto max-w-[1720px] px-3 py-3 sm:px-6 sm:py-6 lg:px-8 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8"
        }
      >
        {/* En-tête Institutionnel avec H1 Unique (masqué en vue fiche dossier ciblée qui porte son propre H1 localité) */}
        {!isFocusedLeadView && (
          <div className="mb-3 md:mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 md:gap-4 border-b border-border/80 pb-2.5 md:pb-4">
            <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
              <div className="hidden md:flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
                  RÉSEAU OFFICIEL · INSTALLATEURS WALLONIE
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Flux Direct
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <h1 className="text-[18px] leading-tight sm:text-2xl lg:text-3xl font-heading font-extrabold tracking-tight text-foreground truncate min-w-0">
                  {activeTab === "marketplace" ? (
                    <>
                      <span className="min-[350px]:hidden">Marketplace</span>
                      <span className="hidden min-[350px]:inline">Marketplace des Chantiers</span>
                    </>
                  ) : (
                    <>
                      <span className="min-[350px]:hidden">Mon CRM</span>
                      <span className="hidden min-[350px]:inline">Portefeuille &amp; Suivi CRM</span>
                    </>
                  )}
                </h1>
                <span className="md:hidden inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-700 whitespace-nowrap shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Direct</span>
                </span>
              </div>
              <p className="hidden md:block text-sm text-muted-foreground">
                {activeTab === "marketplace"
                  ? "Projets solaires qualifiés en Wallonie : fiches techniques détaillées, puissance kWc et coordonnées directes vérifiées."
                  : "Dossiers débloqués, coordonnées complètes des décideurs et suivi des relances."}
              </p>
            </div>

            {activeTab === "marketplace" && (
              <button
                type="button"
                onClick={() => setIsReferralOpen(true)}
                className="hidden lg:flex rounded-2xl border border-border bg-card hover:border-accent/50 p-3.5 shadow-xs items-center justify-between gap-3.5 max-w-md shrink-0 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]">
                    <Users2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        Parrainez un confrère RESCERT
                      </h3>
                      <span className="rounded bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 shrink-0">
                        +3 cr. chacun
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Offert dès son 1er achat payant · Toute la Wallonie &amp; Bruxelles.
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-accent shrink-0" />
              </button>
            )}
          </div>
        )}

        {activeTab === "marketplace" ? (
          <MarketplaceFeedView
            leads={marketplace}
            recentlyClosedLeads={initialRecentlyClosedLeads}
            partnerCredits={credits}
            hasValidMandate={initialPartner?.mollie_mandate_status === "valid"}
            targetLeadId={activeTargetLeadId}
            targetedClosedLead={targetedClosedLead}
            targetedPurchasedLead={targetedPurchasedLead}
            initialCheckoutDirect={initialCheckoutDirect}
            partnerProvinces={initialPartner?.target_provinces}
            partnerSegment={initialPartner?.segment}
            onClearTargetLead={() => setActiveTargetLeadId(undefined)}
            onOpenCrm={() => {
              setActiveTargetLeadId(undefined)
              handleSelectTab("portfolio", "focused_lead_crm")
            }}
            onPurchaseSuccess={(purchasedLead, newCredits, newPurchaseRecord) => {
              setCredits(newCredits)
              setMarketplace((prev) => prev.filter((item) => item.id !== purchasedLead.id))
              setPortfolio((prev) => [newPurchaseRecord, ...prev])
              if (!activeTargetLeadId) {
                setActiveTab("portfolio")
              }
            }}
            onRequestTopUp={() => openCreditsModal("marketplace")}
            onOpenAlertPreferences={() => setIsPrefsOpen(true)}
            onOpenExpertModal={(lead) => {
              setSelectedLeadForExpert(lead || null)
              setIsExpertOpen(true)
            }}
            onOpenReferral={() => setIsReferralOpen(true)}
          />
        ) : (
          <CrmPortfolioView
            purchases={portfolio}
            onUpdateStatus={handleUpdatePipelineStatus}
            onOpenDispute={(purchase) => setDisputePurchase(purchase)}
            onExploreMarketplace={() => setActiveTab("marketplace")}
            onOpenExpertModal={(lead) => {
              setSelectedLeadForExpert(lead || null)
              setIsExpertOpen(true)
            }}
          />
        )}
      </main>

      {/* ── 3. Barre de Navigation Basse Mobile (Mobile Bottom Navigation Bar) ── */}
      <nav
        aria-label="Navigation mobile"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] [padding-bottom:env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4 h-[60px] max-w-lg mx-auto">
          {/* Tab 1: Marketplace */}
          <button
            type="button"
            onClick={() => {
              setActiveTargetLeadId(undefined)
              handleSelectTab("marketplace", "mobile_nav")
            }}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === "marketplace"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {activeTab === "marketplace" && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
            )}
            <div className="relative">
              <Store className={`h-5 w-5 ${activeTab === "marketplace" ? "text-primary" : "text-muted-foreground"}`} />
              {marketplace.length > 0 && (
                <span className="absolute -top-1 -right-2.5 rounded-full bg-accent text-accent-foreground px-1 py-0.2 text-[10px] font-mono font-bold tabular-nums shadow-2xs leading-tight">
                  {marketplace.length}
                </span>
              )}
            </div>
            <span>Chantiers</span>
          </button>

          {/* Tab 2: Mon CRM */}
          <button
            type="button"
            onClick={() => handleSelectTab("portfolio", "mobile_nav")}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] font-semibold transition-colors cursor-pointer ${activeTab === "portfolio"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {activeTab === "portfolio" && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
            )}
            <div className="relative">
              <Briefcase className={`h-5 w-5 ${activeTab === "portfolio" ? "text-primary" : "text-muted-foreground"}`} />
              {portfolio.length > 0 && (
                <span className="absolute -top-1 -right-2.5 rounded-full bg-primary text-primary-foreground px-1 py-0.2 text-[10px] font-mono font-bold tabular-nums shadow-2xs leading-tight">
                  {portfolio.length}
                </span>
              )}
            </div>
            <span>Mon CRM</span>
          </button>

          {/* Tab 3: Crédits */}
          <button
            type="button"
            onClick={() => openCreditsModal("mobile_nav")}
            className="relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <div className="relative">
              <Coins className="h-5 w-5 text-accent" />
            </div>
            <span>Crédits</span>
          </button>

          {/* Tab 4: Aide Expert */}
          <button
            type="button"
            onClick={() => {
              setSelectedLeadForExpert(null)
              setIsExpertOpen(true)
            }}
            className="relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="h-5 w-5 text-accent" />
            <span>Expert</span>
          </button>
        </div>
      </nav>

      {/* ── 3b. Menu Compte & Outils Mobile (Bottom Sheet) ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex items-end bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileMenuOpen(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-account-sheet-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[85dvh] flex flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="shrink-0 px-4 pt-2 pb-3 border-b border-border bg-card">
              <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] px-2 py-0.5 text-[11px] font-semibold">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>{initialPartner?.segment === "B2B" ? "Partenaire B2B" : "Artisan Agréé RESCERT"}</span>
                    </span>
                  </div>
                  <h2 id="mobile-account-sheet-title" className="mt-1.5 text-base font-bold text-foreground truncate">
                    {initialPartner?.company_name || "Espace Installateur"}
                  </h2>
                  {initialPartner?.email && (
                    <p className="font-mono text-xs text-muted-foreground truncate">
                      {initialPartner.email}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
                  aria-label="Fermer le menu compte"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsReferralOpen(true)
                }}
                className="w-full min-h-[52px] flex items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-secondary/50 px-3.5 py-2.5 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]">
                    <Users2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">Parrainage RESCERT</span>
                      <span className="rounded bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5">
                        +3 cr. chacun
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground block">
                      Inviter un confrère wallon ou bruxellois
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsPrefsOpen(true)
                }}
                className="w-full min-h-[52px] flex items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-secondary/50 px-3.5 py-2.5 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Bell className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-foreground block">Alertes &amp; Auto-Pilot</span>
                    <span className="text-xs text-muted-foreground block">
                      Provinces, seuils kWc et fréquence e-mails
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setIsToolsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Récupérer mon badge RESCERT Vérifié & Calculateur DPI 40 %"
              >
                <Award className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="hidden lg:inline">Badge &amp; Outils</span>
              </button>

              <Link
                href="/partenaires/dashboard/credits"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full min-h-[52px] flex items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-secondary/50 px-3.5 py-2.5 text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-foreground block">Crédits &amp; Factures</span>
                    <span className="text-xs text-muted-foreground block">
                      Packs dégressifs (-24 %) et historique
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsToolsOpen(true)
                }}
                className="w-full min-h-[52px] flex items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-secondary/50 px-3.5 py-2.5 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-foreground block">Badge RESCERT &amp; DPI 40 %</span>
                    <span className="text-xs text-muted-foreground block">
                      Widget site web + Note CFO PDF marque blanche
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setSelectedLeadForExpert(null)
                  setIsExpertOpen(true)
                }}
                className="w-full min-h-[52px] flex items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-secondary/50 px-3.5 py-2.5 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-foreground block">Aide Expert &amp; Étude</span>
                    <span className="text-xs text-muted-foreground block">
                      Dimensionnement, GRD et closing B2B
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </div>

            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <form action="/api/partners/logout" method="POST">
                <Button
                  variant="outline"
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl text-sm font-semibold text-foreground border-border hover:bg-secondary cursor-pointer gap-2"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  <span>Déconnexion de l&apos;espace partenaire</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Modales chargées à la demande uniquement ── */}
      {disputePurchase && (
        <DisputeClaimModal
          purchase={disputePurchase}
          disputesSuspended={Boolean(initialPartner?.disputes_suspended)}
          disputesSuspendedReason={initialPartner?.disputes_suspended_reason ?? null}
          onSuccess={(createdDispute) => {
            setPortfolio((prev) =>
              prev.map((item) =>
                item.purchase_id === createdDispute.purchase_id
                  ? {
                    ...item,
                    dispute_id: createdDispute.id,
                    dispute_status: createdDispute.status,
                  }
                  : item
              )
            )
          }}
          onClose={() => setDisputePurchase(null)}
        />
      )}
      {isPrefsOpen && (
        <AlertPreferencesModal
          partner={initialPartner}
          onClose={() => setIsPrefsOpen(false)}
        />
      )}
      {isCreditsOpen && (
        <CreditPacksModal
          partner={initialPartner}
          onClose={() => setIsCreditsOpen(false)}
        />
      )}
      {isExpertOpen && (
        <ExpertStudyModal
          partner={initialPartner}
          purchases={portfolio}
          initialLead={selectedLeadForExpert}
          onClose={() => {
            setIsExpertOpen(false)
            setSelectedLeadForExpert(null)
          }}
        />
      )}
      {isReferralOpen && (
        <PartnerReferralModal
          partner={initialPartner}
          onClose={() => setIsReferralOpen(false)}
        />
      )}
      {isToolsOpen && (
        <PartnerToolsBadgeModal
          partner={initialPartner}
          onClose={() => setIsToolsOpen(false)}
        />
      )}
    </div>
  )
}
