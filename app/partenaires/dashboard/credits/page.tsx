"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Building,
  Copy,
  Check,
  FileText,
  AlertCircle,
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

/* ═══════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

/* ═══════════════════════════════════════════════
   Order on Invoice & Bank Transfer
   ═══════════════════════════════════════════════ */

function OrderPackSection({
  pack,
  onOrderCreated,
}: {
  pack: CreditPack
  onOrderCreated: (order: OrderDetails) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vatAmount = Math.round(pack.priceHtva * 0.21 * 100) / 100
  const priceTtc = Math.round((pack.priceHtva + vatAmount) * 100) / 100

  async function handleOrder() {
    setSubmitting(true)
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
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Pack sélectionné
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            {pack.name} — {pack.credits} crédits
          </h3>
          <p className="text-sm text-slate-500">
            Équivalent : {pack.pricePerCredit.toFixed(2)} € HTVA par crédit
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold text-[#001D3D]">{pack.priceHtva} € <span className="text-xs font-normal text-slate-400">HTVA</span></p>
          <p className="text-xs text-slate-500">{priceTtc.toFixed(2)} € TTC (TVA 21% comprise)</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FileText className="h-4 w-4 text-slate-400" />
          <span>Facture pro officielle INIT42 émise sous 24h ouvrées</span>
        </div>
        <Button
          onClick={handleOrder}
          disabled={submitting}
          className="h-12 rounded-xl bg-[#001D3D] px-6 text-sm font-bold text-white shadow-md hover:bg-[#00152e] hover:shadow-lg transition-all"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération du bon de commande…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Commander ce pack sur facture
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}

function OrderConfirmationModal({
  order,
  onClose,
}: {
  order: OrderDetails
  onClose: () => void
}) {
  const [copiedIban, setCopiedIban] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl"
      >
        <div className="flex items-center gap-3 text-emerald-600 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Commande de pack enregistrée</h3>
            <p className="text-xs text-slate-500">Référence de bon : {order.transferReference}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Votre demande de <strong>{order.credits} crédits</strong> a bien été transmise. Veuillez effectuer votre virement bancaire sur le compte professionnel de l'exploitant :
        </p>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Bénéficiaire</span>
            <span className="font-semibold text-slate-900">{order.bankDetails.beneficiary}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">N° d'entreprise / TVA</span>
            <span className="font-semibold text-slate-900">{order.bankDetails.vatNumber}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Montant total</span>
            <span className="font-bold text-slate-900 text-sm">{order.priceTtc.toFixed(2)} € TTC <span className="font-normal text-slate-500 text-xs">({order.priceHtva} € HTVA)</span></span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
            <span className="text-slate-500">IBAN</span>
            <div className="flex items-center gap-2 font-mono font-semibold text-slate-900">
              <span>{order.bankDetails.iban}</span>
              <button
                onClick={() => copy(order.bankDetails.iban, "iban")}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
                title="Copier l'IBAN"
              >
                {copiedIban ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-500">Communication obligatoire</span>
            <div className="flex items-center gap-2 font-mono font-bold text-accent">
              <span>{order.transferReference}</span>
              <button
                onClick={() => copy(order.transferReference, "ref")}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
                title="Copier la référence"
              >
                {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500 leading-normal">
          💡 Vos crédits seront crédités sur votre compte dès réception des fonds par notre administration. Votre facture avec mention de TVA vous sera adressée par email.
        </p>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} className="rounded-xl bg-[#001D3D] px-6 text-sm font-semibold text-white">
            Compris, fermer
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

export default function CreditsPage() {
  const [partner, setPartner] = useState<PartnerInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPack, setSelectedPack] = useState<string>("pack_50")
  const [activeOrder, setActiveOrder] = useState<OrderDetails | null>(null)

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#001D3D]" />
      </div>
    )
  }

  const currentPack = PACKS.find((p) => p.id === selectedPack) || PACKS[1]

  return (
    <div className="relative min-h-screen bg-slate-50">
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

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/partenaires/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="hidden sm:block">
              <div className="relative h-8 w-32">
                <Image
                  src="/logo.png"
                  alt="Aegis Solaire"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </div>
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Crédits & Recharge</p>
              <p className="text-[11px] text-slate-400">
                {partner?.companyName ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm sm:px-4 sm:py-2">
            <Zap className="h-4 w-4 text-accent" />
            <div>
              <p className="hidden sm:block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Solde
              </p>
              <motion.span
                key={partner?.credits}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-2xl font-bold tabular-nums text-[#001D3D]"
              >
                {partner?.credits ?? 0}
              </motion.span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Section Title */}
          <motion.div variants={itemVariants}>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
              <CreditCard className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Packs de crédits
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">
              Commander des crédits marketplace
            </h2>
            <p className="mt-2 mb-8 text-sm text-slate-500">
              Sélectionnez un pack de crédits. Vos commandes sont traitées sur facture officielle émise par INIT42 avec activation dès réception du virement.
            </p>
          </motion.div>

          {/* Packs Grid */}
          <div className="mb-8 grid gap-5 sm:grid-cols-3">
            {PACKS.map((pack) => {
              const isSelected = selectedPack === pack.id
              return (
                <motion.div key={pack.id} variants={itemVariants}>
                  <button
                    onClick={() => setSelectedPack(pack.id)}
                    className={`group relative w-full text-left transition-all duration-300 ${
                      isSelected ? "scale-[1.02]" : "opacity-65 hover:opacity-90"
                    }`}
                  >
                    {pack.popular && (
                      <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                        <Badge className="gap-1 border-accent/30 bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#001D3D] shadow-sm">
                          <Sparkles className="h-3 w-3" />
                          Populaire
                        </Badge>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 ${
                        isSelected
                          ? "border-[#001D3D]/40 shadow-md ring-2 ring-[#001D3D]/10"
                          : "border-slate-200 hover:border-slate-300 hover:shadow"
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-4xl font-extrabold tabular-nums text-[#001D3D]">
                          {pack.credits}
                        </span>
                        {pack.saving && (
                          <Badge className="border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
                            {pack.saving}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        crédits leads
                      </p>
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <p className="text-2xl font-bold text-slate-900">
                          {pack.priceHtva}{" "}
                          <span className="text-sm font-normal text-slate-400">€ HTVA</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {pack.pricePerCredit.toFixed(2)} € HTVA / crédit
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-center">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                            isSelected
                              ? "border-[#001D3D] bg-[#001D3D]"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-full w-full text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </div>

          {/* Order Action Section */}
          <motion.div variants={itemVariants} className="mb-12">
            <OrderPackSection
              pack={currentPack}
              onOrderCreated={(order) => setActiveOrder(order)}
            />
          </motion.div>

          {/* Transaction History */}
          <motion.div variants={itemVariants} className="mt-12">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Historique
              </span>
            </div>
            <h3 className="mt-3 mb-6 text-lg font-bold text-slate-900">Transactions & Activité</h3>

            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <TrendingUp className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">Aucune transaction pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {transactions.map((tx) => {
                  const isCredit = tx.amount > 0
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isCredit ? "bg-emerald-50" : "bg-red-50"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {tx.type === "topup"
                              ? "Recharge (Virement)"
                              : tx.type === "purchase"
                                ? "Achat lead"
                                : "Ajustement"}
                          </p>
                          <p className="text-[11px] text-slate-400">
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
                        className={`font-sans text-sm font-bold tabular-nums ${
                          isCredit ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {tx.amount}
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
