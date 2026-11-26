"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { triggerAdminBadgesRefresh } from "@/components/admin/admin-badges-provider"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  FileText,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { AdminDisputeRecord } from "@/lib/admin/disputes-data"
import {
  DEFAULT_DISPUTE_SUSPENSION_REASON,
  DISPUTE_ABUSE_THRESHOLD_PERCENT,
  getDisputeReasonConfig,
} from "@/lib/disputes-policy"

export type DisputeItem = AdminDisputeRecord

interface DisputesClientProps {
  initialDisputes: DisputeItem[]
  adminEmail: string
}

export function DisputesClient({ initialDisputes }: DisputesClientProps) {
  const router = useRouter()
  const [disputes, setDisputes] = useState<DisputeItem[]>(initialDisputes)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "pending" | "approved" | "rejected">("pending")

  // Synchroniser le badge de la sidebar dès le montage
  useEffect(() => {
    triggerAdminBadgesRefresh()
  }, [])

  // Modal d'approbation
  const [selectedDisputeToApprove, setSelectedDisputeToApprove] = useState<DisputeItem | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [approving, setApproving] = useState(false)

  // Modal de rejet
  const [selectedDisputeToReject, setSelectedDisputeToReject] = useState<DisputeItem | null>(null)
  const [rejectionNotes, setRejectionNotes] = useState("")
  const [rejecting, setRejecting] = useState(false)

  // Modal de suspension / réactivation des litiges partenaire (Art. 5.6 CGV)
  const [suspensionTargetPartner, setSuspensionTargetPartner] = useState<{
    id: string
    companyName: string
    currentlySuspended: boolean
  } | null>(null)
  const [suspensionReason, setSuspensionReason] = useState(DEFAULT_DISPUTE_SUSPENSION_REASON)
  const [savingSuspension, setSavingSuspension] = useState(false)

  const refreshDisputes = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/disputes", {
        headers: { "x-admin-request": "true" },
      })
      if (!res.ok) throw new Error("Échec chargement")
      const data = await res.json()
      setDisputes(Array.isArray(data.disputes) ? data.disputes : [])
      triggerAdminBadgesRefresh()
      router.refresh()
      toast.success("Litiges actualisés")
    } catch {
      toast.error("Impossible de rafraîchir les litiges")
    } finally {
      setLoading(false)
    }
  }

  // Confirmer l'approbation & remboursement
  const handleConfirmApprove = async () => {
    if (!selectedDisputeToApprove) return
    setApproving(true)

    const refundAmount =
      selectedDisputeToApprove.lead_purchases?.credits_spent ||
      (selectedDisputeToApprove.leads?.segment === "B2B" ? 5 : 2)

    try {
      const res = await fetch(`/api/admin/disputes/${selectedDisputeToApprove.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({
          action: "approve",
          adminNotes: approvalNotes.trim() || undefined,
          refundCredits: refundAmount,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Erreur lors du remboursement")

      toast.success(
        `Litige approuvé ! ${refundAmount} crédits remboursés à ${selectedDisputeToApprove.partners?.company_name || "l'installateur"}.`
      )

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === selectedDisputeToApprove.id
            ? {
                ...d,
                status: "approved",
                credits_refunded: refundAmount,
                resolved_at: new Date().toISOString(),
                admin_notes: approvalNotes.trim() || d.admin_notes,
              }
            : d
        )
      )

      setSelectedDisputeToApprove(null)
      setApprovalNotes("")
      triggerAdminBadgesRefresh()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur de traitement du litige")
    } finally {
      setApproving(false)
    }
  }

  // Confirmer le rejet du litige
  const handleConfirmReject = async () => {
    if (!selectedDisputeToReject) return
    if (!rejectionNotes.trim()) {
      toast.error("Veuillez motiver le rejet du litige pour informer le partenaire.")
      return
    }

    setRejecting(true)
    try {
      const res = await fetch(`/api/admin/disputes/${selectedDisputeToReject.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({
          action: "reject",
          adminNotes: rejectionNotes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Erreur lors du rejet")

      toast.info(`Litige rejeté. Le motif a été notifié à l'installateur.`)

      setDisputes((prev) =>
        prev.map((d) =>
          d.id === selectedDisputeToReject.id
            ? {
                ...d,
                status: "rejected",
                resolved_at: new Date().toISOString(),
                admin_notes: rejectionNotes.trim(),
              }
            : d
        )
      )

      setSelectedDisputeToReject(null)
      setRejectionNotes("")
      triggerAdminBadgesRefresh()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du rejet")
    } finally {
      setRejecting(false)
    }
  }

  // Confirmer la suspension ou réactivation de la faculté de litige (Art. 5.6 CGV)
  const handleConfirmToggleSuspension = async () => {
    if (!suspensionTargetPartner) return
    const nextSuspended = !suspensionTargetPartner.currentlySuspended
    setSavingSuspension(true)
    try {
      const res = await fetch(`/api/admin/partners/${suspensionTargetPartner.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-request": "true",
        },
        body: JSON.stringify({
          disputesSuspended: nextSuspended,
          disputesSuspendedReason: nextSuspended ? suspensionReason.trim() : null,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Impossible de mettre à jour le statut de litige")
      }

      setDisputes((prev) =>
        prev.map((d) =>
          d.partner_id === suspensionTargetPartner.id && d.partners
            ? {
                ...d,
                partners: {
                  ...d.partners,
                  disputes_suspended: nextSuspended,
                  disputes_suspended_at: data.disputes_suspended_at ?? null,
                  disputes_suspended_reason: data.disputes_suspended_reason ?? null,
                },
              }
            : d
        )
      )

      toast.success(
        nextSuspended
          ? `Faculté de litige suspendue pour ${suspensionTargetPartner.companyName} (Art. 5.6 CGV).`
          : `Faculté de litige réactivée pour ${suspensionTargetPartner.companyName}.`
      )
      setSuspensionTargetPartner(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour")
    } finally {
      setSavingSuspension(false)
    }
  }

  // Filtrage
  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase().trim()
      const partner = d.partners?.company_name?.toLowerCase() || ""
      const leadFirst = d.leads?.first_name?.toLowerCase() || ""
      const leadLast = d.leads?.last_name?.toLowerCase() || ""
      const leadComp = d.leads?.company?.toLowerCase() || ""
      const details = d.details?.toLowerCase() || ""
      return (
        partner.includes(q) ||
        leadFirst.includes(q) ||
        leadLast.includes(q) ||
        leadComp.includes(q) ||
        details.includes(q)
      )
    })
  }, [disputes, statusFilter, searchTerm])

  const pendingDisputes = useMemo(
    () => disputes.filter((d) => d.status === "pending"),
    [disputes]
  )
  const approvedDisputes = useMemo(
    () => disputes.filter((d) => d.status === "approved"),
    [disputes]
  )
  const rejectedDisputes = useMemo(
    () => disputes.filter((d) => d.status === "rejected"),
    [disputes]
  )

  const totalCreditsRefunded = useMemo(
    () => approvedDisputes.reduce((acc, d) => acc + (d.credits_refunded || 0), 0),
    [approvedDisputes]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Opérationnel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Arbitrage des Litiges &amp; Garantie Lead (SLA 24 h)
            </h1>
            <span className="font-mono text-xs tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm border border-border">
              {disputes.length} réclamations
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Arbitrage des contestations de leads sous SLA 24h, respect de la charte RESCERT et remboursement automatique en crédits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDisputes}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Actualiser</span>
          </Button>
        </div>
      </div>

      {/* 2. Cartes de Métriques SLA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Réclamations en attente */}
        <div className={cn(
          "rounded-lg border p-4 flex flex-col gap-2 transition-colors",
          pendingDisputes.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
        )}>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Litiges en attente d&apos;arbitrage</span>
            <div className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center",
              pendingDisputes.length > 0 ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"
            )}>
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {pendingDisputes.length}
            </span>
            <span className="text-xs text-muted-foreground">à traiter sous 24h</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            SLA garanti contractuellement aux installateurs
          </span>
        </div>

        {/* Crédits remboursés */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Crédits remboursés au réseau</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {totalCreditsRefunded}
            </span>
            <span className="text-xs text-muted-foreground">crédits retournés</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Sur {approvedDisputes.length} réclamations justifiées
          </span>
        </div>

        {/* Litiges rejetés */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Réclamations non fondées</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {rejectedDisputes.length}
            </span>
            <span className="text-xs text-muted-foreground">litiges écartés</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Rejets motivés avec historique de conformité
          </span>
        </div>

        {/* Taux de conformité */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Arbitrages clôturés</span>
            <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {approvedDisputes.length + rejectedDisputes.length}
            </span>
            <span className="text-xs text-muted-foreground">dossiers instruits</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            Backlog résiduel : {pendingDisputes.length}
          </span>
        </div>
      </div>

      {/* 3. Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center rounded-md border border-border bg-card p-0.5 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "pending"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>En attente SLA</span>
            {pendingDisputes.length > 0 && (
              <span className="rounded-full bg-destructive/20 px-1.5 py-0.2 font-mono text-[10px] tabular-nums font-bold text-destructive">
                {pendingDisputes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "approved"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Remboursés</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({approvedDisputes.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "rejected"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Rejetés</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({rejectedDisputes.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              statusFilter === "ALL"
                ? "bg-secondary text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Tous</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              ({disputes.length})
            </span>
          </button>
        </div>

        <div className="relative min-w-[260px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher installateur, lead, motif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* 4. Table Haute Densité d'Arbitrage */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
              <TableHead className="w-28 font-mono text-[11px] text-muted-foreground">Date réclamation</TableHead>
              <TableHead className="min-w-[190px]">Installateur Contestataire</TableHead>
              <TableHead className="min-w-[200px]">Lead Concerné</TableHead>
              <TableHead className="w-48">Motif Contractuel</TableHead>
              <TableHead className="min-w-[220px]">Détails / Justification</TableHead>
              <TableHead className="w-28 text-center font-mono text-[11px] text-muted-foreground">Statut</TableHead>
              <TableHead className="w-44 text-right">Arbitrage Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDisputes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground italic">
                  Aucun litige ne correspond aux critères sélectionnés.
                </TableCell>
              </TableRow>
            ) : (
              filteredDisputes.map((dispute) => {
                const isPending = dispute.status === "pending"
                const isApproved = dispute.status === "approved"
                const isRejected = dispute.status === "rejected"
                const reasonMeta = getDisputeReasonConfig(dispute.reason)
                const stats30d = dispute.partnerStats30d

                return (
                  <TableRow
                    key={dispute.id}
                    className="border-b border-border transition-colors hover:bg-secondary/20"
                  >
                    {/* Date */}
                    <TableCell className="font-mono text-[11px] tabular-nums whitespace-nowrap text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{new Date(dispute.created_at).toLocaleDateString("fr-BE")}</span>
                        <span className="text-[10px] text-muted-foreground/80">
                          {new Date(dispute.created_at).toLocaleTimeString("fr-BE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Installateur */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {dispute.partners?.company_name || "Installateur"}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate pl-5">
                          {dispute.partners?.email || "—"}
                        </span>
                        <div className="pl-5 pt-0.5 flex flex-wrap items-center gap-1.5">
                          {stats30d && stats30d.purchases30d > 0 && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums font-medium border",
                                stats30d.exceedsAbuseThreshold
                                  ? "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
                                  : "bg-secondary text-muted-foreground border-border"
                              )}
                              title={`Taux de litiges sur 30 jours glissants (seuil CGV Art. 5.6 : ${DISPUTE_ABUSE_THRESHOLD_PERCENT} %)`}
                            >
                              30j : {stats30d.disputes30d}/{stats30d.purchases30d} ({stats30d.disputeRatePct}%)
                              {stats30d.exceedsAbuseThreshold ? ` · >${DISPUTE_ABUSE_THRESHOLD_PERCENT}%` : ""}
                            </span>
                          )}
                          {dispute.partners?.disputes_suspended && (
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/30">
                              <ShieldBan className="h-2.5 w-2.5" />
                              Litiges suspendus
                            </span>
                          )}
                          {dispute.partners?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setSuspensionReason(
                                  dispute.partners?.disputes_suspended_reason ||
                                    DEFAULT_DISPUTE_SUSPENSION_REASON
                                )
                                setSuspensionTargetPartner({
                                  id: dispute.partners!.id,
                                  companyName: dispute.partners!.company_name || "Installateur",
                                  currentlySuspended: Boolean(dispute.partners?.disputes_suspended),
                                })
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border transition-colors cursor-pointer",
                                dispute.partners.disputes_suspended
                                  ? "border-border bg-secondary hover:bg-secondary/80 text-foreground"
                                  : stats30d?.exceedsAbuseThreshold
                                    ? "border-destructive/40 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold"
                                    : "border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
                              )}
                              title={
                                dispute.partners.disputes_suspended
                                  ? "Réactiver le dépôt de litiges pour cet installateur"
                                  : "Suspendre la faculté de litige (CGV Art. 5.6)"
                              }
                            >
                              <ShieldBan className="h-2.5 w-2.5" />
                              <span>
                                {dispute.partners.disputes_suspended
                                  ? "Réactiver litiges"
                                  : "Suspendre litiges"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Lead Concerné */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/leads?leadId=${dispute.lead_id}`}
                            className="font-medium text-foreground hover:underline truncate flex items-center gap-1"
                          >
                            <span>
                              {dispute.leads
                                ? dispute.leads.company || `${dispute.leads.first_name} ${dispute.leads.last_name || ""}`
                                : `Lead #${dispute.lead_id.slice(0, 8)}`}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          </Link>
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {dispute.leads?.segment || "B2C"} · {dispute.leads?.province || "Wallonie"}
                        </span>
                        {dispute.leads && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border">
                              {dispute.leads.contact_preference === "direct_call"
                                ? "Appel direct"
                                : "Écrit d'abord"}
                            </span>
                            {dispute.leads.phone_verified && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary border border-primary/20 font-medium">
                                Tél OTP
                              </span>
                            )}
                            {dispute.leads.email_verified && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary border border-primary/20 font-medium">
                                Mail OK
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Motif */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{reasonMeta.adminLabel}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {reasonMeta.adminDescription}
                        </span>
                      </div>
                    </TableCell>

                    {/* Justification de l'installateur */}
                    <TableCell>
                      <p className="text-xs text-foreground line-clamp-2" title={dispute.details}>
                        {dispute.details}
                      </p>
                      {dispute.admin_notes && (
                        <p className="text-[11px] text-muted-foreground italic mt-1 border-t border-border/50 pt-0.5">
                          Note admin : {dispute.admin_notes}
                        </p>
                      )}
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="text-center">
                      {isPending && (
                        <Badge
                          variant="outline"
                          className="bg-destructive/15 text-destructive border-destructive/30 font-medium text-[11px]"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          À instruire
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 font-medium text-[11px]"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Remboursé
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground border-border font-medium text-[11px]"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejeté
                        </Badge>
                      )}
                    </TableCell>

                    {/* Arbitrage */}
                    <TableCell className="text-right">
                      {isPending && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs font-medium gap-1"
                            onClick={() => {
                              setSelectedDisputeToApprove(dispute)
                              setApprovalNotes("")
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Rembourser</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setSelectedDisputeToReject(dispute)
                              setRejectionNotes("")
                            }}
                          >
                            Rejeter
                          </Button>
                        </div>
                      )}

                      {isApproved && (
                        <span className="font-mono text-[10px] tabular-nums text-primary font-medium">
                          +{dispute.credits_refunded} crédits remboursés
                        </span>
                      )}

                      {isRejected && (
                        <span className="text-[10px] text-muted-foreground italic">
                          Dossier clos (non remboursé)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogue d'Approbation et de Remboursement */}
      <Dialog
        open={Boolean(selectedDisputeToApprove)}
        onOpenChange={(open) => !open && setSelectedDisputeToApprove(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span>Approuver le litige &amp; Rembourser</span>
            </DialogTitle>
            <DialogDescription>
              Cette décision recréditera instantanément le compte de l&apos;installateur au titre de la Garantie Lead (Art. 5 CGV).
            </DialogDescription>
          </DialogHeader>

          {selectedDisputeToApprove && (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-md border border-border bg-secondary/30 p-3 flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installateur :</span>
                  <span className="font-semibold text-foreground">
                    {selectedDisputeToApprove.partners?.company_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Motif invoqué :</span>
                  <span className="font-medium text-foreground">
                    {getDisputeReasonConfig(selectedDisputeToApprove.reason).adminLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédits à recréditer :</span>
                  <span className="font-mono font-bold tabular-nums text-primary">
                    +{selectedDisputeToApprove.lead_purchases?.credits_spent || (selectedDisputeToApprove.leads?.segment === "B2B" ? 5 : 2)} crédits
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approvalNotes" className="text-xs">
                  Note d&apos;arbitrage / Observation interne (optionnel)
                </Label>
                <Textarea
                  id="approvalNotes"
                  placeholder="Ex : Numéro confirmé erroné après test de la modération..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="text-xs resize-none h-18"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDisputeToApprove(null)}
              disabled={approving}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmApprove}
              disabled={approving}
            >
              {approving ? "Remboursement en cours…" : "Confirmer le remboursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de Rejet */}
      <Dialog
        open={Boolean(selectedDisputeToReject)}
        onOpenChange={(open) => !open && setSelectedDisputeToReject(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Rejeter la contestation de lead</span>
            </DialogTitle>
            <DialogDescription>
              Un motif d&apos;explication est obligatoire afin de garantir la transparence avec le partenaire RESCERT.
            </DialogDescription>
          </DialogHeader>

          {selectedDisputeToReject && (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-md border border-border bg-secondary/30 p-3 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installateur :</span>
                  <span className="font-semibold text-foreground">
                    {selectedDisputeToReject.partners?.company_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Motif invoqué :</span>
                  <span className="font-medium text-foreground">
                    {getDisputeReasonConfig(selectedDisputeToReject.reason).adminLabel}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rejectionNotes" className="text-xs">
                  Motif du rejet (notifié au partenaire) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejectionNotes"
                  placeholder="Ex : Le prospect a été joint par nos équipes le 23/10 et a confirmé son projet..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="text-xs resize-none h-20"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDisputeToReject(null)}
              disabled={rejecting}
            >
              Retour
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={rejecting}
            >
              {rejecting ? "Enregistrement…" : "Rejeter le litige"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de Suspension / Réactivation des Litiges (Art. 5.6 CGV) */}
      <Dialog
        open={Boolean(suspensionTargetPartner)}
        onOpenChange={(open) => !open && setSuspensionTargetPartner(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldBan className="h-5 w-5" />
              <span>
                {suspensionTargetPartner?.currentlySuspended
                  ? "Réactiver la faculté de litige"
                  : "Suspendre la faculté de litige (Art. 5.6 CGV)"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {suspensionTargetPartner?.currentlySuspended
                ? `L'installateur ${suspensionTargetPartner.companyName} pourra à nouveau déposer des contestations de leads.`
                : `Bloque immédiatement le dépôt de nouveaux litiges pour ${suspensionTargetPartner?.companyName} (taux > ${DISPUTE_ABUSE_THRESHOLD_PERCENT} % ou abus manifeste).`}
            </DialogDescription>
          </DialogHeader>

          {suspensionTargetPartner && !suspensionTargetPartner.currentlySuspended && (
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="suspensionReason" className="text-xs">
                Motif affiché à l&apos;installateur (Art. 5.6 CGV)
              </Label>
              <Textarea
                id="suspensionReason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                className="text-xs resize-none h-24"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuspensionTargetPartner(null)}
              disabled={savingSuspension}
            >
              Annuler
            </Button>
            <Button
              variant={suspensionTargetPartner?.currentlySuspended ? "default" : "destructive"}
              size="sm"
              onClick={handleConfirmToggleSuspension}
              disabled={savingSuspension}
            >
              {savingSuspension
                ? "Enregistrement…"
                : suspensionTargetPartner?.currentlySuspended
                  ? "Confirmer la réactivation"
                  : "Confirmer la suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
