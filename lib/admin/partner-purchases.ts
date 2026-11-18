import { calculateOrderFinancials } from "@/lib/credit-pricing"

export type PurchasePaymentMode = "direct_mollie" | "credits" | "free_assigned"

export type PipelineStatusKey =
  | "to_contact"
  | "contacted"
  | "meeting_scheduled"
  | "quote_sent"
  | "won"
  | "lost"

export type PipelineCounts = Record<PipelineStatusKey, number>

export const PIPELINE_STATUS_ORDER: PipelineStatusKey[] = [
  "to_contact",
  "contacted",
  "meeting_scheduled",
  "quote_sent",
  "won",
  "lost",
]

export const PIPELINE_STATUS_META: Record<
  PipelineStatusKey,
  {
    label: string
    shortLabel: string
    badgeClass: string
    activeFilterClass: string
    dotClass: string
  }
> = {
  to_contact: {
    label: "À contacter",
    shortLabel: "À contacter",
    badgeClass: "bg-status-review/10 text-status-review border-status-review/25",
    activeFilterClass: "bg-status-review text-primary-foreground border-status-review",
    dotClass: "bg-status-review",
  },
  contacted: {
    label: "Contacté",
    shortLabel: "Contacté",
    badgeClass: "bg-status-new/10 text-status-new border-status-new/25",
    activeFilterClass: "bg-status-new text-accent-foreground border-status-new",
    dotClass: "bg-status-new",
  },
  meeting_scheduled: {
    label: "RDV fixé",
    shortLabel: "RDV",
    badgeClass: "bg-chart-5/10 text-chart-5 border-chart-5/25",
    activeFilterClass: "bg-chart-5 text-accent-foreground border-chart-5",
    dotClass: "bg-chart-5",
  },
  quote_sent: {
    label: "Devis envoyé",
    shortLabel: "Devis",
    badgeClass: "bg-accent-solar/15 text-foreground border-accent-solar/40",
    activeFilterClass: "bg-accent-solar text-accent-solar-foreground border-accent-solar",
    dotClass: "bg-accent-solar",
  },
  won: {
    label: "Gagné / Signé",
    shortLabel: "Gagné",
    badgeClass: "bg-status-converted/10 text-status-converted border-status-converted/25",
    activeFilterClass: "bg-status-converted text-accent-foreground border-status-converted",
    dotClass: "bg-status-converted",
  },
  lost: {
    label: "Perdu",
    shortLabel: "Perdu",
    badgeClass: "bg-status-disputed/10 text-status-disputed border-status-disputed/25",
    activeFilterClass: "bg-status-disputed text-destructive-foreground border-status-disputed",
    dotClass: "bg-status-disputed",
  },
}

const VALID_PIPELINE_SET = new Set<string>(PIPELINE_STATUS_ORDER)

export function normalizePipelineStatus(
  status: string | null | undefined
): PipelineStatusKey {
  if (status && VALID_PIPELINE_SET.has(status)) {
    return status as PipelineStatusKey
  }
  return "to_contact"
}

export function createEmptyPipelineCounts(): PipelineCounts {
  return {
    to_contact: 0,
    contacted: 0,
    meeting_scheduled: 0,
    quote_sent: 0,
    won: 0,
    lost: 0,
  }
}

export interface PartnerPurchaseLeadItem {
  purchaseId: string
  leadId: string
  purchasedAt: string
  crmUpdatedAt: string | null
  creditsSpent: number
  amountHtva: number
  amountTtc: number
  paymentMode: PurchasePaymentMode
  paymentMethod: string | null
  molliePaymentId: string | null
  pipelineStatus: PipelineStatusKey
  notes: string | null
  dispute: {
    id: string
    status: string
    reason: string
    creditsRefunded: number | null
    createdAt: string
    resolvedAt: string | null
  } | null
  lead: {
    id: string
    firstName: string | null
    lastName: string | null
    company: string | null
    email: string | null
    phone: string | null
    segment: string | null
    province: string | null
    city: string | null
    postalCode: string | null
    surfaceType: string | null
    surfaceArea: number | null
    estimatedPowerKwc: number | null
    annualElectricityBill: number | null
    leadScore: number | null
    pricingVersion: string | null
    createdAt: string | null
  } | null
}

