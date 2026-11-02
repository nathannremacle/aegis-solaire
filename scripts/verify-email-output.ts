import fs from "fs"
import path from "path"
import { renderInstallerLeadTeaserEmail } from "../lib/email-templates/installer-lead-teaser"

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
  ownershipStatus: "owner_occupied", // English raw key test
  projectDriver: "cost_reduction",   // English raw key test
  timeframe: "3_months",             // English raw key test
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

const res = renderInstallerLeadTeaserEmail({
  partner: mockPartner,
  lead: mockLeadB2C,
  waveNumber: 1,
  takenSlots: 0,
  maxSlots: 3,
  creditCost: 2,
  financials: financialsB2C as any,
})

console.log("SUBJECT:", res.subject)
console.log("\nTEXT PREVIEW:\n", res.text.slice(0, 700))

// Verification
const checks = [
  { name: "No 'vague'", pass: !/vague/i.test(res.subject) && !/vague/i.test(res.html) },
  { name: "No 'owner_occupied'", pass: !res.html.includes("owner_occupied") && !res.text.includes("owner_occupied") },
  { name: "No 'cost_reduction'", pass: !res.html.includes("cost_reduction") && !res.text.includes("cost_reduction") },
  { name: "No '3_months'", pass: !res.html.includes("3_months") && !res.text.includes("3_months") },
  { name: "Has 'Propriétaire occupant'", pass: res.html.includes("Propriétaire occupant") },
  { name: "No emojis in HTML", pass: !/[🔒🛡️⚡🎯👉✅]/.test(res.html) },
  { name: "Consistent button", pass: (res.html.match(/Consulter la fiche et obtenir les coordonnées/g) || []).length === 2 },
]

console.log("\nCHECKS:")
checks.forEach(c => console.log(`- ${c.name}: ${c.pass ? "OK" : "FAIL"}`))
