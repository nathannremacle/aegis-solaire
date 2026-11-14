import b2cOptoutEmails from "@/lib/data/b2c-optout-emails.json"

export type PartnerNotificationMode = "all" | "new_only" | "none"
export type PartnerSegmentPreference = "B2B" | "B2C" | "BOTH"

export const OPTOUT_ALL_MARKER = "__optout_all__"
export const OPTOUT_RELANCES_MARKER = "__optout_relances__"

export const DEFAULT_CLEAN_SURFACES = ["toiture", "parking"]

const B2C_OPTOUT_EMAIL_SET = new Set(
  (Array.isArray(b2cOptoutEmails) ? b2cOptoutEmails : [])
    .map((e) => (typeof e === "string" ? e.toLowerCase().trim() : ""))
    .filter(Boolean)
)

/**
 * Indique si une adresse e-mail a demandé à ne plus recevoir de leads B2C (B2B uniquement).
 */
export function isB2COptedOutEmail(email: string | null | undefined): boolean {
  const normalized = (email || "").toLowerCase().trim()
  if (!normalized) return false
  return B2C_OPTOUT_EMAIL_SET.has(normalized)
}

export function isValidPartnerSegment(value: unknown): value is PartnerSegmentPreference {
  return value === "B2B" || value === "B2C" || value === "BOTH"
}

export function normalizePartnerSegment(value: unknown): PartnerSegmentPreference | null {
  if (typeof value !== "string") return null
  const upper = value.trim().toUpperCase()
  if (upper === "B2B") return "B2B"
  if (upper === "B2C") return "B2C"
  if (upper === "BOTH" || upper === "ALL") return "BOTH"
  return null
}

/**
 * Extrait le segment cible depuis `installer_applications.admin_notes` (ex. "Segments cibles: B2B").
 */
export function extractTargetSegmentFromAdminNotes(
  adminNotes: string | null | undefined
): PartnerSegmentPreference | null {
  if (!adminNotes) return null
  const match = adminNotes.match(/Segments?\s+cibles?\s*:\s*(B2B|B2C|BOTH|ALL)/i)
  return match ? normalizePartnerSegment(match[1]) : null
}

/**
 * Résout le segment d'un partenaire lors de l'inscription ou de l'approbation.
 * Les adresses listées dans `b2c-optout-emails.json` sont forcées sur `B2B`.
 */
export function resolvePartnerSegment(options: {
  email?: string | null
  explicitSegment?: unknown
  adminNotes?: string | null
  fallback?: PartnerSegmentPreference
}): PartnerSegmentPreference {
  if (isB2COptedOutEmail(options.email)) {
    return "B2B"
  }
  const explicit = normalizePartnerSegment(options.explicitSegment)
  if (explicit) return explicit
  const fromNotes = extractTargetSegmentFromAdminNotes(options.adminNotes)
  if (fromNotes) return fromNotes
  return options.fallback ?? "BOTH"
}

/**
 * Retourne le segment effectif utilisé par le moteur de matching et d'e-mails.
 * Si un segment explicite est défini en base (ex. B2B, B2C ou BOTH modifié par le partenaire),
 * il est respecté ; à défaut, les adresses ayant refusé le B2C reçoivent uniquement du B2B.
 */
export function getEffectivePartnerSegment(partner: {
  email?: string | null
  segment?: string | null
} | null | undefined): PartnerSegmentPreference {
  const current = normalizePartnerSegment(partner?.segment)
  if (current) return current
  if (isB2COptedOutEmail(partner?.email)) {
    return "B2B"
  }
  return "BOTH"
}

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

