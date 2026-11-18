import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js"

/** Numéros belges et français acceptés (formats courants +32 / +33). */
const PHONE_COUNTRIES = ["FR", "BE"] as const

/** Domaines e-mails jetables / temporaires bloqués sur l'ensemble du tunnel */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "yopmail.gq",
  "jetable.org",
  "trashmail.com",
  "trashmail.fr",
  "trashmail.net",
  "trashmail.me",
  "trash-mail.com",
  "mailinator.com",
  "mailinator.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "sharklasers.com",
  "grr.la",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "10minutemail.com",
  "10minutemail.net",
  "minutemail.com",
  "throwawaymail.com",
  "throwam.com",
  "getnada.com",
  "nada.email",
  "maildrop.cc",
  "fakeinbox.com",
  "dispostable.com",
  "mintemail.com",
  "mytemp.email",
  "mohmal.com",
  "crazymailing.com",
  "emailondeck.com",
  "mailnesia.com",
  "spamgourmet.com",
  "tempinbox.com",
  "mailcatch.com",
  "meltmail.com",
  "courrieltemporaire.com",
  "ephemail.net",
  "linshiyouxiang.net",
  "tempr.email",
  "discard.email",
  "spambox.us",
  "tempail.com",
  "emailfake.com",
  "fakemailgenerator.com",
  "inboxbear.com",
  "mailnull.com",
  "spam4.me",
  "tmail.ws",
  "byom.de",
])

/** Fautes de frappe fréquentes sur les messageries belges & européennes */
export const EMAIL_DOMAIN_TYPO_SUGGESTIONS: Record<string, string> = {
  "gmail.be": "gmail.com",
  "gmail.fr": "gmail.com",
  "gmail.nl": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.comm": "gmail.com",
  "googlemail.con": "gmail.com",
  "hotmail.con": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "homail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.cm": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "live.con": "live.be",
  "yaho.fr": "yahoo.fr",
  "yaho.com": "yahoo.com",
  "yhaoo.fr": "yahoo.fr",
  "yahoo.con": "yahoo.com",
  "icloud.con": "icloud.com",
  "icoud.com": "icloud.com",
  "iclod.com": "icloud.com",
  "skynet.com": "skynet.be",
  "skynet.fr": "skynet.be",
  "skynett.be": "skynet.be",
  "skeynet.be": "skynet.be",
  "proximus.com": "proximus.be",
  "proximus.fr": "proximus.be",
  "telenet.com": "telenet.be",
  "voo.com": "voo.be",
  "scarlet.com": "scarlet.be",
}

const PLACEHOLDER_EMAIL_LOCALS = new Set([
  "test",
  "teste",
  "testing",
  "fake",
  "bidon",
  "faux",
  "azerty",
  "qwerty",
  "asdf",
  "qwer",
  "xxx",
  "xxxx",
  "aaaa",
  "1234",
  "12345",
  "123456",
  "noreply",
  "no-reply",
  "dummy",
  "nobody",
  "null",
  "none",
  "example",
])

const RESERVED_TEST_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.be",
  "test.com",
  "test.be",
  "test.fr",
  "fake.com",
  "fake.be",
  "invalid.com",
  "localhost.com",
  "nomail.com",
])

export function getEmailTypoSuggestion(email: string): string | null {
  const domain = email.trim().toLowerCase().split("@")[1]
  if (!domain) return null
  return EMAIL_DOMAIN_TYPO_SUGGESTIONS[domain] ?? null
}

