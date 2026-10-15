"use client"

import * as React from "react"
import { useState } from "react"
import { AlertCircle, ShieldAlert, CheckCircle2, Loader2, X } from "lucide-react"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-100 p-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#001D3D]">Signaler un Litige (Garantie 24h)</h3>
            <p className="text-xs text-neutral-500">
              Lead : {purchase.first_name} {purchase.last_name} ({purchase.company || purchase.segment})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Les réclamations sont examinées sous 24h ouvrées. En cas de validation, les{" "}
              <strong>{purchase.credits_spent || 2} crédits</strong> vous seront automatiquement recrédités.
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700">Motif de la réclamation</label>
            <div className="mt-2 space-y-2">
              {DISPUTE_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                    reason === r.id
                      ? "border-red-500 bg-red-50/40 text-red-950 font-bold"
                      : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={(e) => setReason(e.target.value)}
                    className="accent-red-600"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700">
              Précisions &amp; Tentatives de contact (obligatoire)
            </label>
            <textarea
              rows={3}
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex: J'ai appelé à 3 reprises le 14/10 à 10h et 16h, le numéro n'est pas attribué..."
              className="mt-1.5 w-full rounded-lg border border-neutral-200 p-2.5 text-xs focus:border-[#001D3D] focus:ring-1 focus:ring-[#001D3D] outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant="default" size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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
