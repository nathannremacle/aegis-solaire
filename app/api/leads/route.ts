import { CONSENT_COOKIE, hasAdvertisingConsent } from "@/lib/advertising-consent"
import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { leadSubmitSchema } from "@/lib/leads-schema"
import { calculateLeadScore } from "@/lib/lead-score"
import { calculateLeadCreditCost } from "@/lib/marketplace-pricing"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendPartnerLeadTeaserEmails } from "@/lib/partner-lead-teaser-email"
import { sendProspectConfirmationEmail } from "@/lib/prospect-confirmation-email"
import { sendMetaConversionApiLead } from "@/lib/meta-capi"
import { createHmac } from "crypto"

function sanitizeString(input: string, maxLength = 255): string {
  const trimmed = String(input).trim().slice(0, maxLength)
  return trimmed.replace(/[<>]/g, "")
}

const MIN_FORM_FILL_TIME_MS = 4000

export function getClientIp(request: Request): string {
  // En environnement Next.js / Vercel, l'IP est injectée sur l'objet de requête
  const nextRequest = request as any
  return nextRequest.ip || nextRequest.headers.get("x-forwarded-for") || "unknown"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.fax_number != null && String(body.fax_number).trim() !== "") {
      return NextResponse.json({
        success: true,
        message: "Lead enregistré avec succès",
        leadId: crypto.randomUUID(),
      })
    }

    if (!(await checkRateLimit(request))) {
      return NextResponse.json(
        { error: "Trop de demandes. Veuillez réessayer dans une heure." },
        { status: 429 }
      )
    }

    const formOpenedAt = body.form_opened_at
    if (formOpenedAt) {
      const opened = new Date(formOpenedAt).getTime()
      const now = Date.now()
      if (Number.isNaN(opened) || now - opened < MIN_FORM_FILL_TIME_MS) {
        return NextResponse.json(
          { error: "Une erreur est survenue. Veuillez reessayer." },
          { status: 400 }
        )
      }
    }

    const parseResult = leadSubmitSchema.safeParse({
      ...body,
      surfaceArea: typeof body.surfaceArea === "number" ? body.surfaceArea : parseInt(body.surfaceArea, 10),
      annualElectricityBill:
        typeof body.annualElectricityBill === "number"
          ? body.annualElectricityBill
          : parseInt(body.annualElectricityBill, 10),
      marketingConsent: body.marketingConsent === true || body.partnerContactConsent === true,
      newsletterConsent: body.newsletterConsent === true,
    })

    if (!parseResult.success) {
      const firstError = parseResult.error.flatten().fieldErrors
      const message =
        firstError.email?.[0] ??
        firstError.phone?.[0] ??
        firstError.firstName?.[0] ??
        firstError.lastName?.[0] ??
        firstError.company?.[0] ??
        firstError.companyVat?.[0] ??
        firstError.surfaceArea?.[0] ??
        firstError.annualElectricityBill?.[0] ??
        firstError.jobTitle?.[0] ??
        firstError.surfaceType?.[0] ??
        firstError.province?.[0] ??
        firstError.provinceFreeText?.[0] ??
        firstError.marketingConsent?.[0] ??
        "Données invalides. Vérifiez les champs."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parseResult.data

    const first_name = sanitizeString(data.firstName)
    const last_name = sanitizeString(data.lastName)
    const email = data.email.toLowerCase().trim()
    const phone = data.phone.replace(/[\s.-]/g, "")
    const job_title = data.jobTitle
      ? sanitizeString(data.jobTitle)
      : data.segment === "B2C"
        ? "Particulier"
        : "Non renseigné"
    const company = data.company ? sanitizeString(data.company) : null
    const company_vat = data.companyVat ? sanitizeString(data.companyVat, 32) : null
    const projectDetailsOnly = data.projectDetails ? sanitizeString(data.projectDetails, 2000) : null
    const provinceFreeSanitized = data.provinceFreeText ? sanitizeString(data.provinceFreeText, 400) : null
    const newsletterNote = data.newsletterConsent ? "Newsletter Aegis Solaire : Opt-in consenti" : null
    const projectDetailsText =
      [
        provinceFreeSanitized ? `Précision localisation : ${provinceFreeSanitized}` : null,
        projectDetailsOnly,
        newsletterNote,
      ]
        .filter(Boolean)
        .join("\n\n") || null

    const { score, status } = calculateLeadScore({
      firstName: first_name,
      lastName: last_name,
      jobTitle: job_title ?? "",
      surfaceArea: data.surfaceArea,
      annualElectricityBill: data.annualElectricityBill,
      segment: data.segment,
      grd: data.grd ?? null,
    })

    const validLeadStatuses = ["new", "contacted", "qualified", "converted", "lost", "NEEDS_HUMAN_REVIEW", "HOT_LEAD"]
    const safeStatus = validLeadStatuses.includes(status) ? status : "new"

    const credit_cost = calculateLeadCreditCost({
      segment: data.segment,
      surfaceArea: data.surfaceArea,
      surfaceType: data.surfaceType,
      annualBill: data.annualElectricityBill,
    })

    const supabase = createServiceRoleClient()

    const consentDate = new Date()
    const dataRetentionUntil = new Date()
    dataRetentionUntil.setFullYear(dataRetentionUntil.getFullYear() + 3)

    const mediaPartnerCode = data.mediaPartnerCode
      ? data.mediaPartnerCode.trim().slice(0, 50)
      : null

    const estimatedPowerKwc =
      data.segment === "B2B"
        ? Math.round(data.surfaceArea * 0.17 * 10) / 10
        : Math.round(data.surfaceArea * 0.16 * 10) / 10

    const extractedPostalCode =
      data.postalCode ??
      data.provinceFreeText?.match(/\b[1-9][0-9]{3}\b/)?.[0] ??
      null

    const safePostalCode =
      extractedPostalCode && /^[0-9]{4}$/.test(extractedPostalCode)
        ? extractedPostalCode
        : null

    const validSourceForms = [
      "b2b_simulator",
      "b2c_simulator",
      "b2c_devis_landing",
      "webinar_upsell",
      "manual_admin",
      "api_partner",
    ]
    const defaultSourceForm = data.segment === "B2B" ? "b2b_simulator" : "b2c_simulator"
    const safeSourceForm =
      data.sourceForm && validSourceForms.includes(data.sourceForm)
        ? data.sourceForm
        : defaultSourceForm

    const validRoofMaterials = ["tuiles", "ardoises", "plat_epdm", "bac_acier", "zinc_autre", "fibrociment_amiante"]
    const safeRoofMaterial = data.roofMaterial && validRoofMaterials.includes(data.roofMaterial) ? data.roofMaterial : null

    const validOwnership = ["owner", "tenant_authorized", "tenant_unauthorized", "co_ownership"]
    const safeOwnership = data.ownershipStatus && validOwnership.includes(data.ownershipStatus) ? data.ownershipStatus : null

    const insertPayload: Record<string, unknown> = {
      segment: data.segment,
      marketplace_status: "pending_review",
      credit_cost,
      media_partner_code: mediaPartnerCode,
      first_name,
      last_name,
      email,
      phone,
      job_title,
      company,
      message: projectDetailsText,
      project_details: projectDetailsText,
      objective: null,
      surface_type: data.surfaceType,
      surface_area: data.surfaceArea,
      province: data.province,
      grd: data.grd ?? null,
      company_vat,
      project_timeline: data.timeframe ?? null,
      annual_electricity_bill: data.annualElectricityBill,
      estimated_roi_years: data.estimatedROIYears ?? null,
      autoconsumption_rate: data.autoconsumptionRate ?? null,
      estimated_savings: data.estimatedSavings ?? null,
      marketing_consent: data.marketingConsent === true,
      consent_date: data.marketingConsent ? consentDate.toISOString() : null,
      data_retention_until: dataRetentionUntil.toISOString(),
      source: "simulator",
      status: safeStatus,
      lead_score: score,
      wants_irve: false,

      // --- Colonnes Canoniques Unifiées (Migration 024) ---
      source_form: safeSourceForm,
      ownership_status: safeOwnership,
      postal_code: safePostalCode,
      city: data.city ? sanitizeString(data.city, 100) : null,
      site_address: data.siteAddress ? sanitizeString(data.siteAddress, 255) : null,
      roof_material: safeRoofMaterial,
      surface_area_m2: data.surfaceArea,
      annual_bill_eur: data.annualElectricityBill,
      estimated_power_kwc: estimatedPowerKwc,
      project_driver: data.projectDriver ?? null,
      timeframe: data.timeframe ?? null,
      qualification_metadata: data.qualificationMetadata ?? {},

      // --- Tarification V2 Officielle ---
      pricing_version: "v2",
    }

    let { data: inserted, error } = await supabase.from("leads").insert(insertPayload).select().single()

    // Mécanisme de tolérance si la base de données n'a pas encore exécuté la migration 024
    if (error && (error.message?.includes("column") || error.code === "42703")) {
      const fallbackPayload = { ...insertPayload }
      delete fallbackPayload.source_form
      delete fallbackPayload.ownership_status
      delete fallbackPayload.postal_code
      delete fallbackPayload.city
      delete fallbackPayload.site_address
      delete fallbackPayload.roof_material
      delete fallbackPayload.surface_area_m2
      delete fallbackPayload.annual_bill_eur
      delete fallbackPayload.estimated_power_kwc
      delete fallbackPayload.project_driver
      delete fallbackPayload.timeframe
      delete fallbackPayload.qualification_metadata

      const fallbackResult = await supabase.from("leads").insert(fallbackPayload).select().single()
      inserted = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error("[API leads] Database error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      if (process.env.NODE_ENV === "development" && (error.message?.includes("fetch failed") || error.details?.includes("ENOTFOUND"))) {
        console.warn("[API leads] Supabase hors-ligne ou projet en pause en dev. Réponse simulée pour test local.")
        return NextResponse.json({
          success: true,
          message: "Lead simulé avec succès (mode dev)",
          leadId: "dev-" + crypto.randomUUID(),
        })
      }
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement. Veuillez réessayer." },
        { status: 500 }
      )
    }

    // Le lead est créé en 'pending_review' : aucune alerte partenaire n'est émise tant qu'un administrateur n'a pas audité et publié le dossier vers la marketplace.

    void sendProspectConfirmationEmail({
      email: data.email,
      firstName: first_name,
      lastName: last_name,
      segment: data.segment,
      surfaceType: data.surfaceType,
      surfaceArea: data.surfaceArea,
      annualElectricityBill: data.annualElectricityBill,
      estimatedSavings: data.estimatedSavings ?? null,
      estimatedROIYears: data.estimatedROIYears ?? null,
      province: data.province,
    }).catch((err) => console.error("[Prospect confirmation] envoi non bloquant échoué:", err))

    const webhookUrl = process.env.LEAD_WEBHOOK_URL
    const webhookSecret = process.env.LEAD_WEBHOOK_SECRET

    if (webhookUrl) {
      const payload = {
        // ... (same fields)
        id: inserted.id,
        first_name: inserted.first_name,
        last_name: inserted.last_name,
        email: inserted.email,
        phone: inserted.phone,
        job_title: inserted.job_title,
        company: inserted.company,
        company_vat: (inserted as { company_vat?: string }).company_vat ?? company_vat,
        message: (inserted as { project_details?: string | null; message?: string | null }).project_details
          ?? (inserted as { message?: string | null }).message
          ?? null,
        project_details: (inserted as { project_details?: string | null }).project_details ?? projectDetailsText,
        objective: inserted.objective ?? null,
        surface_type: inserted.surface_type,
        surface_area: inserted.surface_area,
        province: (inserted as { province?: string }).province ?? data.province,
        province_free_text: data.provinceFreeText ?? null,
        grd: (inserted as { grd?: string | null }).grd ?? data.grd ?? null,
        project_timeline: inserted.project_timeline ?? null,
        annual_electricity_bill: inserted.annual_electricity_bill,
        estimated_roi_years: inserted.estimated_roi_years,
        autoconsumption_rate: inserted.autoconsumption_rate,
        estimated_savings: inserted.estimated_savings,
        lead_score: inserted.lead_score ?? null,
        status: inserted.status,
        wants_irve: inserted.wants_irve ?? false,
        created_at: inserted.created_at,
      }

      const body = JSON.stringify(payload)
      const headers: Record<string, string> = { "Content-Type": "application/json" }

      // Signature HMAC si le secret est configuré
      if (webhookSecret) {
        const signature = createHmac("sha256", webhookSecret)
          .update(body)
          .digest("hex")
        headers["x-payload-signature"] = signature
      }

      fetch(webhookUrl, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(5000),
      }).catch((err) => console.error("Webhook delivery failed:", err))
    }

    // Déclenchement serveur Meta Conversions API (CAPI) pour tracking sans perte
    // Seuls les propriétaires confirmés (ou prospects B2B) nourrissent l'IA Meta pour ne pas fausser le ciblage
    const isMetaLeadEligible = data.segment === "B2B" || safeOwnership === "owner"
    if (isMetaLeadEligible) {
      const qualificationMeta = (data.qualificationMetadata || {}) as Record<string, unknown>
      const rawFbclid =
        (typeof qualificationMeta.fbclid === "string" && qualificationMeta.fbclid.trim() !== "" ? qualificationMeta.fbclid.trim() : undefined) ||
        (typeof body.fbclid === "string" && body.fbclid.trim() !== "" ? body.fbclid.trim() : undefined)

      sendMetaConversionApiLead({
        advertisingConsent: hasAdvertisingConsent(request.cookies.get(CONSENT_COOKIE)?.value),
        eventId: inserted.id,
        email,
        phone,
        firstName: first_name,
        lastName: last_name,
        postalCode: safePostalCode || undefined,
        countryCode: "be",
        segment: data.segment,
        clientIp: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        fbp: request.cookies.get("_fbp")?.value,
        fbc: request.cookies.get("_fbc")?.value,
        fbclid: rawFbclid,
      }).catch((e) => console.warn("[Meta CAPI trigger error]", e))
    }

    return NextResponse.json({
      success: true,
      message: "Lead enregistré avec succès",
      leadId: inserted.id,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez reessayer." },
      { status: 500 }
    )
  }
}