export function isDisposableEmailDomain(emailOrDomain: string): boolean {
  const raw = emailOrDomain.trim().toLowerCase()
  const domain = raw.includes("@") ? (raw.split("@")[1] ?? "") : raw
  if (!domain) return false
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true
  for (const d of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${d}`)) return true
  }
  return false
}

export function isPlaceholderEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split("@")
  if (parts.length !== 2) return false
  const [local, domain] = parts
  if (!local || !domain) return false
  if (RESERVED_TEST_DOMAINS.has(domain)) return true
  if (/\.(test|invalid|local|localhost|example)$/.test(domain)) return true
  if (PLACEHOLDER_EMAIL_LOCALS.has(local)) return true
  return false
}

const FAKE_SUBSCRIBER_SEQUENCES = [
  "012345",
  "123456",
  "234567",
  "345678",
  "456789",
  "567890",
  "098765",
  "987654",
  "876543",
  "765432",
  "654321",
  "543210",
  "010203",
  "102030",
  "203040",
  "304050",
  "405060",
  "506070",
  "607080",
  "708090",
  "020406",
  "112233",
  "223344",
  "334455",
  "445566",
  "556677",
  "667788",
  "778899",
  "001122",
  "998877",
  "887766",
  "776655",
  "665544",
  "554433",
  "443322",
  "332211",
  "221100",
  "121212",
  "131313",
  "101010",
  "010101",
  "123123",
  "000111",
  "111222",
  "424242",
  "696969",
]

const ARITHMETIC_FAKE_STEPS = new Set([1, 2, 3, 5, 10, 11])

/**
 * Détecte les numéros factices évidents dans les chiffres d'abonné (6 à 8 chiffres) :
 * - suite monotone (123456, 654321, 5 chiffres consécutifs +/-1)
 * - pas arithmétiques à 2 chiffres (10 20 30, 20 30 40, 15 25 35, 02 04 06)
 * - répétitions ABABAB (45 45 45), ABCABC (456 456), AABBCC (11 44 77)
 * - entropie très faible (<= 2 chiffres distincts ou 5 chiffres identiques d'affilée)
 */
export function isFakePhonePattern(subscriberDigits: string): boolean {
  const digits = subscriberDigits.replace(/\D/g, "")
  if (digits.length < 6) return false

  if (/(\d)\1{4,}/.test(digits)) return true
  if (new Set(digits.split("")).size <= 2) return true
  if (FAKE_SUBSCRIBER_SEQUENCES.some((seq) => digits.includes(seq))) return true

  const tail6 = digits.slice(-6)
  if (/^(\d\d)\1\1$/.test(tail6)) return true
  if (/^(\d\d\d)\1$/.test(tail6)) return true
  if (/^(\d)\1(\d)\2(\d)\3$/.test(tail6)) return true

  const p0 = parseInt(tail6.slice(0, 2), 10)
  const p1 = parseInt(tail6.slice(2, 4), 10)
  const p2 = parseInt(tail6.slice(4, 6), 10)
  const diff1 = p1 - p0
  const diff2 = p2 - p1
  if (diff1 !== 0 && diff1 === diff2 && ARITHMETIC_FAKE_STEPS.has(Math.abs(diff1))) {
    return true
  }

  let upRun = 0
  let downRun = 0
  for (let i = 1; i < digits.length; i++) {
    const prev = digits.charCodeAt(i - 1)
    const curr = digits.charCodeAt(i)
    if (curr - prev === 1) {
      upRun += 1
      downRun = 0
    } else if (prev - curr === 1) {
      downRun += 1
      upRun = 0
    } else {
      upRun = 0
      downRun = 0
    }
    if (upRun >= 4 || downRun >= 4) return true
  }

  return false
}

function parseFrOrBePhone(raw: string) {
  let cleaned = raw.replace(/[\s.\-()/]/g, "")
  if (cleaned.startsWith("+320")) cleaned = "+32" + cleaned.slice(4)
  if (cleaned.startsWith("00320")) cleaned = "+32" + cleaned.slice(5)
  else if (cleaned.startsWith("0032")) cleaned = "+32" + cleaned.slice(4)
  if (cleaned.startsWith("+330")) cleaned = "+33" + cleaned.slice(4)
  if (cleaned.startsWith("00330")) cleaned = "+33" + cleaned.slice(5)
  else if (cleaned.startsWith("0033")) cleaned = "+33" + cleaned.slice(4)

  if (!/^(\+33[1-9][0-9]{8}|\+32[1-9][0-9]{7,8}|0[1-9][0-9]{7,8})$/.test(cleaned)) {
    return null
  }
  if (!cleaned.startsWith("+33") && /^(\+32|0)(70|78|800|90\d)/.test(cleaned)) {
    return null
  }
  if (cleaned.startsWith("+338")) return null

  // En contexte belge (Aegis Solaire), un numéro local 045-049 (10 chiffres) ou fixe à 9 chiffres est belge en priorité.
  // Les mobiles français (06/07 à 10 chiffres) ou indicatifs explicitement +33 sont parsés comme FR.
  let parsed = null
  if (cleaned.startsWith("+33")) {
    parsed = parsePhoneNumberFromString(cleaned, "FR")
  } else if (cleaned.startsWith("+32")) {
    parsed = parsePhoneNumberFromString(cleaned, "BE")
  } else if (/^0[67]\d{8}$/.test(cleaned)) {
    parsed = parsePhoneNumberFromString(cleaned, "FR")
  } else if (cleaned.length === 9 || /^04[5-9]/.test(cleaned)) {
    parsed = parsePhoneNumberFromString(cleaned, "BE")
  } else {
    parsed = parsePhoneNumberFromString(cleaned, "FR") || parsePhoneNumberFromString(cleaned, "BE")
  }

  if (!parsed || !PHONE_COUNTRIES.includes(parsed.country as (typeof PHONE_COUNTRIES)[number])) {
    return null
  }
  if (!isValidPhoneNumber(cleaned, parsed.country)) return null
  return parsed
}

/** Valide un numéro français ou belge (format valide, pas de suites évidentes ni numéros surtaxés). */
export function isValidFrBePhone(phone: string): boolean {
  const parsed = parseFrOrBePhone(phone)
  if (!parsed) return false

  const national = parsed.nationalNumber.replace(/\D/g, "")
  if (/^0+$/.test(national) || /^1+$/.test(national)) return false
  if (new Set(national.split("")).size <= 2) return false

  const subscriber =
    parsed.country === "BE"
      ? national.startsWith("4") && national.length === 9
        ? national.slice(3)
        : national.slice(2)
      : national.slice(1)

  if (isFakePhonePattern(subscriber)) return false
  return true
}

/** Message à afficher si le téléphone est invalide. */
export const PHONE_FR_BE_MESSAGE =
  "Veuillez indiquer un numéro de téléphone belge ou français réel (les suites factices ne sont pas acceptées)."

/** Retourne le message d'erreur pour l'email (null si valide). */
export function getEmailError(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return "L'adresse e-mail est requise."
  if (trimmed.length > 254) return "Adresse e-mail trop longue."
  if (
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
      trimmed
    ) ||
    trimmed.includes("..")
  ) {
    return "Adresse e-mail invalide."
  }
  const tld = trimmed.split(".").pop() ?? ""
  if (tld.length < 2 || !/^[a-zA-Z]{2,}$/.test(tld)) {
    return "Extension de domaine e-mail invalide."
  }
  const typo = getEmailTypoSuggestion(trimmed)
  if (typo) {
    return `Vérifiez l'adresse e-mail : vouliez-vous écrire @${typo} ?`
  }
  if (isDisposableEmailDomain(trimmed)) {
    return "Les adresses e-mail temporaires ou jetables ne sont pas acceptées."
  }
  if (isPlaceholderEmail(trimmed)) {
    return "Veuillez indiquer votre véritable adresse e-mail personnelle ou professionnelle."
  }
  return null
}

