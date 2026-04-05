"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
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
} from "lucide-react"

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

type PartnerInfo = { id: string; credits: number; companyName: string }

type CreditPack = {
  id: string
  credits: number
  priceEur: number
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

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */

const PACKS: CreditPack[] = [
  { id: "pack_10", credits: 10, priceEur: 149, pricePerCredit: 14.9 },
  {
    id: "pack_50",
    credits: 50,
    priceEur: 599,
    pricePerCredit: 11.98,
    popular: true,
    saving: "-20%",
  },
  { id: "pack_100", credits: 100, priceEur: 999, pricePerCredit: 9.99, saving: "-33%" },
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
   Revolut Pay Button (simulated)
   ═══════════════════════════════════════════════ */

function RevolutPayButton({
  pack,
  partnerId,
  onSuccess,
  disabled,
}: {
  pack: CreditPack
  partnerId: string
  onSuccess: (credits: number) => void
  disabled: boolean
}) {
  const [state, setState] = useState<"idle" | "processing" | "done">("idle")

  async function handleClick() {
    setState("processing")
    try {
      const res = await fetch("/api/payments/revolut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "payment.completed",
          partnerId,
          packId: pack.id,
          transactionId: `sim_${Date.now()}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setState("done")
        onSuccess(data.creditsAdded)
        setTimeout(() => setState("idle"), 3000)
      } else {
        setState("idle")
      }
    } catch {
      setState("idle")
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || state === "processing"}
      className={`group relative h-14 w-full overflow-hidden rounded-xl text-base font-bold transition-all ${
        state === "done"
          ? "bg-emerald-600 text-white shadow-md"
          : "bg-[#001D3D] text-white shadow-md hover:bg-[#00152e] hover:shadow-lg"
      }`}
    >
      {state === "idle" && (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="absolute -left-full top-0 h-full w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-700 group-hover:left-[150%]" />
        </div>
      )}
      {state === "processing" ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Paiement en cours…
        </span>
      ) : state === "done" ? (
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {pack.credits} crédits ajoutés !
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payer {pack.priceEur} € via Revolut
        </span>
      )}
    </Button>
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

  function handleTopupSuccess(creditsAdded: number) {
    setPartner((prev) =>
      prev ? { ...prev, credits: prev.credits + creditsAdded } : prev
    )
    fetchCredits()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#001D3D]" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50">
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
              Recharger mon compte
            </h2>
            <p className="mt-2 mb-8 text-sm text-slate-500">
              Sélectionnez un pack puis procédez au paiement sécurisé.
            </p>
          </motion.div>

          {/* Packs Grid */}
          <div className="mb-10 grid gap-5 sm:grid-cols-3">
            {PACKS.map((pack) => {
              const isSelected = selectedPack === pack.id
              return (
                <motion.div key={pack.id} variants={itemVariants}>
                  <button
                    onClick={() => setSelectedPack(pack.id)}
                    className={`group relative w-full text-left transition-all duration-300 ${
                      isSelected ? "scale-[1.02]" : "opacity-60 hover:opacity-85"
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
                          ? "border-[#001D3D]/30 shadow-md ring-1 ring-[#001D3D]/10"
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
                        crédits
                      </p>
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <p className="text-2xl font-bold text-slate-900">
                          {pack.priceEur}{" "}
                          <span className="text-sm font-normal text-slate-400">€ HTVA</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {pack.pricePerCredit.toFixed(2)} € / crédit
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

          {/* Revolut Pay Button */}
          <motion.div variants={itemVariants} className="mx-auto max-w-md">
            {partner && (
              <RevolutPayButton
                pack={PACKS.find((p) => p.id === selectedPack)!}
                partnerId={partner.id}
                onSuccess={handleTopupSuccess}
                disabled={!selectedPack}
              />
            )}
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Paiement sécurisé via Revolut Pay · Facture disponible sous 24h
            </p>
          </motion.div>

          {/* Transaction History */}
          <motion.div variants={itemVariants} className="mt-16">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Historique
              </span>
            </div>
            <h3 className="mt-3 mb-6 text-lg font-bold text-slate-900">Transactions</h3>

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
                              ? "Recharge"
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
