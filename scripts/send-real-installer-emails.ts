import fs from "fs"
import path from "path"
import { Resend } from "resend"
import { renderInstallerLeadTeaserEmail } from "../lib/email-templates/installer-lead-teaser"
import { buildInstallerMarketplaceWelcomeEmail } from "../lib/installer-welcome-emails"
import { renderPartnerInviteHtml, buildPartnerInviteSubject, buildPartnerInvitePlainText } from "../lib/email-templates/fabrice-network-invite"

// 1. Charger variables d'environnement
const envFile = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8")
envFile.split("\n").forEach((line) => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=")
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      process.env[key] = val
    }
  }
})

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@aegissolaire.com"
const targetEmail = "mrnathanrem@gmail.com"

if (!resendApiKey) {
  console.error("Clé RESEND_API_KEY manquante !")
  process.exit(1)
}

const resend = new Resend(resendApiKey)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function run() {
  console.log(`Génération et envoi des vrais e-mails installateurs vers ${targetEmail}...`)

  const mockPartner = {
    id: "part-test-01",
    companyName: "SolarTech Wallonie SRL",
    contactName: "Marc",
    credits: 6,
  }

  const mockLeadB2C = {
    id: "lead-4000-884",
    segment: "B2C",
    province: "liege",
    postalCode: "4000",
    city: "Liège",
    surfaceType: "toiture",
    surfaceArea: 65,
    roofMaterial: "tuiles",
    annualElectricityBill: 3400,
    firstName: "Jean-Pierre",
    lastName: "Infantino",
    createdAt: new Date().toISOString(),
    ownershipStatus: "owner_occupied",
    projectDriver: "cost_reduction",
    timeframe: "3_months",
    projectDetails: "Maison 4 façades, toiture orientée Sud-Sud-Est sans ombre portée. Souhaite également étudier une batterie domestique 10 kWh.",
  }

  const financialsB2C = {
    estimatedPowerKwc: 8.5,
    estimatedPanelCount: 20,
    normalizedSurfaceAreaM2: 65,
    normalizedAnnualBill: 3400,
    estimatedContractValueRange: { min: 9500, max: 12500 },
    estimatedInstallerMargin: 3200,
    creditCost: 2,
    leadCostEuros: 23.0,
  }

  const mockLeadB2B = {
    id: "lead-4800-102",
    segment: "B2B",
    province: "liege",
    postalCode: "4800",
    city: "Verviers",
    surfaceType: "parking",
    surfaceArea: 380,
    roofMaterial: "bac_acier",
    annualElectricityBill: 16500,
    firstName: "Marc",
    lastName: "Vandamme",
    createdAt: new Date().toISOString(),
    ownershipStatus: "business_owner",
    projectDriver: "esg_compliance",
    timeframe: "immediate",
    projectDetails: "Ombrière de parking d'entreprise + toiture atelier. Raccordement moyenne tension cabine à proximité.",
  }

  const financialsB2B = {
    estimatedPowerKwc: 48,
    estimatedPanelCount: 114,
    normalizedSurfaceAreaM2: 380,
    normalizedAnnualBill: 16500,
    estimatedContractValueRange: { min: 42000, max: 56000 },
    estimatedInstallerMargin: 12500,
    creditCost: 5,
    leadCostEuros: 57.5,
  }

  // 1. Alerte Immédiate B2C
  const emailWave1B2C = renderInstallerLeadTeaserEmail({
    partner: mockPartner,
    lead: mockLeadB2C,
    waveNumber: 1,
    takenSlots: 0,
    maxSlots: 3,
    creditCost: 2,
    financials: financialsB2C as any,
  })

  // 2. Relance Disponibilité B2C (2 places restantes)
  const emailWave2B2C = renderInstallerLeadTeaserEmail({
    partner: mockPartner,
    lead: mockLeadB2C,
    waveNumber: 2,
    takenSlots: 1,
    maxSlots: 3,
    creditCost: 2,
    financials: financialsB2C as any,
  })

  // 3. Dernière Chance B2C (Plus qu'une place avant clôture)
  const emailWave3B2C = renderInstallerLeadTeaserEmail({
    partner: mockPartner,
    lead: mockLeadB2C,
    waveNumber: 3,
    takenSlots: 2,
    maxSlots: 3,
    creditCost: 2,
    financials: financialsB2C as any,
  })

  // 4. Projet B2B Professionnel Exclusif
  const emailWave1B2B = renderInstallerLeadTeaserEmail({
    partner: mockPartner,
    lead: mockLeadB2B,
    waveNumber: 1,
    takenSlots: 0,
    maxSlots: 1,
    creditCost: 5,
    financials: financialsB2B as any,
  })

  // 5. Bienvenue Marketplace (Compte validé + chantiers disponibles)
  const emailMarketplaceWelcome = buildInstallerMarketplaceWelcomeEmail({
    firstName: "Marc",
    companyName: "SolarTech Wallonie SRL",
    rescertNumber: "RESCERT-PV-2024-8841",
    marketplaceUrl: "https://www.aegissolaire.com/partenaires/dashboard",
    availableLeads: [
      {
        id: "lead-4000-884",
        segment: "B2C",
        provinceLabel: "Liège",
        city: "Liège",
        postalCode: "4000",
        surfaceArea: 65,
        estimatedPowerKwc: 8.5,
        remainingSlots: 2,
        maxSlots: 3,
        creditCost: 2,
      },
      {
        id: "lead-4800-102",
        segment: "B2B",
        provinceLabel: "Liège",
        city: "Verviers",
        postalCode: "4800",
        surfaceArea: 380,
        estimatedPowerKwc: 48,
        remainingSlots: 1,
        maxSlots: 1,
        creditCost: 5,
      },
    ],
  })

  // 6. Invitation Réseau Aegis Solaire
  const inviteData = {
    installerName: "Marc",
    companyName: "SolarTech Wallonie SRL",
    tone: "vouvoiement" as const,
    freeCredits: 3,
    includeCreditsText: true,
    inviteUrl: "https://www.aegissolaire.com/partenaires/invitation?code=AEGIS-OFFICIEL",
  }
  const emailPartnerInvite = {
    subject: buildPartnerInviteSubject(inviteData),
    text: buildPartnerInvitePlainText(inviteData),
    html: renderPartnerInviteHtml(inviteData),
  }

  const emails = [
    { label: "1. Alerte Immédiate Résidentiel B2C", email: emailWave1B2C },
    { label: "2. Relance Disponibilité Résidentiel B2C", email: emailWave2B2C },
    { label: "3. Clôture / Dernier Créneau Résidentiel B2C", email: emailWave3B2C },
    { label: "4. Alerte Projet Tertiaire B2B Exclusif", email: emailWave1B2B },
    { label: "5. Bienvenue Marketplace & Validation Compte", email: emailMarketplaceWelcome },
    { label: "6. Invitation Officielle Réseau Partenaires", email: emailPartnerInvite },
  ]

  for (const item of emails) {
    const { subject, text, html } = item.email

    // Contrôles stricts avant envoi
    if (/vague/i.test(subject) || /vague/i.test(html) || /vague/i.test(text)) {
      throw new Error(`Erreur : Le terme 'vague' est présent dans ${item.label}`)
    }
    if (/owner_occupied|cost_reduction|3_months/.test(html) || /owner_occupied|cost_reduction|3_months/.test(text)) {
      throw new Error(`Erreur : Code anglais brut détecté dans ${item.label}`)
    }
    if (/[🔒🛡️⚡🎯👉✅]/.test(html)) {
      throw new Error(`Erreur : Emojis non conformes détectés dans ${item.label}`)
    }

    console.log(`\nEnvoi réel : ${subject}`)

    const { data, error } = await resend.emails.send({
      from: `Aegis Solaire <${fromEmail}>`,
      to: targetEmail,
      subject: subject, // VRAI objet sans aucun préfixe
      text: text,
      html: html,
    })

    if (error) {
      console.error(`Échec pour ${item.label}:`, error)
    } else {
      console.log(`✓ Reçu par Resend (ID: ${data?.id})`)
    }

    await sleep(1200)
  }

  console.log("\nLes 6 vrais e-mails installateurs ont été expédiés avec succès !")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