/** Retourne le message d'erreur pour le téléphone (null si valide). */
export function getPhoneError(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return "Le numéro de téléphone est requis."
  if (!isValidFrBePhone(trimmed)) return PHONE_FR_BE_MESSAGE
  return null
}

const SUSPICIOUS_PERSON_WORDS = new Set([
  "test",
  "teste",
  "testing",
  "fake",
  "bidon",
  "faux",
  "azerty",
  "qwerty",
  "qwertz",
  "asdf",
  "sdfg",
  "qwer",
  "zxcv",
  "admin",
  "user",
  "null",
  "none",
  "undefined",
  "inconnu",
  "anonyme",
  "anonymous",
  "prenom",
  "dummy",
  "xxx",
  "xxxx",
  "aaaa",
  "bbbb",
  "zzzz",
])

export function isSuspiciousPersonName(value: string | null | undefined): boolean {
  const clean = (value ?? "").trim()
  if (clean.length < 2) return true
  if (/[0-9]/.test(clean)) return true
  if (/(https?:\/\/|www\.|@|\.(com|be|fr|org|net)\b)/i.test(clean)) return true
  if (/(.)\1{3,}/i.test(clean)) return true

  const normalized = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z-\s']/g, "")
    .trim()

  if (normalized.length < 2) return true
  const tokens = normalized.split(/[\s-]+/).filter(Boolean)
  if (tokens.some((t) => SUSPICIOUS_PERSON_WORDS.has(t))) return true

  const lettersOnly = normalized.replace(/[^a-z]/g, "")
  if (lettersOnly.length >= 2 && new Set(lettersOnly.split("")).size <= 1) return true
  if (lettersOnly.length >= 5 && !/[aeiouy]/.test(lettersOnly)) return true

  return false
}

