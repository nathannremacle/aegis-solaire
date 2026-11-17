/**
 * Référentiel fiscal et comptable belge pour INIT42 (Personne Physique — Liège, Belgique).
 * Codes NACEBEL issus des mentions légales officielles :
 * 62100, 73110, 63100, 18130, 59113, 62200, 62900, 63910, 74201, 82400.
 */

export const LEGAL_ENTITY = {
  commercialName: "Aegis Solaire",
  legalName: "INIT42",
  operatorLegalLine: "INIT42 (Nathan Remacle)",
  legalForm: "Entreprise individuelle / Personne physique (PP)",
  bce: "1039.899.980",
  bceDigits: "1039899980",
  vat: "BE 1039.899.980",
  vatCompact: "BE1039899980",
  peppolId: "0208:1039899980",
  iban: "BE84 0020 3534 7259",
  ibanCompact: "BE84002035347259",
  bic: "GEBABEBB",
  city: "Liège",
  country: "BE",
  email: "contact@aegissolaire.com",
  vatRate: 0.21,
} as const

export interface UnifiedInvoiceRecord {
  id: string
  invoice_number: string
  invoice_type: "invoice" | "credit_note"
  fiscal_year: number
  sequence_number: number
  partner_id: string | null
  credit_order_id: string | null
  lead_purchase_id: string | null
  source_kind: "credit_order" | "lead_direct" | "manual"
  client_company_name: string
  client_vat_number: string | null
  client_bce_number: string | null
  client_street: string | null
  client_postal_code: string | null
  client_city: string | null
  client_country: string
  client_email: string | null
  line_description: string
  credits_amount: number
  amount_htva: number
  vat_rate: number
  amount_vat: number
  amount_ttc: number
  processor_fee_eur: number
  payment_method: string | null
  payment_reference: string | null
  status: "issued" | "paid" | "credited" | "cancelled"
  peppol_status: "ready_ubl" | "sent" | "manual_uploaded" | "not_applicable"
  issued_at: string
  paid_at: string | null
  notes: string | null
  is_synthesized?: boolean
}

export interface AccountingExpenseRecord {
  id: string
  expense_date: string
  supplier_name: string
  supplier_country: "BE" | "EU" | "NON_EU" | string
  supplier_vat_number: string | null
  category: string
  description: string
  nace_code: string
  amount_htva: number
  vat_paid_be: number
  vat_deductible_pct: number
  tax_deductible_pct: number
  is_reverse_charge: boolean
  is_investment: boolean
  invoice_ref: string | null
  notes: string | null
  created_at?: string
}

export interface NaceCodeProfile {
  code: string
  title: string
  authorizedExpenses: string[]
  vatRecoveryRule: string
  ippDeductibilityRule: string
  legalTip: string
}

