import { CONSENT_COOKIE, hasAdvertisingConsent } from "@/lib/advertising-consent"
import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { leadSubmitSchema } from "@/lib/leads-schema"
import { calculateLeadScore } from "@/lib/lead-score"
import {
  calculateLeadCreditCost,
  calculateMarketplaceFinancials,
  getLeadPricingTierMeta,
} from "@/lib/marketplace-pricing"
import { canonicalizeProjectDetailsText } from "@/lib/lead-display-helpers"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendProspectConfirmationEmail } from "@/lib/prospect-confirmation-email"
import { sendAdminNewLeadAlertEmail } from "@/lib/notify-admin-lead"
import { sendMetaConversionApiLead } from "@/lib/meta-capi"
import { shouldTrackMetaLeadConversion } from "@/lib/meta-lead-filter"
import {
  enrichLeadVerifications,
  type PhoneOtpStatus,
} from "@/lib/lead-verification-engine"
import { getBelgiumProvinceKeyFromPostalCode } from "@/lib/belgium-regions"
import {
  detectCityPostalContradiction,
  extractBelgianStreetAndNumber,
  isWalloonPostalCode,
  resolveLeadPhoneE164,
} from "@/lib/leads-validation"
import {
  isTwilioLookupEnabled,
  isTwilioPhoneOtpEnabled,
  lookupPhoneNumberTwilio,
  verifyPhoneVerificationProof,
} from "@/lib/twilio-verify"
import { createHmac } from "crypto"

function sanitizeString(input: string, maxLength = 255): string {
  const trimmed = String(input).trim().slice(0, maxLength)
  return trimmed.replace(/[<>]/g, "")
}

const MIN_FORM_FILL_TIME_MS = 4000