export function getPersonNameError(
  value: string | null | undefined,
  fieldLabel: "prénom" | "nom" = "nom"
): string | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) {
    return fieldLabel === "prénom" ? "Le prénom est requis." : "Le nom est requis."
  }
  if (trimmed.length < 2) {
    return `Le ${fieldLabel} doit contenir au moins 2 caractères.`
  }
  if (isSuspiciousPersonName(trimmed)) {
    return `Veuillez saisir votre véritable ${fieldLabel} (sans chiffres ni mots de test).`
  }
  return null
}

const NON_WALLOON_MUNICIPALITIES = new Set([
  "bruxelles",
  "brussels",
  "brussel",
  "uccle",
  "ukkel",
  "ixelles",
  "elsene",
  "schaerbeek",
  "schaarbeek",
  "anderlecht",
  "molenbeek",
  "sint-jans-molenbeek",
  "etterbeek",
  "vorst",
  "woluwe",
  "woluwe-saint-lambert",
  "woluwe-saint-pierre",
  "auderghem",
  "oudergem",
  "watermael-boitsfort",
  "watermaal-bosvoorde",
  "jette",
  "evere",
  "koekelberg",
  "ganshoren",
  "sint-gillis",
  "saint-josse-ten-noode",
  "laeken",
  "laken",
  "wemmel",
  "zaventem",
  "vilvoorde",
  "vilvorde",
  "dilbeek",
  "overijse",
  "tervuren",
  "rhode-saint-genese",
  "sint-genesius-rode",
  "linkebeek",
  "drogenbos",
  "kraainem",
  "wezembeek-oppem",
  "anvers",
  "antwerpen",
  "gand",
  "gent",
  "bruges",
  "brugge",
  "louvain",
  "leuven",
  "malines",
  "mechelen",
  "hasselt",
  "ostende",
  "oostende",
  "courtrai",
  "kortrijk",
  "alost",
  "aalst",
  "genk",
  "turnhout",
  "roeselare",
  "roulers",
  "sint-niklaas",
  "tienen",
  "tirlemont",
  "halle",
  "aarschot",
  "diest",
  "ninove",
  "dendermonde",
  "termonde",
  "oudenaarde",
  "audenarde",
  "lokeren",
  "wetteren",
  "knokke",
  "knokke-heist",
  "blankenberge",
  "nieuwpoort",
  "veurne",
  "ieper",
  "ypres",
  "waregem",
  "torhout",
  "tongeren",
  "tongres",
  "bilzen",
  "maaseik",
  "lommel",
  "pelt",
  "beringen",
  "sint-truiden",
  "saint-trond",
  "voeren",
  "fourons",
])

/**
 * Détecte une contradiction géographique manifeste entre code postal, commune et adresse libre
 * (ex: CP wallon ou manquant, mais "1780 Wemmel Bruxelles" saisi dans le champ ville ou rue).
 */
