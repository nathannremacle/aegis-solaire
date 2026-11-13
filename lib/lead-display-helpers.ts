/**
 * Helpers partagés pour l'affichage uniforme, professionnel et enrichi des données d'un lead
 * sur la Marketplace, le Dashboard Partenaire, le CRM et les E-mails de relance.
 * Supprime impérativement les métadonnées internes brutes (Bobex-Style, UTM, codes machine)
 * et garantit un rendu digne d'un terminal de décision financière institutionnel.
 */

import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

export const SURFACE_TYPE_LABELS: Record<string, string> = {
  toiture: "Toiture",
  toiture_inclinee: "Toiture inclinée",
  toiture_plate: "Toiture plate",
  parking: "Ombrière de parking",
  terrain: "Sol / Terrain dégagé",
  sol: "Sol / Terrain dégagé",
  friche: "Friche industrielle",
}

export const ROOF_MATERIAL_LABELS: Record<string, string> = {
  tuiles: "Tuiles",
  ardoises: "Ardoises",
  tuiles_ardoises: "Tuiles ou ardoises",
  plat_epdm: "Toit plat (EPDM / Bitume)",
  plat: "Toit plat (Roofing / EPDM)",
  epdm: "Toit plat (EPDM)",
  bitume: "Toit plat (Bitume)",
  roofing: "Toit plat (Roofing)",
  bac_acier: "Bac acier / Métal",
  metal: "Bac acier / Métal",
  zinc_autre: "Zinc",
  zinc: "Zinc",
  fibrociment_amiante: "Fibrociment",
  autre: "Autre revêtement",
}

export const TIMEFRAME_LABELS: Record<string, string> = {
  immediat: "Immédiat (1 à 3 mois)",
  immediate: "Immédiat (1 à 3 mois)",
  "1_month": "Dès que possible",
  "3_months": "Dans les 3 mois",
  immediat_3mois: "Immédiat (1 à 3 mois)",
  "1_3_mois": "Immédiat (1 à 3 mois)",
  "3_6mois": "D'ici 3 à 6 mois",
  "3_6_mois": "D'ici 3 à 6 mois",
  "6_months": "D'ici 6 mois",
  plus_6mois: "Plus de 6 mois",
  plus_6_mois: "Plus de 6 mois",
  "12_months": "Dans l'année",
  simple_renseignement: "Étude préalable & chiffrage",
}

export const OWNERSHIP_LABELS: Record<string, string> = {
  owner: "Propriétaire occupant",
  owner_occupied: "Propriétaire occupant",
  proprietaire: "Propriétaire occupant",
  proprietaire_occupant: "Propriétaire occupant",
  proprietaire_bailleur: "Propriétaire bailleur",
  bail_emphyt_accord: "Bail emphytéotique / Accord propriétaire",
  tenant_authorized: "Locataire (avec accord bailleur)",
  locataire_accord: "Locataire (avec accord bailleur)",
  tenant: "Locataire",
  locataire: "Locataire",
  tenant_unauthorized: "Locataire (en attente accord)",
  locataire_sans_accord: "Locataire (sans accord préalable)",
  co_ownership: "Copropriété (syndic / ACP)",
  copropriete: "Copropriété",
  business_owner: "Chef d'entreprise / Dirigeant",
  professionnel: "Professionnel / Dirigeant",
  gestionnaire: "Gestionnaire de site",
}

export const PROJECT_DRIVER_LABELS: Record<string, string> = {
  reduire_facture: "Réduction des coûts énergétiques",
  reduction_facture: "Réduction des coûts énergétiques",
  cost_reduction: "Réduction des factures d'électricité",
  facture: "Réduction des factures d'électricité",
  peb_permis: "Conformité PEB & Décret Wallonie 2026",
  flotte_irve: "Couplage bornes de recharge & solaire",
  tiers_invest: "Valorisation patrimoniale & décret PACE",
  autoconsommation: "Autonomie électrique & autoconsommation",
  esg_compliance: "Transition énergétique & conformité RSE",
  ecologie: "Transition écologique",
}

export const CONSUMPTION_LABELS: Record<string, string> = {
  // Formulaire comparateur B2C (devis-landing-client.tsx)
  lt_3000: "< 3 000 kWh/an",
  "3000_4000": "3 000 – 4 000 kWh/an",
  "4000_5000": "4 000 – 5 000 kWh/an",
  "5000_6000": "5 000 – 6 000 kWh/an",
  gt_6000: "> 6 000 kWh/an",
  // Tranches historiques / complémentaires
  moins_2500: "< 2 500 kWh/an",
  "2500_3000": "2 500 – 3 000 kWh/an",
  "4000_6000": "4 000 – 6 000 kWh/an",
  "6000_10000": "6 000 – 10 000 kWh/an",
  plus_10000: "> 10 000 kWh/an",
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  "maison mitoyenne": "Maison mitoyenne (2 ou 3 façades)",
  "maison_mitoyenne": "Maison mitoyenne (2 ou 3 façades)",
  mitoyenne: "Maison mitoyenne (2 ou 3 façades)",
  "maison 4 facades": "Maison 4 façades (Isolée)",
  "maison 4 façades": "Maison 4 façades (Isolée)",
  "maison_4f": "Maison 4 façades (Isolée)",
  "maison_4_facades": "Maison 4 façades (Isolée)",
  "maison individuelle": "Maison 4 façades (Isolée)",
  "maison_individuelle": "Maison 4 façades (Isolée)",
  individuelle: "Maison 4 façades (Isolée)",
  "maison 3 facades": "Maison 3 façades",
  "maison 3 façades": "Maison 3 façades",
  "maison_3f": "Maison 3 façades",
  "maison_3_facades": "Maison 3 façades",
  appartement: "Appartement / Copropriété",
  copropriete: "Copropriété (syndic)",
  immeuble_commercial: "Bâtiment professionnel / PME",
  batiment_industriel: "Bâtiment industriel / Hangar",
  hangar: "Hangar / Entrepôt",
  entrepot: "Hangar / Entrepôt",
  entrepôt: "Hangar / Entrepôt",
  bureaux: "Immeuble de bureaux",
  commerce: "Surface commerciale",
  agricole: "Bâtiment agricole",
}

