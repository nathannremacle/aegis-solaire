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
import { CheckCircle2, XCircle, Clock, Eye, Mail, Send, ShieldCheck } from "lucide-react"

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
  email_verified_at?: string | null
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Approuvé</Badge>
  if (status === "rejected")
    return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">Rejeté</Badge>
  return <Badge variant="secondary">En attente</Badge>
}

function isEmailVerified(app: Application): boolean {
  if (app.email_verified_at) return true
  if (app.admin_notes && app.admin_notes.includes("[EMAIL_VÉRIFIÉ:")) return true
  return false
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Application | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [resendingEmail, setResendingEmail] = useState<"verification" | "marketplace" | null>(null)

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
      const { installateurSync, marketplaceEmailSent, ...appRow } = updated as Application & {
        installateurSync?: { created: boolean; installateurId?: string }
        marketplaceEmailSent?: boolean
      }
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...appRow } : a)))
      setSelected(null)
      if (status === "approved") {
        toast.success(
          marketplaceEmailSent
            ? "Candidature approuvée — installateur synchronisé & e-mail de bienvenue Marketplace envoyé !"
            : "Candidature approuvée — installateur synchronisé avec succès."
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

  async function handleResendEmail(id: string, type: "verification" | "marketplace") {
    setResendingEmail(type)
    try {
      const res = await fetch(`/api/admin/applications/${id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ type }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Erreur lors du renvoi")
      }
      toast.success(result.message || "E-mail envoyé avec succès !")
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de l'e-mail.")
    } finally {
      setResendingEmail(null)
    }
  }

  const pending = apps.filter((a) => a.status === "pending")
  const processed = apps.filter((a) => a.status !== "pending")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Candidatures installateurs</h1>
        {pending.length > 0 && (
          <Badge variant="secondary" className="text-base font-mono">
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
                <th className="px-4 py-3 text-left font-medium">Validation Email</th>
                <th className="px-4 py-3 text-left font-medium">RESCERT</th>
                <th className="px-4 py-3 text-left font-medium">Régions</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...pending, ...processed].map((app) => {
                const verified = isEmailVerified(app)
                return (
                  <tr key={app.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {new Date(app.created_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{app.company_name}</td>
                    <td className="px-4 py-3">{app.first_name} {app.last_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{app.email}</td>
                    <td className="px-4 py-3">
                      {verified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Vérifié
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />
                          En attente
                        </span>
                      )}
                    </td>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selected.company_name}</span>
                <StatusBadge status={selected.status} />
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
                <div><span className="text-muted-foreground">Contact :</span> {selected.first_name} {selected.last_name}</div>
                <div><span className="text-muted-foreground">Fonction :</span> {selected.job_title}</div>
                <div><span className="text-muted-foreground">Email :</span> {selected.email}</div>
                <div><span className="text-muted-foreground">Tél :</span> {selected.phone}</div>
                <div><span className="text-muted-foreground">BCE/KBO :</span> <span className="font-mono tabular-nums">{selected.siret}</span></div>
                <div><span className="text-muted-foreground">RESCERT :</span> <span className="font-mono tabular-nums">{selected.rescert_ref}</span></div>
              </div>

              <div><span className="text-muted-foreground">Régions cibles :</span> {selected.regions.join(", ")}</div>

              {/* État des e-mails et actions de renvoi */}
              <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-xs uppercase tracking-wider text-foreground">
                      Communications & E-mails
                    </span>
                  </div>
                  {isEmailVerified(selected) ? (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Email validé par l'installateur
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Lien de confirmation non cliqué
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={resendingEmail !== null}
                    onClick={() => handleResendEmail(selected.id, "verification")}
                  >
                    <Send className="mr-1.5 h-3 w-3" />
                    {resendingEmail === "verification" ? "Envoi…" : "Renvoyer email de vérification"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={resendingEmail !== null}
                    onClick={() => handleResendEmail(selected.id, "marketplace")}
                  >
                    <ShieldCheck className="mr-1.5 h-3 w-3" />
                    {resendingEmail === "marketplace" ? "Envoi…" : "Renvoyer email Marketplace"}
                  </Button>
                </div>
              </div>

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
                    className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approuver & Activer Marketplace
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