export function detectCityPostalContradiction(params: {
  postalCode?: string | null
  city?: string | null
  siteAddress?: string | null
  walloniaOnly?: boolean
}): string | null {
  const cleanCp = (params.postalCode ?? "").replace(/\D/g, "").slice(0, 4)
  const walloniaOnly = params.walloniaOnly ?? true

  const addressText = `${params.siteAddress ?? ""}`
  const embeddedPostalMatches = Array.from(
    addressText.matchAll(/(?:^|[,\s])([1-9][0-9]{3})(?=\s+[a-zA-ZÀ-ÿ]{2,}|$)/g)
  ).map((m) => m[1])

  for (const emb of embeddedPostalMatches) {
    if (cleanCp && emb !== cleanCp) {
      return `Le code postal détecté dans l'adresse (${emb}) contredit le code postal principal (${cleanCp}).`
    }
    if (walloniaOnly && !isWalloonPostalCode(emb)) {
      return `Code postal hors Wallonie détecté dans l'adresse (${emb}).`
    }
  }

  const cityRaw = (params.city ?? "").trim()
  if (cityRaw && (walloniaOnly || (cleanCp && isWalloonPostalCode(cleanCp)))) {
    const cityCp = cityRaw.match(/\b([1-9][0-9]{3})\b/)?.[1]
    if (cityCp && cleanCp && cityCp !== cleanCp) {
      return `La localité mentionne ${cityCp} alors que le code postal est ${cleanCp}.`
    }
    if (walloniaOnly && cityCp && !isWalloonPostalCode(cityCp)) {
      return `Code postal hors Wallonie détecté dans la localité (${cityCp}).`
    }
    const cityNorm = cityRaw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    if (
      !cityNorm.includes("louvain-la-neuve") &&
      !cityNorm.includes("louvain la neuve")
    ) {
      const words = cityNorm.split(/[\s,/()-]+/).filter(Boolean)
      for (const word of words) {
        if (NON_WALLOON_MUNICIPALITIES.has(word)) {
          return `Commune hors Wallonie détectée dans le champ localité ("${cityRaw}").`
        }
      }
      if (NON_WALLOON_MUNICIPALITIES.has(cityNorm)) {
        return `Commune hors Wallonie détectée ("${cityRaw}").`
      }
    }
  }

  return null
}

/** Message surface minimale. */
export const SURFACE_MIN_MESSAGE =
  "Surface minimum : 1 500 m² pour un parking, 500 m² pour toiture ou friche."

/** Retourne le message d'erreur pour la surface (null si valide). */
export function getSurfaceError(surfaceType: string, surfaceArea: string): string | null {
  if (!surfaceType) return "Veuillez sélectionner le type de surface."
  const area = parseInt(surfaceArea, 10) || 0
  const min = surfaceType === "parking" ? 1500 : 500
  if (area < min) return SURFACE_MIN_MESSAGE
  return null
}

/** Message facture minimale. */
export const FACTURE_MIN_MESSAGE =
  "Facture annuelle minimum de 3 500 € requise pour une étude B2B."

/** Normalise un numéro TVA belge (espaces, points). */
export function normalizeBelgianVat(input: string): string {
  return input.replace(/[\s.]/g, "").toUpperCase()
}

/** Valide le format BE + 10 chiffres avec clé de contrôle Modulo 97 (BCE/TVA belge). */
export function isValidBelgianVat(input: string): boolean {
  const n = normalizeBelgianVat(input)
  if (!/^BE\d{9,10}$/.test(n)) return false
  const digits = n.replace(/^BE/, "")
  const padded = digits.length === 9 ? "0" + digits : digits
  if (!/^[01]\d{9}$/.test(padded)) return false
  const first8 = parseInt(padded.slice(0, 8), 10)
  const checkDigits = parseInt(padded.slice(8, 10), 10)
  const expectedCheck = 97 - (first8 % 97)
  return checkDigits === expectedCheck
}

export const VAT_BE_MESSAGE =
  "Indiquez un numéro TVA belge valide avec clé de contrôle conforme (ex. BE 1039.899.980)."

/** Erreur affichée sous le champ TVA (null si valide). */
export function getVatError(vat: string): string | null {
  const trimmed = vat.trim()
  if (!trimmed) return "Le numéro d'entreprise (TVA BE) est requis."
  if (!isValidBelgianVat(trimmed)) return VAT_BE_MESSAGE
  return null
}

