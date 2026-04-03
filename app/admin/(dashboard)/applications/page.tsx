"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react"

type Application = {
  id: string
  company_name: string
  siret: string
  first_name: string
  last_name: string
  job_title: string
  email: string
  phone: string
  rescert_ref: string
  regions: string[]
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approuvé</Badge>
  if (status === "rejected")
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejeté</Badge>
  return <Badge variant="secondary">En attente</Badge>
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Application | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/applications", { headers: { "x-admin-request": "true" } })
      .then((r) => r.json())
      .then((data) => setApps(data))
      .catch(() => toast.error("Erreur chargement candidatures"))
      .finally(() => setLoading(false))
  }, [])

  async function handleAction(id: string, status: "approved" | "rejected") {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ status, admin_notes: notes }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      const { installateurSync, ...appRow } = updated as Application & {
        installateurSync?: { created: boolean; installateurId?: string }
      }
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...appRow } : a)))
      setSelected(null)
      if (status === "approved") {
        toast.success(
          installateurSync?.created
            ? "Candidature approuvée — installateur ajouté (menu Installateurs)."
            : "Candidature approuvée — fiche installateur mise à jour."
        )
      } else {
        toast.success("Candidature rejetée")
      }
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  const pending = apps.filter((a) => a.status === "pending")
  const processed = apps.filter((a) => a.status !== "pending")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Candidatures installateurs</h1>
        {pending.length > 0 && (
          <Badge variant="secondary" className="text-base">
            <Clock className="mr-1.5 h-4 w-4" />
            {pending.length} en attente
          </Badge>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : apps.length === 0 ? (
        <p className="text-muted-foreground">Aucune candidature reçue.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Entreprise</th>
                <th className="px-4 py-3 text-left font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">RESCERT</th>
                <th className="px-4 py-3 text-left font-medium">Régions</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...pending, ...processed].map((app) => (
                <tr key={app.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(app.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3 font-medium">{app.company_name}</td>
                  <td className="px-4 py-3">{app.first_name} {app.last_name}</td>
                  <td className="px-4 py-3">{app.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{app.rescert_ref}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{app.regions.join(", ")}</td>
                  <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelected(app); setNotes(app.admin_notes ?? "") }}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Détail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.company_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Contact :</span> {selected.first_name} {selected.last_name}</div>
                <div><span className="text-muted-foreground">Fonction :</span> {selected.job_title}</div>
                <div><span className="text-muted-foreground">Email :</span> {selected.email}</div>
                <div><span className="text-muted-foreground">Tél :</span> {selected.phone}</div>
                <div><span className="text-muted-foreground">BCE/KBO :</span> {selected.siret}</div>
                <div><span className="text-muted-foreground">RESCERT :</span> {selected.rescert_ref}</div>
              </div>
              <div><span className="text-muted-foreground">Régions :</span> {selected.regions.join(", ")}</div>
              <div>
                <span className="text-muted-foreground block mb-1">Notes admin</span>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes internes…" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              {selected.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction(selected.id, "rejected")}
                    disabled={saving}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Rejeter
                  </Button>
                  <Button
                    onClick={() => handleAction(selected.id, "approved")}
                    disabled={saving}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approuver
                  </Button>
                </>
              )}
              {selected.status === "approved" && (
                <Button
                  variant="secondary"
                  onClick={() => handleAction(selected.id, "approved")}
                  disabled={saving}
                  className="mr-auto"
                >
                  Mettre à jour la fiche Installateurs
                </Button>
              )}
              {selected.status !== "pending" && (
                <Button variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
