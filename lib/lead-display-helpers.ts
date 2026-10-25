/**
 * Helpers partagés pour l'affichage uniforme et enrichi des données d'un lead
 * sur la Marketplace, le Dashboard Partenaire, le CRM et les E-mails de relance.
 */

export const SURFACE_TYPE_LABELS: Record<string, string> = {
  toiture: "Toiture inclinée / plate",
  parking: "Ombrière de parking",
  terrain: "Sol / Terrain dégagé",
  friche: "Friche industrielle",
}

export const ROOF_MATERIAL_LABELS: Record<string, string> = {
  tuiles: "Tuiles mécaniques / plates",
  ardoises: "Ardoises naturelles / synthétiques",
  plat_epdm: "Toit plat (EPDM / Bitume)",
  bac_acier: "Bac acier / Toiture métallique",
  zinc_autre: "Zinc / Autre alliage",
  fibrociment_amiante: "Fibrociment",
}

export const TIMEFRAME_LABELS: Record<string, string> = {
  immediat_3mois: "Immédiat (sous 1 à 3 mois)",
  "3_6mois": "À moyen terme (3 à 6 mois)",
  plus_6mois: "Dans l'année (plus de 6 mois)",
  simple_renseignement: "Étude préalable & chiffrage",
}

export const OWNERSHIP_LABELS: Record<string, string> = {
  owner: "Propriétaire occupant (décisionnaire)",
  tenant_authorized: "Locataire avec accord bailleur",
  tenant_unauthorized: "Locataire sans accord formel",
  co_ownership: "Copropriété (syndic / ACP)",
}

export const PROJECT_DRIVER_LABELS: Record<string, string> = {
  reduire_facture: "Réduction des factures d'énergie",
  peb_permis: "Conformité PEB & Décret Wallonie 2026",
  flotte_irve: "Couplage bornes IRVE & autoconsommation",
  tiers_invest: "Valorisation patrimoniale & décret PACE",
}

export function getSurfaceTypeLabel(key?: string | null): string {
  if (!key) return "Toiture standard"
  return SURFACE_TYPE_LABELS[key] ?? key
}

export function getRoofMaterialLabel(key?: string | null): string {
  if (!key) return "Toiture standard"
  return ROOF_MATERIAL_LABELS[key] ?? key
}

export function getTimeframeLabel(key?: string | null): string {
  if (!key) return "Dans les 3 mois"
  return TIMEFRAME_LABELS[key] ?? key
}

export function getOwnershipLabel(key?: string | null): string {
  if (!key) return "Propriétaire occupant"
  return OWNERSHIP_LABELS[key] ?? key
}

export function getProjectDriverLabel(key?: string | null): string {
  if (!key) return "Optimisation des coûts énergétiques"
  return PROJECT_DRIVER_LABELS[key] ?? key
}
