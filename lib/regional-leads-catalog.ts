export interface InvitationLeadSummary {
  id: string
  postalCode: string
  city: string
  province: string
  provinceKey: string
  segment: "B2C" | "B2B"
  segmentLabel: string
  surfaceLabel: string
  surfaceType: string
  surfaceAreaM2: number
  powerLabel: string
  estimatedPowerKwc: number
  billLabel: string
  annualBillEur: number
  roofMaterial: string
  ownershipStatus: string
  timeframe: string
  projectDriver: string
  grd: string
  creditCost: number
  maxSlots: number
  imageUrl: string
  projectDetails: string
  isShowcaseOnly: boolean
  createdAt: string
}

const WEMMEL_LEAD: InvitationLeadSummary = {
  id: "e597cc47-01f2-47e4-a953-c7e6902b2028",
  postalCode: "1780",
  city: "Wemmel",
  province: "Bruxelles-Nord / Brabant",
  provinceKey: "brabant_wallon",
  segment: "B2C",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture 42 m² tuiles",
  surfaceType: "toiture",
  surfaceAreaM2: 42,
  powerLabel: "Puissance recommandée ~5,4 kWc",
  estimatedPowerKwc: 5.4,
  billLabel: "1 150 €/an facture",
  annualBillEur: 1150,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "autoconsommation",
  grd: "Fluvius / ORES",
  creditCost: 3,
  maxSlots: 3,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-wemmel-1780-blurred.jpg",
  projectDetails:
    "Maison unifamiliale à Wemmel (1780). Toiture tuiles 42 m², puissance recommandée ~5,4 kWc.",
  isShowcaseOnly: false,
  createdAt: "2026-11-11T10:25:37.556Z",
}

const ROLY_LEAD: InvitationLeadSummary = {
  id: "413e8eae-8168-4907-bcaa-558204ac6aba",
  postalCode: "5600",
  city: "Roly",
  province: "Namur",
  provinceKey: "namur",
  segment: "B2C",
  segmentLabel: "Maison 4 façades",
  surfaceLabel: "Toiture ~65 m² tuiles",
  surfaceType: "toiture",
  surfaceAreaM2: 65,
  powerLabel: "Puissance recommandée ~6,1 kWc (14 panneaux)",
  estimatedPowerKwc: 6.1,
  billLabel: "2 300 €/an (> 6 000 kWh)",
  annualBillEur: 2300,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "autoconsommation",
  grd: "ORES",
  creditCost: 3,
  maxSlots: 3,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-roly-5600-blurred.jpg",
  projectDetails:
    "Maison 4 façades à Roly (5600). Grande toiture tuiles ~65 m², consommation > 6 000 kWh/an, appel direct autorisé (9h-18h).",
  isShowcaseOnly: false,
  createdAt: "2026-11-13T10:45:38.149Z",
}

const GERPINNES_LEAD: InvitationLeadSummary = {
  id: "bd3d6c78-0acb-4b59-8f96-ff9817f634f7",
  postalCode: "6280",
  city: "Gerpinnes",
  province: "Lisière Namur / Entre-Sambre-et-Meuse",
  provinceKey: "hainaut",
  segment: "B2C",
  segmentLabel: "Maison 4 façades isolée",
  surfaceLabel: "Toiture ~42 m² tuiles",
  surfaceType: "toiture",
  surfaceAreaM2: 42,
  powerLabel: "Puissance recommandée ~4,8 kWc (11 panneaux)",
  estimatedPowerKwc: 4.8,
  billLabel: "1 820 €/an (5 000 – 6 000 kWh)",
  annualBillEur: 1820,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "autoconsommation",
  grd: "ORES",
  creditCost: 3,
  maxSlots: 3,
  imageUrl: "",
  projectDetails:
    "Maison 4 façades isolée à Gerpinnes (6280). Adresse exacte certifiée SPW ICAR, toiture tuiles ~42 m², consommation 5 000 à 6 000 kWh/an.",
  isShowcaseOnly: false,
  createdAt: "2026-11-14T09:15:22.876Z",
}

