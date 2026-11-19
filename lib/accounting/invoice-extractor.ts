import { createHash, randomUUID } from "node:crypto"
import { generateText, Output } from "ai"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  EXPENSE_PRESETS_MAP,
  LEGAL_ENTITY,
  round2,
  type AccountingExpenseDraftRecord,
  type DraftWarning,
  type PaymentSource,
} from "@/lib/accounting/belgian-tax-rules"

export const ACCOUNTING_DOCUMENTS_BUCKET = "accounting-documents"

const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "EL",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
])

const extractedInvoiceSchema = z.object({
  is_valid_tax_invoice: z
    .boolean()
    .describe(
      "false si le document dit 'Ceci n'est pas une facture', 'This is not an invoice', 'Payment receipt', ou est un simple ticket/reçu sans valeur de facture TVA B2B."
    ),
  document_kind: z.enum([
    "tax_invoice",
    "credit_note",
    "payment_receipt_not_invoice",
    "bank_statement_or_other",
  ]),
  expense_date: z
    .string()
    .describe("Date d'émission de la facture au format strict YYYY-MM-DD"),
  supplier_name: z.string().describe("Nom officiel du fournisseur"),
  supplier_country_iso: z
    .string()
    .describe("Code ISO 2 lettres du pays du fournisseur (ex: BE, IE, NL, US, CH, FR, DE)"),
  supplier_vat_number: z
    .string()
    .nullable()
    .describe("Numéro de TVA du fournisseur s'il figure sur la facture, sinon null"),
  invoice_ref: z
    .string()
    .nullable()
    .describe("Numéro ou référence unique de facture, sinon null"),
  description: z
    .string()
    .describe("Résumé concis en français de la dépense (ex: Hébergement Vercel Pro Nov 2026)"),
  suggested_category: z.enum([
    "meta_google_ads_eu",
    "saas_cloud_non_eu",
    "mollie_fees_eu",
    "bank_fees_exempt",
    "hardware_it_video",
    "telecom_internet_mixed",
    "subcontractor_media_partner",
    "restaurant_business",
    "client_gift_under_50",
    "mobility_car_mixed",
    "mobility_train_bike",
    "home_office_energy",
    "social_contributions",
  ]),
  currency: z
    .string()
    .describe("Code devise ISO 3 lettres en majuscules (ex: EUR, USD, CHF, GBP)"),
  amount_htva_original: z
    .number()
    .describe("Montant HTVA (subtotal / net) dans la devise du document"),
  vat_amount_original: z
    .number()
    .describe("Montant de TVA facturé dans la devise du document (0 si autoliquidation)"),
  amount_ttc_original: z
    .number()
    .describe("Montant total TTC facturé dans la devise du document"),
  vat_rate_pct_on_doc: z
    .number()
    .describe("Taux de TVA affiché sur le document (ex: 21, 6, 12, 0)"),
  client_vat_found_on_document: z
    .boolean()
    .describe("true si BE 1039.899.980 / BE1039899980 ou INIT42 apparaît sur la facture"),
  payment_source_hint: z
    .enum(["pro_account", "personal_card", "mollie_balance", "other"])
    .describe(
      "personal_card si mention Revolut / carte personnelle détectée, mollie_balance si prélèvement sur solde Mollie, sinon pro_account"
    ),
  personal_card_hint_reason: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  line_items: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number(),
      })
    )
    .max(10),
  notes: z.string().nullable(),
})

type ExtractedInvoiceData = z.infer<typeof extractedInvoiceSchema>

function sanitizeFilename(rawName: string): string {
  const cleaned = rawName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96)
  return cleaned || `facture_${Date.now()}.pdf`
}

function normalizeIsoDate(raw?: string | null): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim()
  }
  const parsed = raw ? new Date(raw) : null
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

