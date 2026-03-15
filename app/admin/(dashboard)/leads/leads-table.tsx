"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { LeadScoreBadge } from "@/components/admin-lead-score-badge"
import { LeadDetailSheet } from "./lead-detail-sheet"

type Installateur = { id: string; name: string; actif: boolean }

type Lead = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company: string | null
  message?: string | null
  surface_type: string
  surface_area: number
  project_timeline?: string | null
  annual_electricity_bill: number
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  status: string
  lead_score?: number | null
  installateur_id?: string | null
  created_at: string
}

function CleanupLeadsButton() {
  const [loading, setLoading] = useState(false)
  async function handleCleanup() {
    if (!confirm("Anonymiser les leads de plus de 3 ans (conformité RGPD) ? Cette action est irréversible.")) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/cleanup-leads", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur")
      toast.success(data.message ?? `${data.anonymized_count} lead(s) anonymisés.`)
      if (data.anonymized_count > 0) window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors du nettoyage RGPD")
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handleCleanup} disabled={loading}>
      {loading ? "Nettoyage…" : "Nettoyage RGPD (3 ans)"}
    </Button>
  )
}

function buildLeadsUrl(params: { page?: number; status?: string; search?: string; installateur?: string; leadId?: string }) {
  const q = new URLSearchParams()
  if (params.page && params.page > 1) q.set("page", String(params.page))
  if (params.status && params.status !== "all") q.set("status", params.status)
  if (params.installateur && params.installateur !== "all") q.set("installateur", params.installateur)
  if (params.search) q.set("search", params.search)
  if (params.leadId) q.set("leadId", params.leadId)
  const s = q.toString()
  return s ? `/admin/leads?${s}` : "/admin/leads"
}

export function LeadsTable({
  leads,
  total,
  page,
  limit,
  installateurs = [],
  statusFilter,
  searchDefault = "",
  installateurFilter = "",
  leadId = null,
  currentLeadFromList = null,
}: {
  leads: Lead[]
  total: number
  page: number
  limit: number
  installateurs?: Installateur[]
  statusFilter: string
  searchDefault?: string
  installateurFilter?: string
  leadId?: string | null
  currentLeadFromList?: Lead | null
}) {
  const router = useRouter()
  const totalPages = Math.ceil(total / limit) || 1

  function getInstallateurName(id: string | null | undefined): string {
    if (!id) return "–"
    return installateurs.find((i) => i.id === id)?.name ?? "–"
  }

  function openLeadDetail(id: string) {
    router.push(buildLeadsUrl({ page, status: statusFilter || undefined, installateur: installateurFilter || undefined, search: searchDefault || undefined, leadId: id }))
  }

  function closeLeadDetail() {
    router.push(buildLeadsUrl({ page, status: statusFilter || undefined, installateur: installateurFilter || undefined, search: searchDefault || undefined }))
  }

  function onStatusChange(value: string) {
    const params = new URLSearchParams()
    if (value && value !== "all") params.set("status", value)
    if (installateurFilter && installateurFilter !== "all") params.set("installateur", installateurFilter)
    if (searchDefault) params.set("search", searchDefault)
    params.set("page", "1")
    router.push(`/admin/leads?${params.toString()}`)
  }

  function onInstallateurChange(value: string) {
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (value && value !== "all") params.set("installateur", value)
    if (searchDefault) params.set("search", searchDefault)
    params.set("page", "1")
    router.push(`/admin/leads?${params.toString()}`)
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim()
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (installateurFilter && installateurFilter !== "all") params.set("installateur", installateurFilter)
    if (email) params.set("search", email)
    params.set("page", "1")
    router.push(`/admin/leads?${params.toString()}`)
  }

  const exportCsvUrl = () => {
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
    if (installateurFilter && installateurFilter !== "all") params.set("installateur", installateurFilter)
    if (searchDefault) params.set("search", searchDefault)
    return `/api/admin/leads/export?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={onSearch} className="flex gap-2">
          <Input
            name="search"
            placeholder="Rechercher par email..."
            className="w-48"
            defaultValue={searchDefault}
          />
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>
        <Select value={statusFilter || "all"} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="new">Nouveau</SelectItem>
            <SelectItem value="contacted">Contacté</SelectItem>
            <SelectItem value="qualified">Qualifié</SelectItem>
            <SelectItem value="converted">Converti</SelectItem>
            <SelectItem value="lost">Perdu</SelectItem>
            <SelectItem value="HOT_LEAD">Lead chaud</SelectItem>
            <SelectItem value="NEEDS_HUMAN_REVIEW">À contrôler</SelectItem>
          </SelectContent>
        </Select>
        <Select value={installateurFilter || "all"} onValueChange={onInstallateurChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Installateur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les installateurs</SelectItem>
            {installateurs.map((i) => (
              <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <a href={exportCsvUrl()} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">Exporter CSV</Button>
        </a>
        <CleanupLeadsButton />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Tél.</th>
              <th className="px-4 py-3 text-left font-medium">Entreprise</th>
              <th className="px-4 py-3 text-left font-medium">Installateur</th>
              <th className="px-4 py-3 text-left font-medium">Surface</th>
              <th className="px-4 py-3 text-left font-medium">Facture</th>
              <th className="px-4 py-3 text-left font-medium">ROI</th>
              <th className="px-4 py-3 text-left font-medium">Score</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun lead.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
                  onClick={() => openLeadDetail(lead.id)}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium">{lead.first_name} {lead.last_name}</td>
                  <td className="px-4 py-3">{lead.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.company ?? "–"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getInstallateurName(lead.installateur_id)}</td>
                  <td className="px-4 py-3">{lead.surface_area} m² ({lead.surface_type})</td>
                  <td className="px-4 py-3">{lead.annual_electricity_bill.toLocaleString("fr-FR")} €</td>
                  <td className="px-4 py-3">{lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"}</td>
                  <td className="px-4 py-3">
                    <LeadScoreBadge score={lead.lead_score} />
                  </td>
                  <td className="px-4 py-3">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} lead{total !== 1 ? "s" : ""} · page {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={
                page > 1
                  ? `/admin/leads?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}${installateurFilter && installateurFilter !== "all" ? `&installateur=${encodeURIComponent(installateurFilter)}` : ""}${searchDefault ? `&search=${encodeURIComponent(searchDefault)}` : ""}`
                  : "#"
              }
            >
              <Button variant="outline" size="sm" disabled={page <= 1}>Précédent</Button>
            </Link>
            <Link
              href={
                page < totalPages
                  ? `/admin/leads?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}${installateurFilter && installateurFilter !== "all" ? `&installateur=${encodeURIComponent(installateurFilter)}` : ""}${searchDefault ? `&search=${encodeURIComponent(searchDefault)}` : ""}`
                  : "#"
              }
            >
              <Button variant="outline" size="sm" disabled={page >= totalPages}>Suivant</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
