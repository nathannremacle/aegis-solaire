"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type Installateur = {
  id: string
  name: string
  email: string
  phone: string | null
  region: string | null
  actif: boolean
  notes: string | null
  created_at: string
  updated_at: string
  leads_count?: number
  converted_count?: number
  last_activity?: string | null
}

export function InstallateursClient({ initialData }: { initialData: Installateur[] }) {
  const [list, setList] = useState<Installateur[]>(initialData)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Installateur | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    region: "",
    actif: true,
    notes: "",
  })

  function openCreate() {
    setEditing(null)
    setForm({ name: "", email: "", phone: "", region: "", actif: true, notes: "" })
    setError(null)
    setModalOpen(true)
  }

  function openEdit(inst: Installateur) {
    setEditing(inst)
    setForm({
      name: inst.name,
      email: inst.email,
      phone: inst.phone ?? "",
      region: inst.region ?? "",
      actif: inst.actif,
      notes: inst.notes ?? "",
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        region: form.region.trim() || null,
        actif: form.actif,
        notes: form.notes.trim() || null,
      }
      if (editing) {
        const res = await fetch(`/api/admin/installateurs/${editing.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-request": "true"
          },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Erreur")
        setList((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...payload } : i)))
        toast.success("Installateur mis à jour")
      } else {
        const res = await fetch("/api/admin/installateurs", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-request": "true"
          },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Erreur")
        setList((prev) => [...prev, { ...data }])
        toast.success("Installateur créé")
      }
      setModalOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/installateurs/${deleteId}`, { 
        method: "DELETE",
        headers: { "x-admin-request": "true" }
      })
      if (!res.ok) throw new Error("Erreur")
      setList((prev) => prev.filter((i) => i.id !== deleteId))
      setDeleteId(null)
      toast.success("Installateur supprimé")
    } catch {
      setError("Impossible de supprimer.")
      toast.error("Impossible de supprimer l'installateur")
    } finally {
      setLoading(false)
    }
  }

  const [tab, setTab] = useState<"network" | "test" | "all">("network")

  const isDevTestAdmin = (inst: Installateur) => {
    const email = (inst.email || "").toLowerCase().trim()
    const name = (inst.name || "").toLowerCase().trim()
    return (
      email === "mrnathanrem@gmail.com" ||
      email === "fabrice.remacle@gmail.com" ||
      name.includes("dev test") ||
      name.includes("mega solar")
    )
  }

  const isSimulation = (inst: Installateur) => {
    const email = (inst.email || "").toLowerCase().trim()
    const name = (inst.name || "").toLowerCase().trim()
    return (
      email.includes("@aegissolaire-pro.be") ||
      name.includes("sogreen") ||
      name.includes("enersol") ||
      name.includes("high tech") ||
      name.includes("solena") ||
      name.includes("belga solar") ||
      name.includes("aitex")
    )
  }

  const networkInstallers = useMemo(
    () => list.filter((i) => !isDevTestAdmin(i)),
    [list]
  )

  const testInstallers = useMemo(
    () => list.filter((i) => isDevTestAdmin(i) || isSimulation(i)),
    [list]
  )

  const displayedList = useMemo(() => {
    if (tab === "test") return testInstallers
    if (tab === "all") return list
    return networkInstallers
  }, [tab, list, networkInstallers, testInstallers])

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab("network")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              tab === "network"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Tous les installateurs</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({networkInstallers.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("test")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              tab === "test"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Installateurs de test</span>
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] tabular-nums font-bold text-amber-700 dark:text-amber-400">
              {testInstallers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              tab === "all"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Tous (incluant admin)</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({list.length})
            </span>
          </button>
        </div>

        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un installateur
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Téléphone</th>
              <th className="px-4 py-3 text-left font-medium">Région</th>
              <th className="px-4 py-3 text-left font-medium">Actif</th>
              <th className="px-4 py-3 text-center font-medium">Performances</th>
              <th className="px-4 py-3 text-left font-medium">Dernière activité</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedList.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {tab === "test"
                    ? "Aucun installateur de test répertorié."
                    : "Aucun installateur. Cliquez sur « Ajouter un installateur » pour en créer un."}
                </td>
              </tr>
            ) : (
              displayedList.map((inst) => (
                <tr key={inst.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{inst.name}</span>
                      {isDevTestAdmin(inst) ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono py-0 h-4 bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 font-semibold"
                        >
                          COMPTE ADMIN TEST
                        </Badge>
                      ) : isSimulation(inst) ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono py-0 h-4 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
                        >
                          SIMULATION E-MAILS
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{inst.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.phone ?? "–"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.region ?? "–"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inst.actif ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {inst.actif ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{inst.leads_count ?? 0}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Leads</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {inst.last_activity ? new Date(inst.last_activity).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "Jamais"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(inst)} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(inst.id)} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'installateur" : "Nouvel installateur"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="region">Région / zone</Label>
              <Input id="region" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="actif" checked={form.actif} onCheckedChange={(v) => setForm((f) => ({ ...f, actif: v }))} />
              <Label htmlFor="actif">Actif</Label>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet installateur ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={loading}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