const NAMECHE_LEAD: InvitationLeadSummary = {
  id: "a63dd867-8e1c-47e9-b4d0-93818b0a667a",
  postalCode: "5300",
  city: "Namêche",
  province: "Namur / Andenne",
  provinceKey: "namur",
  segment: "B2C",
  segmentLabel: "Maison 4 façades",
  surfaceLabel: "Toiture 42 m² tuiles",
  surfaceType: "toiture",
  surfaceAreaM2: 42,
  powerLabel: "Puissance recommandée ~3,0 kWc (7 panneaux)",
  estimatedPowerKwc: 3.0,
  billLabel: "1 150 €/an (3 500 kWh)",
  annualBillEur: 1150,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "autoconsommation",
  grd: "ORES",
  creditCost: 3,
  maxSlots: 3,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-nameche-5300-blurred.jpg",
  projectDetails:
    "Maison 4 façades à Namêche (5300 Andenne). Adresse exacte certifiée SPW ICAR, toiture tuiles 42 m², consommation 3 500 kWh/an.",
  isShowcaseOnly: false,
  createdAt: "2026-11-13T09:22:40.453Z",
}

const OUPEYE_LEAD: InvitationLeadSummary = {
  id: "lead_oupeye_alfieri_4680",
  postalCode: "4680",
  city: "Oupeye",
  province: "Liège",
  provinceKey: "liege",
  segment: "B2C",
  segmentLabel: "Maison unifamiliale (extension)",
  surfaceLabel: "Extension toiture tuiles terre cuite",
  surfaceType: "toiture",
  surfaceAreaM2: 36,
  powerLabel: "Onduleur 10 kVA & Batterie 10 kWh",
  estimatedPowerKwc: 6.2,
  billLabel: "1 800 €/an (5 300 kWh)",
  annualBillEur: 1800,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "autoconsommation",
  grd: "RESA",
  creditCost: 3,
  maxSlots: 2,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-oupeye-4680-blurred.jpg",
  projectDetails:
    "Extension photovoltaïque (+4 panneaux 460 Wc), remplacement vers onduleur hybride 10 kVA et installation d'une batterie de stockage 10 kWh.",
  isShowcaseOnly: true,
  createdAt: "2026-11-11T09:15:00.000Z",
}

const REMICOURT_LEAD: InvitationLeadSummary = {
  id: "lead_remicourt_mathieu_4350",
  postalCode: "4350",
  city: "Remicourt",
  province: "Liège (Hesbaye)",
  provinceKey: "liege",
  segment: "B2C",
  segmentLabel: "Maison 4 façades",
  surfaceLabel: "Toiture 38 m² tuiles",
  surfaceType: "toiture",
  surfaceAreaM2: 38,
  powerLabel: "Puissance recommandée ~6,2 kWc + Batterie",
  estimatedPowerKwc: 6.2,
  billLabel: "1 850 €/an (> 5 400 kWh)",
  annualBillEur: 1850,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "reduire_facture",
  grd: "RESA",
  creditCost: 3,
  maxSlots: 2,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-remicourt-4350-blurred.jpg",
  projectDetails:
    "Maison 4 façades avec toiture tuiles 38 m². Installation complète ~6,2 kWc (14 panneaux 440 Wc) avec batterie de stockage 5 à 10 kWh.",
  isShowcaseOnly: true,
  createdAt: "2026-11-12T08:40:00.000Z",
}

const GINGELOM_LEAD: InvitationLeadSummary = {
  id: "lead_gingelom_vaassen_3890",
  postalCode: "3890",
  city: "Gingelom",
  province: "Hesbaye",
  provinceKey: "liege",
  segment: "B2C",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture moderne 34 m² plein Sud",
  surfaceType: "toiture",
  surfaceAreaM2: 34,
  powerLabel: "Puissance recommandée ~5,2 kWc (12 panneaux)",
  estimatedPowerKwc: 5.2,
  billLabel: "1 560 €/an (4 600 kWh)",
  annualBillEur: 1560,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "reduire_facture",
  grd: "ORES",
  creditCost: 3,
  maxSlots: 2,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-gingelom-3890-blurred.jpg",
  projectDetails:
    "Maison unifamiliale avec toiture moderne 34 m² orientée plein Sud. Dimensionnement estimé à ~5,2 kWc (12 panneaux 440 Wc).",
  isShowcaseOnly: true,
  createdAt: "2026-11-12T09:10:00.000Z",
}

