"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { FaqItem } from "@/components/StructuredData"
import { FAQ_FINANCING_TABLE_AFTER_INDEX } from "@/lib/faq-technique-data"
import { HelpCircle } from "lucide-react"

function FinancingComparisonTable() {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border/80 bg-muted/30 shadow-inner">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">
          Comparatif des modèles de financement wallon (achat propre, Corporate PPA, tiers-investissement)
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground">
              Modèle
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground">
              Qui finance l&apos;installation ?
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground">
              Effet principal
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground">
              Points d&apos;attention
            </th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr className="border-b border-border">
            <td className="px-4 py-3.5 font-medium text-foreground">Achat propre</td>
            <td className="px-4 py-3.5">Votre entreprise</td>
            <td className="px-4 py-3.5">
              Maîtrise de l&apos;actif, DPI à 40 % possible, captation des Certificats Verts côté société
            </td>
            <td className="px-4 py-3.5">
              CAPEX, dépôt SPW, coordination GRD ; levier dette type Easy&apos;Green (Wallonie Entreprendre) à modéliser
            </td>
          </tr>
          <tr className="border-b border-border">
            <td className="px-4 py-3.5 font-medium text-foreground">Corporate PPA</td>
            <td className="px-4 py-3.5">Producteur / investisseur</td>
            <td className="px-4 py-3.5">Prix de l&apos;électricité fixé sur 10 à 25 ans, couverture contre la volatilité (hedging)</td>
            <td className="px-4 py-3.5">
              On-site : souvent derrière le compteur ; structuration contrat, profil de charge et GRD (Ores, Resa, etc.)
            </td>
          </tr>
          <tr>
            <td className="px-4 py-3.5 font-medium text-foreground">Tiers-investissement</td>
            <td className="px-4 py-3.5">Investisseur / ESCO</td>
            <td className="px-4 py-3.5">Zéro CAPEX, CV et vente d&apos;électricité au site pour structurer le retour investisseur</td>
            <td className="px-4 py-3.5">Montage juridique (superficie, etc.), répartition des CV, échéance de rétrocession</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function FaqTechniqueAccordion({ items }: { items: FaqItem[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, idx) => (
        <AccordionItem
          key={item.question}
          value={`item-${idx}`}
          className="border-border/60 px-1 sm:px-2"
        >
          <AccordionTrigger className="py-5 text-left text-base font-semibold leading-snug text-foreground hover:no-underline sm:text-lg [&[data-state=open]]:text-primary">
            <span className="flex gap-3 pr-2">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary"
                aria-hidden
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span>{item.question}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pl-0 sm:pl-[2.75rem]">
            <p className="max-w-3xl leading-relaxed text-muted-foreground">{item.answer}</p>
            {idx === FAQ_FINANCING_TABLE_AFTER_INDEX ? <FinancingComparisonTable /> : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function FaqTechniqueHero({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 py-10 sm:px-10 sm:py-14 ${className ?? ""}`}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <HelpCircle className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Aegis Solaire</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            FAQ technique — Wallonie B2B
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Certificats Verts (CWaPE), réservation SPW Énergie, trajectoire PEB, Plan PACE 2030, raccordement GRD (Ores, Resa) et
            montages Corporate PPA ou tiers-investissement — pour arbitrer risque, rentabilité et valeur immobilière.
          </p>
        </div>
      </div>
    </div>
  )
}
