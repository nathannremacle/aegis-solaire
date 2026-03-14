import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Validation helpers
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone: string): boolean {
  // Accept French phone numbers (10 digits, may include spaces/dots/dashes)
  const cleanPhone = phone.replace(/[\s.-]/g, "")
  return /^(0|\+33)[1-9][0-9]{8}$/.test(cleanPhone)
}

function sanitizeString(input: string): string {
  return input.trim().slice(0, 255)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract and validate required fields
    const {
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      company,
      surfaceType,
      surfaceArea,
      annualElectricityBill,
      estimatedROIYears,
      autoconsumptionRate,
      estimatedSavings,
      marketingConsent,
    } = body

    // Validation
    if (!firstName || firstName.length < 2) {
      return NextResponse.json(
        { error: "Le prenom est requis (minimum 2 caracteres)" },
        { status: 400 }
      )
    }

    if (!lastName || lastName.length < 2) {
      return NextResponse.json(
        { error: "Le nom est requis (minimum 2 caracteres)" },
        { status: 400 }
      )
    }

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      )
    }

    if (!phone || !validatePhone(phone)) {
      return NextResponse.json(
        { error: "Numero de telephone invalide" },
        { status: 400 }
      )
    }

    if (!jobTitle) {
      return NextResponse.json(
        { error: "La fonction est requise" },
        { status: 400 }
      )
    }

    if (!surfaceType || !["toiture", "parking", "friche"].includes(surfaceType)) {
      return NextResponse.json(
        { error: "Type de surface invalide" },
        { status: 400 }
      )
    }

    const minSurface = surfaceType === "parking" ? 1500 : 500
    if (!surfaceArea || surfaceArea < minSurface) {
      return NextResponse.json(
        {
          error:
            surfaceType === "parking"
              ? "Surface minimum de 1 500 m² requise pour un parking (Loi LOM)."
              : "Surface minimum de 500 m² requise.",
        },
        { status: 400 }
      )
    }

    if (!annualElectricityBill || annualElectricityBill < 5000) {
      return NextResponse.json(
        { error: "Facture annuelle minimum de 5 000 € requise pour une étude B2B." },
        { status: 400 }
      )
    }

    // Filtrage B2B : refuser les emails de messagerie grand public (particuliers hors cible)
    const freeEmailDomains = [
      "gmail.com", "googlemail.com", "hotmail.com", "hotmail.fr", "live.com",
      "outlook.com", "outlook.fr", "yahoo.com", "yahoo.fr", "orange.fr",
      "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "icloud.com",
    ]
    const emailDomain = email.split("@")[1]?.toLowerCase()
    if (emailDomain && freeEmailDomains.includes(emailDomain)) {
      return NextResponse.json(
        {
          error:
            "Merci de renseigner une adresse email professionnelle pour recevoir votre audit B2B.",
        },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Calculate RGPD data retention (3 years from now)
    const consentDate = new Date()
    const dataRetentionUntil = new Date()
    dataRetentionUntil.setFullYear(dataRetentionUntil.getFullYear() + 3)

    // Insert lead into database
    const { data, error } = await supabase
      .from("leads")
      .insert({
        first_name: sanitizeString(firstName),
        last_name: sanitizeString(lastName),
        email: email.toLowerCase().trim(),
        phone: phone.replace(/[\s.-]/g, ""),
        job_title: sanitizeString(jobTitle),
        company: company ? sanitizeString(company) : null,
        surface_type: surfaceType,
        surface_area: surfaceArea,
        annual_electricity_bill: annualElectricityBill,
        estimated_roi_years: estimatedROIYears,
        autoconsumption_rate: autoconsumptionRate,
        estimated_savings: estimatedSavings,
        marketing_consent: marketingConsent === true,
        consent_date: marketingConsent ? consentDate.toISOString() : null,
        data_retention_until: dataRetentionUntil.toISOString(),
        source: "simulator",
        status: "new",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement. Veuillez réessayer." },
        { status: 500 }
      )
    }

    // Distribution temps réel : webhook optionnel vers CRM ou installateur partenaire
    const webhookUrl = process.env.LEAD_WEBHOOK_URL
    if (webhookUrl) {
      const payload = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        job_title: data.job_title,
        company: data.company,
        surface_type: data.surface_type,
        surface_area: data.surface_area,
        annual_electricity_bill: data.annual_electricity_bill,
        estimated_roi_years: data.estimated_roi_years,
        autoconsumption_rate: data.autoconsumption_rate,
        estimated_savings: data.estimated_savings,
        created_at: data.created_at,
      }
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }).catch((err) => console.error("Webhook delivery failed:", err))
    }

    return NextResponse.json({
      success: true,
      message: "Lead enregistré avec succès",
      leadId: data.id,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez reessayer." },
      { status: 500 }
    )
  }
}
