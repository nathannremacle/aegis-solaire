"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Coins, Store, Briefcase, Bell, Award, LogOut, FileText, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketplaceFeedView } from "./marketplace-feed-view"
import { CrmPortfolioView } from "./crm-portfolio-view"

// Code-splitting : ces 4 modales ne sont téléchargées par le navigateur qu'à la demande
const DisputeClaimModal = dynamic(() => import("./modals/dispute-claim-modal"), { ssr: false })
const AlertPreferencesModal = dynamic(() => import("./modals/alert-preferences-modal"), { ssr: false })
const CreditPacksModal = dynamic(() => import("./modals/credit-packs-modal"), { ssr: false })
const PartnerTierModal = dynamic(() => import("./modals/partner-tier-modal"), { ssr: false })

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
  // Détection si le lead ciblé a déjà été acheté
  const isAlreadyPurchased = Boolean(
    targetLeadId &&
      (initialPortfolio ?? []).some(
        (p: any) => p.id === targetLeadId || p.lead_id === targetLeadId || p.purchase_id === targetLeadId
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

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* 1. En-tête Institutionnel & Profil Installateur (Optimisé Mobile 360px+) */}
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-5 shadow-xs">
        {/* Ligne 1 : Logo Aegis + Déconnexion */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="relative h-8 w-28 sm:h-9 sm:w-36 shrink-0" title="Retour au site Aegis Solaire">
            <Image
              src="/logo.png"
              alt="Aegis Solaire"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          <form action="/api/partners/logout" method="POST">
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 cursor-pointer"
              title="Déconnexion de l'espace partenaire"
            >
              <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Quitter</span>
            </Button>
          </form>
        </div>

        {/* Ligne 2 : Identité installateur & Solde interactif */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2.5 border-t border-border/70">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-foreground">
                {initialPartner?.company_name || "Espace Partenaire Installateur"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono font-semibold text-foreground border border-border">
                <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
                {initialPartner?.segment === "B2B" ? "Partenaire B2B" : "Artisan Agréé"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marketplace de chantiers qualifiés Wallonie &amp; Suivi CRM terrain
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreditsOpen(true)}
            className="flex items-center justify-between sm:justify-start gap-2.5 rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-bold text-foreground hover:bg-accent/20 transition-colors shadow-2xs cursor-pointer w-full sm:w-auto"
            title="Gérer mes crédits de déblocage"
          >
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-accent shrink-0" />
              <span className="font-mono tabular-nums text-foreground">{credits}</span>
              <span className="text-muted-foreground font-normal">crédits</span>
            </div>
            <span className="rounded bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
              Recharger
            </span>
          </button>
        </div>
      </header>

      {/* 2. Barre de Navigation Mobile-First (Tabs 50/50 + Outils 3 colonnes) */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-2 sm:p-3 shadow-xs">
        {/* Switcher 2 onglets tactiles pleine largeur */}
        <nav aria-label="Sections du portail" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("marketplace")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "marketplace"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate">Marketplace</span>
            <span className="rounded-full bg-card/25 px-1.5 py-0.5 text-[11px] font-mono font-bold tabular-nums shrink-0">
              {marketplace.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2.5 px-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "portfolio"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate">Mon CRM</span>
            <span className="rounded-full bg-card/25 px-1.5 py-0.5 text-[11px] font-mono font-bold tabular-nums shrink-0">
              {portfolio.length}
            </span>
          </button>
        </nav>

        {/* Outils secondaires : 3 colonnes tactiles sur mobile, alignés à droite sur desktop */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:justify-end sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrefsOpen(true)}
            className="text-[11px] sm:text-xs h-9 px-2 cursor-pointer justify-center"
          >
            <Bell className="h-3.5 w-3.5 sm:mr-1.5 text-accent shrink-0" />
            <span className="truncate">Alertes</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTierOpen(true)}
            className="text-[11px] sm:text-xs h-9 px-2 cursor-pointer justify-center"
          >
            <Award className="h-3.5 w-3.5 sm:mr-1.5 text-accent shrink-0" />
            <span className="truncate">Palier</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-[11px] sm:text-xs h-9 px-2 cursor-pointer justify-center"
          >
            <Link href="/partenaires/dashboard/credits">
              <FileText className="h-3.5 w-3.5 sm:mr-1.5 text-muted-foreground shrink-0" />
              <span className="truncate">Factures</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 3. Vue active */}
      {activeTab === "marketplace" ? (
        <MarketplaceFeedView
          leads={marketplace}
          partnerCredits={credits}
          targetLeadId={targetLeadId}
          onPurchaseSuccess={(purchasedLead, newCredits, newPurchaseRecord) => {
            setCredits(newCredits)
            setMarketplace((prev) => prev.filter((item) => item.id !== purchasedLead.id))
            setPortfolio((prev) => [newPurchaseRecord, ...prev])
            setActiveTab("portfolio")
          }}
          onRequestTopUp={() => setIsCreditsOpen(true)}
        />
      ) : (
        <CrmPortfolioView
          purchases={portfolio}
          onOpenDispute={(purchase) => setDisputePurchase(purchase)}
        />
      )}

      {/* 4. Modales chargées à la demande uniquement */}
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
    </div>
  )
}