/** Retourne le message d'erreur pour la facture (null si valide). */
export function getFactureError(annualElectricityBill: string): string | null {
  const value = parseInt(annualElectricityBill, 10) || 0
  if (value < 3500) return FACTURE_MIN_MESSAGE
  return null
}

/** Valide un code postal belge (4 chiffres, ex: 1000 à 9990). */
export function isValidBelgianPostalCode(postalCode: string): boolean {
  return /^[1-9][0-9]{3}$/.test(postalCode.trim())
}

/**
 * Validation stricte et normalisation d'un numéro de GSM ou téléphone belge.
 * Rejette les séquences fictives évidentes (123456, 000000, etc.) pour protéger l'appel d'offres.
 */
export function formatAndValidateBelgianPhone(input: string): {
  isValid: boolean
  normalized: string
  errorMessage?: string
} {
  // 1. Nettoyage des espaces, points, tirets, parenthèses
  let cleaned = input.replace(/[\s.\-()/]/g, "")

  // 2. Normalisation du préfixe international belge (+32, +32(0), 0032, 00320 -> 0)
  if (cleaned.startsWith("+320")) {
    cleaned = "0" + cleaned.slice(4)
  } else if (cleaned.startsWith("+32")) {
    cleaned = "0" + cleaned.slice(3)
  } else if (cleaned.startsWith("00320")) {
    cleaned = "0" + cleaned.slice(5)
  } else if (cleaned.startsWith("0032")) {
    cleaned = "0" + cleaned.slice(4)
  }

  // 3. Bloquer les numéros spéciaux / surtaxés / verts non attribués aux particuliers
  if (/^0(70|78|800|90\d)/.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      errorMessage: "Les numéros spéciaux ou surtaxés (070/078/0800/0900) ne sont pas acceptés.",
    }
  }

  // 4. Vérification de la longueur et du préfixe (Mobile 045-049 à 10 chiffres, Fixe belge à 9 chiffres)
  const isMobile = /^04[56789]\d{7}$/.test(cleaned)
  const isLandline = /^0(?:[123569]\d{7}|4[23]\d{6}|71\d{6}|8[0-79]\d{6})$/.test(cleaned)

  if ((!isMobile && !isLandline) || !isValidPhoneNumber(cleaned, "BE")) {
    return {
      isValid: false,
      normalized: cleaned,
      errorMessage: "Veuillez saisir un numéro belge réel (ex. 0470 12 34 56).",
    }
  }

  // 5. Détection des faux numéros évidents (séquences, pas arithmétiques, répétitions)
  const subscriberDigits = isMobile ? cleaned.slice(4) : cleaned.slice(3)
  if (isFakePhonePattern(subscriberDigits)) {
    return {
      isValid: false,
      normalized: cleaned,
      errorMessage:
        "Ce numéro semble factice ou incomplet. Un numéro réel est requis pour certifier l'appel d'offres.",
    }
  }

  // 6. Normalisation finale E.164 (+32...)
  const e164 = "+32" + cleaned.slice(1)
  return { isValid: true, normalized: e164 }
}

/** Normalise un numéro BE/FR valide en E.164 (+32... ou +33...), sinon null. */
export function normalizeFrBePhone(input: string): string | null {
  if (!isValidFrBePhone(input)) return null
  const parsed = parseFrOrBePhone(input)
  return parsed?.number ? String(parsed.number) : null
}

/**
 * Résout et valide un numéro de téléphone de lead selon le segment :
 * - B2C Wallonie : numéro belge strict obligatoire
 * - B2B : numéro belge strict ou français (+33 / 06 / 07)
 */
