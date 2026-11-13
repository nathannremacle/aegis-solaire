export type PartnerNotificationMode = "all" | "new_only" | "none"

export const OPTOUT_ALL_MARKER = "__optout_all__"
export const OPTOUT_RELANCES_MARKER = "__optout_relances__"

export const DEFAULT_CLEAN_SURFACES = ["toiture", "parking"]

export interface PartnerNotificationStateInput {
  email_notifications_enabled?: boolean | null
  email_relances_enabled?: boolean | null
  target_surfaces?: string[] | null
}

/**
 * Détermine le mode de notification e-mail actif d'un installateur partenaire.
 * Supporte à la fois les colonnes SQL dédiées et le stockage résilient dans `target_surfaces`.
 */
export function getPartnerNotificationMode(
  partner: PartnerNotificationStateInput | null | undefined
): PartnerNotificationMode {
  if (!partner) return "all"

  const surfaces = Array.isArray(partner.target_surfaces) ? partner.target_surfaces : []

  if (partner.email_notifications_enabled === false || surfaces.includes(OPTOUT_ALL_MARKER)) {
    return "none"
  }

  if (partner.email_relances_enabled === false || surfaces.includes(OPTOUT_RELANCES_MARKER)) {
    return "new_only"
  }

  return "all"
}

/**
 * Retourne la liste des surfaces réelles d'un partenaire (sans marqueurs techniques).
 */
export function getCleanTargetSurfaces(surfaces?: string[] | null): string[] {
  if (!Array.isArray(surfaces)) return [...DEFAULT_CLEAN_SURFACES]
  const cleaned = surfaces.filter(
    (s) => s !== OPTOUT_ALL_MARKER && s !== OPTOUT_RELANCES_MARKER && typeof s === "string" && s.trim() !== ""
  )
  const hadOnlyMarkers =
    surfaces.length > 0 &&
    surfaces.every((s) => s === OPTOUT_ALL_MARKER || s === OPTOUT_RELANCES_MARKER)

  if (cleaned.length === 0 && hadOnlyMarkers) {
    return [...DEFAULT_CLEAN_SURFACES]
  }
  return cleaned.length > 0 ? cleaned : [...DEFAULT_CLEAN_SURFACES]
}

/**
 * Encode le mode de notification dans `target_surfaces` tout en préservant les surfaces choisies.
 */
export function applyNotificationModeToSurfaces(
  cleanSurfaces: string[],
  mode: PartnerNotificationMode
): string[] {
  const base = cleanSurfaces.filter(
    (s) => s !== OPTOUT_ALL_MARKER && s !== OPTOUT_RELANCES_MARKER && typeof s === "string" && s.trim() !== ""
  )
  const uniqueBase = Array.from(new Set(base.length > 0 ? base : DEFAULT_CLEAN_SURFACES))

  if (mode === "none") {
    return [...uniqueBase, OPTOUT_ALL_MARKER]
  }
  if (mode === "new_only") {
    return [...uniqueBase, OPTOUT_RELANCES_MARKER]
  }
  return uniqueBase
}

export function isValidPartnerNotificationMode(value: unknown): value is PartnerNotificationMode {
  return value === "all" || value === "new_only" || value === "none"
}

