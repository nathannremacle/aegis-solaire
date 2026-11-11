"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  X,
  CreditCard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  Building2,
  Home,
  MapPin,
  FileText,
  AlertCircle,
  Coins,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateLeadDirectFinancials, formatEurWithDecimals } from "@/lib/credit-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { getLeadLocationInfo } from "@/lib/lead-display-helpers"
import { toast } from "sonner"

interface DirectLeadPaymentModalProps {
  lead: any
  isOpen: boolean
  onClose: () => void
  onSwitchToCredits?: () => void
  partnerCredits?: number
}

export function DirectLeadPaymentModal({
  lead,
  isOpen,
  onClose,
  onSwitchToCredits,
  partnerCredits = 0,
}: DirectLeadPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setLoading(false)
      return
    }

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
  }, [isOpen, onClose])

  if (!isOpen || !lead) return null

  const isB2B = lead.segment === "B2B"
  const location = getLeadLocationInfo(lead)
  const financials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: lead.credit_cost,
  })

  const hasEnoughCredits = partnerCredits >= financials.credits

  const handleProceedToPayment = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/partners/leads/${lead.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 overscroll-contain"
      >
        {/* Bouton de fermeture */}
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Fermer la modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Paiement Direct par Dossier (€)
            </h3>
            <p className="text-xs text-muted-foreground">
              Sans pack requis • Déblocage immédiat & coordonnées complètes
            </p>
          </div>
        </div>

        {/* Fiche récapitulative du dossier */}
        <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-background border border-border text-foreground">
              {isB2B ? <Building2 className="h-3 w-3 text-accent" /> : <Home className="h-3 w-3 text-emerald-600" />}
              <span>{isB2B ? "B2B Professionnel" : "B2C Résidentiel"}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Réf : #{lead.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-foreground font-semibold">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>
              {location.city ? `${location.city} (${location.postalCode})` : getProvinceDisplayLabel(lead.province || "")} • {getProvinceDisplayLabel(lead.province || "")}
            </span>
          </div>

          {(lead.surface_area || lead.annual_electricity_bill) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono tabular-nums pt-1 border-t border-border/60">
              {lead.surface_area && (
                <span>Toiture : <strong className="text-foreground">{lead.surface_area} m²</strong></span>
              )}
              {lead.annual_electricity_bill && (
                <span>Facture : <strong className="text-foreground">{lead.annual_electricity_bill.toLocaleString("fr-BE")} €/an</strong></span>
              )}
            </div>
          )}
        </div>

        {/* Décomposition comptable B2B officielle */}
        <div className="mt-4 rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Prestation déblocage de contact qualifié</span>
            <span className="font-mono tabular-nums text-foreground font-semibold">
              {financials.priceHtva.toFixed(2)} € HTVA
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>TVA légale belge (21 % déductible)</span>
            <span className="font-mono tabular-nums text-foreground">
              + {financials.vatAmount.toFixed(2)} €
            </span>
          </div>

          <div className="pt-2 border-t border-border flex items-baseline justify-between">
            <div>
              <span className="text-xs font-bold text-foreground">Total à régler TTC :</span>
              <p className="text-[10px] text-muted-foreground">Justificatif B2B acquitté envoyé par e-mail</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-black text-foreground tabular-nums">
                {financials.priceTtc.toFixed(2)} €
              </span>
              <span className="text-xs font-normal text-muted-foreground ml-1">TTC</span>
            </div>
          </div>
        </div>

        {/* Moyens de paiement acceptés (Belgique) */}
        <div className="mt-4 rounded-xl border border-border/70 bg-secondary/20 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Paiement 100% sécurisé via Mollie
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1">
              <Lock className="h-3 w-3" /> SSL 256-bit
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-foreground font-medium">
            <span className="rounded bg-background px-2 py-0.5 border border-border font-mono">Bancontact</span>
            <span className="rounded bg-background px-2 py-0.5 border border-border font-mono">Payconiq QR</span>
            <span className="rounded bg-background px-2 py-0.5 border border-border font-mono">Visa / Mastercard</span>
            <span className="rounded bg-background px-2 py-0.5 border border-border font-mono">Belfius Direct</span>
            <span className="rounded bg-background px-2 py-0.5 border border-border font-mono">KBC / CBC</span>
          </div>
        </div>

        {/* Garanties Aegis Solaire */}
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground px-1">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Garantie Sérénité 48h</strong> : si le numéro est erroné ou injoignable après 3 tentatives vérifiables, le dossier fait l&apos;objet d&apos;un avoir ou recrédit immédiat.
          </span>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            type="button"
            disabled={loading}
            onClick={handleProceedToPayment}
            className="w-full h-11 text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initialisation bancaire sécurisée...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Régler {financials.priceTtc.toFixed(2)} € TTC & Débloquer</span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </>
            )}
          </Button>

          {/* Option alternative : utiliser les crédits si le solde le permet ou recharger */}
          {hasEnoughCredits && onSwitchToCredits ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                onClose()
                onSwitchToCredits()
              }}
              className="text-center text-xs text-accent hover:underline font-medium cursor-pointer py-1"
            >
              Ou débloquer en 1 clic avec mes crédits ({financials.credits} crédits sur {partnerCredits} disponibles)
            </button>
          ) : (
            <div className="text-center text-[11px] text-muted-foreground pt-1">
              Vous préférez débloquer en 1 clic ?{" "}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onSwitchToCredits) onSwitchToCredits()
                }}
                className="text-accent hover:underline font-semibold cursor-pointer"
              >
                Recharger un pack de crédits
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