export const INIT42_NACE_CODES: NaceCodeProfile[] = [
  {
    code: "62100",
    title: "Activités de programmation informatique",
    authorizedExpenses: [
      "PC/Mac, écrans, claviers, matériel de développement",
      "Abonnements GitHub, Cursor/IA, IDE, hébergement",
      "Fibre internet & GSM (quote-part pro 75 %)",
    ],
    vatRecoveryRule: "100 % TVA récupérable (75 % si mixte Internet/GSM)",
    ippDeductibilityRule: "100 % déductible (amortissement sur 3 ans si > 1 000 € HTVA)",
    legalTip: "Tout achat informatique < 1 000 € HTVA est déductible à 100 % l'année même.",
  },
  {
    code: "73110",
    title: "Activités des agences de publicité",
    authorizedExpenses: [
      "Budgets Meta Ads, Google Ads, LinkedIn Ads, TikTok Ads",
      "Outils créa pub, tracking, landing pages, copywriting",
      "Sous-traitance média buying ou création de bannières",
    ],
    vatRecoveryRule: "Autoliquidation intra-UE (Irlande) : 0 € avancé, neutre sur Intervat",
    ippDeductibilityRule: "100 % déductible en charge immédiate sur l'année",
    legalTip: "Renseigne toujours BE 1039.899.980 chez Meta & Google pour recevoir des factures 0 % TVA.",
  },
  {
    code: "63100",
    title: "Traitement de données, hébergement et activités connexes",
    authorizedExpenses: [
      "Vercel, Supabase, AWS, Cloudflare, domaines DNS",
      "Resend (emails), Upstash Redis, API CBE, Mollie (frais)",
    ],
    vatRecoveryRule: "Autoliquidation hors-UE (grille 87 + 56 + 59). Frais Mollie : 0 % TVA (exonéré art. 44)",
    ippDeductibilityRule: "100 % déductible",
    legalTip: "Télécharge la facture mensuelle des frais sur Mollie chaque début de mois.",
  },
  {
    code: "59113",
    title: "Production de films publicitaires & vidéos",
    authorizedExpenses: [
      "Caméra, micro-cravate, éclairage LED, trépied, prompteur",
      "Logiciels de montage (Premiere, CapCut Pro, DaVinci, audio)",
      "Location de studio ou décors pour tournages ads",
    ],
    vatRecoveryRule: "100 % TVA récupérable sur factures belges avec TVA",
    ippDeductibilityRule: "100 % déductible (amortissement 3-5 ans si matériel > 1 000 € HTVA)",
    legalTip: "Tes codes 59113 & 74201 justifient directement tout matériel vidéo/photo pour tes pubs Aegis.",
  },
  {
    code: "74201",
    title: "Activités photographiques (hors photographes de presse)",
    authorizedExpenses: [
      "Appareil photo, objectifs, drone (avec enregistrement), accessoires",
      "Banques d'images pro, Lightroom / Photoshop",
    ],
    vatRecoveryRule: "100 % TVA récupérable",
    ippDeductibilityRule: "100 % déductible",
    legalTip: "Conserve des exemples de visuels produits avec le matériel en cas de contrôle.",
  },
  {
    code: "18130",
    title: "Activités de prépresse et de pré-média",
    authorizedExpenses: [
      "Suite Adobe / Figma / Canva Pro, polices de caractères, maquettes UI",
      "Impressions de plaquettes ou flyers B2B de présentation",
    ],
    vatRecoveryRule: "100 % TVA récupérable (ou autoliquidation si éditeur étranger)",
    ippDeductibilityRule: "100 % déductible",
    legalTip: "Couvre les outils de design et documents commerciaux PDF.",
  },
  {
    code: "62200",
    title: "Conseil informatique et gestion d'installations",
    authorizedExpenses: [
      "Audits sécurité, logiciels de monitoring, VPN pro",
      "Déplacements clients / audits techniques sur site",
    ],
    vatRecoveryRule: "100 % TVA récupérable (35 % max sur frais auto mixtes)",
    ippDeductibilityRule: "100 % pro (75 % à 100 % selon mobilité)",
    legalTip: "Privilégie les tickets SNCB / déplacements documentés (100 % déductibles).",
  },
  {
    code: "62900",
    title: "Autres activités de service informatique",
    authorizedExpenses: [
      "Licences API tierces, automatisations, webhooks, stockage cloud",
      "Formations techniques et veille logicielle",
    ],
    vatRecoveryRule: "100 % TVA récupérable",
    ippDeductibilityRule: "100 % déductible",
    legalTip: "Les formations liées directement à ton activité sont 100 % déductibles.",
  },
  {
    code: "63910",
    title: "Activités des portails Internet",
    authorizedExpenses: [
      "Plateforme Aegis Solaire, SEO, annuaires, acquisition trafic",
      "Outils analytics, heatmaps, A/B testing, CRM",
    ],
    vatRecoveryRule: "100 % TVA récupérable / autoliquidée",
    ippDeductibilityRule: "100 % déductible",
    legalTip: "Code cœur de la marketplace Aegis Solaire.",
  },
  {
    code: "82400",
    title: "Autres activités de soutien aux entreprises n.c.a.",
    authorizedExpenses: [
      "Commissions apporteurs / Media Partners, honoraires comptable/juriste",
      "Restaurants d'affaires B2B (69 % IPP, 0 % TVA), cadeaux clients < 50 €",
    ],
    vatRecoveryRule: "0 % TVA sur resto ; 100 % TVA sur honoraires B2B & cadeaux < 50 € HTVA",
    ippDeductibilityRule: "100 % honoraires ; 69 % resto ; 50 % cadeaux d'affaires",
    legalTip: "Note toujours au dos du ticket resto le nom de l'installateur ou partenaire invité.",
  },
]