export const ROOF_SURFACE_LABELS: Record<string, string> = {
  small: "Petite (~20 à 35 m²)",
  petite: "Petite (~20 à 35 m²)",
  medium: "Moyenne (~35 à 60 m²)",
  moyenne: "Moyenne (~35 à 60 m²)",
  large: "Grande (~60 à 100 m²)",
  grande: "Grande (~60 à 100 m²)",
  xlarge: "Très grande (> 100 m²)",
  tres_grande: "Très grande (> 100 m²)",
  "très grande": "Très grande (> 100 m²)",
  // Tranches B2B (roi-simulator.tsx)
  lt_500: "< 500 m²",
  m500_1500: "500 – 1 500 m²",
  gt_1500: "> 1 500 m²",
}

export const ORIENTATION_LABELS: Record<string, string> = {
  sud: "Plein Sud",
  sud_est_ouest: "Sud-Est / Sud-Ouest",
  est_ouest: "Est / Ouest",
  unknown: "Non précisée",
}

export const HOUSEHOLD_SIZE_LABELS: Record<string, string> = {
  "1_2": "1 – 2 personnes",
  "3_4": "3 – 4 personnes",
  "5_plus": "5 personnes ou +",
}

export const BATTERY_OPTION_LABELS: Record<string, string> = {
  oui: "Oui, avec batterie",
  hesite: "À comparer (avec / sans)",
  non: "Panneaux seuls",
}

export const EV_OPTION_LABELS: Record<string, string> = {
  oui: "Oui, déjà équipé",
  prevu: "Prévu prochainement",
  non: "Non",
}

export const GRD_LABELS: Record<string, string> = {
  ores: "Ores",
  resa: "Resa",
  aieg: "AIEG",
  rew: "REW",
  fluvius: "Fluvius",
  unknown: "Non précisé",
}

/**
 * Référentiel des principales communes et coordonnées pour la Wallonie (Belgique)
 * Permet d'inférer la ville si absente et de positionner le cercle de floutage de 3 km.
 */
