import {
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
  googleMapsUrl?: string
  streetViewUrl?: string
  walOnMapUrl?: string
}

const SPW_BASE = "https://geoservices.wallonie.be/geocodeWS"
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 heures
const MAX_CACHED_ZONES = 350

const streetCache = new Map<
  string,
  { expiresAt: number; items: SpwStreetDirectoryItem[] }
>()
const streetInflight = new Map<string, Promise<SpwStreetDirectoryItem[]>>()

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

export function buildMapLinks(params: {
  streetAddress?: string | null
  postalCode?: string | null
  city?: string | null
  coordinates?: { lat: number; lng: number } | null
}): { googleMapsUrl: string; streetViewUrl: string; walOnMapUrl: string } {
  const fullQuery = [params.streetAddress, params.postalCode, params.city, "Belgique"]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ")

  const coords = params.coordinates
  const googleMapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery || "Wallonie, Belgique")}`

  const streetViewUrl = coords
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery || "Wallonie, Belgique")}`

  const walOnMapUrl = `https://geoportail.wallonie.be/walonmap#BBOX=` +
    (coords
      ? `${coords.lng - 0.0015},${coords.lat - 0.0015},${coords.lng + 0.0015},${coords.lat + 0.0015}`
      : "")

  return {
    googleMapsUrl,
    streetViewUrl,
    walOnMapUrl: coords ? walOnMapUrl : "https://geoportail.wallonie.be/walonmap",
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
          // Favoriser un candidat qui a aussi `house`
          const bonus = c?.house?.name ? 10 : 0
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
          const geom = houseObj?.geometry || streetObj?.geometry || bestCand.city?.geometry
          const coordsArray = Array.isArray(geom?.coordinates) ? geom.coordinates : null
          const coordinates =
            coordsArray && coordsArray.length >= 2
              ? { lat: Number(coordsArray[1]), lng: Number(coordsArray[0]) }
              : null

          const houseVerified = Boolean(houseObj?.name)
          const officialCity = String(bestCand.city?.name || cleanCity || "")
          const officialSection = String(bestCand.zone?.name || canonicalCandidateStreet?.section || officialCity)
          const officialPostalCode = String(bestCand.zone?.ident || cleanPostal)
          const resolvedStreet = candStreetName

          // Préserver le suffixe d'entrée ("113c", "12A", "4bis") si SPW normalise sur le radical numérique ("113")
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
        const links = buildMapLinks({
          streetAddress: rawStreetAddr || parsed.street,
          postalCode: cleanPostal,
          city: primary.city || cleanCity,
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
