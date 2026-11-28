import {
  detectCityPostalContradiction,
  extractBelgianStreetAndNumber,
  isWalloonPostalCode,
} from "./leads-validation"

export interface SpwLocalityItem {
  name: string
  city: string
  postalCode: string
  cityIdent?: string
  isPrimary: boolean
}

export interface SpwStreetDirectoryItem {
  streetIdent: number
  streetName: string
  normalizedStreet: string
  tokens: string[]
  city: string
  section: string
  postalCode: string
}

export interface AddressSuggestion {
  street: string
  houseNumber?: string | null
  postalCode: string
  city: string
  section: string
  streetIdent?: number
  label: string
  source: "SPW_ICAR" | "PHOTON_OSM"
  coordinates?: { lat: number; lng: number } | null
}

export type AddressResolutionLevel = "house" | "street" | "locality" | "none"
export type AddressCoordinatesPrecision =
  | "house"
  | "interpolated"
  | "street"
  | "locality"
  | "none"
export type AddressCoordinatesSource =
  | "SPW_ICAR_HOUSE"
  | "SPW_GEOLIST_HOUSE"
  | "OSM_BUILDING_SPW_ANCHORED"
  | "SPW_NEIGHBORS_INTERPOLATED"
  | null

export interface VerifiedBelgianAddressResult {
  validInWallonia: boolean
  resolutionLevel: AddressResolutionLevel
  streetVerified: boolean
  houseVerified: boolean
  hasHouseNumber: boolean
  postalMismatch: boolean
  officialCity?: string
  officialSection?: string
  officialPostalCode?: string
  canonicalStreet?: string
  houseNumber?: string | null
  confidenceScore: number
  source: "SPW_ICAR"
  rawCandidatesCount: number
  coordinates?: { lat: number; lng: number } | null
  coordinatesPrecision?: AddressCoordinatesPrecision
  coordinatesSource?: AddressCoordinatesSource
  googleMapsUrl?: string
  googleEarthUrl?: string
  streetViewUrl?: string
  walOnMapUrl?: string
}

const SPW_BASE = "https://geoservices.wallonie.be/geocodeWS"
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 heures
const MAX_CACHED_ZONES = 350

interface SpwGeocodedHouse {
  name: string
  num: number | null
  lat: number
  lng: number
}

const streetCache = new Map<
  string,
  { expiresAt: number; items: SpwStreetDirectoryItem[] }
>()
const streetInflight = new Map<string, Promise<SpwStreetDirectoryItem[]>>()

const streetHousesCache = new Map<
  number,
  { expiresAt: number; items: SpwGeocodedHouse[] }
>()
const streetHousesInflight = new Map<number, Promise<SpwGeocodedHouse[]>>()

const localityCache = new Map<
  string,
  { expiresAt: number; items: SpwLocalityItem[] }
>()
const localityInflight = new Map<string, Promise<SpwLocalityItem[]>>()

const STREET_PREFIX_ABBR: Record<string, string> = {
  r: "rue",
  av: "avenue",
  bd: "boulevard",
  blvd: "boulevard",
  ch: "chaussee",
  chee: "chaussee",
  pl: "place",
  imp: "impasse",
  all: "allee",
  sq: "square",
  fg: "faubourg",
  rte: "route",
}

const STOPWORDS = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "au", "aux", "et", "en"])