export const WALLONIA_POSTAL_LOOKUP: Record<string, { city: string; province: string; coords: [number, number] }> = {
  // Province de Liège
  "4000": { city: "Liège", province: "Liège", coords: [50.6326, 5.5797] },
  "4020": { city: "Liège", province: "Liège", coords: [50.6350, 5.5900] },
  "4040": { city: "Herstal", province: "Liège", coords: [50.6653, 5.6300] },
  "4100": { city: "Seraing", province: "Liège", coords: [50.5833, 5.5000] },
  "4300": { city: "Waremme", province: "Liège", coords: [50.6978, 5.2575] },
  "4400": { city: "Flémalle", province: "Liège", coords: [50.5989, 5.4644] },
  "4500": { city: "Huy", province: "Liège", coords: [50.5189, 5.2333] },
  "4650": { city: "Herve", province: "Liège", coords: [50.6403, 5.7956] },
  "4651": { city: "Herve", province: "Liège", coords: [50.6410, 5.7940] },
  "4670": { city: "Blegny", province: "Liège", coords: [50.6728, 5.7233] },
  "4800": { city: "Verviers", province: "Liège", coords: [50.5932, 5.8647] },
  "4900": { city: "Spa", province: "Liège", coords: [50.4925, 5.8642] },
  "4960": { city: "Malmedy", province: "Liège", coords: [50.4267, 6.0278] },

  // Province de Namur
  "5000": { city: "Namur", province: "Namur", coords: [50.4674, 4.8720] },
  "5020": { city: "Namur (Champion)", province: "Namur", coords: [50.4950, 4.8850] },
  "5030": { city: "Gembloux", province: "Namur", coords: [50.5600, 4.6933] },
  "5100": { city: "Jambes", province: "Namur", coords: [50.4550, 4.8750] },
  "5300": { city: "Andenne", province: "Namur", coords: [50.4900, 5.1000] },
  "5500": { city: "Dinant", province: "Namur", coords: [50.2611, 4.9122] },
  "5590": { city: "Ciney", province: "Namur", coords: [50.2956, 5.1011] },
  "5600": { city: "Philippeville", province: "Namur", coords: [50.1961, 4.5433] },

  // Province de Luxembourg
  "6900": { city: "Marche-en-Famenne", province: "Luxembourg", coords: [50.2268, 5.3442] },
  "6600": { city: "Bastogne", province: "Luxembourg", coords: [50.0033, 5.7183] },
  "6700": { city: "Arlon", province: "Luxembourg", coords: [49.6833, 5.8167] },
  "6800": { city: "Libramont", province: "Luxembourg", coords: [49.9142, 5.3778] },
  "6840": { city: "Neufchâteau", province: "Luxembourg", coords: [49.8406, 5.4344] },
  "6940": { city: "Durbuy", province: "Luxembourg", coords: [50.3528, 5.4561] },
  "6980": { city: "La Roche-en-Ardenne", province: "Luxembourg", coords: [50.1833, 5.5767] },

  // Province du Hainaut
  "6000": { city: "Charleroi", province: "Hainaut", coords: [50.4108, 4.4446] },
  "6041": { city: "Gosselies", province: "Hainaut", coords: [50.4650, 4.4320] },
  "6060": { city: "Gilly", province: "Hainaut", coords: [50.4244, 4.4756] },
  "6110": { city: "Montigny-le-Tilleul", province: "Hainaut", coords: [50.3800, 4.3800] },
  "7000": { city: "Mons", province: "Hainaut", coords: [50.4542, 3.9567] },
  "7100": { city: "La Louvière", province: "Hainaut", coords: [50.4794, 4.1872] },
  "7500": { city: "Tournai", province: "Hainaut", coords: [50.6057, 3.3888] },
  "7700": { city: "Mouscron", province: "Hainaut", coords: [50.7433, 3.2181] },
  "7800": { city: "Ath", province: "Hainaut", coords: [50.6300, 3.7789] },

  // Brabant Wallon
  "1300": { city: "Wavre", province: "Brabant Wallon", coords: [50.7172, 4.6133] },
  "1348": { city: "Louvain-la-Neuve", province: "Brabant Wallon", coords: [50.6700, 4.6150] },
  "1400": { city: "Nivelles", province: "Brabant Wallon", coords: [50.5977, 4.3236] },
  "1410": { city: "Waterloo", province: "Brabant Wallon", coords: [50.7172, 4.3986] },
  "1420": { city: "Braine-l'Alleud", province: "Brabant Wallon", coords: [50.6833, 4.3667] },

  // Région de Bruxelles-Capitale & Périphérie
  "1000": { city: "Bruxelles", province: "Bruxelles", coords: [50.8503, 4.3517] },
  "1020": { city: "Laeken", province: "Bruxelles", coords: [50.8800, 4.3500] },
  "1030": { city: "Schaerbeek", province: "Bruxelles", coords: [50.8676, 4.3737] },
  "1040": { city: "Etterbeek", province: "Bruxelles", coords: [50.8333, 4.3833] },
  "1050": { city: "Ixelles", province: "Bruxelles", coords: [50.8222, 4.3667] },
  "1060": { city: "Saint-Gilles", province: "Bruxelles", coords: [50.8250, 4.3417] },
  "1070": { city: "Anderlecht", province: "Bruxelles", coords: [50.8333, 4.3000] },
  "1080": { city: "Molenbeek-Saint-Jean", province: "Bruxelles", coords: [50.8500, 4.3167] },
  "1081": { city: "Koekelberg", province: "Bruxelles", coords: [50.8600, 4.3200] },
  "1082": { city: "Berchem-Sainte-Agathe", province: "Bruxelles", coords: [50.8650, 4.2900] },
  "1083": { city: "Ganshoren", province: "Bruxelles", coords: [50.8700, 4.3100] },
  "1090": { city: "Jette", province: "Bruxelles", coords: [50.8750, 4.3300] },
  "1140": { city: "Evere", province: "Bruxelles", coords: [50.8700, 4.4000] },
  "1150": { city: "Woluwe-Saint-Pierre", province: "Bruxelles", coords: [50.8333, 4.4333] },
  "1160": { city: "Auderghem", province: "Bruxelles", coords: [50.8167, 4.4333] },
  "1170": { city: "Watermael-Boitsfort", province: "Bruxelles", coords: [50.8000, 4.4167] },
  "1180": { city: "Uccle", province: "Bruxelles", coords: [50.8000, 4.3333] },
  "1190": { city: "Forest", province: "Bruxelles", coords: [50.8167, 4.3167] },
  "1200": { city: "Woluwe-Saint-Lambert", province: "Bruxelles", coords: [50.8400, 4.4250] },
  "1780": { city: "Wemmel", province: "Bruxelles", coords: [50.9080, 4.3120] },
  "1950": { city: "Kraainem", province: "Bruxelles", coords: [50.8600, 4.4600] },
  "1970": { city: "Wezembeek-Oppem", province: "Bruxelles", coords: [50.8400, 4.4900] },
}

function normalizeDisplayKey(key: string): string {
  return key.toLowerCase().trim()
}

