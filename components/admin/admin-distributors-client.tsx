"use client"

import * as React from "react"
import Link from "next/link"
import {
  Building2,
  Check,
  Copy,
  FileText,
  Loader2,
  Mail,
  PauseCircle,
  PlayCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { DistributorWithStats } from "@/lib/distributor-partners"
import type { GrowthRunResult } from "@/lib/partner-growth-engine"

interface AdminDistributorsClientProps {
  initialDistributors: DistributorWithStats[]
  tableMissing: boolean
  siteBaseUrl: string
}

export function AdminDistributorsClient({
  initialDistributors,
  tableMissing,
  siteBaseUrl,
}: AdminDistributorsClientProps) {
  const [distributors, setDistributors] = React.useState<DistributorWithStats[]>(initialDistributors)
  const [companyName, setCompanyName] = React.useState("")
  const [contactName, setContactName] = React.useState("")
  const [contactEmail, setContactEmail] = React.useState("")
  const [contactPhone, setContactPhone] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [growthRunning, setGrowthRunning] = React.useState<string | null>(null)
  const [growthOutput, setGrowthOutput] = React.useState<GrowthRunResult | null>(null)

  const refreshList = async () => {
    const res = await fetch("/api/admin/distributors")
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.distributors)) {
        setDistributors(data.distributors)
      }
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) {
      toast.error("Indiquez le nom du grossiste / distributeur.")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/distributors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          rewardCreditsReferred: 3,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Création impossible")
      }
      toast.success(`Distributeur ${companyName.trim()} créé avec son lien co-brandé !`)
      setCompanyName("")
      setContactName("")
      setContactEmail("")
      setContactPhone("")
      await refreshList()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création")
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (dist: DistributorWithStats) => {
    const nextStatus = dist.status === "active" ? "paused" : "active"
    try {
      const res = await fetch(`/api/admin/distributors/${encodeURIComponent(dist.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error("Mise à jour impossible")
      setDistributors((prev) =>
        prev.map((d) => (d.id === dist.id ? { ...d, status: nextStatus } : d))
      )
      toast.success(nextStatus === "active" ? "Distributeur réactivé" : "Distributeur mis en pause")
    } catch (err: any) {
      toast.error(err.message || "Erreur")
    }
  }

  const handleDelete = async (dist: DistributorWithStats) => {
    if (!window.confirm(`Supprimer le distributeur ${dist.company_name} ?`)) return
    try {
      const res = await fetch(`/api/admin/distributors/${encodeURIComponent(dist.id)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Suppression impossible")
      setDistributors((prev) => prev.filter((d) => d.id !== dist.id))
      toast.success("Distributeur supprimé")
    } catch (err: any) {
      toast.error(err.message || "Erreur")
    }
  }

  const handleCopyUrl = async (dist: DistributorWithStats) => {
    const url = `${siteBaseUrl}/partenaires/distributeurs/${dist.slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(dist.id)
      toast.success("Lien co-brandé copié !")
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error("Impossible de copier automatiquement")
    }
  }

  const triggerGrowth = async (
    action: "weekly_digest" | "behavioral_nudges",
    dryRun: boolean
  ) => {
    const key = `${action}:${dryRun ? "dry" : "live"}`
    setGrowthRunning(key)
    try {
      const res = await fetch("/api/admin/growth/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, dryRun }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Erreur exécution")
      setGrowthOutput(data.result)
      toast.success(
        dryRun
          ? `Aperçu prêt : ${data.result?.sentCount ?? 0} destinataire(s) ciblé(s)`
          : `Campagne envoyée à ${data.result?.sentCount ?? 0} partenaire(s)`
      )
    } catch (err: any) {
      toast.error(err.message || "Erreur")
    } finally {
      setGrowthRunning(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {tableMissing && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
          <strong>Migration SQL en attente :</strong> exécutez{" "}
          <span className="font-mono">supabase/migrations/202611270001_approach1_installer_growth_engine.sql</span>{" "}
          dans votre SQL Editor Supabase pour activer l&apos;enregistrement des grossistes PV.
        </div>
      )}

      {/* Section 1 : Pilotage Moteur Croissance (Étage 1) */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-4 shadow-2xs">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
            Étage 1 · Activation &amp; Réactivation Automatisée
          </span>
          <h2 className="text-lg font-bold text-foreground font-heading">
            Pilotage Digest Hebdomadaire &amp; Relances Comportementales 1-Clic
          </h2>
          <p className="text-xs text-muted-foreground">
            Exécuté automatiquement par cron chaque matin (<span className="font-mono tabular-nums">08:00 UTC</span> ; Digest chaque lundi). Utilisez le mode Aperçu pour inspecter la cible avant tout envoi manuel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-secondary/30 p-4 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Mail className="h-4 w-4 text-accent" />
                <span>Digest « Preuve de Marché Locale » (7 j.)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Synthèse 100 % factuelle des vrais chantiers vérifiés/attribués de la semaine dans les provinces de chaque inscrit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(growthRunning)}
                onClick={() => triggerGrowth("weekly_digest", true)}
                className="text-xs rounded-xl cursor-pointer gap-1.5"
              >
                {growthRunning === "weekly_digest:dry" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Aperçu (Dry-Run)</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={Boolean(growthRunning)}
                onClick={() => triggerGrowth("weekly_digest", false)}
                className="text-xs rounded-xl cursor-pointer gap-1.5"
              >
                {growthRunning === "weekly_digest:live" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Envoyer maintenant</span>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Relances Télémétrie 1-Clic (&ge; 20 s sans achat)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Envoie 4 boutons 1-clic de calibration aux partenaires ayant inspecté un dossier sans le débloquer (cooldown 14 j.).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(growthRunning)}
                onClick={() => triggerGrowth("behavioral_nudges", true)}
                className="text-xs rounded-xl cursor-pointer gap-1.5"
              >
                {growthRunning === "behavioral_nudges:dry" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Aperçu (Dry-Run)</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={Boolean(growthRunning)}
                onClick={() => triggerGrowth("behavioral_nudges", false)}
                className="text-xs rounded-xl cursor-pointer gap-1.5"
              >
                {growthRunning === "behavioral_nudges:live" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Envoyer maintenant</span>
              </Button>
            </div>
          </div>
        </div>

        {growthOutput && (
          <div className="rounded-xl border border-border bg-background p-4 flex flex-col gap-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
              <span className="font-bold text-foreground">
                Résultat ({growthOutput.action} · {growthOutput.dryRun ? "DRY-RUN" : "LIVE"})
              </span>
              <span className="text-muted-foreground tabular-nums">
                Éligibles : {growthOutput.eligibleCount} · Envoyés/Prévisualisés : {growthOutput.sentCount} · Ignorés : {growthOutput.skippedCount}
              </span>
            </div>
            {growthOutput.previews.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-border pt-2">
                {growthOutput.previews.map((p) => (
                  <div key={p.partnerId} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-foreground">{p.companyName}</span>
                    <span className="font-mono text-muted-foreground">{p.email}</span>
                    <span className="text-accent">{p.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2 : Création Distributeur / Grossiste PV */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-4 shadow-2xs"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-foreground font-heading">
            Ajouter un Grossiste / Distributeur PV (Kit RDV Win-Win)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dist-company" className="text-xs font-semibold">
              Nom du distributeur *
            </Label>
            <Input
              id="dist-company"
              placeholder="Ex. Cebeo, Rexel, Carbomat..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dist-contact" className="text-xs font-semibold">
              Dirigeant / Responsable
            </Label>
            <Input
              id="dist-contact"
              placeholder="Nom du contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dist-email" className="text-xs font-semibold">
              E-mail pro
            </Label>
            <Input
              id="dist-email"
              type="email"
              placeholder="direction@grossiste.be"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dist-phone" className="text-xs font-semibold">
              Téléphone
            </Label>
            <Input
              id="dist-phone"
              placeholder="+32 ..."
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={creating} className="rounded-xl text-xs font-bold gap-2 cursor-pointer">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Créer la page co-brandée (+3 cr. filleul)</span>
          </Button>
        </div>
      </form>

      {/* Section 3 : Liste & KPI Distributeurs */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground font-heading">
            Distributeurs partenaires ({distributors.length})
          </h2>
        </div>

        {distributors.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Aucun distributeur enregistré pour l&apos;instant. Créez le premier ci-dessus avant votre rendez-vous grossiste.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {distributors.map((dist) => {
              const cobrandedUrl = `${siteBaseUrl}/partenaires/distributeurs/${dist.slug}`
              return (
                <div
                  key={dist.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-foreground">{dist.company_name}</span>
                      <Badge variant={dist.status === "active" ? "default" : "secondary"} className="font-mono text-[10px]">
                        {dist.status === "active" ? "ACTIF" : "EN PAUSE"}
                      </Badge>
                      <span className="font-mono text-xs bg-secondary border border-border px-2 py-0.5 rounded-md">
                        {dist.referral_code}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground truncate">{cobrandedUrl}</span>
                    <div className="flex flex-wrap gap-4 pt-1 text-xs font-mono tabular-nums text-muted-foreground">
                      <span>
                        Candidatures : <strong className="text-foreground">{dist.stats.applicationsCount}</strong>
                      </span>
                      <span>
                        Partenaires : <strong className="text-foreground">{dist.stats.partnersCount}</strong>
                      </span>
                      <span>
                        Activés (1er achat) : <strong className="text-accent">{dist.stats.activatedPartnersCount}</strong>
                      </span>
                      <span>
                        Bonus versés : <strong className="text-foreground">{dist.stats.totalBonusCreditsAwarded} cr.</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(dist)}
                      className="text-xs rounded-xl gap-1.5 cursor-pointer"
                    >
                      {copiedId === dist.id ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>Copier le lien</span>
                    </Button>

                    <Button asChild variant="outline" size="sm" className="text-xs rounded-xl gap-1.5">
                      <Link href={`/admin/distributeurs/${dist.id}/fiche`}>
                        <FileText className="h-3.5 w-3.5 text-accent" />
                        <span>Fiche RDV 1 page</span>
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(dist)}
                      className="text-xs rounded-xl gap-1 cursor-pointer"
                      title={dist.status === "active" ? "Mettre en pause" : "Réactiver"}
                    >
                      {dist.status === "active" ? (
                        <PauseCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-accent" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(dist)}
                      className="text-xs rounded-xl text-destructive hover:text-destructive cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
