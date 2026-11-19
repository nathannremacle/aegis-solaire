export const MAX_LEAD_IMAGES = 10

export type LeadImageKind = "real" | "ai_3d_projection"

export interface LeadImageMetaEntry {
  kind: LeadImageKind
}

export interface LeadImageItem {
  url: string
  kind: LeadImageKind
  isAiProjection: boolean
}

export const AI_PROJECTION_BADGE_SHORT = "Projection 3D · Non contractuelle"

export const AI_PROJECTION_EXPLANATION_TITLE =
  "Reconstitution 3D indicative générée par IA depuis la vue aérienne"

export const AI_PROJECTION_EXPLANATION_BODY =
  "Ce bâtiment correspond bien au projet réel géolocalisé. Cette vue 3D a été générée par IA à partir de la photographie aérienne afin de faciliter l'évaluation rapide du gabarit (type de toiture, abords, ombrages) tout en préservant la confidentialité de l'adresse exacte avant déblocage. Certains détails visuels (façades, revêtement exact, cheminées, velux ou obstacles mineurs) peuvent différer de la réalité et doivent être vérifiés lors de la visite technique."

export const AI_PROJECTION_EMAIL_CAPTION =
  "Reconstitution IA indicative depuis la vue aérienne (détails à confirmer sur site)."

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/**
 * Vérifie qu'une valeur représente une URL d'image valide (HTTP(S) ou chemin relatif /...).
 * Rejette les chaînes vides, protocol-relative (//), javascript:, data:, etc.
 */
export function isValidLeadImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (/^https?:\/\//i.test(trimmed)) return true
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true
  return false
}

function normalizeCandidateUrl(value: unknown): string | null {
  if (typeof value === "string") {
    return isValidLeadImageUrl(value) ? value.trim() : null
  }
  if (isPlainRecord(value) && typeof value.url === "string") {
    return isValidLeadImageUrl(value.url) ? value.url.trim() : null
  }
  return null
}

function dedupeImageUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of urls) {
    if (!isValidLeadImageUrl(raw)) continue
    const clean = raw.trim()
    if (seen.has(clean)) continue
    seen.add(clean)
    result.push(clean)
    if (result.length >= MAX_LEAD_IMAGES) break
  }
  return result
}

/**
 * Extrait la liste ordonnée d'images depuis un objet metadata (`qualification_metadata`).
 * Rétrocompatible avec les leads legacy n'ayant que `roof_image_url` ou `site_image_url`.
 */
export function getLeadImagesFromMetadata(
  meta: Record<string, unknown> | null | undefined
): string[] {
  if (!isPlainRecord(meta)) return []

  const arrayImages: string[] = []
  if (Array.isArray(meta.roof_images)) {
    for (const item of meta.roof_images) {
      const normalized = normalizeCandidateUrl(item)
      if (normalized) arrayImages.push(normalized)
    }
  }
  const cleanArrayImages = dedupeImageUrls(arrayImages)

  const roofUrl = normalizeCandidateUrl(meta.roof_image_url)
  const siteUrl = normalizeCandidateUrl(meta.site_image_url)

  const prefix: string[] = []
  const suffix: string[] = []

  if (roofUrl && !cleanArrayImages.includes(roofUrl)) {
    prefix.push(roofUrl)
  }

  if (siteUrl && !cleanArrayImages.includes(siteUrl) && !prefix.includes(siteUrl)) {
    if (cleanArrayImages.length === 0 && prefix.length === 0) {
      prefix.push(siteUrl)
    } else if (!roofUrl) {
      prefix.push(siteUrl)
    } else {
      suffix.push(siteUrl)
    }
  }

  return dedupeImageUrls([...prefix, ...cleanArrayImages, ...suffix])
}

/**
 * Extrait la liste ordonnée d'images d'un lead complet ou d'un objet `qualification_metadata`.
 * Index 0 = image principale envoyée dans les e-mails.
 */
