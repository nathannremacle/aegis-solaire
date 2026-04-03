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

type Installateur = { id: string; name: string; actif: boolean; region?: string | null }

type LeadFilters = {
  status: string
  search: string
  installateurId: string
  dateFrom: string
  dateTo: string
  surfaceMin: string
  surfaceType: string
  region: string
}

type Lead = {
  id: string
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  job_title: string
  company: string | null
  message?: string | null
  surface_type: string | null
  surface_area: number | null
  project_timeline?: string | null
  annual_electricity_bill: number | null
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  status: string
  lead_score?: number | null
  installateur_id?: string | null
  segment?: string | null
  province?: string | null
  media_partner_code?: string | null
  created_at: string
}

function CleanupLeadsButton() {
  const [loading, setLoading] = useState(false)
  async function handleCleanup() {
    if (!confirm("Anonymiser les leads de plus de 3 ans (conformité RGPD) ? Cette action est irréversible.")) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/cleanup-leads", { 
        method: "POST",
        headers: { "x-admin-request": "true" }
      })
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

function buildLeadsUrl(params: {
  page?: number
  status?: string
  search?: string
  installateur?: string
  leadId?: string
  date_from?: string
  date_to?: string
  surface_min?: string
  surface_type?: string
  region?: string
}) {
  const q = new URLSearchParams()
  if (params.page && params.page > 1) q.set("page", String(params.page))
  if (params.status && params.status !== "all") q.set("status", params.status)
  if (params.installateur && params.installateur !== "all") q.set("installateur", params.installateur)
  if (params.search) q.set("search", params.search)
  if (params.leadId) q.set("leadId", params.leadId)
  if (params.date_from) q.set("date_from", params.date_from)
  if (params.date_to) q.set("date_to", params.date_to)
  if (params.surface_min) q.set("surface_min", params.surface_min)
  if (params.surface_type) q.set("surface_type", params.surface_type)
  if (params.region) q.set("region", params.region)
  const s = q.toString()
  return s ? `/admin/leads?${s}` : "/admin/leads"
}

function filtersToParams(f: LeadFilters) {
  return {
    status: f.status || undefined,
    installateur: f.installateurId !== "all" ? f.installateurId : undefined,
    search: f.search || undefined,
    date_from: f.dateFrom || undefined,
    date_to: f.dateTo || undefined,
    surface_min: f.surfaceMin || undefined,
    surface_type: f.surfaceType || undefined,
    region: f.region || undefined,
  }
}