export async function storeAccountingDocument(
  supabase: ReturnType<typeof createServiceRoleClient>,
  params: {
    buffer: Buffer
    filename: string
    mimeType: string
  }
): Promise<{
  storagePath: string | null
  sha256: string
  safeFilename: string
  uploadError?: string
}> {
  const sha256 = createHash("sha256").update(params.buffer).digest("hex")
  const safeFilename = sanitizeFilename(params.filename)
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
  const storagePath = `${yyyy}/${mm}/${randomUUID()}_${safeFilename}`

  const attemptUpload = () =>
    supabase.storage.from(ACCOUNTING_DOCUMENTS_BUCKET).upload(storagePath, params.buffer, {
      contentType: params.mimeType,
      upsert: false,
    })

  let { error } = await attemptUpload()
  if (error && /bucket.*not found/i.test(error.message)) {
    await supabase.storage
      .createBucket(ACCOUNTING_DOCUMENTS_BUCKET, {
        public: false,
        fileSizeLimit: 15 * 1024 * 1024,
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      })
      .catch(() => null)
    const retry = await attemptUpload()
    error = retry.error
  }

  if (error) {
    console.warn("[Accounting] Storage upload error:", error.message)
    return { storagePath: null, sha256, safeFilename, uploadError: error.message }
  }

  return { storagePath, sha256, safeFilename }
}

