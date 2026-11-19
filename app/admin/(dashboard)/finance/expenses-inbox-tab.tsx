"use client"

import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ClipboardCopy,
  CreditCard,
  ExternalLink,
  Eye,
  FileUp,
  Info,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  EXPENSE_PRESETS,
  EXPENSE_PRESETS_MAP,
  INIT42_NACE_CODES,
  LEGAL_ENTITY,
  STUDENT_TAX_THRESHOLDS_2026,
  buildChatAuditMarkdown,
  computeExpenseIntervatImpact,
  isDateInPeriod,
  round2,
  type AccountingExpenseDraftRecord,
  type AccountingExpenseRecord,
  type IntervatSummary,
  type PaymentSource,
} from "@/lib/accounting/belgian-tax-rules"
import type { AccountingConfigStatus } from "@/lib/accounting/invoice-service"

function formatEur(val: number): string {
  return val.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const PAYMENT_SOURCE_LABELS: Record<PaymentSource, string> = {
  pro_account: "Compte Pro",
  personal_card: "Carte perso (Revolut)",
  mollie_balance: "Solde Mollie",
  other: "Autre moyen",
}

const SOURCE_LABELS: Record<AccountingExpenseDraftRecord["source"], string> = {
  drag_drop: "Drag & Drop",
  email_inbound: "E-mail auto",
  mollie_api: "API Mollie",
}

type UploadQueueItem = {
  id: string
  filename: string
  status: "uploading" | "done" | "error"
  message?: string
}

interface ExpensesInboxTabProps {
  year: number
  quarter: 0 | 1 | 2 | 3 | 4
  expenses: AccountingExpenseRecord[]
  pendingDrafts: AccountingExpenseDraftRecord[]
  intervat: IntervatSummary
  configStatus: AccountingConfigStatus
  mediaCommissionsDue: number
  onRefreshAccounting: () => Promise<void>
}

export function ExpensesInboxTab({
  year,
  quarter,
  expenses,
  pendingDrafts,
  intervat,
  configStatus,
  mediaCommissionsDue,
  onRefreshAccounting,
}: ExpensesInboxTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [defaultPaymentSource, setDefaultPaymentSource] = useState<PaymentSource>("pro_account")
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null)
  const [approvingAll, setApprovingAll] = useState(false)

  // Sync Mollie
  const [syncingMollie, setSyncingMollie] = useState(false)
  const [mollieSetupOpen, setMollieSetupOpen] = useState(false)

  // Email inbound guide
  const [emailGuideOpen, setEmailGuideOpen] = useState(false)

  // Chat Audit JSON import modal
  const [chatImportOpen, setChatImportOpen] = useState(false)
  const [chatJsonInput, setChatJsonInput] = useState("")
  const [applyingChatPatch, setApplyingChatPatch] = useState(false)

  // Edit Draft modal
  const [editingDraft, setEditingDraft] = useState<AccountingExpenseDraftRecord | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Manual expense modal
  const [manualOpen, setManualOpen] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string>("meta_google_ads_eu")
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [manualSupplier, setManualSupplier] = useState<string>("")
  const [manualVatNum, setManualVatNum] = useState<string>("IE9692928F")
  const [manualDescription, setManualDescription] = useState<string>("")
  const [manualRef, setManualRef] = useState<string>("")
  const [manualAmount, setManualAmount] = useState<string>("100")
  const [manualInputMode, setManualInputMode] = useState<"htva" | "ttc">("htva")
  const [manualVatRate, setManualVatRate] = useState<number>(0)
  const [manualPaymentSource, setManualPaymentSource] = useState<PaymentSource>("pro_account")
  const [submittingManual, setSubmittingManual] = useState(false)

  const preset = EXPENSE_PRESETS_MAP[selectedPresetId] ?? EXPENSE_PRESETS[0]

  const periodExpenses = useMemo(
    () => expenses.filter((e) => isDateInPeriod(e.expense_date, year, quarter)),
    [expenses, year, quarter]
  )

  const eligibleDraftsCount = useMemo(
    () =>
      pendingDrafts.filter((d) => {
        const hasDup = d.ai_warnings.some((w) => w.code === "DUPLICATE_FILE")
        return d.is_valid_tax_invoice && Number(d.amount_htva) > 0 && !hasDup
      }).length,
    [pendingDrafts]
  )

  const manualSimulation = useMemo(() => {
    const raw = Math.max(0, Number(String(manualAmount).replace(",", ".")) || 0)
    const rate = Math.max(0, manualVatRate) / 100
    let htva = raw
    let vatPaidBe = 0
    if (preset.isReverseCharge || rate === 0) {
      htva = round2(raw)
      vatPaidBe = 0
    } else if (manualInputMode === "ttc") {
      htva = round2(raw / (1 + rate))
      vatPaidBe = round2(raw - htva)
    } else {
      htva = round2(raw)
      vatPaidBe = round2(htva * rate)
    }

    const impact = computeExpenseIntervatImpact({
      amount_htva: htva,
      vat_paid_be: vatPaidBe,
      vat_deductible_pct: preset.vatDeductiblePct,
      tax_deductible_pct: preset.taxDeductiblePct,
      is_reverse_charge: preset.isReverseCharge,
      is_investment: preset.id === "hardware_it_video" && htva >= 1000,
      supplier_country: preset.supplierCountry,
      category: preset.id,
    })

    const saveRate =
      intervat.studentStatus.annualNetProfit > STUDENT_TAX_THRESHOLDS_2026.ippExemptMaxNet
        ? 0.4
        : intervat.studentStatus.annualNetProfit > STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet
          ? 0.205
          : 0
    const estimatedTaxSaved = round2(impact.taxDeductibleAmount * saveRate)
    const vatRecovered = preset.isReverseCharge ? 0 : impact.grid59
    const netRealCost = round2(
      Math.max(0, htva + vatPaidBe - vatRecovered - estimatedTaxSaved)
    )
    return { htva, vatPaidBe, impact, vatRecovered, estimatedTaxSaved, netRealCost }
  }, [manualAmount, manualInputMode, manualVatRate, preset, intervat.studentStatus.annualNetProfit])

  const applyManualPreset = (presetId: string) => {
    const p = EXPENSE_PRESETS_MAP[presetId]
    if (!p) return
    setSelectedPresetId(p.id)
    setManualVatRate(p.vatRateInput)
    setManualVatNum(p.defaultVatNumber)
    setManualInputMode(p.vatRateInput > 0 ? "ttc" : "htva")
    if (p.id === "mollie_fees_eu") setManualPaymentSource("mollie_balance")
  }

  /* --------------------------------------------------------------------------
     Upload 1 fichier par POST (concurrence max 2) pour rester sous 4,5 Mo Vercel
     -------------------------------------------------------------------------- */
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.size > 0)
    if (files.length === 0) return

    const queueItems: UploadQueueItem[] = files.map((f, idx) => ({
      id: `${Date.now()}_${idx}_${f.name}`,
      filename: f.name,
      status: "uploading",
    }))
    setUploadQueue((prev) => [...queueItems, ...prev].slice(0, 20))

    let cursor = 0
    let okCount = 0
    let errCount = 0

    const worker = async () => {
      while (cursor < files.length) {
        const index = cursor
        cursor += 1
        const file = files[index]
        const qItem = queueItems[index]

        const formData = new FormData()
        formData.append("file", file)
        formData.append("payment_source", defaultPaymentSource)

        try {
          const res = await fetch("/api/admin/accounting/upload-drafts", {
            method: "POST",
            body: formData,
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok || !json.success) {
            throw new Error(json.error || "Erreur d'extraction")
          }
          okCount += 1
          setUploadQueue((prev) =>
            prev.map((it) =>
              it.id === qItem.id
                ? { ...it, status: "done", message: "Analysée — à vérifier ci-dessous" }
                : it
            )
          )
        } catch (err: any) {
          errCount += 1
          setUploadQueue((prev) =>
            prev.map((it) =>
              it.id === qItem.id
                ? { ...it, status: "error", message: err?.message || "Échec" }
                : it
            )
          )
        }
      }
    }

    const workersCount = Math.min(2, files.length)
    await Promise.all(Array.from({ length: workersCount }, () => worker()))

    if (okCount > 0) {
      toast.success(
        `${okCount} facture(s) analysée(s) et placée(s) en file de vérification.${errCount > 0 ? ` (${errCount} erreur(s))` : ""}`
      )
      await onRefreshAccounting()
    } else if (errCount > 0) {
      toast.error(`${errCount} fichier(s) n'ont pas pu être traités.`)
    }
  }

  const handleSyncMollieInvoices = async () => {
    setSyncingMollie(true)
    try {
      const res = await fetch("/api/admin/accounting/sync-mollie-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.code === "MISSING_MOLLIE_ORG_TOKEN") {
          setMollieSetupOpen(true)
          return
        }
        throw new Error(json.error || "Échec synchronisation Mollie")
      }
      toast.success(
        `Mollie ${year} : ${json.importedCount} nouvelle(s) facture(s) importée(s) (${json.skippedExistingCount} déjà connue(s)).`
      )
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible de synchroniser Mollie")
    } finally {
      setSyncingMollie(false)
    }
  }

  const handleCopyAuditForChat = async (draftsToCopy: AccountingExpenseDraftRecord[]) => {
    if (draftsToCopy.length === 0) {
      toast.info("Aucune facture en attente à vérifier.")
      return
    }
    const md = buildChatAuditMarkdown(draftsToCopy, year, quarter)
    await navigator.clipboard.writeText(md)
    toast.success(
      `Dossier de ${draftsToCopy.length} facture(s) copié ! Colle-le ici dans le chat pour audit complet.`
    )
  }

  const parseJsonPatchesFromChat = (rawText: string) => {
    let cleaned = rawText.trim()
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim()
    }
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) {
      throw new Error("Le JSON doit être un tableau d'actions [{ draft_id, action, updates }].")
    }
    return parsed
  }

  const handleApplyChatPatches = async () => {
    setApplyingChatPatch(true)
    try {
      const patches = parseJsonPatchesFromChat(chatJsonInput)
      const res = await fetch("/api/admin/accounting/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_chat_audit_patch", patches }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Format JSON invalide")
      }
      toast.success(
        `Corrections appliquées : ${json.updatedCount} mise(s) à jour, ${json.approvedCount} validée(s), ${json.rejectedCount} rejetée(s).`
      )
      setChatImportOpen(false)
      setChatJsonInput("")
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'appliquer ce JSON")
    } finally {
      setApplyingChatPatch(false)
    }
  }

  const handleApproveDraft = async (id: string) => {
    setBusyDraftId(id)
    try {
      const res = await fetch("/api/admin/accounting/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_draft", id }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Échec validation")
      toast.success("Facture validée et ajoutée au Journal des Achats.")
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible de valider ce brouillon")
    } finally {
      setBusyDraftId(null)
    }
  }

  const handleApproveAllValid = async () => {
    setApprovingAll(true)
    try {
      const res = await fetch("/api/admin/accounting/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all_valid_drafts" }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Échec validation groupée")
      toast.success(
        `${json.approvedCount} facture(s) validée(s) !${json.skippedCount > 0 ? ` (${json.skippedCount} ignorée(s) pour alerte/doublon)` : ""}`
      )
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Validation groupée impossible")
    } finally {
      setApprovingAll(false)
    }
  }

  const handleRejectDraft = async (id: string) => {
    setBusyDraftId(id)
    try {
      const res = await fetch("/api/admin/accounting/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject_draft", id }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Échec rejet")
      toast.info("Pièce écartée.")
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'écarter ce brouillon")
    } finally {
      setBusyDraftId(null)
    }
  }

  const handleSaveDraftEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDraft) return
    setSavingEdit(true)
    try {
      const res = await fetch("/api/admin/accounting/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_draft",
          id: editingDraft.id,
          updates: {
            expense_date: editingDraft.expense_date,
            supplier_name: editingDraft.supplier_name,
            supplier_country: editingDraft.supplier_country,
            supplier_vat_number: editingDraft.supplier_vat_number || null,
            category: editingDraft.category,
            description: editingDraft.description,
            nace_code: editingDraft.nace_code,
            original_currency: editingDraft.original_currency,
            original_amount_htva: Number(editingDraft.original_amount_htva || 0),
            exchange_rate: Number(editingDraft.exchange_rate || 1),
            amount_htva: Number(editingDraft.amount_htva || 0),
            vat_paid_be: Number(editingDraft.vat_paid_be || 0),
            vat_deductible_pct: Number(editingDraft.vat_deductible_pct ?? 100),
            tax_deductible_pct: Number(editingDraft.tax_deductible_pct ?? 100),
            is_reverse_charge: Boolean(editingDraft.is_reverse_charge),
            is_investment: Boolean(editingDraft.is_investment),
            invoice_ref: editingDraft.invoice_ref || null,
            payment_source: editingDraft.payment_source,
            is_valid_tax_invoice: Boolean(editingDraft.is_valid_tax_invoice),
            notes: editingDraft.notes || null,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Erreur sauvegarde")
      toast.success("Brouillon mis à jour.")
      setEditingDraft(null)
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible de sauvegarder")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCreateManualExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (manualSimulation.htva <= 0) {
      toast.error("Indique un montant supérieur à 0 €.")
      return
    }
    setSubmittingManual(true)
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_expense",
          expense_date: manualDate,
          supplier_name: manualSupplier.trim() || preset.supplierPlaceholder,
          supplier_country: preset.supplierCountry,
          supplier_vat_number: manualVatNum.trim() || null,
          category: preset.id,
          description: manualDescription.trim() || preset.shortLabel,
          nace_code: preset.naceCode,
          amount_htva: manualSimulation.htva,
          vat_paid_be: manualSimulation.vatPaidBe,
          vat_deductible_pct: preset.vatDeductiblePct,
          tax_deductible_pct: preset.taxDeductiblePct,
          is_reverse_charge: preset.isReverseCharge,
          is_investment: preset.id === "hardware_it_video" && manualSimulation.htva >= 1000,
          invoice_ref: manualRef.trim() || null,
          payment_source: manualPaymentSource,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Erreur enregistrement")
      toast.success("Dépense ajoutée au journal.")
      setManualOpen(false)
      setManualDescription("")
      setManualRef("")
      await onRefreshAccounting()
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'ajouter cette dépense")
    } finally {
      setSubmittingManual(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_expense", id }),
      })
      if (!res.ok) throw new Error("Échec suppression")
      toast.success("Dépense supprimée.")
      await onRefreshAccounting()
    } catch {
      toast.error("Impossible de supprimer cette dépense.")
    }
  }

  const gmailFilterQuery =
    "from:(vercel.com OR supabase.com OR resend.com OR infomaniak.com OR mollie.com OR facebookmail.com OR google.com) has:attachment (invoice OR facture OR receipt OR billing)"

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Zone Drag & Drop Multi-PDF + Connecteurs automatiques */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
              Dépose tes factures ici (PDF ou photos)
            </h2>
            <p className="text-xs text-muted-foreground">
              Glisse Vercel, Supabase, Resend, Infomaniak, Meta Ads ou tes tickets : lecture IA + conversion USD/CHF → EUR + calcul des grilles Intervat, avec vérification avant ajout définitif.
            </p>
          </div>

          {/* Sélecteur rapide moyen de paiement par défaut pour le lot déposé */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted p-1 text-xs">
            {(["pro_account", "personal_card"] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setDefaultPaymentSource(src)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5",
                  defaultPaymentSource === src
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {src === "personal_card" && <CreditCard className="h-3 w-3" />}
                <span>{src === "pro_account" ? "Compte Pro" : "Carte perso (Revolut)"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Zone Drag & Drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (e.dataTransfer.files?.length) {
              handleFilesSelected(e.dataTransfer.files)
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center gap-2.5 transition-colors cursor-pointer",
            isDragging
              ? "border-accent bg-accent/5"
              : "border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] hover:border-accent/50 hover:bg-muted/60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                handleFilesSelected(e.target.files)
                e.target.value = ""
              }
            }}
          />
          <div className="h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center text-accent shadow-2xs">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              Glisse-dépose tes factures PDF ou images ici, ou clique pour parcourir
            </span>
            <span className="text-xs text-muted-foreground">
              Astuce Meta Ads : ignore les reçus quotidiens de 18 € — glisse uniquement le PDF mensuel consolidé (« Activité de paiement »).
            </span>
          </div>
        </div>

        {/* Progression d'upload en cours / récents */}
        {uploadQueue.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Traitement des fichiers déposés</span>
              <button
                type="button"
                onClick={() => setUploadQueue([])}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Effacer la liste
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/50 last:border-b-0"
                >
                  <span className="font-mono truncate text-foreground">{item.filename}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {item.status === "uploading" && (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                        <span className="text-muted-foreground">Analyse IA…</span>
                      </>
                    )}
                    {item.status === "done" && (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aegis-availability-text)]" />
                        <span className="text-[var(--aegis-availability-text)] font-medium">
                          {item.message}
                        </span>
                      </>
                    )}
                    {item.status === "error" && (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-destructive">{item.message}</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barre d'outils connecteurs & saisie manuelle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSyncMollieInvoices}
              disabled={syncingMollie}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncingMollie && "animate-spin")} />
              <span>{syncingMollie ? "Sync Mollie…" : "Sync factures Mollie (exactes)"}</span>
              {configStatus.mollieOrgTokenReady ? (
                <span className="h-2 w-2 rounded-full bg-[var(--aegis-availability-text)]" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-[var(--aegis-preference-accent)]" />
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEmailGuideOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Boîte mail auto ({configStatus.inboundEmailAddress.split("@")[0]}@…)</span>
              {configStatus.resendInboundReady ? (
                <span className="h-2 w-2 rounded-full bg-[var(--aegis-availability-text)]" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-[var(--aegis-preference-accent)]" />
              )}
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setManualOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Saisie manuelle</span>
          </Button>
        </div>
      </div>

      {/* 2. File de Vérification (« À valider ») */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-border bg-[var(--aegis-summary)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-bold text-[var(--aegis-ink)]">
                À vérifier avant ajout en compta
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono tabular-nums text-xs",
                  pendingDrafts.length > 0
                    ? "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)] border-[var(--aegis-preference-accent)]"
                    : "bg-card text-muted-foreground"
                )}
              >
                {pendingDrafts.length} en attente
              </Badge>
            </div>
            <p className="text-xs text-[var(--aegis-muted)]">
              Rien n&apos;affecte ta déclaration TVA tant que tu n&apos;as pas validé. Tu peux aussi tout envoyer dans le chat pour double vérification.
            </p>
          </div>

          {pendingDrafts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCopyAuditForChat(pendingDrafts)}
                className="h-8 text-xs gap-1.5 bg-card"
              >
                <Bot className="h-3.5 w-3.5 text-accent" />
                <span>Vérifier dans le chat</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setChatImportOpen(true)}
                className="h-8 text-xs gap-1.5 bg-card"
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
                <span>Appliquer JSON du chat</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={approvingAll || eligibleDraftsCount === 0}
                onClick={handleApproveAllValid}
                className="h-8 text-xs gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {approvingAll
                    ? "Validation…"
                    : `Tout valider (${eligibleDraftsCount})`}
                </span>
              </Button>
            </div>
          )}
        </div>

        {pendingDrafts.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Aucune facture en attente de vérification. Glisse tes PDF ci-dessus ou clique sur « Sync factures Mollie ».
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {pendingDrafts.map((draft) => {
              const impact = computeExpenseIntervatImpact({
                amount_htva: draft.amount_htva,
                vat_paid_be: draft.vat_paid_be,
                vat_deductible_pct: draft.vat_deductible_pct,
                tax_deductible_pct: draft.tax_deductible_pct,
                is_reverse_charge: draft.is_reverse_charge,
                is_investment: draft.is_investment,
                supplier_country: draft.supplier_country,
                category: draft.category,
              })
              const gridChips = [
                impact.grid82 > 0 ? `[82] ${formatEur(impact.grid82)} €` : null,
                impact.grid83 > 0 ? `[83] ${formatEur(impact.grid83)} €` : null,
                impact.grid87 > 0 ? `[87] ${formatEur(impact.grid87)} €` : null,
                impact.grid88 > 0 ? `[88] ${formatEur(impact.grid88)} €` : null,
                impact.grid55 > 0 ? `[55] +${formatEur(impact.grid55)} €` : null,
                impact.grid56 > 0 ? `[56] +${formatEur(impact.grid56)} €` : null,
                impact.grid59 > 0 ? `[59] −${formatEur(impact.grid59)} €` : null,
              ].filter(Boolean) as string[]

              const isBusy = busyDraftId === draft.id

              return (
                <div key={draft.id} className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {draft.supplier_name}
                        </span>
                        <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                          {draft.supplier_country === "EU"
                            ? "UE · Autoliq. [88]"
                            : draft.supplier_country === "NON_EU"
                              ? "Hors-UE · Autoliq. [87]"
                              : "Belgique"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {SOURCE_LABELS[draft.source]}
                        </Badge>
                        {draft.payment_source === "personal_card" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)] border-[var(--aegis-preference-accent)]"
                          >
                            Carte perso (Revolut)
                          </Badge>
                        )}
                        {draft.payment_source === "mollie_balance" && (
                          <Badge variant="outline" className="text-[10px]">
                            Déduit solde Mollie
                          </Badge>
                        )}
                        {draft.is_investment && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            Investissement [83]
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono tabular-nums">
                          {new Date(draft.expense_date).toLocaleDateString("fr-BE")}
                        </span>
                        <span>·</span>
                        <span>{draft.description || "Frais professionnel"}</span>
                        {draft.invoice_ref && (
                          <>
                            <span>·</span>
                            <span className="font-mono">Réf. {draft.invoice_ref}</span>
                          </>
                        )}
                        {draft.supplier_vat_number && (
                          <>
                            <span>·</span>
                            <span className="font-mono">TVA {draft.supplier_vat_number}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="font-mono tabular-nums text-lg font-bold text-foreground">
                        {formatEur(draft.amount_htva)} € HTVA
                      </span>
                      {draft.original_currency !== "EUR" ? (
                        <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                          {formatEur(draft.original_amount_htva)} {draft.original_currency} ×{" "}
                          {Number(draft.exchange_rate).toFixed(4)}
                        </span>
                      ) : (
                        <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                          {draft.is_reverse_charge
                            ? "Autoliquidation (impact TVA 0,00 €)"
                            : `TVA BE payée : ${formatEur(draft.vat_paid_be)} €`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grilles Intervat & NACE */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground mr-1">Calcul transparent :</span>
                    <span className="font-mono tabular-nums px-2 py-0.5 rounded bg-muted border border-border">
                      NACE {draft.nace_code}
                    </span>
                    {gridChips.map((chip) => (
                      <span
                        key={chip}
                        className="font-mono tabular-nums px-2 py-0.5 rounded bg-[var(--aegis-summary)] border border-[var(--aegis-border)] text-[var(--aegis-ink)] font-medium"
                      >
                        {chip}
                      </span>
                    ))}
                    <span className="font-mono tabular-nums px-2 py-0.5 rounded bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] font-medium">
                      Déduct. IPP {draft.tax_deductible_pct} % ({formatEur(impact.taxDeductibleAmount)} €)
                    </span>
                  </div>

                  {/* Alertes éventuelles */}
                  {draft.ai_warnings.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {draft.ai_warnings.map((w, idx) => (
                        <div
                          key={`${w.code}_${idx}`}
                          className={cn(
                            "rounded-lg px-3 py-2 text-xs flex items-start gap-2 border",
                            w.severity === "error"
                              ? "bg-[var(--aegis-danger-bg)] text-[var(--aegis-danger-text)] border-destructive/30"
                              : w.severity === "warning"
                                ? "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)] border-[var(--aegis-preference-accent)]/50"
                                : "bg-[var(--aegis-summary)] text-[var(--aegis-ink)] border-[var(--aegis-border)]"
                          )}
                        >
                          {w.severity === "error" ? (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          ) : (
                            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          )}
                          <span>{w.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Boutons d'action par brouillon */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {draft.document_storage_path && (
                        <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1">
                          <a
                            href={`/api/admin/accounting/document?path=${encodeURIComponent(draft.document_storage_path)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Voir PDF</span>
                          </a>
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingDraft({ ...draft })}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Modifier</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyAuditForChat([draft])}
                        className="h-7 px-2.5 text-xs gap-1 text-muted-foreground"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span>Copier pour chat</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => handleRejectDraft(draft.id)}
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Rejeter</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy || Number(draft.amount_htva) <= 0}
                        onClick={() => handleApproveDraft(draft.id)}
                        className="h-7 px-3 text-xs font-semibold gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Valider</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Journal des Achats Validés */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-[var(--aegis-surface-subtle)]">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-bold text-foreground">
              Journal des Achats validés ({intervat.periodLabel})
            </h2>
            <p className="text-xs text-muted-foreground">
              Total HTVA :{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {formatEur(intervat.totalExpensesHtva)} €
              </span>
              {" · "}TVA récupérée [59] :{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {formatEur(intervat.grid59)} €
              </span>
              {" · "}Frais déductibles IPP :{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {formatEur(intervat.totalTaxDeductibleExpenses)} €
              </span>
            </p>
          </div>
          {mediaCommissionsDue > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Encours Media Partners estimé :{" "}
              <strong className="font-mono tabular-nums text-foreground">
                {formatEur(mediaCommissionsDue)} € HTVA
              </strong>
            </span>
          )}
        </div>

        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="w-24 font-mono">Date</TableHead>
              <TableHead>Fournisseur &amp; Pièce</TableHead>
              <TableHead className="w-20 font-mono">NACE</TableHead>
              <TableHead className="w-28 text-right font-mono">HTVA (€)</TableHead>
              <TableHead className="w-36 text-right font-mono">Régime TVA</TableHead>
              <TableHead className="w-24 text-right font-mono">IPP</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aucune dépense validée sur {intervat.periodLabel}.
                </TableCell>
              </TableRow>
            ) : (
              periodExpenses.map((exp) => {
                const vatRec = exp.is_reverse_charge
                  ? 0
                  : round2(exp.vat_paid_be * (exp.vat_deductible_pct / 100))
                return (
                  <TableRow key={exp.id}>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {new Date(exp.expense_date).toLocaleDateString("fr-BE")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-foreground">{exp.supplier_name}</span>
                          {exp.is_reverse_charge && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {exp.supplier_country === "EU" ? "Autoliq. UE [88]" : "Hors-UE [87]"}
                            </Badge>
                          )}
                          {exp.is_investment && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Invest. [83]
                            </Badge>
                          )}
                          {exp.payment_source === "personal_card" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)]"
                            >
                              Carte perso
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {exp.description}
                          {exp.invoice_ref ? ` · ${exp.invoice_ref}` : ""}
                          {exp.original_currency && exp.original_currency !== "EUR" && exp.original_amount
                            ? ` (${formatEur(exp.original_amount)} ${exp.original_currency})`
                            : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {exp.nace_code}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold text-foreground">
                      {formatEur(exp.amount_htva)} €
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {exp.is_reverse_charge ? (
                        <span className="text-muted-foreground">0,00 € (neutre)</span>
                      ) : (
                        <span className="text-[var(--aegis-availability-text)] font-semibold">
                          {formatEur(vatRec)} € ({exp.vat_deductible_pct}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {exp.tax_deductible_pct} %
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {exp.document_storage_path && (
                          <Button
                            asChild
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Ouvrir le PDF archivé"
                          >
                            <a
                              href={`/api/admin/accounting/document?path=${encodeURIComponent(exp.document_storage_path)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteExpense(exp.id)}
                          title="Supprimer cette dépense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog : Guide MOLLIE_ORG_ACCESS_TOKEN */}
      <Dialog open={mollieSetupOpen} onOpenChange={setMollieSetupOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connecter les vraies factures Mollie (30 sec)</DialogTitle>
            <DialogDescription>
              Pour importer tes factures officielles Mollie au centime exact, il faut un token d&apos;organisation en lecture seule (différent de la clé API de paiement).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs">
            <div className="rounded-xl border border-border bg-muted/50 p-3.5 flex flex-col gap-1.5">
              <span>
                1. Va dans <strong>Mollie Dashboard → Developers → API keys → Access tokens → Create token</strong>.
              </span>
              <span>
                2. Coche uniquement la permission <code className="font-mono">invoices.read</code> (lecture seule).
              </span>
              <span>
                3. Ajoute la variable d&apos;environnement{" "}
                <code className="font-mono font-semibold">MOLLIE_ORG_ACCESS_TOKEN=access_...</code> dans Vercel (et <code className="font-mono">.env.local</code>).
              </span>
              <span>
                4. Vérifie aussi dans <strong>Paramètres → Organisation → Infos TVA</strong> que{" "}
                <code className="font-mono font-semibold">{LEGAL_ENTITY.vat}</code> est bien enregistré pour que Mollie te facture à 0 % TVA (autoliquidation UE).
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMollieSetupOpen(false)}>
              Fermer
            </Button>
            <Button asChild size="sm">
              <a href="https://my.mollie.com/dashboard/developers/api-keys" target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Ouvrir Mollie API Keys
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : Guide Boîte mail auto (Resend Inbound + Filtre Gmail) */}
      <Dialog open={emailGuideOpen} onOpenChange={setEmailGuideOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Réception automatique des factures par e-mail (Resend Pro)</DialogTitle>
            <DialogDescription>
              Toutes les factures reçues sur ton adresse dédiée arrivent directement dans la file « À vérifier » ci-dessus, sans connecter ton Gmail par OAuth.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-xs">
            <div className="rounded-xl border border-border bg-muted/50 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Étape 1 — Adresse &amp; Webhook Resend Inbound</span>
                <Badge variant="outline" className="text-[10px]">
                  {configStatus.resendInboundReady ? "Connecté ✓" : "À activer"}
                </Badge>
              </div>
              <span className="text-muted-foreground">
                1. Dans Resend → <strong>Receiving / Domains</strong>, active la réception sur le sous-domaine <code className="font-mono">inbound.aegissolaire.com</code> (ajout d&apos;1 enregistrement MX chez Infomaniak, sans toucher à tes mails principaux).
              </span>
              <span className="text-muted-foreground">
                2. Crée un webhook Resend sur l&apos;événement <code className="font-mono">email.received</code> pointant vers :
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-[11px] bg-card border border-border px-2.5 py-1.5 rounded select-all truncate">
                  https://www.aegissolaire.com/api/webhooks/resend-inbound-invoice
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "https://www.aegissolaire.com/api/webhooks/resend-inbound-invoice"
                    )
                    toast.success("URL Webhook copiée.")
                  }}
                >
                  Copier
                </Button>
              </div>
              <span className="text-muted-foreground">
                3. Copie le secret <code className="font-mono">whsec_...</code> dans la variable Vercel{" "}
                <code className="font-mono font-semibold">RESEND_INBOUND_WEBHOOK_SECRET</code>.
              </span>
            </div>

            <div className="rounded-xl border border-border bg-[var(--aegis-summary)] p-3.5 flex flex-col gap-2">
              <span className="font-semibold text-[var(--aegis-ink)]">
                Étape 2 — Transfert auto depuis mrnathanrem@gmail.com
              </span>
              <span className="text-[var(--aegis-muted)]">
                Dans Gmail → <strong>Paramètres → Transfert</strong>, ajoute{" "}
                <code className="font-mono font-semibold text-foreground">{configStatus.inboundEmailAddress}</code>, puis crée un filtre avec cette requête exacte :
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-[10px] bg-card border border-border px-2.5 py-1.5 rounded select-all break-all">
                  {gmailFilterQuery}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(gmailFilterQuery)
                    toast.success("Filtre Gmail copié.")
                  }}
                >
                  Copier
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEmailGuideOpen(false)}>
              Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : Importer corrections JSON depuis le chat */}
      <Dialog open={chatImportOpen} onOpenChange={setChatImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appliquer les corrections vérifiées dans le chat</DialogTitle>
            <DialogDescription>
              Colle ici le bloc JSON renvoyé dans le chat après vérification de tes factures pour mettre à jour, valider ou rejeter les lignes en 1 clic.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={chatJsonInput}
            onChange={(e) => setChatJsonInput(e.target.value)}
            placeholder='[{"draft_id": "...", "action": "approve", "updates": { "amount_htva": 18.47 }}]'
            className="h-44 font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setChatImportOpen(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              disabled={applyingChatPatch || !chatJsonInput.trim()}
              onClick={handleApplyChatPatches}
            >
              {applyingChatPatch ? "Application…" : "Appliquer en 1 clic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : Éditer un brouillon avant validation */}
      <Dialog open={Boolean(editingDraft)} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la facture avant validation</DialogTitle>
            <DialogDescription>
              Ajuste la date, le montant exact en EUR (ex. montant réel débité sur Revolut), le pays TVA ou le moyen de paiement.
            </DialogDescription>
          </DialogHeader>
          {editingDraft && (
            <form onSubmit={handleSaveDraftEdit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">Date facture</Label>
                <Input
                  type="date"
                  value={editingDraft.expense_date}
                  onChange={(e) => setEditingDraft({ ...editingDraft, expense_date: e.target.value })}
                  className="h-8 text-xs font-mono tabular-nums"
                  required
                />
              </div>
              <div className="sm:col-span-5 flex flex-col gap-1">
                <Label className="text-xs">Fournisseur</Label>
                <Input
                  value={editingDraft.supplier_name}
                  onChange={(e) => setEditingDraft({ ...editingDraft, supplier_name: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div className="sm:col-span-3 flex flex-col gap-1">
                <Label className="text-xs">Zone TVA</Label>
                <select
                  value={editingDraft.supplier_country}
                  onChange={(e) => {
                    const nextCountry = e.target.value as "BE" | "EU" | "NON_EU"
                    setEditingDraft({
                      ...editingDraft,
                      supplier_country: nextCountry,
                      is_reverse_charge: nextCountry !== "BE",
                    })
                  }}
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs font-mono"
                >
                  <option value="BE">BE (TVA belge)</option>
                  <option value="EU">UE (Autoliq. [88])</option>
                  <option value="NON_EU">Hors-UE (Autoliq. [87])</option>
                </select>
              </div>

              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">N° TVA fournisseur</Label>
                <Input
                  value={editingDraft.supplier_vat_number || ""}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, supplier_vat_number: e.target.value })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">Réf. facture</Label>
                <Input
                  value={editingDraft.invoice_ref || ""}
                  onChange={(e) => setEditingDraft({ ...editingDraft, invoice_ref: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">Code NACE</Label>
                <select
                  value={editingDraft.nace_code}
                  onChange={(e) => setEditingDraft({ ...editingDraft, nace_code: e.target.value })}
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs font-mono"
                >
                  {INIT42_NACE_CODES.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.code} — {n.title.slice(0, 28)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-8 flex flex-col gap-1">
                <Label className="text-xs">Libellé</Label>
                <Input
                  value={editingDraft.description}
                  onChange={(e) => setEditingDraft({ ...editingDraft, description: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">Moyen de paiement</Label>
                <select
                  value={editingDraft.payment_source}
                  onChange={(e) =>
                    setEditingDraft({
                      ...editingDraft,
                      payment_source: e.target.value as PaymentSource,
                    })
                  }
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                >
                  {Object.entries(PAYMENT_SOURCE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex flex-col gap-1">
                <Label className="text-xs">Montant HTVA (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingDraft.amount_htva}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, amount_htva: Number(e.target.value) })
                  }
                  className="h-8 text-xs font-mono tabular-nums"
                  required
                />
              </div>
              <div className="sm:col-span-3 flex flex-col gap-1">
                <Label className="text-xs">TVA BE payée (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingDraft.vat_paid_be}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, vat_paid_be: Number(e.target.value) })
                  }
                  className="h-8 text-xs font-mono tabular-nums"
                />
              </div>
              <div className="sm:col-span-3 flex flex-col gap-1">
                <Label className="text-xs">% TVA récup.</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingDraft.vat_deductible_pct}
                  onChange={(e) =>
                    setEditingDraft({
                      ...editingDraft,
                      vat_deductible_pct: Number(e.target.value),
                    })
                  }
                  className="h-8 text-xs font-mono tabular-nums"
                />
              </div>
              <div className="sm:col-span-3 flex flex-col gap-1">
                <Label className="text-xs">% Déduct. IPP</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingDraft.tax_deductible_pct}
                  onChange={(e) =>
                    setEditingDraft({
                      ...editingDraft,
                      tax_deductible_pct: Number(e.target.value),
                    })
                  }
                  className="h-8 text-xs font-mono tabular-nums"
                />
              </div>

              <div className="sm:col-span-12 flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDraft.is_reverse_charge}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, is_reverse_charge: e.target.checked })
                    }
                  />
                  <span>Autoliquidation TVA (UE / Hors-UE)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDraft.is_investment}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, is_investment: e.target.checked })
                    }
                  />
                  <span>Bien d&apos;investissement (&ge; 1 000 € · Grille [83])</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingDraft.is_valid_tax_invoice}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, is_valid_tax_invoice: e.target.checked })
                    }
                  />
                  <span>Facture fiscale valide</span>
                </label>
              </div>

              <DialogFooter className="sm:col-span-12 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingDraft(null)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={savingEdit}>
                  {savingEdit ? "Sauvegarde…" : "Enregistrer les modifications"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog : Saisie manuelle d'une dépense */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saisie manuelle d&apos;une dépense</DialogTitle>
            <DialogDescription>
              Choisis une catégorie INIT42 : le moteur applique les règles belges (autoliquidation, quotités mixtes, amortissement).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyManualPreset(item.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                    item.id === selectedPresetId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-foreground border-border hover:bg-secondary"
                  )}
                >
                  {item.shortLabel}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground rounded-lg bg-muted/60 border border-border p-3">
              {preset.explanation}
            </p>

            <form onSubmit={handleCreateManualExpense} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-8 text-xs font-mono tabular-nums"
                  required
                />
              </div>
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">Fournisseur</Label>
                <Input
                  placeholder={preset.supplierPlaceholder}
                  value={manualSupplier}
                  onChange={(e) => setManualSupplier(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">N° TVA fournisseur</Label>
                <Input
                  value={manualVatNum}
                  onChange={(e) => setManualVatNum(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-5 flex flex-col gap-1">
                <Label className="text-xs">Libellé</Label>
                <Input
                  placeholder={preset.shortLabel}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-3 flex flex-col gap-1">
                <Label className="text-xs">Réf. facture</Label>
                <Input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">Moyen de paiement</Label>
                <select
                  value={manualPaymentSource}
                  onChange={(e) => setManualPaymentSource(e.target.value as PaymentSource)}
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                >
                  {Object.entries(PAYMENT_SOURCE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4 flex flex-col gap-1">
                <Label className="text-xs">
                  Montant ({preset.isReverseCharge ? "HTVA" : manualInputMode.toUpperCase()})
                </Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="h-8 text-xs font-mono tabular-nums"
                    required
                  />
                  {!preset.isReverseCharge && manualVatRate > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 font-mono text-[11px]"
                      onClick={() =>
                        setManualInputMode((m) => (m === "htva" ? "ttc" : "htva"))
                      }
                    >
                      {manualInputMode.toUpperCase()}
                    </Button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3 flex flex-col gap-1">
                <Label className="text-xs">TVA payée</Label>
                <select
                  value={preset.isReverseCharge ? 0 : manualVatRate}
                  disabled={preset.isReverseCharge}
                  onChange={(e) => setManualVatRate(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs font-mono"
                >
                  <option value={0}>0 %</option>
                  <option value={6}>6 %</option>
                  <option value={12}>12 %</option>
                  <option value={21}>21 %</option>
                </select>
              </div>

              <div className="sm:col-span-5 rounded-lg border border-border bg-[var(--aegis-availability-bg)] px-3 py-1.5 flex items-center justify-between">
                <span className="text-[11px] text-[var(--aegis-availability-text)]">
                  Coût réel net
                </span>
                <span className="font-mono tabular-nums font-bold text-sm text-[var(--aegis-ink)]">
                  {formatEur(manualSimulation.netRealCost)} €
                </span>
              </div>

              <DialogFooter className="sm:col-span-12 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setManualOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={submittingManual}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {submittingManual ? "Ajout…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
