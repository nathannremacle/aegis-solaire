import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyBelgianCompanyCbe } from "@/lib/lead-verification-engine"
import {
  computeIntervatDeclaration,
  getQuarterCalendarSchedule,
  getRoutineTasksForPeriod,
  round2,
  type AccountingExpenseDraftRecord,
  type AccountingExpenseRecord,
  type DraftWarning,
  type IntervatSummary,
  type QuarterScheduleItem,
  type RoutineTask,
  type UnifiedInvoiceRecord,
} from "@/lib/accounting/belgian-tax-rules"
import { isPeppolLegalAddressConfigured } from "@/lib/accounting/ubl-peppol-generator"
import {
  computeLeadPurchaseFinancials,
  isTestPartnerAccount,
} from "@/lib/admin/partner-purchases"

export function formatBelgianVat(raw?: string | null): {
  bceDigits: string | null
  vatFormatted: string | null
} {
  if (!raw) return { bceDigits: null, vatFormatted: null }
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 9 && digits.length !== 10) {
    return { bceDigits: null, vatFormatted: null }
  }
  const padded = digits.padStart(10, "0")
  if (!/^[01]\d{9}$/.test(padded)) {
    return { bceDigits: null, vatFormatted: null }
  }
  const vatFormatted = `BE ${padded.slice(0, 4)}.${padded.slice(4, 7)}.${padded.slice(7, 10)}`
  return { bceDigits: padded, vatFormatted }
}

function extractStreetFromFullAddress(
  fullAddress?: string | null,
  postalCode?: string | null,
  city?: string | null
): string | null {
  if (!fullAddress) return null
  let street = fullAddress.trim()
  if (postalCode && city) {
    const tail = `${postalCode} ${city}`.trim()
    if (street.endsWith(tail)) {
      street = street.slice(0, street.length - tail.length).replace(/[,\s]+$/, "")
    }
  }
  return street || fullAddress.trim()
}

type PartnerBillingSnapshot = {
  id: string
  company_name: string
  email: string
  is_test?: boolean | null
  bce_number?: string | null
  vat_number?: string | null
  legal_name?: string | null
  billing_street?: string | null
  billing_postal_code?: string | null
  billing_city?: string | null
  billing_country?: string | null
}

async function fetchPartnerBillingSnapshot(
  supabase: ReturnType<typeof createServiceRoleClient>,
  partnerId: string
): Promise<PartnerBillingSnapshot | null> {
  const richRes = await supabase
    .from("partners")
    .select(
      "id, company_name, email, is_test, bce_number, vat_number, legal_name, billing_street, billing_postal_code, billing_city, billing_country"
    )
    .eq("id", partnerId)
    .maybeSingle()

  if (!richRes.error && richRes.data) {
    return richRes.data as PartnerBillingSnapshot
  }

  // Fallback si les nouvelles colonnes légales ne sont pas encore migrées en base
  const basicRes = await supabase
    .from("partners")
    .select("id, company_name, email, is_test")
    .eq("id", partnerId)
    .maybeSingle()

  if (basicRes.error || !basicRes.data) return null
  return basicRes.data as PartnerBillingSnapshot
}

/**
 * Enrichit automatiquement un partenaire avec son n° BCE/TVA (depuis installer_applications)
 * et son adresse officielle de siège social (via cbeapi.be et CBE_API_KEY).
 */
