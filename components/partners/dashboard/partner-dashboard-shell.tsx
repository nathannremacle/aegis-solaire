"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Coins, Store, Briefcase, Bell, Award, LogOut, FileText, ShieldCheck, Leaf, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketplaceFeedView } from "./marketplace-feed-view"
import { CrmPortfolioView } from "./crm-portfolio-view"

// Code-splitting : ces modales ne sont téléchargées par le navigateur qu'à la demande
const DisputeClaimModal = dynamic(() => import("./modals/dispute-claim-modal"), { ssr: false })
const AlertPreferencesModal = dynamic(() => import("./modals/alert-preferences-modal"), { ssr: false })
const CreditPacksModal = dynamic(() => import("./modals/credit-packs-modal"), { ssr: false })
const PartnerTierModal = dynamic(() => import("./modals/partner-tier-modal"), { ssr: false })
const ExpertStudyModal = dynamic(() => import("./modals/expert-study-modal"), { ssr: false })

export interface PartnerDashboardShellProps {
  initialPartner: any
  initialMarketplace: any[]
  initialPortfolio: any[]
  targetLeadId?: string
}

export function PartnerDashboardShell({
  initialPartner,
  initialMarketplace,
  initialPortfolio,
  targetLeadId,
}: PartnerDashboardShellProps) {
  const [activeTargetLeadId, setActiveTargetLeadId] = React.useState<string | undefined>(targetLeadId)

  React.useEffect(() => {
    setActiveTargetLeadId(targetLeadId)
  }, [targetLeadId])

  // Détection si le lead ciblé a déjà été acheté
  const isAlreadyPurchased = Boolean(
    activeTargetLeadId &&
      (initialPortfolio ?? []).some(
        (p: any) => p.id === activeTargetLeadId || p.lead_id === activeTargetLeadId || p.purchase_id === activeTargetLeadId
      )
  )

  const [activeTab, setActiveTab] = React.useState<"marketplace" | "portfolio">(
    isAlreadyPurchased ? "portfolio" : "marketplace"
  )
  const [credits, setCredits] = React.useState<number>(initialPartner?.credits ?? 0)
  const [marketplace, setMarketplace] = React.useState(initialMarketplace ?? [])
  const [portfolio, setPortfolio] = React.useState(initialPortfolio ?? [])

  // Modales lazy-loadées
  const [disputePurchase, setDisputePurchase] = React.useState<any | null>(null)
  const [isPrefsOpen, setIsPrefsOpen] = React.useState(false)
  const [isCreditsOpen, setIsCreditsOpen] = React.useState(false)
  const [isTierOpen, setIsTierOpen] = React.useState(false)
  const [isExpertOpen, setIsExpertOpen] = React.useState(false)
  const [selectedLeadForExpert, setSelectedLeadForExpert] = React.useState<any | null>(null)

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

  return (
    <div className="min-h-screen bg-background">
      {/* ── 1. Topbar Applicative Unique (64px) — Gain de 220px utiles dès le chargement ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-6 lg:px-8">
          {/* Gauche : Logo Aegis + Navigation par Onglets Intégrés */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            <Link
              href="/"
              className="relative h-7 w-20 sm:h-9 sm:w-32 shrink-0 transition-opacity hover:opacity-90"
              title="Retour au site Aegis Solaire"
            >
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain object-left"
                priority
              />
            </Link>

            {/* Navigation Tabs Intégrée */}
            <nav aria-label="Espaces du portail" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("marketplace")}
                className={`flex items-center gap-1 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "marketplace"
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                <span className="hidden sm:inline">Marketplace</span>
                <span className="sm:hidden text-xs">Market</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] font-mono font-bold tabular-nums shrink-0 ${
                    activeTab === "marketplace"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {marketplace.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("portfolio")}
                className={`flex items-center gap-1 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "portfolio"
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                <span className="hidden sm:inline">Mon CRM</span>
                <span className="sm:hidden text-xs">CRM</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] font-mono font-bold tabular-nums shrink-0 ${
                    activeTab === "portfolio"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {portfolio.length}
                </span>
              </button>

              {/* Raccourcis Outils */}
              <button
                type="button"
                onClick={() => setIsPrefsOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer"
                title="Gérer mes alertes e-mail et SMS"
              >
                <Bell className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>Alertes</span>
              </button>

              <Link
                href="/partenaires/dashboard/credits"
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                title="Historique des factures et achats de packs"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Factures</span>
              </Link>

              {/* Raccourci Aide Expert & Étude */}
              <button
                type="button"
                onClick={() => {
                  setSelectedLeadForExpert(null)
                  setIsExpertOpen(true)
                }}
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
                title="Demander l'aide d'un expert Aegis Solaire (étude de marché, dimensionnement, rentabilité B2B)"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="hidden sm:inline">Aide Expert</span>
                <span className="sm:hidden text-xs">Expert</span>
                <span className="hidden md:inline rounded bg-accent/20 text-accent font-mono text-[9px] px-1 py-0.2 uppercase font-extrabold tracking-wider">
                  Inclus
                </span>
              </button>
            </nav>
          </div>

          {/* Droite : Badge Statut, Solde Portefeuille & Menu Profil */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Badge de statut partenaire (cliquable vers le palier) */}
            <button
              type="button"
              onClick={() => setIsTierOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-all cursor-pointer"
              title="Consulter mon palier et mes avantages installateur"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold truncate max-w-[140px]">
                {initialPartner?.segment === "B2B" ? "Partenaire B2B" : "Artisan Agréé"}
              </span>
            </button>

            {/* Composant Unique du Portefeuille (Coins + Montant + CTA Recharger) */}
            <button
              type="button"
              onClick={() => setIsCreditsOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-accent/30 bg-accent/10 hover:bg-accent/15 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
              title="Gérer mes crédits de déblocage"
            >
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
              <span className="font-mono tabular-nums text-foreground">{credits}</span>
              <span className="hidden sm:inline text-muted-foreground font-normal">crédits</span>
              <span className="rounded-md bg-accent text-accent-foreground px-1 sm:px-1.5 py-0.5 text-[10px] font-bold tracking-tight">
                <span className="hidden sm:inline">+ Recharger</span>
                <span className="sm:hidden">+</span>
              </span>
            </button>

            {/* Menu déconnexion compact */}
            <form action="/api/partners/logout" method="POST">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="h-8 w-8 sm:w-auto p-0 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                title="Déconnexion de l'espace partenaire"
              >
                <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Quitter</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* ── 2. Contenu Principal ── */}
      <main className="mx-auto max-w-[1720px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* En-tête Institutionnel avec H1 Unique et Bannière Énergie Propre */}
        <div className="mb-5 sm:mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-xs uppercase tracking-wider text-accent font-semibold">
                RÉSEAU OFFICIEL · INSTALLATEURS WALLONIE
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Flux Direct
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold tracking-tight text-foreground">
              {activeTargetLeadId && activeTab === "marketplace"
                ? "Opportunité Solaire Ciblée"
                : activeTab === "marketplace"
                ? "Marketplace des Chantiers Photovoltaïques"
                : "Portefeuille & Suivi Commercial"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeTargetLeadId && activeTab === "marketplace"
                ? "Fiche technique d'ingénierie et accès prioritaire au chantier recommandé par e-mail."
                : activeTab === "marketplace"
                ? "Projets solaires qualifiés en Wallonie : fiches techniques détaillées, puissance kWc et coordonnées directes vérifiées."
                : "Dossiers débloqués, coordonnées complètes des décideurs et suivi des relances."}
            </p>
          </div>

          {activeTab === "marketplace" && !activeTargetLeadId && (
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-emerald-50/70 via-card to-card p-3 sm:p-3.5 shadow-xs flex items-center gap-3.5 max-w-md shrink-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="min-w-0 pr-12">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">Une énergie plus propre</h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  Ensemble pour la transition énergétique en Wallonie.
                </p>
              </div>
              <div
                className="absolute right-0 top-0 bottom-0 w-24 opacity-25 pointer-events-none bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1509391365360-2e959784a276?q=40&w=300&auto=format&fit=crop')",
                }}
              />
            </div>
          )}
        </div>

        {activeTab === "marketplace" ? (
          <MarketplaceFeedView
            leads={marketplace}
            partnerCredits={credits}
            targetLeadId={activeTargetLeadId}
            onClearTargetLead={() => setActiveTargetLeadId(undefined)}
            onPurchaseSuccess={(purchasedLead, newCredits, newPurchaseRecord) => {
              setCredits(newCredits)
              setMarketplace((prev) => prev.filter((item) => item.id !== purchasedLead.id))
              setPortfolio((prev) => [newPurchaseRecord, ...prev])
              setActiveTab("portfolio")
            }}
            onRequestTopUp={() => setIsCreditsOpen(true)}
            onOpenExpertModal={(lead) => {
              setSelectedLeadForExpert(lead || null)
              setIsExpertOpen(true)
            }}
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

      {/* ── 3. Modales chargées à la demande uniquement ── */}
      {disputePurchase && (
        <DisputeClaimModal
          purchase={disputePurchase}
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
      {isTierOpen && (
        <PartnerTierModal
          partner={initialPartner}
          onClose={() => setIsTierOpen(false)}
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
    </div>
  )
}