export interface ExpensePreset {
  id: string
  label: string
  shortLabel: string
  supplierPlaceholder: string
  supplierCountry: "BE" | "EU" | "NON_EU"
  defaultVatNumber: string
  naceCode: string
  vatRateInput: number
  vatDeductiblePct: number
  taxDeductiblePct: number
  isReverseCharge: boolean
  isInvestment: boolean
  explanation: string
}

export const EXPENSE_PRESETS: ExpensePreset[] = [
  {
    id: "meta_google_ads_eu",
    label: "Meta Ads / Google Ads (Irlande - UE)",
    shortLabel: "Meta / Google Ads",
    supplierPlaceholder: "Meta Platforms Ireland Ltd",
    supplierCountry: "EU",
    defaultVatNumber: "IE9692928F",
    naceCode: "73110",
    vatRateInput: 0,
    vatDeductiblePct: 100,
    taxDeductiblePct: 100,
    isReverseCharge: true,
    isInvestment: false,
    explanation:
      "Facturé 0 % TVA (autoliquidation intra-UE). Tu déclares +21 % en grille [55] et -21 % en grille [59] : impact TVA = 0 €, mais 100 % déductible de ton bénéfice IPP.",
  },
  {
    id: "saas_cloud_non_eu",
    label: "SaaS / Cloud / IA Hors-UE (Vercel, Supabase, Resend, OpenAI)",
    shortLabel: "SaaS / Cloud US",
    supplierPlaceholder: "Vercel Inc. / Supabase / Resend",
    supplierCountry: "NON_EU",
    defaultVatNumber: "",
    naceCode: "63100",
    vatRateInput: 0,
    vatDeductiblePct: 100,
    taxDeductiblePct: 100,
    isReverseCharge: true,
    isInvestment: false,
    explanation:
      "Prestation hors-UE (USA/SG). Autoliquidation en grilles [87], [56] et [59] : impact TVA = 0 € et 100 % déductible de ton bénéfice imposable.",
  },
  {
    id: "mollie_bank_fees",
    label: "Frais Mollie & Frais bancaires (Exonéré TVA)",
    shortLabel: "Frais Mollie / Banque",
    supplierPlaceholder: "Mollie B.V.",
    supplierCountry: "EU",
    defaultVatNumber: "NL815839091B01",
    naceCode: "63100",
    vatRateInput: 0,
    vatDeductiblePct: 0,
    taxDeductiblePct: 100,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Les services financiers (Mollie, banque) sont exonérés de TVA (art. 44 Code TVA) : pas d'autoliquidation TVA, mais 100 % déductibles en charge IPP.",
  },
  {
    id: "hardware_it_video",
    label: "Matériel IT / Vidéo / Studio (Facture BE avec 21 % TVA)",
    shortLabel: "Matériel IT / Vidéo",
    supplierPlaceholder: "Coolblue / Apple / Amazon BE",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "62100",
    vatRateInput: 21,
    vatDeductiblePct: 100,
    taxDeductiblePct: 100,
    isReverseCharge: false,
    isInvestment: true,
    explanation:
      "Tu récupères 100 % de la TVA belge (21 %) sur le trimestre (grille [59]). Si le bien dépasse 1 000 € HTVA, il passe en investissement (grille [83]) amorti sur 3 ans.",
  },
  {
    id: "telecom_internet_mixed",
    label: "Internet Fibre & Abonnement GSM (Usage mixte 75 % pro)",
    shortLabel: "Internet & GSM (75 %)",
    supplierPlaceholder: "Proximus / Orange / VOO",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "62100",
    vatRateInput: 21,
    vatDeductiblePct: 75,
    taxDeductiblePct: 75,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Usage mixte domicile/pro standard admis par le fisc belge : 75 % de la TVA récupérable et 75 % déductible à l'IPP (ou 100 % si ligne purement dédiée).",
  },
  {
    id: "subcontractor_media_partner",
    label: "Sous-traitance BE / Apporteur / Comptable (21 % TVA BE)",
    shortLabel: "Apporteur / Comptable",
    supplierPlaceholder: "Partenaire Média / Bureau comptable",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "82400",
    vatRateInput: 21,
    vatDeductiblePct: 100,
    taxDeductiblePct: 100,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Facture belge B2B : 100 % de TVA récupérable en grille [59] et 100 % déductible en frais professionnels (grille [82]).",
  },
  {
    id: "restaurant_business",
    label: "Restaurant d'affaires client / partenaire (BE)",
    shortLabel: "Restaurant B2B",
    supplierPlaceholder: "Restaurant (RDV Installateur)",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "82400",
    vatRateInput: 12,
    vatDeductiblePct: 0,
    taxDeductiblePct: 69,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Règle stricte belge : 0 % de TVA récupérable sur la restauration, mais 69 % du montant TTC est déductible à l'IPP. Exige un ticket de caisse TVA + note du client au dos.",
  },
  {
    id: "client_gift_under_50",
    label: "Cadeau d'affaires partenaire (< 50 € HTVA)",
    shortLabel: "Cadeau client < 50 €",
    supplierPlaceholder: "Fournisseur cadeau B2B",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "82400",
    vatRateInput: 21,
    vatDeductiblePct: 100,
    taxDeductiblePct: 50,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Si < 50 € HTVA par bénéficiaire/an (hors tabac/spiritueux) : 100 % TVA récupérable et 50 % déductible à l'IPP.",
  },
  {
    id: "mobility_car_mixed",
    label: "Carburant / Entretien auto (Forfait mixte 35 % TVA)",
    shortLabel: "Auto / Carburant",
    supplierPlaceholder: "Station-service / Garage",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "62100",
    vatRateInput: 21,
    vatDeductiblePct: 35,
    taxDeductiblePct: 75,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Sans carnet de trajets kilométriques détaillé, le forfait professionnel admis en TVA est de 35 % (max légal mixte 50 % si prouvé).",
  },
  {
    id: "mobility_train_bike",
    label: "Train SNCB / Vélo pro (100 % déductible)",
    shortLabel: "Train / Vélo pro",
    supplierPlaceholder: "SNCB / Vélociste BE",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "62100",
    vatRateInput: 6,
    vatDeductiblePct: 100,
    taxDeductiblePct: 100,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Déplacements professionnels en train (TVA 6 %) ou vélo pro : 100 % TVA récupérable et 100 % déductible.",
  },
  {
    id: "home_office_energy",
    label: "Quote-part bureau domicile (Électricité / Chauffage 15 %)",
    shortLabel: "Bureau domicile (15 %)",
    supplierPlaceholder: "Fournisseur énergie BE",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "62100",
    vatRateInput: 6,
    vatDeductiblePct: 15,
    taxDeductiblePct: 15,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "En personne physique, tu peux déduire la quote-part de surface dédiée à ton bureau (ex. 15 % de ta facture d'électricité/chauffage).",
  },
  {
    id: "social_contributions",
    label: "Cotisations sociales trimestrielles (Partena / Xerius / Acerta)",
    shortLabel: "Lois sociales",
    supplierPlaceholder: "Caisse d'assurances sociales",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "62100",
    vatRateInput: 0,
    vatDeductiblePct: 0,
    taxDeductiblePct: 100,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Hors champ TVA (0 % TVA), mais 100 % déductibles de ton revenu imposable avant calcul de l'IPP.",
  },
]

