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

export type PaymentSource = "pro_account" | "personal_card" | "mollie_balance" | "other"

export type AccountingSource = "manual" | "drag_drop" | "email_inbound" | "mollie_api"

export type DraftWarningSeverity = "error" | "warning" | "info"

export interface DraftWarning {
  code: string
  severity: DraftWarningSeverity
  message: string
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
  document_storage_path?: string | null
  document_filename?: string | null
  document_mime_type?: string | null
  document_sha256?: string | null
  original_currency?: string
  original_amount?: number | null
  exchange_rate?: number | null
  payment_source?: PaymentSource
  source?: AccountingSource
  source_metadata?: Record<string, unknown>
  created_at?: string
}

export interface AccountingExpenseDraftRecord {
  id: string
  status: "pending_review" | "approved" | "rejected"
  source: "drag_drop" | "email_inbound" | "mollie_api"
  document_storage_path: string | null
  document_filename: string | null
  document_mime_type: string | null
  document_sha256: string | null
  document_size_bytes: number | null
  expense_date: string
  supplier_name: string
  supplier_country: "BE" | "EU" | "NON_EU"
  supplier_vat_number: string | null
  category: string
  description: string
  nace_code: string
  original_currency: string
  original_amount_htva: number
  original_vat_amount: number
  original_amount_ttc: number
  exchange_rate: number
  exchange_rate_source: string | null
  amount_htva: number
  vat_paid_be: number
  vat_deductible_pct: number
  tax_deductible_pct: number
  is_reverse_charge: boolean
  is_investment: boolean
  invoice_ref: string | null
  payment_source: PaymentSource
  is_valid_tax_invoice: boolean
  client_vat_present: boolean
  ai_confidence: number
  ai_model: string | null
  ai_warnings: DraftWarning[]
  ai_raw_extraction: Record<string, unknown>
  source_metadata: Record<string, unknown>
  notes: string | null
  approved_expense_id: string | null
  created_at: string
  updated_at: string
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
      "Vercel, Supabase, AWS, Cloudflare, Infomaniak, domaines DNS",
      "Resend (emails), Upstash Redis, API CBE, Mollie (commissions)",
    ],
    vatRecoveryRule:
      "Autoliquidation hors-UE (grilles [82], [87], [56], [59]) et autoliquidation UE pour Mollie (grilles [82], [88], [55], [59])",
    ippDeductibilityRule: "100 % déductible",
    legalTip: "Synchronise tes factures mensuelles Mollie via l'API (autoliquidation UE) et vérifie que BE 1039.899.980 figure sur chaque facture.",
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
    label: "SaaS / Cloud / IA Hors-UE (Vercel, Supabase, Resend, Infomaniak CH, OpenAI)",
    shortLabel: "SaaS / Cloud / CH",
    supplierPlaceholder: "Vercel / Supabase / Resend / Infomaniak",
    supplierCountry: "NON_EU",
    defaultVatNumber: "",
    naceCode: "63100",
    vatRateInput: 0,
    vatDeductiblePct: 100,
    taxDeductiblePct: 100,
    isReverseCharge: true,
    isInvestment: false,
    explanation:
      "Prestation hors-UE (USA, Suisse/Infomaniak, Singapour). Autoliquidation en grilles [82], [87], [56] (+21 %) et [59] (−21 %) : impact TVA = 0 € et 100 % déductible de ton bénéfice imposable.",
  },
  {
    id: "mollie_fees_eu",
    label: "Frais Mollie B.V. (Pays-Bas - UE · Autoliquidation)",
    shortLabel: "Frais Mollie (UE)",
    supplierPlaceholder: "Mollie B.V.",
    supplierCountry: "EU",
    defaultVatNumber: "NL815839091B01",
    naceCode: "63100",
    vatRateInput: 0,
    vatDeductiblePct: 100,
    taxDeductiblePct: 100,
    isReverseCharge: true,
    isInvestment: false,
    explanation:
      "Mollie B.V. (Pays-Bas) facture les entreprises belges à 0 % TVA en autoliquidation intra-UE : grilles [82], [88], +21 % en [55] et −21 % en [59] (impact TVA = 0 €) et 100 % déductible IPP. Vérifie que BE 1039.899.980 est encodé dans Mollie.",
  },
  {
    id: "bank_fees_exempt",
    label: "Frais bancaires belges / Revolut (Exonéré TVA art. 44)",
    shortLabel: "Frais bancaires",
    supplierPlaceholder: "Banque / Revolut",
    supplierCountry: "BE",
    defaultVatNumber: "",
    naceCode: "63100",
    vatRateInput: 0,
    vatDeductiblePct: 0,
    taxDeductiblePct: 100,
    isReverseCharge: false,
    isInvestment: false,
    explanation:
      "Les commissions bancaires de tenue de compte sont exonérées de TVA (art. 44 Code TVA) : 0 % TVA à déclarer, mais 100 % déductibles en charge IPP.",
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

export const EXPENSE_PRESETS_MAP: Record<string, ExpensePreset> = {
  ...Object.fromEntries(EXPENSE_PRESETS.map((p) => [p.id, p])),
  // Rétrocompatibilité si une ancienne écriture porte encore mollie_bank_fees
  mollie_bank_fees:
    EXPENSE_PRESETS.find((p) => p.id === "mollie_fees_eu") ?? EXPENSE_PRESETS[0],
}

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

export const STUDENT_TAX_THRESHOLDS_2026 = {
  /** Sous 8 687,03 € net/an : 0 € de cotisations sociales + maintien complet allocs sans limite d'heures */
  socialExemptMaxNet: 8687.03,
  /** Quotité exemptée d'impôt IPP 2026 : 0 € d'impôt sous ce seuil (si 100 % revenus via Aegis) */
  ippExemptMaxNet: 11180.0,
  /** Plafond unifié 2026 des ressources nettes pour rester fiscalement à charge des parents */
  parentChargeMaxNet: 12300.0,
  /** À partir de 17 374,08 € net/an : bascule en indépendant à titre principal + perte des allocs */
  principalSwitchMinNet: 17374.08,
  /** Taux de cotisation sociale belge */
  socialRate: 0.205,
} as const

export interface StudentStatusSummary {
  annualSalesHtva: number
  annualExpensesDeductible: number
  annualNetProfit: number
  annualSocialDue: number
  annualIppDue: number
  remainingBeforeSocial: number
  remainingBeforeIpp: number
  remainingBeforeParentChargeLoss: number
  remainingBeforePrincipalSwitch: number
  bracket: "exempt_0" | "reduced_tranche" | "principal"
  statusLabel: string
  parentChargeSafe: boolean
  familyAllowancesRule: string
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
  // Synthèse trésorerie & économies (Statut Étudiant-Indépendant)
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
  studentStatus: StudentStatusSummary
}

export interface QuarterScheduleItem {
  quarter: 1 | 2 | 3 | 4
  label: string
  monthsLabel: string
  deadlineIso: string
  deadlineLabel: string
  isWeekend: boolean
  effectiveDeadlineNote: string
  state: "past" | "current" | "due_now" | "upcoming"
}

export function getPeriodDeadlineLabel(year: number, quarter: 0 | 1 | 2 | 3 | 4): {
  periodLabel: string
  deadlineLabel: string
} {
  if (quarter === 1) {
    return { periodLabel: `T1 ${year} (Jan–Mar)`, deadlineLabel: `25 avril ${year}` }
  }
  if (quarter === 2) {
    return { periodLabel: `T2 ${year} (Avr–Juin)`, deadlineLabel: `25 juillet ${year}` }
  }
  if (quarter === 3) {
    return { periodLabel: `T3 ${year} (Juil–Sep)`, deadlineLabel: `25 octobre ${year}` }
  }
  if (quarter === 4) {
    return { periodLabel: `T4 ${year} (Oct–Déc)`, deadlineLabel: `25 janvier ${year + 1}` }
  }
  return { periodLabel: `Année complète ${year}`, deadlineLabel: `Listing clients avant 31 mars ${year + 1}` }
}

export function getQuarterCalendarSchedule(
  year: number,
  nowDate: Date = new Date()
): QuarterScheduleItem[] {
  const todayIso = nowDate.toISOString().slice(0, 10)
  const defs: Array<{
    quarter: 1 | 2 | 3 | 4
    monthsLabel: string
    qStartIso: string
    qEndIso: string
    dYear: number
    dMonth: number
    monthName: string
  }> = [
    {
      quarter: 1,
      monthsLabel: "Jan – Mar",
      qStartIso: `${year}-01-01`,
      qEndIso: `${year}-03-31`,
      dYear: year,
      dMonth: 4,
      monthName: "avril",
    },
    {
      quarter: 2,
      monthsLabel: "Avr – Juin",
      qStartIso: `${year}-04-01`,
      qEndIso: `${year}-06-30`,
      dYear: year,
      dMonth: 7,
      monthName: "juillet",
    },
    {
      quarter: 3,
      monthsLabel: "Juil – Sep",
      qStartIso: `${year}-07-01`,
      qEndIso: `${year}-09-30`,
      dYear: year,
      dMonth: 10,
      monthName: "octobre",
    },
    {
      quarter: 4,
      monthsLabel: "Oct – Déc",
      qStartIso: `${year}-10-01`,
      qEndIso: `${year}-12-31`,
      dYear: year + 1,
      dMonth: 1,
      monthName: "janvier",
    },
  ]

  return defs.map((def) => {
    const deadlineIso = `${def.dYear}-${String(def.dMonth).padStart(2, "0")}-25`
    const deadlineDate = new Date(Date.UTC(def.dYear, def.dMonth - 1, 25, 12, 0, 0))
    const dow = deadlineDate.getUTCDay()
    const isWeekend = dow === 0 || dow === 6
    const fridayDay = dow === 6 ? 24 : 23
    const effectiveDeadlineNote = isWeekend
      ? `Le 25 tombe un ${dow === 6 ? "samedi" : "dimanche"} : sans report (nouvelle chaîne TVA), déposer & payer au plus tard le vendredi ${fridayDay} ${def.monthName}.`
      : "Échéance ferme au 25 (dépôt Intervat + paiement TVA)."

    let state: QuarterScheduleItem["state"] = "upcoming"
    if (todayIso > deadlineIso) {
      state = "past"
    } else if (todayIso > def.qEndIso && todayIso <= deadlineIso) {
      state = "due_now"
    } else if (todayIso >= def.qStartIso && todayIso <= def.qEndIso) {
      state = "current"
    }

    return {
      quarter: def.quarter,
      label: `T${def.quarter} ${year}`,
      monthsLabel: def.monthsLabel,
      deadlineIso,
      deadlineLabel: `25 ${def.monthName} ${def.dYear}`,
      isWeekend,
      effectiveDeadlineNote,
      state,
    }
  })
}

export interface ExpenseIntervatImpact {
  grid82: number
  grid83: number
  grid87: number
  grid88: number
  grid55: number
  grid56: number
  grid59: number
  netVatEffect: number
  taxDeductibleAmount: number
}

/**
 * Calcule de manière pure et déterministe l'impact exact d'une dépense sur les grilles Intervat belges et l'IPP.
 */
export function computeExpenseIntervatImpact(input: {
  amount_htva: number
  vat_paid_be: number
  vat_deductible_pct: number
  tax_deductible_pct: number
  is_reverse_charge: boolean
  is_investment: boolean
  supplier_country: string
  category: string
}): ExpenseIntervatImpact {
  const htvaCents = Math.round(Number(input.amount_htva || 0) * 100)
  const vatPaidBeCents = Math.round(Number(input.vat_paid_be || 0) * 100)
  const vatDedRatio = Math.max(0, Math.min(100, Number(input.vat_deductible_pct ?? 100))) / 100
  const taxDedRatio = Math.max(0, Math.min(100, Number(input.tax_deductible_pct ?? 100))) / 100

  if (input.category === "social_contributions") {
    return {
      grid82: 0,
      grid83: 0,
      grid87: 0,
      grid88: 0,
      grid55: 0,
      grid56: 0,
      grid59: 0,
      netVatEffect: 0,
      taxDeductibleAmount: round2((htvaCents * taxDedRatio) / 100),
    }
  }

  const grid83Cents = input.is_investment ? htvaCents : 0
  const grid82Cents = input.is_investment ? 0 : htvaCents

  let grid87Cents = 0
  let grid88Cents = 0
  let grid55Cents = 0
  let grid56Cents = 0
  let grid59Cents = 0

  if (input.is_reverse_charge) {
    const rcVatCents = Math.round(htvaCents * 0.21)
    if (input.supplier_country === "EU") {
      grid88Cents = htvaCents
      grid55Cents = rcVatCents
    } else if (input.supplier_country === "NON_EU") {
      grid87Cents = htvaCents
      grid56Cents = rcVatCents
    }
    grid59Cents = Math.round(rcVatCents * vatDedRatio)
  } else if (vatPaidBeCents > 0) {
    grid59Cents = Math.round(vatPaidBeCents * vatDedRatio)
  }

  const netVatCents = grid55Cents + grid56Cents - grid59Cents
  const nonDedBeVatCents = input.is_reverse_charge
    ? 0
    : Math.max(0, vatPaidBeCents - grid59Cents)
  const taxDeductibleCents = Math.round((htvaCents + nonDedBeVatCents) * taxDedRatio)

  return {
    grid82: round2(grid82Cents / 100),
    grid83: round2(grid83Cents / 100),
    grid87: round2(grid87Cents / 100),
    grid88: round2(grid88Cents / 100),
    grid55: round2(grid55Cents / 100),
    grid56: round2(grid56Cents / 100),
    grid59: round2(grid59Cents / 100),
    netVatEffect: round2(netVatCents / 100),
    taxDeductibleAmount: round2(taxDeductibleCents / 100),
  }
}

function computeAnnualStudentSocialAndIpp(netProfitEur: number): {
  socialEur: number
  ippEur: number
} {
  const safeNet = Math.max(0, netProfitEur)
  let socialEur = 0
  if (safeNet >= STUDENT_TAX_THRESHOLDS_2026.principalSwitchMinNet) {
    socialEur = round2(safeNet * STUDENT_TAX_THRESHOLDS_2026.socialRate)
  } else if (safeNet > STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet) {
    socialEur = round2(
      (safeNet - STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet) *
        STUDENT_TAX_THRESHOLDS_2026.socialRate
    )
  }

  const ippTaxableBase = Math.max(0, safeNet - socialEur)
  let ippEur = 0
  if (ippTaxableBase > STUDENT_TAX_THRESHOLDS_2026.ippExemptMaxNet) {
    const firstSliceLimit = 16320
    const slice1 = Math.max(
      0,
      Math.min(ippTaxableBase, firstSliceLimit) - STUDENT_TAX_THRESHOLDS_2026.ippExemptMaxNet
    )
    const slice2 = Math.max(0, ippTaxableBase - firstSliceLimit)
    ippEur = round2(slice1 * 0.25 + slice2 * 0.4)
  }

  return { socialEur, ippEur }
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

  // Calcul annuel complet pour les seuils légaux Étudiant-Indépendant (sur toute l'année civile)
  let annualSalesHtvaCents = 0
  for (const inv of invoices) {
    if (inv.status === "cancelled" || !isDateInPeriod(inv.issued_at, year, 0)) continue
    const htvaCents = Math.round(Number(inv.amount_htva || 0) * 100)
    annualSalesHtvaCents += inv.invoice_type === "credit_note" ? -Math.abs(htvaCents) : htvaCents
  }
  annualSalesHtvaCents = Math.max(0, annualSalesHtvaCents)

  let annualTaxDeductibleCents = 0
  for (const exp of expenses) {
    if (!isDateInPeriod(exp.expense_date, year, 0)) continue
    const htvaCents = Math.round(Number(exp.amount_htva || 0) * 100)
    const vatPaidBeCents = Math.round(Number(exp.vat_paid_be || 0) * 100)
    const vatDedRatio = Math.max(0, Math.min(100, Number(exp.vat_deductible_pct ?? 100))) / 100
    const taxDedRatio = Math.max(0, Math.min(100, Number(exp.tax_deductible_pct ?? 100))) / 100
    const nonDedBeVat = exp.is_reverse_charge
      ? 0
      : vatPaidBeCents - Math.round(vatPaidBeCents * vatDedRatio)
    annualTaxDeductibleCents += Math.round((htvaCents + Math.max(0, nonDedBeVat)) * taxDedRatio)
  }

  const annualSalesHtvaEur = round2(annualSalesHtvaCents / 100)
  const annualNetProfitCents = Math.max(0, annualSalesHtvaCents - annualTaxDeductibleCents)
  const annualNetProfitEur = round2(annualNetProfitCents / 100)

  // Cotisations sociales & IPP Étudiant-Indépendant 2026 (avec calcul différentiel exact)
  const { socialEur: annualSocialEur, ippEur: annualIppEur } =
    computeAnnualStudentSocialAndIpp(annualNetProfitEur)
  const { socialEur: noExpenseSocialEur, ippEur: noExpenseIppEur } =
    computeAnnualStudentSocialAndIpp(annualSalesHtvaEur)

  let bracket: StudentStatusSummary["bracket"] = "exempt_0"
  let statusLabel = "Exonéré à 0 € (sous 8 687,03 € net/an)"
  let familyAllowancesRule = "Maintien automatique à 100 % des allocations familiales (aucune limite d'heures)."

  if (annualNetProfitEur >= STUDENT_TAX_THRESHOLDS_2026.principalSwitchMinNet) {
    bracket = "principal"
    statusLabel = "Bascule Indépendant Principal (>= 17 374,08 €)"
    familyAllowancesRule = "Attention : dépassement du plafond 17 374,08 € → perte des allocations familiales et cotisation principale."
  } else if (annualNetProfitEur > STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet) {
    bracket = "reduced_tranche"
    statusLabel = "Cotisation réduite (20,5 % sur la tranche > 8 687,03 €)"
    familyAllowancesRule = "Maintien des allocations familiales si tu ne dépasses pas 240 h/trimestre (attestation sur l'honneur)."
  }

  // Ventilation sur la période affichée (0 € tant que le cumul annuel reste sous les seuils !)
  const periodRatio =
    quarter === 0
      ? 1
      : annualNetProfitCents > 0
        ? Math.min(1, netTaxableProfitCents / annualNetProfitCents)
        : 0

  const estimatedSocialCents = Math.round(annualSocialEur * periodRatio * 100)
  const estimatedIppCents = Math.round(annualIppEur * periodRatio * 100)

  const annualTotalSavedEur = Math.max(
    0,
    noExpenseSocialEur + noExpenseIppEur - (annualSocialEur + annualIppEur)
  )
  const expenseRatio =
    quarter === 0
      ? 1
      : annualTaxDeductibleCents > 0
        ? Math.min(1, totalTaxDeductibleCents / annualTaxDeductibleCents)
        : 0
  const estimatedTaxSavedByExpensesCents = Math.round(
    annualTotalSavedEur * expenseRatio * 100
  )

  const totalReserveCents = grid71Cents + estimatedSocialCents + estimatedIppCents
  const cashBeforeReserveCents = Math.max(0, totalSalesTtcCents - totalExpensesHtvaCents)
  const netCashInPocketCents = Math.max(0, cashBeforeReserveCents - totalReserveCents)

  const studentStatus: StudentStatusSummary = {
    annualSalesHtva: round2(annualSalesHtvaCents / 100),
    annualExpensesDeductible: round2(annualTaxDeductibleCents / 100),
    annualNetProfit: annualNetProfitEur,
    annualSocialDue: annualSocialEur,
    annualIppDue: annualIppEur,
    remainingBeforeSocial: round2(
      Math.max(0, STUDENT_TAX_THRESHOLDS_2026.socialExemptMaxNet - annualNetProfitEur)
    ),
    remainingBeforeIpp: round2(
      Math.max(0, STUDENT_TAX_THRESHOLDS_2026.ippExemptMaxNet - annualNetProfitEur)
    ),
    remainingBeforeParentChargeLoss: round2(
      Math.max(0, STUDENT_TAX_THRESHOLDS_2026.parentChargeMaxNet - annualNetProfitEur)
    ),
    remainingBeforePrincipalSwitch: round2(
      Math.max(0, STUDENT_TAX_THRESHOLDS_2026.principalSwitchMinNet - 0.01 - annualNetProfitEur)
    ),
    bracket,
    statusLabel,
    parentChargeSafe: annualNetProfitEur <= STUDENT_TAX_THRESHOLDS_2026.parentChargeMaxNet,
    familyAllowancesRule,
  }

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
    studentStatus,
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
      ? `25 avril ${year}`
      : effectiveQ === 2
        ? `25 juillet ${year}`
        : effectiveQ === 3
          ? `25 octobre ${year}`
          : `25 janvier ${year + 1}`

  return [
    {
      id: "m_mollie_invoice",
      cadence: "monthly",
      title: "Synchroniser les factures mensuelles de frais Mollie (API exacte)",
      whenLabel: "Le 2 de chaque mois (1 clic)",
      whereLabel: "Onglet Factures d'achats → Bouton « Sync factures Mollie »",
      whereUrl: "https://my.mollie.com/dashboard",
      howTo:
        "Clique sur « Sync factures Mollie » (ou glisse le PDF Mollie dans le Drag & Drop). Mollie B.V. (Pays-Bas) est traité en autoliquidation UE ([82]/[88]/[55]/[59]). Vérifie que BE 1039.899.980 est bien encodé dans Mollie Dashboard.",
    },
    {
      id: "m_ads_invoices",
      cadence: "monthly",
      title: "Déposer les factures Meta Ads, Google Ads & SaaS (Vercel/Supabase/Resend/Infomaniak)",
      whenLabel: "Le 5 de chaque mois (2 min)",
      whereLabel: "Meta Ads → Activité de paiement → Télécharger PDF mensuel consolidé",
      whereUrl: "https://adsmanager.facebook.com/billing_hub/payment_settings",
      howTo:
        "Ignore les reçus quotidiens de 18 € (« Ceci n'est pas une facture ») : télécharge 1 fois par mois le relevé/factures consolidées dans Meta Ads, puis glisse tous tes PDF (Meta, Vercel, Supabase, Resend, Infomaniak) dans le Drag & Drop ou transfère-les par mail.",
    },
    {
      id: "m_peppol_sync",
      cadence: "monthly",
      title: "Envoyer les factures clients B2B sur Peppol (via Odoo Gratuit)",
      whenLabel: "En continu ou le 5 du mois",
      whereLabel: "Onglet Ventes & Peppol → Télécharger lot Peppol (.zip)",
      howTo:
        "Télécharge en 1 clic l'archive .zip des XML Peppol UBL 2.1 du trimestre, importe-les dans ton portail Odoo Facturation gratuit pour les expédier sur Peppol, puis clique sur « Marquer lot envoyé Peppol ».",
    },
    {
      id: "q_vat_intervat",
      cadence: "quarterly",
      title: `Déposer la déclaration TVA trimestrielle sur Intervat (T${effectiveQ} ${year})`,
      whenLabel: `Au plus tard le ${vatDeadline} (sans report week-end)`,
      whereLabel: "MyMinfin / Intervat (SPF Finances)",
      whereUrl: "https://finances.belgium.be/fr/E-services/Intervat",
      howTo:
        "Connecte-toi avec itsme sur Intervat, ouvre l'onglet « Déclarer (TVA & Calendrier) » ici, et recopie simplement les montants des grilles [03], [82], [83], [87], [88], [54], [55], [56], [59] et [71]/[72]. Attention : si le 25 tombe un week-end, dépose le vendredi précédent.",
    },
    {
      id: "q_vat_payment",
      cadence: "quarterly",
      title: `Payer le solde TVA (Grille [71]) au SPF Finances`,
      whenLabel: `Au plus tard le ${vatDeadline} (sans report week-end)`,
      whereLabel: "Communication structurée reçue sur Intervat après dépôt",
      howTo:
        "Paie depuis ton compte pro (ou réserve fiscale) en utilisant exactement la communication structurée générée par Intervat après soumission.",
    },
    {
      id: "q_social_and_va",
      cadence: "quarterly",
      title: "Étudiant-Indépendant : Demander la dispense/réduction de cotisations sociales (si < 8 687,03 €)",
      whenLabel: "À la réception du courrier trimestriel (~102,55 €)",
      whereLabel: "Portail Caisse d'assurances sociales (Partena / Xerius / UCM / Acerta)",
      whereUrl: "https://www.minfin.fgov.be",
      howTo:
        "Tant que ton bénéfice net annuel estimé reste sous 8 687,03 €, tu as le droit de demander l'exonération de la cotisation provisoire (~102,55 €/trim.) pour payer 0 €. Si tu es sous 11 180 € net/an, tu n'as aucun versement anticipé d'impôt (IPP = 0 €) à faire.",
    },
    {
      id: "a_client_listing",
      cadence: "annual",
      title: `Déposer le Listing Annuel des Clients Assujettis (> 250 € HTVA)`,
      whenLabel: `Avant le 31 mars ${year + 1} (2 min)`,
      whereLabel: "Intervat → Listing clients annuel",
      whereUrl: "https://finances.belgium.be/fr/E-services/Intervat",
      howTo:
        "Clique sur « Exporter CSV » dans la section Listing Clients TVA : Aegis isole automatiquement tous les installateurs belges facturés pour plus de 250 € HTVA sur l'année avec leur n° BE.",
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

/**
 * Construit un dossier d'audit complet prêt à coller dans le chat Antigravity
 * pour vérification humaine / LLM avant validation définitive dans le journal des achats.
 */
export function buildChatAuditMarkdown(
  drafts: AccountingExpenseDraftRecord[],
  year: number,
  quarter: 0 | 1 | 2 | 3 | 4
): string {
  const { periodLabel } = getPeriodDeadlineLabel(year, quarter)
  const lines: string[] = [
    `# Audit Comptable INIT42 (${LEGAL_ENTITY.vat}) — ${periodLabel}`,
    ``,
    `Voici ${drafts.length} facture(s)/document(s) en attente de vérification avant comptabilisation définitive.`,
    `**Contexte fiscal :** Entreprise individuelle / Étudiant-Indépendant en Belgique (Liège), assujetti TVA trimestriel.`,
    `Codes NACE autorisés : ${INIT42_NACE_CODES.map((n) => n.code).join(", ")}.`,
    ``,
    `## Ce que je te demande de vérifier sur chaque ligne :`,
    `1. Est-ce bien une **facture fiscale valide** (et NON un reçu de carte type « Ceci n'est pas une facture ») ?`,
    `2. La zone fournisseur & le régime TVA sont-ils exacts : **BE** (TVA belge récupérable), **EU** (Autoliquidation \`[88]\`+\`[55]\`+\`[59]\` : Meta Ads IE, Mollie NL, Google IE), ou **NON_EU** (Autoliquidation \`[87]\`+\`[56]\`+\`[59]\` : Vercel US, Supabase US, Resend US, Infomaniak Suisse CH) ?`,
    `3. La conversion de devise (USD/CHF → EUR) et le montant HTVA sont-ils cohérents ?`,
    `4. Le code NACE, le seuil d'investissement (> 1 000 € HTVA → \`[83]\`), le mode de paiement (\`pro_account\` vs \`personal_card\` Revolut) et d'éventuels doublons sont-ils corrects ?`,
    ``,
    `> **Format de réponse attendu pour ré-import en 1 clic dans Aegis :**`,
    `> Donne ton analyse lisible puis termine par un bloc \`\`\`json contenant un tableau d'actions :`,
    `> \`[{ "draft_id": "...", "action": "approve" | "update" | "reject", "reason": "...", "updates": { "supplier_country": "...", "is_reverse_charge": true, "amount_htva": 0, ... } }]\``,
    ``,
    `---`,
    ``,
  ]

  for (let i = 0; i < drafts.length; i += 1) {
    const d = drafts[i]
    const impact = computeExpenseIntervatImpact({
      amount_htva: d.amount_htva,
      vat_paid_be: d.vat_paid_be,
      vat_deductible_pct: d.vat_deductible_pct,
      tax_deductible_pct: d.tax_deductible_pct,
      is_reverse_charge: d.is_reverse_charge,
      is_investment: d.is_investment,
      supplier_country: d.supplier_country,
      category: d.category,
    })
    const activeGrids = [
      impact.grid82 > 0 ? `[82]=${impact.grid82.toFixed(2)}€` : null,
      impact.grid83 > 0 ? `[83]=${impact.grid83.toFixed(2)}€` : null,
      impact.grid87 > 0 ? `[87]=${impact.grid87.toFixed(2)}€` : null,
      impact.grid88 > 0 ? `[88]=${impact.grid88.toFixed(2)}€` : null,
      impact.grid55 > 0 ? `[55]=+${impact.grid55.toFixed(2)}€` : null,
      impact.grid56 > 0 ? `[56]=+${impact.grid56.toFixed(2)}€` : null,
      impact.grid59 > 0 ? `[59]=-${impact.grid59.toFixed(2)}€` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    const rawItems = Array.isArray(d.ai_raw_extraction?.line_items)
      ? (d.ai_raw_extraction.line_items as Array<Record<string, unknown>>)
      : []

    lines.push(`### ${i + 1}. ${d.supplier_name} — ${d.amount_htva.toFixed(2)} € HTVA`)
    lines.push(`- **draft_id :** \`${d.id}\``)
    lines.push(`- **Fichier / Source :** ${d.document_filename || "Sans fichier"} (\`${d.source}\`)`)
    lines.push(`- **Date :** ${d.expense_date} · **Réf :** ${d.invoice_ref || "Non détectée"}`)
    lines.push(
      `- **Fournisseur :** ${d.supplier_name} · **Pays TVA :** \`${d.supplier_country}\` · **N° TVA :** ${d.supplier_vat_number || "Absent"}`
    )
    lines.push(
      `- **Montant origine :** ${d.original_amount_htva.toFixed(2)} ${d.original_currency} HTVA (TVA orig. ${d.original_vat_amount.toFixed(2)} ${d.original_currency}, TTC ${d.original_amount_ttc.toFixed(2)} ${d.original_currency}) · **Taux :** ${d.exchange_rate} (${d.exchange_rate_source || "1:1"})`
    )
    lines.push(
      `- **Comptabilisation EUR proposée :** HTVA **${d.amount_htva.toFixed(2)} €** · TVA BE payée **${d.vat_paid_be.toFixed(2)} €** · Autoliquidation **${d.is_reverse_charge ? "OUI" : "NON"}** · Investissement **${d.is_investment ? "OUI [83]" : "NON [82]"}**`
    )
    lines.push(
      `- **Grilles Intervat :** ${activeGrids || "Hors TVA"} · **Déduct. TVA :** ${d.vat_deductible_pct}% · **Déduct. IPP :** ${d.tax_deductible_pct}% (${impact.taxDeductibleAmount.toFixed(2)} €) · **NACE :** ${d.nace_code}`
    )
    lines.push(
      `- **Paiement :** \`${d.payment_source}\` · **Facture fiscale valide :** ${d.is_valid_tax_invoice ? "Oui" : "NON"} · **TVA BE1039899980 présente :** ${d.client_vat_present ? "Oui" : "NON"}`
    )
    if (d.ai_warnings.length > 0) {
      lines.push(
        `- **Alertes détectées :** ${d.ai_warnings.map((w) => `[${w.severity.toUpperCase()} ${w.code}] ${w.message}`).join(" ; ")}`
      )
    }
    if (rawItems.length > 0) {
      const summaryItems = rawItems
        .slice(0, 5)
        .map((it) => `${String(it.description || "Ligne")} (${String(it.amount ?? "")})`)
        .join(" ; ")
      lines.push(`- **Lignes lues :** ${summaryItems}`)
    }
    lines.push(``)
  }

  return lines.join("\n")
}