export async function enrichPartnerBceData(
  partnerId: string,
  explicitBceOrVat?: string | null
): Promise<{
  updated: boolean
  bceNumber: string | null
  vatNumber: string | null
  legalName: string | null
  error?: string
}> {
  const supabase = createServiceRoleClient()
  const partner = await fetchPartnerBillingSnapshot(supabase, partnerId)
  if (!partner) {
    return { updated: false, bceNumber: null, vatNumber: null, legalName: null, error: "Partenaire introuvable" }
  }

  let candidateBce = explicitBceOrVat || partner.bce_number || partner.vat_number || null

  if (!candidateBce && partner.email) {
    const { data: appRow } = await supabase
      .from("installer_applications")
      .select("siret, company_name")
      .eq("email", partner.email.toLowerCase().trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (appRow?.siret) {
      candidateBce = appRow.siret
    }
  }

  const parsed = formatBelgianVat(candidateBce)
  if (!parsed.bceDigits || !parsed.vatFormatted) {
    return {
      updated: false,
      bceNumber: null,
      vatNumber: null,
      legalName: partner.legal_name || partner.company_name,
      error: "Aucun numéro BCE/TVA belge valide trouvé",
    }
  }

  let officialName = partner.legal_name || partner.company_name
  let street = partner.billing_street || null
  let postalCode = partner.billing_postal_code || null
  let city = partner.billing_city || null

  if (process.env.CBE_API_KEY && (!street || !postalCode || !city || !partner.legal_name)) {
    const cbe = await verifyBelgianCompanyCbe(parsed.bceDigits)
    if (cbe.verified) {
      if (cbe.officialName) officialName = cbe.officialName
      if (cbe.postalCode) postalCode = cbe.postalCode
      if (cbe.city) city = cbe.city
      if (cbe.fullAddress) {
        street = extractStreetFromFullAddress(cbe.fullAddress, cbe.postalCode, cbe.city)
      }
    }
  }

  const updatePayload = {
    bce_number: parsed.bceDigits,
    vat_number: parsed.vatFormatted,
    legal_name: officialName,
    billing_street: street,
    billing_postal_code: postalCode,
    billing_city: city,
    billing_country: "BE",
    peppol_participant_id: `0208:${parsed.bceDigits}`,
  }

  const { error: updateErr } = await supabase
    .from("partners")
    .update(updatePayload)
    .eq("id", partnerId)

  if (updateErr) {
    return {
      updated: false,
      bceNumber: parsed.bceDigits,
      vatNumber: parsed.vatFormatted,
      legalName: officialName,
      error: updateErr.message,
    }
  }

  return {
    updated: true,
    bceNumber: parsed.bceDigits,
    vatNumber: parsed.vatFormatted,
    legalName: officialName,
  }
}

/**
 * Enrichit en masse tous les partenaires réels ayant un numéro BCE manquant ou incomplet.
 */
export async function enrichAllMissingPartnersBce(): Promise<{
  checked: number
  enriched: number
  errors: number
}> {
  const supabase = createServiceRoleClient()
  const { data: partners } = await supabase
    .from("partners")
    .select("id, company_name, email, is_test")
    .order("created_at", { ascending: false })
    .limit(250)

  let checked = 0
  let enriched = 0
  let errors = 0

  for (const p of partners ?? []) {
    if (isTestPartnerAccount(p)) continue
    checked += 1
    const res = await enrichPartnerBceData(p.id)
    if (res.updated) enriched += 1
    else if (res.error && !res.error.includes("Aucun numéro BCE")) errors += 1
  }

  return { checked, enriched, errors }
}

/**
 * Crée ou récupère la facture officielle séquentielle liée à une commande de crédits payée.
 * Résilient : ne jette jamais d'erreur si la migration SQL n'est pas encore déployée.
 */
export async function ensureInvoiceForCreditOrder(orderId: string): Promise<{
  invoiceNumber: string
  invoice: UnifiedInvoiceRecord | null
}> {
  const supabase = createServiceRoleClient()

  try {
    const { data: existing, error: existingErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("credit_order_id", orderId)
      .eq("invoice_type", "invoice")
      .maybeSingle()

    if (!existingErr && existing) {
      return {
        invoiceNumber: existing.invoice_number,
        invoice: {
          ...existing,
          source_kind: "credit_order",
        } as UnifiedInvoiceRecord,
      }
    }

    if (existingErr && existingErr.code === "42P01") {
      // Table invoices absente : repli déterministe sur référence commande
      const { data: order } = await supabase
        .from("credit_orders")
        .select("id, transfer_reference")
        .eq("id", orderId)
        .maybeSingle()
      return {
        invoiceNumber: order?.transfer_reference || `AEGIS-${orderId.slice(0, 8).toUpperCase()}`,
        invoice: null,
      }
    }

    const { data: order, error: orderErr } = await supabase
      .from("credit_orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (orderErr || !order) {
      return { invoiceNumber: `AEGIS-${orderId.slice(0, 8).toUpperCase()}`, invoice: null }
    }

    let partner = await fetchPartnerBillingSnapshot(supabase, order.partner_id)
    if (partner && !partner.vat_number) {
      await enrichPartnerBceData(partner.id).catch(() => null)
      partner = await fetchPartnerBillingSnapshot(supabase, order.partner_id)
    }

    const issuedDate = order.validated_at || order.created_at || new Date().toISOString()
    const fiscalYear = new Date(issuedDate).getFullYear()

    const { data: seqData, error: seqErr } = await supabase.rpc("next_invoice_number", {
      p_type: "invoice",
      p_year: fiscalYear,
    })

    if (seqErr || !seqData?.invoice_number) {
      return {
        invoiceNumber: order.transfer_reference || `AEGIS-${orderId.slice(0, 8).toUpperCase()}`,
        invoice: null,
      }
    }

    const htva = round2(Number(order.price_htva || 0))
    const vat = round2(Number(order.vat_amount ?? htva * 0.21))
    const ttc = round2(Number(order.price_ttc ?? htva + vat))
    const methodLabel =
      order.payment_provider === "mollie"
        ? order.notes?.match(/Méthode:\s*([^|]+)/i)?.[1]?.trim() || "Mollie / Bancontact"
        : "Virement bancaire"

    const { data: inserted, error: insertErr } = await supabase
      .from("invoices")
      .insert({
        invoice_number: seqData.invoice_number,
        invoice_type: "invoice",
        fiscal_year: seqData.fiscal_year,
        sequence_number: seqData.sequence_number,
        partner_id: order.partner_id,
        credit_order_id: order.id,
        client_company_name: partner?.legal_name || partner?.company_name || "Partenaire Installateur",
        client_vat_number: partner?.vat_number || null,
        client_bce_number: partner?.bce_number || null,
        client_street: partner?.billing_street || null,
        client_postal_code: partner?.billing_postal_code || null,
        client_city: partner?.billing_city || null,
        client_country: partner?.billing_country || "BE",
        client_email: partner?.email || null,
        line_description: `${order.pack_name || "Recharge de crédits"} (+${order.credits || 0} crédits marketplace Aegis Solaire)`,
        credits_amount: Number(order.credits || 0),
        amount_htva: htva,
        vat_rate: 21,
        amount_vat: vat,
        amount_ttc: ttc,
        processor_fee_eur: 0,
        payment_method: methodLabel,
        payment_reference: order.payment_id || order.transfer_reference,
        status: "paid",
        peppol_status: partner?.bce_number ? "ready_ubl" : "manual_uploaded",
        issued_at: issuedDate,
        paid_at: issuedDate,
        notes: order.notes || null,
      })
      .select("*")
      .single()

    if (insertErr || !inserted) {
      // Concurrence : vérifier si une autre requête vient de l'insérer
      const { data: retry } = await supabase
        .from("invoices")
        .select("*")
        .eq("credit_order_id", orderId)
        .eq("invoice_type", "invoice")
        .maybeSingle()

      if (retry) {
        return {
          invoiceNumber: retry.invoice_number,
          invoice: { ...retry, source_kind: "credit_order" } as UnifiedInvoiceRecord,
        }
      }
      return {
        invoiceNumber: order.transfer_reference || `AEGIS-${orderId.slice(0, 8).toUpperCase()}`,
        invoice: null,
      }
    }

    return {
      invoiceNumber: inserted.invoice_number,
      invoice: { ...inserted, source_kind: "credit_order" } as UnifiedInvoiceRecord,
    }
  } catch (err) {
    console.warn("[Accounting] ensureInvoiceForCreditOrder fallback:", err)
    return { invoiceNumber: `AEGIS-${orderId.slice(0, 8).toUpperCase()}`, invoice: null }
  }
}

/**
 * Crée ou récupère la facture officielle séquentielle liée à un achat direct de lead via Mollie.
 */
export async function ensureInvoiceForLeadPurchase(params: {
  purchaseId: string
  paymentId?: string | null
  paymentMethod?: string | null
  priceHtva?: number
  vatAmount?: number
  priceTtc?: number
}): Promise<{
  invoiceNumber: string
  invoice: UnifiedInvoiceRecord | null
}> {
  const supabase = createServiceRoleClient()
  const fallbackRef = params.paymentId
    ? `AEGIS-LEAD-${params.paymentId.slice(-8).toUpperCase()}`
    : `AEGIS-LEAD-${params.purchaseId.slice(0, 8).toUpperCase()}`

  try {
    const { data: existing, error: existingErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("lead_purchase_id", params.purchaseId)
      .eq("invoice_type", "invoice")
      .maybeSingle()

    if (!existingErr && existing) {
      return {
        invoiceNumber: existing.invoice_number,
        invoice: { ...existing, source_kind: "lead_direct" } as UnifiedInvoiceRecord,
      }
    }

    if (existingErr && existingErr.code === "42P01") {
      return { invoiceNumber: fallbackRef, invoice: null }
    }

    const { data: purchase, error: purchaseErr } = await supabase
      .from("lead_purchases")
      .select("id, lead_id, partner_id, credits_spent, purchased_at, notes, leads(segment, city, province)")
      .eq("id", params.purchaseId)
      .single()

    if (purchaseErr || !purchase) {
      return { invoiceNumber: fallbackRef, invoice: null }
    }

    let partner = await fetchPartnerBillingSnapshot(supabase, purchase.partner_id)
    if (partner && !partner.vat_number) {
      await enrichPartnerBceData(partner.id).catch(() => null)
      partner = await fetchPartnerBillingSnapshot(supabase, purchase.partner_id)
    }

    const issuedDate = purchase.purchased_at || new Date().toISOString()
    const fiscalYear = new Date(issuedDate).getFullYear()

    const { data: seqData, error: seqErr } = await supabase.rpc("next_invoice_number", {
      p_type: "invoice",
      p_year: fiscalYear,
    })

    if (seqErr || !seqData?.invoice_number) {
      return { invoiceNumber: fallbackRef, invoice: null }
    }

    const computed = computeLeadPurchaseFinancials({
      creditsSpent: purchase.credits_spent,
      notes: purchase.notes,
      purchasedAt: purchase.purchased_at,
    })

    const htva = round2(params.priceHtva ?? computed.amountHtva)
    const vat = round2(params.vatAmount ?? htva * 0.21)
    const ttc = round2(params.priceTtc ?? htva + vat)
    const methodLabel = params.paymentMethod || computed.paymentMethod || "Bancontact"
    const leadRel = Array.isArray((purchase as any).leads) ? (purchase as any).leads[0] : (purchase as any).leads
    const leadSeg = leadRel?.segment || "B2C"
    const leadLoc = leadRel?.city || leadRel?.province || "Wallonie"

    const { data: inserted, error: insertErr } = await supabase
      .from("invoices")
      .insert({
        invoice_number: seqData.invoice_number,
        invoice_type: "invoice",
        fiscal_year: seqData.fiscal_year,
        sequence_number: seqData.sequence_number,
        partner_id: purchase.partner_id,
        lead_purchase_id: purchase.id,
        client_company_name: partner?.legal_name || partner?.company_name || "Partenaire Installateur",
        client_vat_number: partner?.vat_number || null,
        client_bce_number: partner?.bce_number || null,
        client_street: partner?.billing_street || null,
        client_postal_code: partner?.billing_postal_code || null,
        client_city: partner?.billing_city || null,
        client_country: partner?.billing_country || "BE",
        client_email: partner?.email || null,
        line_description: `Déblocage direct dossier ${leadSeg} #${String(purchase.lead_id).slice(0, 8).toUpperCase()} (${leadLoc})`,
        credits_amount: Number(purchase.credits_spent || 0),
        amount_htva: htva,
        vat_rate: 21,
        amount_vat: vat,
        amount_ttc: ttc,
        processor_fee_eur: 0,
        payment_method: methodLabel,
        payment_reference: params.paymentId || computed.molliePaymentId || purchase.id,
        status: "paid",
        peppol_status: partner?.bce_number ? "ready_ubl" : "manual_uploaded",
        issued_at: issuedDate,
        paid_at: issuedDate,
        notes: purchase.notes || null,
      })
      .select("*")
      .single()

    if (insertErr || !inserted) {
      return { invoiceNumber: fallbackRef, invoice: null }
    }

    return {
      invoiceNumber: inserted.invoice_number,
      invoice: { ...inserted, source_kind: "lead_direct" } as UnifiedInvoiceRecord,
    }
  } catch (err) {
    console.warn("[Accounting] ensureInvoiceForLeadPurchase fallback:", err)
    return { invoiceNumber: fallbackRef, invoice: null }
  }
}

export interface ClientVatListingRow {
  partnerId: string | null
  companyName: string
  vatNumber: string | null
  bceNumber: string | null
  invoicesCount: number
  totalHtva: number
  totalVat: number
  isAbove250Threshold: boolean
}

export interface AccountingConfigStatus {
  aiGatewayReady: boolean
  mollieOrgTokenReady: boolean
  resendInboundReady: boolean
  peppolAddressReady: boolean
  inboundEmailAddress: string
}

export interface UnifiedAccountingBundle {
  year: number
  quarter: 0 | 1 | 2 | 3 | 4
  hasDedicatedTables: boolean
  invoices: UnifiedInvoiceRecord[]
  expenses: AccountingExpenseRecord[]
  pendingDrafts: AccountingExpenseDraftRecord[]
  checklistCompletedIds: string[]
  routineTasks: RoutineTask[]
  quarterSchedule: QuarterScheduleItem[]
  intervat: IntervatSummary
  clientListing: ClientVatListingRow[]
  mediaCommissionsDueEur: number
  missingVatPartnersCount: number
  configStatus: AccountingConfigStatus
}

/**
 * Agrège de manière résiliente l'ensemble des données comptables (Ventes packs + Ventes directes Mollie + Dépenses + Intervat).
 * Fonctionne avec les tables dédiées (après migration) ET en synthèse temps réel depuis les tables existantes (avant migration).
 */
export async function getUnifiedAccountingData(params?: {
  year?: number
  quarter?: 0 | 1 | 2 | 3 | 4
}): Promise<UnifiedAccountingBundle> {
  const now = new Date()
  const year = params?.year ?? now.getFullYear()
  const defaultQuarter = (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4
  const quarter = params?.quarter ?? defaultQuarter

  const supabase = createServiceRoleClient()

  // 1. Charger les tables de base (toujours présentes) + tables comptables (si migrées)
  const [
    invoicesRes,
    expensesRes,
    draftsRes,
    checklistRes,
    paidOrdersRes,
    purchasesRes,
    partnersRes,
    appsRes,
    auditDirectMollieRes,
    auditExpensesRes,
    auditChecklistRes,
    mediaPartnersRes,
    attributedLeadsRes,
  ] = await Promise.all([
    supabase.from("invoices").select("*").order("issued_at", { ascending: true }).limit(1000),
    supabase.from("accounting_expenses").select("*").order("expense_date", { ascending: false }).limit(500),
    supabase
      .from("accounting_expense_drafts")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("accounting_checklist_state").select("*"),
    supabase
      .from("credit_orders")
      .select("id, partner_id, pack_name, credits, price_htva, vat_amount, price_ttc, transfer_reference, status, created_at, validated_at, notes, payment_provider, payment_id")
      .eq("status", "paid")
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase
      .from("lead_purchases")
      .select("id, lead_id, partner_id, credits_spent, purchased_at, notes, leads(segment, city, province)")
      .ilike("notes", "%Achat direct en euros%")
      .order("purchased_at", { ascending: true })
      .limit(1000),
    supabase.from("partners").select("*").limit(500),
    supabase
      .from("installer_applications")
      .select("email, siret, company_name")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("audit_log")
      .select("entity_id, details, created_at")
      .eq("action", "lead_direct_paid_mollie")
      .limit(500),
    supabase
      .from("audit_log")
      .select("id, entity_id, details, created_at")
      .in("action", ["accounting_expense_created", "accounting_expense_deleted"])
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase
      .from("audit_log")
      .select("details, created_at")
      .eq("action", "accounting_checklist_toggled")
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase.from("media_partners").select("id, tracking_code, commission_b2b, commission_b2c, status").eq("status", "active"),
    supabase.from("leads").select("media_partner_code, segment, marketplace_status").not("media_partner_code", "is", null),
  ])

  const hasDedicatedTables = !invoicesRes.error && !expensesRes.error && !checklistRes.error

  // 2. Index partenaires + fallback BCE depuis installer_applications
  const partnerById = new Map<string, PartnerBillingSnapshot>()
  const appSiretByEmail = new Map<string, string>()

  for (const app of appsRes.data ?? []) {
    const email = (app.email || "").toLowerCase().trim()
    if (email && app.siret && !appSiretByEmail.has(email)) {
      appSiretByEmail.set(email, app.siret)
    }
  }

  for (const p of partnersRes.data ?? []) {
    const email = (p.email || "").toLowerCase().trim()
    const rawSiret = p.vat_number || p.bce_number || (email ? appSiretByEmail.get(email) : null)
    const vatInfo = formatBelgianVat(rawSiret)
    partnerById.set(p.id, {
      id: p.id,
      company_name: p.company_name,
      email: p.email,
      is_test: p.is_test,
      bce_number: p.bce_number || vatInfo.bceDigits,
      vat_number: p.vat_number || vatInfo.vatFormatted,
      legal_name: p.legal_name || p.company_name,
      billing_street: p.billing_street || null,
      billing_postal_code: p.billing_postal_code || null,
      billing_city: p.billing_city || null,
      billing_country: p.billing_country || "BE",
    })
  }

  // 3. Index audit Mollie direct
  const auditByPurchaseId = new Map<string, Record<string, unknown>>()
  for (const row of auditDirectMollieRes.data ?? []) {
    if (row.entity_id && row.details) {
      auditByPurchaseId.set(row.entity_id, row.details as Record<string, unknown>)
    }
  }

  // 4. Factures persistées en base + synthèse chronologique des encaissements non encore facturés
  const persistedInvoices: UnifiedInvoiceRecord[] = (invoicesRes.data ?? []).map((inv: any) => ({
    ...inv,
    amount_htva: Number(inv.amount_htva || 0),
    vat_rate: Number(inv.vat_rate || 21),
    amount_vat: Number(inv.amount_vat || 0),
    amount_ttc: Number(inv.amount_ttc || 0),
    processor_fee_eur: Number(inv.processor_fee_eur || 0),
    credits_amount: Number(inv.credits_amount || 0),
    source_kind: inv.credit_order_id ? "credit_order" : inv.lead_purchase_id ? "lead_direct" : "manual",
    is_synthesized: false,
  }))

  const invoicedOrderIds = new Set(
    persistedInvoices.map((i) => i.credit_order_id).filter(Boolean) as string[]
  )
  const invoicedPurchaseIds = new Set(
    persistedInvoices.map((i) => i.lead_purchase_id).filter(Boolean) as string[]
  )

  // Compteur séquentiel par année fiscale pour les écritures synthétisées
  const maxSeqByYear = new Map<number, number>()
  for (const inv of persistedInvoices) {
    if (inv.invoice_type === "invoice") {
      const prev = maxSeqByYear.get(inv.fiscal_year) ?? 0
      if (inv.sequence_number > prev) maxSeqByYear.set(inv.fiscal_year, inv.sequence_number)
    }
  }

  type PendingSynthEvent = {
    sortDate: string
    kind: "credit_order" | "lead_direct"
    record: any
  }
  const synthQueue: PendingSynthEvent[] = []

  for (const order of paidOrdersRes.data ?? []) {
    if (invoicedOrderIds.has(order.id)) continue
    const partner = partnerById.get(order.partner_id)
    if (partner && isTestPartnerAccount(partner)) continue
    synthQueue.push({
      sortDate: order.validated_at || order.created_at,
      kind: "credit_order",
      record: order,
    })
  }

  for (const purchase of purchasesRes.data ?? []) {
    if (invoicedPurchaseIds.has(purchase.id)) continue
    const partner = partnerById.get(purchase.partner_id)
    if (partner && isTestPartnerAccount(partner)) continue
    synthQueue.push({
      sortDate: purchase.purchased_at,
      kind: "lead_direct",
      record: purchase,
    })
  }

  synthQueue.sort((a, b) => new Date(a.sortDate).getTime() - new Date(b.sortDate).getTime())

  const synthesizedInvoices: UnifiedInvoiceRecord[] = []
  for (const item of synthQueue) {
    const dt = new Date(item.sortDate)
    const fYear = Number.isNaN(dt.getTime()) ? year : dt.getFullYear()
    const nextSeq = (maxSeqByYear.get(fYear) ?? 0) + 1
    maxSeqByYear.set(fYear, nextSeq)
    const invNum = `FA-${fYear}-${String(nextSeq).padStart(4, "0")}`

    if (item.kind === "credit_order") {
      const o = item.record
      const partner = partnerById.get(o.partner_id)
      const htva = round2(Number(o.price_htva || 0))
      const vat = round2(Number(o.vat_amount ?? htva * 0.21))
      const ttc = round2(Number(o.price_ttc ?? htva + vat))
      const method =
        o.payment_provider === "mollie"
          ? o.notes?.match(/Méthode:\s*([^|]+)/i)?.[1]?.trim() || "Bancontact (Mollie)"
          : "Virement bancaire"

      synthesizedInvoices.push({
        id: `order:${o.id}`,
        invoice_number: invNum,
        invoice_type: "invoice",
        fiscal_year: fYear,
        sequence_number: nextSeq,
        partner_id: o.partner_id,
        credit_order_id: o.id,
        lead_purchase_id: null,
        source_kind: "credit_order",
        client_company_name: partner?.legal_name || partner?.company_name || "Partenaire Installateur",
        client_vat_number: partner?.vat_number || null,
        client_bce_number: partner?.bce_number || null,
        client_street: partner?.billing_street || null,
        client_postal_code: partner?.billing_postal_code || null,
        client_city: partner?.billing_city || null,
        client_country: partner?.billing_country || "BE",
        client_email: partner?.email || null,
        line_description: `${o.pack_name || "Pack de crédits"} (+${o.credits || 0} crédits Aegis Solaire)`,
        credits_amount: Number(o.credits || 0),
        amount_htva: htva,
        vat_rate: 21,
        amount_vat: vat,
        amount_ttc: ttc,
        processor_fee_eur: 0,
        payment_method: method,
        payment_reference: o.payment_id || o.transfer_reference,
        status: "paid",
        peppol_status: partner?.bce_number ? "ready_ubl" : "manual_uploaded",
        issued_at: item.sortDate,
        paid_at: item.sortDate,
        notes: o.notes || null,
        is_synthesized: true,
      })
    } else {
      const lp = item.record
      const partner = partnerById.get(lp.partner_id)
      const auditDetails = auditByPurchaseId.get(lp.id) ?? null
      const fin = computeLeadPurchaseFinancials({
        creditsSpent: lp.credits_spent,
        notes: lp.notes,
        purchasedAt: lp.purchased_at,
        mollieAuditDetails: auditDetails,
      })
      const htva = round2(fin.amountHtva)
      const vat = round2(fin.amountTtc - htva)
      const ttc = round2(fin.amountTtc)
      const method = fin.paymentMethod || "Bancontact (Mollie)"
      const leadRel = Array.isArray(lp.leads) ? lp.leads[0] : lp.leads
      const leadSeg = leadRel?.segment || "B2C"
      const leadLoc = leadRel?.city || leadRel?.province || "Wallonie"

      synthesizedInvoices.push({
        id: `purchase:${lp.id}`,
        invoice_number: invNum,
        invoice_type: "invoice",
        fiscal_year: fYear,
        sequence_number: nextSeq,
        partner_id: lp.partner_id,
        credit_order_id: null,
        lead_purchase_id: lp.id,
        source_kind: "lead_direct",
        client_company_name: partner?.legal_name || partner?.company_name || "Partenaire Installateur",
        client_vat_number: partner?.vat_number || null,
        client_bce_number: partner?.bce_number || null,
        client_street: partner?.billing_street || null,
        client_postal_code: partner?.billing_postal_code || null,
        client_city: partner?.billing_city || null,
        client_country: partner?.billing_country || "BE",
        client_email: partner?.email || null,
        line_description: `Déblocage direct dossier ${leadSeg} #${String(lp.lead_id).slice(0, 8).toUpperCase()} (${leadLoc})`,
        credits_amount: Number(lp.credits_spent || 0),
        amount_htva: htva,
        vat_rate: 21,
        amount_vat: vat,
        amount_ttc: ttc,
        processor_fee_eur: 0,
        payment_method: method,
        payment_reference: fin.molliePaymentId || lp.id,
        status: "paid",
        peppol_status: partner?.bce_number ? "ready_ubl" : "manual_uploaded",
        issued_at: item.sortDate,
        paid_at: item.sortDate,
        notes: lp.notes || null,
        is_synthesized: true,
      })
    }
  }

  const allInvoices = [...persistedInvoices, ...synthesizedInvoices].sort(
    (a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
  )

  // 5. Dépenses (table accounting_expenses OU repli audit_log)
  let expenses: AccountingExpenseRecord[] = []
  if (!expensesRes.error && expensesRes.data) {
    expenses = expensesRes.data.map((e: any) => ({
      ...e,
      amount_htva: Number(e.amount_htva || 0),
      vat_paid_be: Number(e.vat_paid_be || 0),
      vat_deductible_pct: Number(e.vat_deductible_pct ?? 100),
      tax_deductible_pct: Number(e.tax_deductible_pct ?? 100),
      original_currency: e.original_currency || "EUR",
      original_amount: e.original_amount !== null && e.original_amount !== undefined ? Number(e.original_amount) : null,
      exchange_rate: e.exchange_rate !== null && e.exchange_rate !== undefined ? Number(e.exchange_rate) : null,
      payment_source: e.payment_source || "pro_account",
      source: e.source || "manual",
      source_metadata: e.source_metadata || {},
    }))
  } else {
    const expMap = new Map<string, AccountingExpenseRecord>()
    for (const row of auditExpensesRes.data ?? []) {
      const details = (row.details || {}) as Record<string, any>
      const id = String(row.entity_id || details.id || row.id)
      if (details.deleted) {
        expMap.delete(id)
      } else if (details.supplier_name) {
        expMap.set(id, {
          id,
          expense_date: String(details.expense_date || row.created_at.slice(0, 10)),
          supplier_name: String(details.supplier_name),
          supplier_country: String(details.supplier_country || "BE"),
          supplier_vat_number: details.supplier_vat_number || null,
          category: String(details.category || "hardware_it_video"),
          description: String(details.description || ""),
          nace_code: String(details.nace_code || "62100"),
          amount_htva: Number(details.amount_htva || 0),
          vat_paid_be: Number(details.vat_paid_be || 0),
          vat_deductible_pct: Number(details.vat_deductible_pct ?? 100),
          tax_deductible_pct: Number(details.tax_deductible_pct ?? 100),
          is_reverse_charge: Boolean(details.is_reverse_charge),
          is_investment: Boolean(details.is_investment),
          invoice_ref: details.invoice_ref || null,
          notes: details.notes || null,
          original_currency: details.original_currency || "EUR",
          original_amount: details.original_amount ?? null,
          exchange_rate: details.exchange_rate ?? null,
          payment_source: details.payment_source || "pro_account",
          source: details.source || "manual",
          created_at: row.created_at,
        })
      }
    }
    expenses = Array.from(expMap.values()).sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    )
  }

  // 5b. Brouillons en attente de validation (Drag & Drop IA, Email Inbound, Mollie)
  const pendingDrafts: AccountingExpenseDraftRecord[] =
    !draftsRes.error && draftsRes.data
      ? draftsRes.data.map((d: any) => ({
          id: String(d.id),
          status: d.status || "pending_review",
          source: d.source || "drag_drop",
          document_storage_path: d.document_storage_path || null,
          document_filename: d.document_filename || null,
          document_mime_type: d.document_mime_type || null,
          document_sha256: d.document_sha256 || null,
          document_size_bytes: d.document_size_bytes !== null ? Number(d.document_size_bytes) : null,
          expense_date: String(d.expense_date || new Date().toISOString().slice(0, 10)),
          supplier_name: String(d.supplier_name || "Fournisseur à vérifier"),
          supplier_country: (d.supplier_country || "BE") as "BE" | "EU" | "NON_EU",
          supplier_vat_number: d.supplier_vat_number || null,
          category: String(d.category || "saas_cloud_non_eu"),
          description: String(d.description || ""),
          nace_code: String(d.nace_code || "62100"),
          original_currency: String(d.original_currency || "EUR"),
          original_amount_htva: Number(d.original_amount_htva || 0),
          original_vat_amount: Number(d.original_vat_amount || 0),
          original_amount_ttc: Number(d.original_amount_ttc || 0),
          exchange_rate: Number(d.exchange_rate || 1),
          exchange_rate_source: d.exchange_rate_source || null,
          amount_htva: Number(d.amount_htva || 0),
          vat_paid_be: Number(d.vat_paid_be || 0),
          vat_deductible_pct: Number(d.vat_deductible_pct ?? 100),
          tax_deductible_pct: Number(d.tax_deductible_pct ?? 100),
          is_reverse_charge: Boolean(d.is_reverse_charge),
          is_investment: Boolean(d.is_investment),
          invoice_ref: d.invoice_ref || null,
          payment_source: d.payment_source || "pro_account",
          is_valid_tax_invoice: d.is_valid_tax_invoice !== false,
          client_vat_present: d.client_vat_present !== false,
          ai_confidence: Number(d.ai_confidence ?? 0.9),
          ai_model: d.ai_model || null,
          ai_warnings: Array.isArray(d.ai_warnings) ? (d.ai_warnings as DraftWarning[]) : [],
          ai_raw_extraction:
            d.ai_raw_extraction && typeof d.ai_raw_extraction === "object"
              ? d.ai_raw_extraction
              : {},
          source_metadata:
            d.source_metadata && typeof d.source_metadata === "object" ? d.source_metadata : {},
          notes: d.notes || null,
          approved_expense_id: d.approved_expense_id || null,
          created_at: String(d.created_at || new Date().toISOString()),
          updated_at: String(d.updated_at || new Date().toISOString()),
        }))
      : []

  // 6. État checklist (table accounting_checklist_state OU repli audit_log)
  const periodKey = `${year}-Q${quarter}`
  const completedSet = new Set<string>()
  if (!checklistRes.error && checklistRes.data) {
    for (const row of checklistRes.data) {
      if (row.period_key === periodKey && row.completed_at) {
        completedSet.add(row.task_id)
      }
    }
  } else {
    for (const row of auditChecklistRes.data ?? []) {
      const details = (row.details || {}) as Record<string, any>
      if (details.period_key === periodKey && details.task_id) {
        if (details.completed) completedSet.add(String(details.task_id))
        else completedSet.delete(String(details.task_id))
      }
    }
  }

  // 7. Calcul Intervat & Listing clients annuel (> 250 € HTVA)
  const intervat = computeIntervatDeclaration(allInvoices, expenses, year, quarter)
  const listingByClient = new Map<string, ClientVatListingRow>()
  for (const inv of allInvoices) {
    if (new Date(inv.issued_at).getFullYear() !== year) continue
    if (inv.status === "cancelled") continue
    const key = inv.partner_id || inv.client_company_name
    const existing = listingByClient.get(key) || {
      partnerId: inv.partner_id,
      companyName: inv.client_company_name,
      vatNumber: inv.client_vat_number,
      bceNumber: inv.client_bce_number,
      invoicesCount: 0,
      totalHtva: 0,
      totalVat: 0,
      isAbove250Threshold: false,
    }
    const sign = inv.invoice_type === "credit_note" ? -1 : 1
    existing.invoicesCount += 1
    existing.totalHtva = round2(existing.totalHtva + sign * Math.abs(inv.amount_htva))
    existing.totalVat = round2(existing.totalVat + sign * Math.abs(inv.amount_vat))
    existing.isAbove250Threshold = existing.totalHtva > 250
    listingByClient.set(key, existing)
  }

  const clientListing = Array.from(listingByClient.values()).sort(
    (a, b) => b.totalHtva - a.totalHtva
  )

  // 8. Commissions Media Partners dues
  const mpByCode = new Map<string, { b2b: number; b2c: number }>()
  for (const mp of mediaPartnersRes.data ?? []) {
    if (mp.tracking_code) {
      mpByCode.set(mp.tracking_code, {
        b2b: Number(mp.commission_b2b || 0),
        b2c: Number(mp.commission_b2c || 0),
      })
    }
  }
  let mediaCommissionsDueEur = 0
  for (const l of attributedLeadsRes.data ?? []) {
    if (l.marketplace_status !== "available" && l.marketplace_status !== "sold_out") continue
    const mp = mpByCode.get(l.media_partner_code)
    if (!mp) continue
    mediaCommissionsDueEur += l.segment === "B2B" ? mp.b2b : mp.b2c
  }

  const missingVatPartnersCount = Array.from(partnerById.values()).filter(
    (p) => !isTestPartnerAccount(p) && !p.vat_number
  ).length

  const configStatus: AccountingConfigStatus = {
    aiGatewayReady: Boolean(
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL
    ),
    mollieOrgTokenReady: Boolean(process.env.MOLLIE_ORG_ACCESS_TOKEN),
    resendInboundReady: Boolean(
      process.env.RESEND_INBOUND_WEBHOOK_SECRET && process.env.RESEND_API_KEY
    ),
    peppolAddressReady: isPeppolLegalAddressConfigured(),
    inboundEmailAddress:
      process.env.ACCOUNTING_INBOUND_EMAIL || "factures@inbound.aegissolaire.com",
  }

  return {
    year,
    quarter,
    hasDedicatedTables,
    invoices: allInvoices,
    expenses,
    pendingDrafts,
    checklistCompletedIds: Array.from(completedSet),
    routineTasks: getRoutineTasksForPeriod(year, quarter),
    quarterSchedule: getQuarterCalendarSchedule(year),
    intervat,
    clientListing,
    mediaCommissionsDueEur: round2(mediaCommissionsDueEur),
    missingVatPartnersCount,
    configStatus,
  }
}

/**
 * Résout une facture par son ID DB ou synthétique (`order:<uuid>` ou `purchase:<uuid>`).
 */
export async function findInvoiceByAnyId(id: string): Promise<UnifiedInvoiceRecord | null> {
  const data = await getUnifiedAccountingData({ quarter: 0 })
  return data.invoices.find((inv) => inv.id === id || inv.invoice_number === id) ?? null
}
