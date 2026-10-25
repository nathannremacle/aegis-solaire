"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Zap,
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Copy,
  Check,
  FileText,
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

type PartnerInfo = { id: string; credits: number; companyName: string }

type CreditPack = {
  id: string
  name: string
  credits: number
  priceHtva: number
  pricePerCredit: number
  popular?: boolean
  saving?: string
}

type Transaction = {
  id: string
  amount: number
  type: "purchase" | "topup" | "adjustment"
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

const PACKS: CreditPack[] = [
  { id: "pack_10", name: "Pack Découverte", credits: 10, priceHtva: 149, pricePerCredit: 14.9 },
  {
    id: "pack_50",
    name: "Pack Croissance",
    credits: 50,
    priceHtva: 599,
    pricePerCredit: 11.98,
    popular: true,
    saving: "-20%",
  },
  { id: "pack_100", name: "Pack Entreprise", credits: 100, priceHtva: 999, pricePerCredit: 9.99, saving: "-33%" },
]

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

function OrderPackSection({
  pack,
  onOrderCreated,
}: {
  pack: CreditPack
  onOrderCreated: (order: OrderDetails) => void
}) {
  const [submittingMollie, setSubmittingMollie] = useState(false)
  const [submittingInvoice, setSubmittingInvoice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vatAmount = Math.round(pack.priceHtva * 0.21 * 100) / 100
  const priceTtc = Math.round((pack.priceHtva + vatAmount) * 100) / 100

  // 1. Paiement instantané Bancontact / Payconiq (Mollie)
  async function handleInstantPayment() {
    setSubmittingMollie(true)
    setError(null)
    try {
      const res = await fetch("/api/partners/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible d'initier le paiement en ligne.")
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error("Lien de paiement sécurisé non reçu.")
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion au service bancaire.")
      setSubmittingMollie(false)
    }
  }

  // 2. Virement bancaire classique sur facture
  async function handleInvoiceOrder() {
    setSubmittingInvoice(true)
    setError(null)
    try {
      const res = await fetch("/api/partners/credits/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Une erreur est survenue lors de la commande.")
      }
      onOrderCreated(data.order)
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.")
    } finally {
      setSubmittingInvoice(false)
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
            Équivalent : <span className="font-mono tabular-nums">{pack.pricePerCredit.toFixed(2)} € HTVA</span> par crédit
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
            {pack.priceHtva} € <span className="text-xs font-normal text-muted-foreground">HTVA</span>
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

      {/* Boutons d'action : Instantané prioritaire + Virement différé */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent shrink-0 fill-accent" />
            <span className="font-medium text-foreground">
              Activation immédiate 24/7 sur votre compte
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Facture pro officielle conforme (TVA 21% déductible) émise automatiquement.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleInvoiceOrder}
            disabled={submittingInvoice || submittingMollie}
            className="h-11 px-4 text-xs font-medium border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer justify-center"
            title="Pour paiement comptable par virement manuel différé"
          >
            {submittingInvoice ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Génération bon…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Virement bancaire classique
              </span>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleInstantPayment}
            disabled={submittingInvoice || submittingMollie}
            className="h-12 px-6 font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs justify-center"
          >
            {submittingMollie ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Ouverture session bancaire…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-accent" />
                Payer par Bancontact / Payconiq
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Bandeau d'information bancaire belgique */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Paiement sécurisé Mollie (QR code via Belfius, BNP Fortis, KBC/CBC, ING, Payconiq)
        </span>
        <span className="hidden sm:inline font-mono tabular-nums">
          Frais bancaires fixes ~0,25 € HT · 0 % de commission variable
        </span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Modale Confirmation Commande (Mobile Sheet)
   ═══════════════════════════════════════════════ */

function OrderConfirmationModal({
  order,
  onClose,
}: {
  order: OrderDetails
  onClose: () => void
}) {
  const [copiedIban, setCopiedIban] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  useEffect(() => {
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
  }, [onClose])

  function copy(text: string, type: "iban" | "ref") {
    navigator.clipboard.writeText(text)
    if (type === "iban") {
      setCopiedIban(true)
      setTimeout(() => setCopiedIban(false), 2000)
    } else {
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-2xl overscroll-contain"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Commande de pack enregistrée</h3>
            <p className="text-xs text-muted-foreground font-mono tabular-nums">Référence : {order.transferReference}</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
          Votre demande de <strong className="font-mono text-foreground tabular-nums">{order.credits} crédits</strong> a bien été enregistrée. Effectuez votre virement bancaire sur le compte de l&apos;exploitant :
        </p>

        <div className="space-y-2.5 rounded-xl border border-border bg-secondary/40 p-3.5 sm:p-4 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-border/60">
            <span className="text-muted-foreground">Bénéficiaire</span>
            <span className="font-semibold text-foreground text-right">{order.bankDetails.beneficiary}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/60">
            <span className="text-muted-foreground">TVA Entreprise</span>
            <span className="font-mono font-semibold text-foreground">{order.bankDetails.vatNumber}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/60">
            <span className="text-muted-foreground">Montant total</span>
            <span className="font-mono font-bold text-foreground text-sm tabular-nums">
              {order.priceTtc.toFixed(2)} € TTC <span className="font-normal text-muted-foreground text-xs">({order.priceHtva} € HTVA)</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-1 border-b border-border/60">
            <span className="text-muted-foreground">IBAN</span>
            <div className="flex items-center justify-between sm:justify-end gap-2 font-mono font-semibold text-foreground">
              <span className="text-xs truncate">{order.bankDetails.iban}</span>
              <button
                type="button"
                onClick={() => copy(order.bankDetails.iban, "iban")}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                title="Copier l'IBAN"
              >
                {copiedIban ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-1">
            <span className="text-muted-foreground">Communication obligatoire</span>
            <div className="flex items-center justify-between sm:justify-end gap-2 font-mono font-bold text-accent">
              <span className="text-xs">{order.transferReference}</span>
              <button
                type="button"
                onClick={() => copy(order.transferReference, "ref")}
                className="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                title="Copier la référence"
              >
                {copiedRef ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground leading-normal">
          Vos crédits seront alloués sur votre compte dès confirmation de réception des fonds. La facture avec TVA 21% déductible vous parviendra automatiquement par e-mail.
        </p>

        <div className="mt-5 flex justify-end">
          <Button onClick={onClose} className="w-full sm:w-auto h-11 px-6 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
            Compris, fermer
          </Button>
        </div>
      </motion.div>
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
  const [selectedPack, setSelectedPack] = useState<string>("pack_50")
  const [activeOrder, setActiveOrder] = useState<OrderDetails | null>(null)
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

  // Vérification automatique au retour d'une session de paiement Mollie
  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
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
              message: `Paiement Bancontact validé avec succès ! Vos ${data.credits} crédits ont été alloués instantanément sur votre compte.`,
              credits: data.credits,
            })
            fetchCredits()
          } else if (data.status === "cancelled") {
            setPaymentFeedback({
              type: "cancelled",
              message: "La transaction en ligne a été annulée ou n'a pas pu aboutir.",
            })
          } else {
            setPaymentFeedback({
              type: "pending",
              message: "Paiement en cours de confirmation par le réseau bancaire. Votre solde s'actualisera sous peu.",
            })
            // Deuxième tentative après 2,5s si la banque met quelques secondes
            setTimeout(() => {
              fetch(`/api/partners/credits/check-status?order_id=${encodeURIComponent(orderId)}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.status === "paid") {
                    setPaymentFeedback({
                      type: "success",
                      message: `Paiement Bancontact validé avec succès ! Vos ${d.credits} crédits ont été ajoutés à votre compte.`,
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
      <AnimatePresence>
        {activeOrder && (
          <OrderConfirmationModal
            order={activeOrder}
            onClose={() => {
              setActiveOrder(null)
              fetchCredits()
            }}
          />
        )}
      </AnimatePresence>

      {/* Header Sticky Mobile-First */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Link
              href="/partenaires/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80"
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
          className="space-y-6"
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
              Sélectionnez un pack de crédits. Traitement transparent sur facture officielle avec TVA 21% déductible.
            </p>

            {/* Alerte solde faible si applicable */}
            {(partner?.credits ?? 0) <= 4 && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-xs text-foreground">
                <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-foreground">
                    Solde actuel : <span className="font-mono tabular-nums">{partner?.credits ?? 0} crédits</span>
                  </h4>
                  <p className="text-muted-foreground mt-0.5">
                    Un dossier B2B exclusif requiert de 8 à 18 crédits selon la puissance. Réapprovisionnez pour débloquer les opportunités en direct.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

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
                    {pack.popular && (
                      <span className="absolute -top-2.5 right-3 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground tracking-wide">
                        Recommandé
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-3xl font-black text-foreground tabular-nums">
                        {pack.credits}
                      </span>
                      {pack.saving && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-primary border border-border">
                          {pack.saving}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                      crédits leads
                    </p>

                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xl font-bold font-mono text-foreground tabular-nums">
                        {pack.priceHtva} €{" "}
                        <span className="text-xs font-normal text-muted-foreground">HTVA</span>
                      </p>
                      <p className="mt-0.5 text-[11px] font-mono text-muted-foreground tabular-nums">
                        ({pack.pricePerCredit.toFixed(2)} € / crédit)
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Volume de chantiers</span>
                  <p className="mt-1 text-sm font-bold font-mono text-foreground tabular-nums">
                    {Math.floor(currentPack.credits / 8)} B2B <span className="font-normal text-xs text-muted-foreground">ou</span> {Math.floor(currentPack.credits / 2)} B2C
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chiffre d&apos;Affaires Estimé</span>
                  <p className="mt-1 text-sm font-bold font-mono text-foreground tabular-nums">
                    ~{(Math.floor(currentPack.credits / 8) * 35000).toLocaleString("fr-BE")} € à {(Math.floor(currentPack.credits / 8) * 60000).toLocaleString("fr-BE")} €
                  </p>
                </div>
                <div className="rounded-xl bg-card p-3 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marge brute estimée (~22%)</span>
                  <p className="mt-1 text-sm font-bold font-mono text-accent tabular-nums">
                    ~{(Math.floor(currentPack.credits / 8) * 7700).toLocaleString("fr-BE")} € à {(Math.floor(currentPack.credits / 8) * 13200).toLocaleString("fr-BE")} €
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Formulaire de commande */}
          <motion.div variants={itemVariants}>
            <OrderPackSection
              pack={currentPack}
              onOrderCreated={(order) => setActiveOrder(order)}
            />
          </motion.div>

          {/* Réassurance & Charte Qualité */}
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Garantie Lead Conforme &amp; Remplacement 24h
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Si un prospect s&apos;avère injoignable ou hors critères, vos crédits sont réintégrés sur votre compte sans délai sur simple signalement dans votre portail.
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