function formatThousandsSpace(numStr: string): string {
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

export function getSurfaceTypeLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Toiture standard"
  const normalized = normalizeDisplayKey(key)
  return SURFACE_TYPE_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getPropertyTypeLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Maison d'habitation"
  const trimmed = key.trim()
  const normalized = normalizeDisplayKey(trimmed)
  if (PROPERTY_TYPE_LABELS[normalized]) return PROPERTY_TYPE_LABELS[normalized]
  if (SURFACE_TYPE_LABELS[normalized]) return SURFACE_TYPE_LABELS[normalized]
  // Si déjà lisible (contient des espaces ou déjà un libellé français), préserver la casse sans casser les accents
  if (trimmed.includes(" ") && !trimmed.includes("_")) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }
  const spaced = trimmed.replace(/_/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function getRoofSurfaceLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Surface standard (~35 à 60 m²)"
  const normalized = normalizeDisplayKey(key)
  if (ROOF_SURFACE_LABELS[normalized]) return ROOF_SURFACE_LABELS[normalized]

  if (normalized.includes("m²") || normalized.includes("m2")) {
    return key.trim().replace(/m2/gi, "m²")
  }

  // Gère par ex. "medium (~5.5 kWc)" émis par b2c-simulator.tsx
  const bracketWithSuffix = key.trim().match(/^(small|petite|medium|moyenne|large|grande|xlarge|tres_grande)\s*(\([^)]+\))?$/i)
  if (bracketWithSuffix) {
    const base = ROOF_SURFACE_LABELS[bracketWithSuffix[1].toLowerCase()]
    if (base) return bracketWithSuffix[2] ? `${base} ${bracketWithSuffix[2]}` : base
  }

  if (/^\d+$/.test(normalized)) {
    return `${formatThousandsSpace(normalized)} m²`
  }
  return key.trim().replace(/_/g, " ")
}

export function getConsumptionLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Non précisée"
  const normalized = normalizeDisplayKey(key)
  if (CONSUMPTION_LABELS[normalized]) return CONSUMPTION_LABELS[normalized]

  // Garde-fou générique pour toute tranche future de type lt_X, gt_X, moins_X, plus_X, X_Y
  const ltMatch = normalized.match(/^(?:lt|moins)_(\d+)$/)
  if (ltMatch) return `< ${formatThousandsSpace(ltMatch[1])} kWh/an`

  const gtMatch = normalized.match(/^(?:gt|plus)_(\d+)$/)
  if (gtMatch) return `> ${formatThousandsSpace(gtMatch[1])} kWh/an`

  const rangeMatch = normalized.match(/^(\d+)(?:_|\s*(?:à|-|–)\s*)(\d+)$/)
  if (rangeMatch) {
    return `${formatThousandsSpace(rangeMatch[1])} – ${formatThousandsSpace(rangeMatch[2])} kWh/an`
  }

  if (normalized.includes("kwh")) return key.trim()
  if (/^\d+$/.test(normalized)) return `${formatThousandsSpace(normalized)} kWh/an`
  return key.trim().replace(/_/g, " ")
}

export function getRoofMaterialLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Toiture standard"
  const normalized = normalizeDisplayKey(key)
  return ROOF_MATERIAL_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getTimeframeLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Dans les 3 mois"
  const normalized = normalizeDisplayKey(key)
  return TIMEFRAME_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getOwnershipLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Propriétaire occupant"
  const normalized = normalizeDisplayKey(key)
  return OWNERSHIP_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getProjectDriverLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Optimisation des coûts énergétiques"
  const normalized = normalizeDisplayKey(key)
  return PROJECT_DRIVER_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getOrientationLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Non précisée"
  const normalized = normalizeDisplayKey(key)
  return ORIENTATION_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getHouseholdSizeLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Non précisé"
  const normalized = normalizeDisplayKey(key)
  return HOUSEHOLD_SIZE_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getBatteryOptionLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Non précisé"
  const normalized = normalizeDisplayKey(key)
  return BATTERY_OPTION_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getEvOptionLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Non"
  const normalized = normalizeDisplayKey(key)
  return EV_OPTION_LABELS[normalized] ?? key.trim().replace(/_/g, " ")
}

export function getGrdLabel(key?: string | null): string {
  if (!key || !key.trim()) return "Non précisé"
  const normalized = normalizeDisplayKey(key)
  return GRD_LABELS[normalized] ?? key.trim().toUpperCase()
}

/**
 * Détermine une localisation professionnelle, propre et garantie sans fuite ni valeur manquante.
 * Supprime le préfixe "Installation Solaire à" et évite à 100% les "Installation Solaire à (—)".
 */