export interface PartnerPurchasesSummary {
  totalLeadsPurchased: number
  activeLeadsCount: number
  refundedCount: number
  totalCreditsSpent: number
  creditsDebitedCount: number
  totalAmountHtva: number
  totalAmountTtc: number
  directMollieCount: number
  directMollieHtva: number
  creditPurchasesCount: number
  freeAssignedCount: number
  b2bCount: number
  b2cCount: number
  totalOrdersPaidHtva: number
  totalOrdersPaidTtc: number
  totalCreditsOrdered: number
  firstPurchaseAt: string | null
  lastPurchaseAt: string | null
  pipelineCounts: PipelineCounts
}

export interface PartnerPurchasesResponse {
  partner: {
    id: string
    company_name: string
    email: string
    phone: string | null
    credits: number
    segment: string | null
    target_provinces: string[] | null
    created_at: string
    is_test: boolean
  }
  summary: PartnerPurchasesSummary
  purchases: PartnerPurchaseLeadItem[]
}

export interface AdminPartnerPurchaseCrmItem {
  purchase_id: string
  lead_id: string
  lead_label: string
  segment: string | null
  province: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  purchased_at: string
  crm_updated_at: string | null
  pipeline_status: PipelineStatusKey
  credits_spent: number
  amount_htva: number
  amount_ttc: number
  payment_mode: PurchasePaymentMode
  dispute_status: string | null
  dispute_reason: string | null
}

export interface AdminPartnerPurchaseSummary {
  id: string
  company_name: string
  email: string
  phone: string | null
  credits: number
  segment: string | null
  target_provinces: string[] | null
  created_at: string
  is_test: boolean
  leads_purchased_count: number
  active_leads_count: number
  refunded_leads_count: number
  total_credits_spent: number
  total_euros_htva: number
  total_euros_ttc: number
  first_purchase_at: string | null
  last_purchase_at: string | null
  pipeline_counts: PipelineCounts
  pipeline_updated_count: number
  purchases: AdminPartnerPurchaseCrmItem[]
  last_purchase: {
    purchase_id: string
    lead_id: string
    lead_label: string
    segment: string | null
    province: string | null
    city: string | null
    purchased_at: string
    credits_spent: number
    amount_htva: number
    amount_ttc: number
    payment_mode: PurchasePaymentMode
    pipeline_status: PipelineStatusKey
  } | null
}

const V2_ROLLOUT_ISO = "2026-10-28T00:00:00.000Z"

