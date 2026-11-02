import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

const envContent = fs.readFileSync(".env.local", "utf8")
const env = {}
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const idx = trimmed.indexOf("=")
  if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
}

process.env.RESEND_API_KEY = env.RESEND_API_KEY
process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL || "noreply@aegissolaire.com"
process.env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
process.env.ADMIN_ALERT_EMAIL = "mrnathanrem@gmail.com"
process.env.CBE_API_KEY = env.CBE_API_KEY

const { sendAdminNewLeadAlertEmail } = await import("../lib/notify-admin-lead.ts")
const { enrichLeadVerifications } = await import("../lib/lead-verification-engine.ts")

async function main() {
  console.log("=== ENVOI DU NOUVEAU MAIL D'ALERTE AVEC LES VIGILANCES & CBE/SPW/MX ===")
  
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", "5b4db5f5-4e3d-493e-9e05-ebb063381466")
    .single()

  if (fetchErr || !lead) {
    console.error("❌ Lead introuvable:", fetchErr)
    return
  }

  console.log(`Lead récupéré : ${lead.first_name} ${lead.last_name} (${lead.company}) - TVA: ${lead.company_vat}`)

  // Exécution réelle des 3 vérifications (MX, SPW, CBE)
  const verifications = await enrichLeadVerifications({
    email: lead.email,
    postalCode: lead.postal_code,
    city: lead.city,
    streetAddress: lead.site_address,
    companyVat: lead.company_vat,
    segment: lead.segment,
  })

  console.log("Résultat des vérifications :", {
    emailMxValid: verifications.emailMx.valid,
    walloniaValid: verifications.walloniaAddress.validInWallonia,
    cbeStatus: verifications.cbeCompany,
    flags: verifications.warningFlags,
    badges: verifications.trustBadges,
  })

  const result = await sendAdminNewLeadAlertEmail({
    leadId: lead.id,
    firstName: lead.first_name,
    lastName: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    companyVat: lead.company_vat,
    jobTitle: lead.job_title,
    segment: lead.segment,
    surfaceType: lead.surface_type,
    surfaceArea: lead.surface_area,
    annualBill: lead.annual_electricity_bill,
    estimatedSavings: lead.estimated_savings,
    estimatedROIYears: lead.estimated_roi_years,
    estimatedPowerKwc: lead.estimated_power_kwc,
    annualProductionKwh: 172000,
    estimatedPanelCount: 420,
    autoconsumptionRate: lead.autoconsumption_rate,
    wantsIrve: lead.wants_irve,
    province: lead.province,
    postalCode: lead.postal_code,
    city: lead.city,
    siteAddress: lead.site_address,
    grd: lead.grd,
    ownershipStatus: lead.ownership_status,
    timeframe: lead.timeframe,
    roofMaterial: lead.roof_material,
    leadScore: lead.lead_score,
    scoreStatus: "HOT_LEAD",
    scoreFactors: [
      { label: "Facture annuelle d'électricité > 15 000 €", delta: 15 },
      { label: "Grande surface industrielle (≥ 500 m²)", delta: 15 },
      { label: "Décideur identifié (Directeur des Opérations)", delta: 20 },
      { label: "Gestionnaire réseau spécifié (ORES)", delta: 5 },
      { label: "Projet propriétaire avec compteur cabine MT", delta: 15 },
    ],
    creditCost: lead.credit_cost,
    sourceForm: lead.source_form,
    mediaPartnerCode: null,
    message: lead.message,
    verifications,
  })

  console.log("Résultat de l'envoi :", result)
}

main().catch(console.error)
