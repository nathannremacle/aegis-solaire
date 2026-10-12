"use client"

import { useState, useCallback, useEffect, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Trash2, UserPlus, CheckCircle2, XCircle } from "lucide-react"
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
  segment: string
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
  segment?: string
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
  if (params.segment && params.segment !== "all") q.set("segment", params.segment)
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
    segment: f.segment && f.segment !== "all" ? f.segment : undefined,
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
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.search)

  const totalPages = Math.ceil(total / limit) || 1

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        applyParams({ search: searchTerm, page: 1 })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  function toggleAll() {
    if (selectedIds.size === leads.length && leads.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  async function handleBulkAction(updates: any) {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch("/api/admin/leads/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates })
      })
      if (!res.ok) throw new Error("Erreur bulk update")
      toast.success(`${selectedIds.size} leads mis à jour`)
      setSelectedIds(new Set())
      router.refresh()
    } catch (e) {
      toast.error("Échec de l'action groupée")
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Supprimer ces ${selectedIds.size} leads ? Action irréversible.`)) return
    setBulkLoading(true)
    try {
      const res = await fetch("/api/admin/leads/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })
      if (!res.ok) throw new Error("Erreur bulk delete")
      toast.success(`${selectedIds.size} leads supprimés`)
      setSelectedIds(new Set())
      router.refresh()
    } catch (e) {
      toast.error("Échec de la suppression")
    } finally {
      setBulkLoading(false)
    }
  }

  const baseUrlParams = () => ({
    ...filtersToParams(filters),
    page,
  })

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
    if (p.segment && p.segment !== "all") q.set("segment", p.segment)
    
    startTransition(() => {
      router.push(`/admin/leads?${q.toString()}`, { scroll: false })
    })
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const q = new URLSearchParams()
      if (filters.status && filters.status !== "all") q.set("status", filters.status)
      if (filters.installateurId && filters.installateurId !== "all") q.set("installateur", filters.installateurId)
      if (filters.search) q.set("search", filters.search)
      if (filters.dateFrom) q.set("date_from", filters.dateFrom)
      if (filters.dateTo) q.set("date_to", filters.dateTo)
      if (filters.surfaceMin) q.set("surface_min", filters.surfaceMin)
      if (filters.surfaceType) q.set("surface_type", filters.surfaceType)
      if (filters.region) q.set("region", filters.region)
      if (filters.segment && filters.segment !== "all") q.set("segment", filters.segment)
      
      const res = await fetch(`/api/admin/leads/export?${q.toString()}`, { headers: { "x-admin-request": "true" } })
      if (!res.ok) throw new Error("Erreur export")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Export terminé")
    } catch {
      toast.error("Échec de l'export")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4 relative">
      <div className="flex flex-wrap items-center gap-4 transition-all duration-300">
        <div className="relative group flex-1 min-w-[300px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Recherche instantanée..."
            className="pl-9 bg-muted/30 focus:bg-background transition-colors h-10 border-border/60"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.status || "all"} onValueChange={(v) => applyParams({ status: v, page: 1 })}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="new">Nouveau</SelectItem>
              <SelectItem value="contacted">En attente client</SelectItem>
              <SelectItem value="qualified">Qualifié (Audité)</SelectItem>
              <SelectItem value="converted">Assigné (Direct)</SelectItem>
              <SelectItem value="lost">Rejeté / Spam</SelectItem>
              <SelectItem value="HOT_LEAD">Urgent</SelectItem>
              <SelectItem value="NEEDS_HUMAN_REVIEW">À contrôler</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
              {exporting ? "Export..." : "Exporter CSV"}
            </Button>
            <CleanupLeadsButton />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-10 px-4 py-3">
                <Checkbox 
                  checked={selectedIds.size === leads.length && leads.length > 0} 
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Lead</th>
              <th className="px-4 py-3 text-left font-medium text-center">Infos</th>
              <th className="px-4 py-3 text-left font-medium">Réactivité</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground italic">Aucun résultat.</td></tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={cn(
                    "cursor-pointer border-b border-border transition-all group/row",
                    selectedIds.has(lead.id) ? "bg-primary/[0.03]" : "hover:bg-muted/40"
                  )}
                  onClick={() => openLeadDetail(lead.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleOne(lead.id)} />
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{lead.first_name} {lead.last_name}</div>
                    <div className="text-[10px] text-muted-foreground">{lead.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">{lead.segment ?? "B2B"}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px]">
                    {lead.status === "new" ? `${Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60))}h` : "-"}
                  </td>
                  <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover/row:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleBulkAction({ status: "qualified", marketplace_status: "available" })}>Valider (Marketplace)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction({ status: "lost", marketplace_status: "rejected" })}>Rejeter</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedIds(new Set([lead.id])); handleBulkDelete(); }}>Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <p className="text-xs text-muted-foreground">{total} leads · page {page}/{totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => applyParams({ page: page - 1 })} disabled={page <= 1}>Précédent</Button>
            <Button variant="outline" size="sm" onClick={() => applyParams({ page: page + 1 })} disabled={page >= totalPages}>Suivant</Button>
          </div>
        </div>
      )}

      <LeadDetailSheet
        leadId={leadId ?? null}
        onClose={closeLeadDetail}
        currentLeadFromList={currentLeadFromList}
      />

      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-background border border-primary/20 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 backdrop-blur-md animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium pr-4 border-r">{selectedIds.size} sélectionnés</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 gap-2 text-emerald-700" onClick={() => handleBulkAction({ status: "qualified", marketplace_status: "available" })} disabled={bulkLoading}>Valider (Marketplace)</Button>
            <Button size="sm" variant="ghost" className="h-9 text-red-600" onClick={handleBulkDelete} disabled={bulkLoading}>Supprimer</Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Annuler</Button>
        </div>
      )}
    </div>
  )
}