export async function fetchEcbRateToEur(
  currencyRaw: string,
  isoDate: string
): Promise<{ rate: number; source: string; warning?: string }> {
  const currency = (currencyRaw || "EUR").trim().toUpperCase().slice(0, 3)
  if (!currency || currency === "EUR") {
    return { rate: 1, source: "EUR" }
  }

  const urls = [
    `https://api.frankfurter.dev/v1/${encodeURIComponent(isoDate)}?base=${encodeURIComponent(currency)}&symbols=EUR`,
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=EUR`,
  ]

  for (let idx = 0; idx < urls.length; idx += 1) {
    try {
      const res = await fetch(urls[idx], {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      })
      if (!res.ok) continue
      const json = (await res.json()) as {
        date?: string
        rates?: Record<string, number>
      }
      const eurRate = Number(json?.rates?.EUR)
      if (Number.isFinite(eurRate) && eurRate > 0) {
        return {
          rate: eurRate,
          source: `BCE (${json.date || isoDate})`,
        }
      }
    } catch {
      // Continuer vers fallback latest
    }
  }

  return {
    rate: 1,
    source: "FALLBACK_UNAVAILABLE",
    warning: `Taux BCE introuvable pour ${currency} au ${isoDate} : vérifie et saisis manuellement le montant exact en EUR débité sur ton relevé.`,
  }
}

function applyBelgianSupplierDeterministicRules(extracted: ExtractedInvoiceData): {
  supplierName: string
  supplierCountry: "BE" | "EU" | "NON_EU"
  supplierVatNumber: string | null
  categoryId: string
  defaultPaymentSource: PaymentSource
} {
  const rawName = (extracted.supplier_name || "").trim()
  const lower = rawName.toLowerCase()
  const vatUpper = (extracted.supplier_vat_number || "").toUpperCase().replace(/\s+/g, "")
  const iso = (extracted.supplier_country_iso || "").trim().toUpperCase().slice(0, 2)

  if (lower.includes("meta") || lower.includes("facebook") || vatUpper.includes("IE9692928F")) {
    return {
      supplierName: rawName || "Meta Platforms Ireland Ltd",
      supplierCountry: "EU",
      supplierVatNumber: extracted.supplier_vat_number || "IE9692928F",
      categoryId: "meta_google_ads_eu",
      defaultPaymentSource: extracted.payment_source_hint,
    }
  }

  if (lower.includes("google") || vatUpper.includes("IE6388047V")) {
    return {
      supplierName: rawName || "Google Ireland Ltd",
      supplierCountry: "EU",
      supplierVatNumber: extracted.supplier_vat_number || "IE6388047V",
      categoryId: "meta_google_ads_eu",
      defaultPaymentSource: extracted.payment_source_hint,
    }
  }

  if (lower.includes("mollie") || vatUpper.includes("NL815839091B01")) {
    return {
      supplierName: rawName || "Mollie B.V.",
      supplierCountry: "EU",
      supplierVatNumber: extracted.supplier_vat_number || "NL815839091B01",
      categoryId: "mollie_fees_eu",
      defaultPaymentSource: "mollie_balance",
    }
  }

  if (lower.includes("infomaniak") || iso === "CH") {
    return {
      supplierName: rawName || "Infomaniak Network SA",
      supplierCountry: "NON_EU", // Suisse = Hors-UE strict (Grille [87])
      supplierVatNumber: extracted.supplier_vat_number || null,
      categoryId: "saas_cloud_non_eu",
      defaultPaymentSource: extracted.payment_source_hint,
    }
  }

  if (
    lower.includes("vercel") ||
    lower.includes("supabase") ||
    lower.includes("resend") ||
    lower.includes("openai") ||
    lower.includes("anthropic") ||
    lower.includes("twilio") ||
    lower.includes("cloudflare") ||
    lower.includes("github") ||
    lower.includes("cursor") ||
    lower.includes("stripe")
  ) {
    return {
      supplierName: rawName || "Fournisseur SaaS Hors-UE",
      supplierCountry: iso === "BE" ? "BE" : EU_COUNTRY_CODES.has(iso) ? "EU" : "NON_EU",
      supplierVatNumber: extracted.supplier_vat_number || null,
      categoryId: "saas_cloud_non_eu",
      defaultPaymentSource: extracted.payment_source_hint,
    }
  }

  if (
    lower.includes("proximus") ||
    lower.includes("orange") ||
    lower.includes("voo") ||
    lower.includes("telenet") ||
    lower.includes("mobile vikings")
  ) {
    return {
      supplierName: rawName,
      supplierCountry: "BE",
      supplierVatNumber: extracted.supplier_vat_number || null,
      categoryId: "telecom_internet_mixed",
      defaultPaymentSource: extracted.payment_source_hint,
    }
  }

  let supplierCountry: "BE" | "EU" | "NON_EU" = "NON_EU"
  if (iso === "BE" || vatUpper.startsWith("BE")) {
    supplierCountry = "BE"
  } else if (
    (iso && EU_COUNTRY_CODES.has(iso)) ||
    (vatUpper.length >= 4 && EU_COUNTRY_CODES.has(vatUpper.slice(0, 2)))
  ) {
    supplierCountry = "EU"
  }

  let categoryId = extracted.suggested_category
  if (supplierCountry === "EU" && categoryId === "saas_cloud_non_eu") {
    categoryId = "meta_google_ads_eu"
  } else if (supplierCountry === "NON_EU" && categoryId === "meta_google_ads_eu") {
    categoryId = "saas_cloud_non_eu"
  }

  return {
    supplierName: rawName || "Fournisseur à vérifier",
    supplierCountry,
    supplierVatNumber: extracted.supplier_vat_number || null,
    categoryId,
    defaultPaymentSource: extracted.payment_source_hint,
  }
}

async function extractInvoiceWithAi(params: {
  buffer: Buffer
  filename: string
  mimeType: string
  sourceHint?: string
}): Promise<{
  data: ExtractedInvoiceData | null
  modelUsed: string | null
  errorMessage?: string
}> {
  const hasGatewayAuth = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL
  )
  if (!hasGatewayAuth) {
    return {
      data: null,
      modelUsed: null,
      errorMessage:
        "Clé Vercel AI Gateway absente en environnement local (AI_GATEWAY_API_KEY ou VERCEL_OIDC_TOKEN).",
    }
  }

  const primaryModel = process.env.AI_ACCOUNTING_MODEL || "google/gemini-3.8-flash"
  const isPdf = params.mimeType === "application/pdf"

  const filePart = isPdf
    ? {
        type: "file" as const,
        data: params.buffer,
        mediaType: "application/pdf",
        filename: params.filename,
      }
    : {
        type: "image" as const,
        image: params.buffer,
        mediaType: params.mimeType,
      }

  const instructions = `Tu es l'auditeur comptable belge d'INIT42 (numéro d'entreprise / TVA : ${LEGAL_ENTITY.vat}, compact ${LEGAL_ENTITY.vatCompact}, ville : ${LEGAL_ENTITY.city}, Belgique, enseigne commerciale ${LEGAL_ENTITY.commercialName}).
Analyse attentivement la pièce comptable fournie et extrais fidèlement toutes les données comptables et fiscales.

Règles strictes d'audit :
1. Si le document mentionne explicitement "Ceci n'est pas une facture", "This is not an invoice", "Payment receipt", ou s'il s'agit d'un simple reçu de prélèvement Meta/Facebook (ex. prélèvements par seuil de 18 €) : mets OBLIGATOIREMENT is_valid_tax_invoice = false et document_kind = "payment_receipt_not_invoice".
2. Ne confonds jamais le vendeur (supplier_name) avec le client (INIT42 / Nathan Remacle / Aegis Solaire).
3. Vérifie si le numéro de TVA belge d'INIT42 (${LEGAL_ENTITY.vat} ou ${LEGAL_ENTITY.vatCompact}) figure quelque part dans la zone client/destinataire → client_vat_found_on_document.
4. Identifie le pays exact du fournisseur (supplier_country_iso) :
   - Meta Platforms Ireland Ltd = IE
   - Google Ireland Ltd = IE
   - Mollie B.V. = NL
   - Infomaniak Network SA = CH (Suisse, hors Union européenne !)
   - Vercel Inc., Supabase Inc., Resend, OpenAI, Twilio = US
5. Si le document est un reçu Revolut ou mentionne "Revolut" / carte perso en moyen de paiement, mets payment_source_hint = "personal_card" et explique-le dans personal_card_hint_reason.
6. Respecte exactement la devise affichée sur le document (USD, CHF, EUR, GBP) et les montants tels qu'imprimés (ne convertis pas toi-même les devises).`

  try {
    const result = await generateText({
      model: primaryModel,
      instructions,
      output: Output.object({ schema: extractedInvoiceSchema }),
      providerOptions: {
        gateway: {
          models: ["google/gemini-2.5-flash"],
        },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Nom du fichier : ${params.filename}${params.sourceHint ? ` (${params.sourceHint})` : ""}. Extrais les données comptables exactes de cette pièce.`,
            },
            filePart,
          ],
        },
      ],
    })

    return {
      data: result.output,
      modelUsed: result.response?.modelId || primaryModel,
    }
  } catch (err: any) {
    console.warn("[Accounting AI] Extraction failed:", err?.message || err)
    return {
      data: null,
      modelUsed: primaryModel,
      errorMessage: err?.message || "Erreur lors de l'analyse IA du document.",
    }
  }
}

export async function analyzeAndCreateExpenseDraft(params: {
  buffer: Buffer
  filename: string
  mimeType: string
  source: "drag_drop" | "email_inbound" | "mollie_api"
  paymentSourceOverride?: PaymentSource
  sourceMetadata?: Record<string, unknown>
}): Promise<{ draft: AccountingExpenseDraftRecord; warnings: DraftWarning[] }> {
  const supabase = createServiceRoleClient()

  // 1. Archivage sécurisé dans le bucket privé + calcul empreinte SHA-256
  const stored = await storeAccountingDocument(supabase, {
    buffer: params.buffer,
    filename: params.filename,
    mimeType: params.mimeType,
  })

  // 2. Extraction IA Multimodale (Vercel AI Gateway)
  const aiResult = await extractInvoiceWithAi({
    buffer: params.buffer,
    filename: stored.safeFilename,
    mimeType: params.mimeType,
    sourceHint:
      params.source === "email_inbound"
        ? `Reçu par e-mail depuis ${String(params.sourceMetadata?.from || "inconnu")}`
        : undefined,
  })

  const warnings: DraftWarning[] = []
  if (stored.uploadError) {
    warnings.push({
      code: "STORAGE_WARNING",
      severity: "warning",
      message: `Archivage PDF partiel (${stored.uploadError}) : vérifie que le bucket privé accounting-documents existe.`,
    })
  }

  let expenseDate = new Date().toISOString().slice(0, 10)
  let supplierName = stored.safeFilename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")
  let supplierCountry: "BE" | "EU" | "NON_EU" = "NON_EU"
  let supplierVatNumber: string | null = null
  let categoryId = "saas_cloud_non_eu"
  let description = `Facture importée (${stored.safeFilename})`
  let naceCode = "63100"
  let originalCurrency = "EUR"
  let originalHtva = 0
  let originalVat = 0
  let originalTtc = 0
  let exchangeRate = 1
  let exchangeRateSource = "EUR"
  let amountHtva = 0
  let vatPaidBe = 0
  let vatDeductiblePct = 100
  let taxDeductiblePct = 100
  let isReverseCharge = false
  let isInvestment = false
  let invoiceRef: string | null = null
  let paymentSource: PaymentSource = params.paymentSourceOverride || "pro_account"
  let isValidTaxInvoice = true
  let clientVatPresent = true
  let aiConfidence = 0.5
  let notes: string | null = null
  let aiRaw: Record<string, unknown> = {}

  if (!aiResult.data) {
    warnings.push({
      code: "AI_UNAVAILABLE",
      severity: "warning",
      message:
        aiResult.errorMessage ||
        "Lecture IA indisponible : la pièce est archivée, complète les montants manuellement ou copie le dossier pour vérification dans le chat.",
    })
  } else {
    const ext = aiResult.data
    aiRaw = ext as unknown as Record<string, unknown>
    aiConfidence = ext.confidence
    expenseDate = normalizeIsoDate(ext.expense_date)
    invoiceRef = ext.invoice_ref?.trim() || null
    description = ext.description?.trim() || description
    notes = ext.notes?.trim() || null
    isValidTaxInvoice = ext.is_valid_tax_invoice && ext.document_kind !== "payment_receipt_not_invoice"
    clientVatPresent = ext.client_vat_found_on_document

    const rules = applyBelgianSupplierDeterministicRules(ext)
    supplierName = rules.supplierName
    supplierCountry = rules.supplierCountry
    supplierVatNumber = rules.supplierVatNumber
    categoryId = rules.categoryId
    if (!params.paymentSourceOverride) {
      paymentSource = rules.defaultPaymentSource
    }

    const preset = EXPENSE_PRESETS_MAP[categoryId] ?? EXPENSE_PRESETS_MAP.saas_cloud_non_eu
    naceCode = preset.naceCode
    vatDeductiblePct = preset.vatDeductiblePct
    taxDeductiblePct = preset.taxDeductiblePct

    originalCurrency = (ext.currency || "EUR").trim().toUpperCase().slice(0, 3) || "EUR"
    originalHtva = round2(Math.max(0, Number(ext.amount_htva_original || 0)))
    originalVat = round2(Math.max(0, Number(ext.vat_amount_original || 0)))
    originalTtc = round2(
      Math.max(0, Number(ext.amount_ttc_original || originalHtva + originalVat))
    )
    if (originalHtva === 0 && originalTtc > 0 && originalVat === 0) {
      originalHtva = originalTtc
    }

    // Conversion BCE vers EUR si devise étrangère
    const fx = await fetchEcbRateToEur(originalCurrency, expenseDate)
    exchangeRate = fx.rate
    exchangeRateSource = fx.source
    if (fx.warning) {
      warnings.push({
        code: "FX_RATE_UNAVAILABLE",
        severity: "warning",
        message: fx.warning,
      })
    }

    amountHtva = round2(originalHtva * exchangeRate)
    const vatEur = round2(originalVat * exchangeRate)

    if (originalCurrency !== "EUR" && !fx.warning) {
      warnings.push({
        code: "FX_CONVERTED",
        severity: "info",
        message: `Converti de ${originalHtva.toFixed(2)} ${originalCurrency} → ${amountHtva.toFixed(2)} EUR (${exchangeRateSource}, taux ${exchangeRate.toFixed(4)}). Ajuste si le débit exact Revolut diffère.`,
      })
    }

    // Régime TVA belge déterministe
    if (categoryId === "social_contributions" || categoryId === "bank_fees_exempt") {
      isReverseCharge = false
      vatPaidBe = 0
      vatDeductiblePct = 0
    } else if (supplierCountry === "EU" || supplierCountry === "NON_EU") {
      isReverseCharge = true
      vatPaidBe = 0
      if (originalVat > 0) {
        warnings.push({
          code: "FOREIGN_VAT_CHARGED",
          severity: "warning",
          message: `Attention : le fournisseur (${supplierCountry}) a facturé ${vatEur.toFixed(2)} EUR de TVA étrangère (non récupérable en grille [59] belge). Vérifie l'encodage de BE 1039.899.980 chez ce fournisseur.`,
        })
      }
    } else {
      isReverseCharge = false
      vatPaidBe = vatEur
    }

    // Seuil d'amortissement investissement >= 1 000 € HTVA sur matériel
    isInvestment = categoryId === "hardware_it_video" && amountHtva >= 1000

    if (!isValidTaxInvoice) {
      warnings.push({
        code: "NOT_A_TAX_INVOICE",
        severity: "error",
        message:
          "Document identifié comme un simple reçu de paiement (ex. « Ceci n'est pas une facture » Meta Ads 18 €). Rejette cette ligne et utilise la facture mensuelle consolidée.",
      })
    }

    if (!clientVatPresent && isValidTaxInvoice && categoryId !== "restaurant_business") {
      warnings.push({
        code: "MISSING_CLIENT_VAT",
        severity: "warning",
        message:
          "Le n° TVA BE 1039.899.980 / INIT42 n'a pas été repéré sur cette facture : vérifie les infos de facturation chez ce fournisseur.",
      })
    }

    if (paymentSource === "personal_card") {
      warnings.push({
        code: "PERSONAL_CARD_HINT",
        severity: "info",
        message:
          ext.personal_card_hint_reason ||
          "Détecté comme payé par carte personnelle (Revolut). Valide en personne physique INIT42 ; conserve le justificatif de débit.",
      })
    }
  }

  // 3. Contrôle de doublons (SHA-256 ou référence fournisseur)
  const [dupExpSha, dupDraftSha] = await Promise.all([
    supabase
      .from("accounting_expenses")
      .select("id, invoice_ref, supplier_name")
      .eq("document_sha256", stored.sha256)
      .limit(1),
    supabase
      .from("accounting_expense_drafts")
      .select("id, invoice_ref, supplier_name")
      .eq("document_sha256", stored.sha256)
      .neq("status", "rejected")
      .limit(1),
  ])

  if ((dupExpSha.data && dupExpSha.data.length > 0) || (dupDraftSha.data && dupDraftSha.data.length > 0)) {
    warnings.push({
      code: "DUPLICATE_FILE",
      severity: "error",
      message: "Fichier strictement identique déjà importé ou validé dans la comptabilité.",
    })
  } else if (invoiceRef) {
    const [dupExpRef, dupDraftRef] = await Promise.all([
      supabase
        .from("accounting_expenses")
        .select("id, supplier_name")
        .eq("invoice_ref", invoiceRef)
        .limit(3),
      supabase
        .from("accounting_expense_drafts")
        .select("id, supplier_name")
        .eq("invoice_ref", invoiceRef)
        .neq("status", "rejected")
        .limit(3),
    ])
    const sameSupplierExp = (dupExpRef.data || []).some(
      (r) => String(r.supplier_name || "").toLowerCase() === supplierName.toLowerCase()
    )
    const sameSupplierDraft = (dupDraftRef.data || []).some(
      (r) => String(r.supplier_name || "").toLowerCase() === supplierName.toLowerCase()
    )
    if (sameSupplierExp || sameSupplierDraft) {
      warnings.push({
        code: "DUPLICATE_REF",
        severity: "warning",
        message: `La référence ${invoiceRef} pour ${supplierName} existe déjà en base ou en attente.`,
      })
    }
  }

  // 4. Insertion dans accounting_expense_drafts
  const draftId = randomUUID()
  const nowIso = new Date().toISOString()
  const rowToInsert = {
    id: draftId,
    status: "pending_review" as const,
    source: params.source,
    document_storage_path: stored.storagePath,
    document_filename: stored.safeFilename,
    document_mime_type: params.mimeType,
    document_sha256: stored.sha256,
    document_size_bytes: params.buffer.byteLength,
    expense_date: expenseDate,
    supplier_name: supplierName.slice(0, 200),
    supplier_country: supplierCountry,
    supplier_vat_number: supplierVatNumber,
    category: categoryId,
    description: description.slice(0, 300),
    nace_code: naceCode,
    original_currency: originalCurrency,
    original_amount_htva: originalHtva,
    original_vat_amount: originalVat,
    original_amount_ttc: originalTtc,
    exchange_rate: exchangeRate,
    exchange_rate_source: exchangeRateSource,
    amount_htva: amountHtva,
    vat_paid_be: vatPaidBe,
    vat_deductible_pct: vatDeductiblePct,
    tax_deductible_pct: taxDeductiblePct,
    is_reverse_charge: isReverseCharge,
    is_investment: isInvestment,
    invoice_ref: invoiceRef,
    payment_source: paymentSource,
    is_valid_tax_invoice: isValidTaxInvoice,
    client_vat_present: clientVatPresent,
    ai_confidence: aiConfidence,
    ai_model: aiResult.modelUsed,
    ai_warnings: warnings,
    ai_raw_extraction: aiRaw,
    source_metadata: params.sourceMetadata || {},
    notes,
    approved_expense_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("accounting_expense_drafts")
    .insert(rowToInsert)
    .select("*")
    .single()

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message || "Impossible d'enregistrer le brouillon comptable.")
  }

  return {
    draft: inserted as AccountingExpenseDraftRecord,
    warnings,
  }
}