export const EXPENSE_PRESETS_MAP = Object.fromEntries(
  EXPENSE_PRESETS.map((p) => [p.id, p])
) as Record<string, ExpensePreset>

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function getQuarterFromIsoDate(isoDate: string): 1 | 2 | 3 | 4 {
  const date = new Date(isoDate)
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() : date.getMonth()
  if (month <= 2) return 1
  if (month <= 5) return 2
  if (month <= 8) return 3
  return 4
}

export function isDateInPeriod(isoDate: string, year: number, quarter: 0 | 1 | 2 | 3 | 4): boolean {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return false
  if (date.getFullYear() !== year) return false
  if (quarter === 0) return true
  return getQuarterFromIsoDate(isoDate) === quarter
}

export interface IntervatSummary {
  year: number
  quarter: 0 | 1 | 2 | 3 | 4
  periodLabel: string
  deadlineLabel: string
  invoicesCount: number
  creditNotesCount: number
  expensesCount: number
  // Grilles Intervat officielles (en €)
  grid03: number // Opérations 21% HTVA (ventes)
  grid49: number // Notes de crédit délivrées HTVA
  grid81: number // Marchandises (0)
  grid82: number // Services et biens divers HTVA
  grid83: number // Biens d'investissement HTVA
  grid87: number // Autres opérations autoliquidation (Hors UE)
  grid88: number // Services intracommunautaires autoliquidation (UE)
  grid54: number // TVA 21% due sur grille 03 (nette des NC)
  grid55: number // TVA 21% due sur grille 88 (UE)
  grid56: number // TVA 21% due sur grille 87 (Hors UE)
  grid59: number // TVA déductible totale (BE + autoliquidation)
  grid64: number // TVA sur notes de crédit délivrées
  grid71: number // Solde TVA nette à payer à l'État
  grid72: number // Crédit de TVA à récupérer de l'État
  // Synthèse trésorerie & économies
  totalSalesHtva: number
  totalSalesTtc: number
  totalVatCollectedOnSales: number
  totalBeVatPaidAndDeductible: number
  totalProcessorFees: number
  totalExpensesHtva: number
  totalTaxDeductibleExpenses: number
  netTaxableProfit: number
  estimatedSocialContributions: number
  estimatedIncomeTaxProvision: number
  estimatedTaxSavedByExpenses: number
  totalReserveRecommended: number
  netCashInPocket: number
}

