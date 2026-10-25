"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { AlertCircle, ShieldAlert, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface DisputeClaimModalProps {
  purchase: {
    purchase_id: string
    lead_id: string
    first_name: string
    last_name: string
    company?: string | null
    credits_spent?: number
    segment?: string | null
  }
  onClose: () => void
}

const DISPUTE_REASONS = [
  { id: "invalid_contact", label: "Numéro de téléphone / email erroné ou injoignable" },
  { id: "out_of_scope", label: "Hors critères (pas propriétaire, locataire, pas de projet)" },
  { id: "already_equipped", label: "Déjà équipé en panneaux photovoltaïques récents" },
  { id: "competitor", label: "Concurrent / test / faux prospect" },
  { id: "fake", label: "Demande non sollicitée par le prospect" },
]

export default function DisputeClaimModal({ purchase, onClose }: DisputeClaimModalProps) {
  const [reason, setReason] = useState<string>("invalid_contact")
  const [details, setDetails] = useState<string>("")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!details.trim() || details.trim().length < 10) {
      toast.error("Veuillez fournir au moins 10 caractères d'explications.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/partners/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: purchase.purchase_id,
          leadId: purchase.lead_id,
          reason,
          details: details.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors du dépôt du litige")

      toast.success("Réclamation enregistrée ! Traitement sous 24h ouvrées par notre équipe conformité.")
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Erreur")
    } finally {
      setSubmitting(false)
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
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 overscroll-contain"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          aria-label="Fermer la boîte de dialogue"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-destructive/10 p-2 text-destructive border border-destructive/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Signaler un Litige (Garantie 24h)</h3>
            <p className="text-xs text-muted-foreground">
              Lead : {purchase.first_name} {purchase.last_name} ({purchase.company || purchase.segment})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs text-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <span>
              Les réclamations sont examinées sous 24h ouvrées. En cas de validation, les{" "}
              <strong className="font-mono tabular-nums">{purchase.credits_spent || 2} crédits</strong> vous seront automatiquement recrédités.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">Motif de la réclamation</label>
            <div className="mt-2 space-y-2">
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
                    onChange={(e) => setReason(e.target.value)}
                    className="accent-destructive"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">
              Précisions &amp; Tentatives de contact (obligatoire)
            </label>
            <textarea
              rows={3}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: J'ai appelé à 3 reprises le 14/10 à 10h et 16h, le numéro n'est pas attribué..."
              className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Envoi en cours...</span>
                </>
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
