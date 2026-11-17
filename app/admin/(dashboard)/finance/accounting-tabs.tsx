"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  ExternalLink,
  CheckCircle2,
  Circle,
  Sparkles,
  Receipt,
  Calculator,
  BookOpen,
  CalendarClock,
  FileCode2,
  AlertTriangle,
  Landmark,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  EXPENSE_PRESETS,
  EXPENSE_PRESETS_MAP,
  INIT42_NACE_CODES,
  LEGAL_ENTITY,
  STUDENT_TAX_THRESHOLDS_2026,
  isDateInPeriod,
  round2,
  type AccountingExpenseRecord,
  type IntervatSummary,
  type RoutineTask,
} from "@/lib/accounting/belgian-tax-rules"
import type { ClientVatListingRow } from "@/lib/accounting/invoice-service"

function formatEur(val: number): string {
  return val.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ==========================================================================
   ONGLET 2 : DÉPENSES & SIMULATEUR DE RÉCUPÉRATION TVA / IMPÔT
   ========================================================================== */

interface ExpensesTabProps {
  year: number
  quarter: 0 | 1 | 2 | 3 | 4
  expenses: AccountingExpenseRecord[]
  estimatedMollieFees: number
  mediaCommissionsDue: number
  intervat: IntervatSummary
  onExpenseCreated: (exp: AccountingExpenseRecord) => void
  onExpenseDeleted: (id: string) => void
  onRefreshAccounting: () => Promise<void>
}

export function ExpensesTab({
  year,
  quarter,
  expenses,
  estimatedMollieFees,
  mediaCommissionsDue,
  intervat,
  onExpenseCreated,
  onExpenseDeleted,
  onRefreshAccounting,
}: ExpensesTabProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("meta_google_ads_eu")
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [supplierName, setSupplierName] = useState<string>("")
  const [supplierVat, setSupplierVat] = useState<string>("IE9692928F")
  const [description, setDescription] = useState<string>("")
  const [invoiceRef, setInvoiceRef] = useState<string>("")
  const [amountInput, setAmountInput] = useState<string>("100")
  const [inputMode, setInputMode] = useState<"htva" | "ttc">("htva")
  const [vatRate, setVatRate] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [importingMollie, setImportingMollie] = useState(false)

  const preset = EXPENSE_PRESETS_MAP[selectedPresetId] ?? EXPENSE_PRESETS[0]

  const applyPreset = (presetId: string) => {
    const p = EXPENSE_PRESETS_MAP[presetId]
    if (!p) return
    setSelectedPresetId(p.id)
    setVatRate(p.vatRateInput)
    setSupplierVat(p.defaultVatNumber)
    if (p.vatRateInput > 0) {
      setInputMode("ttc")
    } else {
      setInputMode("htva")
    }
  }

  // Calcul temps réel de la récupération TVA + économie IPP/lois sociales
  const simulation = useMemo(() => {
    const raw = Math.max(0, Number(String(amountInput).replace(",", ".")) || 0)
    const rate = Math.max(0, vatRate) / 100

    let htva = raw
    let vatPaidBe = 0
    if (preset.isReverseCharge || rate === 0) {
      htva = raw
      vatPaidBe = 0
    } else if (inputMode === "ttc") {
      htva = round2(raw / (1 + rate))
      vatPaidBe = round2(raw - htva)
    } else {
      htva = round2(raw)
      vatPaidBe = round2(htva * rate)
    }

    const vatRecovered = preset.isReverseCharge
      ? 0 // En autoliquidation, tu n'avances pas de TVA (0 € décaissé), l'opération est neutre (+21 % / -21 %)
      : round2(vatPaidBe * (preset.vatDeductiblePct / 100))

    const nonDeductibleBeVat = round2(vatPaidBe - vatRecovered)
    const taxDeductibleBase = round2(
      (htva + nonDeductibleBeVat) * (preset.taxDeductiblePct / 100)
    )
    const studentSaveRate =
      intervat.studentStatus.annualNetProfit > STUDENT_TAX_THRESHOLDS_2026.ippExemptMaxNet
        ? 0.4
        : intervat.studentStatus.annualNetProfit > STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet
          ? 0.205
          : 0
    const estimatedTaxAndSocialSaved = round2(taxDeductibleBase * studentSaveRate)
    const grossCashOut = round2(htva + vatPaidBe)
    const netRealCost = round2(
      Math.max(0, grossCashOut - vatRecovered - estimatedTaxAndSocialSaved)
    )

    return {
      htva,
      vatPaidBe,
      vatRecovered,
      taxDeductibleBase,
      estimatedTaxAndSocialSaved,
      grossCashOut,
      netRealCost,
    }
  }, [amountInput, inputMode, vatRate, preset, intervat.studentStatus.annualNetProfit])

  const periodExpenses = useMemo(
    () => expenses.filter((e) => isDateInPeriod(e.expense_date, year, quarter)),
    [expenses, year, quarter]
  )

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (simulation.htva <= 0) {
      toast.error("Indique un montant supérieur à 0 €.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_expense",
          expense_date: expenseDate,
          supplier_name: supplierName.trim() || preset.supplierPlaceholder,
          supplier_country: preset.supplierCountry,
          supplier_vat_number: supplierVat.trim() || null,
          category: preset.id,
          description: description.trim() || preset.shortLabel,
          nace_code: preset.naceCode,
          amount_htva: simulation.htva,
          vat_paid_be: simulation.vatPaidBe,
          vat_deductible_pct: preset.vatDeductiblePct,
          tax_deductible_pct: preset.taxDeductiblePct,
          is_reverse_charge: preset.isReverseCharge,
          is_investment: preset.isInvestment,
          invoice_ref: invoiceRef.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erreur lors de l'enregistrement")
      }
      onExpenseCreated(json.expense)
      setDescription("")
      setInvoiceRef("")
      toast.success("Dépense ajoutée et impact TVA/IPP recalculé.")
    } catch (err: any) {
      toast.error(err.message || "Impossible d'ajouter la dépense")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_expense", id }),
      })
      if (!res.ok) throw new Error("Échec de suppression")
      onExpenseDeleted(id)
      toast.success("Dépense supprimée.")
    } catch {
      toast.error("Impossible de supprimer cette dépense.")
    }
  }

  const handleImportMollieFees = async () => {
    setImportingMollie(true)
    try {
      const res = await fetch("/api/admin/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_mollie_fees",
          year,
          quarter,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Aucun frais à importer")
      }
      await onRefreshAccounting()
      toast.success("Frais Mollie du trimestre ajoutés aux charges déductibles.")
    } catch (err: any) {
      toast.error(err.message || "Impossible d'importer les frais Mollie")
    } finally {
      setImportingMollie(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encadré d'action rapide Mollie + Media Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[var(--aegis-context)]">
              Rapprochement Commissions Mollie
            </span>
            <p className="text-sm font-semibold text-[var(--aegis-ink)]">
              Frais Mollie estimés sur la période :{" "}
              <span className="font-mono tabular-nums">{formatEur(estimatedMollieFees)} €</span>
            </p>
            <p className="text-xs text-[var(--aegis-muted)]">
              Exonéré de TVA (art. 44), mais 100 % déductible de ton bénéfice IPP pour ne pas payer d&apos;impôt sur la commission Mollie.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={importingMollie || estimatedMollieFees <= 0}
            onClick={handleImportMollieFees}
            className="shrink-0 bg-card"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {importingMollie ? "Import…" : "Importer frais Mollie"}
          </Button>
        </div>

        <div className="rounded-2xl border border-[var(--aegis-border)] bg-card p-5 flex flex-col justify-center gap-1">
          <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[var(--aegis-muted)]">
            Commissions Media Partners engagées
          </span>
          <p className="text-sm font-semibold text-foreground">
            Encours estimé apporteurs d&apos;affaires :{" "}
            <span className="font-mono tabular-nums">{formatEur(mediaCommissionsDue)} € HTVA</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Dès qu&apos;un apporteur t&apos;envoie sa facture B2B, encode-la en « Apporteur / Comptable » ci-dessous pour déduire 100 % la TVA et la charge.
          </p>
        </div>
      </div>

      {/* Formulaire + Simulateur instantané */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1 border-b border-[var(--aegis-divider)] pb-4">
          <h2 className="font-heading text-lg font-bold tracking-tight text-[var(--aegis-ink)]">
            Ajouter une dépense &amp; calculer ce que tu récupères en TVA / Impôt
          </h2>
          <p className="text-xs text-[var(--aegis-muted)]">
            Choisis un type de frais adapté aux codes NACE d&apos;INIT42 : le moteur applique automatiquement les règles fiscales belges (autoliquidation, quotités mixtes, amortissement).
          </p>
        </div>

        {/* Sélecteur rapide de presets */}
        <div className="flex flex-wrap gap-2">
          {EXPENSE_PRESETS.map((item) => {
            const active = item.id === selectedPresetId
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => applyPreset(item.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-[var(--aegis-surface-subtle)] text-[var(--aegis-ink)] border-[var(--aegis-border)] hover:bg-secondary"
                )}
              >
                {item.shortLabel}
              </button>
            )
          })}
        </div>

        {/* Explication fiscale du preset sélectionné */}
        <div className="rounded-xl border-l-4 border-[var(--aegis-context)] bg-[var(--aegis-summary)] px-4 py-3 flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--aegis-ink)]">
            <span>{preset.label}</span>
            <Badge variant="outline" className="font-mono tabular-nums text-[10px] bg-card">
              NACE {preset.naceCode}
            </Badge>
            <Badge variant="outline" className="font-mono tabular-nums text-[10px] bg-card">
              TVA récupérable : {preset.isReverseCharge ? "Autoliquidation (neutre)" : `${preset.vatDeductiblePct} %`}
            </Badge>
            <Badge variant="outline" className="font-mono tabular-nums text-[10px] bg-card">
              Déductible IPP : {preset.taxDeductiblePct} %
            </Badge>
          </div>
          <p className="text-xs text-[var(--aegis-muted)] leading-relaxed">{preset.explanation}</p>
        </div>

        <form onSubmit={handleCreateExpense} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="exp-date" className="text-xs">Date facture</Label>
            <Input
              id="exp-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="h-9 text-xs font-mono tabular-nums"
              required
            />
          </div>

          <div className="md:col-span-3 flex flex-col gap-1.5">
            <Label htmlFor="exp-supplier" className="text-xs">Fournisseur</Label>
            <Input
              id="exp-supplier"
              placeholder={preset.supplierPlaceholder}
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="exp-vat-num" className="text-xs">N° TVA fournisseur</Label>
            <Input
              id="exp-vat-num"
              placeholder="BE 0... / IE..."
              value={supplierVat}
              onChange={(e) => setSupplierVat(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="md:col-span-3 flex flex-col gap-1.5">
            <Label htmlFor="exp-desc" className="text-xs">Libellé de la dépense</Label>
            <Input
              id="exp-desc"
              placeholder={`Ex : ${preset.shortLabel} (${year})`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="exp-ref" className="text-xs">Réf. facture (opt.)</Label>
            <Input
              id="exp-ref"
              placeholder="INV-2026-..."
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="md:col-span-3 flex flex-col gap-1.5">
            <Label htmlFor="exp-amount" className="text-xs">
              Montant ({preset.isReverseCharge ? "HTVA facturé" : inputMode.toUpperCase()})
            </Label>
            <div className="flex gap-1.5">
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="h-9 text-xs font-mono tabular-nums"
                required
              />
              {!preset.isReverseCharge && vatRate > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-2.5 text-[11px] font-mono shrink-0"
                  onClick={() => setInputMode((m) => (m === "htva" ? "ttc" : "htva"))}
                >
                  {inputMode.toUpperCase()}
                </Button>
              )}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="exp-vat-rate" className="text-xs">TVA payée sur facture</Label>
            <select
              id="exp-vat-rate"
              value={preset.isReverseCharge ? 0 : vatRate}
              disabled={preset.isReverseCharge}
              onChange={(e) => setVatRate(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-card px-2.5 text-xs font-mono tabular-nums"
            >
              <option value={0}>0 % (Exonéré / RC)</option>
              <option value={6}>6 % (Train / Énergie)</option>
              <option value={12}>12 % (Resto)</option>
              <option value={21}>21 % (Standard BE)</option>
            </select>
          </div>

          {/* Résumé instantané du simulateur */}
          <div className="md:col-span-5 rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-availability-bg)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] text-[var(--aegis-availability-text)] font-semibold">
                Impact Étudiant-Indépendant de cette dépense
              </span>
              <span className="text-xs text-[var(--aegis-ink)]">
                TVA récupérée :{" "}
                <strong className="font-mono tabular-nums">{formatEur(simulation.vatRecovered)} €</strong>
                {" · "}Bénéfice net réduit de :{" "}
                <strong className="font-mono tabular-nums">−{formatEur(simulation.taxDeductibleBase)} €</strong>
                {simulation.estimatedTaxAndSocialSaved > 0
                  ? ` (~${formatEur(simulation.estimatedTaxAndSocialSaved)} € économisés)`
                  : " (protège tes plafonds à 0 €)"}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-[var(--aegis-availability-text)]">
                Coût réel net
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-[var(--aegis-ink)]">
                {formatEur(simulation.netRealCost)} €
              </span>
            </div>
          </div>

          <div className="md:col-span-2 flex items-end">
            <Button type="submit" disabled={submitting} className="w-full h-9 text-xs font-semibold gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>{submitting ? "Ajout…" : "Enregistrer"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Tableau des dépenses de la période */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-[var(--aegis-surface-subtle)]">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-bold text-foreground">
              Journal des Achats &amp; Frais ({intervat.periodLabel})
            </h2>
            <p className="text-xs text-muted-foreground">
              Total HTVA :{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {formatEur(intervat.totalExpensesHtva)} €
              </span>
              {" · "}TVA belge récupérée (Grille [59]) :{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {formatEur(intervat.totalBeVatPaidAndDeductible)} €
              </span>
              {" · "}Économie impôt estimée :{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                ~{formatEur(intervat.estimatedTaxSavedByExpenses)} €
              </span>
            </p>
          </div>
        </div>

        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="w-24 font-mono">Date</TableHead>
              <TableHead>Fournisseur &amp; Libellé</TableHead>
              <TableHead className="w-24 font-mono">NACE</TableHead>
              <TableHead className="w-28 text-right font-mono">HTVA</TableHead>
              <TableHead className="w-28 text-right font-mono">TVA récup.</TableHead>
              <TableHead className="w-28 text-right font-mono">Déduct. IPP</TableHead>
              <TableHead className="w-14 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aucune dépense encodée sur {intervat.periodLabel}. Ajoute tes factures Meta Ads, Vercel, Supabase, Mollie ou matériel ci-dessus pour réduire ta TVA et ton IPP.
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
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{exp.supplier_name}</span>
                          {exp.is_reverse_charge && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Autoliquidation {exp.supplier_country}
                            </Badge>
                          )}
                          {exp.is_investment && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Invest. [83]
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {exp.description}
                          {exp.invoice_ref ? ` · Réf. ${exp.invoice_ref}` : ""}
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
                        <span className="text-muted-foreground">0,00 € (RC)</span>
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(exp.id)}
                        title="Supprimer cette dépense"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ==========================================================================
   ONGLET 3 : DÉCLARATION TVA INTERVAT (PRÊTE À RECOPIER) & LISTING + PEPPOL
   ========================================================================== */

interface IntervatPeppolTabProps {
  year: number
  intervat: IntervatSummary
  clientListing: ClientVatListingRow[]
}

export function IntervatPeppolTab({
  year,
  intervat,
  clientListing,
}: IntervatPeppolTabProps) {
  const [copiedGrid, setCopiedGrid] = useState<string | null>(null)

  const grids = [
    {
      code: "03",
      label: "Opérations à 21 % TVA (Chiffre d'affaires HTVA)",
      help: "Somme HTVA de toutes tes factures de ventes émises (packs crédits + achats directs leads Mollie).",
      amount: intervat.grid03,
    },
    {
      code: "49",
      label: "Notes de crédit délivrées (HTVA)",
      help: "Montant HTVA des notes de crédit éventuellement émises à tes clients.",
      amount: intervat.grid49,
    },
    {
      code: "82",
      label: "Services et biens divers (Achats HTVA)",
      help: "Frais généraux, pubs Meta/Google, SaaS, frais Mollie, télécom, sous-traitance.",
      amount: intervat.grid82,
    },
    {
      code: "83",
      label: "Biens d'investissement (Achats HTVA)",
      help: "Matériel IT/vidéo amortissable (> 1 000 € HTVA) encodé en investissement.",
      amount: intervat.grid83,
    },
    {
      code: "87",
      label: "Autres achats avec report de perception (Hors UE — Vercel, Supabase, Resend)",
      help: "Base HTVA de tes logiciels/services facturés depuis hors de l'Union européenne.",
      amount: intervat.grid87,
    },
    {
      code: "88",
      label: "Services intracommunautaires avec report (UE — Meta Ads, Google Ads Irlande)",
      help: "Base HTVA de tes factures pub B2B intracommunautaires reçues à 0 % TVA.",
      amount: intervat.grid88,
    },
    {
      code: "54",
      label: "TVA due sur opérations grille [03] (+21 %)",
      help: "TVA que tes clients installateurs t'ont payée sur tes ventes.",
      amount: intervat.grid54,
    },
    {
      code: "55",
      label: "TVA due sur services intra-UE grille [88] (+21 %)",
      help: "21 % calculés sur Meta/Google Ads (annulée immédiatement par la grille [59]).",
      amount: intervat.grid55,
    },
    {
      code: "56",
      label: "TVA due sur services hors-UE grille [87] (+21 %)",
      help: "21 % calculés sur Vercel/Supabase/Resend (annulée immédiatement par la grille [59]).",
      amount: intervat.grid56,
    },
    {
      code: "59",
      label: "TVA déductible totale (TVA payée BE + Autoliquidation [55]+[56])",
      help: "C'est ici que tu récupères ta TVA sur achats belges et que s'annule l'autoliquidation.",
      amount: intervat.grid59,
    },
  ]

  const copyAmount = (code: string, val: number) => {
    const formatted = val.toFixed(2).replace(".", ",")
    navigator.clipboard.writeText(formatted)
    setCopiedGrid(code)
    toast.success(`Grille [${code}] copiée : ${formatted}`)
    setTimeout(() => setCopiedGrid(null), 2000)
  }

  const handleExportClientListing = () => {
    const eligible = clientListing.filter((c) => c.isAbove250Threshold)
    if (eligible.length === 0) {
      toast.info("Aucun client belge n'a encore dépassé 250 € HTVA sur cette année.")
      return
    }
    const headers = ["Société", "Numéro TVA", "Numéro BCE", "Nombre factures", "Total HTVA (€)", "Total TVA (€)"]
    const rows = eligible.map((c) => [
      `"${c.companyName.replace(/"/g, '""')}"`,
      c.vatNumber || "MANQUANT",
      c.bceNumber || "",
      c.invoicesCount,
      c.totalHtva.toFixed(2),
      c.totalVat.toFixed(2),
    ])
    const csv = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
    const link = document.createElement("a")
    link.href = encodeURI(csv)
    link.download = `aegis_listing_clients_tva_${year}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Listing annuel clients TVA exporté.")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Solde final Intervat */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[var(--aegis-context)]">
            Résultat Intervat · {intervat.periodLabel} · Échéance : {intervat.deadlineLabel}
          </span>
          <h2 className="font-heading text-xl font-bold text-[var(--aegis-ink)]">
            {intervat.grid71 > 0 ? (
              <>
                Grille [71] — TVA nette à payer à l&apos;État :{" "}
                <span className="font-mono tabular-nums">{formatEur(intervat.grid71)} €</span>
              </>
            ) : (
              <>
                Grille [72] — Crédit de TVA en ta faveur :{" "}
                <span className="font-mono tabular-nums">{formatEur(intervat.grid72)} €</span>
              </>
            )}
          </h2>
          <p className="text-xs text-[var(--aegis-muted)]">
            Calcul : ([54] {formatEur(intervat.grid54)} € + [55] {formatEur(intervat.grid55)} € + [56] {formatEur(intervat.grid56)} €) − ([59] {formatEur(intervat.grid59)} € + [64] {formatEur(intervat.grid64)} €).
          </p>
        </div>

        <Button asChild size="sm" className="shrink-0">
          <a href="https://finances.belgium.be/fr/E-services/Intervat" target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Ouvrir Intervat (SPF Finances)
          </a>
        </Button>
      </div>

      {/* Tableau des grilles Intervat à recopier */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-[var(--aegis-surface-subtle)] flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">
              Grilles officielles Intervat prêtes à recopier
            </h2>
            <p className="text-xs text-muted-foreground">
              Connecte-toi sur Intervat avec itsme et recopie chaque montant ci-dessous (0 € d&apos;abonnement comptable nécessaire).
            </p>
          </div>
        </div>

        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="w-24 font-mono">Grille</TableHead>
              <TableHead>Intitulé officiel &amp; Explication</TableHead>
              <TableHead className="w-36 text-right font-mono">Montant (€)</TableHead>
              <TableHead className="w-24 text-right">Copier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grids.map((g) => (
              <TableRow key={g.code}>
                <TableCell>
                  <span className="font-mono tabular-nums font-bold px-2 py-0.5 rounded bg-secondary border border-border">
                    [{g.code}]
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{g.label}</span>
                    <span className="text-[11px] text-muted-foreground">{g.help}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-bold text-foreground">
                  {formatEur(g.amount)} €
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs font-mono"
                    onClick={() => copyAmount(g.code, g.amount)}
                  >
                    {copiedGrid === g.code ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Peppol B2B & Listing Clients Annuel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Explication Peppol sans abonnement cher */}
        <div className="rounded-2xl border border-[var(--aegis-border)] bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-accent" />
            <h2 className="font-heading text-base font-bold text-foreground">
              Pourquoi Peppol ne peut pas être envoyé « sans Point d&apos;Accès » ?
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Peppol fonctionne comme un réseau télécom sécurisé (comparable à SWIFT ou Proximus) : aucun serveur Next.js ne peut envoyer directement sur Peppol sans passer par un <strong>Access Point certifié par la Belgique</strong>.
          </p>
          <div className="rounded-xl bg-[var(--aegis-surface-subtle)] border border-[var(--aegis-border)] p-3.5 flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-foreground">La solution optimale sans payer de logiciel comptable complet :</span>
            <span className="text-muted-foreground">
              1. Aegis génère déjà tes factures conformes en <strong>XML UBL 2.1 (EN 16931)</strong> dans l&apos;onglet 1.
            </span>
            <span className="text-muted-foreground">
              2. Ouvre simplement un portail d&apos;envoi Peppol léger (ex. <strong>Billit</strong> entrée de gamme ~7,50 €/mois, ou <strong>Odoo Facturation 1 app gratuit</strong>) : tu importes nos fichiers <code className="font-mono">.xml</code> UBL ou on branche leur API en 1 clé pour un envoi 100 % automatique.
            </span>
            <span className="text-muted-foreground">
              3. Identifiant Peppol officiel d&apos;INIT42 : <code className="font-mono font-semibold text-foreground">{LEGAL_ENTITY.peppolId}</code>.
            </span>
          </div>
        </div>

        {/* Listing Clients Annuel > 250 € HTVA */}
        <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-[var(--aegis-surface-subtle)] flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">
                Listing Annuel Clients TVA {year} (&gt; 250 € HTVA)
              </h2>
              <p className="text-xs text-muted-foreground">
                À déposer sur Intervat avant le 31 mars {year + 1}.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleExportClientListing} className="h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span>Exporter CSV</span>
            </Button>
          </div>

          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Installateur</TableHead>
                <TableHead className="font-mono">N° TVA</TableHead>
                <TableHead className="text-right font-mono">Total HTVA</TableHead>
                <TableHead className="text-right">Listing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientListing.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Aucun client facturé sur {year}.
                  </TableCell>
                </TableRow>
              ) : (
                clientListing.map((row) => (
                  <TableRow key={row.companyName}>
                    <TableCell className="font-medium text-foreground">{row.companyName}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {row.vatNumber ? (
                        row.vatNumber
                      ) : (
                        <span className="text-destructive">Manquant</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold">
                      {formatEur(row.totalHtva)} €
                    </TableCell>
                    <TableCell className="text-right">
                      {row.isAbove250Threshold ? (
                        <Badge variant="outline" className="text-[10px] font-mono bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]">
                          Requis (&gt;250 €)
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">&le; 250 €</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   ONGLET 4 : PARCOURS COMPTABLE & RAPPELS INTERACTIFS
   ========================================================================== */

interface RoutineChecklistTabProps {
  year: number
  quarter: 0 | 1 | 2 | 3 | 4
  tasks: RoutineTask[]
  completedIds: string[]
  onToggleTask: (taskId: string, nextCompleted: boolean) => Promise<void>
}

export function RoutineChecklistTab({
  year,
  quarter,
  tasks,
  completedIds,
  onToggleTask,
}: RoutineChecklistTabProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const completedSet = useMemo(() => new Set(completedIds), [completedIds])
  const completedCount = tasks.filter((t) => completedSet.has(t.id)).length
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  const handleToggle = async (taskId: string) => {
    setBusyId(taskId)
    try {
      await onToggleTask(taskId, !completedSet.has(taskId))
    } finally {
      setBusyId(null)
    }
  }

  const groups: Array<{ key: RoutineTask["cadence"]; title: string; subtitle: string }> = [
    {
      key: "monthly",
      title: "Routine Mensuelle (5 minutes / mois)",
      subtitle: "Récupérer tes justificatifs Mollie, Meta Ads et SaaS pour ne perdre aucune déduction.",
    },
    {
      key: "quarterly",
      title: `Échéances Trimestrielles (${quarter === 0 ? "Année" : `T${quarter}`} ${year})`,
      subtitle: "Déclaration TVA Intervat, paiement éventuel, lois sociales et versement anticipé.",
    },
    {
      key: "annual",
      title: "Obligations Annuelles",
      subtitle: "Listing clients assujettis avant le 31 mars et déclaration IPP sur Tax-on-web.",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[var(--aegis-ink)]" />
            <h2 className="font-heading text-lg font-bold text-[var(--aegis-ink)]">
              Ton parcours guidé pas-à-pas ({completedCount}/{tasks.length} validées)
            </h2>
          </div>
          <p className="text-xs text-[var(--aegis-muted)]">
            Suis uniquement cette checklist dans l&apos;ordre : tu sais exactement quoi faire, où cliquer et à quelle date.
          </p>
        </div>

        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="h-2 flex-1 rounded-full bg-card border border-[var(--aegis-border)] overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold tabular-nums text-[var(--aegis-ink)]">
            {progressPct} %
          </span>
        </div>
      </div>

      {groups.map((grp) => {
        const items = tasks.filter((t) => t.cadence === grp.key)
        return (
          <div key={grp.key} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-heading text-base font-bold text-foreground">{grp.title}</h3>
              <p className="text-xs text-muted-foreground">{grp.subtitle}</p>
            </div>

            <div className="flex flex-col gap-2.5">
              {items.map((task) => {
                const done = completedSet.has(task.id)
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "rounded-xl border p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors",
                      done
                        ? "border-primary/25 bg-[var(--aegis-availability-bg)]/40"
                        : "border-[var(--aegis-border)] bg-card"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        disabled={busyId === task.id}
                        onClick={() => handleToggle(task.id)}
                        className="mt-0.5 text-primary cursor-pointer shrink-0"
                        aria-label={`Marquer ${task.title} comme fait`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              done ? "line-through text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {task.title}
                          </span>
                          <Badge variant="outline" className="font-mono tabular-nums text-[10px]">
                            {task.whenLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{task.howTo}</p>
                        <span className="text-[11px] font-medium text-[var(--aegis-context)]">
                          Où le faire : {task.whereLabel}
                        </span>
                      </div>
                    </div>

                    {task.whereUrl && (
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs shrink-0">
                        <a href={task.whereUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          <span>Ouvrir</span>
                        </a>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   ONGLET 5 : COURS TVA BELGE & RÉFÉRENTIEL DES CODES NACE INIT42
   ========================================================================== */

export function TaxCourseNaceTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* 3 Cartes fondamentales de compréhension fiscale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--aegis-ink)]">
            <Receipt className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-base font-bold">
              1. Est-ce que tu « perds » ta TVA ?
            </h2>
          </div>
          <p className="text-xs text-[var(--aegis-muted)] leading-relaxed">
            <strong>Non : la TVA n&apos;est jamais ton argent.</strong> Quand un installateur paie <span className="font-mono tabular-nums">118,98 € TTC</span>, <span className="font-mono tabular-nums">98,33 €</span> sont ton chiffre d&apos;affaires et <span className="font-mono tabular-nums">20,65 €</span> appartiennent à l&apos;État.
          </p>
          <p className="text-xs text-[var(--aegis-muted)] leading-relaxed">
            Fin de trimestre, tu ne « perds » pas à la payer : tu reverses uniquement <strong>(TVA collectée sur tes ventes) − (TVA payée sur tes achats belges)</strong>.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-preference-bg)] p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--aegis-ink)]">
            <AlertTriangle className="h-4 w-4 text-[var(--aegis-preference-accent)]" />
            <h2 className="font-heading text-base font-bold">
              2. Le piège à éviter (« défalquer »)
            </h2>
          </div>
          <p className="text-xs text-[var(--aegis-preference-label)] leading-relaxed">
            <strong>N&apos;achète JAMAIS quelque chose d&apos;inutile juste pour « faire baisser la TVA » !</strong> Si tu dépenses <span className="font-mono tabular-nums">1 000 € HTVA + 210 € TVA</span> pour un achat superflu, tu économises <span className="font-mono tabular-nums">210 €</span> de TVA et <span className="font-mono tabular-nums">~400 €</span> d&apos;impôt, mais il te sort quand même <span className="font-mono tabular-nums">~600 €</span> net de ta poche.
          </p>
          <p className="text-xs text-[var(--aegis-preference-label)] leading-relaxed">
            Achète uniquement ce qui fait croître Aegis Solaire (Meta Ads, matériel pro utile, logiciels).
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-availability-bg)] p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--aegis-ink)]">
            <Landmark className="h-4 w-4 text-[var(--aegis-availability-text)]" />
            <h2 className="font-heading text-base font-bold">
              3. Tes seuils Étudiant-Indépendant 2026 (100 % Aegis)
            </h2>
          </div>
          <ul className="text-xs text-[var(--aegis-ink)] flex flex-col gap-1.5 leading-relaxed">
            <li>
              • <strong>&le; 8 687,03 € net/an :</strong>{" "}
              <span className="font-mono tabular-nums font-semibold">0 €</span> de cotisations sociales + 100 % allocs sans limite d&apos;heures.
            </li>
            <li>
              • <strong>&le; 11 180 € net/an :</strong>{" "}
              <span className="font-mono tabular-nums font-semibold">0 €</span> d&apos;impôt IPP (quotité exemptée 2026).
            </li>
            <li>
              • <strong>&le; 12 300 € net/an :</strong> tu restes <strong>fiscalement à charge</strong> de tes parents.
            </li>
            <li>
              • <strong>8 687,04 € → 17 374,07 € net/an :</strong> <span className="font-mono tabular-nums">20,5 %</span> uniquement sur la tranche dépassée + garder &le; 240 h/trimestre pour les allocs.
            </li>
          </ul>
        </div>
      </div>

      {/* Encadré stratégique spécial Étudiant-Indépendant */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-5 flex flex-col gap-2">
        <h2 className="font-heading text-base font-bold text-[var(--aegis-ink)]">
          Comment encaisser beaucoup de CA tout en restant à 0 € de cotisations sociales et 0 € d&apos;impôt
        </h2>
        <p className="text-xs text-[var(--aegis-muted)] leading-relaxed">
          Les plafonds ci-dessus s&apos;appliquent à ton <strong>Bénéfice Net Imposable</strong> (<span className="font-mono tabular-nums">CA HTVA − Frais pros déductibles</span>), pas à ton chiffre d&apos;affaires brut ! Exemple : si Aegis encaisse <span className="font-mono tabular-nums font-semibold text-[var(--aegis-ink)]">18 000 € HTVA</span> sur l&apos;année et que tu réinvestis <span className="font-mono tabular-nums font-semibold text-[var(--aegis-ink)]">10 000 € HTVA</span> en Meta Ads, matériel IT/vidéo utile et SaaS, ton bénéfice net est de <span className="font-mono tabular-nums font-semibold text-[var(--aegis-ink)]">8 000 €</span> &rarr; <strong>0 € de cotisations sociales, 0 € d&apos;impôt IPP, allocations familiales maintenues et 100 % à charge des parents</strong>. Tu ne paies donc que la TVA (qui n&apos;est pas à toi).
        </p>
      </div>

      {/* Tableau complet des 10 codes NACE d'INIT42 */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-[var(--aegis-surface-subtle)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">
                Ce que tu as le droit de passer en frais selon tes 10 codes NACE (INIT42)
              </h2>
              <p className="text-xs text-muted-foreground">
                Tes codes NACE officiels couvrent à la fois le code informatique, les portails web, la pub digitale, la vidéo et la photo.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono tabular-nums text-xs">
            BCE {LEGAL_ENTITY.bce}
          </Badge>
        </div>

        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="w-24 font-mono">Code NACE</TableHead>
              <TableHead className="min-w-[200px]">Activité officielle</TableHead>
              <TableHead className="min-w-[260px]">Dépenses autorisées</TableHead>
              <TableHead className="min-w-[180px]">TVA &amp; Déductibilité IPP</TableHead>
              <TableHead className="min-w-[220px]">Conseil conformité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INIT42_NACE_CODES.map((nace) => (
              <TableRow key={nace.code}>
                <TableCell>
                  <span className="font-mono tabular-nums font-bold px-2 py-0.5 rounded bg-secondary border border-border">
                    {nace.code}
                  </span>
                </TableCell>
                <TableCell className="font-semibold text-foreground">{nace.title}</TableCell>
                <TableCell>
                  <ul className="flex flex-col gap-1 text-muted-foreground">
                    {nace.authorizedExpenses.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{nace.vatRecoveryRule}</span>
                    <span className="text-[11px] text-muted-foreground">{nace.ippDeductibilityRule}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{nace.legalTip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