export function normalizeAddressText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`\-.,/()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stemFrenchToken(token: string): string {
  if (token.length >= 4 && token.endsWith("s")) {
    return token.slice(0, -1)
  }
  return token
}

function tokenizeAddressText(input: string, expandAbbr = true): string[] {
  const norm = normalizeAddressText(input)
  if (!norm) return []
  return norm.split(" ").map((tok, idx) => {
    if (expandAbbr && idx === 0 && STREET_PREFIX_ABBR[tok]) {
      return STREET_PREFIX_ABBR[tok]
    }
    return stemFrenchToken(tok)
  })
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

/**
 * Score de similarité [0..100] entre une saisie rue et un nom officiel SPW.
 * Tolère les pluriels ("évêques" -> "Evêque"), apostrophes omises ("l eveque" -> "l'Evêque")
 * et légères fautes de frappe.
 */
export function computeStreetMatchScore(queryStreet: string, candidateStreet: string): number {
  const qNorm = normalizeAddressText(queryStreet)
  const cNorm = normalizeAddressText(candidateStreet)
  if (!qNorm || !cNorm) return 0
  if (qNorm === cNorm) return 100

  const qTokens = tokenizeAddressText(queryStreet)
  const cTokens = tokenizeAddressText(candidateStreet)
  if (qTokens.length === 0 || cTokens.length === 0) return 0

  if (qTokens.join(" ") === cTokens.join(" ")) return 98

  // Filtrer les mots significatifs (ou garder tous si la rue est courte)
  const qSig = qTokens.filter((t) => !STOPWORDS.has(t))
  const cSig = cTokens.filter((t) => !STOPWORDS.has(t))
  const qSet = qSig.length > 0 ? qSig : qTokens
  const cSet = cSig.length > 0 ? cSig : cTokens

  if (qSet.join(" ") === cSet.join(" ")) return 95

  let exactOrPrefixMatches = 0
  let fuzzyScoreSum = 0

  for (let i = 0; i < qSet.length; i++) {
    const qt = qSet[i]
    let bestTokenSim = 0
    for (const ct of cSet) {
      if (ct === qt) {
        bestTokenSim = 1
        break
      }
      if (ct.startsWith(qt) && qt.length >= 2) {
        bestTokenSim = Math.max(bestTokenSim, 0.9)
      } else if (ct.includes(qt) && qt.length >= 3) {
        bestTokenSim = Math.max(bestTokenSim, 0.8)
      } else if (qt.length >= 4 && ct.length >= 4) {
        const dist = levenshtein(qt, ct)
        const maxLen = Math.max(qt.length, ct.length)
        const ratio = 1 - dist / maxLen
        if (ratio >= 0.7) {
          bestTokenSim = Math.max(bestTokenSim, ratio * 0.88)
        }
      }
    }
    if (bestTokenSim >= 0.88) exactOrPrefixMatches++
    fuzzyScoreSum += bestTokenSim
  }

  const coverage = fuzzyScoreSum / qSet.length
  // Pénaliser si le candidat contient beaucoup plus de mots significatifs sans rapport
  const extraPenalty =
    cSet.length > qSet.length && exactOrPrefixMatches < cSet.length
      ? Math.min(18, (cSet.length - qSet.length) * 5)
      : 0

  let score = Math.round(coverage * 90 - extraPenalty)
  if (cNorm.startsWith(qNorm)) {
    score = Math.max(score, 88)
  } else if (cNorm.includes(qNorm) && qNorm.length >= 4) {
    score = Math.max(score, 82)
  }

  return Math.max(0, Math.min(99, score))
}

function setWithLimit<K, V>(map: Map<K, V>, key: K, val: V) {
  if (map.size >= MAX_CACHED_ZONES) {
    const firstKey = map.keys().next().value
    if (firstKey !== undefined) map.delete(firstKey)
  }
  map.set(key, val)
}

/**
 * Récupère les localités / sections officielles d'un code postal wallon (SPW ICAR).
 */
export async function getLocalitiesForPostalCode(postalCode: string): Promise<SpwLocalityItem[]> {
  const cleanPostal = postalCode.replace(/\D/g, "").slice(0, 4)
  if (!isWalloonPostalCode(cleanPostal)) return []

  const now = Date.now()
  const cached = localityCache.get(cleanPostal)
  if (cached && cached.expiresAt > now) {
    return cached.items
  }

  const inflight = localityInflight.get(cleanPostal)
  if (inflight) return inflight

  const task = (async (): Promise<SpwLocalityItem[]> => {
    try {
      const res = await fetch(`${SPW_BASE}/geolist?zone=${encodeURIComponent(cleanPostal)}`, {
        signal: AbortSignal.timeout(4500),
      })
      if (!res.ok) return []
      const data = await res.json()
      const candidates = Array.isArray(data?.candidates) ? data.candidates : []

      const seen = new Set<string>()
      const items: SpwLocalityItem[] = []
      for (const c of candidates) {
        const name = String(c?.zone?.name || c?.city?.name || "").trim()
        const city = String(c?.city?.name || name).trim()
        if (!name) continue
        const key = `${name.toLowerCase()}::${city.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        items.push({
          name,
          city,
          postalCode: String(c?.zone?.ident || cleanPostal),
          cityIdent: c?.city?.ident ? String(c.city.ident) : undefined,
          isPrimary: normalizeAddressText(name) === normalizeAddressText(city),
        })
      }

      items.sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
        return a.name.localeCompare(b.name, "fr-BE")
      })

      setWithLimit(localityCache, cleanPostal, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        items,
      })
      return items
    } catch {
      return []
    } finally {
      localityInflight.delete(cleanPostal)
    }
  })()

  localityInflight.set(cleanPostal, task)
  return task
}

/**
 * Récupère et met en cache toutes les rues officielles SPW ICAR d'un code postal wallon.
 */
export async function getStreetsForPostalCode(
  postalCode: string
): Promise<SpwStreetDirectoryItem[]> {
  const cleanPostal = postalCode.replace(/\D/g, "").slice(0, 4)
  if (!isWalloonPostalCode(cleanPostal)) return []

  const now = Date.now()
  const cached = streetCache.get(cleanPostal)
  if (cached && cached.expiresAt > now) {
    return cached.items
  }

  const inflight = streetInflight.get(cleanPostal)
  if (inflight) return inflight

  const task = (async (): Promise<SpwStreetDirectoryItem[]> => {
    try {
      const res = await fetch(
        `${SPW_BASE}/geolist?zone=${encodeURIComponent(cleanPostal)}&street=*`,
        { signal: AbortSignal.timeout(5500) }
      )
      if (!res.ok) return []
      const data = await res.json()
      const candidates = Array.isArray(data?.candidates) ? data.candidates : []

      const seen = new Set<string>()
      const items: SpwStreetDirectoryItem[] = []
      for (const c of candidates) {
        const streetName = String(c?.street?.name || "").trim()
        if (!streetName) continue
        const streetIdent = Number(c?.street?.ident || 0)
        const section = String(c?.zone?.name || c?.city?.name || "").trim()
        const city = String(c?.city?.name || section).trim()
        const dedupKey = `${streetIdent || normalizeAddressText(streetName)}::${section.toLowerCase()}`
        if (seen.has(dedupKey)) continue
        seen.add(dedupKey)
        items.push({
          streetIdent,
          streetName,
          normalizedStreet: normalizeAddressText(streetName),
          tokens: tokenizeAddressText(streetName),
          city,
          section,
          postalCode: String(c?.zone?.ident || cleanPostal),
        })
      }

      setWithLimit(streetCache, cleanPostal, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        items,
      })
      return items
    } catch {
      return []
    } finally {
      streetInflight.delete(cleanPostal)
    }
  })()

  streetInflight.set(cleanPostal, task)
  return task
}

/**
 * Autocomplétion temps réel de voiries belges :
 * - Priorité absolue : SPW ICAR Wallonie (100% officiel, gratuit, < 5ms une fois le CP en cache)
 * - Fallback Belgique (Bruxelles/Flandre pour B2B) : Photon OSM géolocalisé Belgique
 */