export function LeadsTable({
  leads,
  total,
  page,
  limit,
  installateurs = [],
  regions = [],
  filters,
  leadId = null,
  currentLeadFromList = null,
}: {
  leads: Lead[]
  total: number
  page: number
  limit: number
  installateurs?: Installateur[]
  regions?: string[]
  filters: LeadFilters
  leadId?: string | null
  currentLeadFromList?: Lead | null
}) {
  const router = useRouter()
  const totalPages = Math.ceil(total / limit) || 1
  const baseUrlParams = () => ({
    ...filtersToParams(filters),
    page,
  })

  function getInstallateurName(id: string | null | undefined): string {
    if (!id) return "–"
    return installateurs.find((i) => i.id === id)?.name ?? "–"
  }

  function openLeadDetail(id: string) {
    router.push(buildLeadsUrl({ ...baseUrlParams(), leadId: id }))
  }

  function closeLeadDetail() {
    router.push(buildLeadsUrl(baseUrlParams()))
  }

  function applyParams(updates: Partial<LeadFilters> & { page?: number }) {
    const p = { ...filters, ...updates }
    const q = new URLSearchParams()
    q.set("page", String(updates.page ?? 1))
    if (p.status && p.status !== "all") q.set("status", p.status)
    if (p.installateurId && p.installateurId !== "all") q.set("installateur", p.installateurId)
    if (p.search) q.set("search", p.search)
    if (p.dateFrom) q.set("date_from", p.dateFrom)
    if (p.dateTo) q.set("date_to", p.dateTo)
    if (p.surfaceMin) q.set("surface_min", p.surfaceMin)
    if (p.surfaceType) q.set("surface_type", p.surfaceType)
    if (p.region) q.set("region", p.region)
    router.push(`/admin/leads?${q.toString()}`)
  }

  function onStatusChange(value: string) {
    applyParams({ status: value, page: 1 })
  }

  function onInstallateurChange(value: string) {
    applyParams({ installateurId: value, page: 1 })
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim()
    applyParams({ search: email ?? "", page: 1 })
  }

  function onAdvancedFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const dateFrom = (form.elements.namedItem("date_from") as HTMLInputElement)?.value ?? ""
    const dateTo = (form.elements.namedItem("date_to") as HTMLInputElement)?.value ?? ""
    const surfaceMin = (form.elements.namedItem("surface_min") as HTMLInputElement)?.value ?? ""
    const surfaceType = (form.elements.namedItem("surface_type") as HTMLSelectElement)?.value ?? ""
    const region = (form.elements.namedItem("region") as HTMLSelectElement)?.value ?? ""
    applyParams({ dateFrom, dateTo, surfaceMin, surfaceType, region, page: 1 })
  }

  const exportCsvUrl = () => {
    const params = new URLSearchParams()
    if (filters.status && filters.status !== "all") params.set("status", filters.status)
    if (filters.installateurId && filters.installateurId !== "all") params.set("installateur", filters.installateurId)
    if (filters.search) params.set("search", filters.search)
    if (filters.dateFrom) params.set("date_from", filters.dateFrom)
    if (filters.dateTo) params.set("date_to", filters.dateTo)
    if (filters.surfaceMin) params.set("surface_min", filters.surfaceMin)
    if (filters.surfaceType) params.set("surface_type", filters.surfaceType)
    if (filters.region) params.set("region", filters.region)
    return `/api/admin/leads/export?${params.toString()}`
  }

  function paginationQueryForPage(pageNum: number) {
    const q = new URLSearchParams()
    q.set("page", String(pageNum))
    if (filters.status && filters.status !== "all") q.set("status", filters.status)
    if (filters.installateurId && filters.installateurId !== "all") q.set("installateur", filters.installateurId)
    if (filters.search) q.set("search", filters.search)
    if (filters.dateFrom) q.set("date_from", filters.dateFrom)
    if (filters.dateTo) q.set("date_to", filters.dateTo)
    if (filters.surfaceMin) q.set("surface_min", filters.surfaceMin)
    if (filters.surfaceType) q.set("surface_type", filters.surfaceType)
    if (filters.region) q.set("region", filters.region)
    return q.toString()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={onSearch} className="flex gap-2">
          <Input
            name="search"
            placeholder="Rechercher par email..."
            className="w-48"
            defaultValue={filters.search}
          />
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>
        <Select value={filters.status || "all"} onValueChange={onStatusChange}>
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
        <Select value={filters.installateurId || "all"} onValueChange={onInstallateurChange}>
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

      {/* Filtres avancés : date, surface, région */}
      <form onSubmit={onAdvancedFilters} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <span className="text-sm font-medium text-foreground w-full sm:w-auto">Filtres avancés</span>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Du</span>
          <Input
            type="date"
            name="date_from"
            className="h-8 w-36"
            defaultValue={filters.dateFrom}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Au</span>
          <Input
            type="date"
            name="date_to"
            className="h-8 w-36"
            defaultValue={filters.dateTo}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Surface min (m²)</span>
          <Input
            type="number"
            name="surface_min"
            min={0}
            placeholder="500"
            className="h-8 w-24"
            defaultValue={filters.surfaceMin}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Type surface</span>
          <select
            name="surface_type"
            className="h-8 w-32 rounded-md border border-input bg-transparent px-2 text-sm"
            defaultValue={filters.surfaceType}
          >
            <option value="">Tous</option>
            <option value="toiture">Toiture</option>
            <option value="parking">Parking</option>
            <option value="friche">Friche</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Région installateur</span>
          <select
            name="region"
            className="h-8 w-40 rounded-md border border-input bg-transparent px-2 text-sm"
            defaultValue={filters.region}
          >
            <option value="">Toutes</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary" size="sm">Appliquer</Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Seg.</th>
              <th className="px-4 py-3 text-left font-medium">Province</th>
              <th className="px-4 py-3 text-left font-medium">Entreprise</th>
              <th className="px-4 py-3 text-left font-medium">Surface</th>
              <th className="px-4 py-3 text-left font-medium">Facture</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
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
                  <td className="px-4 py-3 font-medium">{lead.first_name}{lead.last_name ? ` ${lead.last_name}` : ""}</td>
                  <td className="px-4 py-3">{lead.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${lead.segment === "B2C" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {lead.segment ?? "B2B"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize text-xs">{lead.province?.replace("_", " ") ?? "–"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.company ?? "–"}</td>
                  <td className="px-4 py-3">
                    {lead.surface_area != null && lead.surface_type ? `${lead.surface_area} m² (${lead.surface_type})` : "–"}
                  </td>
                  <td className="px-4 py-3">
                    {lead.annual_electricity_bill != null ? `${lead.annual_electricity_bill.toLocaleString("fr-FR")} €` : "–"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {lead.media_partner_code ? (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[10px] text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">ref:{lead.media_partner_code}</span>
                    ) : "Direct"}
                  </td>
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
              href={page > 1 ? `/admin/leads?${paginationQueryForPage(page - 1)}` : "#"}
            >
              <Button variant="outline" size="sm" disabled={page <= 1}>Précédent</Button>
            </Link>
            <Link
              href={page < totalPages ? `/admin/leads?${paginationQueryForPage(page + 1)}` : "#"}
            >
              <Button variant="outline" size="sm" disabled={page >= totalPages}>Suivant</Button>
            </Link>
          </div>
        </div>
      )}

      <LeadDetailSheet
        leadId={leadId ?? null}
        onClose={closeLeadDetail}
        currentLeadFromList={currentLeadFromList}
      />
    </div>
  )
}
