import { resolveMx } from "node:dns/promises"

/**
 * Liste non exhaustive des fournisseurs d'adresses temporaires/jetables connues.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "trashmail.com",
  "getairmail.com",
  "dispostable.com",
])

export interface EmailMxVerificationResult {
  valid: boolean
  isDisposable: boolean
  domain: string
  mxServers: string[]
  reason?: string
}

export interface WalloniaAddressVerificationResult {
  validInWallonia: boolean
  officialCity?: string
  officialPostalCode?: string
  confidenceScore: number // 0 à 100
  source: "SPW_ICAR"
  rawCandidatesCount: number
}

export interface CbeCompanyVerificationResult {
  verified: boolean
  active: boolean
  vatNumber?: string
  officialName?: string
  legalForm?: string
  fullAddress?: string
  postalCode?: string
  city?: string
  isWalloniaHeadquarters?: boolean
  naceCode?: string
  naceDescription?: string
  error?: string
}

export interface LeadEnrichedVerification {
  emailMx: EmailMxVerificationResult
  walloniaAddress: WalloniaAddressVerificationResult
  cbeCompany?: CbeCompanyVerificationResult | null
  globalTrustScoreDelta: number
  trustBadges: string[]
  warningFlags: string[]
}

/**
 * 1. Contrôle DNS MX : vérifie l'existence réelle des serveurs de messagerie du domaine e-mail.
 */
export async function verifyEmailDomainMx(email: string): Promise<EmailMxVerificationResult> {
  const trimmed = email.trim().toLowerCase()
  const atIdx = trimmed.lastIndexOf("@")
  if (atIdx === -1 || atIdx === trimmed.length - 1) {
    return {
      valid: false,
      isDisposable: false,
      domain: "",
      mxServers: [],
      reason: "Format e-mail invalide",
    }
  }

  const domain = trimmed.slice(atIdx + 1)

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      isDisposable: true,
      domain,
      mxServers: [],
      reason: "Nom de domaine d'e-mail jetable / temporaire détecté",
    }
  }

  try {
    const mxRecords = await resolveMx(domain)
    if (!mxRecords || mxRecords.length === 0) {
      return {
        valid: false,
        isDisposable: false,
        domain,
        mxServers: [],
        reason: "Aucun serveur de messagerie (MX) configuré pour ce domaine",
      }
    }

    const sortedServers = mxRecords
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange)

    return {
      valid: true,
      isDisposable: false,
      domain,
      mxServers: sortedServers,
    }
  } catch (err: any) {
    const code = err?.code || "MX_LOOKUP_FAILED"
    return {
      valid: false,
      isDisposable: false,
      domain,
      mxServers: [],
      reason: code === "ENOTFOUND" || code === "ENODATA"
        ? "Nom de domaine inexistant ou sans serveur e-mail"
        : `Échec de résolution DNS (${code})`,
    }
  }
}

/**
 * 2. Contrôle Géoportail de la Wallonie (SPW / ICAR) :
 * Vérifie officiellement l'existence de la commune, du code postal et de l'adresse en Région wallonne.
 */