const ANDENNE_LEAD: InvitationLeadSummary = {
  id: "lead_andenne_henry_5300",
  postalCode: "5300",
  city: "Andenne",
  province: "Namur",
  provinceKey: "namur",
  segment: "B2C",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture 34 m² tuiles",
  surfaceType: "toiture",
  surfaceAreaM2: 34,
  powerLabel: "Puissance recommandée ~5,2 kWc (12 panneaux)",
  estimatedPowerKwc: 5.2,
  billLabel: "1 560 €/an (4 600 kWh)",
  annualBillEur: 1560,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "reduire_facture",
  grd: "ORES",
  creditCost: 3,
  maxSlots: 1,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-andenne-5300-blurred.jpg",
  projectDetails:
    "Maison unifamiliale dans la vallée de la Meuse à Andenne (5300). Toiture tuiles ~34 m², projet planifié sous 1 à 3 mois.",
  isShowcaseOnly: true,
  createdAt: "2026-11-11T14:20:00.000Z",
}

const ASSESSE_LEAD: InvitationLeadSummary = {
  id: "lead_assesse_botelho_5330",
  postalCode: "5330",
  city: "Assesse",
  province: "Namur (Condroz)",
  provinceKey: "namur",
  segment: "B2C",
  segmentLabel: "Plain-pied",
  surfaceLabel: "Toiture 36 m² plein Sud",
  surfaceType: "toiture",
  surfaceAreaM2: 36,
  powerLabel: "Puissance recommandée ~5,5 kWc + Batterie",
  estimatedPowerKwc: 5.5,
  billLabel: "1 600 €/an",
  annualBillEur: 1600,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "autoconsommation",
  grd: "ORES",
  creditCost: 3,
  maxSlots: 1,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-assesse-5330-blurred.jpg",
  projectDetails:
    "Maison plain-pied avec toiture 36 m² plein Sud sur l'axe N4. Panneaux photovoltaïques ~5,5 kWc couplés à une batterie domestique.",
  isShowcaseOnly: true,
  createdAt: "2026-11-12T10:05:00.000Z",
}

const OHEY_LEAD: InvitationLeadSummary = {
  id: "lead_ohey_bauwens_5350",
  postalCode: "5350",
  city: "Ohey",
  province: "Namur (Condroz)",
  provinceKey: "namur",
  segment: "B2C",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture 38 m² Sud-Est",
  surfaceType: "toiture",
  surfaceAreaM2: 38,
  powerLabel: "Puissance recommandée ~6,0 kWc (14 panneaux)",
  estimatedPowerKwc: 6.0,
  billLabel: "1 150 €/an + recharge VE en cours",
  annualBillEur: 1150,
  roofMaterial: "tuiles",
  ownershipStatus: "owner",
  timeframe: "immediat_3mois",
  projectDriver: "flotte_irve",
  grd: "ORES",
  creditCost: 3,
  maxSlots: 1,
  imageUrl:
    "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-ohey-5350-blurred.jpg",
  projectDetails:
    "Maison unifamiliale dans le Condroz namurois. Toiture 38 m² Sud-Est, dimensionnement ~6,0 kWc optimisé pour recharge véhicule électrique.",
  isShowcaseOnly: true,
  createdAt: "2026-11-12T10:30:00.000Z",
}

export const REGIONAL_LEADS_CATALOG: Record<string, InvitationLeadSummary> = {
  "e597cc47-01f2-47e4-a953-c7e6902b2028": WEMMEL_LEAD,
  "413e8eae-8168-4907-bcaa-558204ac6aba": ROLY_LEAD,
  "bd3d6c78-0acb-4b59-8f96-ff9817f634f7": GERPINNES_LEAD,
  "a63dd867-8e1c-47e9-b4d0-93818b0a667a": NAMECHE_LEAD,
  "e597cc47-01f2-47e4-a953-c7e6902b4680": {
    ...OUPEYE_LEAD,
    id: "e597cc47-01f2-47e4-a953-c7e6902b4680",
  },
  lead_oupeye_4680: { ...OUPEYE_LEAD, id: "lead_oupeye_4680" },
  lead_oupeye_alfieri_4680: OUPEYE_LEAD,
  lead_remicourt_4350: { ...REMICOURT_LEAD, id: "lead_remicourt_4350" },
  lead_remicourt_mathieu_4350: REMICOURT_LEAD,
  lead_gingelom_3890: { ...GINGELOM_LEAD, id: "lead_gingelom_3890" },
  lead_gingelom_vaassen_3890: GINGELOM_LEAD,
  "e597cc47-01f2-47e4-a953-c7e6902b5300": {
    ...ANDENNE_LEAD,
    id: "e597cc47-01f2-47e4-a953-c7e6902b5300",
  },
  lead_andenne_5300: { ...ANDENNE_LEAD, id: "lead_andenne_5300" },
  lead_andenne_henry_5300: ANDENNE_LEAD,
  lead_assesse_5330: { ...ASSESSE_LEAD, id: "lead_assesse_5330" },
  lead_assesse_botelho_5330: ASSESSE_LEAD,
  lead_ohey_5350: { ...OHEY_LEAD, id: "lead_ohey_5350" },
  lead_ohey_bauwens_5350: OHEY_LEAD,
}

