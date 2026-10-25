"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Coins, Store, Briefcase, Bell, Award } from "lucide-react"
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Barre supérieure : Navigation Marketplace / CRM & Accès Modales */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-secondary p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("marketplace")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "marketplace"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="h-4 w-4 text-accent" />
            <span>Marketplace</span>
            <span className="rounded-full bg-card/20 px-2 py-0.5 text-xs font-mono font-bold tabular-nums">
              {marketplace.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "portfolio"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4 text-accent" />
            <span>Mon Pipeline CRM</span>
            <span className="rounded-full bg-card/20 px-2 py-0.5 text-xs font-mono font-bold tabular-nums">
              {portfolio.length}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsPrefsOpen(true)}>
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertes provinces</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsTierOpen(true)}>
            <Award className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline">Palier</span>
          </Button>
          <Button variant="accent" size="sm" onClick={() => setIsCreditsOpen(true)} className="font-bold">
            <Coins className="h-4 w-4" />
            <span className="font-mono tabular-nums">{credits} crédits</span>
            <span>• Recharger</span>
          </Button>
        </div>
      </div>

      {/* Vue active */}
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

      {/* Modales chargées à la demande uniquement */}
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
