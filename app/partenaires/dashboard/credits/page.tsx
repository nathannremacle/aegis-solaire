"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Zap,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Check,
  AlertCircle,
  ShieldCheck,
  Coins,
  Calculator,
  X,
  QrCode,
} from "lucide-react"

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

import {
  CREDIT_PACKS_LIST,
  CREDIT_UNIT_PRICE_EUR,
  B2C_CREDIT_COST,
  B2B_CREDIT_COST,
} from "@/lib/credit-pricing"

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

type PartnerInfo = { id: string; credits: number; companyName: string }

type CreditPack = {
  id: string
  name: string
  credits: number
  priceHtva: number
  priceTtc: number
  pricePerCredit: number
  savingsPercent: number
  savingsEur: number
  badge?: string
  description: string
  popular?: boolean
}

type Transaction = {
  id: string
  amount: number
  type: "purchase" | "topup" | "adjustment" | "refund"
  reference: string | null
  created_at: string
}

type OrderDetails = {
  packName: string
  credits: number
  priceHtva: number
  vatAmount: number
  priceTtc: number
  transferReference: string
  bankDetails: {
    beneficiary: string
    iban: string
    bic: string
    vatNumber: string
  }
}

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */

const PACKS: CreditPack[] = CREDIT_PACKS_LIST.map((p) => ({
  id: p.id,
  name: p.name,
  credits: p.credits,
  priceHtva: p.priceHtva,
  priceTtc: p.priceTtc,
  pricePerCredit: p.pricePerCredit,
  savingsPercent: p.savingsPercent,
  savingsEur: p.savingsEur,
  badge: p.badge,
  description: p.description,
  popular: p.popular,
}))

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

/* ═══════════════════════════════════════════════
   Section Commande sur Facture
   ═══════════════════════════════════════════════ */

