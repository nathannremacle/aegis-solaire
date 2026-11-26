"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { AlertCircle, ShieldAlert, ShieldBan, Loader2, X, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  DISPUTE_REASONS,
  DISPUTE_SUPPORT_EMAIL,
  MIN_DISPUTE_DETAILS_LENGTH,
  WRONG_NUMBER_PROOF_OPTIONS,
  checkDisputeEligibility,
  detectExcludedReasonArt54,
  detectUnreachableClaimInWrongNumber,
  type DisputeReasonId,
  type WrongNumberProofId,
} from "@/lib/disputes-policy"

interface DisputeClaimModalProps {
  purchase: {
    id?: string
    purchase_id: string
    lead_id?: string
    purchased_at?: string | null
    first_name: string
    last_name: string
    company?: string | null
    credits_spent?: number
    segment?: string | null
    contact_preference?: string | null
    phone_verified?: boolean | null
    email_verified?: boolean | null
    qualification_metadata?: {
      contactPreference?: string | null
    } | null
  }
  disputesSuspended?: boolean
  disputesSuspendedReason?: string | null
  onSuccess?: (dispute: { id: string; status: string; purchase_id: string }) => void
  onClose: () => void
}

export default function DisputeClaimModal({
  purchase,
  disputesSuspended = false,
  disputesSuspendedReason = null,
  onSuccess,
  onClose,
}: DisputeClaimModalProps) {
  const [reason, setReason] = useState<DisputeReasonId>("wrong_number")
  const [wrongNumberProof, setWrongNumberProof] = useState<WrongNumberProofId | null>(null)
  const [wrongNumberVerifiedAck, setWrongNumberVerifiedAck] = useState<boolean>(false)
  const [details, setDetails] = useState<string>("")
  const [diligenceConfirmed, setDiligenceConfirmed] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState(false)

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

  const trimmedLength = details.trim().length
  const isDetailsValid = trimmedLength >= MIN_DISPUTE_DETAILS_LENGTH
  const activeReasonMeta =
    DISPUTE_REASONS.find((r) => r.id === reason) ?? DISPUTE_REASONS[0]

  const contactPreference =
    purchase.contact_preference || purchase.qualification_metadata?.contactPreference || null
  const phoneVerified = Boolean(purchase.phone_verified)
  const emailVerified = Boolean(purchase.email_verified)

  const selectedChannelVerified =
    reason === "wrong_number" &&
    ((wrongNumberProof === "operator_unassigned" && phoneVerified) ||
      (wrongNumberProof === "email_bounce" && emailVerified))

  const hasUnreachablePhrasingUnderWrongNumber =
    reason === "wrong_number" && detectUnreachableClaimInWrongNumber(details)

  const art54ExclusionUnderOther = useMemo(
    () => (reason === "other" ? detectExcludedReasonArt54(details) : { excluded: false }),
    [reason, details]
  )

  const eligibility = useMemo(
    () =>
      checkDisputeEligibility({
        reason,
        purchasedAt: purchase.purchased_at,
        details,
        contactPreference,
        diligenceConfirmed: reason === "unreachable" ? diligenceConfirmed : true,
        skipDetailsCheck: true,
        wrongNumberProof,
        requireWrongNumberProof: reason === "wrong_number",
        phoneVerified,
        emailVerified,
        wrongNumberVerifiedAck: selectedChannelVerified ? wrongNumberVerifiedAck : true,
      }),
    [
      reason,
      purchase.purchased_at,
      details,
      contactPreference,
      diligenceConfirmed,
      wrongNumberProof,
      phoneVerified,
      emailVerified,
      selectedChannelVerified,
      wrongNumberVerifiedAck,
    ]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disputesSuspended) return

    const fullCheck = checkDisputeEligibility({
      reason,
      purchasedAt: purchase.purchased_at,
      details,
      contactPreference,
      diligenceConfirmed: reason === "unreachable" ? diligenceConfirmed : true,
      wrongNumberProof,
      requireWrongNumberProof: reason === "wrong_number",
      phoneVerified,
      emailVerified,
      wrongNumberVerifiedAck: selectedChannelVerified ? wrongNumberVerifiedAck : true,
    })

    if (!fullCheck.eligible) {
      toast.error(fullCheck.error || "Veuillez compléter votre signalement.")
      return
    }

    const resolvedLeadId = purchase.lead_id || purchase.id
    if (!resolvedLeadId || !purchase.purchase_id) {
      toast.error("Identifiant du dossier manquant. Actualisez la page et réessayez.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/partners/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: purchase.purchase_id,
          leadId: resolvedLeadId,
          reason,
          details: details.trim(),
          diligenceConfirmed: reason === "unreachable" ? diligenceConfirmed : true,
          wrongNumberProof: reason === "wrong_number" ? wrongNumberProof : undefined,
          wrongNumberVerifiedAck:
            reason === "wrong_number" && selectedChannelVerified
              ? wrongNumberVerifiedAck
              : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors du dépôt du litige")

      toast.success("Réclamation enregistrée ! Traitement sous 24h ouvrées par notre équipe conformité.")
      if (data.dispute) {
        onSuccess?.({
          id: data.dispute.id,
          status: data.dispute.status || "pending",
          purchase_id: purchase.purchase_id,
        })
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Erreur")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border-t sm:border border-border bg-card px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overscroll-contain"
      >
        <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-border sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-destructive/10 p-2 text-destructive border border-destructive/20 shrink-0">
              {disputesSuspended ? <ShieldBan className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                Déclarer un litige (Garantie Lead · <span className="font-mono tabular-nums">7 j</span> ouvrés)
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Lead : {purchase.first_name} {purchase.last_name} ({purchase.company || purchase.segment})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer la boîte de dialogue"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {disputesSuspended ? (
          <div className="mt-5 flex flex-col gap-4">
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-foreground flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-destructive">
                <ShieldBan className="h-4 w-4 shrink-0" />
                <span>Faculté de réclamation temporairement suspendue (Art. 5.6 CGV)</span>
              </div>
              <p className="leading-relaxed text-foreground">
                {disputesSuspendedReason ||
                  "La faculté de déclarer de nouveaux litiges a été suspendue sur votre espace partenaire conformément à l'article 5.6 des CGV."}
              </p>
              <p className="text-muted-foreground">
                Pour tout réexamen ou justificatif complémentaire, contactez notre équipe conformité à{" "}
                <a
                  href={`mailto:${DISPUTE_SUPPORT_EMAIL}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {DISPUTE_SUPPORT_EMAIL}
                </a>
                .
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs text-foreground flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>
                Délai de réclamation : <strong className="font-mono tabular-nums">7 jours ouvrés</strong> après l&apos;achat. Examen sous{" "}
                <strong className="font-mono tabular-nums">24 h</strong> ouvrées et recrédit intégral de vos{" "}
                <strong className="font-mono tabular-nums">{purchase.credits_spent || (purchase.segment === "B2B" ? 9 : 3)} crédits</strong> si recevable.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Motif de la réclamation</label>
              <div className="mt-2 flex flex-col gap-2">
                {DISPUTE_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                      reason === r.id
                        ? "border-destructive bg-destructive/5 text-foreground font-bold"
                        : "border-border hover:bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.id}
                      checked={reason === r.id}
                      onChange={(e) => {
                        setReason(e.target.value as DisputeReasonId)
                        setDiligenceConfirmed(false)
                        setWrongNumberProof(null)
                        setWrongNumberVerifiedAck(false)
                      }}
                      className="accent-destructive"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {reason === "wrong_number" && (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 flex flex-col gap-3 text-xs">
                {(phoneVerified || emailVerified) && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 flex flex-col gap-1.5 text-foreground">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Vérifications techniques actives sur ce dossier :</span>
                      {phoneVerified && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary border border-primary/20">
                          Tél OTP vérifié
                        </span>
                      )}
                      {emailVerified && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary border border-primary/20">
                          Mail OK
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Si le prospect ne répond pas au téléphone, il ne s&apos;agit pas d&apos;un numéro non attribué : sélectionnez plutôt{" "}
                      <strong className="text-foreground">« Prospect injoignable après 3 tentatives sur ≥ 24 h »</strong>
                      {contactPreference === "written_first"
                        ? " (avec au moins 1 SMS/WhatsApp/e-mail requis par sa préférence « Écrit d'abord »)."
                        : "."}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-foreground">
                    Anomalie technique constatée (obligatoire) <span className="text-destructive">*</span>
                  </span>
                  {WRONG_NUMBER_PROOF_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                        wrongNumberProof === opt.id
                          ? "border-destructive bg-destructive/5 text-foreground"
                          : "border-border bg-card/60 text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="wrongNumberProof"
                        value={opt.id}
                        checked={wrongNumberProof === opt.id}
                        onChange={() => {
                          setWrongNumberProof(opt.id)
                          setWrongNumberVerifiedAck(false)
                        }}
                        className="mt-0.5 accent-destructive"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">{opt.label}</span>
                        <span className="text-[11px] text-muted-foreground">{opt.description}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedChannelVerified && (
                  <label className="flex items-start gap-2.5 cursor-pointer text-foreground pt-1 border-t border-border/60">
                    <Checkbox
                      checked={wrongNumberVerifiedAck}
                      onCheckedChange={(checked) => setWrongNumberVerifiedAck(checked === true)}
                      className="mt-0.5"
                    />
                    <span className="text-[11px] leading-snug">
                      Je certifie avoir constaté un défaut technique formel (message opérateur « numéro non attribué » ou rebond SMTP permanent) sur un canal vérifié, et non une absence de réponse (Art. 5.3 &amp; 5.6 CGV).
                    </span>
                  </label>
                )}
              </div>
            )}

            {!eligibility.eligible && (eligibility.code === "TOO_EARLY_FOR_UNREACHABLE" || eligibility.code === "WINDOW_EXPIRED") && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{eligibility.error}</span>
              </div>
            )}

            {reason === "unreachable" && eligibility.code !== "TOO_EARLY_FOR_UNREACHABLE" && eligibility.code !== "WINDOW_EXPIRED" && (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 flex flex-col gap-2.5 text-xs">
                {contactPreference === "written_first" && (
                  <p className="text-foreground font-medium">
                    Ce prospect a demandé une <strong className="text-foreground">approche écrite (SMS / e-mail) d&apos;abord</strong> : un message écrit avant ou après les appels est requis.
                  </p>
                )}
                <label className="flex items-start gap-2.5 cursor-pointer text-foreground">
                  <Checkbox
                    checked={diligenceConfirmed}
                    onCheckedChange={(checked) => setDiligenceConfirmed(checked === true)}
                    className="mt-0.5"
                  />
                  <span className="leading-snug">
                    Je confirme avoir effectué au moins{" "}
                    <strong className="font-mono tabular-nums">3 tentatives</strong> sur{" "}
                    <strong className="font-mono tabular-nums">≥ 24 h</strong> espacées de{" "}
                    <strong className="font-mono tabular-nums">4 h</strong> min.
                    {contactPreference === "written_first"
                      ? " (incluant au moins 1 SMS, WhatsApp ou e-mail écrit)."
                      : " (appels et SMS/e-mail)."}
                  </span>
                </label>
              </div>
            )}

            {reason === "other" && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex flex-col gap-1.5 text-xs text-foreground">
                <span className="font-bold">Exclusions contractuelles (Article 5.4 des CGV)</span>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Ne donnent pas droit à un recrédit : le prospect qui a changé d&apos;avis ou renonce après prise de contact, le refus de devis/tarif, le choix d&apos;un concurrent ou les contraintes techniques toiture/réseau découvertes sur place.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-foreground">
                  Précisions &amp; Tentatives de contact (obligatoire)
                </label>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isDetailsValid ? "text-status-qualified font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {trimmedLength}/{MIN_DISPUTE_DETAILS_LENGTH} car. min.
                </span>
              </div>
              <textarea
                rows={3}
                required
                minLength={MIN_DISPUTE_DETAILS_LENGTH}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={activeReasonMeta.placeholder}
                className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm sm:text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-hidden"
              />
              {hasUnreachablePhrasingUnderWrongNumber && (
                <p className="mt-1.5 text-[11px] font-medium text-destructive leading-snug">
                  Votre description indique une absence de réponse aux appels : sélectionnez le motif « Prospect injoignable après 3 tentatives sur ≥ 24 h » plutôt que « Numéro erroné ».
                </p>
              )}
              {art54ExclusionUnderOther.excluded && (
                <p className="mt-1.5 text-[11px] font-medium text-destructive leading-snug">
                  {art54ExclusionUnderOther.error}
                </p>
              )}
            </div>

            <div className="grid grid-cols-[auto_1fr] sm:flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="min-h-[44px] sm:h-9 px-4 rounded-xl text-xs font-semibold"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="min-h-[44px] sm:h-9 px-4 rounded-xl text-xs font-bold"
                disabled={
                  submitting ||
                  eligibility.code === "TOO_EARLY_FOR_UNREACHABLE" ||
                  eligibility.code === "WINDOW_EXPIRED" ||
                  hasUnreachablePhrasingUnderWrongNumber ||
                  art54ExclusionUnderOther.excluded ||
                  (reason === "wrong_number" && (!wrongNumberProof || (selectedChannelVerified && !wrongNumberVerifiedAck))) ||
                  (reason === "unreachable" && !diligenceConfirmed)
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Envoi en cours...</span>
                  </>
                ) : eligibility.code === "TOO_EARLY_FOR_UNREACHABLE" ? (
                  <span className="font-mono tabular-nums">
                    Disponible dans {eligibility.remainingHoursForUnreachable} h
                  </span>
                ) : (
                  <span>Envoyer la réclamation</span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