export function getLeadImages(leadOrMeta: unknown): string[] {
  if (!isPlainRecord(leadOrMeta)) return []

  const fromSnakeMeta = isPlainRecord(leadOrMeta.qualification_metadata)
    ? getLeadImagesFromMetadata(leadOrMeta.qualification_metadata)
    : []
  const fromCamelMeta = isPlainRecord(leadOrMeta.qualificationMetadata)
    ? getLeadImagesFromMetadata(leadOrMeta.qualificationMetadata)
    : []
  const fromDirectFields = getLeadImagesFromMetadata(leadOrMeta)

  return dedupeImageUrls([...fromSnakeMeta, ...fromCamelMeta, ...fromDirectFields])
}

/**
 * Retourne l'URL de l'image principale (index 0) d'un lead, celle utilisée dans les e-mails.
 */
export function getPrimaryLeadImage(leadOrMeta: unknown): string | null {
  const images = getLeadImages(leadOrMeta)
  return images[0] ?? null
}

function extractRawImageMetaMap(
  source: unknown,
  target: Record<string, LeadImageMetaEntry>
) {
  if (!isPlainRecord(source)) return
  for (const [rawKey, rawVal] of Object.entries(source)) {
    if (!isValidLeadImageUrl(rawKey)) continue
    if (isPlainRecord(rawVal) && rawVal.kind === "ai_3d_projection") {
      target[rawKey.trim()] = { kind: "ai_3d_projection" }
    }
  }
}

/**
 * Extrait la map des métadonnées par image (`roof_image_meta`) pour un lead ou un objet metadata.
 * Seules les entrées marquées `"ai_3d_projection"` sont stockées ; toute autre image vaut `"real"`.
 */
export function getLeadImageMetaMap(
  leadOrMeta: unknown
): Record<string, LeadImageMetaEntry> {
  if (!isPlainRecord(leadOrMeta)) return {}

  const result: Record<string, LeadImageMetaEntry> = {}
  // Ordre croissant de priorité : direct < camelCase < snake_case
  extractRawImageMetaMap(leadOrMeta.roof_image_meta, result)
  if (isPlainRecord(leadOrMeta.qualificationMetadata)) {
    extractRawImageMetaMap(leadOrMeta.qualificationMetadata.roof_image_meta, result)
  }
  if (isPlainRecord(leadOrMeta.qualification_metadata)) {
    extractRawImageMetaMap(leadOrMeta.qualification_metadata.roof_image_meta, result)
  }
  return result
}

/**
 * Retourne la liste ordonnée des images enrichies avec leur nature (`real` ou `ai_3d_projection`).
 */
export function getLeadImageItems(leadOrMeta: unknown): LeadImageItem[] {
  const urls = getLeadImages(leadOrMeta)
  const metaMap = getLeadImageMetaMap(leadOrMeta)
  return urls.map((url) => {
    const kind: LeadImageKind =
      metaMap[url]?.kind === "ai_3d_projection" ? "ai_3d_projection" : "real"
    return {
      url,
      kind,
      isAiProjection: kind === "ai_3d_projection",
    }
  })
}

/**
 * Retourne l'élément image principal (index 0) avec son type, ou null s'il n'y a aucune image.
 */
export function getPrimaryLeadImageItem(leadOrMeta: unknown): LeadImageItem | null {
  const items = getLeadImageItems(leadOrMeta)
  return items[0] ?? null
}

/**
 * Retourne une copie de `currentMeta` synchronisée avec la liste ordonnée `images`.
 * Synchronise automatiquement `roof_images`, `roof_image_url`, `site_image_url` et `roof_image_meta`.
 */