export async function verifyWalloniaAddressSpw(params: {
  postalCode?: string | null
  city?: string | null
  streetAddress?: string | null
}): Promise<WalloniaAddressVerificationResult> {
  const { postalCode, city, streetAddress } = params
  const cleanPostal = postalCode?.trim() || ""
  const cleanCity = city?.trim() || ""
  const cleanStreet = streetAddress?.trim() || ""

  // Si aucune donnée de localisation wallonne n'est fournie
  if (!cleanPostal && !cleanCity && !cleanStreet) {
    return {
      validInWallonia: false,
      confidenceScore: 0,
      source: "SPW_ICAR",
      rawCandidatesCount: 0,
    }
  }

  try {
    // Interrogation de l'API officielle geocodeWS du SPW
    const queryZone = cleanPostal || cleanCity
    const url = new URL("https://geoservices.wallonie.be/geocodeWS/geolist")
    url.searchParams.set("zone", queryZone)
    if (cleanStreet) {
      url.searchParams.set("street", cleanStreet)
    }

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      return {
        validInWallonia: false,
        confidenceScore: 0,
        source: "SPW_ICAR",
        rawCandidatesCount: 0,
      }
    }

    const data = await res.json()
    const candidates = Array.isArray(data?.candidates) ? data.candidates : []

    if (candidates.length === 0) {
      // Deuxième tentative : recherche libre sur la commune seule
      if (cleanPostal && cleanPostal !== queryZone) {
        const fallbackUrl = `https://geoservices.wallonie.be/geocodeWS/geolist?zone=${encodeURIComponent(cleanPostal)}`
        const fallbackRes = await fetch(fallbackUrl, {
          signal: AbortSignal.timeout(3000),
          headers: { Accept: "application/json" },
        })
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          if (Array.isArray(fallbackData?.candidates) && fallbackData.candidates.length > 0) {
            const best = fallbackData.candidates[0]
            return {
              validInWallonia: true,
              officialCity: best?.city?.name || best?.zone?.name,
              officialPostalCode: best?.zone?.ident || cleanPostal,
              confidenceScore: 85,
              source: "SPW_ICAR",
              rawCandidatesCount: fallbackData.candidates.length,
            }
          }
        }
      }

      return {
        validInWallonia: false,
        confidenceScore: 10,
        source: "SPW_ICAR",
        rawCandidatesCount: 0,
      }
    }

    const bestCandidate = candidates[0]
    const officialCity = bestCandidate?.city?.name || bestCandidate?.zone?.name || cleanCity
    const officialPostal = bestCandidate?.zone?.ident || cleanPostal

    return {
      validInWallonia: true,
      officialCity,
      officialPostalCode: officialPostal,
      confidenceScore: cleanStreet ? 100 : 90,
      source: "SPW_ICAR",
      rawCandidatesCount: candidates.length,
    }
  } catch (e) {
    console.warn("[SPW Geoportail] Erreur ou timeout consultation SPW:", e)
    return {
      validInWallonia: true, // Tolérance de résilience réseau
      confidenceScore: 50,
      source: "SPW_ICAR",
      rawCandidatesCount: 0,
    }
  }
}

/**
 * 3. Contrôle Entreprise BCE / KBO via cbeapi.be :
 * Vérifie le numéro d'entreprise, le statut actif vs faillite, l'adresse du siège et l'activité NACE.
 */
