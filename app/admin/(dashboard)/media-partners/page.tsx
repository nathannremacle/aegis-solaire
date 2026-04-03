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
import { Pencil, Euro, Users, TrendingUp, Copy } from "lucide-react"

type MediaPartner = {
  id: string
  name: string
  email: string
  tracking_code: string
  commission_b2b: number
  commission_b2c: number
  status: string
  created_at: string
  stats: {
    totalLeads: number
    qualifiedLeads: number
    b2bQualified: number
    b2cQualified: number
    commissionDue: number
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Actif</Badge>
  if (status === "paused") return <Badge variant="secondary">Pausé</Badge>
  return <Badge variant="destructive">Suspendu</Badge>
}

export default function AdminMediaPartnersPage() {
  const [partners, setPartners] = useState<MediaPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MediaPartner | null>(null)
  const [form, setForm] = useState({ commission_b2b: 100, commission_b2c: 25, status: "active" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/media-partners", { headers: { "x-admin-request": "true" } })
      .then((r) => r.json())
      .then((data) => setPartners(data))
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false))
  }, [])

  function openEdit(mp: MediaPartner) {
    setEditing(mp)
    setForm({
      commission_b2b: mp.commission_b2b,
      commission_b2c: mp.commission_b2c,
      status: mp.status,
    })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/media-partners/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setPartners((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...updated } : p)))
      setEditing(null)
      toast.success("Marketeur mis à jour")
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  const totalCommissionDue = partners.reduce((s, p) => s + p.stats.commissionDue, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Marketeurs (Media Partners)</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />Marketeurs actifs</div>
          <p className="mt-1 text-2xl font-bold">{partners.filter((p) => p.status === "active").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" />Leads attribués</div>
          <p className="mt-1 text-2xl font-bold">{partners.reduce((s, p) => s + p.stats.totalLeads, 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Euro className="h-4 w-4" />Commissions dues (total)</div>
          <p className="mt-1 text-2xl font-bold text-amber-600">{totalCommissionDue.toLocaleString("fr-BE")} €</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : partners.length === 0 ? (
        <p className="text-muted-foreground">Aucun marketeur enregistré.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Code ref</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Leads</th>
                <th className="px-4 py-3 text-right font-medium">Qualifiés</th>
                <th className="px-4 py-3 text-right font-medium">B2B / B2C qual.</th>
                <th className="px-4 py-3 text-right font-medium">Commission B2B</th>
                <th className="px-4 py-3 text-right font-medium">Commission B2C</th>
                <th className="px-4 py-3 text-right font-medium text-amber-600">Dû</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((mp) => (
                <tr key={mp.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{mp.name}</td>
                  <td className="px-4 py-3">{mp.email}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(mp.tracking_code); toast.success("Code copié") }}
                      className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary"
                    >
                      {mp.tracking_code} <Copy className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={mp.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{mp.stats.totalLeads}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{mp.stats.qualifiedLeads}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs">{mp.stats.b2bQualified} / {mp.stats.b2cQualified}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{mp.commission_b2b} €</td>
                  <td className="px-4 py-3 text-right tabular-nums">{mp.commission_b2c} €</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-600">{mp.stats.commissionDue.toLocaleString("fr-BE")} €</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(mp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier {editing.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Commission B2B (€)</Label>
                <Input type="number" min={0} value={form.commission_b2b} onChange={(e) => setForm((f) => ({ ...f, commission_b2b: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Commission B2C (€)</Label>
                <Input type="number" min={0} value={form.commission_b2c} onChange={(e) => setForm((f) => ({ ...f, commission_b2c: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Statut</Label>
                <select className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Actif</option>
                  <option value="paused">Pausé</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
