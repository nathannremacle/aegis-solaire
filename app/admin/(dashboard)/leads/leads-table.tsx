"use client"

import { useState, useEffect, useCallback, useTransition, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Kbd } from "@/components/ui/kbd"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Search,
  Check,
  X,
  Phone,
  Copy,
  Download,
  AlertTriangle,
  Flame,
  ArrowUpDown,
  MoreHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { LeadScoreBadge } from "@/components/admin-lead-score-badge"
import { LeadDrawer, type LeadDetail } from "@/components/admin/leads/lead-drawer"
import { BulkActionBar } from "@/components/admin/leads/bulk-action-bar"
import { type CompatiblePartner } from "@/components/admin/leads/dispatch-panel"
import { isWalloonPostalCode } from "@/lib/admin/lead-risk"
import {
  publishLeadAction,
  rejectLeadAction,
  bulkQualifyAndPublishAction,
  bulkRejectAction,
} from "@/app/admin/actions"
import { useAdminHotkeys } from "@/hooks/use-admin-hotkeys"

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
  view?: string
}

function formatRelativeAge(dateStr: string): { label: string; isWarning: boolean; isCritical: boolean } {
  const ms = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (hours < 1) {
    const mins = Math.max(1, Math.floor(ms / (1000 * 60)))
    return { label: `${mins} min`, isWarning: false, isCritical: false }
  }
  if (hours < 24) {
    return {
      label: `${hours} h`,
      isWarning: hours >= 4,
      isCritical: false,
    }
  }
  return {
    label: `${days} j`,
    isWarning: true,
    isCritical: days >= 2,
  }
}

