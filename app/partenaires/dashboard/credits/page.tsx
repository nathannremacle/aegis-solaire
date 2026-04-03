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
   Shared Components
   ═══════════════════════════════════════════════ */

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

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
          ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.3)]"
          : "bg-gradient-to-r from-[#0075EB] to-[#003580] text-white shadow-[0_4px_20px_rgba(0,117,235,0.3)] hover:shadow-[0_4px_30px_rgba(0,117,235,0.5)]"
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
      <div className="flex min-h-screen items-center justify-center bg-[#001D3D]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-neutral-500">Chargement…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#001D3D]">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-20 h-[600px] w-[600px] rounded-full bg-accent/[0.03] blur-[150px]" />
        <div className="absolute -right-32 bottom-10 h-[400px] w-[400px] rounded-full bg-blue-500/[0.03] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#001D3D]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/partenaires/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-neutral-400 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="hidden sm:block">
              <div className="relative h-6 w-24">
                <Image
                  src="/logo.png"
                  alt="Aegis Solaire"
                  fill
                  className="object-contain brightness-0 invert opacity-60"
                />
              </div>
            </div>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <div>
              <p className="text-sm font-semibold text-white">Crédits & Recharge</p>
              <p className="text-[11px] text-neutral-500">
                {partner?.companyName ?? "—"}
              </p>
            </div>
          </div>

          <GlassCard className="flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2">
            <Zap className="h-4 w-4 text-accent drop-shadow-[0_0_4px_rgba(255,184,0,0.5)]" />
            <div>
              <p className="hidden sm:block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                Solde
              </p>
              <motion.span
                key={partner?.credits}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-2xl font-bold tabular-nums text-accent"
              >
                {partner?.credits ?? 0}
              </motion.span>
            </div>
          </GlassCard>
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
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-3 py-1 shadow-[0_0_10px_rgba(255,184,0,0.08)] backdrop-blur-md">
              <CreditCard className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Packs de crédits
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
              Recharger mon{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#FFE066]">
                compte
              </span>
            </h2>
            <p className="mt-2 mb-8 text-sm text-neutral-400">
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
                        <Badge className="gap-1 border-accent/30 bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#001D3D] shadow-[0_0_12px_rgba(255,184,0,0.3)]">
                          <Sparkles className="h-3 w-3" />
                          Populaire
                        </Badge>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl border bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-300 ${
                        isSelected
                          ? "border-accent/30 shadow-[0_0_30px_rgba(255,184,0,0.1)]"
                          : "border-white/10 hover:border-white/15"
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-4xl font-extrabold tabular-nums text-accent">
                          {pack.credits}
                        </span>
                        {pack.saving && (
                          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-xs font-bold text-emerald-400">
                            {pack.saving}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                        crédits
                      </p>
                      <div className="mt-4 border-t border-white/[0.06] pt-4">
                        <p className="text-2xl font-bold text-white">
                          {pack.priceEur}{" "}
                          <span className="text-sm font-normal text-neutral-500">€ HTVA</span>
                        </p>
                        <p className="mt-1 text-xs text-neutral-600">
                          {pack.pricePerCredit.toFixed(2)} € / crédit
                        </p>
                      </div>

                      {/* Selection indicator */}
                      <div className="mt-4 flex items-center justify-center">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                            isSelected
                              ? "border-accent bg-accent"
                              : "border-neutral-600"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-full w-full text-[#001D3D]" />
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
            <p className="mt-3 text-center text-[11px] text-neutral-600">
              Paiement sécurisé via Revolut Pay · Facture disponible sous 24h
            </p>
          </motion.div>

          {/* Transaction History */}
          <motion.div variants={itemVariants} className="mt-16">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              <Clock className="h-3 w-3 text-neutral-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Historique
              </span>
            </div>
            <h3 className="mt-3 mb-6 text-lg font-bold text-white">Transactions</h3>

            {transactions.length === 0 ? (
              <GlassCard className="px-6 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
                  <TrendingUp className="h-5 w-5 text-neutral-600" />
                </div>
                <p className="text-sm text-neutral-500">Aucune transaction pour le moment.</p>
              </GlassCard>
            ) : (
              <GlassCard className="divide-y divide-white/[0.05]">
                {transactions.map((tx) => {
                  const isCredit = tx.amount > 0
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isCredit ? "bg-emerald-500/15" : "bg-red-500/10"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {tx.type === "topup"
                              ? "Recharge"
                              : tx.type === "purchase"
                                ? "Achat lead"
                                : "Ajustement"}
                          </p>
                          <p className="text-[11px] text-neutral-600">
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
                        className={`text-sm font-bold tabular-nums ${
                          isCredit ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {tx.amount}
                      </span>
                    </div>
                  )
                })}
              </GlassCard>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