function OrderPackSection({ pack }: { pack: CreditPack }) {
  const [submitting, setSubmitting] = useState(false)
  const [enableOneClick, setEnableOneClick] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priceTtc = pack.priceTtc
  const vatAmount = Math.round((priceTtc - pack.priceHtva) * 100) / 100

  async function handleQrCodePayment() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/partners/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id, enableOneClick }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible d'initier le paiement par QR code.")
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error("Lien de paiement sécurisé non reçu.")
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion au service bancaire.")
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Pack sélectionné
          </span>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {pack.name} — <span className="font-mono tabular-nums">{pack.credits}</span> crédits
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tarif unique : <span className="font-mono tabular-nums">{pack.pricePerCredit.toFixed(2)} € HTVA</span> par crédit
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
            {pack.priceHtva.toFixed(2)} € <span className="text-xs font-normal text-muted-foreground">HTVA</span>
          </p>
          <p className="text-xs text-muted-foreground font-mono tabular-nums">
            {priceTtc.toFixed(2)} € TTC (TVA 21% comprise)
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action unique : Paiement instantané par QR Code */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent shrink-0 fill-accent" />
            <span className="font-medium text-foreground">
              Activation immédiate 24/7 sur votre solde
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Scannez le QR Code avec votre app bancaire (BNP Fortis, Belfius, KBC/CBC, ING) ou Payconiq.
          </span>
          <span className="text-[11px] text-muted-foreground">
            Facture pro officielle conforme (TVA 21% déductible) transmise automatiquement par e-mail.
          </span>
          <label className="mt-2 flex items-start gap-2.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11.5px] text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableOneClick}
              onChange={(e) => setEnableOneClick(e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                enableOneClick
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card"
              }`}
            >
              {enableOneClick && <Check className="h-2.5 w-2.5 stroke-[3]" />}
            </span>
            <span className="leading-snug">
              Activer le paiement <strong>1-clic / Auto-Pilot</strong> chez Mollie (Bancontact / Carte)
            </span>
          </label>
        </div>

        <Button
          type="button"
          onClick={handleQrCodePayment}
          disabled={submitting}
          className="min-h-[48px] h-auto py-2.5 w-full sm:w-auto px-4 sm:px-7 font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs justify-center shrink-0 whitespace-normal text-center leading-snug"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent shrink-0" />
              <span>Génération du QR Code…</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <QrCode className="h-4 w-4 text-accent shrink-0" />
              <span>Payer par QR Code (Bancontact / Payconiq)</span>
            </span>
          )}
        </Button>
      </div>

      {/* Bandeau de réassurance bancaire */}
      <div className="mt-4 pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          Paiement sécurisé Mollie · Débit compte à compte sans carte bancaire ni délai de virement
        </span>
        <span className="text-muted-foreground/80">
          Protocole bancaire SSL chiffré · Aucun frais additionnel
        </span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Page Principale des Crédits Installateur
   ═══════════════════════════════════════════════ */

export default function CreditsPage() {
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPack, setSelectedPack] = useState<string>("pack_24")
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "success" | "pending" | "cancelled" | null
    message: string
    credits?: number
  } | null>(null)

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/credits")
      if (!res.ok) return
      const data = await res.json()
      setPartner(data.partner)
      setTransactions(data.transactions ?? [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  const [provinceQuotas, setProvinceQuotas] = useState<
    Array<{
      key: string
      label: string
      maxSeats: number
      takenSeats: number
      remainingSeats: number
      isPartnerActiveHere: boolean
    }>
  >([])

  useEffect(() => {
    fetch("/api/partners/quotas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.provinces) setProvinceQuotas(d.provinces)
      })
      .catch(() => {})
  }, [])

  // Vérification automatique au retour d'une session de paiement Mollie & lecture de ?pack=
  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    const packParam = url.searchParams.get("pack")
    if (packParam && PACKS.some((p) => p.id === packParam)) {
      setSelectedPack(packParam)
    }

    const payment = url.searchParams.get("payment")
    const orderId = url.searchParams.get("order_id")

    if (payment === "return" && orderId) {
      setVerifyingPayment(true)
      fetch(`/api/partners/credits/check-status?order_id=${encodeURIComponent(orderId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "paid") {
            setPaymentFeedback({
              type: "success",
              message: `Paiement QR Code validé avec succès ! Vos ${data.credits} crédits ont été ajoutés instantanément sur votre compte.`,
              credits: data.credits,
            })
            fetchCredits()
          } else if (data.status === "cancelled") {
            setPaymentFeedback({
              type: "cancelled",
              message: "La transaction par QR Code a été interrompue ou annulée.",
            })
          } else {
            setPaymentFeedback({
              type: "pending",
              message: "Paiement en cours de confirmation par votre banque. Votre solde s'actualisera sous peu.",
            })
            setTimeout(() => {
              fetch(`/api/partners/credits/check-status?order_id=${encodeURIComponent(orderId)}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.status === "paid") {
                    setPaymentFeedback({
                      type: "success",
                      message: `Paiement QR Code validé avec succès ! Vos ${d.credits} crédits sont immédiatement disponibles.`,
                      credits: d.credits,
                    })
                    fetchCredits()
                  }
                })
                .catch(() => {})
            }, 2500)
          }
        })
        .catch(() => {
          setPaymentFeedback({
            type: "pending",
            message: "Votre session de paiement a été transmise au réseau bancaire.",
          })
        })
        .finally(() => {
          setVerifyingPayment(false)
          window.history.replaceState({}, document.title, window.location.pathname)
        })
    }
  }, [fetchCredits])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentPack = PACKS.find((p) => p.id === selectedPack) || PACKS[1]

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-12">
      {/* Header Sticky Mobile-First */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Link
              href="/partenaires/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 shrink-0"
              title="Retour au Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-foreground">Crédits Marketplace</h1>
              <p className="text-[11px] text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
                {partner?.companyName ?? "Espace Installateur"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 shadow-2xs">
            <Coins className="h-4 w-4 text-accent shrink-0" />
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">
              {partner?.credits ?? 0}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">crédits</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* Bannière de chargement / vérification de paiement */}
          {verifyingPayment && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs text-foreground animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span>Vérification de la validation bancaire en cours…</span>
            </div>
          )}

          {/* Bannière de résultat du paiement Mollie */}
          {paymentFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs ${
                paymentFeedback.type === "success"
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : paymentFeedback.type === "pending"
                    ? "border-accent/40 bg-accent/10 text-foreground"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {paymentFeedback.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                ) : paymentFeedback.type === "pending" ? (
                  <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-foreground">
                    {paymentFeedback.type === "success"
                      ? "Recharge effectuée avec succès"
                      : paymentFeedback.type === "pending"
                        ? "Confirmation bancaire en cours"
                        : "Session interrompue"}
                  </h4>
                  <p className="mt-0.5 text-muted-foreground">{paymentFeedback.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentFeedback(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* Section Titre */}
          <motion.div variants={itemVariants}>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 border border-border">
              <CreditCard className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Recharge &amp; Packs
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Approvisionner mon compte installateur
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Sélectionnez un pack de crédits (valables <span className="font-mono tabular-nums">12 mois</span>,{" "}
              <Link href="/cgv" className="underline underline-offset-4 hover:text-foreground">
                Art. 4.3 CGV
              </Link>
              ). Traitement transparent sur facture officielle avec TVA <span className="font-mono tabular-nums">21 %</span> déductible.
            </p>

            {/* Alerte solde faible si applicable */}
            {(partner?.credits ?? 0) < 9 && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-xs text-foreground">
                <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-foreground">
                    Solde actuel : <span className="font-mono tabular-nums">{partner?.credits ?? 0} {(partner?.credits ?? 0) === 1 ? "crédit" : "crédits"}</span>
                  </h4>
                  <p className="text-muted-foreground mt-0.5">
                    {(partner?.credits ?? 0) < 3
                      ? "Solde insuffisant pour débloquer un nouveau dossier. Un dossier B2C standard requiert 3 crédits (29,50 € HTVA) et un B2B PME/Standard requiert 8 à 13 crédits (79 € à 129 € HTVA)."
                      : "Votre solde permet de débloquer un dossier B2C (3 crédits = 29,50 € HTVA), mais est insuffisant pour un dossier B2B Standard (13 crédits = 129,00 € HTVA)."}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Quotas Prioritaires par Province (Embargo 30 min + Garantie 45 Jours) */}
          {provinceQuotas.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-sm font-bold text-foreground">
                        Quotas Prioritaires par Province (Embargo <span className="font-mono tabular-nums">30</span> min · Garantie <span className="font-mono tabular-nums">45</span>j)
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Maximum <span className="font-mono tabular-nums">3</span> titulaires Auto-Pilot par province. Les titulaires reçoivent les dossiers à <span className="font-mono tabular-nums">T+0s</span> avant diffusion marketplace.
                    </p>
                  </div>
                  <span className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground border border-border self-start sm:self-auto">
                    Garantie Cash-Back <span className="font-mono tabular-nums">45</span> jours (Art. <span className="font-mono tabular-nums">4.4</span> CGV)
                  </span>
                </div>
                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {provinceQuotas.map((pq) => (
                    <div
                      key={pq.key}
                      className={`rounded-xl border p-3 ${
                        pq.isPartnerActiveHere
                          ? "border-primary bg-primary/5"
                          : "border-border bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-foreground">{pq.label}</span>
                        {pq.isPartnerActiveHere && (
                          <span className="text-[10px] font-bold text-primary">Actif</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-mono tabular-nums text-muted-foreground">
                        {pq.remainingSeats > 0 ? (
                          <span className="text-foreground font-semibold">
                            {pq.remainingSeats}/{pq.maxSeats} libres
                          </span>
                        ) : (
                          <span>Complet ({pq.maxSeats}/{pq.maxSeats})</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Grille des Packs (Responsive 1 col mobile, 3 col desktop) */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {PACKS.map((pack) => {
              const isSelected = selectedPack === pack.id
              return (
                <motion.div key={pack.id} variants={itemVariants}>
                  <button
                    type="button"
                    onClick={() => setSelectedPack(pack.id)}
                    className={`group relative w-full text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer ${
                      isSelected
                        ? "border-accent bg-accent/[0.04] ring-2 ring-accent/30 shadow-xs"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    {pack.popular ? (
                      <span className="absolute -top-2.5 right-3 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground tracking-wide">
                        Recommandé · -{pack.savingsPercent} %
                      </span>
                    ) : pack.savingsPercent > 0 ? (
                      <span className="absolute -top-2.5 right-3 rounded-md border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 font-mono tabular-nums">
                        -{pack.savingsPercent.toString().replace(".", ",")} %
                      </span>
                    ) : null}

                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-3xl font-black text-foreground tabular-nums">
                        {pack.credits}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold text-foreground">
                        {pack.name}
                      </span>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                      crédits leads · multiples de 3 &amp; 12
                    </p>

                    <div className="mt-4 border-t border-border pt-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xl font-bold font-mono text-foreground tabular-nums">
                          {pack.priceHtva.toFixed(0)} €{" "}
                          <span className="text-xs font-normal text-muted-foreground">HTVA</span>
                        </p>
                        {pack.savingsEur > 0 && (
                          <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                            Économie {pack.savingsEur.toFixed(0)} €
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] font-mono text-muted-foreground tabular-nums">
                        ({pack.pricePerCredit.toFixed(2).replace(".", ",")} € / crédit · {pack.priceTtc.toFixed(2).replace(".", ",")} € TTC)
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-foreground">
                        {isSelected ? "Sélectionné" : "Choisir ce pack"}
                      </span>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                          isSelected ? "border-accent bg-accent text-accent-foreground" : "border-border"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </div>

          {/* Simulateur de rentabilité économique */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Potentiel économique du pack ({currentPack.credits} crédits)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Projections indicatives basées sur les chantiers wallons constatés.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-card px-2.5 py-1 text-center border border-border shrink-0 self-start sm:self-auto">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ratio Coût / Marge</span>
                  <span className="text-xs font-mono font-bold text-foreground">&lt; 1,5%</span>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl bg-card p-3 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Volume de dossiers</span>
                  <p className="mt-1 text-sm font-bold font-mono text-foreground tabular-nums">
                    {Math.floor(currentPack.credits / 9)} B2B <span className="font-normal text-xs text-muted-foreground">ou</span> {Math.floor(currentPack.credits / 3)} B2C
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chiffre d&apos;Affaires Estimé</span>
                  <p className="mt-1 text-sm font-bold font-mono text-foreground tabular-nums">
                    ~{(Math.floor(currentPack.credits / 9) * 35000).toLocaleString("fr-BE")} € à {(Math.floor(currentPack.credits / 9) * 60000).toLocaleString("fr-BE")} €
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marge nette estimée (~32%)</span>
                  <p className="mt-1 text-sm font-bold font-mono text-accent tabular-nums">
                    ~{(Math.floor(currentPack.credits / 9) * 11200).toLocaleString("fr-BE")} € à {(Math.floor(currentPack.credits / 9) * 19200).toLocaleString("fr-BE")} €
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Formulaire de commande */}
          <motion.div variants={itemVariants}>
            <OrderPackSection pack={currentPack} />
          </motion.div>

          {/* Option alternative : Payer par lead à l'unité en euros */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-accent shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Vous préférez payer à l&apos;unité sans pack ?
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Sur la marketplace, vous pouvez également débloquer chaque chantier individuellement en euros par Bancontact ou Carte bancaire (dès 19,50 € HT en B2C, 59 à 119 € HT en Exclusivité Totale B2C, et dès 79,00 € HT en B2B max 2 ou Exclusivité Totale). Les packs prépayés offrent jusqu&apos;à -24 % de remise immédiate.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 text-xs font-bold border-accent/40 bg-card hover:bg-accent/10 text-foreground cursor-pointer" asChild>
                <Link href="/partenaires/dashboard">
                  <span>Accéder à la marketplace</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 text-accent" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Réassurance & Charte Qualité */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Garantie Lead Conforme &amp; Remplacement (Déclaration 7j · Recrédit 24h)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Si un prospect s&apos;avère injoignable ou hors critères dans les <span className="font-mono tabular-nums">7 jours ouvrés</span> suivant l&apos;acquisition, vos crédits sont réintégrés sous <span className="font-mono tabular-nums">24h ouvrées</span> sur simple signalement dans votre portail.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Historique des Transactions */}
          <motion.div variants={itemVariants} className="pt-2">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 border border-border">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Historique
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-3">
              Activité &amp; Déblocages récents
            </h3>

            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-xs">
                <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">Aucune transaction enregistrée pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                {transactions.map((tx) => {
                  const isCredit = tx.amount > 0
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 transition-colors hover:bg-secondary/30"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isCredit ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                          {isCredit ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                            {tx.type === "topup"
                              ? "Recharge crédits"
                              : tx.type === "purchase"
                                ? "Déblocage lead"
                                : tx.type === "refund"
                                  ? "Remboursement garantie lead"
                                  : "Ajustement de solde"}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                            {new Date(tx.created_at).toLocaleDateString("fr-BE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`font-mono text-xs sm:text-sm font-bold tabular-nums shrink-0 ${
                          isCredit ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {tx.amount} cr
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