export function syncLeadImagesMetadata(
  currentMeta: Record<string, unknown> | null | undefined,
  images: string[],
  updatedAt?: string,
  metaOverrides?: Record<string, LeadImageKind>
): Record<string, unknown> {
  const nextMeta: Record<string, unknown> = isPlainRecord(currentMeta)
    ? { ...currentMeta }
    : {}

  const cleanImages = dedupeImageUrls(images)
  const validSet = new Set(cleanImages)
  const existingMap = getLeadImageMetaMap(currentMeta)
  const prunedMap: Record<string, LeadImageMetaEntry> = {}

  for (const url of cleanImages) {
    if (existingMap[url]?.kind === "ai_3d_projection") {
      prunedMap[url] = { kind: "ai_3d_projection" }
    }
  }

  if (metaOverrides && isPlainRecord(metaOverrides)) {
    for (const [rawKey, kind] of Object.entries(metaOverrides)) {
      if (!isValidLeadImageUrl(rawKey)) continue
      const cleanKey = rawKey.trim()
      if (!validSet.has(cleanKey)) continue
      if (kind === "ai_3d_projection") {
        prunedMap[cleanKey] = { kind: "ai_3d_projection" }
      } else if (kind === "real") {
        delete prunedMap[cleanKey]
      }
    }
  }

  if (cleanImages.length > 0) {
    nextMeta.roof_images = cleanImages
    nextMeta.roof_image_url = cleanImages[0]
    nextMeta.site_image_url = cleanImages[0]
    nextMeta.roof_image_updated_at = updatedAt ?? new Date().toISOString()
    if (Object.keys(prunedMap).length > 0) {
      nextMeta.roof_image_meta = prunedMap
    } else {
      delete nextMeta.roof_image_meta
    }
  } else {
    delete nextMeta.roof_images
    delete nextMeta.roof_image_url
    delete nextMeta.site_image_url
    delete nextMeta.roof_image_updated_at
    delete nextMeta.roof_image_meta
  }

  return nextMeta
}

/**
 * Ajoute une ou plusieurs URLs à la liste existante en dédupliquant et en respectant `MAX_LEAD_IMAGES`.
 */
export function appendLeadImages(
  existing: string[],
  added: string[],
  opts?: { makeFirst?: boolean }
): string[] {
  const cleanExisting = dedupeImageUrls(existing)
  const cleanAdded = dedupeImageUrls(added)

  if (opts?.makeFirst) {
    return dedupeImageUrls([...cleanAdded, ...cleanExisting])
  }
  return dedupeImageUrls([...cleanExisting, ...cleanAdded])
}

/**
 * Place `targetUrl` en position 0 (image principale pour les e-mails) en conservant l'ordre relatif des autres.
 */
export function setPrimaryLeadImage(existing: string[], targetUrl: string): string[] {
  const cleanTarget = targetUrl.trim()
  const cleanExisting = dedupeImageUrls(existing)
  if (!cleanTarget || !cleanExisting.includes(cleanTarget)) {
    return cleanExisting
  }
  return [cleanTarget, ...cleanExisting.filter((url) => url !== cleanTarget)]
}

/**
 * Réordonne les images existantes selon `orderedUrls` sans jamais supprimer d'image existante omise.
 */
export function reorderLeadImages(existing: string[], orderedUrls: string[]): string[] {
  const cleanExisting = dedupeImageUrls(existing)
  const existingSet = new Set(cleanExisting)
  const validOrdered = dedupeImageUrls(orderedUrls).filter((url) => existingSet.has(url))
  const remaining = cleanExisting.filter((url) => !validOrdered.includes(url))
  return dedupeImageUrls([...validOrdered, ...remaining])
}

/**
 * Déplace l'image à `index` d'un cran vers la gauche ou la droite.
 */
export function moveLeadImage(
  existing: string[],
  index: number,
  direction: "left" | "right"
): string[] {
  const cleanExisting = dedupeImageUrls(existing)
  if (index < 0 || index >= cleanExisting.length) return cleanExisting

  const targetIndex = direction === "left" ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= cleanExisting.length) return cleanExisting

  const next = [...cleanExisting]
  const [moved] = next.splice(index, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

/**
 * Retire `targetUrl` de la liste. Si l'image n°1 est retirée, la suivante devient automatiquement n°1.
 */
export function removeLeadImage(existing: string[], targetUrl: string): string[] {
  const cleanTarget = targetUrl.trim()
  return dedupeImageUrls(existing).filter((url) => url !== cleanTarget)
}