export function computeLeadPurchaseFinancials(input: {
  creditsSpent: number | null | undefined
  notes?: string | null
  purchasedAt?: string | null
  leadPricingVersion?: string | null
  mollieAuditDetails?: Record<string, unknown> | null
}): {
  paymentMode: PurchasePaymentMode
  amountHtva: number
  amountTtc: number
  paymentMethod: string | null
  molliePaymentId: string | null
} {
  const credits = Math.max(0, Number(input.creditsSpent ?? 0))
  const notes = input.notes || ""
  const audit = input.mollieAuditDetails || null

  // 1. Achat direct en euros via Mollie (audit_log ou notes structurées)
  const isDirectMollie =
    Boolean(audit) ||
    /Achat direct en euros\s*\(Mollie:/i.test(notes)

  if (isDirectMollie) {
    let amountHtva = audit?.price_htva !== undefined ? Number(audit.price_htva) : NaN
    let amountTtc = audit?.price_ttc !== undefined ? Number(audit.price_ttc) : NaN
    let paymentMethod =
      typeof audit?.method === "string" ? audit.method : null
    let molliePaymentId =
      typeof audit?.mollie_payment_id === "string" ? audit.mollie_payment_id : null

    if (!molliePaymentId && notes) {
      const idMatch = notes.match(/Mollie:\s*([a-zA-Z0-9_-]+)/i)
      if (idMatch) molliePaymentId = idMatch[1]
    }
    if (Number.isNaN(amountHtva) && notes) {
      const eurMatch = notes.match(/(\d+(?:[.,]\d+)?)\s*€\s*HTVA/i)
      if (eurMatch) amountHtva = Number(eurMatch[1].replace(",", "."))
    }
    if (!paymentMethod && notes) {
      const methodMatch = notes.match(/€\s*HTVA\s*\(([^)]+)\)/i)
      if (methodMatch) paymentMethod = methodMatch[1]
    }

    if (Number.isNaN(amountHtva)) {
      const fallback = calculateOrderFinancials(credits > 0 ? credits : 3)
      amountHtva = fallback.priceHtva
      amountTtc = fallback.priceTtc
    } else if (Number.isNaN(amountTtc)) {
      amountTtc = Number((amountHtva * 1.21).toFixed(2))
    }

    return {
      paymentMode: "direct_mollie",
      amountHtva: Number(amountHtva.toFixed(2)),
      amountTtc: Number(amountTtc.toFixed(2)),
      paymentMethod,
      molliePaymentId,
    }
  }

  // 2. Attribution gratuite par l'admin (0 crédit débité)
  if (credits <= 0) {
    return {
      paymentMode: "free_assigned",
      amountHtva: 0,
      amountTtc: 0,
      paymentMethod: null,
      molliePaymentId: null,
    }
  }

  // 3. Achat par crédits (V1 = 11,50 €/cr., V2 = 29,50 €/3 cr.)
  const isLegacyV1 =
    input.leadPricingVersion === "v1" ||
    (!input.leadPricingVersion &&
      Boolean(input.purchasedAt) &&
      input.purchasedAt! < V2_ROLLOUT_ISO &&
      (credits === 2 || credits === 5))

  if (isLegacyV1) {
    const amountHtva = Number((credits * 11.5).toFixed(2))
    const amountTtc = Number((amountHtva * 1.21).toFixed(2))
    return {
      paymentMode: "credits",
      amountHtva,
      amountTtc,
      paymentMethod: null,
      molliePaymentId: null,
    }
  }

  const fin = calculateOrderFinancials(credits)
  return {
    paymentMode: "credits",
    amountHtva: fin.priceHtva,
    amountTtc: fin.priceTtc,
    paymentMethod: null,
    molliePaymentId: null,
  }
}

export function formatLeadPurchaseLabel(lead: {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  firstName?: string | null
  lastName?: string | null
} | null | undefined): string {
  if (!lead) return "Lead supprimé ou archivé"
  const first = (lead.first_name ?? lead.firstName ?? "").trim()
  const last = (lead.last_name ?? lead.lastName ?? "").trim()
  const company = (lead.company ?? "").trim()
  const fullName = `${first} ${last}`.trim()

  if (company && fullName) return `${company} (${fullName})`
  if (company) return company
  if (fullName) return fullName
  return "Prospect sans nom"
}

export function isTestPartnerAccount(partner: {
  is_test?: boolean | null
  email?: string | null
  company_name?: string | null
}): boolean {
  if (partner.is_test) return true
  const email = (partner.email || "").toLowerCase().trim()
  const name = (partner.company_name || "").toLowerCase().trim()
  return (
    email === "mrnathanrem@gmail.com" ||
    email === "fabrice.remacle@gmail.com" ||
    email.includes("@aegissolaire-pro.be") ||
    name.includes("test") ||
    name.includes("mega solar") ||
    name.includes("sogreen") ||
    name.includes("enersol") ||
    name.includes("high tech solar") ||
    name.includes("solena") ||
    name.includes("belga solar") ||
    name.includes("aitex")
  )
}