/**
 * Resolve an anonymized project summary for an external regional campaign leadId.
 */
export function getRegionalLeadSummary(leadId?: string | null): InvitationLeadSummary | null {
  if (!leadId) return null
  const trimmed = leadId.trim()
  if (!trimmed) return null
  return REGIONAL_LEADS_CATALOG[trimmed] ?? null
}

/**
 * Returns true if the leadId belongs strictly to a non-purchasable outreach showcase dossier.
 * Never returns true for real DB leads (such as Wemmel).
 */
export function isShowcaseOnlyLeadId(leadId?: string | null): boolean {
  if (!leadId) return false
  const trimmed = leadId.trim()
  if (!trimmed) return false
  if (trimmed.startsWith("demo-")) return true
  const entry = REGIONAL_LEADS_CATALOG[trimmed]
  return Boolean(entry?.isShowcaseOnly)
}

/**
 * Extracts the target leadId stored in installer_applications.admin_notes
 * under "🎯 CHANTIER CIBLE: <leadId>".
 */
export function extractTargetLeadIdFromAdminNotes(adminNotes?: string | null): string | null {
  if (!adminNotes) return null
  const match = adminNotes.match(/CHANTIER CIBLE:\s*([^\s|]+)/i)
  const raw = match?.[1]?.trim()
  return raw || null
}

export interface ShowcaseClosedLeadRecord {
  id: string
  is_showcase_closed: true
  segment: "B2C" | "B2B"
  province: string
  city: string
  postal_code: string
  masked_postal_code: string
  surface_type: string
  surface_area: number
  surface_area_m2: number
  annual_electricity_bill: number
  annual_bill_eur: number
  estimated_power_kwc: number
  roof_material: string
  ownership_status: string
  timeframe: string
  project_timeline: string
  project_driver: string
  project_details: string
  message: string
  first_name: string
  last_name: string
  grd: string
  credit_cost: number
  marketplace_status: "sold_out"
  created_at: string
  max_slots: number
  taken_slots: number
  remaining_slots: 0
  buyers: Array<{ companyName: string }>
  qualification_metadata: {
    roof_image_url: string
    is_showcase: true
  }
}

/**
 * Builds a complete, strictly non-purchasable closed dossier representation
 * for outreach showcase leads when an installer accesses `/partenaires/dashboard?lead=<id>`.
 */
export function buildShowcaseClosedLeadRecord(leadId?: string | null): ShowcaseClosedLeadRecord | null {
  const entry = getRegionalLeadSummary(leadId)
  if (!entry || !entry.isShowcaseOnly) return null

  return {
    id: entry.id,
    is_showcase_closed: true,
    segment: entry.segment,
    province: entry.provinceKey,
    city: entry.city,
    postal_code: entry.postalCode,
    masked_postal_code: entry.postalCode ? `${entry.postalCode.slice(0, 2)}XX` : "—",
    surface_type: entry.surfaceType,
    surface_area: entry.surfaceAreaM2,
    surface_area_m2: entry.surfaceAreaM2,
    annual_electricity_bill: entry.annualBillEur,
    annual_bill_eur: entry.annualBillEur,
    estimated_power_kwc: entry.estimatedPowerKwc,
    roof_material: entry.roofMaterial,
    ownership_status: entry.ownershipStatus,
    timeframe: entry.timeframe,
    project_timeline: entry.timeframe,
    project_driver: entry.projectDriver,
    project_details: entry.projectDetails,
    message: entry.projectDetails,
    first_name: "******",
    last_name: "",
    grd: entry.grd,
    credit_cost: entry.creditCost,
    marketplace_status: "sold_out",
    created_at: entry.createdAt,
    max_slots: entry.maxSlots,
    taken_slots: entry.maxSlots,
    remaining_slots: 0,
    buyers: Array.from({ length: entry.maxSlots }, (_, idx) => ({
      companyName: `Installateur agréé RESCERT #${idx + 1}`,
    })),
    qualification_metadata: {
      roof_image_url: entry.imageUrl,
      is_showcase: true,
    },
  }
}