export function resolveLeadPhoneE164(
  rawPhone: string,
  segment: "B2B" | "B2C" = "B2C"
): { valid: boolean; e164: string | null; error?: string } {
  const trimmed = (rawPhone ?? "").trim()
  if (!trimmed) {
    return { valid: false, e164: null, error: "Le numéro de téléphone est requis." }
  }
  const compact = trimmed.replace(/[\s.\-()/]/g, "")
  const looksExplicitlyFrench =
    segment === "B2B" &&
    (compact.startsWith("+33") ||
      compact.startsWith("0033") ||
      /^0[67]\d{8}$/.test(compact))

  if (segment === "B2C" || !looksExplicitlyFrench) {
    const beCheck = formatAndValidateBelgianPhone(trimmed)
    if (!beCheck.isValid) {
      return {
        valid: false,
        e164: null,
        error: beCheck.errorMessage || "Numéro de téléphone belge invalide.",
      }
    }
    return { valid: true, e164: beCheck.normalized }
  }

  if (!isValidFrBePhone(trimmed)) {
    return { valid: false, e164: null, error: PHONE_FR_BE_MESSAGE }
  }
  const frE164 = normalizeFrBePhone(trimmed)
  if (!frE164) {
    return { valid: false, e164: null, error: PHONE_FR_BE_MESSAGE }
  }
  return { valid: true, e164: frE164 }
}

export type WalloonProvinceKey =
  | "brabant_wallon"
  | "liege"
  | "namur"
  | "hainaut"
  | "luxembourg"

/**
 * Retourne la clé de province wallonne canonique d'un code postal belge à 4 chiffres,
 * ou `null` si le code postal est situé hors Wallonie (Bruxelles 1000-1299, Flandre 1500-3999 / 8000-9999).
 */
export function getWalloonProvinceKeyFromPostalCode(cp: string): WalloonProvinceKey | null {
  const digits = cp.replace(/\D/g, "")
  if (digits.length !== 4) return null
  const code = parseInt(digits, 10)
  if (code >= 1300 && code <= 1499) return "brabant_wallon"
  if (code >= 4000 && code <= 4999) return "liege"
  if (code >= 5000 && code <= 5999) return "namur"
  if ((code >= 6000 && code <= 6599) || (code >= 7000 && code <= 7999)) return "hainaut"
  if (code >= 6600 && code <= 6999) return "luxembourg"
  return null
}

/**
 * Vérifie strictement si un code postal belge à 4 chiffres appartient à la Région wallonne.
 */
export function isWalloonPostalCode(postalCode: string): boolean {
  return getWalloonProvinceKeyFromPostalCode(postalCode) !== null
}

const WALLOON_PROVINCE_DISPLAY_NAMES: Record<WalloonProvinceKey, string> = {
  brabant_wallon: "Brabant wallon",
  liege: "Liège",
  namur: "Namur",
  hainaut: "Hainaut",
  luxembourg: "Luxembourg",
}

/**
 * Déduit le libellé de la province wallonne à partir du code postal belge à 4 chiffres.
 */
export function getProvinceFromPostalCode(cp: string): string {
  const key = getWalloonProvinceKeyFromPostalCode(cp)
  return key ? WALLOON_PROVINCE_DISPLAY_NAMES[key] : "Wallonie"
}

export interface ParsedBelgianAddress {
  street: string
  houseNumber: string | null
  box: string | null
}

/**
 * Extrait proprement la voirie et le numéro de bâtiment d'une adresse belge.
 * Gère les formats belges courants ("Rue X 12", "Rue X, 12A", "Thier-Martin N°113c",
 * "Rue X 14 bte 2", "12 Rue X") tout en ignorant les nombres intégrés aux noms de rue
 * ("Rue du 11 Novembre", "Avenue Albert 1er", "Rue 1914-1918").
 */