export function getPeriodDeadlineLabel(year: number, quarter: 0 | 1 | 2 | 3 | 4): {
  periodLabel: string
  deadlineLabel: string
} {
  if (quarter === 1) {
    return { periodLabel: `T1 ${year} (Jan–Mar)`, deadlineLabel: `20 avril ${year}` }
  }
  if (quarter === 2) {
    return { periodLabel: `T2 ${year} (Avr–Juin)`, deadlineLabel: `20 juillet ${year}` }
  }
  if (quarter === 3) {
    return { periodLabel: `T3 ${year} (Juil–Sep)`, deadlineLabel: `20 octobre ${year}` }
  }
  if (quarter === 4) {
    return { periodLabel: `T4 ${year} (Oct–Déc)`, deadlineLabel: `20 janvier ${year + 1}` }
  }
  return { periodLabel: `Année complète ${year}`, deadlineLabel: `Listing clients avant 31 mars ${year + 1}` }
}

export function computeIntervatDeclaration(
  invoices: UnifiedInvoiceRecord[],
  expenses: AccountingExpenseRecord[],
  year: number,
  quarter: 0 | 1 | 2 | 3 | 4
): IntervatSummary {
  const activeInvoices = invoices.filter(
    (inv) => inv.status !== "cancelled" && isDateInPeriod(inv.issued_at, year, quarter)
  )
  const periodExpenses = expenses.filter((exp) => isDateInPeriod(exp.expense_date, year, quarter))

  let grid03Cents = 0
  let grid49Cents = 0
  let vatSalesCents = 0
  let vatCreditNotesCents = 0
  let totalSalesTtcCents = 0
  let processorFeesCents = 0
  let invoicesCount = 0
  let creditNotesCount = 0

  for (const inv of activeInvoices) {
    const htvaCents = Math.round(Number(inv.amount_htva || 0) * 100)
    const vatCents = Math.round(Number(inv.amount_vat || 0) * 100)
    const ttcCents = Math.round(Number(inv.amount_ttc || 0) * 100)
    const feeCents = Math.round(Number(inv.processor_fee_eur || 0) * 100)

    if (inv.invoice_type === "credit_note") {
      creditNotesCount += 1
      grid49Cents += Math.abs(htvaCents)
      vatCreditNotesCents += Math.abs(vatCents)
      totalSalesTtcCents -= Math.abs(ttcCents)
    } else {
      invoicesCount += 1
      grid03Cents += htvaCents
      vatSalesCents += vatCents
      totalSalesTtcCents += ttcCents
    }
    processorFeesCents += feeCents
  }

  let grid82Cents = 0
  let grid83Cents = 0
  let grid87Cents = 0
  let grid88Cents = 0
  let grid55Cents = 0
  let grid56Cents = 0
  let beVatDeductibleCents = 0
  let reverseVatDeductibleCents = 0
  let totalExpensesHtvaCents = 0
  let totalTaxDeductibleCents = 0

  for (const exp of periodExpenses) {
    const htvaCents = Math.round(Number(exp.amount_htva || 0) * 100)
    const vatPaidBeCents = Math.round(Number(exp.vat_paid_be || 0) * 100)
    const vatDedRatio = Math.max(0, Math.min(100, Number(exp.vat_deductible_pct ?? 100))) / 100
    const taxDedRatio = Math.max(0, Math.min(100, Number(exp.tax_deductible_pct ?? 100))) / 100

    totalExpensesHtvaCents += htvaCents

    // Dépenses non soumises au régime TVA (ex. cotisations sociales)
    if (exp.category !== "social_contributions") {
      if (exp.is_investment) {
        grid83Cents += htvaCents
      } else {
        grid82Cents += htvaCents
      }

      if (exp.is_reverse_charge) {
        const rcVatCents = Math.round(htvaCents * 0.21)
        if (exp.supplier_country === "EU") {
          grid88Cents += htvaCents
          grid55Cents += rcVatCents
        } else if (exp.supplier_country === "NON_EU") {
          grid87Cents += htvaCents
          grid56Cents += rcVatCents
        }
        reverseVatDeductibleCents += Math.round(rcVatCents * vatDedRatio)
      } else if (vatPaidBeCents > 0) {
        beVatDeductibleCents += Math.round(vatPaidBeCents * vatDedRatio)
      }
    }

    // Coût réel déductible à l'IPP (HTVA + fraction de TVA non récupérable)
    const nonDeductibleBeVatCents = vatPaidBeCents - Math.round(vatPaidBeCents * vatDedRatio)
    const baseForTaxCents = htvaCents + Math.max(0, nonDeductibleBeVatCents)
    totalTaxDeductibleCents += Math.round(baseForTaxCents * taxDedRatio)
  }

  const grid59Cents = beVatDeductibleCents + reverseVatDeductibleCents
  const totalVatDueCents = vatSalesCents + grid55Cents + grid56Cents
  const totalVatDedAndCreditCents = grid59Cents + vatCreditNotesCents
  const netBalanceCents = totalVatDueCents - totalVatDedAndCreditCents

  const grid71Cents = netBalanceCents > 0 ? netBalanceCents : 0
  const grid72Cents = netBalanceCents < 0 ? Math.abs(netBalanceCents) : 0

  const netSalesHtvaCents = Math.max(0, grid03Cents - grid49Cents)
  const netTaxableProfitCents = Math.max(0, netSalesHtvaCents - totalTaxDeductibleCents)

  // En Personne Physique (BE) : ~20,5 % lois sociales sur le revenu net, puis provision IPP ~25-30 %
  const estimatedSocialCents = Math.round(netTaxableProfitCents * 0.205)
  const baseAfterSocialCents = Math.max(0, netTaxableProfitCents - estimatedSocialCents)
  const estimatedIppCents = Math.round(baseAfterSocialCents * 0.25)

  // Impôts + cotisations économisés grâce aux frais encodés (taux marginal combiné indicatif ~40 % en PP)
  const estimatedTaxSavedByExpensesCents = Math.round(totalTaxDeductibleCents * 0.4)

  const totalReserveCents = grid71Cents + estimatedSocialCents + estimatedIppCents
  const cashBeforeReserveCents = Math.max(0, totalSalesTtcCents - totalExpensesHtvaCents)
  const netCashInPocketCents = Math.max(0, cashBeforeReserveCents - totalReserveCents)

  const { periodLabel, deadlineLabel } = getPeriodDeadlineLabel(year, quarter)

  return {
    year,
    quarter,
    periodLabel,
    deadlineLabel,
    invoicesCount,
    creditNotesCount,
    expensesCount: periodExpenses.length,
    grid03: round2(grid03Cents / 100),
    grid49: round2(grid49Cents / 100),
    grid81: 0,
    grid82: round2(grid82Cents / 100),
    grid83: round2(grid83Cents / 100),
    grid87: round2(grid87Cents / 100),
    grid88: round2(grid88Cents / 100),
    grid54: round2(vatSalesCents / 100),
    grid55: round2(grid55Cents / 100),
    grid56: round2(grid56Cents / 100),
    grid59: round2(grid59Cents / 100),
    grid64: round2(vatCreditNotesCents / 100),
    grid71: round2(grid71Cents / 100),
    grid72: round2(grid72Cents / 100),
    totalSalesHtva: round2(netSalesHtvaCents / 100),
    totalSalesTtc: round2(totalSalesTtcCents / 100),
    totalVatCollectedOnSales: round2(vatSalesCents / 100),
    totalBeVatPaidAndDeductible: round2(beVatDeductibleCents / 100),
    totalProcessorFees: round2(processorFeesCents / 100),
    totalExpensesHtva: round2(totalExpensesHtvaCents / 100),
    totalTaxDeductibleExpenses: round2(totalTaxDeductibleCents / 100),
    netTaxableProfit: round2(netTaxableProfitCents / 100),
    estimatedSocialContributions: round2(estimatedSocialCents / 100),
    estimatedIncomeTaxProvision: round2(estimatedIppCents / 100),
    estimatedTaxSavedByExpenses: round2(estimatedTaxSavedByExpensesCents / 100),
    totalReserveRecommended: round2(totalReserveCents / 100),
    netCashInPocket: round2(netCashInPocketCents / 100),
  }
}

