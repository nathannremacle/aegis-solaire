"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Zap, CreditCard, ShoppingCart, Plus } from "lucide-react"

type Partner = {
  id: string
  company_name: string
  email: string
  phone: string | null
  credits: number
  segment: string | null
  target_provinces: string[] | null
  created_at: string
  stats: {
    leadsPurchased: number
    creditsSpent: number
    creditsTopupped: number
  }
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [creditModal, setCreditModal] = useState<Partner | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/partners", { headers: { "x-admin-request": "true" } })
      .then((r) => r.json())
      .then((data) => setPartners(data))
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false))
  }, [])

  async function handleAddCredits() {
    if (!creditModal || creditAmount <= 0) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/partners/${creditModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ addCredits: creditAmount, reference: "admin_manual" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPartners((prev) =>
        prev.map((p) =>
          p.id === creditModal.id ? { ...p, credits: data.newCredits } : p
        )
      )
      setCreditModal(null)
      toast.success(`${creditAmount} crédits ajoutés`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const totalCreditsCirculation = partners.reduce((s, p) => s + p.credits, 0)
  const totalRevenue = partners.reduce((s, p) => s + p.stats.creditsTopupped, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Partenaires Marketplace</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="h-4 w-4" />Crédits en circulation</div>
          <p className="mt-1 text-2xl font-bold">{totalCreditsCirculation}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShoppingCart className="h-4 w-4" />Leads achetés (total)</div>
          <p className="mt-1 text-2xl font-bold">{partners.reduce((s, p) => s + p.stats.leadsPurchased, 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><CreditCard className="h-4 w-4" />Crédits rechargés (total)</div>
          <p className="mt-1 text-2xl font-bold">{totalRevenue}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : partners.length === 0 ? (
        <p className="text-muted-foreground">Aucun partenaire marketplace.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Entreprise</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Segment</th>
                <th className="px-4 py-3 text-right font-medium">Crédits</th>
                <th className="px-4 py-3 text-right font-medium">Leads achetés</th>
                <th className="px-4 py-3 text-right font-medium">Crédits dépensés</th>
                <th className="px-4 py-3 text-right font-medium">Rechargés</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{p.company_name}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{p.segment ?? "B2B"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold tabular-nums">{p.credits}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.stats.leadsPurchased}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.stats.creditsSpent}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.stats.creditsTopupped}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setCreditModal(p); setCreditAmount(10) }}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Crédits
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!creditModal} onOpenChange={(o) => !o && setCreditModal(null)}>
        {creditModal && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter des crédits — {creditModal.company_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Solde actuel : <strong>{creditModal.credits} crédits</strong>
              </p>
              <div>
                <Label>Crédits à ajouter</Label>
                <Input
                  type="number"
                  min={1}
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreditModal(null)}>Annuler</Button>
              <Button onClick={handleAddCredits} disabled={saving || creditAmount <= 0}>
                {saving ? "Ajout…" : `Ajouter ${creditAmount} crédits`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
