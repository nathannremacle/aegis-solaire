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
  ShoppingCart,
  CheckCircle2,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { LeadScoreBadge } from "@/components/admin-lead-score-badge"
import { LeadDrawer, type LeadDetail } from "@/components/admin/leads/lead-drawer"
import { BulkActionBar } from "@/components/admin/leads/bulk-action-bar"
import { type CompatiblePartner } from "@/components/admin/leads/dispatch-panel"
import { isWalloonPostalCode } from "@/lib/admin/lead-risk"
import { triggerAdminBadgesRefresh } from "@/components/admin/admin-badges-provider"
import {
  publishLeadAction,
  rejectLeadAction,
  bulkQualifyAndPublishAction,
  bulkRejectAction,
} from "@/app/admin/actions"
import { useAdminHotkeys } from "@/hooks/use-admin-hotkeys"

type LeadFilters = {
  status: string
  marketplaceStatus?: string
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
  tabCounts,
}: {
  leads: LeadDetail[]
  total: number
  page: number
  limit: number
  partners?: CompatiblePartner[]
  filters: LeadFilters
  leadId?: string | null
  currentLeadFromList?: LeadDetail | null
  tabCounts?: {
    triage: number
    marketplace: number
    assigned: number
    total: number
  }
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
  const currentTotal = Math.max(0, total - removedLeadIds.size)
  const totalPages = Math.max(1, Math.ceil(currentTotal / limit))

  const buildUrl = useCallback(
    (updates: Partial<LeadFilters> & { page?: number; leadId?: string | null }) => {
      const p = { ...filters, ...updates }
      const q = new URLSearchParams()
      if (updates.page && updates.page > 1) q.set("page", String(updates.page))
      if (p.view && p.view !== "all") q.set("view", p.view)
      if (p.status && p.status !== "all") q.set("status", p.status)
      if (p.marketplaceStatus && p.marketplaceStatus !== "all") q.set("marketplace_status", p.marketplaceStatus)
      if (p.segment && p.segment !== "all") q.set("segment", p.segment)
      if (p.region && p.region !== "all") q.set("region", p.region)
      if (p.installateurId && p.installateurId !== "all") q.set("installateur", p.installateurId)
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

  // Synchronisation des leads supprimés avec les données serveur fraîches
  useEffect(() => {
    if (removedLeadIds.size > 0) {
      const serverLeadIds = new Set(leads.map((l) => l.id))
      setRemovedLeadIds((prev) => {
        let changed = false
        const next = new Set<string>()
        for (const id of prev) {
          if (serverLeadIds.has(id)) {
            next.add(id)
          } else {
            changed = true
          }
        }
        return changed ? next : prev
      })
    }
  }, [leads])

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
    triggerAdminBadgesRefresh()
    const currentIdx = activeLeads.findIndex((l) => l.id === id)
    if (currentIdx !== -1 && currentIdx < activeLeads.length - 1) {
      openLeadDetail(activeLeads[currentIdx + 1].id)
    } else if (currentIdx > 0) {
      openLeadDetail(activeLeads[currentIdx - 1].id)
    } else {
      closeLeadDetail()
    }
    router.refresh()
  }

  // Actions groupées
  async function handleBulkQualify() {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      await bulkQualifyAndPublishAction(Array.from(selectedIds))
      toast.success(`${selectedIds.size} leads qualifiés et publiés`)
      setSelectedIds(new Set())
      triggerAdminBadgesRefresh()
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
      triggerAdminBadgesRefresh()
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

  const currentView = filters.view || "all"

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Page Header Opérationnel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {currentView === "triage"
              ? "File de Triage des Leads"
              : currentView === "marketplace"
              ? "Vivier Marketplace Live"
              : currentView === "assigned"
              ? "Leads Attribués & Vendus"
              : "Contrôle des Leads"}
          </h1>
          <span className="font-mono text-xs tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border">
            {currentTotal} lead{currentTotal > 1 ? "s" : ""}
          </span>
        </div>

        {/* Tabs de Vue Complète & CTA Primaire */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => applyFilters({ view: "triage", page: 1 })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-sm font-medium transition-colors",
                currentView === "triage"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Triage</span>
              {tabCounts?.triage !== undefined && (
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                    currentView === "triage"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : tabCounts.triage > 0
                      ? "bg-accent/20 text-accent font-bold"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tabCounts.triage}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => applyFilters({ view: "marketplace", page: 1 })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-sm font-medium transition-colors",
                currentView === "marketplace"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Marketplace</span>
              {tabCounts?.marketplace !== undefined && (
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                    currentView === "marketplace"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : tabCounts.marketplace > 0
                      ? "bg-primary/10 text-primary font-bold"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tabCounts.marketplace}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => applyFilters({ view: "assigned", page: 1 })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-sm font-medium transition-colors",
                currentView === "assigned"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Attribués / Vendus</span>
              {tabCounts?.assigned !== undefined && (
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                    currentView === "assigned"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tabCounts.assigned}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => applyFilters({ view: "all", page: 1 })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-sm font-medium transition-colors",
                currentView === "all" || !filters.view
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Tous les leads</span>
              {tabCounts?.total !== undefined && (
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
                    currentView === "all" || !filters.view
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {Math.max(0, tabCounts.total - (currentView === "all" || !filters.view ? removedLeadIds.size : 0))}
                </span>
              )}
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (leads.length > 0) openLeadDetail(leads[0].id)
            }}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <span>{isTriageMode ? "Traiter la file" : "Ouvrir dossier"}</span>
            <Kbd className="font-mono text-[10px] opacity-70">⏎</Kbd>
          </Button>
        </div>
      </div>

      {/* Toolbar & Faceted Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-4xl">
          {/* Recherche rapide */}
          <div className="relative flex-1 min-w-[200px]">
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

          {/* Filtre Statut Opérationnel */}
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

          {/* Filtre Marketplace Statut */}
          <Select
            value={filters.marketplaceStatus || "all"}
            onValueChange={(val) => applyFilters({ marketplaceStatus: val, page: 1 })}
          >
            <SelectTrigger className="w-36 h-8 text-xs bg-card">
              <SelectValue placeholder="Marketplace" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">Tous marketplace</SelectItem>
              <SelectItem value="available">En ligne (dispo)</SelectItem>
              <SelectItem value="sold_out">Complet (sold out)</SelectItem>
              <SelectItem value="pending_review">En attente modération</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtre Installateur / Partenaire */}
          {partners.length > 0 && (
            <Select
              value={filters.installateurId || "all"}
              onValueChange={(val) => applyFilters({ installateurId: val, page: 1 })}
            >
              <SelectTrigger className="w-36 h-8 text-xs bg-card">
                <SelectValue placeholder="Installateur" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Tous installateurs</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.company_name} ({p.credits} cr.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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
                  {page > 1 ? (
                    <div className="flex flex-col items-center justify-center gap-2 not-italic">
                      <span>Aucun lead sur cette page.</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyFilters({ page: 1 })}
                        className="h-7 text-xs"
                      >
                        Revenir à la page 1
                      </Button>
                    </div>
                  ) : (
                    "Aucun lead ne correspond aux filtres actuels."
                  )}
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
                        {(() => {
                          const purchases = lead.lead_purchases || []
                          const maxSlots = lead.segment === "B2B" ? 1 : 3
                          if (purchases.length === 0) {
                            if (lead.marketplace_status === "available") {
                              return (
                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/25 font-semibold whitespace-nowrap">
                                  En vente
                                </span>
                              )
                            }
                            return null
                          }
                          const partnerNames = purchases
                            .map((p: any) => {
                              const partnerObj = Array.isArray(p.partners) ? p.partners[0] : p.partners
                              return partnerObj?.company_name || "Installateur"
                            })
                            .join(", ")

                          return (
                            <span
                              className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 font-bold tabular-nums whitespace-nowrap"
                              title={`Attribué à : ${partnerNames}`}
                            >
                              {purchases.length}/{maxSlots} {lead.segment === "B2B" ? "attribué" : "pris"}
                            </span>
                          )
                        })()}
                      </div>
                    </TableCell>

                    {/* Localité & Adresse */}
                    <TableCell>
                      <div className="flex flex-col text-[11px]">
                        <span className="font-mono tabular-nums text-foreground font-semibold truncate">
                          {lead.postal_code || "–"} {lead.city || ""}
                        </span>
                        {lead.site_address ? (
                          <span className="text-[10px] text-muted-foreground truncate" title={lead.site_address}>
                            {lead.site_address}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/80 capitalize">
                            {lead.province ? `Prov. ${lead.province.replace("_", " ")}` : "Wallonie"}
                          </span>
                        )}
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
                      {lead.credit_cost ?? (lead.segment === "B2B" ? 9 : 3)} cr.
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
      {totalPages > 1 && activeLeads.length > 0 && (
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            Page {page} sur {totalPages} ({currentTotal} lead{currentTotal > 1 ? "s" : ""})
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
