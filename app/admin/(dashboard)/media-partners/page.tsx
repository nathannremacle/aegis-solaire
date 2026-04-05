"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Pencil, Euro, Users, TrendingUp, Copy, CheckCircle2, XCircle, Loader2, Inbox } from "lucide-react"

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

type MediaPartnerApplication = {
  id: string
  name: string
  email: string
  company_name: string
  website_url: string | null
  experience_description: string
  expected_leads_per_month: number
  status: string
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Actif</Badge>
  if (status === "paused") return <Badge variant="secondary">Pausé</Badge>
  return <Badge variant="destructive">Suspendu</Badge>
}

export default function AdminMediaPartnersPage() {
  const [partners, setPartners] = useState<MediaPartner[]>([])
  const [applications, setApplications] = useState<MediaPartnerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [editing, setEditing] = useState<MediaPartner | null>(null)
  const [form, setForm] = useState({ commission_b2b: 100, commission_b2c: 25, status: "active" })
  const [saving, setSaving] = useState(false)
  const [applicationActionId, setApplicationActionId] = useState<string | null>(null)
  const [viewingApplication, setViewingApplication] = useState<MediaPartnerApplication | null>(null)

  const loadPartners = useCallback(() => {
    return fetch("/api/admin/media-partners", { headers: { "x-admin-request": "true" } })
      .then((r) => r.json())
      .then((data) => setPartners(data))
  }, [])

  const loadApplications = useCallback(() => {
    return fetch("/api/admin/media-partner-applications", { headers: { "x-admin-request": "true" } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setApplications(data)
        else setApplications([])
      })
  }, [])

  useEffect(() => {
    Promise.all([loadPartners(), loadApplications()])
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => {
        setLoading(false)
        setApplicationsLoading(false)
      })
  }, [loadPartners, loadApplications])

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

  async function handleApplicationAction(id: string, action: "approve" | "reject") {
    if (action === "reject") {
      const ok = window.confirm("Rejeter cette candidature ?")
      if (!ok) return
    }
    setApplicationActionId(id)
    try {
      const res = await fetch(`/api/admin/media-partner-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Action impossible")
        return
      }
      if (action === "approve") {
        toast.success(
          data.tracking_code
            ? `Marketeur créé — code ${data.tracking_code} (100 € B2B / 25 € B2C)`
            : "Candidature approuvée"
        )
        await loadPartners()
      } else {
        toast.success("Candidature rejetée")
      }
      await loadApplications()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setApplicationActionId(null)
    }
  }

  function ApplicationStatusBadge({ status }: { status: string }) {
    if (status === "pending") return <Badge variant="secondary">En attente</Badge>
    if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-800">Approuvée</Badge>
    if (status === "rejected") return <Badge variant="destructive">Rejetée</Badge>
    return <Badge variant="outline">{status}</Badge>
  }

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

      {/* Candidatures */}
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-1 border-b border-border bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Candidatures</h2>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Approuver crée un marketeur (code ref. MP-…, commissions 100 € / 25 €).
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {applicationsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des candidatures…</p>
          ) : applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune candidature pour le moment.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-3 text-left font-medium sm:px-4">Date</th>
                    <th className="px-3 py-3 text-left font-medium sm:px-4">Contact</th>
                    <th className="px-3 py-3 text-left font-medium sm:px-4">Structure</th>
                    <th className="px-3 py-3 text-right font-medium sm:px-4">Leads / mois</th>
                    <th className="px-3 py-3 text-left font-medium sm:px-4">Statut</th>
                    <th className="px-3 py-3 text-right font-medium sm:px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground sm:px-4">
                        {new Date(app.created_at).toLocaleString("fr-BE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="max-w-[200px] px-3 py-3 sm:max-w-xs sm:px-4">
                        <div className="font-medium text-foreground">{app.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{app.email}</div>
                      </td>
                      <td className="max-w-[220px] px-3 py-3 sm:px-4">
                        <div className="font-medium">{app.company_name}</div>
                        {app.website_url && (
                          <a
                            href={app.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline-offset-2 hover:underline"
                          >
                            Site web
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums sm:px-4">{app.expected_leads_per_month}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <ApplicationStatusBadge status={app.status} />
                      </td>
                      <td className="px-3 py-3 text-right sm:px-4">
                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setViewingApplication(app)}>
                            Dossier
                          </Button>
                          {app.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                disabled={applicationActionId === app.id}
                                onClick={() => handleApplicationAction(app.id, "approve")}
                              >
                                {applicationActionId === app.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    Approuver
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                disabled={applicationActionId === app.id}
                                onClick={() => handleApplicationAction(app.id, "reject")}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Rejeter
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!viewingApplication} onOpenChange={(o) => !o && setViewingApplication(null)}>
        {viewingApplication && (
          <DialogContent className="max-h-[min(90vh,640px)] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Candidature — {viewingApplication.company_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium text-foreground">Contact :</span> {viewingApplication.name} —{" "}
                {viewingApplication.email}
              </p>
              {viewingApplication.website_url && (
                <p>
                  <span className="font-medium text-foreground">Site :</span>{" "}
                  <a href={viewingApplication.website_url} className="text-primary underline" target="_blank" rel="noreferrer">
                    {viewingApplication.website_url}
                  </a>
                </p>
              )}
              <p>
                <span className="font-medium text-foreground">Volume indicatif :</span>{" "}
                {viewingApplication.expected_leads_per_month} leads / mois
              </p>
              <div>
                <p className="font-medium text-foreground">Expérience &amp; canaux</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{viewingApplication.experience_description}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingApplication(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

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