export async function verifyBelgianCompanyCbe(
  rawVatNumber: string,
  apiKeyOverride?: string
): Promise<CbeCompanyVerificationResult> {
  const apiKey = apiKeyOverride || process.env.CBE_API_KEY
  if (!apiKey) {
    return {
      verified: false,
      active: false,
      error: "Clé CBE_API_KEY non configurée",
    }
  }

  // Nettoyage du numéro de TVA (ex: "BE 0478.963.210" -> "0478963210")
  const digitsOnly = rawVatNumber.replace(/[^0-9]/g, "")
  if (digitsOnly.length < 9 || digitsOnly.length > 10) {
    return {
      verified: false,
      active: false,
      error: "Format de numéro d'entreprise invalide (doit contenir 9 ou 10 chiffres)",
    }
  }

  const paddedVat = digitsOnly.padStart(10, "0")

  try {
    const url = `https://cbeapi.be/api/v1/company/${paddedVat}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    })

    if (res.status === 404) {
      return {
        verified: false,
        active: false,
        vatNumber: paddedVat,
        error: "Entreprise introuvable dans la Banque-Carrefour des Entreprises",
      }
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return {
        verified: false,
        active: false,
        vatNumber: paddedVat,
        error: `Erreur API CBE (${res.status}): ${errText.slice(0, 100)}`,
      }
    }

    const data = await res.json()
    const company = data?.data || data

    // Analyse du statut de l'entreprise
    const rawStatus = (company?.status || company?.registration_status || "").toString().toLowerCase()
    const isActive = rawStatus === "active" || rawStatus === "actif" || rawStatus === "" || !rawStatus.includes("stop")

    const officialName = company?.denomination || company?.denomination_with_legal_form || company?.name || company?.commercial_name || ""
    const legalForm = company?.juridical_form || company?.juridical_form_short || company?.legal_form?.description || company?.legal_form || ""

    const addressObj = company?.address || company?.headquarters?.address || {}
    const postalCode = addressObj?.post_code || addressObj?.zip_code || addressObj?.postal_code || ""
    const city = addressObj?.city || addressObj?.municipality || ""
    const fullAddress = addressObj?.full_address || [addressObj?.street, addressObj?.street_number, postalCode, city].filter(Boolean).join(" ")

    // Détermination si le siège est situé en Wallonie (codes postaux 1300-1499 et 4000-7999)
    const postalNum = parseInt(postalCode, 10)
    const isWallonia =
      (!Number.isNaN(postalNum) &&
        ((postalNum >= 1300 && postalNum <= 1499) || (postalNum >= 4000 && postalNum <= 7999))) ||
      false

    // Activité principale NACE
    const mainNace = Array.isArray(company?.nace_activities)
      ? company.nace_activities[0]
      : Array.isArray(company?.activities)
      ? company.activities[0]
      : company?.main_activity || null

    const naceCode = mainNace?.code || mainNace?.nace_code || ""
    const naceDescription = mainNace?.description || mainNace?.name || ""

    return {
      verified: true,
      active: isActive,
      vatNumber: paddedVat,
      officialName,
      legalForm: typeof legalForm === "string" ? legalForm : "",
      fullAddress,
      postalCode,
      city,
      isWalloniaHeadquarters: isWallonia,
      naceCode,
      naceDescription,
    }
  } catch (err: any) {
    console.error("[CBE API] Exception lors de l'appel:", err)
    return {
      verified: false,
      active: false,
      vatNumber: paddedVat,
      error: err?.message || "Erreur de connexion cbeapi.be",
    }
  }
}

/**
 * Moteur d'enrichissement global : exécute les 3 vérifications en parallèle (< 300 ms).
 */
export async function enrichLeadVerifications(params: {
  email: string
  postalCode?: string | null
  city?: string | null
  streetAddress?: string | null
  companyVat?: string | null
  segment?: string | null
}): Promise<LeadEnrichedVerification> {
  const { email, postalCode, city, streetAddress, companyVat, segment } = params

  const [mxRes, spwRes, cbeRes] = await Promise.allSettled([
    verifyEmailDomainMx(email),
    verifyWalloniaAddressSpw({ postalCode, city, streetAddress }),
    companyVat && segment === "B2B" ? verifyBelgianCompanyCbe(companyVat) : Promise.resolve(null),
  ])

  const emailMx: EmailMxVerificationResult =
    mxRes.status === "fulfilled"
      ? mxRes.value
      : { valid: true, isDisposable: false, domain: "", mxServers: [] }

  const walloniaAddress: WalloniaAddressVerificationResult =
    spwRes.status === "fulfilled"
      ? spwRes.value
      : { validInWallonia: true, confidenceScore: 50, source: "SPW_ICAR", rawCandidatesCount: 0 }

  const cbeCompany: CbeCompanyVerificationResult | null =
    cbeRes.status === "fulfilled" ? cbeRes.value : null

  let globalTrustScoreDelta = 0
  const trustBadges: string[] = []
  const warningFlags: string[] = []

  // 1. Évaluation E-mail MX
  if (emailMx.valid) {
    globalTrustScoreDelta += 5
    trustBadges.push("Serveurs e-mail MX valides")
  } else if (emailMx.isDisposable) {
    globalTrustScoreDelta -= 40
    warningFlags.push("Adresse e-mail temporaire / jetable")
  } else {
    globalTrustScoreDelta -= 30
    warningFlags.push(emailMx.reason || "Domaine e-mail sans serveur de messagerie")
  }

  // 2. Évaluation Localisation SPW
  if (walloniaAddress.validInWallonia && walloniaAddress.confidenceScore >= 80) {
    globalTrustScoreDelta += 5
    trustBadges.push(`Commune certifiée SPW Wallonie (${walloniaAddress.officialCity || "ICAR"})`)
  } else if (!walloniaAddress.validInWallonia && walloniaAddress.confidenceScore <= 10) {
    globalTrustScoreDelta -= 20
    warningFlags.push("Localisation non répertoriée dans le cadastre SPW Wallonie")
  }

  // 3. Évaluation Entreprise BCE
  if (cbeCompany) {
    if (cbeCompany.verified && cbeCompany.active) {
      globalTrustScoreDelta += 15
      trustBadges.push(
        `BCE : Société active${cbeCompany.isWalloniaHeadquarters ? " (Siège en Wallonie)" : ""}`
      )
    } else if (cbeCompany.verified && !cbeCompany.active) {
      globalTrustScoreDelta -= 50
      warningFlags.push("BCE : Entreprise radiée, fermée ou en faillite")
    } else if (cbeCompany.error) {
      warningFlags.push(`BCE : ${cbeCompany.error}`)
    }
  }

  return {
    emailMx,
    walloniaAddress,
    cbeCompany,
    globalTrustScoreDelta,
    trustBadges,
    warningFlags,
  }
}