export function extractBelgianStreetAndNumber(raw?: string | null): ParsedBelgianAddress {
  if (!raw || typeof raw !== "string") {
    return { street: "", houseNumber: null, box: null }
  }

  let cleaned = raw.replace(/\s+/g, " ").trim()
  if (!cleaned) {
    return { street: "", houseNumber: null, box: null }
  }

  // Exclure les tranches d'années historiques en fin de nom de rue (ex: "1914-1918", "1940-1945")
  const warYearsEnd = /(?:\b(?:18|19|20)\d{2}\s*[-–]\s*(?:18|19|20)\d{2})$/.test(cleaned)
  if (warYearsEnd) {
    return { street: cleaned, houseNumber: null, box: null }
  }

  // Extraire une éventuelle boîte / appartement en suffixe ("bte 2", "boîte B", "apt 4", "bus 1")
  let box: string | null = null
  const boxMatch = cleaned.match(
    /(?:,?\s*\b(?:bte|boite|boîte|bt|apt|appartement|bus)\s*[:.]?\s*([a-zA-Z0-9]{1,8}))\s*$/i
  )
  if (boxMatch) {
    box = boxMatch[1].trim()
    cleaned = cleaned.slice(0, boxMatch.index).replace(/[,\s]+$/, "").trim()
  }

  // 1. Cas standard belge/européen : numéro en fin d'adresse ("Rue X 14", "Rue X, N°113c", "Rue X 12-14", "Rue X 12/A")
  const trailingMatch = cleaned.match(
    /^(.+?)(?:,\s*|\s+)(?:n[°o]\s*\.?\s*)?([1-9]\d{0,3}(?:\s*[-/]\s*(?:[1-9]\d{0,3}|[a-zA-Z]{1,3}))?(?:\s*[a-zA-Z]{1,3})?)\s*$/i
  )
  if (trailingMatch) {
    const candidateStreet = trailingMatch[1].replace(/[,\s]+$/, "").trim()
    const candidateNum = trailingMatch[2].replace(/\s+/g, "")

    // Éviter les ordinaux français/néerlandais en fin de nom de rue ("Albert 1er", "Léon XIII", "2e", "3e", "4ème")
    const isOrdinal = /^\d+(?:er|ere|ère|e|eme|ème|ste|de)$/i.test(candidateNum)
    if (!isOrdinal && /[a-zA-ZÀ-ÿ]{2,}/.test(candidateStreet)) {
      return {
        street: candidateStreet,
        houseNumber: candidateNum,
        box,
      }
    }
  }

  // 2. Cas autofill / anglo-français : numéro au début ("14 Rue Bois l'Evêque", "12A, Avenue Louise")
  const leadingMatch = cleaned.match(
    /^(?:n[°o]\s*\.?\s*)?([1-9]\d{0,3}(?:\s*[a-zA-Z])?(?:\s*[-/]\s*[1-9]\d{0,3})?)(?:\s*,\s*|\s+)([a-zA-ZÀ-ÿ].{2,})$/i
  )
  if (leadingMatch) {
    const candidateNum = leadingMatch[1].replace(/\s+/g, "")
    const candidateStreet = leadingMatch[2].trim()
    const isMonthStreet = /^(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b/i.test(
      candidateStreet
    )
    if (!isMonthStreet) {
      return {
        street: candidateStreet,
        houseNumber: candidateNum,
        box,
      }
    }
  }

  return {
    street: cleaned,
    houseNumber: null,
    box,
  }
}

/**
 * Vérifie qu'une adresse de voirie comporte un véritable numéro de bâtiment.
 */
export function hasBelgianHouseNumber(raw?: string | null): boolean {
  const parsed = extractBelgianStreetAndNumber(raw)
  return Boolean(parsed.street && /[a-zA-ZÀ-ÿ]{2,}/.test(parsed.street) && parsed.houseNumber)
}

/**
 * Retourne un message d'erreur clair si l'adresse saisie est incomplète (ou null si valide).
 */
export function getBelgianAddressError(
  raw?: string | null,
  options?: { required?: boolean; requireHouseNumber?: boolean }
): string | null {
  const required = options?.required ?? true
  const requireHouseNumber = options?.requireHouseNumber ?? true
  const trimmed = (raw ?? "").trim()

  if (!trimmed) {
    return required ? "Veuillez renseigner votre adresse (rue et numéro)." : null
  }

  if (trimmed.length < 4) {
    return "Veuillez renseigner une adresse complète (rue et numéro)."
  }

  const parsed = extractBelgianStreetAndNumber(trimmed)
  if (!parsed.street || !/[a-zA-ZÀ-ÿ]{2,}/.test(parsed.street)) {
    return "Veuillez saisir le nom complet de votre rue ou avenue."
  }

  if (requireHouseNumber && !parsed.houseNumber) {
    return "Indiquez votre numéro de maison (ex: 12 ou 12A) pour localiser votre toiture."
  }

  return null
}


