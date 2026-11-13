"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Coins, Store, Briefcase, Bell, Award, LogOut, FileText, ShieldCheck, Leaf, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
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
  targetedClosedLead?: any
}

export function PartnerDashboardShell({
  initialPartner,
  initialMarketplace,
  initialPortfolio,
  targetLeadId,
  targetedClosedLead,
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
    <div className="min-h-screen bg-background">
      {/* ── 1. Topbar Applicative Unique (64px) — Gain de 220px utiles dès le chargement ── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-14 sm:h-16 max-w-[1720px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          {/* Gauche : Logo Aegis + Navigation par Onglets Intégrés (Desktop) */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <Link
              href="/"
              className="relative h-7 w-24 sm:h-9 sm:w-32 shrink-0 transition-opacity hover:opacity-90"
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

            {/* Navigation Tabs Intégrée (Hiérarchie chirurgicale anti-collision : Market & CRM dès md, Expert dès xl, Outils dès 2xl) */}
            <nav aria-label="Espaces du portail" className="hidden md:flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("marketplace")}
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
                onClick={() => setActiveTab("portfolio")}
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

              {/* Raccourcis Outils Complémentaires (Visible dès 2xl >= 1536px sur très grands écrans) */}
              <button
                type="button"
                onClick={() => setIsPrefsOpen(true)}
                className="hidden 2xl:inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Gérer mes alertes e-mail et SMS"
              >
                <Bell className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>Alertes</span>
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

          {/* Droite : Badge Statut, Solde Portefeuille & Menu Profil */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Badge de statut partenaire (Affiché dès xl >= 1280px pour protéger l'espace des onglets) */}
            <button
              type="button"
              onClick={() => setIsTierOpen(true)}
              className="hidden xl:inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-all cursor-pointer whitespace-nowrap shrink-0"
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
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-accent/30 bg-accent/10 hover:bg-accent/15 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Gérer mes crédits de déblocage"
            >
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
              <span className="font-mono tabular-nums text-foreground">{credits}</span>
              <span className="hidden sm:inline text-muted-foreground font-normal">crédits</span>
              <span className="rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 text-[10px] font-bold tracking-tight">
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
      <main className="mx-auto max-w-[1720px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 pb-24 md:pb-8">
        {/* En-tête Institutionnel avec H1 Unique et Bannière Énergie Propre */}
        <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 border-b border-border/80 pb-3 sm:pb-4">
          <div className="flex flex-col gap-1 min-w-0">
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
                ? targetedClosedLead?.id === activeTargetLeadId
                  ? "Dossier Régional Clôturé & Opportunités Disponibles"
                  : "Opportunité Solaire Ciblée"
                : activeTab === "marketplace"
                  ? "Marketplace des Chantiers Photovoltaïques"
                  : "Portefeuille & Suivi Commercial"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeTargetLeadId && activeTab === "marketplace"
                ? targetedClosedLead?.id === activeTargetLeadId
                  ? "Ce chantier a déjà atteint son quota d'attribution. Consultez le récapitulatif et les opportunités disponibles ci-dessous."
                  : "Fiche technique d'ingénierie et accès prioritaire au chantier recommandé par e-mail."
                : activeTab === "marketplace"
                  ? "Projets solaires qualifiés en Wallonie : fiches techniques détaillées, puissance kWc et coordonnées directes vérifiées."
                  : "Dossiers débloqués, coordonnées complètes des décideurs et suivi des relances."}
            </p>
          </div>

          {activeTab === "marketplace" && !activeTargetLeadId && (
            <div className="hidden xl:flex relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-emerald-50/70 via-card to-card p-3 sm:p-3.5 shadow-xs items-center gap-3.5 max-w-md shrink-0">
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
            targetedClosedLead={targetedClosedLead}
            partnerProvinces={initialPartner?.target_provinces}
            onClearTargetLead={() => setActiveTargetLeadId(undefined)}
            onPurchaseSuccess={(purchasedLead, newCredits, newPurchaseRecord) => {
              setCredits(newCredits)
              setMarketplace((prev) => prev.filter((item) => item.id !== purchasedLead.id))
              setPortfolio((prev) => [newPurchaseRecord, ...prev])
              setActiveTab("portfolio")
            }}
            onRequestTopUp={() => setIsCreditsOpen(true)}
            onOpenAlertPreferences={() => setIsPrefsOpen(true)}
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

      {/* ── 3. Barre de Navigation Basse Mobile (Mobile Bottom Navigation Bar) ── */}
      <nav
        aria-label="Navigation mobile"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-4 h-14 max-w-lg mx-auto">
          {/* Tab 1: Marketplace */}
          <button
            type="button"
            onClick={() => setActiveTab("marketplace")}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${activeTab === "marketplace"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <div className="relative">
              <Store className={`h-5 w-5 ${activeTab === "marketplace" ? "text-primary" : "text-muted-foreground"}`} />
              {marketplace.length > 0 && (
                <span className="absolute -top-1 -right-2.5 rounded-full bg-accent text-accent-foreground px-1 py-0.2 text-[9px] font-mono font-bold tabular-nums shadow-2xs">
                  {marketplace.length}
                </span>
              )}
            </div>
            <span>Marketplace</span>
          </button>

          {/* Tab 2: Mon CRM */}
          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${activeTab === "portfolio"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <div className="relative">
              <Briefcase className={`h-5 w-5 ${activeTab === "portfolio" ? "text-primary" : "text-muted-foreground"}`} />
              {portfolio.length > 0 && (
                <span className="absolute -top-1 -right-2.5 rounded-full bg-primary text-primary-foreground px-1 py-0.2 text-[9px] font-mono font-bold tabular-nums shadow-2xs">
                  {portfolio.length}
                </span>
              )}
            </div>
            <span>Mon CRM</span>
          </button>

          {/* Tab 3: Recharger */}
          <button
            type="button"
            onClick={() => setIsCreditsOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <div className="relative">
              <Coins className="h-5 w-5 text-accent" />
            </div>
            <span>Recharger</span>
          </button>

          {/* Tab 4: Aide Expert */}
          <button
            type="button"
            onClick={() => {
              setSelectedLeadForExpert(null)
              setIsExpertOpen(true)
            }}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="h-5 w-5 text-accent" />
            <span>Aide Expert</span>
          </button>
        </div>
      </nav>

      {/* ── 4. Modales chargées à la demande uniquement ── */}
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