export interface RoutineTask {
  id: string
  cadence: "monthly" | "quarterly" | "annual"
  title: string
  whenLabel: string
  whereLabel: string
  whereUrl?: string
  howTo: string
}

export function getRoutineTasksForPeriod(year: number, quarter: 0 | 1 | 2 | 3 | 4): RoutineTask[] {
  const effectiveQ = quarter === 0 ? 4 : quarter
  const vatDeadline =
    effectiveQ === 1
      ? `20 avril ${year}`
      : effectiveQ === 2
        ? `20 juillet ${year}`
        : effectiveQ === 3
          ? `20 octobre ${year}`
          : `20 janvier ${year + 1}`

  return [
    {
      id: "m_mollie_invoice",
      cadence: "monthly",
      title: "Télécharger la facture mensuelle de frais Mollie",
      whenLabel: "Le 2 de chaque mois (30 sec)",
      whereLabel: "Dashboard Mollie → Administration → Factures",
      whereUrl: "https://my.mollie.com/dashboard",
      howTo:
        "Télécharge le PDF de commissions Mollie du mois écoulé et clique sur « Importer frais Mollie » dans l'onglet Dépenses ici. Ne déclare jamais le virement net Mollie en chiffre d'affaires : Aegis calcule déjà ton CA brut exact.",
    },
    {
      id: "m_ads_invoices",
      cadence: "monthly",
      title: "Récupérer les factures Meta Ads, Google Ads & SaaS (Vercel/Supabase/Resend)",
      whenLabel: "Le 5 de chaque mois (3 min)",
      whereLabel: "Meta Ads Billing / Google Ads / Vercel Billing",
      whereUrl: "https://adsmanager.facebook.com/billing_hub/payment_settings",
      howTo:
        "Vérifie que ton n° de TVA BE 1039.899.980 est bien encodé (facturation 0 % TVA en autoliquidation) et encode le total HTVA dans l'onglet Dépenses pour réduire ton bénéfice imposable IPP.",
    },
    {
      id: "m_peppol_sync",
      cadence: "monthly",
      title: "Transmettre / archiver les factures Peppol UBL du mois",
      whenLabel: "En continu ou le 5 du mois",
      whereLabel: "Onglet Factures & Commandes → Bouton Peppol UBL .xml",
      howTo:
        "Pour chaque client B2B belge assujetti, télécharge le fichier UBL 2.1 (.xml) conforme EN 16931 généré par Aegis et dépose-le dans ton outil d'envoi Peppol gratuit/léger (ou via API dès activation).",
    },
    {
      id: "q_vat_intervat",
      cadence: "quarterly",
      title: `Déposer la déclaration TVA trimestrielle sur Intervat (T${effectiveQ} ${year})`,
      whenLabel: `Avant le ${vatDeadline} (5 min)`,
      whereLabel: "MyMinfin / Intervat (SPF Finances)",
      whereUrl: "https://finances.belgium.be/fr/E-services/Intervat",
      howTo:
        "Connecte-toi avec itsme sur Intervat, ouvre l'onglet « Déclaration TVA (Intervat) » ici, et recopie simplement les montants des grilles [03], [82], [83], [87], [88], [54], [55], [56], [59] et [71].",
    },
    {
      id: "q_vat_payment",
      cadence: "quarterly",
      title: `Payer le solde TVA (Grille [71]) au SPF Finances`,
      whenLabel: `Avant le ${vatDeadline}`,
      whereLabel: "Communication structurée reçue sur Intervat après dépôt",
      howTo:
        "Paie depuis ton sous-compte « Réserve Fiscale & Sociale » en utilisant exactement la communication structurée générée par Intervat après soumission.",
    },
    {
      id: "q_social_and_va",
      cadence: "quarterly",
      title: "Payer les cotisations sociales & Versement Anticipé d'Impôt (VA)",
      whenLabel: "Fin de chaque trimestre (10/04, 10/07, 10/10, 20/12)",
      whereLabel: "Caisse d'assurances sociales + MyMinfin (Versements anticipés)",
      whereUrl: "https://www.minfin.fgov.be",
      howTo:
        "Encode ta quittance de cotisations sociales en dépense (100 % déductible de l'IPP). Effectue un Versement Anticipé basé sur la « Provision IPP » calculée dans le bandeau ci-dessus pour éviter la majoration fiscale.",
    },
    {
      id: "a_client_listing",
      cadence: "annual",
      title: `Déposer le Listing Annuel des Clients Assujettis (> 250 € HTVA)`,
      whenLabel: `Avant le 31 mars ${year + 1} (2 min)`,
      whereLabel: "Intervat → Listing clients annuel",
      whereUrl: "https://finances.belgium.be/fr/E-services/Intervat",
      howTo:
        "Clique sur « Exporter Listing Clients TVA » dans l'onglet Intervat : Aegis isole automatiquement tous les installateurs belges facturés pour plus de 250 € HTVA sur l'année avec leur n° BE.",
    },
    {
      id: "a_ipp_declaration",
      cadence: "annual",
      title: "Compléter la déclaration IPP (Revenus professionnels — Cadre XVII/XVIII)",
      whenLabel: `Juin / Juillet ${year + 1}`,
      whereLabel: "MyMinfin (Tax-on-web)",
      whereUrl: "https://www.minfin.fgov.be",
      howTo:
        "Utilise l'agrégat « Année complète » ici : Chiffre d'affaires total HTVA (brut) moins Total Frais Professionnels Déductibles (y compris frais Mollie, pubs et cotisations sociales).",
    },
  ]
}
