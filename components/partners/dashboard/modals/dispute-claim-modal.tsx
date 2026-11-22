"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { AlertCircle, ShieldAlert, Loader2, X, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  DISPUTE_REASONS,
  MIN_DISPUTE_DETAILS_LENGTH,
  checkDisputeEligibility,
  type DisputeReasonId,
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
    qualification_metadata?: {
      contactPreference?: string | null
    } | null
  }
  onSuccess?: (dispute: { id: string; status: string; purchase_id: string }) => void
  onClose: () => void
}

export default function DisputeClaimModal({ purchase, onSuccess, onClose }: DisputeClaimModalProps) {
  const [reason, setReason] = useState<DisputeReasonId>("wrong_number")
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

  const eligibility = useMemo(
    () =>
      checkDisputeEligibility({
        reason,
        purchasedAt: purchase.purchased_at,
        details,
        contactPreference,
        diligenceConfirmed: reason === "unreachable" ? diligenceConfirmed : true,
        skipDetailsCheck: true,
      }),
    [reason, purchase.purchased_at, details, contactPreference, diligenceConfirmed]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCheck = checkDisputeEligibility({
      reason,
      purchasedAt: purchase.purchased_at,
      details,
      contactPreference,
      diligenceConfirmed: reason === "unreachable" ? diligenceConfirmed : true,
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
              <ShieldAlert className="h-5 w-5" />
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
                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${reason === r.id
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
                    }}
                    className="accent-destructive"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

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
      </div>
    </div>
  )
}