export function getLeadLocationInfo(lead: any): {
  city: string
  postalCode: string
  maskedPostalCode: string
  provinceLabel: string
  fullTitle: string
  subtitle: string
  coords: [number, number]
} {
  const rawPostal = String(lead?.postal_code || "").trim()
  const rawCity = String(lead?.city || "").trim()
  const rawProvince = String(lead?.province || "").trim()

  // Chercher dans le dictionnaire postal si connu
  const lookup = WALLONIA_POSTAL_LOOKUP[rawPostal]

  let city = rawCity
  let provinceLabel = getProvinceDisplayLabel(rawProvince || lookup?.province || "Wallonie")
  let coords: [number, number] = lookup?.coords || [50.5039, 4.8690] // Centre Wallonie par défaut

  if (!city && lookup) {
    city = lookup.city
  }

  // Si toujours pas de commune, inférer depuis le préfixe de code postal
  if (!city) {
    if (rawPostal.startsWith("4")) city = "Secteur Liège"
    else if (rawPostal.startsWith("5")) city = "Secteur Namur"
    else if (rawPostal.startsWith("69") || rawPostal.startsWith("68") || rawPostal.startsWith("67") || rawPostal.startsWith("66")) city = "Secteur Luxembourg"
    else if (rawPostal.startsWith("6") || rawPostal.startsWith("7")) city = "Secteur Hainaut"
    else if (rawPostal.startsWith("13") || rawPostal.startsWith("14")) city = "Secteur Brabant Wallon"
    else if (provinceLabel && provinceLabel !== "Wallonie") city = `Région ${provinceLabel}`
    else city = "Chantier Wallonie"
  }

  // Nettoyage de la commune (ex: "4651 Herve" -> "Herve")
  city = city.replace(/^\d{4}\s+/, "").trim()

  const postalCode = rawPostal || "Wallonie"
  const maskedPostalCode =
    lead?.masked_postal_code ||
    (rawPostal.length >= 2 ? `${rawPostal.slice(0, 2)}XX` : "Wallonie")

  const displayPostal = lead?.already_purchased || lead?.purchase_id ? postalCode : maskedPostalCode
  const hasRealPostal = displayPostal && displayPostal !== "—" && displayPostal !== "Wallonie"
  const fullTitle = hasRealPostal ? `${city} (${displayPostal})` : city

  // Sous-titre métier : Province + Type d'infrastructure
  const surfaceType = getSurfaceTypeLabel(lead?.surface_type)
  const isB2B = lead?.segment === "B2B"
  const buildingLabel = isB2B
    ? lead?.company
      ? `Site professionnel · ${surfaceType}`
      : `Bâtiment tertiaire / Industriel`
    : `Résidentiel · ${surfaceType}`

  const subtitle = `${provinceLabel} · ${buildingLabel}`

  return {
    city,
    postalCode,
    maskedPostalCode,
    provinceLabel,
    fullTitle,
    subtitle,
    coords,
  }
}

export interface ParsedLeadBadge {
  id: string
  label: string
  value: string
  icon: "MapPin" | "Zap" | "Home" | "User" | "Building2" | "Ruler" | "Phone" | "BatteryCharging" | "Info"
  variant?: "default" | "accent" | "solar" | "highlight" | "success"
}

export interface ParsedLeadDetails {
  badges: ParsedLeadBadge[]
  remarks: string | null
  rawFallback: string | null
}

