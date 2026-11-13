export interface InvitationLeadSummary {
  id: string
  postalCode: string
  city: string
  province: string
  segmentLabel: string
  surfaceLabel: string
  powerLabel: string
  billLabel: string
  maxSlots: number
}

const WEMMEL_LEAD: InvitationLeadSummary = {
  id: "e597cc47-01f2-47e4-a953-c7e6902b2028",
  postalCode: "1780",
  city: "Wemmel",
  province: "Bruxelles-Nord / Brabant",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture 42 m² tuiles",
  powerLabel: "Puissance recommandée ~5,4 kWc",
  billLabel: "1 150 €/an facture",
  maxSlots: 3,
}

const OUPEYE_LEAD: InvitationLeadSummary = {
  id: "lead_oupeye_alfieri_4680",
  postalCode: "4680",
  city: "Oupeye",
  province: "Liège",
  segmentLabel: "Maison unifamiliale (extension)",
  surfaceLabel: "Extension toiture tuiles terre cuite",
  powerLabel: "Onduleur 10 kVA & Batterie 10 kWh",
  billLabel: "1 800 €/an (5 300 kWh)",
  maxSlots: 2,
}

const REMICOURT_LEAD: InvitationLeadSummary = {
  id: "lead_remicourt_mathieu_4350",
  postalCode: "4350",
  city: "Remicourt",
  province: "Liège (Hesbaye)",
  segmentLabel: "Maison 4 façades",
  surfaceLabel: "Toiture 38 m² tuiles",
  powerLabel: "Puissance recommandée ~6,2 kWc + Batterie",
  billLabel: "1 850 €/an (> 5 400 kWh)",
  maxSlots: 2,
}

const GINGELOM_LEAD: InvitationLeadSummary = {
  id: "lead_gingelom_vaassen_3890",
  postalCode: "3890",
  city: "Gingelom",
  province: "Hesbaye",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture moderne 34 m² plein Sud",
  powerLabel: "Puissance recommandée ~5,2 kWc (12 panneaux)",
  billLabel: "1 560 €/an (4 600 kWh)",
  maxSlots: 2,
}

const ANDENNE_LEAD: InvitationLeadSummary = {
  id: "lead_andenne_henry_5300",
  postalCode: "5300",
  city: "Andenne",
  province: "Namur",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture 34 m² tuiles",
  powerLabel: "Puissance recommandée ~5,2 kWc (12 panneaux)",
  billLabel: "1 560 €/an (4 600 kWh)",
  maxSlots: 1,
}

const ASSESSE_LEAD: InvitationLeadSummary = {
  id: "lead_assesse_botelho_5330",
  postalCode: "5330",
  city: "Assesse",
  province: "Namur (Condroz)",
  segmentLabel: "Plain-pied",
  surfaceLabel: "Toiture 36 m² plein Sud",
  powerLabel: "Puissance recommandée ~5,5 kWc + Batterie",
  billLabel: "1 600 €/an",
  maxSlots: 1,
}

const OHEY_LEAD: InvitationLeadSummary = {
  id: "lead_ohey_bauwens_5350",
  postalCode: "5350",
  city: "Ohey",
  province: "Namur (Condroz)",
  segmentLabel: "Maison unifamiliale",
  surfaceLabel: "Toiture 38 m² Sud-Est",
  powerLabel: "Puissance recommandée ~6,0 kWc (14 panneaux)",
  billLabel: "1 150 €/an + recharge VE en cours",
  maxSlots: 1,
}

export const REGIONAL_LEADS_CATALOG: Record<string, InvitationLeadSummary> = {
  "e597cc47-01f2-47e4-a953-c7e6902b2028": WEMMEL_LEAD,
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