export function LeadsTable({
  leads,
  total,
  page,
  limit,
  partners = [],
  filters,
  leadId = null,
  currentLeadFromList = null,
}: {
  leads: LeadDetail[]
  total: number
  page: number
  limit: number
  partners?: CompatiblePartner[]
  filters: LeadFilters
  leadId?: string | null
  currentLeadFromList?: LeadDetail | null
}) {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState(filters.search)
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [exporting, setExporting] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [removedLeadIds, setRemovedLeadIds] = useState<Set<string>>(new Set())
  const [dismissedTriage, setDismissedTriage] = useState(false)
  const initialTriageOpenedRef = useRef(false)

  const activeLeads = useMemo(
    () => leads.filter((l) => !removedLeadIds.has(l.id)),
    [leads, removedLeadIds]
  )

  const isTriageMode = filters.view === "triage"
  const activeLead = leadId ? activeLeads.find((l) => l.id === leadId) ?? currentLeadFromList : null
  const totalPages = Math.ceil(total / limit) || 1

  const buildUrl = useCallback(
    (updates: Partial<LeadFilters> & { page?: number; leadId?: string | null }) => {
      const p = { ...filters, ...updates }
      const q = new URLSearchParams()
      if (updates.page && updates.page > 1) q.set("page", String(updates.page))
      if (p.view) q.set("view", p.view)
      if (p.status && p.status !== "all") q.set("status", p.status)
      if (p.segment && p.segment !== "all") q.set("segment", p.segment)
      if (p.region && p.region !== "all") q.set("region", p.region)
      if (p.search) q.set("search", p.search)
      if (updates.leadId) q.set("leadId", updates.leadId)
      const str = q.toString()
      return str ? `/admin/leads?${str}` : "/admin/leads"
    },
    [filters]
  )

  const applyFilters = useCallback(
    (updates: Partial<LeadFilters> & { page?: number }) => {
      startTransition(() => {
        router.push(buildUrl(updates), { scroll: false })
      })
    },
    [router, buildUrl]
  )

  const openLeadDetail = useCallback(
    (id: string) => {
      setDismissedTriage(false)
      startTransition(() => {
        router.push(buildUrl({ leadId: id }), { scroll: false })
      })
    },
    [router, buildUrl]
  )

  const closeLeadDetail = useCallback(() => {
    setDismissedTriage(true)
    startTransition(() => {
      router.push(buildUrl({ leadId: null }), { scroll: false })
    })
  }, [router, buildUrl])

  // Auto-ouvrir le premier lead en mode Triage UNIQUEMENT au premier montage si aucun lead n'est sélectionné et pas fermé manuellement
  useEffect(() => {
    if (isTriageMode && activeLeads.length > 0 && !leadId && !initialTriageOpenedRef.current && !dismissedTriage) {
      initialTriageOpenedRef.current = true
      openLeadDetail(activeLeads[0].id)
    }
  }, [isTriageMode, activeLeads, leadId, openLeadDetail, dismissedTriage])

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        applyFilters({ search: searchTerm, page: 1 })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm, filters.search, applyFilters])

  function toggleAll() {
    if (selectedIds.size === activeLeads.length && activeLeads.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(activeLeads.map((l) => l.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  // Navigation dans le Drawer
  const activeIndex = activeLeads.findIndex((l) => l.id === activeLead?.id)
  const hasPrevious = activeIndex > 0
  const hasNext = activeIndex >= 0 && activeIndex < activeLeads.length - 1

  function goToPrevious() {
    if (hasPrevious) {
      setFocusedIndex(activeIndex - 1)
      openLeadDetail(activeLeads[activeIndex - 1].id)
    }
  }

  function goToNext() {
    if (hasNext) {
      setFocusedIndex(activeIndex + 1)
      openLeadDetail(activeLeads[activeIndex + 1].id)
    }
  }

  function handleLeadActionDone(id: string, _action: "qualified" | "rejected" | "archived") {
    setRemovedLeadIds((prev) => new Set([...prev, id]))
    const currentIdx = activeLeads.findIndex((l) => l.id === id)
    if (currentIdx !== -1 && currentIdx < activeLeads.length - 1) {
      openLeadDetail(activeLeads[currentIdx + 1].id)
    } else if (currentIdx > 0) {
      openLeadDetail(activeLeads[currentIdx - 1].id)
    } else {
      closeLeadDetail()
    }
  }

  // Actions groupées
  async function handleBulkQualify() {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await bulkQualifyAndPublishAction(Array.from(selectedIds))
      toast.success(`${selectedIds.size} leads qualifiés et publiés`)
      setSelectedIds(new Set())
      router.refresh()
    } catch {
      toast.error("Échec de la validation groupée")
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkReject(reason: string) {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await bulkRejectAction(Array.from(selectedIds), reason)
      toast.success(`${selectedIds.size} leads rejetés (${reason})`)
      setSelectedIds(new Set())
      router.refresh()
    } catch {
      toast.error("Échec du rejet groupé")
    } finally {
      setBulkLoading(false)
    }
  }

  // Export CSV
  async function handleExportCsv() {
    setExporting(true)
    try {
      const q = new URLSearchParams()
      if (filters.status && filters.status !== "all") q.set("status", filters.status)
      if (filters.segment && filters.segment !== "all") q.set("segment", filters.segment)
      if (filters.search) q.set("search", filters.search)
      if (filters.region) q.set("region", filters.region)

      const res = await fetch(`/api/admin/leads/export?${q.toString()}`, {
        headers: { "x-admin-request": "true" },
      })
      if (!res.ok) throw new Error("Erreur export")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `leads_aegis_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Export CSV téléchargé")
    } catch {
      toast.error("Échec de l'export CSV")
    } finally {
      setExporting(false)
    }
  }

  // Raccourcis Clavier Opérationnels (Linear-style)
  useAdminHotkeys({
    j: () => {
      setFocusedIndex((prev) => {
        const next = Math.min(prev + 1, Math.max(0, activeLeads.length - 1))
        if (activeLead && activeLeads[next]) openLeadDetail(activeLeads[next].id)
        return next
      })
    },
    arrowdown: () => {
      setFocusedIndex((prev) => {
        const next = Math.min(prev + 1, Math.max(0, activeLeads.length - 1))
        if (activeLead && activeLeads[next]) openLeadDetail(activeLeads[next].id)
        return next
      })
    },
    k: () => {
      setFocusedIndex((prev) => {
        const next = Math.max(prev - 1, 0)
        if (activeLead && activeLeads[next]) openLeadDetail(activeLeads[next].id)
        return next
      })
    },
    arrowup: () => {
      setFocusedIndex((prev) => {
        const next = Math.max(prev - 1, 0)
        if (activeLead && activeLeads[next]) openLeadDetail(activeLeads[next].id)
        return next
      })
    },
    enter: () => {
      if (activeLeads[focusedIndex]) {
        openLeadDetail(activeLeads[focusedIndex].id)
      }
    },
    x: () => {
      if (activeLeads[focusedIndex]) {
        toggleOne(activeLeads[focusedIndex].id)
      }
    },
    q: () => {
      const target = activeLead || activeLeads[focusedIndex]
      if (target) {
        publishLeadAction(target.id)
        toast.success(`Lead #${target.id.slice(0, 8)} publié`)
        handleLeadActionDone(target.id, "qualified")
      }
    },
    c: () => {
      const target = activeLead || activeLeads[focusedIndex]
      if (target?.phone) {
        navigator.clipboard.writeText(target.phone)
        toast.success("Téléphone copié")
      }
    },
    "/": (e) => {
      e.preventDefault()
      searchInputRef.current?.focus()
    },
    escape: () => {
      closeLeadDetail()
    },
  })

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Page Header Opérationnel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {isTriageMode ? "File de Triage des Leads" : "Contrôle des Leads"}
          </h1>
          <span className="font-mono text-xs tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border">
            {total} leads
          </span>
        </div>

        {/* Tabs de Vue & CTA Primaire Unique */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => applyFilters({ view: "triage", page: 1 })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-sm font-medium transition-colors",
                isTriageMode
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Triage</span>
            </button>
            <button
              type="button"
              onClick={() => applyFilters({ view: undefined, page: 1 })}
              className={cn(
                "px-3 py-1 rounded-sm font-medium transition-colors",
                !isTriageMode
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tous les leads
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (leads.length > 0) openLeadDetail(leads[0].id)
            }}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <span>{isTriageMode ? "Traiter la file" : "Démarrer le triage"}</span>
            <Kbd className="font-mono text-[10px] opacity-70">⏎</Kbd>
          </Button>
        </div>
      </div>

      {/* Toolbar & Faceted Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          {/* Recherche rapide */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Filtrer par nom, e-mail, téléphone, TVA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-card border-border"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-block font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </div>

          {/* Filtre Segment */}
          <Select
            value={filters.segment || "all"}
            onValueChange={(val) => applyFilters({ segment: val, page: 1 })}
          >
            <SelectTrigger className="w-28 h-8 text-xs bg-card">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">Tous segments</SelectItem>
              <SelectItem value="B2B">B2B Tertiaire</SelectItem>
              <SelectItem value="B2C">B2C Résidentiel</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtre Statut */}
          <Select
            value={filters.status || "all"}
            onValueChange={(val) => applyFilters({ status: val, page: 1 })}
          >
            <SelectTrigger className="w-32 h-8 text-xs bg-card">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="new">Nouveau</SelectItem>
              <SelectItem value="NEEDS_HUMAN_REVIEW">À contrôler</SelectItem>
              <SelectItem value="qualified">Qualifié</SelectItem>
              <SelectItem value="converted">Converti</SelectItem>
              <SelectItem value="lost">Rejeté / Spam</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtre Province Wallonne */}
          <Select
            value={filters.region || "all"}
            onValueChange={(val) => applyFilters({ region: val, page: 1 })}
          >
            <SelectTrigger className="w-32 h-8 text-xs bg-card">
              <SelectValue placeholder="Province" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">Toute Wallonie</SelectItem>
              <SelectItem value="liege">Liège</SelectItem>
              <SelectItem value="namur">Namur</SelectItem>
              <SelectItem value="hainaut">Hainaut</SelectItem>
              <SelectItem value="brabant_wallon">Brabant wallon</SelectItem>
              <SelectItem value="luxembourg">Luxembourg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions Secondaires */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3 w-3" />
            <span>{exporting ? "Export…" : "Exporter CSV"}</span>
          </Button>
        </div>
      </div>

      {/* Table Haute Densité */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
              <TableHead className="w-9 px-3">
                <Checkbox
                  checked={selectedIds.size === activeLeads.length && activeLeads.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="w-16 font-mono text-[11px] text-muted-foreground">Âge</TableHead>
              <TableHead className="min-w-[200px]">Prospect / Entreprise</TableHead>
              <TableHead className="w-16 font-mono text-[11px] text-muted-foreground">Seg.</TableHead>
              <TableHead className="min-w-[130px]">Localité</TableHead>
              <TableHead className="min-w-[160px]">Projet technique</TableHead>
              <TableHead className="w-24 text-center font-mono text-[11px] text-muted-foreground">Score</TableHead>
              <TableHead className="w-28 text-center font-mono text-[11px] text-muted-foreground">Statut</TableHead>
              <TableHead className="w-16 text-right font-mono text-[11px] text-muted-foreground">Prix</TableHead>
              <TableHead className="w-20 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-muted-foreground italic">
                  Aucun lead ne correspond aux filtres actuels.
                </TableCell>
              </TableRow>
            ) : (
              activeLeads.map((lead, idx) => {
                const isSelected = selectedIds.has(lead.id)
                const isFocused = idx === focusedIndex
                const isActive = activeLead?.id === lead.id
                const age = formatRelativeAge(lead.created_at)
                const isB2B = lead.segment === "B2B"
                const isB2C = lead.segment === "B2C"
                const title = isB2B && lead.company ? lead.company : `${lead.first_name} ${lead.last_name || ""}`
                const isOutOfWallonia = lead.postal_code && !isWalloonPostalCode(lead.postal_code)

                return (
                  <TableRow
                    key={lead.id}
                    onClick={() => {
                      setFocusedIndex(idx)
                      openLeadDetail(lead.id)
                    }}
                    className={cn(
                      "cursor-pointer border-b border-border transition-colors h-10 group",
                      isActive && "bg-secondary/70 border-l-2 border-l-primary font-medium",
                      !isActive && isFocused && "bg-secondary/40 ring-1 ring-inset ring-ring/30",
                      isSelected && "bg-primary/[0.04]"
                    )}
                  >
                    {/* Checkbox */}
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(lead.id)}
                      />
                    </TableCell>

                    {/* Âge relatif */}
                    <TableCell className="font-mono text-[11px] tabular-nums whitespace-nowrap">
                      <span
                        className={cn(
                          age.isCritical && "text-destructive font-semibold",
                          age.isWarning && !age.isCritical && "text-accent font-medium",
                          !age.isWarning && "text-muted-foreground"
                        )}
                        title={new Date(lead.created_at).toLocaleString("fr-BE")}
                      >
                        {age.label}
                      </span>
                    </TableCell>

                    {/* Prospect / Entreprise */}
                    <TableCell className="py-1.5">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground truncate">
                            {title}
                          </span>
                          {isOutOfWallonia && (
                            <span className="text-destructive shrink-0" title="Code postal hors Wallonie">
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          {lead.email} {lead.phone ? `· ${lead.phone}` : ""}
                        </span>
                      </div>
                    </TableCell>

                    {/* Segment */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider px-1 py-0.5 rounded-sm bg-secondary text-secondary-foreground border border-border">
                          {lead.segment ?? "B2B"}
                        </span>
                        {isB2C && (() => {
                          const realPurchases = (lead.lead_purchases || []).filter((p: any) => {
                            const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
                            if (partnerObj?.is_test) return false
                            const cName = (partnerObj?.company_name || "").toLowerCase()
                            if (cName.includes("test") || cName.includes("dev test")) return false
                            const email = (partnerObj?.email || "").toLowerCase()
                            if (email === "mrnathanrem@gmail.com") return false
                            return true
                          })
                          if (realPurchases.length === 0) return null
                          return (
                            <span
                              className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/25 font-bold tabular-nums whitespace-nowrap"
                              title={`Places réservées par : ${realPurchases.map((p: any) => p.partners?.company_name || "Installateur").join(", ")}`}
                            >
                              {realPurchases.length}/3 pris
                            </span>
                          )
                        })()}
                      </div>
                    </TableCell>

                    {/* Localité */}
                    <TableCell>
                      <div className="flex flex-col font-mono text-[11px] tabular-nums">
                        <span className="text-foreground truncate">
                          {lead.postal_code || "–"} {lead.city || ""}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {lead.province ? lead.province.replace("_", " ") : "Wallonie"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Projet technique */}
                    <TableCell>
                      <div className="flex flex-col font-mono text-[11px] tabular-nums">
                        <span className="text-foreground">
                          {lead.surface_area != null ? `${lead.surface_area} m²` : "–"}{" "}
                          <span className="text-muted-foreground font-sans text-[10px]">
                            ({lead.surface_type || "toiture"})
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {lead.annual_electricity_bill != null
                            ? `${lead.annual_electricity_bill.toLocaleString("fr-BE")} €/an`
                            : "–"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Score */}
                    <TableCell className="text-center">
                      <LeadScoreBadge score={lead.lead_score} />
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="text-center">
                      <LeadStatusBadge
                        status={lead.status}
                        marketplaceStatus={lead.marketplace_status}
                      />
                    </TableCell>

                    {/* Prix */}
                    <TableCell className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)} cr.
                    </TableCell>

                    {/* Quick Actions au survol */}
                    <TableCell className="text-right px-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            publishLeadAction(lead.id)
                            toast.success(`Lead #${lead.id.slice(0, 8)} publié`)
                          }}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          title="Qualifier & publier (Q)"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        {lead.phone && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(lead.phone!)
                              toast.success("Téléphone copié")
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Copier le téléphone (C)"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination & Compteur */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            Page {page} sur {totalPages} ({total} leads)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => applyFilters({ page: page - 1 })}
              className="h-7 text-xs"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => applyFilters({ page: page + 1 })}
              className="h-7 text-xs"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Lead Inspection & Dispatch Drawer */}
      <LeadDrawer
        lead={activeLead}
        open={Boolean(activeLead)}
        onClose={closeLeadDetail}
        onPrevious={goToPrevious}
        onNext={goToNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        partners={partners}
        onLeadActionDone={handleLeadActionDone}
      />

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onQualifyAll={handleBulkQualify}
        onRejectAll={handleBulkReject}
        onArchiveAll={() => {
          handleBulkReject("Archivé par action groupée")
        }}
        onClearSelection={() => setSelectedIds(new Set())}
        loading={bulkLoading}
      />
    </div>
  )
}
