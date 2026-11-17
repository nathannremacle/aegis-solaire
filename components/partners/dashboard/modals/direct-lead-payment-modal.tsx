"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  X,
  ShieldCheck,
  Check,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  calculateLeadDirectFinancials,
  B2C_EXCLUSIVE_CREDIT_COST,
  B2C_EXCLUSIVE_PRICE_EUR,
} from "@/lib/credit-pricing"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { getLeadLocationInfo } from "@/lib/lead-display-helpers"
import { toast } from "sonner"

interface DirectLeadPaymentModalProps {
  lead: any
  isOpen: boolean
  onClose: () => void
  onSwitchToCredits?: (exclusive?: boolean) => void
  onOneClickSuccess?: (lead: any, purchaseData: any) => void
  partnerCredits?: number
  initialExclusive?: boolean
  hasValidMandate?: boolean
}

const ACCEPTED_PAYMENT_METHODS = [
  "Bancontact",
  "Payconiq QR",
  "Visa / Mastercard",
  "Belfius",
  "KBC / CBC",
] as const

function formatEurDecimal(amount: number): string {
  return amount.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPowerKwc(kwc: number): string {
  return `${kwc.toLocaleString("fr-BE", {
    minimumFractionDigits: kwc % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })} kWc`
}

export function DirectLeadPaymentModal({
  lead,
  isOpen,
  onClose,
  onSwitchToCredits,
  onOneClickSuccess,
  partnerCredits = 0,
  initialExclusive = false,
  hasValidMandate = false,
}: DirectLeadPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exclusiveMode, setExclusiveMode] = useState(initialExclusive)
  const [enableOneClick, setEnableOneClick] = useState(false)

  useEffect(() => {
    setExclusiveMode(Boolean(initialExclusive))
  }, [initialExclusive, isOpen, lead?.id])

  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setLoading(false)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        if (!loading) onClose()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown, true)

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, loading, onClose])

  if (!isOpen || !lead) return null

  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const takenSlots = lead.taken_slots ?? Math.max(0, maxSlots - remainingSlots)
  const canBuyExclusive = !isB2B && takenSlots === 0 && maxSlots > 1
  const isExclusive = canBuyExclusive && exclusiveMode
  const cost = lead.credit_cost ?? (isB2B ? 9 : 3)
  const activeCost = isExclusive ? B2C_EXCLUSIVE_CREDIT_COST : cost
  const hasEnoughCredits = partnerCredits >= activeCost

  const location = getLeadLocationInfo(lead)
  const leadRefCode = lead.id ? String(lead.id).slice(0, 8).toUpperCase() : "SOLAIRE"

  const standardFinancials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: cost,
  })

  const financials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: cost,
    exclusive: isExclusive,
  })

  const rawSurface = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
  const rawAnnualBill = Math.max(
    0,
    Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0
  )

  const projectFinancials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea: rawSurface,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: rawAnnualBill,
    creditCost: cost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details ?? lead.message,
    qualificationMetadata: lead.qualification_metadata,
  })

  const displaySurface = projectFinancials.normalizedSurfaceAreaM2 || rawSurface
  const displayBill = projectFinancials.normalizedAnnualBill || rawAnnualBill
  const minContractStr = projectFinancials.estimatedContractValueRange.min.toLocaleString("fr-BE")
  const maxContractStr = projectFinancials.estimatedContractValueRange.max.toLocaleString("fr-BE")

  const availabilityText = isB2B
    ? "Exclusivité B2B · 1 seul installateur"
    : `${remainingSlots} ${remainingSlots > 1 ? "places disponibles" : "place disponible"} sur ${maxSlots}`

  const availabilityBadgeStyle =
    !isB2B && remainingSlots <= 1
      ? "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)]"
      : "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]"

  const priceHtvaLabel = `${formatEurDecimal(financials.priceHtva)} € HT`
  const vatAmountLabel = `+ ${formatEurDecimal(financials.vatAmount)} €`
  const priceTtcLabel = `${formatEurDecimal(financials.priceTtc)} € TTC`

  const handleProceedToPayment = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/partners/leads/${lead.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exclusive: isExclusive,
          enableOneClick,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible d'initier la session de paiement direct.")
      }

      if (data.checkoutUrl) {
        // Redirection vers la page sécurisée Mollie (Bancontact, Carte, Payconiq)
        window.location.href = data.checkoutUrl
      } else {
        throw new Error("Lien de paiement sécurisé non reçu.")
      }
    } catch (err: any) {
      console.error("[Direct Lead Checkout Error]", err)
      setError(err.message || "Erreur de connexion au service bancaire.")
      toast.error(err.message || "Impossible d'initier le paiement direct.")
      setLoading(false)
    }
  }

  const handleOneClickCharge = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/partners/leads/${lead.id}/one-click-buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exclusive: isExclusive }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible de débiter votre mandat 1-clic.")
      }
      if (data.status === "paid") {
        toast.success("Dossier débloqué en 1 clic ! Coordonnées ajoutées à votre CRM.")
        onOneClickSuccess?.(lead, data)
        onClose()
      } else {
        toast.info(
          data.message || "Prélèvement SEPA initié. Le dossier sera débloqué dès confirmation."
        )
        onClose()
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du paiement 1-clic.")
      toast.error(err.message || "Impossible de finaliser le paiement 1-clic.")
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-pay-dialog-title"
      aria-describedby="direct-pay-dialog-desc"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full sm:max-w-[540px] max-h-[94dvh] sm:max-h-[92dvh] overflow-hidden rounded-t-[14px] sm:rounded-[14px] border-t sm:border border-[var(--aegis-border)] bg-[var(--aegis-surface)] text-[var(--aegis-ink)] shadow-xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* ── 1. En-tête fixe du dialogue ── */}
        <header className="shrink-0 border-b border-[var(--aegis-divider)] bg-[var(--aegis-surface)] px-4 pt-2 pb-2.5 sm:px-6 sm:pt-4 sm:pb-3.5">
          <div
            className="sm:hidden mx-auto mb-1.5 h-1 w-9 rounded-full bg-[var(--aegis-border)]"
            aria-hidden="true"
          />

          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] sm:text-[13px] font-semibold text-[var(--aegis-context)] whitespace-nowrap">
              Paiement à l&apos;unité
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[12px] tabular-nums text-[var(--aegis-muted)] whitespace-nowrap">
                Dossier #{leadRefCode}
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--aegis-muted)] hover:bg-[var(--aegis-surface-subtle)] hover:text-[var(--aegis-ink)] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                aria-label="Fermer la fenêtre de paiement"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <h2
            id="direct-pay-dialog-title"
            className="mt-0.5 text-[19px] sm:text-[22px] font-bold leading-[1.2] tracking-[-0.025em] text-[var(--aegis-ink)]"
          >
            Déblocage · <span className="font-mono tabular-nums">{location.fullTitle}</span>
          </h2>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
              id="direct-pay-dialog-desc"
              className="text-[12.5px] sm:text-[13px] text-[var(--aegis-muted)]"
            >
              {location.provinceLabel} · {isB2B ? "Projet B2B" : "Résidentiel B2C"}
            </span>
            <span
              className={`inline-flex items-center rounded-[5px] px-2 py-0.5 text-[11px] font-bold tabular-nums ${availabilityBadgeStyle}`}
            >
              {availabilityText}
            </span>
          </div>
        </header>

        {/* ── 2. Corps déroulant (div interne bloque le flex-shrink des sections) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-2.5 sm:gap-3.5">
            {/* Bloc A : Synthèse chiffrée & contenu débloqué */}
            <section className="rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-summary)] overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[var(--aegis-divider)]">
                <div className="p-2.5 sm:p-3.5 min-w-0">
                  <span className="block text-[11.5px] sm:text-[12px] text-[var(--aegis-muted)] leading-[1.35]">
                    Puissance estimée
                  </span>
                  <strong className="mt-0.5 block text-[16px] sm:text-[18px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--aegis-ink)] font-mono tabular-nums whitespace-nowrap">
                    {projectFinancials.estimatedPowerKwc > 0
                      ? `~${formatPowerKwc(projectFinancials.estimatedPowerKwc)}`
                      : "À dimensionner"}
                  </strong>
                </div>

                <div className="p-2.5 sm:p-3.5 min-w-0">
                  <span className="block text-[11.5px] sm:text-[12px] text-[var(--aegis-muted)] leading-[1.35]">
                    Devis estimé
                  </span>
                  <strong className="mt-0.5 block text-[14.5px] sm:text-[16.5px] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--aegis-ink)] font-mono tabular-nums">
                    {minContractStr} à{" "}
                    <span className="whitespace-nowrap">{maxContractStr} € HT</span>
                  </strong>
                </div>
              </div>

              <div className="border-t border-[var(--aegis-divider)] bg-[var(--aegis-surface)] px-3 sm:px-3.5 py-2 sm:py-2.5 flex flex-col gap-1">
                {(displaySurface > 0 || displayBill > 0) && (
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] sm:text-[12.5px] text-[var(--aegis-muted)]">
                    {displaySurface > 0 && (
                      <span className="whitespace-nowrap">
                        Toiture :{" "}
                        <strong className="font-mono tabular-nums font-semibold text-[var(--aegis-ink)]">
                          {displaySurface.toLocaleString("fr-BE")} m²
                        </strong>
                      </span>
                    )}
                    {displaySurface > 0 && displayBill > 0 && (
                      <span className="text-[var(--aegis-muted)]" aria-hidden="true">
                        ·
                      </span>
                    )}
                    {displayBill > 0 && (
                      <span className="whitespace-nowrap">
                        Facture :{" "}
                        <strong className="font-mono tabular-nums font-semibold text-[var(--aegis-ink)]">
                          {displayBill.toLocaleString("fr-BE")} €/an
                        </strong>
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start gap-1.5 text-[12px] sm:text-[12.5px] leading-[1.4] text-[var(--aegis-ink)]">
                  <Check
                    className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--aegis-availability-text)]"
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                  <span>
                    Inclus : nom, téléphone, e-mail, adresse exacte et ajout au CRM.
                  </span>
                </div>
              </div>
            </section>

            {/* Option Mode Partagé vs Exclusivité Totale B2C */}
            {canBuyExclusive && (
              <section
                aria-label="Option Exclusivité Totale"
                className="rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-3 flex flex-col gap-2"
              >
                <span className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--aegis-muted)]">
                  Choisissez votre niveau de concurrence
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExclusiveMode(false)}
                    className={`rounded-[7px] border p-2.5 text-left transition-colors cursor-pointer ${
                      !isExclusive
                        ? "border-[var(--aegis-ink)] bg-[var(--aegis-summary)]"
                        : "border-[var(--aegis-border)] hover:bg-[var(--aegis-surface-subtle)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold text-[var(--aegis-ink)]">
                        Partagé (max {maxSlots})
                      </span>
                      <span className="font-mono text-[12px] font-bold tabular-nums text-[var(--aegis-ink)]">
                        {formatEurDecimal(standardFinancials.priceHtva)} € HT
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--aegis-muted)] leading-snug">
                      {cost} crédits · Jusqu&apos;à {maxSlots} installateurs.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExclusiveMode(true)}
                    className={`rounded-[7px] border p-2.5 text-left transition-colors cursor-pointer ${
                      isExclusive
                        ? "border-emerald-700 bg-emerald-50/70"
                        : "border-[var(--aegis-border)] hover:bg-[var(--aegis-surface-subtle)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-bold text-emerald-900">
                        Exclusivité 100 %
                      </span>
                      <span className="font-mono text-[12px] font-bold tabular-nums text-emerald-800">
                        {formatEurDecimal(B2C_EXCLUSIVE_PRICE_EUR)} € HT
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-emerald-800/85 leading-snug">
                      {B2C_EXCLUSIVE_CREDIT_COST} crédits · 0 concurrent + e-mail prioritaire au prospect.
                    </p>
                  </button>
                </div>
              </section>
            )}

            {/* Bloc B : Décompte comptable B2B */}
            <section
              aria-label="Décompte comptable B2B"
              className="rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] overflow-hidden"
            >
              <div className="px-3.5 py-1.5 sm:px-4">
                <div className="py-1.5 flex items-baseline justify-between gap-3 border-b border-[var(--aegis-divider)]">
                  <span className="text-[12.5px] sm:text-[13px] text-[var(--aegis-muted)] min-w-0">
                    {isExclusive
                      ? "Déblocage Exclusivité Totale B2C (0 concurrent)"
                      : "Déblocage de contact qualifié"}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right font-mono text-[13.5px] sm:text-[14px] font-semibold tabular-nums text-[var(--aegis-ink)]">
                    {priceHtvaLabel}
                  </span>
                </div>

                <div className="py-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] sm:text-[13px] text-[var(--aegis-muted)] min-w-0">
                    TVA belge déductible (<span className="font-mono tabular-nums">21 %</span>)
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right font-mono text-[13.5px] sm:text-[14px] font-medium tabular-nums text-[var(--aegis-ink)]">
                    {vatAmountLabel}
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--aegis-border)] bg-[var(--aegis-summary)] px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[13.5px] sm:text-[14px] font-bold leading-[1.3] text-[var(--aegis-ink)]">
                    Total à régler
                  </span>
                  <span className="block text-[11.5px] sm:text-[12px] leading-[1.35] text-[var(--aegis-muted)]">
                    Justificatif B2B acquitté envoyé par e-mail
                  </span>
                </div>

                <strong className="shrink-0 whitespace-nowrap text-right font-mono text-[19px] sm:text-[22px] font-bold leading-[1.15] tracking-[-0.025em] tabular-nums text-[var(--aegis-ink)]">
                  {priceTtcLabel}
                </strong>
              </div>
            </section>

            {/* Bloc C : Moyens de paiement Mollie & Garantie conformité */}
            <section className="rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-2.5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-semibold text-[var(--aegis-ink)]">
                    <Lock
                      className="h-3.5 w-3.5 shrink-0 text-[var(--aegis-context)]"
                      aria-hidden="true"
                    />
                    <span>Paiement sécurisé Mollie</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded-[4px] bg-[var(--aegis-availability-bg)] px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-[var(--aegis-availability-text)]">
                    SSL 256-bit
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {ACCEPTED_PAYMENT_METHODS.map((method) => (
                    <span
                      key={method}
                      className="rounded-[5px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] px-2 py-0.5 text-[11px] sm:text-[11.5px] font-medium text-[var(--aegis-ink)] whitespace-nowrap"
                    >
                      {method}
                    </span>
                  ))}
                </div>

                {!hasValidMandate && (
                  <label className="mt-1 flex items-start gap-2 rounded-[6px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] px-2.5 py-2 text-[11.5px] text-[var(--aegis-ink)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableOneClick}
                      onChange={(e) => setEnableOneClick(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 accent-[var(--aegis-ink)] rounded cursor-pointer"
                    />
                    <span className="leading-snug">
                      Mémoriser mon moyen de paiement chez Mollie pour activer le déblocage en{" "}
                      <strong>1 clic</strong> (et l&apos;Auto-Pilot si souhaité).
                    </span>
                  </label>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--aegis-divider)] flex items-start gap-2 text-[11.5px] sm:text-[12px] leading-[1.4] text-[var(--aegis-muted)]">
                <ShieldCheck
                  className="h-4 w-4 shrink-0 mt-0.5 text-[var(--aegis-context)]"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-[var(--aegis-ink)]">
                    Garantie conformité :
                  </strong>{" "}
                  numéro erroné ou prospect injoignable après{" "}
                  <span className="font-mono tabular-nums font-medium text-[var(--aegis-ink)]">
                    3
                  </span>{" "}
                  tentatives, signalé sous{" "}
                  <span className="font-mono tabular-nums font-medium text-[var(--aegis-ink)]">
                    7 jours
                  </span>{" "}
                  ouvrés, recrédité sous{" "}
                  <span className="font-mono tabular-nums font-medium text-[var(--aegis-ink)]">
                    24 h
                  </span>{" "}
                  ouvrées.
                </span>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[8px] border border-[var(--aegis-danger-text)]/25 bg-[var(--aegis-danger-bg)] px-3.5 py-2.5 text-[12.5px] sm:text-[13px] leading-[1.4] text-[var(--aegis-danger-text)]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Pied d'action fixe (toujours accessible sur mobile) ── */}
        <footer className="shrink-0 border-t border-[var(--aegis-divider)] bg-[var(--aegis-surface)] px-4 pt-3 pb-3 sm:px-6 sm:py-4 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
          {hasValidMandate && (
            <button
              type="button"
              disabled={loading}
              onClick={handleOneClickCharge}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-[6px] bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 px-4 py-2.5 text-[14px] font-bold text-white cursor-pointer transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>
                Débloquer en 1 clic ({priceTtcLabel})
              </span>
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={handleProceedToPayment}
            className="w-full min-h-[46px] sm:min-h-[48px] inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-[6px] bg-[var(--aegis-ink)] hover:bg-[var(--aegis-primary-hover)] disabled:opacity-60 px-3 sm:px-4 py-2.5 text-[14px] sm:text-[15px] font-bold text-white whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                <span>Redirection bancaire sécurisée…</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 shrink-0 opacity-90" aria-hidden="true" />
                <span>
                  Régler{" "}
                  <span className="font-mono tabular-nums whitespace-nowrap">
                    {priceTtcLabel}
                  </span>{" "}
                  &amp; débloquer
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </>
            )}
          </button>

          {onSwitchToCredits &&
            (hasEnoughCredits ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  onClose()
                  onSwitchToCredits(isExclusive)
                }}
                className="w-full py-0.5 text-center text-[12.5px] sm:text-[13px] font-semibold text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] cursor-pointer disabled:opacity-50 rounded-[5px] focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
              >
                Utiliser mes crédits (
                <span className="font-mono tabular-nums">{financials.credits}</span> sur{" "}
                <span className="font-mono tabular-nums">{partnerCredits}</span> disponibles)
              </button>
            ) : (
              <p className="text-center text-[12px] sm:text-[12.5px] text-[var(--aegis-muted)] leading-[1.4]">
                Vous préférez recharger à tarif dégressif (-24 %) ?{" "}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    onClose()
                    onSwitchToCredits()
                  }}
                  className="font-semibold text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] cursor-pointer disabled:opacity-50 rounded-[5px] focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                >
                  Recharger des crédits
                </button>
              </p>
            ))}
        </footer>
      </div>
    </div>
  )
}