export function getClientIp(request: Request): string {
  // En environnement Next.js / Vercel, l'IP est injectée sur l'objet de requête
  const nextRequest = request as any
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  return nextRequest.ip || forwardedIp || realIp || "unknown"
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

    // Validation stricte du téléphone belge / français + preuve OTP Twilio si activée
    const phoneResolved = resolveLeadPhoneE164(data.phone, data.segment)
    if (!phoneResolved.valid || !phoneResolved.e164) {
      return NextResponse.json(
        { error: phoneResolved.error || "Numéro de téléphone invalide." },
        { status: 400 }
      )
    }
    const phone = phoneResolved.e164

    const verifiedPhoneProof = verifyPhoneVerificationProof(
      data.phoneVerificationToken,
      phone
    )
    // Mode Soft OTP : l'absence de jeton OTP ne bloque jamais la capture du lead.
    // L'étape de confirmation SMS/appel s'exécute en post-sauvegarde ou de façon optionnelle.
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
    const rawProjectDetailsText =
      [
        provinceFreeSanitized ? `Précision localisation : ${provinceFreeSanitized}` : null,
        projectDetailsOnly,
        newsletterNote,
      ]
        .filter(Boolean)
        .join("\n\n") || null
    const projectDetailsText = canonicalizeProjectDetailsText(rawProjectDetailsText)

    const { score, status, factors } = calculateLeadScore({
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
      timeframe: data.timeframe || null,
      projectTimeline: data.timeframe || null,
      wantsIrve: Boolean(
        data.projectDriver === "flotte_irve" ||
        (data.qualificationMetadata as Record<string, unknown> | undefined)?.wants_irve
      ),
      projectDetails: rawProjectDetailsText,
      qualificationMetadata:
        (data.qualificationMetadata as Record<string, unknown>) ?? null,
    })

    const supabase = createServiceRoleClient()

    const consentDate = new Date()
    const dataRetentionUntil = new Date()
    dataRetentionUntil.setFullYear(dataRetentionUntil.getFullYear() + 3)

    const mediaPartnerCode = data.mediaPartnerCode
      ? data.mediaPartnerCode.trim().slice(0, 50)
      : null

    const validRoofMaterials = ["tuiles", "ardoises", "plat_epdm", "bac_acier", "zinc_autre", "fibrociment_amiante"]
    const safeRoofMaterial = data.roofMaterial && validRoofMaterials.includes(data.roofMaterial) ? data.roofMaterial : null

    const validOwnership = ["owner", "tenant_authorized", "tenant_unauthorized", "co_ownership"]
    const safeOwnership = data.ownershipStatus && validOwnership.includes(data.ownershipStatus) ? data.ownershipStatus : null

    // Calcul d'ingénierie unifié via calculateMarketplaceFinancials (évite toute sur-évaluation)
    const financials = calculateMarketplaceFinancials({
      segment: data.segment,
      surfaceArea: data.surfaceArea,
      surfaceType: data.surfaceType,
      roofMaterial: safeRoofMaterial,
      annualBill: data.annualElectricityBill,
      creditCost: credit_cost,
      wantsIrve: Boolean(
        data.projectDriver === "flotte_irve" ||
        (data.qualificationMetadata as Record<string, unknown> | undefined)?.wants_irve
      ),
      timeframe: data.timeframe || null,
      projectDetails: rawProjectDetailsText,
      qualificationMetadata: (data.qualificationMetadata as Record<string, unknown>) ?? null,
    })

    const estimatedPowerKwc = financials.estimatedPowerKwc
    const computedRoiYears = data.estimatedROIYears ?? financials.estimatedRoiYears
    const computedAutoconsumption = data.autoconsumptionRate ?? financials.autoconsumptionRate
    const computedSavings = data.estimatedSavings ?? financials.revenueEstimatePerYear

    const extractedPostalCode =
      data.postalCode ??
      data.provinceFreeText?.match(/\b[1-9][0-9]{3}\b/)?.[0] ??
      data.siteAddress?.match(/(?:^|[,\s])([1-9][0-9]{3})(?=\s+[a-zA-ZÀ-ÿ]{2,}|$)/)?.[1] ??
      data.city?.match(/\b([1-9][0-9]{3})\b/)?.[1] ??
      null

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

    const safePostalCode =
      extractedPostalCode && /^[0-9]{4}$/.test(extractedPostalCode)
        ? extractedPostalCode
        : null

    const isB2cPublicWalloniaForm =
      data.segment === "B2C" &&
      safeSourceForm !== "manual_admin" &&
      safeSourceForm !== "api_partner"

    if (
      (isB2cPublicWalloniaForm && (!safePostalCode || !isWalloonPostalCode(safePostalCode))) ||
      (data.segment === "B2C" && safePostalCode && !isWalloonPostalCode(safePostalCode))
    ) {
      return NextResponse.json(
        {
          error:
            "Zone non couverte : notre comparateur RESCERT intervient exclusivement en Wallonie (codes postaux 1300-1499 et 4000-7999).",
        },
        { status: 400 }
      )
    }

    const canonicalProvince =
      (safePostalCode && getBelgiumProvinceKeyFromPostalCode(safePostalCode)) || data.province

    const isClaimingWalloniaProvince = [
      "liege",
      "hainaut",
      "namur",
      "luxembourg",
      "brabant_wallon",
    ].includes(canonicalProvince)

    const geoContradiction = detectCityPostalContradiction({
      postalCode: safePostalCode,
      city: data.city,
      siteAddress: data.siteAddress,
      walloniaOnly: data.segment === "B2C" || isClaimingWalloniaProvince,
    })
    if (geoContradiction) {
      return NextResponse.json({ error: geoContradiction }, { status: 400 })
    }

    const duplicateSinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Enrichissement & Contrôles automatiques en parallèle (DNS MX, SPW ICAR, BCE, Lookup opérateur, Doublons 30j)
    const [verifications, dupByEmailRes, dupByPhoneRes, lookupFallback] = await Promise.all([
      enrichLeadVerifications({
        email,
        phone,
        firstName: first_name,
        lastName: last_name,
        postalCode: safePostalCode,
        city: data.city,
        streetAddress: data.siteAddress,
        company,
        companyVat: company_vat,
        segment: data.segment,
      }),
      supabase
        .from("leads")
        .select("id, session_id, created_at, status")
        .eq("email", email)
        .gte("created_at", duplicateSinceIso)
        .neq("status", "draft_email_only")
        .limit(5),
      supabase
        .from("leads")
        .select("id, session_id, created_at, status")
        .eq("phone", phone)
        .gte("created_at", duplicateSinceIso)
        .neq("status", "draft_email_only")
        .limit(5),
      !verifiedPhoneProof && isTwilioLookupEnabled()
        ? lookupPhoneNumberTwilio(phone, { allowVoip: data.segment === "B2B" })
        : Promise.resolve(null),
    ])

    if (lookupFallback && lookupFallback.configured && !lookupFallback.valid && !lookupFallback.transientError) {
      return NextResponse.json(
        {
          error:
            lookupFallback.blockedReason ||
            "Ce numéro de téléphone n'est pas attribué ou semble virtuel.",
        },
        { status: 400 }
      )
    }

    const otpEnabled = isTwilioPhoneOtpEnabled()
    const isNonInteractiveForm = safeSourceForm === "manual_admin" || safeSourceForm === "api_partner"
    const initialOtpStatus: PhoneOtpStatus = verifiedPhoneProof
      ? "verified"
      : isNonInteractiveForm
        ? "not_applicable"
        : process.env.LEAD_PHONE_OTP_DISABLED === "true"
          ? "disabled"
          : !otpEnabled
            ? "not_configured"
            : "awaiting_send"
    const lookupCheckedAt = new Date().toISOString()

    if (verifiedPhoneProof) {
      verifications.phoneOtp = {
        verified: true,
        status: "verified",
        channel: verifiedPhoneProof.channel,
        verifiedAt: verifiedPhoneProof.verifiedAt,
        required: false,
      }
      verifications.twilioLookup = {
        configured: lookupFallback ? lookupFallback.configured : undefined,
        valid: true,
        lineType: verifiedPhoneProof.lineType ?? lookupFallback?.lineType ?? null,
        carrierName: verifiedPhoneProof.carrierName ?? lookupFallback?.carrierName ?? null,
        checkedAt: lookupCheckedAt,
      }
      verifications.globalTrustScoreDelta += 15
      verifications.trustBadges.push(
        verifiedPhoneProof.channel === "call"
          ? "Téléphone certifié par appel vocal OTP"
          : "Téléphone certifié par SMS OTP"
      )
    } else {
      verifications.phoneOtp = {
        verified: false,
        status: initialOtpStatus,
        channel: null,
        verifiedAt: null,
        required: false,
      }
      if (lookupFallback?.configured) {
        verifications.twilioLookup = {
          configured: true,
          valid: Boolean(lookupFallback.valid && !lookupFallback.transientError),
          countryCode: lookupFallback.countryCode,
          lineType: lookupFallback.lineType,
          carrierName: lookupFallback.carrierName,
          smsPumpingRiskLevel: lookupFallback.smsPumpingRiskLevel,
          smsPumpingRiskScore: lookupFallback.smsPumpingRiskScore,
          transientError: Boolean(lookupFallback.transientError),
          checkedAt: lookupCheckedAt,
        }
        if (lookupFallback.lineType === "voip" || lookupFallback.lineType === "nonFixedVoip") {
          verifications.globalTrustScoreDelta -= 10
          verifications.warningFlags.push("Ligne VoIP détectée (confirmation recommandée)")
        } else if (lookupFallback.valid && !lookupFallback.transientError) {
          verifications.trustBadges.push(
            `Ligne vérifiée opérateur${lookupFallback.carrierName ? ` (${lookupFallback.carrierName})` : ""}`
          )
        }
      } else {
        verifications.twilioLookup = {
          configured: false,
          valid: false,
          checkedAt: lookupCheckedAt,
        }
      }
    }

    // Blocage dur si le domaine e-mail n'existe pas / n'a pas de serveur MX ou est jetable
    if (!verifications.emailMx.valid && !verifications.emailMx.transientError) {
      return NextResponse.json(
        {
          error:
            verifications.emailMx.reason ||
            "Cette adresse e-mail ne peut pas recevoir de messages (domaine inexistant ou jetable).",
        },
        { status: 400 }
      )
    }

    // Blocage dur B2C en cas d'incohérence flagrante adresse/code postal SPW
    if (data.segment === "B2C" && verifications.walloniaAddress.postalMismatch) {
      return NextResponse.json(
        {
          error:
            "L'adresse saisie et le code postal ne correspondent pas en Wallonie. Veuillez vérifier votre rue et votre code postal.",
        },
        { status: 400 }
      )
    }

    const emailDups = (dupByEmailRes.data ?? []).filter(
      (r) => !data.sessionId || r.session_id !== data.sessionId
    )
    const phoneDups = (dupByPhoneRes.data ?? []).filter(
      (r) => !data.sessionId || r.session_id !== data.sessionId
    )
    const duplicateLeadIds = Array.from(
      new Set([...emailDups.map((r) => r.id), ...phoneDups.map((r) => r.id)])
    )
    const duplicateCheck = {
      hasDuplicatePhone: phoneDups.length > 0,
      hasDuplicateEmail: emailDups.length > 0,
      duplicateLeadIds,
      lastSubmittedAt:
        emailDups[0]?.created_at || phoneDups[0]?.created_at || null,
    }
    verifications.duplicateCheck = duplicateCheck
    if (duplicateCheck.hasDuplicatePhone || duplicateCheck.hasDuplicateEmail) {
      verifications.globalTrustScoreDelta -= 20
      verifications.warningFlags.push(
        duplicateCheck.hasDuplicatePhone && duplicateCheck.hasDuplicateEmail
          ? "Doublon exact détecté (< 30 jours : même e-mail et téléphone)"
          : duplicateCheck.hasDuplicatePhone
            ? "Doublon téléphone détecté (< 30 jours)"
            : "Doublon e-mail détecté (< 30 jours)"
      )
    }

    const finalScore = Math.max(0, Math.min(100, score + verifications.globalTrustScoreDelta))
    for (const badge of verifications.trustBadges) {
      factors.push({ label: `Vérification certifiée : ${badge}`, delta: 5 })
    }
    for (const warn of verifications.warningFlags) {
      factors.push({ label: `Alerte conformité : ${warn}`, delta: -15 })
    }

    const needsManualQuarantine =
      safeStatus === "NEEDS_HUMAN_REVIEW" ||
      safeOwnership === "tenant_unauthorized" ||
      finalScore < 45 ||
      duplicateCheck.hasDuplicatePhone ||
      duplicateCheck.hasDuplicateEmail ||
      (verifications.cbeCompany?.verified && !verifications.cbeCompany.active) ||
      (verifications.cbeCompany?.verified && verifications.cbeCompany.nameMatchesInput === false) ||
      (data.segment === "B2C" && !verifications.walloniaAddress.validInWallonia) ||
      Boolean(verifications.walloniaAddress.postalMismatch)

    const effectiveLeadStatus = needsManualQuarantine ? "NEEDS_HUMAN_REVIEW" : safeStatus

    const spwRes = verifications.walloniaAddress
    const resolvedCityRaw =
      (data.city && sanitizeString(data.city, 100)) ||
      spwRes.officialSection ||
      spwRes.officialCity ||
      null
    const parsedRawAddress = extractBelgianStreetAndNumber(data.siteAddress)
    const canonicalAddressText =
      spwRes.houseVerified && spwRes.canonicalStreet && spwRes.houseNumber
        ? `${spwRes.canonicalStreet} ${spwRes.houseNumber}${parsedRawAddress.box ? ` bte ${parsedRawAddress.box}` : ""}`
        : data.siteAddress
          ? sanitizeString(data.siteAddress, 255)
          : null

    let existingSessionLead: {
      id: string
      status: string | null
      email: string | null
      qualification_metadata?: Record<string, unknown> | null
    } | null = null
    if (data.sessionId) {
      const { data: ex } = await supabase
        .from("leads")
        .select("id, status, email, qualification_metadata")
        .eq("session_id", data.sessionId)
        .maybeSingle()
      existingSessionLead = ex ?? null
    }
    const isResubmitSameFinalizedSession = Boolean(
      existingSessionLead && existingSessionLead.status !== "draft_email_only"
    )

    const existingSessionMeta =
      existingSessionLead?.qualification_metadata &&
        typeof existingSessionLead.qualification_metadata === "object"
        ? (existingSessionLead.qualification_metadata as Record<string, unknown>)
        : {}
    const alreadySentAdminAlert = existingSessionMeta.admin_alert_status === "sent"
    const shouldDeferAdminAlert = otpEnabled && !verifiedPhoneProof && !isNonInteractiveForm
    const adminAlertNowIso = new Date().toISOString()

    const adminAlertTrackingMeta: Record<string, unknown> = alreadySentAdminAlert
      ? {
        admin_alert_status: "sent",
        ...(existingSessionMeta.admin_alert_sent_at
          ? { admin_alert_sent_at: existingSessionMeta.admin_alert_sent_at }
          : {}),
        ...(existingSessionMeta.admin_alert_trigger
          ? { admin_alert_trigger: existingSessionMeta.admin_alert_trigger }
          : {}),
      }
      : shouldDeferAdminAlert
        ? {
          admin_alert_status: "pending_otp",
          admin_alert_deferred_at: adminAlertNowIso,
        }
        : {
          admin_alert_status: "sent",
          admin_alert_sent_at: adminAlertNowIso,
          admin_alert_trigger: verifiedPhoneProof ? "immediate_otp_verified" : "immediate",
        }

    const resolvedAllocationMode =
      data.segment === "B2B"
        ? "b2b_tender_2"
        : data.allocationMode === "single_vetted"
          ? "single_vetted"
          : "shared_3"
    const resolvedMaxSlots =
      data.segment === "B2B"
        ? 2
        : resolvedAllocationMode === "single_vetted"
          ? 1
          : 3

    const insertPayload: Record<string, unknown> = {
      segment: data.segment,
      marketplace_status: "pending_review",
      credit_cost,
      max_slots: resolvedMaxSlots,
      allocation_mode: resolvedAllocationMode,
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
      surface_area: financials.normalizedSurfaceAreaM2,
      province: canonicalProvince,
      grd: data.grd ?? null,
      company_vat,
      project_timeline: data.timeframe ?? null,
      annual_electricity_bill: financials.normalizedAnnualBill,
      estimated_roi_years: computedRoiYears,
      autoconsumption_rate: computedAutoconsumption,
      estimated_savings: computedSavings,
      marketing_consent: data.marketingConsent === true,
      consent_date: data.marketingConsent ? consentDate.toISOString() : null,
      data_retention_until: dataRetentionUntil.toISOString(),
      source: "simulator",
      status: effectiveLeadStatus,
      lead_score: finalScore,
      wants_irve: financials.includesEv,

      // --- Colonnes Canoniques Unifiées (Migration 024) ---
      source_form: safeSourceForm,
      ownership_status: safeOwnership,
      postal_code: safePostalCode,
      city: resolvedCityRaw,
      site_address: canonicalAddressText,
      roof_material: safeRoofMaterial,
      surface_area_m2: financials.normalizedSurfaceAreaM2,
      annual_bill_eur: financials.normalizedAnnualBill,
      estimated_power_kwc: estimatedPowerKwc,
      project_driver: data.projectDriver ?? null,
      timeframe: data.timeframe ?? null,
      qualification_metadata: {
        ...(data.qualificationMetadata ?? {}),
        ...adminAlertTrackingMeta,
        allocation_mode: resolvedAllocationMode,
        estimatedPanelCount: financials.estimatedPanelCount,
        annualProductionKwh: financials.annualProductionKwh,
        usableSurfaceM2: financials.usableSurfaceM2,
        verifications: {
          emailMx: verifications.emailMx,
          walloniaAddress: verifications.walloniaAddress,
          cbeCompany: verifications.cbeCompany,
          phoneAnalysis: verifications.phoneAnalysis,
          phoneOtp: verifications.phoneOtp,
          twilioLookup: verifications.twilioLookup,
          identityAnalysis: verifications.identityAnalysis,
          duplicateCheck: verifications.duplicateCheck,
          trustBadges: verifications.trustBadges,
          warningFlags: verifications.warningFlags,
        },
      },

      // --- Certification Téléphonique (Migration 202611180004) ---
      phone_verified: Boolean(verifiedPhoneProof),
      phone_verified_at: verifiedPhoneProof?.verifiedAt ?? null,
      phone_verification_method: verifiedPhoneProof
        ? verifiedPhoneProof.channel === "call"
          ? "twilio_call"
          : verifiedPhoneProof.channel === "dev_mock"
            ? "dev_mock"
            : "twilio_sms"
        : lookupFallback?.configured && lookupFallback.valid && !lookupFallback.transientError
          ? "twilio_lookup"
          : null,
      phone_carrier: verifiedPhoneProof?.carrierName ?? lookupFallback?.carrierName ?? null,
      phone_line_type:
        verifiedPhoneProof?.lineType ??
        lookupFallback?.lineType ??
        verifications.phoneAnalysis?.lineType ??
        null,

      // --- Tarification V2 Officielle ---
      pricing_version: "v2",

      // --- Colonnes Mise en Concurrence (Migration 202611090001) ---
      session_id: data.sessionId || null,
      contact_preference: data.contactPreference === "direct_call" ? "direct_call" : "written_first",
      matched_province: canonicalProvince,
    }

    let inserted: any = null
    let error: any = null

    if (data.sessionId) {
      const upsertRes = await supabase
        .from("leads")
        .upsert(insertPayload, { onConflict: "session_id" })
        .select()
        .single()
      inserted = upsertRes.data
      error = upsertRes.error
    } else {
      const insertRes = await supabase.from("leads").insert(insertPayload).select().single()
      inserted = insertRes.data
      error = insertRes.error
    }

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
      delete fallbackPayload.phone_verified
      delete fallbackPayload.phone_verified_at
      delete fallbackPayload.phone_verification_method
      delete fallbackPayload.phone_carrier
      delete fallbackPayload.phone_line_type
      delete fallbackPayload.allocation_mode
      delete fallbackPayload.max_slots

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

    // Notifications transactionnelles critiques avec attente (garantit l'envoi sous serverless Vercel)
    const emailTasks: Promise<unknown>[] = []
    const shouldSendProspectConfirmation =
      !isResubmitSameFinalizedSession || existingSessionLead?.email !== email

    if (shouldSendProspectConfirmation) {
      emailTasks.push(
        sendProspectConfirmationEmail({
          leadId: inserted.id,
          email: data.email,
          firstName: first_name,
          lastName: last_name,
          segment: data.segment,
          surfaceType: data.surfaceType,
          surfaceArea: financials.normalizedSurfaceAreaM2,
          annualElectricityBill: financials.normalizedAnnualBill,
          estimatedSavings: computedSavings,
          estimatedROIYears: computedRoiYears,
          province: canonicalProvince,
          allocationMode: resolvedAllocationMode,
        })
          .then(async (res) => {
            if (res.success && res.emailId) {
              await supabase
                .from("leads")
                .update({
                  resend_last_email_id: res.emailId,
                  email_delivery_status: "sent",
                })
                .eq("id", inserted.id)
                .then(() => undefined, () => undefined)
            }
          })
          .catch((err) => {
            console.error("[Prospect confirmation] Envoi échoué:", err)
          })
      )
    }

    if (!alreadySentAdminAlert && !shouldDeferAdminAlert) {
      // Alerte immédiate à l'administrateur lorsque l'OTP n'est pas en attente (déjà vérifié, désactivé ou saisie interne)
      emailTasks.push(
        sendAdminNewLeadAlertEmail({
          leadId: inserted.id,
          firstName: first_name,
          lastName: last_name,
          email,
          phone,
          phoneVerified: Boolean(verifiedPhoneProof),
          phoneVerifiedAt: verifiedPhoneProof?.verifiedAt ?? null,
          phoneVerificationMethod: (insertPayload.phone_verification_method as string | null) ?? null,
          phoneCarrier: (insertPayload.phone_carrier as string | null) ?? null,
          phoneLineType: (insertPayload.phone_line_type as string | null) ?? null,
          createdAt: inserted.created_at ?? adminAlertNowIso,
          company,
          companyVat: company_vat,
          jobTitle: job_title,
          segment: data.segment,
          surfaceType: data.surfaceType,
          surfaceArea: financials.normalizedSurfaceAreaM2,
          annualBill: financials.normalizedAnnualBill,
          estimatedSavings: computedSavings,
          estimatedROIYears: computedRoiYears,
          estimatedPowerKwc,
          annualProductionKwh: financials.annualProductionKwh,
          estimatedPanelCount: financials.estimatedPanelCount,
          autoconsumptionRate: computedAutoconsumption,
          wantsIrve: financials.includesEv,
          province: canonicalProvince,
          postalCode: safePostalCode,
          city: resolvedCityRaw,
          siteAddress: canonicalAddressText,
          grd: data.grd ?? null,
          ownershipStatus: safeOwnership,
          timeframe: data.timeframe ?? null,
          roofMaterial: safeRoofMaterial,
          leadScore: finalScore,
          scoreStatus: effectiveLeadStatus,
          scoreFactors: factors,
          creditCost: credit_cost,
          sourceForm: safeSourceForm,
          mediaPartnerCode,
          message: projectDetailsText,
          verifications,
          contactPreference: data.contactPreference || "written_first",
        })
          .then(async (res) => {
            if (!res.success) {
              const currentMeta =
                inserted.qualification_metadata &&
                  typeof inserted.qualification_metadata === "object"
                  ? (inserted.qualification_metadata as Record<string, unknown>)
                  : {}
              await supabase
                .from("leads")
                .update({
                  qualification_metadata: {
                    ...currentMeta,
                    admin_alert_status: "pending_otp",
                    admin_alert_last_error: res.error || "send_failed",
                  },
                })
                .eq("id", inserted.id)
                .then(() => undefined, () => undefined)
            }
          })
          .catch((err) => {
            console.error("[Admin Lead Alert] Envoi échoué:", err)
          })
      )
    }

    if (!isResubmitSameFinalizedSession) {
      // Télémétrie d'entonnoir final (Step 6 submitted)
      if (data.sessionId) {
        emailTasks.push(
          Promise.resolve(
            supabase.from("funnel_step_events").insert({
              session_id: data.sessionId,
              step_number: 6,
              step_name: "STEP_6_SUBMITTED",
              province: canonicalProvince,
              utm_source: ((data.qualificationMetadata as Record<string, unknown>)?.utm_source as string) || null,
              utm_campaign: ((data.qualificationMetadata as Record<string, unknown>)?.utm_campaign as string) || null,
              utm_content: ((data.qualificationMetadata as Record<string, unknown>)?.utm_content as string) || null,
              utm_term: ((data.qualificationMetadata as Record<string, unknown>)?.utm_term as string) || null,
            })
          ).catch((err) => {
            console.error("[Funnel Step] Step 6 event failed:", err)
          })
        )
      }
    }

    // On attend que les notifications et la télémétrie se finalisent avant de fermer la réponse HTTP
    await Promise.allSettled(emailTasks)

    const webhookUrl = process.env.LEAD_WEBHOOK_URL
    const webhookSecret = process.env.LEAD_WEBHOOK_SECRET

    if (webhookUrl && !isResubmitSameFinalizedSession) {
      const payload = {
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

      const bodyStr = JSON.stringify(payload)
      const headers: Record<string, string> = { "Content-Type": "application/json" }

      // Signature HMAC si le secret est configuré
      if (webhookSecret) {
        const signature = createHmac("sha256", webhookSecret)
          .update(bodyStr)
          .digest("hex")
        headers["x-payload-signature"] = signature
      }

      fetch(webhookUrl, {
        method: "POST",
        headers,
        body: bodyStr,
        signal: AbortSignal.timeout(5000),
      }).catch((err) => console.error("Webhook delivery failed:", err))
    }

    // Déclenchement serveur Meta Conversions API (CAPI) pour tracking sans perte
    // Seuls les propriétaires confirmés (ou prospects B2B) valides et non internes nourrissent l'IA Meta
    const isMetaLeadEligible = shouldTrackMetaLeadConversion({
      email,
      phone,
      segment: data.segment,
      ownershipStatus: safeOwnership,
      isResubmitSameFinalizedSession,
      hasDuplicateEmail: duplicateCheck.hasDuplicateEmail,
      hasDuplicatePhone: duplicateCheck.hasDuplicatePhone,
      finalScore,
      lineType: verifiedPhoneProof?.lineType ?? lookupFallback?.lineType ?? null,
      phoneVerified: Boolean(verifiedPhoneProof),
    })
    if (isMetaLeadEligible) {
      const qualificationMeta = (data.qualificationMetadata || {}) as Record<string, unknown>
      const rawFbclid =
        (typeof qualificationMeta.fbclid === "string" && qualificationMeta.fbclid.trim() !== "" ? qualificationMeta.fbclid.trim() : undefined) ||
        (typeof body.fbclid === "string" && body.fbclid.trim() !== "" ? body.fbclid.trim() : undefined)

      const sourceUrl =
        (typeof body.sourceUrl === "string" && body.sourceUrl.startsWith("http") ? body.sourceUrl : undefined) ||
        request.headers.get("referer") ||
        undefined

      try {
        const capiSent = await sendMetaConversionApiLead({
          advertisingConsent: true,
          eventId: inserted.id,
          email,
          phone,
          firstName: first_name,
          lastName: last_name,
          postalCode: safePostalCode || undefined,
          countryCode: "be",
          segment: data.segment,
          sourceUrl,
          clientIp: getClientIp(request),
          userAgent: request.headers.get("user-agent") || undefined,
          fbp: request.cookies.get("_fbp")?.value,
          fbc: request.cookies.get("_fbc")?.value,
          fbclid: rawFbclid,
        })
        if (capiSent) {
          const baseMeta =
            inserted.qualification_metadata &&
              typeof inserted.qualification_metadata === "object"
              ? (inserted.qualification_metadata as Record<string, unknown>)
              : {}
          await supabase
            .from("leads")
            .update({
              qualification_metadata: {
                ...baseMeta,
                meta_capi_lead_sent_at: new Date().toISOString(),
                meta_capi_lead_source: "initial_submit",
              },
            })
            .eq("id", inserted.id)
            .then(() => undefined, () => undefined)
        }
      } catch (e) {
        console.warn("[Meta CAPI trigger error]", e)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lead enregistré avec succès",
      leadId: inserted.id,
      alreadyTracked: isResubmitSameFinalizedSession,
      shouldTrackLead: isMetaLeadEligible,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez reessayer." },
      { status: 500 }
    )
  }
}
