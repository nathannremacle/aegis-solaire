export const MAX_LEAD_IMAGES = 10

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

/**
 * Retourne une copie de `currentMeta` synchronisée avec la liste ordonnée `images`.
 * Synchronise automatiquement `roof_images`, `roof_image_url` et `site_image_url` sur `images[0]`.
 */
export function syncLeadImagesMetadata(
  currentMeta: Record<string, unknown> | null | undefined,
  images: string[],
  updatedAt?: string
): Record<string, unknown> {
  const nextMeta: Record<string, unknown> = isPlainRecord(currentMeta)
    ? { ...currentMeta }
    : {}

  const cleanImages = dedupeImageUrls(images)

  if (cleanImages.length > 0) {
    nextMeta.roof_images = cleanImages
    nextMeta.roof_image_url = cleanImages[0]
    nextMeta.site_image_url = cleanImages[0]
    nextMeta.roof_image_updated_at = updatedAt ?? new Date().toISOString()
  } else {
    delete nextMeta.roof_images
    delete nextMeta.roof_image_url
    delete nextMeta.site_image_url
    delete nextMeta.roof_image_updated_at
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