export async function suggestBelgianStreets(params: {
  postalCode?: string | null
  query: string
  limit?: number
}): Promise<AddressSuggestion[]> {
  const cleanPostal = (params.postalCode ?? "").replace(/\D/g, "").slice(0, 4)
  const limit = Math.max(1, Math.min(params.limit ?? 8, 15))
  const rawQuery = (params.query ?? "").trim()
  if (rawQuery.length < 2) return []

  const parsed = extractBelgianStreetAndNumber(rawQuery)
  const streetQuery = parsed.street || rawQuery
  const trailingNumber = parsed.houseNumber

  // 1. Chemin optimal Wallonie : annuaire officiel SPW ICAR du code postal
  if (isWalloonPostalCode(cleanPostal)) {
    const directory = await getStreetsForPostalCode(cleanPostal)
    if (directory.length > 0) {
      const scored = directory
        .map((item) => ({
          item,
          score: computeStreetMatchScore(streetQuery, item.streetName),
        }))
        .filter((entry) => entry.score >= 45)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return a.item.streetName.localeCompare(b.item.streetName, "fr-BE")
        })
        .slice(0, limit)

      if (scored.length > 0) {
        return scored.map(({ item }) => {
          const streetDisplay = trailingNumber
            ? `${item.streetName} ${trailingNumber}`
            : item.streetName
          const localitySuffix =
            item.section && normalizeAddressText(item.section) !== normalizeAddressText(item.city)
              ? `${item.postalCode} ${item.section} (${item.city})`
              : `${item.postalCode} ${item.city}`

          return {
            street: item.streetName,
            houseNumber: trailingNumber,
            postalCode: item.postalCode,
            city: item.city,
            section: item.section,
            streetIdent: item.streetIdent,
            label: `${streetDisplay} · ${localitySuffix}`,
            source: "SPW_ICAR",
            coordinates: null,
          }
        })
      }
    }
  }

  // 2. Fallback Photon OSM (pour codes postaux B2B Bruxelles/Flandre ou si CP pas encore saisi)
  try {
    const qFull = cleanPostal ? `${streetQuery} ${cleanPostal}` : streetQuery
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(qFull)}&limit=${limit * 2}&lang=fr&lat=50.55&lon=4.65`
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return []
    const data = await res.json()
    const features = Array.isArray(data?.features) ? data.features : []
    const results: AddressSuggestion[] = []
    const seen = new Set<string>()

    for (const f of features) {
      const props = f?.properties || {}
      if (props.countrycode && String(props.countrycode).toUpperCase() !== "BE") continue
      const streetName = String(props.street || props.name || "").trim()
      if (!streetName) continue
      const postcode = String(props.postcode || cleanPostal || "").trim()
      if (cleanPostal && postcode && postcode !== cleanPostal) continue
      const city = String(props.city || props.town || props.village || props.district || "").trim()
      const section = String(props.district || city).trim()
      const key = `${normalizeAddressText(streetName)}::${postcode}`
      if (seen.has(key)) continue
      seen.add(key)

      const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : null
      results.push({
        street: streetName,
        houseNumber: props.housenumber ? String(props.housenumber) : trailingNumber,
        postalCode: postcode,
        city,
        section,
        label: `${streetName} · ${postcode} ${city}`.trim(),
        source: "PHOTON_OSM",
        coordinates:
          coords && coords.length >= 2 ? { lat: Number(coords[1]), lng: Number(coords[0]) } : null,
      })
      if (results.length >= limit) break
    }
    return results
  } catch {
    return []
  }
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function parseHouseParts(raw: string): {
  rawNorm: string
  stem: string | null
  numeric: number | null
  suffix: string
} {
  const rawNorm = raw.trim().toLowerCase().replace(/\s+/g, "")
  const m = rawNorm.match(/^(\d{1,4})(.*)$/)
  if (!m) {
    return { rawNorm, stem: null, numeric: null, suffix: rawNorm }
  }
  const stem = m[1]
  const numeric = parseInt(stem, 10)
  return {
    rawNorm,
    stem,
    numeric: Number.isFinite(numeric) ? numeric : null,
    suffix: (m[2] ?? "").replace(/^[-/]+/, "/"),
  }
}

function isCompatibleHouseNumber(
  targetRaw: string,
  candidateRaw: string
): { match: boolean; exact: boolean } {
  const target = parseHouseParts(targetRaw)
  const cand = parseHouseParts(candidateRaw)
  if (!target.rawNorm || !cand.rawNorm) return { match: false, exact: false }
  if (target.rawNorm === cand.rawNorm) return { match: true, exact: true }
  if (!target.stem || !cand.stem || target.stem !== cand.stem) {
    return { match: false, exact: false }
  }

  // Sous-numéro de boîte / fraction ("33/2" vs "33", ou "33" vs "33/1")
  const targetIsSubOrBare = !target.suffix || target.suffix.startsWith("/")
  const candIsSubOrBare = !cand.suffix || cand.suffix.startsWith("/")
  if (targetIsSubOrBare && candIsSubOrBare) {
    return { match: true, exact: false }
  }

  // Si l'un a un suffixe alphabétique ("33a") et l'autre aucun suffixe ("33"), compatible en secours ;
  // si les deux ont des suffixes alphabétiques différents ("33a" vs "33b"), refuser.
  if (!target.suffix || !cand.suffix) {
    return { match: true, exact: false }
  }

  return { match: target.suffix === cand.suffix, exact: target.suffix === cand.suffix }
}

/**
 * Récupère (et met en cache 24h) tous les numéros de maison géocodés SPW ICAR d'une rue.
 */
async function getSpwStreetHouses(streetIdent: number): Promise<SpwGeocodedHouse[]> {
  if (!streetIdent || !Number.isFinite(streetIdent)) return []

  const now = Date.now()
  const cached = streetHousesCache.get(streetIdent)
  if (cached && cached.expiresAt > now) {
    return cached.items
  }

  const inflight = streetHousesInflight.get(streetIdent)
  if (inflight) return inflight

  const task = (async (): Promise<SpwGeocodedHouse[]> => {
    try {
      const url = `${SPW_BASE}/geolist?street=${encodeURIComponent(String(streetIdent))}&house=*&geom=true&crs=EPSG:4326`
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) })
      if (!res.ok) return []
      const data = await res.json()
      const candidates = Array.isArray(data?.candidates) ? data.candidates : []
      const items: SpwGeocodedHouse[] = []
      const seen = new Set<string>()

      for (const c of candidates) {
        const name = c?.house?.name ? String(c.house.name).trim() : ""
        const coords = Array.isArray(c?.house?.geometry?.coordinates)
          ? c.house.geometry.coordinates
          : null
        if (!name || !coords || coords.length < 2) continue
        const lat = Number(coords[1])
        const lng = Number(coords[0])
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const parsed = parseHouseParts(name)
        items.push({ name, num: parsed.numeric, lat, lng })
      }

      setWithLimit(streetHousesCache, streetIdent, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        items,
      })
      return items
    } catch {
      return []
    } finally {
      streetHousesInflight.delete(streetIdent)
    }
  })()

  streetHousesInflight.set(streetIdent, task)
  return task
}

function findBracketingSpwNeighbors(
  houses: SpwGeocodedHouse[],
  targetNum: number
): { lower: SpwGeocodedHouse | null; upper: SpwGeocodedHouse | null } {
  const numericHouses = houses.filter((h): h is SpwGeocodedHouse & { num: number } => h.num !== null)
  const findPair = (pool: Array<SpwGeocodedHouse & { num: number }>) => {
    let lower: (SpwGeocodedHouse & { num: number }) | null = null
    let upper: (SpwGeocodedHouse & { num: number }) | null = null
    for (const h of pool) {
      if (h.num < targetNum && (!lower || h.num > lower.num)) {
        lower = h
      } else if (h.num > targetNum && (!upper || h.num < upper.num)) {
        upper = h
      }
    }
    return { lower, upper }
  }

  const sameParity = numericHouses.filter((h) => h.num % 2 === targetNum % 2)
  const parityPair = findPair(sameParity)
  if (
    parityPair.lower &&
    parityPair.upper &&
    parityPair.upper.num - parityPair.lower.num <= 24 &&
    haversineMeters(parityPair.lower, parityPair.upper) <= 650
  ) {
    return parityPair
  }

  return findPair(numericHouses)
}

function interpolateFromSpwNeighbors(
  houses: SpwGeocodedHouse[],
  targetHouse: string
): { lat: number; lng: number } | null {
  const targetNum = parseHouseParts(targetHouse).numeric
  if (targetNum === null || houses.length < 2) return null

  const { lower, upper } = findBracketingSpwNeighbors(houses, targetNum)
  if (!lower || !upper || lower.num === null || upper.num === null) return null

  const spanNum = upper.num - lower.num
  const dist = haversineMeters(lower, upper)
  if (spanNum <= 0 || spanNum > 24 || dist > 600) return null

  const t = (targetNum - lower.num) / spanNum
  return {
    lat: Number((lower.lat + t * (upper.lat - lower.lat)).toFixed(7)),
    lng: Number((lower.lng + t * (upper.lng - lower.lng)).toFixed(7)),
  }
}

async function resolveAnchoredOsmBuildingCoords(params: {
  canonicalStreet: string
  houseNumber: string
  officialPostalCode: string
  officialSection: string
  officialCity: string
  spwHouses: SpwGeocodedHouse[]
  streetAnchorCoords: { lat: number; lng: number } | null
}): Promise<{ lat: number; lng: number } | null> {
  const {
    canonicalStreet,
    houseNumber,
    officialPostalCode,
    officialSection,
    officialCity,
    spwHouses,
    streetAnchorCoords,
  } = params

  const parsedTarget = parseHouseParts(houseNumber)
  const targetStem = parsedTarget.stem || houseNumber
  const localityHint = officialSection || officialCity
  const anchorPoint =
    spwHouses.length > 0
      ? { lat: spwHouses[0].lat, lng: spwHouses[0].lng }
      : streetAnchorCoords

  const bracketing =
    parsedTarget.numeric !== null
      ? findBracketingSpwNeighbors(spwHouses, parsedTarget.numeric)
      : { lower: null, upper: null }

  const validateCandidate = (cand: {
    lat: number
    lng: number
    countryCode?: string
    postcode?: string
    street?: string
    houseNumber?: string
  }): { exact: boolean; distScore: number } | null => {
    if (!Number.isFinite(cand.lat) || !Number.isFinite(cand.lng)) return null
    if (cand.countryCode && cand.countryCode.toUpperCase() !== "BE") return null
    if (!cand.postcode || cand.postcode.trim() !== officialPostalCode) return null
    if (!cand.houseNumber) return null
    const houseCompat = isCompatibleHouseNumber(houseNumber, cand.houseNumber)
    if (!houseCompat.match) return null

    const streetSim = cand.street ? computeStreetMatchScore(canonicalStreet, cand.street) : 0
    if (streetSim < 85) return null

    // Contrôle spatial strict ancré sur les bâtiments officiels SPW de la rue
    const pt = { lat: cand.lat, lng: cand.lng }
    if (bracketing.lower && bracketing.upper) {
      const pairDist = haversineMeters(bracketing.lower, bracketing.upper)
      const maxAllowed = Math.max(650, pairDist * 1.8 + 250)
      const nearestBracket = Math.min(
        haversineMeters(pt, bracketing.lower),
        haversineMeters(pt, bracketing.upper)
      )
      if (nearestBracket > maxAllowed) return null
      return { exact: houseCompat.exact, distScore: nearestBracket }
    }

    if (spwHouses.length > 0) {
      let minDist = Infinity
      for (const h of spwHouses) {
        const d = haversineMeters(pt, h)
        if (d < minDist) minDist = d
      }
      if (minDist > 1500) return null
      return { exact: houseCompat.exact, distScore: minDist }
    }

    if (streetAnchorCoords) {
      const distToStreet = haversineMeters(pt, streetAnchorCoords)
      if (distToStreet > 2500) return null
      return { exact: houseCompat.exact, distScore: distToStreet }
    }

    return { exact: houseCompat.exact, distScore: 0 }
  }

  // 1. Photon OSM géolocalisé sur l'ancre SPW
  try {
    const q = `${canonicalStreet} ${targetStem}, ${officialPostalCode} ${localityHint}`.trim()
    const url = new URL("https://photon.komoot.io/api/")
    url.searchParams.set("q", q)
    url.searchParams.set("limit", "8")
    url.searchParams.set("lang", "fr")
    if (anchorPoint) {
      url.searchParams.set("lat", String(anchorPoint.lat))
      url.searchParams.set("lon", String(anchorPoint.lng))
    }

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2800) })
    if (res.ok) {
      const data = await res.json()
      const features = Array.isArray(data?.features) ? data.features : []
      let best: { lat: number; lng: number; exact: boolean; distScore: number } | null = null

      for (const f of features) {
        const props = f?.properties || {}
        const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : null
        if (!coords || coords.length < 2) continue
        const lat = Number(coords[1])
        const lng = Number(coords[0])
        const check = validateCandidate({
          lat,
          lng,
          countryCode: props.countrycode ? String(props.countrycode) : undefined,
          postcode: props.postcode ? String(props.postcode) : undefined,
          street: props.street ? String(props.street) : props.name ? String(props.name) : undefined,
          houseNumber: props.housenumber ? String(props.housenumber) : undefined,
        })
        if (!check) continue
        if (
          !best ||
          (check.exact && !best.exact) ||
          (check.exact === best.exact && check.distScore < best.distScore)
        ) {
          best = { lat, lng, ...check }
        }
      }

      if (best) {
        return { lat: Number(best.lat.toFixed(7)), lng: Number(best.lng.toFixed(7)) }
      }
    }
  } catch {
    // Fallback Nominatim si Photon indisponible
  }

  // 2. Fallback Nominatim OSM (filtré par rue + CP exact + Belgique)
  try {
    const nomUrl = new URL("https://nominatim.openstreetmap.org/search")
    nomUrl.searchParams.set("street", `${targetStem} ${canonicalStreet}`.trim())
    nomUrl.searchParams.set("postalcode", officialPostalCode)
    nomUrl.searchParams.set("country", "Belgium")
    nomUrl.searchParams.set("format", "json")
    nomUrl.searchParams.set("addressdetails", "1")
    nomUrl.searchParams.set("limit", "5")

    const res = await fetch(nomUrl.toString(), {
      headers: {
        "User-Agent": "AegisSolaire-AddressVerifier/1.0 (+https://aegissolaire.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const rows = await res.json()
      const list = Array.isArray(rows) ? rows : []
      let best: { lat: number; lng: number; exact: boolean; distScore: number } | null = null

      for (const row of list) {
        const addr = row?.address || {}
        const lat = Number(row?.lat)
        const lng = Number(row?.lon)
        const check = validateCandidate({
          lat,
          lng,
          countryCode: addr.country_code ? String(addr.country_code) : undefined,
          postcode: addr.postcode ? String(addr.postcode) : undefined,
          street: addr.road ? String(addr.road) : undefined,
          houseNumber: addr.house_number ? String(addr.house_number) : undefined,
        })
        if (!check) continue
        if (
          !best ||
          (check.exact && !best.exact) ||
          (check.exact === best.exact && check.distScore < best.distScore)
        ) {
          best = { lat, lng, ...check }
        }
      }

      if (best) {
        return { lat: Number(best.lat.toFixed(7)), lng: Number(best.lng.toFixed(7)) }
      }
    }
  } catch {
    // Non-bloquant
  }

  return null
}

/**
 * Résout des coordonnées fiables au niveau bâtiment (jamais le centroïde d'une rue ou commune)
 * lorsque SPW ICAR confirme le bâtiment/la rue sans fournir house.geometry.
 */
async function resolveWalloniaBuildingCoordinates(params: {
  streetIdent: number | null
  canonicalStreet: string
  houseNumber: string
  officialPostalCode: string
  officialSection: string
  officialCity: string
  streetAnchorCoords: { lat: number; lng: number } | null
}): Promise<{
  coordinates: { lat: number; lng: number } | null
  coordinatesPrecision: AddressCoordinatesPrecision
  coordinatesSource: AddressCoordinatesSource
}> {
  const {
    streetIdent,
    canonicalStreet,
    houseNumber,
    officialPostalCode,
    officialSection,
    officialCity,
    streetAnchorCoords,
  } = params

  const spwHouses = streetIdent ? await getSpwStreetHouses(streetIdent) : []

  // 1. Vérifier si geolist possède quand même une géométrie pour ce numéro ou son radical
  if (spwHouses.length > 0) {
    let bestGeolist: { house: SpwGeocodedHouse; exact: boolean } | null = null
    for (const h of spwHouses) {
      const compat = isCompatibleHouseNumber(houseNumber, h.name)
      if (!compat.match) continue
      if (!bestGeolist || (compat.exact && !bestGeolist.exact)) {
        bestGeolist = { house: h, exact: compat.exact }
      }
    }
    if (bestGeolist) {
      return {
        coordinates: {
          lat: Number(bestGeolist.house.lat.toFixed(7)),
          lng: Number(bestGeolist.house.lng.toFixed(7)),
        },
        coordinatesPrecision: "house",
        coordinatesSource: "SPW_GEOLIST_HOUSE",
      }
    }
  }

  // 2. Bâtiment OSM strictement vérifié sur le CP officiel, la voirie SPW et les voisins SPW
  const osmBuilding = await resolveAnchoredOsmBuildingCoords({
    canonicalStreet,
    houseNumber,
    officialPostalCode,
    officialSection,
    officialCity,
    spwHouses,
    streetAnchorCoords,
  })
  if (osmBuilding) {
    return {
      coordinates: osmBuilding,
      coordinatesPrecision: "house",
      coordinatesSource: "OSM_BUILDING_SPW_ANCHORED",
    }
  }

  // 3. Interpolation entre les numéros officiels SPW encadrants de la même rue
  const interpolated = interpolateFromSpwNeighbors(spwHouses, houseNumber)
  if (interpolated) {
    return {
      coordinates: interpolated,
      coordinatesPrecision: "interpolated",
      coordinatesSource: "SPW_NEIGHBORS_INTERPOLATED",
    }
  }

  return {
    coordinates: null,
    coordinatesPrecision: "street",
    coordinatesSource: null,
  }
}

export function buildMapLinks(params: {
  streetAddress?: string | null
  postalCode?: string | null
  city?: string | null
  coordinates?: { lat: number; lng: number } | null
  coordinatesPrecision?: AddressCoordinatesPrecision | null
}): { googleMapsUrl: string; googleEarthUrl: string; walOnMapUrl: string } {
  const addressParts = [params.streetAddress, params.postalCode, params.city]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)

  const fullQuery =
    addressParts.length > 0 ? [...addressParts, "Belgique"].join(", ") : "Wallonie, Belgique"
  const walOnMapAddressQuery = addressParts.join(" ")

  const precisionBlocked =
    params.coordinatesPrecision === "street" ||
    params.coordinatesPrecision === "locality" ||
    params.coordinatesPrecision === "none"

  const rawCoords = precisionBlocked ? null : params.coordinates
  const validCoords =
    rawCoords &&
      typeof rawCoords.lat === "number" &&
      typeof rawCoords.lng === "number" &&
      Number.isFinite(rawCoords.lat) &&
      Number.isFinite(rawCoords.lng)
      ? {
        lat: Number(rawCoords.lat.toFixed(7)),
        lng: Number(rawCoords.lng.toFixed(7)),
      }
      : null

  const googleMapsUrl = validCoords
    ? `https://www.google.com/maps/search/?api=1&query=${validCoords.lat},${validCoords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery || "Wallonie, Belgique")}`

  const googleEarthUrl = validCoords
    ? `https://earth.google.com/web/search/${validCoords.lat},${validCoords.lng}`
    : `https://earth.google.com/web/search/${encodeURIComponent(fullQuery || "Wallonie, Belgique")}`

  const walOnMapUrl = validCoords
    ? `https://geoportail.wallonie.be/carte#COOR=${validCoords.lat},${validCoords.lng},4326|SHOW=true`
    : walOnMapAddressQuery
      ? `https://geoportail.wallonie.be/carte#ADR=${encodeURIComponent(walOnMapAddressQuery)}|SHOW=true`
      : "https://geoportail.wallonie.be/carte"

  return {
    googleMapsUrl,
    googleEarthUrl,
    walOnMapUrl,
  }
}

