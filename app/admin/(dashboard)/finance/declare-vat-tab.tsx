"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  ExternalLink,
  Landmark,
  Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  INIT42_NACE_CODES,
  LEGAL_ENTITY,
  type IntervatSummary,
  type QuarterScheduleItem,
  type RoutineTask,
} from "@/lib/accounting/belgian-tax-rules"
import type { ClientVatListingRow } from "@/lib/accounting/invoice-service"

function formatEur(val: number): string {
  return val.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface DeclareVatTabProps {
  year: number
  quarter: 0 | 1 | 2 | 3 | 4
  intervat: IntervatSummary
  quarterSchedule: QuarterScheduleItem[]
  clientListing: ClientVatListingRow[]
  routineTasks: RoutineTask[]
  checklistCompletedIds: string[]
  onSelectQuarter: (q: 1 | 2 | 3 | 4) => Promise<void>
  onToggleTask: (taskId: string, nextCompleted: boolean) => Promise<void>
}

export function DeclareVatTab({
  year,
  quarter,
  intervat,
  quarterSchedule,
  clientListing,
  routineTasks,
  checklistCompletedIds,
  onSelectQuarter,
  onToggleTask,
}: DeclareVatTabProps) {
  const [copiedGrid, setCopiedGrid] = useState<string | null>(null)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)

  const completedSet = useMemo(() => new Set(checklistCompletedIds), [checklistCompletedIds])
  const completedCount = routineTasks.filter((t) => completedSet.has(t.id)).length

  const grids = [
    {
      code: "03",
      label: "Opérations à 21 % TVA (Ventes HTVA)",
      help: "Somme HTVA de toutes tes factures clients émises.",
      amount: intervat.grid03,
    },
    {
      code: "49",
      label: "Notes de crédit délivrées (HTVA)",
      help: "Montant HTVA des notes de crédit émises.",
      amount: intervat.grid49,
    },
    {
      code: "82",
      label: "Services et biens divers (Achats HTVA)",
      help: "Pubs Meta/Google, SaaS (Vercel/Supabase/Resend/Infomaniak), frais Mollie, télécom.",
      amount: intervat.grid82,
    },
    {
      code: "83",
      label: "Biens d'investissement (Achats HTVA >= 1 000 €)",
      help: "Matériel IT / studio vidéo amortissable.",
      amount: intervat.grid83,
    },
    {
      code: "87",
      label: "Achats Hors-UE avec autoliquidation (Vercel, Supabase, Resend, Infomaniak CH)",
      help: "Base HTVA des services facturés depuis hors Union européenne (États-Unis, Suisse…).",
      amount: intervat.grid87,
    },
    {
      code: "88",
      label: "Services intra-UE avec autoliquidation (Meta Ads IE, Google IE, Mollie NL)",
      help: "Base HTVA des factures reçues à 0 % TVA depuis un autre pays de l'UE.",
      amount: intervat.grid88,
    },
    {
      code: "54",
      label: "TVA due sur ventes grille [03] (+21 %)",
      help: "TVA facturée à tes clients installateurs.",
      amount: intervat.grid54,
    },
    {
      code: "55",
      label: "TVA due sur services intra-UE grille [88] (+21 %)",
      help: "21 % calculés sur Meta/Mollie (annulée immédiatement par la grille [59]).",
      amount: intervat.grid55,
    },
    {
      code: "56",
      label: "TVA due sur services hors-UE grille [87] (+21 %)",
      help: "21 % calculés sur Vercel/Supabase/Resend/Infomaniak (annulée par la grille [59]).",
      amount: intervat.grid56,
    },
    {
      code: "59",
      label: "TVA déductible totale (TVA payée BE + Autoliquidation [55]+[56])",
      help: "TVA belge récupérée sur achats locaux + annulation de l'autoliquidation.",
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
      toast.info("Aucun client belge n'a dépassé 250 € HTVA sur cette année.")
      return
    }
    const headers = [
      "Société",
      "Numéro TVA",
      "Numéro BCE",
      "Nombre factures",
      "Total HTVA (€)",
      "Total TVA (€)",
    ]
    const rows = eligible.map((c) => [
      `"${c.companyName.replace(/"/g, '""')}"`,
      c.vatNumber || "MANQUANT",
      c.bceNumber || "",
      c.invoicesCount,
      c.totalHtva.toFixed(2),
      c.totalVat.toFixed(2),
    ])
    const csv =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n")
    const link = document.createElement("a")
    link.href = encodeURI(csv)
    link.download = `aegis_listing_clients_tva_${year}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Listing annuel clients TVA exporté.")
  }

  const handleToggle = async (taskId: string) => {
    setBusyTaskId(taskId)
    try {
      await onToggleTask(taskId, !completedSet.has(taskId))
    } finally {
      setBusyTaskId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Frise des 4 Trimestres (Nouvelle Chaîne TVA belge : le 25 sans report week-end) */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-bold text-foreground">
              Calendrier TVA {year} — Règle belge du 25 (sans report week-end)
            </h2>
            <p className="text-xs text-muted-foreground">
              Clique sur un trimestre pour charger ses chiffres exacts. Si le 25 tombe un samedi ou dimanche, dépose et paie au plus tard le vendredi précédent.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs shrink-0">
            <a href="https://finances.belgium.be/fr/E-services/Intervat" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ouvrir Intervat (itsme)
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {quarterSchedule.map((item) => {
            const isSelected = quarter === item.quarter
            const stateBadge =
              item.state === "due_now"
                ? {
                    label: "À soumettre maintenant",
                    cls: "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)] border-[var(--aegis-preference-accent)]",
                  }
                : item.state === "current"
                  ? {
                      label: "Trimestre en cours",
                      cls: "bg-accent/10 text-accent border-accent/30",
                    }
                  : item.state === "past"
                    ? {
                        label: "Échéance passée",
                        cls: "bg-muted text-muted-foreground border-border",
                      }
                    : {
                        label: "À venir",
                        cls: "bg-muted text-muted-foreground border-border",
                      }

            return (
              <button
                key={item.quarter}
                type="button"
                onClick={() => onSelectQuarter(item.quarter)}
                className={cn(
                  "rounded-xl border p-3.5 text-left flex flex-col gap-2 transition-colors cursor-pointer",
                  isSelected
                    ? "border-primary bg-[var(--aegis-summary)] ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono tabular-nums font-bold text-sm text-foreground">
                    {item.label}
                  </span>
                  <Badge variant="outline" className={cn("text-[10px]", stateBadge.cls)}>
                    {stateBadge.label}
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">{item.monthsLabel}</span>
                <div className="flex flex-col gap-0.5 pt-1 border-t border-border/60">
                  <span className="text-[11px] text-muted-foreground">Date limite :</span>
                  <span className="font-mono tabular-nums text-xs font-bold text-foreground">
                    {item.deadlineLabel}
                  </span>
                  {item.isWeekend && (
                    <span className="text-[10px] text-[var(--aegis-preference-label)] leading-snug mt-0.5">
                      {item.effectiveDeadlineNote}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Résumé ultra-simple des 4 obligations de l'année */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
          {[
            {
              title: "1. Peppol B2B",
              when: "En continu",
              desc: "Lot .zip → Odoo Gratuit (onglet Ventes)",
            },
            {
              title: "2. Déclaration TVA",
              when: "4× / an (avant le 25)",
              desc: "Recopier les grilles ci-dessous sur Intervat",
            },
            {
              title: "3. Listing Clients > 250 €",
              when: `Avant le 31 mars ${year + 1}`,
              desc: "Exporter le CSV en bas de page → Intervat",
            },
            {
              title: "4. Impôts IPP",
              when: `Juin / Juillet ${year + 1}`,
              desc: "MyMinfin : Ventes HTVA − Frais déductibles",
            },
          ].map((ob) => (
            <div
              key={ob.title}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2 flex flex-col gap-0.5"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-foreground">{ob.title}</span>
                <span className="font-mono text-[10px] text-accent font-semibold">{ob.when}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{ob.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Solde Intervat & Tableau des Grilles à recopier */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[var(--aegis-context)]">
            {intervat.periodLabel} · Échéance : {intervat.deadlineLabel}
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
          <p className="text-xs text-[var(--aegis-muted)] font-mono tabular-nums">
            ([54] {formatEur(intervat.grid54)} € + [55] {formatEur(intervat.grid55)} € + [56]{" "}
            {formatEur(intervat.grid56)} €) − ([59] {formatEur(intervat.grid59)} € + [64]{" "}
            {formatEur(intervat.grid64)} €)
          </p>
        </div>

        <Button asChild size="sm" className="shrink-0">
          <a href="https://finances.belgium.be/fr/E-services/Intervat" target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Déclarer sur Intervat
          </a>
        </Button>
      </div>

      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-[var(--aegis-surface-subtle)]">
          <h2 className="font-heading text-base font-bold text-foreground">
            Grilles officielles Intervat prêtes à recopier
          </h2>
          <p className="text-xs text-muted-foreground">
            Connecte-toi sur Intervat avec itsme et copie-colle chaque grille non nulle ci-dessous.
          </p>
        </div>

        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="w-24 font-mono">Grille</TableHead>
              <TableHead>Intitulé &amp; Explication simple</TableHead>
              <TableHead className="w-36 text-right font-mono">Montant (€)</TableHead>
              <TableHead className="w-20 text-right">Copier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grids.map((g) => (
              <TableRow key={g.code} className={g.amount > 0 ? "bg-accent/[0.02]" : undefined}>
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

      {/* 3. Listing Clients Annuel (> 250 € HTVA) */}
      <div className="rounded-2xl border border-[var(--aegis-border)] bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-[var(--aegis-surface-subtle)] flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">
              Listing Annuel Clients TVA {year} (&gt; 250 € HTVA)
            </h2>
            <p className="text-xs text-muted-foreground">
              À déposer une fois par an sur Intervat avant le 31 mars {year + 1}.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportClientListing}
            className="h-8 text-xs gap-1.5"
          >
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
              <TableHead className="text-right">Seuil 250 €</TableHead>
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
                    {row.vatNumber || <span className="text-destructive">Manquant</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold">
                    {formatEur(row.totalHtva)} €
                  </TableCell>
                  <TableCell className="text-right">
                    {row.isAbove250Threshold ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]"
                      >
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

      {/* 4. Accordéons repliés : Checklist détaillée + Guide débutant & NACE */}
      <Accordion
        type="multiple"
        className="rounded-2xl border border-[var(--aegis-border)] bg-card px-4 sm:px-5"
      >
        <AccordionItem value="checklist">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-accent" />
              <span>
                Checklist guidée pas-à-pas ({completedCount}/{routineTasks.length} validées)
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2.5 pt-2 pb-5">
            {routineTasks.map((task) => {
              const done = completedSet.has(task.id)
              return (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3",
                    done
                      ? "border-primary/25 bg-[var(--aegis-availability-bg)]/40"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={busyTaskId === task.id}
                      onClick={() => handleToggle(task.id)}
                      className="mt-0.5 text-primary cursor-pointer shrink-0"
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            done ? "line-through text-muted-foreground" : "text-foreground"
                          )}
                        >
                          {task.title}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {task.whenLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{task.howTo}</p>
                    </div>
                  </div>
                  {task.whereUrl && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
                      <a href={task.whereUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ouvrir
                      </a>
                    </Button>
                  )}
                </div>
              )
            })}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="course">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-accent" />
              <span>Comprendre la TVA belge &amp; les 10 codes NACE d&apos;INIT42</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-5 pt-2 pb-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-[var(--aegis-summary)] p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[var(--aegis-ink)]">
                  <Receipt className="h-4 w-4 text-accent" />
                  <h3 className="font-heading text-sm font-bold">La TVA n&apos;est pas à toi</h3>
                </div>
                <p className="text-xs text-[var(--aegis-muted)] leading-relaxed">
                  Tu reverses simplement (TVA collectée sur ventes) − (TVA récupérable sur achats BE). L&apos;autoliquidation UE/Hors-UE (Meta, Vercel, Supabase, Resend, Infomaniak, Mollie) est neutre (<span className="font-mono tabular-nums">0,00 €</span>).
                </p>
              </div>
              <div className="rounded-xl border border-border bg-[var(--aegis-preference-bg)] p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[var(--aegis-preference-label)]">
                  <AlertTriangle className="h-4 w-4" />
                  <h3 className="font-heading text-sm font-bold">N&apos;achète rien d&apos;inutile</h3>
                </div>
                <p className="text-xs text-[var(--aegis-preference-label)] leading-relaxed">
                  Dépenser <span className="font-mono tabular-nums">1 000 €</span> pour « défalquer » sort quand même de la trésorerie. Investis uniquement dans ce qui développe Aegis Solaire.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-[var(--aegis-availability-bg)] p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[var(--aegis-availability-text)]">
                  <Landmark className="h-4 w-4" />
                  <h3 className="font-heading text-sm font-bold">Seuils Étudiant 2026</h3>
                </div>
                <p className="text-xs text-[var(--aegis-ink)] leading-relaxed">
                  Sous <span className="font-mono tabular-nums font-semibold">8 687,03 €</span> net/an : <span className="font-mono tabular-nums">0 €</span> social. Sous <span className="font-mono tabular-nums font-semibold">11 180 €</span> : <span className="font-mono tabular-nums">0 €</span> d&apos;impôt IPP.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead className="w-24 font-mono">NACE</TableHead>
                    <TableHead>Activité ({LEGAL_ENTITY.bce})</TableHead>
                    <TableHead>Dépenses autorisées</TableHead>
                    <TableHead>TVA &amp; IPP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INIT42_NACE_CODES.map((nace) => (
                    <TableRow key={nace.code}>
                      <TableCell className="font-mono font-bold">{nace.code}</TableCell>
                      <TableCell className="font-medium">{nace.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {nace.authorizedExpenses.join(" · ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{nace.vatRecoveryRule}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
