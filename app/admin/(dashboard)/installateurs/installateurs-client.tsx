"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { Plus, Pencil, Trash2 } from "lucide-react"

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Erreur")
        setList((prev) => prev.map((i) => (i.id === editing.id ? { ...i, ...payload } : i)))
        toast.success("Installateur mis à jour")
      } else {
        const res = await fetch("/api/admin/installateurs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/admin/installateurs/${deleteId}`, { method: "DELETE" })
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

  return (
    <>
      <div className="flex justify-end">
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
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun installateur. Cliquez sur « Ajouter un installateur » pour en créer un.
                </td>
              </tr>
            ) : (
              list.map((inst) => (
                <tr key={inst.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{inst.name}</td>
                  <td className="px-4 py-3">{inst.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.phone ?? "–"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.region ?? "–"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inst.actif ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {inst.actif ? "Oui" : "Non"}
                    </span>
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
