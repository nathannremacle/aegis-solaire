"use client"

import * as React from "react"
import { useState } from "react"
import { Bell, MapPin, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface AlertPreferencesModalProps {
  partner: any
  onClose: () => void
}

const ALL_PROVINCES = [
  { id: "liege", label: "Liège" },
  { id: "namur", label: "Namur" },
  { id: "hainaut", label: "Hainaut" },
  { id: "brabant_wallon", label: "Brabant Wallon" },
  { id: "luxembourg", label: "Luxembourg" },
]

export default function AlertPreferencesModal({ partner, onClose }: AlertPreferencesModalProps) {
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(
    partner.target_provinces && partner.target_provinces.length > 0
      ? partner.target_provinces
      : ["liege", "namur", "hainaut", "brabant_wallon", "luxembourg"]
  )
  const [minSurface, setMinSurface] = useState<number>(100)
  const [saving, setSaving] = useState(false)

  const toggleProvince = (pId: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(pId) ? prev.filter((p) => p !== pId) : [...prev, pId]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/partners/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provinces: selectedProvinces,
          minFacture: minSurface * 25,
        }),
      })
      if (!res.ok) throw new Error("Erreur de sauvegarde")
      toast.success("Préférences et alertes enregistrées avec succès !")
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-[#001D3D]">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#001D3D]">Alertes &amp; Périmètre Wallon</h3>
            <p className="text-xs text-neutral-500">Recevez des notifications pour les nouveaux leads qualifiés</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              <span>Provinces cibles prioritaires</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ALL_PROVINCES.map((prov) => {
                const active = selectedProvinces.includes(prov.id)
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => toggleProvince(prov.id)}
                    className={`flex items-center justify-between rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                      active
                        ? "border-[#001D3D] bg-[#001D3D] text-white shadow-2xs"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <span>{prov.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-[#FFB800]" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700">Surface minimale souhaitée (m²)</label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={minSurface}
                onChange={(e) => setMinSurface(Number(e.target.value))}
                className="w-full accent-[#001D3D]"
              />
              <span className="font-mono text-xs font-bold text-[#001D3D] shrink-0 w-16 text-right">
                {minSurface} m²
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              Idéal pour cibler les dossiers haute valeur (toitures commerciales et ombrières de parking).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" variant="accent" size="sm" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Enregistrer</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