const KEY_DEFINITIONS: Array<{
  key: string
  match: string[]
  label: string
  icon: ParsedLeadBadge["icon"]
}> = [
  { key: "location", match: ["localisation indiquée", "localisation indiquee", "précision localisation", "precision localisation", "localisation"], label: "Localisation indiquée", icon: "MapPin" },
  { key: "consumption", match: ["consommation annuelle", "consommation"], label: "Consommation annuelle", icon: "Zap" },
  { key: "propertyType", match: ["type de bien", "type bien"], label: "Type de bien", icon: "Home" },
  { key: "ownership", match: ["statut d'occupation", "statut", "décisionnaire", "decisionnaire"], label: "Statut d'occupation", icon: "User" },
  { key: "roofSurface", match: ["surface toiture", "taille toiture", "surface"], label: "Surface toiture", icon: "Ruler" },
  { key: "roofMaterial", match: ["couverture toiture", "couverture", "toiture"], label: "Couverture toiture", icon: "Building2" },
  { key: "orientation", match: ["orientation toiture", "orientation"], label: "Orientation toiture", icon: "Info" },
  { key: "householdSize", match: ["taille du foyer", "ménage", "menage", "foyer"], label: "Taille du foyer", icon: "User" },
  { key: "contact", match: ["règle contact client", "regle contact client", "règle contact", "préférence contact", "preference contact", "contact client", "contact"], label: "Préférence contact", icon: "Phone" },
  { key: "battery", match: ["batterie"], label: "Batterie", icon: "BatteryCharging" },
  { key: "irve", match: ["borne de recharge", "borne ve", "borne irve", "borne", "ve"], label: "Borne de recharge", icon: "Zap" },
  { key: "remarks", match: ["précisions", "precisions", "remarques", "remarque", "précision", "precision", "notes", "note"], label: "Remarques", icon: "Info" },
  {
    key: "internalSystem",
    match: ["newsletter aegis solaire", "source", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"],
    label: "Métadonnée interne",
    icon: "Info",
  },
]

/**
 * Analyse chirurgicalement les notes et détails saisis par le prospect
 * Transforme les chaînes concaténées avec pipes ou sauts de ligne en badges d'ingénierie soignés.
 */
export function parseLeadProjectDetails(text?: string | null): ParsedLeadDetails {
  if (!text || typeof text !== "string" || !text.trim()) {
    return { badges: [], remarks: null, rawFallback: null }
  }

  // Nettoyer les espaces superflus avant les deux-points pour uniformiser
  const normalizedText = text.replace(/\s+:/g, ":").trim()
  const lowerText = normalizedText.toLowerCase()

  const occurrences: Array<{
    def: (typeof KEY_DEFINITIONS)[number]
    phrase: string
    start: number
    valueStart: number
  }> = []

  for (const def of KEY_DEFINITIONS) {
    for (const phrase of def.match) {
      const searchTarget = phrase + ":"
      let startIdx = 0
      while ((startIdx = lowerText.indexOf(searchTarget, startIdx)) !== -1) {
        const prevChar = startIdx > 0 ? lowerText[startIdx - 1] : ""
        const hasBoundary = startIdx === 0 || /[\s|;,\n\r]/.test(prevChar)
        if (hasBoundary) {
          occurrences.push({
            def,
            phrase,
            start: startIdx,
            valueStart: startIdx + searchTarget.length,
          })
        }
        startIdx += searchTarget.length
      }
    }
  }

  // Si aucune clé formelle n'a été trouvée
  if (occurrences.length === 0) {
    // Si c'est du texte libre
    const clean = text.replace(/^[|\s]+|[|\s]+$/g, "").trim()
    return {
      badges: [],
      remarks: clean.length > 5 ? clean : null,
      rawFallback: null,
    }
  }

  // Trier par position chronologique (puis phrase la plus longue d'abord en cas d'égalité)
  occurrences.sort((a, b) => a.start - b.start || b.valueStart - a.valueStart)

  // Éliminer les sous-clés redondantes
  const filtered: typeof occurrences = []
  let lastEnd = -1
  for (const occ of occurrences) {
    if (occ.start >= lastEnd) {
      filtered.push(occ)
      lastEnd = occ.valueStart
    }
  }

  const badges: ParsedLeadBadge[] = []
  let remarks: string | null = null
  const seenBadgeKeys = new Set<string>()

  for (let i = 0; i < filtered.length; i++) {
    const curr = filtered[i]
    const nextStart = i + 1 < filtered.length ? filtered[i + 1].start : normalizedText.length
    let rawVal = normalizedText.slice(curr.valueStart, nextStart).trim()
    rawVal = rawVal.replace(/^[:|\s]+|[:|\s]+$/g, "").trim()

    if (!rawVal) continue

    if (curr.def.key === "internalSystem") {
      continue
    }

    if (curr.def.key === "remarks") {
      remarks = rawVal
      continue
    }

    // Éviter strictement les clés en double
    if (seenBadgeKeys.has(curr.def.key)) {
      continue
    }
    seenBadgeKeys.add(curr.def.key)

    let cleanVal = rawVal
    let variant: ParsedLeadBadge["variant"] = "default"

    if (curr.def.key === "location") {
      variant = "accent"
    } else if (curr.def.key === "consumption") {
      cleanVal = getConsumptionLabel(rawVal)
      variant = "solar"
    } else if (curr.def.key === "propertyType") {
      cleanVal = getPropertyTypeLabel(rawVal)
    } else if (curr.def.key === "ownership") {
      cleanVal = getOwnershipLabel(rawVal)
    } else if (curr.def.key === "roofSurface") {
      cleanVal = getRoofSurfaceLabel(rawVal)
    } else if (curr.def.key === "roofMaterial") {
      cleanVal = getRoofMaterialLabel(rawVal)
    } else if (curr.def.key === "orientation") {
      cleanVal = getOrientationLabel(rawVal)
    } else if (curr.def.key === "householdSize") {
      cleanVal = getHouseholdSizeLabel(rawVal)
    } else if (curr.def.key === "battery") {
      cleanVal = getBatteryOptionLabel(rawVal)
    } else if (curr.def.key === "irve") {
      cleanVal = getEvOptionLabel(rawVal)
    } else if (curr.def.key === "contact") {
      const isCall = rawVal.toLowerCase().includes("appel")
      variant = isCall ? "success" : "highlight"
    }

    badges.push({
      id: curr.def.key,
      icon: curr.def.icon,
      label: curr.def.label,
      value: cleanVal,
      variant,
    })
  }

  return { badges, remarks, rawFallback: null }
}

export interface LeadProjectSpecs {
  propertyType?: string
  roofMaterial?: string
  roofSurface?: string
  ownership?: string
  consumption?: string
  orientation?: string
  householdSize?: string
  contactPreference?: string
  locationDetail?: string
  hasBattery?: boolean
  hasIrve?: boolean
}

function isAffirmativeSpecValue(value: string, negatives: string[]): boolean {
  const norm = value.toLowerCase().trim()
  return !negatives.some((neg) => norm === neg || norm.startsWith(neg))
}

/**
 * Nettoie chirurgicalement les métadonnées internes des leads
 * Supprime "Source: Landing Bobex-Style", "UTM...", et traduit les chaînes brutes en français net.
 * Évite à 100% les dédoublements de texte entre details et message.
 */
export function sanitizeLeadNotes(details?: string | null, message?: string | null): {
  cleanRemarks: string | null
  cleanBadges: { label: string; value: string; key: string }[]
  specs: LeadProjectSpecs
} {
  let sourceText = ""
  const d = (details || "").trim()
  const m = (message || "").trim()

  if (d && m) {
    if (d === m || d.includes(m)) {
      sourceText = d
    } else if (m.includes(d)) {
      sourceText = m
    } else {
      sourceText = `${d} | ${m}`
    }
  } else {
    sourceText = d || m
  }

  if (!sourceText.trim()) {
    return { cleanRemarks: null, cleanBadges: [], specs: {} }
  }

  const parsed = parseLeadProjectDetails(sourceText)
  const specs: LeadProjectSpecs = {}

  for (const b of parsed.badges) {
    if (b.id === "propertyType") specs.propertyType = b.value
    else if (b.id === "roofMaterial") specs.roofMaterial = b.value
    else if (b.id === "roofSurface") specs.roofSurface = b.value
    else if (b.id === "ownership") specs.ownership = b.value
    else if (b.id === "consumption") specs.consumption = b.value
    else if (b.id === "orientation") specs.orientation = b.value
    else if (b.id === "householdSize") specs.householdSize = b.value
    else if (b.id === "contact") specs.contactPreference = b.value
    else if (b.id === "location") specs.locationDetail = b.value
    else if (b.id === "battery") {
      specs.hasBattery = isAffirmativeSpecValue(b.value, ["non", "panneaux seuls", "no", "false"])
    } else if (b.id === "irve") {
      specs.hasIrve = isAffirmativeSpecValue(b.value, ["non", "no", "false"])
    }
  }

  return {
    cleanRemarks: parsed.remarks,
    cleanBadges: parsed.badges.map((b) => ({ label: b.label, value: b.value, key: b.id })),
    specs,
  }
}

/**
 * Normalise en amont (avant sauvegarde en base ou envoi d'e-mail) le texte `project_details`
 * afin qu'aucune clé technique brute (`gt_6000`, `maison_4f`, `locataire_sans_accord`, etc.)
 * ne soit jamais stockée ni exposée. Idempotent sur les chaînes déjà traduites ou le texte libre.
 */
export function canonicalizeProjectDetailsText(text?: string | null): string | null {
  if (!text || typeof text !== "string" || !text.trim()) return null

  const trimmed = text.trim()
  const parsed = parseLeadProjectDetails(trimmed)

  // Texte libre sans aucune clé structurée : conserver tel quel
  if (parsed.badges.length === 0 && !parsed.remarks) {
    return trimmed
  }
  if (parsed.badges.length === 0) {
    const hasNewsletterOnly = /newsletter aegis solaire\s*:/i.test(trimmed)
    return hasNewsletterOnly ? trimmed : parsed.remarks || trimmed
  }

  const locationBadge = parsed.badges.find((b) => b.id === "location")
  const specBadges = parsed.badges.filter((b) => b.id !== "location")

  const parts: string[] = []
  if (locationBadge) {
    parts.push(`${locationBadge.label} : ${locationBadge.value}`)
  }

  const specLineItems = specBadges.map((b) => `${b.label}: ${b.value}`)
  if (parsed.remarks) {
    specLineItems.push(`Précisions: ${parsed.remarks}`)
  }
  if (specLineItems.length > 0) {
    parts.push(specLineItems.join(" | "))
  }

  const newsletterMatch = trimmed.match(/Newsletter Aegis Solaire\s*:\s*[^\n]+/i)
  if (newsletterMatch) {
    parts.push(newsletterMatch[0].trim())
  }

  return parts.join("\n\n") || trimmed
}

/**
 * Arrondit un montant financier à l'échelle pertinente (fintech)
 * Évite les fausses précisions algorithmiques à l'euro près (ex: ~113 696 € -> ~114 000 €).
 */
export function formatRoundedCurrency(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return "—"

  let rounded: number
  if (amount >= 50_000) {
    // Arrondi au millier pour les grands montants
    rounded = Math.round(amount / 1000) * 1000
  } else if (amount >= 10_000) {
    // Arrondi aux 500 € pour les montants intermédiaires
    rounded = Math.round(amount / 500) * 500
  } else if (amount >= 1_000) {
    // Arrondi aux 100 € pour les petits montants
    rounded = Math.round(amount / 100) * 100
  } else if (amount >= 100) {
    // Arrondi aux 10 € pour les montants intermédiaires
    rounded = Math.round(amount / 10) * 10
  } else {
    // Pour les montants inférieurs à 100 €, ne jamais arrondir à 50 €
    return `~${amount.toLocaleString("fr-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} € HT`
  }

  return `~${rounded.toLocaleString("fr-BE")} € HT`
}

/**
 * Calcule le ratio ROI et le coût d'acquisition relatif pour lever la friction psychologique de l'achat.
 */
export function calculateLeadRoiRatio(estimatedMargin: number, creditCost: number, estimatedContract: number): {
  leadCostEur: number
  roiMultiplier: number
  roiBadgeText: string
} {
  const creditPriceEur = 29.5 / 3 // ~9,8333 € HTVA (3 crédits = 29,50 € HTVA, 9 crédits = 88,50 € HTVA)
  const leadCostEur = creditCost * creditPriceEur

  const margin = Math.max(0, estimatedMargin || 0)
  const contract = Math.max(leadCostEur, estimatedContract || margin * 4.5)

  const roiMultiplier = Math.max(1, Math.round(margin / Math.max(1, leadCostEur)))
  const ratioPercent = (leadCostEur / Math.max(1, contract)) * 100

  let roiBadgeText: string
  if (ratioPercent < 0.1) {
    roiBadgeText = "Coût d'acquisition : < 0,1 % du chantier"
  } else if (ratioPercent < 1.0) {
    roiBadgeText = `Coût d'acquisition : ${ratioPercent.toFixed(1).replace(".", ",")} % du chantier`
  } else {
    roiBadgeText = `Marge brute ≈ ${roiMultiplier}× le coût du lead`
  }

  return {
    leadCostEur,
    roiMultiplier,
    roiBadgeText,
  }
}

/**
 * Calcule l'indicateur de fraîcheur d'un lead (signal n°1 de conversion).
 * Assure un affichage crédible et professionnel pour les installateurs partenaires.
 */
export function getLeadFreshness(
  createdAt?: string | null,
  overrideLabel?: string | null
): {
  label: string
  isHot: boolean
  dotClass: string
} {
  if (overrideLabel) {
    return {
      label: overrideLabel,
      isHot: true,
      dotClass: "bg-emerald-500 animate-pulse",
    }
  }

  if (!createdAt) {
    return {
      label: "Vérifié aujourd'hui",
      isHot: true,
      dotClass: "bg-emerald-500",
    }
  }

  const created = new Date(createdAt)
  const now = new Date()
  const diffHours = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60)))

  if (diffHours < 1) {
    const diffMinutes = Math.max(5, Math.floor((now.getTime() - created.getTime()) / (1000 * 60)))
    return {
      label: `Vérifié il y a ${diffMinutes} min`,
      isHot: true,
      dotClass: "bg-emerald-500 animate-pulse",
    }
  }

  if (diffHours <= 6) {
    return {
      label: `Il y a ${diffHours} h`,
      isHot: true,
      dotClass: "bg-emerald-500",
    }
  }

  if (diffHours <= 24) {
    return {
      label: "Vérifié aujourd'hui",
      isHot: true,
      dotClass: "bg-emerald-500",
    }
  }

  if (diffHours <= 48) {
    return {
      label: "Hier",
      isHot: false,
      dotClass: "bg-slate-400",
    }
  }

  const days = Math.floor(diffHours / 24)
  if (days <= 7) {
    return {
      label: `Il y a ${days} j`,
      isHot: false,
      dotClass: "bg-slate-400",
    }
  }

  if (days <= 30) {
    return {
      label: "Ce mois-ci",
      isHot: false,
      dotClass: "bg-accent/60",
    }
  }

  // Pour les leads actifs de longue durée sur le réseau
  return {
    label: "Dossier vérifié",
    isHot: false,
    dotClass: "bg-accent/60",
  }
}

