"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { computeWalloniaQuoteBenchmark } from "@/lib/quote-audit-extractor"
import { FileText, ExternalLink, Send, CheckCircle2, Loader2, RefreshCw } from "lucide-react"

interface QuoteAuditRow {
  id: string
  lead_id: string | null
  segment: "B2C" | "B2B"
  postal_code: string
  city: string | null
  province: string | null
  email: string
  phone: string
  wants_counter_offer: boolean
  file_name: string
  signed_file_url: string | null
  extracted_kwc: number | null
  extracted_battery_kwh: number | null
  extracted_price_tvac: number | null
  estimated_overcharge_eur: number | null
  status: string
  created_at: string
}

export function DevisAuditsClient() {
  const [audits, setAudits] = useState<QuoteAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<QuoteAuditRow | null>(null)
  const [kwc, setKwc] = useState("6")
  const [batteryKwh, setBatteryKwh] = useState("0")
  const [quotedPriceTvac, setQuotedPriceTvac] = useState("")
  const [city, setCity] = useState("")
  const [firstName, setFirstName] = useState("Propriétaire")
  const [lastName, setLastName] = useState("Vérifié")
  const [submitting, setSubmitting] = useState(false)

  const fetchAudits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/quote-audits", {
        headers: { "x-admin-request": "true" },
      })
      const data = await res.json()
      if (res.ok && data?.audits) {
        setAudits(data.audits)
      }
    } catch {
      toast.error("Erreur lors du chargement des audits de devis.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAudits()
  }, [fetchAudits])

  const openEditor = (row: QuoteAuditRow) => {
    setSelected(row)
    setKwc(String(row.extracted_kwc ?? 6))
    setBatteryKwh(String(row.extracted_battery_kwh ?? 0))
    setQuotedPriceTvac(row.extracted_price_tvac ? String(row.extracted_price_tvac) : "")
    setCity(row.city || "")
  }

  const liveBenchmark = selected
    ? computeWalloniaQuoteBenchmark({
        kwc: Number(kwc) || 6,
        batteryKwh: Number(batteryKwh) || 0,
        quotedPriceTvac: Number(quotedPriceTvac) || 0,
        vatRate: selected.segment === "B2B" ? 0.21 : 0.06,
      })
    : null

  const handlePublish = async (publishToMarketplace: boolean) => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/quote-audits/${encodeURIComponent(selected.id)}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({
          kwc: Number(kwc) || 6,
          batteryKwh: Number(batteryKwh) || 0,
          quotedPriceTvac: Number(quotedPriceTvac) || 0,
          city,
          firstName,
          lastName,
          publishToMarketplace,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du traitement.")
      }
      toast.success(
        publishToMarketplace
          ? "Rapport envoyé au prospect et Dossier Contre-Offre publié (49 € / 2 slots) !"
          : "Rapport envoyé au prospect (sans publication marketplace)."
      )
      setSelected(null)
      fetchAudits()
    } catch (err: any) {
      toast.error(err?.message || "Impossible de finaliser l'audit.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audits Devis Avant Signature</h1>
          <p className="text-sm text-muted-foreground">
            Devis concurrents déposés sur <span className="font-mono">/verifier-mon-devis</span> · Publication en Dossiers Contre-Offre (<span className="font-mono tabular-nums">49 € HTVA</span> · <span className="font-mono tabular-nums">2 slots</span>).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAudits} className="gap-1.5 cursor-pointer">
          <RefreshCw className="h-4 w-4" />
          <span>Actualiser</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Chargement des audits…</span>
        </div>
      ) : audits.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun devis déposé pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">CP / Province</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Souhait</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audits.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString("fr-BE")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums font-semibold text-foreground">
                    {row.postal_code} ({row.province || "—"}) · {row.segment}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-foreground">{row.email}</div>
                    <div className="font-mono tabular-nums text-muted-foreground">{row.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.signed_file_url ? (
                      <a
                        href={row.signed_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary font-semibold underline underline-offset-4"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="max-w-[160px] truncate">{row.file_name}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{row.file_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.wants_counter_offer ? (
                      <Badge variant="secondary">Contre-offre demandée</Badge>
                    ) : (
                      <span className="text-muted-foreground">Rapport d&apos;abord</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.status === "published_counter_offer" ? (
                      <Badge className="bg-emerald-600 text-white">Publié (49 €)</Badge>
                    ) : row.status === "report_sent" ? (
                      <Badge variant="secondary">Rapport envoyé</Badge>
                    ) : (
                      <Badge variant="outline">À auditer</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant={row.status === "pending_audit" ? "default" : "outline"}
                      onClick={() => openEditor(row)}
                      className="cursor-pointer"
                    >
                      {row.status === "pending_audit" ? "Auditer & Publier" : "Voir / Ré-éditer"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Traitement Audit #{selected.id.slice(0, 8).toUpperCase()} ({selected.postal_code})
              </h2>
              <p className="text-xs text-muted-foreground">
                {selected.email} · <span className="font-mono tabular-nums">{selected.phone}</span>
              </p>
            </div>
            {selected.signed_file_url && (
              <a
                href={selected.signed_file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                <FileText className="h-4 w-4 text-primary" />
                <span>Ouvrir le devis PDF/Photo</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Puissance (kWc)</label>
              <Input
                type="number"
                step="0.1"
                value={kwc}
                onChange={(e) => setKwc(e.target.value)}
                className="font-mono tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Batterie (kWh)</label>
              <Input
                type="number"
                step="0.5"
                value={batteryKwh}
                onChange={(e) => setBatteryKwh(e.target.value)}
                className="font-mono tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Prix devis concurrent (€ TVAC)</label>
              <Input
                type="number"
                value={quotedPriceTvac}
                onChange={(e) => setQuotedPriceTvac(e.target.value)}
                placeholder="Ex : 11450"
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Commune</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Neupré" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Prénom prospect</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Nom prospect</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          {liveBenchmark && (
            <div className="rounded-xl border border-border bg-secondary/40 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Référence Wallonie 2026</span>
                <strong className="font-mono tabular-nums text-sm text-foreground">
                  {liveBenchmark.benchmarkMinTvac.toLocaleString("fr-BE")} € –{" "}
                  {liveBenchmark.benchmarkMaxTvac.toLocaleString("fr-BE")} € TVAC
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Surcoût détecté</span>
                <strong className="font-mono tabular-nums text-sm text-foreground">
                  +{liveBenchmark.estimatedOverchargeEur.toLocaleString("fr-BE")} €
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Tarif Marketplace</span>
                <strong className="font-mono tabular-nums text-sm text-primary">
                  5 cr. (49,00 € HTVA) × 2 slots
                </strong>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setSelected(null)} disabled={submitting} className="cursor-pointer">
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePublish(false)}
              disabled={submitting}
              className="gap-1.5 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Envoyer rapport seul</span>
            </Button>
            <Button onClick={() => handlePublish(true)} disabled={submitting} className="gap-1.5 cursor-pointer">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Envoyer rapport &amp; Publier Contre-Offre (49 €)</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
