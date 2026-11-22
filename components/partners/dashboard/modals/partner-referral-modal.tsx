"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  X,
  Users2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Loader2,
  Coins,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PartnerReferralModalProps {
  partner: any
  onClose: () => void
}

interface ReferralItem {
  id: string
  companyName: string
  email: string
  status: string
  rewardCredits: number
  rewardedAt: string | null
  createdAt: string
}

interface ReferralPayload {
  referralCode: string
  referralUrl: string
  rewardCredits: number
  stats: {
    totalInvited: number
    approvedCount: number
    rewardedCount: number
    totalCreditsEarned: number
  }
  referrals: ReferralItem[]
}

export default function PartnerReferralModal({ partner, onClose }: PartnerReferralModalProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReferralPayload | null>(null)
  const [copied, setCopied] = useState(false)

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

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch("/api/partners/referrals")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (active && payload?.referralCode) {
          setData(payload)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const handleCopy = async () => {
    if (!data?.referralUrl) return
    try {
      await navigator.clipboard.writeText(data.referralUrl)
      setCopied(true)
      toast.success("Lien de parrainage copié dans le presse-papier !")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Impossible de copier le lien automatiquement.")
    }
  }

  const rewardCredits = data?.rewardCredits ?? 3
  const referralUrl = data?.referralUrl ?? ""
  const companyName = partner?.company_name || "un partenaire RESCERT"

  const shareMessage = `Bonjour ! Nous recevons des dossiers solaires qualifiés (tél. vérifié SMS, photo + vue 3D du toit, 0 abonnement) sur Aegis Solaire. Utilise mon lien partenaire pour obtenir +${rewardCredits} crédits offerts dès ton 1er achat : ${referralUrl}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    `Invitation réseau RESCERT Aegis Solaire (+${rewardCredits} crédits offerts)`
  )}&body=${encodeURIComponent(
    `Bonjour,\n\nJe te recommande Aegis Solaire (recommandé par ${companyName}) pour recevoir des dossiers photovoltaïques qualifiés en Wallonie et à Bruxelles (téléphone vérifié par SMS, photos + vue 3D de la toiture, zéro abonnement mensuel).\n\nEn passant par ce lien d'inscription gratuit, tu obtiens +${rewardCredits} crédits offerts dès ton premier achat payant :\n${referralUrl}\n\nÀ bientôt !`
  )}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[92dvh] overflow-hidden rounded-t-2xl sm:rounded-3xl border-t sm:border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        {/* En-tête */}
        <div className="shrink-0 px-4 pt-2 pb-3.5 sm:px-6 sm:pt-5 sm:pb-4 border-b border-border bg-card">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-border sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 font-mono text-[10.5px] sm:text-[11px] font-bold text-accent">
                <Users2 className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">PARRAINAGE RESCERT</span>
                <span className="hidden sm:inline">PROGRAMME PARRAINAGE RESCERT</span>
              </span>
              <h2
                id="referral-modal-title"
                className="text-lg sm:text-2xl font-heading font-extrabold tracking-tight text-foreground leading-snug"
              >
                Parrainez un confrère · +<span className="font-mono tabular-nums">{rewardCredits}</span> crédits offerts chacun
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Invitez n&apos;importe quel installateur certifié RESCERT en Wallonie ou à Bruxelles (sans restriction de province).
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label="Fermer la fenêtre de parrainage"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-4 sm:gap-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs font-mono">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span>Chargement de votre espace parrainage...</span>
            </div>
          ) : (
            <>
              {/* Comment ça marche en 3 étapes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-2xl border border-border bg-secondary/35 p-3.5 flex flex-col gap-1">
                  <span className="font-mono text-[11px] font-bold text-accent tabular-nums">01 · Partagez</span>
                  <strong className="text-foreground">Transmettez votre lien</strong>
                  <p className="text-muted-foreground leading-snug">
                    En 1 clic par WhatsApp ou e-mail à un confrère installateur RESCERT.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/35 p-3.5 flex flex-col gap-1">
                  <span className="font-mono text-[11px] font-bold text-accent tabular-nums">02 · Validation</span>
                  <strong className="text-foreground">Il active son accès</strong>
                  <p className="text-muted-foreground leading-snug">
                    Son agrément RESCERT &amp; BCE est vérifié, puis il réalise son <span className="font-mono tabular-nums">1er</span> achat payant.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/35 p-3.5 flex flex-col gap-1">
                  <span className="font-mono text-[11px] font-bold text-accent tabular-nums">03 · Récompense</span>
                  <strong className="text-foreground">
                    +<span className="font-mono tabular-nums">{rewardCredits}</span> crédits chacun
                  </strong>
                  <p className="text-muted-foreground leading-snug">
                    Crédités automatiquement sur vos deux comptes (soit <span className="font-mono tabular-nums">1</span> dossier B2C Standard offert).
                  </p>
                </div>
              </div>

              {/* Bloc Lien + Boutons Partage */}
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Votre lien d&apos;invitation personnel
                  </span>
                  {data?.referralCode && (
                    <span className="rounded-md bg-card border border-border px-2 py-0.5 font-mono text-[11px] font-bold text-foreground tabular-nums">
                      Code : {data.referralCode}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralUrl}
                    aria-label="Votre lien de parrainage"
                    onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                    className="flex-1 h-11 sm:h-10 rounded-xl border border-border bg-card px-3 font-mono text-sm sm:text-xs text-foreground outline-hidden"
                  />
                  <Button
                    type="button"
                    onClick={handleCopy}
                    className="min-h-[44px] sm:h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold cursor-pointer shrink-0 gap-1.5"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copié !" : "Copier le lien"}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="min-h-[42px] sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold border-border bg-card hover:bg-secondary">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="sm:hidden">WhatsApp</span>
                      <span className="hidden sm:inline">Partager sur WhatsApp</span>
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="min-h-[42px] sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold border-border bg-card hover:bg-secondary">
                    <a href={mailtoUrl}>
                      <Mail className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="sm:hidden">Par e-mail</span>
                      <span className="hidden sm:inline">Inviter par e-mail</span>
                    </a>
                  </Button>
                </div>
              </div>

              {/* KPIs Parrainage */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
                <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3">
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-foreground tabular-nums block">
                    {data?.stats.totalInvited ?? 0}
                  </span>
                  <span className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-tight block">Confrères inscrits</span>
                </div>
                <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3">
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-foreground tabular-nums block">
                    {data?.stats.approvedCount ?? 0}
                  </span>
                  <span className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-tight block">Comptes validés</span>
                </div>
                <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3">
                  <span className="font-mono text-lg sm:text-xl font-extrabold text-accent tabular-nums block">
                    +{data?.stats.totalCreditsEarned ?? 0}
                  </span>
                  <span className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-tight block">Crédits gagnés</span>
                </div>
              </div>

              {/* Historique des parrainages */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Suivi de vos parrainages
                </span>
                {data && data.referrals.length > 0 ? (
                  <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {data.referrals.map((ref) => (
                      <div key={ref.id} className="px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="font-bold text-foreground truncate">{ref.companyName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground truncate">
                            {ref.email} · {new Date(ref.createdAt).toLocaleDateString("fr-BE")}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${ref.status === "rewarded"
                            ? "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]"
                            : ref.status === "approved"
                              ? "bg-accent/15 text-accent"
                              : "bg-secondary text-muted-foreground"
                            }`}
                        >
                          {ref.status === "rewarded" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>+{ref.rewardCredits} cr. crédités</span>
                            </>
                          ) : ref.status === "approved" ? (
                            <>
                              <Coins className="h-3 w-3" />
                              <span>Validé · En attente 1er achat</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Candidature en cours</span>
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-secondary/25 p-5 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground/70" />
                    <span>Aucun confrère parrainé pour le moment. Partagez votre lien ci-dessus pour cumuler des crédits offerts sans plafond.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