/**
 * Formate proprement la date d'acquisition / déblocage d'un lead pour l'espace CRM partenaire.
 * Évite les concaténations maladroites avec les statuts de fraîcheur ("Débloqué Dossier vérifié").
 */
export function formatLeadUnlockDate(purchasedAt?: string | null): string {
  if (!purchasedAt) return "Débloqué récemment"

  const date = new Date(purchasedAt)
  if (isNaN(date.getTime())) return "Débloqué"

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))

  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
    return `Débloqué il y a ${diffMinutes} min`
  }

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return "Débloqué aujourd'hui"
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return "Débloqué hier"
  }

  const days = Math.floor(diffHours / 24)
  if (days <= 7) {
    return `Débloqué il y a ${days} j`
  }

  const sameYear = date.getFullYear() === now.getFullYear()
  const dateFormatted = date.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })

  return `Débloqué le ${dateFormatted}`
}

export interface B2CSlotIndicator {
  text: string
  dots: [string, string, string]
}

/**
 * Calcule l'état visuel et textuel des places disponibles pour un lead B2C (max 3 places)
 * - 3/3 dispo : 3 ronds verts (#22C55E) + "3/3 places dispo"
 * - 2/3 dispo : 2 ronds orange (#F97316) + 1 rond gris inactif (#4B5563) + "2/3 places dispo"
 * - 1/3 dispo : 1 rond rouge (#EF4444) + 2 ronds gris inactifs (#4B5563) + "1/3 place dispo"
 * - 0/3 dispo : 3 ronds gris (#4B5563) + "Complet"
 */
export function getB2CSlotIndicator(remainingSlots: number): B2CSlotIndicator {
  if (remainingSlots >= 3) {
    return {
      text: "3/3 places dispo",
      dots: ["#22C55E", "#22C55E", "#22C55E"],
    }
  }
  if (remainingSlots === 2) {
    return {
      text: "2/3 places dispo",
      dots: ["#F97316", "#F97316", "#4B5563"],
    }
  }
  if (remainingSlots === 1) {
    return {
      text: "1/3 place dispo",
      dots: ["#EF4444", "#4B5563", "#4B5563"],
    }
  }
  return {
    text: "Complet",
    dots: ["#4B5563", "#4B5563", "#4B5563"],
  }
}