/**
 * Vérification rigoureuse SPW ICAR Wallonie (rue, numéro de bâtiment, code postal, coordonnées WGS84).
 * Ne retourne JAMAIS 100% pour une simple rue sans numéro ni en cas d'incohérence de code postal.
 */
export async function verifyWalloniaAddressStrict(params: {
  postalCode?: string | null
  city?: string | null
  streetAddress?: string | null
  street?: string | null
  houseNumber?: string | null
}): Promise<VerifiedBelgianAddressResult> {
  const cleanPostal = (params.postalCode ?? "").replace(/\D/g, "").slice(0, 4)
  const cleanCity = (params.city ?? "").trim()
  const rawStreetAddr = (params.streetAddress ?? "").trim()

  const parsed =
    params.street !== undefined && params.street !== null
      ? {
        street: params.street.trim(),
        houseNumber: params.houseNumber?.trim() || null,
        box: null,
      }
      : extractBelgianStreetAndNumber(rawStreetAddr)

  const hasHouseNumber = Boolean(parsed.houseNumber)
  const isWalloon = cleanPostal.length === 4 ? isWalloonPostalCode(cleanPostal) : false
  const scopesParam = isWalloon || !cleanPostal ? "WAL" : "WAL,BRU,VLA"

  const emptyLinks = buildMapLinks({
    streetAddress: rawStreetAddr || parsed.street,
    postalCode: cleanPostal,
    city: cleanCity,
    coordinates: null,
  })

  const cityPostalContradiction = detectCityPostalContradiction({
    postalCode: cleanPostal || null,
    city: cleanCity || null,
    siteAddress: rawStreetAddr || null,
    walloniaOnly: isWalloon || !cleanPostal,
  })

  if (cityPostalContradiction) {
    return {
      validInWallonia: false,
      resolutionLevel: "none",
      streetVerified: false,
      houseVerified: false,
      hasHouseNumber,
      postalMismatch: true,
      officialCity: cleanCity || undefined,
      officialPostalCode: cleanPostal || undefined,
      confidenceScore: 0,
      source: "SPW_ICAR",
      rawCandidatesCount: 0,
      ...emptyLinks,
    }
  }

  if (!cleanPostal && !cleanCity && !parsed.street) {
    return {
      validInWallonia: false,
      resolutionLevel: "none",
      streetVerified: false,
      houseVerified: false,
      hasHouseNumber: false,
      postalMismatch: false,
      confidenceScore: 0,
      source: "SPW_ICAR",
      rawCandidatesCount: 0,
      ...emptyLinks,
    }
  }

  try {
    // 1. Si Wallonie + nom de rue saisi : tenter une résolution orthographique via l'annuaire SPW du CP
    let canonicalCandidateStreet: SpwStreetDirectoryItem | null = null
    if (isWalloon && parsed.street) {
      const directory = await getStreetsForPostalCode(cleanPostal)
      let bestScore = 0
      for (const item of directory) {
        const s = computeStreetMatchScore(parsed.street, item.streetName)
        if (s > bestScore) {
          bestScore = s
          canonicalCandidateStreet = item
        }
      }
      // N'utiliser le nom canonique SPW que si la correspondance est solide (>= 72)
      if (bestScore < 72) {
        canonicalCandidateStreet = null
      }
    }

    const queryStreet = canonicalCandidateStreet?.streetName || parsed.street

    const fetchGeocodeCandidates = async (houseParam: string | null): Promise<any[]> => {
      const url = new URL(`${SPW_BASE}/geocode`)
      url.searchParams.set("street", queryStreet)
      url.searchParams.set("zone", cleanPostal)
      if (houseParam) {
        url.searchParams.set("house", houseParam)
      }
      url.searchParams.set("crs", "EPSG:4326")
      url.searchParams.set("geom", "true")
      url.searchParams.set("scopes", scopesParam)

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4500) })
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data?.candidates) ? data.candidates : []
    }

    // 2. Interroger SPW geocodeWS/geocode avec paramètres structurés + EPSG:4326
    if (queryStreet && cleanPostal) {
      let candidates = await fetchGeocodeCandidates(parsed.houseNumber)

      // Si un numéro avec suffixe ("113c", "12A", "12-14", "4bis") ne remonte pas de bâtiment exact,
      // retenter le radical numérique ("113", "12", "4") pour vérifier le bâtiment parent.
      if (parsed.houseNumber) {
        const numericStem = parsed.houseNumber.match(/^(\d{1,4})/)?.[1] || null
        const hasHouseMatch = candidates.some((c: any) => Boolean(c?.house?.name))
        if (!hasHouseMatch && numericStem && numericStem !== parsed.houseNumber) {
          const stemCandidates = await fetchGeocodeCandidates(numericStem)
          if (stemCandidates.some((c: any) => Boolean(c?.house?.name)) || stemCandidates.length > candidates.length) {
            candidates = stemCandidates
          }
        }
      }

      if (candidates.length > 0) {
        // Sélectionner le candidat qui correspond vraiment au code postal ET à la rue demandée
        const matchingPostalCandidates = candidates.filter((c: any) => {
          const zIdent = c?.zone?.ident ? String(c.zone.ident) : null
          return !zIdent || zIdent === cleanPostal
        })

        if (candidates.length > 0 && matchingPostalCandidates.length === 0) {
          return {
            validInWallonia: false,
            resolutionLevel: "none",
            streetVerified: false,
            houseVerified: false,
            hasHouseNumber,
            postalMismatch: true,
            officialCity: candidates[0]?.city?.name || cleanCity || undefined,
            officialPostalCode: candidates[0]?.zone?.ident || cleanPostal,
            confidenceScore: 0,
            source: "SPW_ICAR",
            rawCandidatesCount: candidates.length,
            ...emptyLinks,
          }
        }

        // Chercher le meilleur candidat dans le bon CP dont le nom de rue correspond vraiment
        let bestCand: any = null
        let bestStreetSim = 0
        for (const c of matchingPostalCandidates) {
          const cStreetName = c?.street?.name ? String(c.street.name) : ""
          const sim = cStreetName ? computeStreetMatchScore(queryStreet, cStreetName) : 0
          // Favoriser un candidat qui a `house` et encore plus s'il a `house.geometry`
          const bonus =
            (c?.house?.name ? 10 : 0) +
            (Array.isArray(c?.house?.geometry?.coordinates) && c.house.geometry.coordinates.length >= 2
              ? 5
              : 0)
          if (sim + bonus > bestStreetSim) {
            bestStreetSim = sim + bonus
            bestCand = c
          }
        }

        // Vérifier s'il s'agit vraiment de la bonne rue (score >= 70)
        const candStreetName = bestCand?.street?.name ? String(bestCand.street.name) : ""
        const pureStreetSim = candStreetName ? computeStreetMatchScore(queryStreet, candStreetName) : 0

        if (bestCand && pureStreetSim >= 70) {
          const houseObj = bestCand.house
          const streetObj = bestCand.street
          const houseGeomCoords = Array.isArray(houseObj?.geometry?.coordinates)
            ? houseObj.geometry.coordinates
            : null
          const streetGeomCoords = Array.isArray(streetObj?.geometry?.coordinates)
            ? streetObj.geometry.coordinates
            : null
          const streetAnchorCoords =
            streetGeomCoords && streetGeomCoords.length >= 2
              ? { lat: Number(streetGeomCoords[1]), lng: Number(streetGeomCoords[0]) }
              : null

          const houseVerified = Boolean(houseObj?.name)
          const officialCity = String(bestCand.city?.name || cleanCity || "")
          const officialSection = String(bestCand.zone?.name || canonicalCandidateStreet?.section || officialCity)
          const officialPostalCode = String(bestCand.zone?.ident || cleanPostal)
          const resolvedStreet = candStreetName

          // Préserver le suffixe d'entrée ("113c", "12A", "4bis", "33/2") si SPW normalise sur le radical numérique
          const rawSpwHouse = houseObj?.name ? String(houseObj.name).trim() : null
          const parsedHouseTrimmed = parsed.houseNumber?.trim() || null
          let resolvedHouse = parsedHouseTrimmed
          if (rawSpwHouse && parsedHouseTrimmed) {
            const normSpw = rawSpwHouse.toLowerCase()
            const normParsed = parsedHouseTrimmed.toLowerCase()
            if (normSpw === normParsed) {
              resolvedHouse = rawSpwHouse
            } else if (normParsed.startsWith(normSpw) && normParsed.length > normSpw.length) {
              resolvedHouse = parsedHouseTrimmed
            } else {
              resolvedHouse = rawSpwHouse
            }
          } else if (rawSpwHouse) {
            resolvedHouse = rawSpwHouse
          }

          let coordinates: { lat: number; lng: number } | null = null
          let coordinatesPrecision: AddressCoordinatesPrecision = "street"
          let coordinatesSource: AddressCoordinatesSource = null

          if (houseGeomCoords && houseGeomCoords.length >= 2) {
            coordinates = {
              lat: Number(houseGeomCoords[1]),
              lng: Number(houseGeomCoords[0]),
            }
            coordinatesPrecision = "house"
            coordinatesSource = "SPW_ICAR_HOUSE"
          } else if (resolvedHouse) {
            const streetIdent = Number(streetObj?.ident || canonicalCandidateStreet?.streetIdent || 0) || null
            const resolved = await resolveWalloniaBuildingCoordinates({
              streetIdent,
              canonicalStreet: resolvedStreet,
              houseNumber: resolvedHouse,
              officialPostalCode,
              officialSection,
              officialCity,
              streetAnchorCoords,
            })
            coordinates = resolved.coordinates
            coordinatesPrecision = resolved.coordinatesPrecision
            coordinatesSource = resolved.coordinatesSource
          }

          const resolutionLevel: AddressResolutionLevel = houseVerified
            ? "house"
            : "street"

          const confidenceScore = houseVerified
            ? 100
            : hasHouseNumber
              ? 70 // Rue officielle OK, mais numéro non trouvé dans le cadastre SPW
              : 45 // Rue trouvée, mais numéro manquant

          const formattedAddr = [resolvedStreet, resolvedHouse].filter(Boolean).join(" ")
          const links = buildMapLinks({
            streetAddress: formattedAddr,
            postalCode: officialPostalCode,
            city: officialSection || officialCity,
            coordinates,
            coordinatesPrecision,
          })

          return {
            validInWallonia: isWalloon,
            resolutionLevel,
            streetVerified: true,
            houseVerified,
            hasHouseNumber,
            postalMismatch: false,
            officialCity: officialCity || undefined,
            officialSection: officialSection || undefined,
            officialPostalCode,
            canonicalStreet: resolvedStreet,
            houseNumber: resolvedHouse,
            confidenceScore,
            source: "SPW_ICAR",
            rawCandidatesCount: matchingPostalCandidates.length,
            coordinates,
            coordinatesPrecision,
            coordinatesSource,
            ...links,
          }
        }
      }
    }

    // 3. Fallback : vérifier au minimum la localité / code postal via geolist
    if (isWalloon && cleanPostal) {
      const localities = await getLocalitiesForPostalCode(cleanPostal)
      if (localities.length > 0) {
        const primary = localities[0]
        const streetSim = canonicalCandidateStreet ? 100 : 0
        // Fallback si SPW geocode n'a rien remonté mais que la rue existe dans l'annuaire geolist du CP
        if (canonicalCandidateStreet && parsed.houseNumber) {
          const resolved = await resolveWalloniaBuildingCoordinates({
            streetIdent: canonicalCandidateStreet.streetIdent || null,
            canonicalStreet: canonicalCandidateStreet.streetName,
            houseNumber: parsed.houseNumber,
            officialPostalCode: cleanPostal,
            officialSection: canonicalCandidateStreet.section || primary.name,
            officialCity: primary.city || cleanCity,
            streetAnchorCoords: null,
          })
          const formattedFallbackAddr = `${canonicalCandidateStreet.streetName} ${parsed.houseNumber}`.trim()
          const links = buildMapLinks({
            streetAddress: formattedFallbackAddr,
            postalCode: cleanPostal,
            city: canonicalCandidateStreet.section || primary.city || cleanCity,
            coordinates: resolved.coordinates,
            coordinatesPrecision: resolved.coordinatesPrecision,
          })
          return {
            validInWallonia: true,
            resolutionLevel: "street",
            streetVerified: true,
            houseVerified: false,
            hasHouseNumber,
            postalMismatch: false,
            officialCity: primary.city,
            officialSection: canonicalCandidateStreet.section || primary.name,
            officialPostalCode: cleanPostal,
            canonicalStreet: canonicalCandidateStreet.streetName,
            houseNumber: parsed.houseNumber,
            confidenceScore: 65,
            source: "SPW_ICAR",
            rawCandidatesCount: localities.length,
            coordinates: resolved.coordinates,
            coordinatesPrecision: resolved.coordinatesPrecision,
            coordinatesSource: resolved.coordinatesSource,
            ...links,
          }
        }

        const links = buildMapLinks({
          streetAddress: canonicalCandidateStreet
            ? [canonicalCandidateStreet.streetName, parsed.houseNumber].filter(Boolean).join(" ")
            : rawStreetAddr || parsed.street,
          postalCode: cleanPostal,
          city: canonicalCandidateStreet?.section || primary.city || cleanCity,
          coordinates: null,
        })
        return {
          validInWallonia: true,
          resolutionLevel: streetSim >= 72 ? "street" : "locality",
          streetVerified: streetSim >= 72,
          houseVerified: false,
          hasHouseNumber,
          postalMismatch: false,
          officialCity: primary.city,
          officialSection: primary.name,
          officialPostalCode: cleanPostal,
          canonicalStreet: canonicalCandidateStreet?.streetName,
          houseNumber: parsed.houseNumber,
          confidenceScore: streetSim >= 72 ? (hasHouseNumber ? 65 : 40) : 30,
          source: "SPW_ICAR",
          rawCandidatesCount: localities.length,
          coordinates: null,
          coordinatesPrecision: streetSim >= 72 ? "street" : "locality",
          coordinatesSource: null,
          ...links,
        }
      }
    }
  } catch {
    // Non-bloquant si SPW temporairement indisponible
  }

  return {
    validInWallonia: false,
    resolutionLevel: "none",
    streetVerified: false,
    houseVerified: false,
    hasHouseNumber,
    postalMismatch: false,
    officialCity: cleanCity || undefined,
    officialPostalCode: cleanPostal || undefined,
    houseNumber: parsed.houseNumber,
    confidenceScore: 0,
    source: "SPW_ICAR",
    rawCandidatesCount: 0,
    ...emptyLinks,
  }
}
