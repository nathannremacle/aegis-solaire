/**
 * Helpers partagés pour l'affichage uniforme, professionnel et enrichi des données d'un lead
 * sur la Marketplace, le Dashboard Partenaire, le CRM et les E-mails de relance.
 * Supprime impérativement les métadonnées internes brutes (Bobex-Style, UTM, codes machine)
 * et garantit un rendu digne d'un terminal de décision financière institutionnel.
 */

import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

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
  bac_acier: "Bac acier / Métallique",
  zinc_autre: "Zinc / Autre alliage",
  fibrociment_amiante: "Fibrociment",
}

export const TIMEFRAME_LABELS: Record<string, string> = {
  immediat: "Immédiate",
  immediate: "Immédiate",
  immediat_3mois: "Immédiate (1 à 3 mois)",
  "3_6mois": "À moyen terme (3 à 6 mois)",
  plus_6mois: "Dans l'année (> 6 mois)",
  simple_renseignement: "Étude préalable & chiffrage",
}

export const OWNERSHIP_LABELS: Record<string, string> = {
  owner: "Propriétaire Décisionnaire",
  proprietaire: "Propriétaire Décisionnaire",
  tenant_authorized: "Locataire (accord bailleur)",
  locataire: "Locataire",
  co_ownership: "Copropriété (syndic / ACP)",
}

export const PROJECT_DRIVER_LABELS: Record<string, string> = {
  reduire_facture: "Réduction des coûts énergétiques",
  peb_permis: "Conformité PEB & Décret Wallonie 2026",
  flotte_irve: "Couplage bornes IRVE & autoconsommation",
  tiers_invest: "Valorisation patrimoniale & décret PACE",
  autoconsommation: "Autonomie électrique & effacement",
}

export const CONSUMPTION_LABELS: Record<string, string> = {
  moins_2500: "< 2 500 kWh/an",
  "2500_3000": "2 500 – 3 000 kWh/an",
  "3000_4000": "3 000 – 4 000 kWh/an",
  "4000_6000": "4 000 – 6 000 kWh/an",
  "6000_10000": "6 000 – 10 000 kWh/an",
  plus_10000: "> 10 000 kWh/an",
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  "maison mitoyenne": "Maison mitoyenne",
  "maison 4 facades": "Maison 4 façades",
  "maison 3 facades": "Maison 3 façades",
  "batiment_industriel": "Bâtiment industriel / Hangar",
  "hangar": "Hangar / Entrepôt",
  "bureaux": "Immeuble de bureaux",
  "commerce": "Surface commerciale",
  "agricole": "Bâtiment agricole",
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

/**
 * Nettoie chirurgicalement les métadonnées internes des leads
 * Supprime "Source: Landing Bobex-Style", "UTM...", et traduit les chaînes brutes en français net.
 */
export function sanitizeLeadNotes(details?: string | null, message?: string | null): {
  cleanRemarks: string | null
  cleanBadges: { label: string; value: string }[]
} {
  const combined = [details, message].filter(Boolean).join(" | ")
  if (!combined.trim()) {
    return { cleanRemarks: null, cleanBadges: [] }
  }

  const parts = combined.split("|").map((p) => p.trim()).filter(Boolean)
  const cleanBadges: { label: string; value: string }[] = []
  let humanRemark: string | null = null

  for (const part of parts) {
    // 1. Bannir les sources et métadonnées d'acquisition
    if (/source\s*:/i.test(part)) continue
    if (/utm_/i.test(part) || /utm\s*source/i.test(part)) continue
    if (/campagne\s*:/i.test(part)) continue
    if (/créatif\s*:/i.test(part) || /creatif\s*:/i.test(part)) continue
    if (/bobex/i.test(part)) continue
    if (/précision\s*localisation\s*:/i.test(part)) continue

    // 2. Extraire et traduire les champs structurés
    const lower = part.toLowerCase()

    if (lower.startsWith("consommation annuelle:") || lower.startsWith("consommation:")) {
      const val = part.split(":")[1]?.trim() || ""
      const cleanVal = CONSUMPTION_LABELS[val] || val.replace("_", " à ") + " kWh/an"
      cleanBadges.push({ label: "Consommation", value: cleanVal })
      continue
    }

    if (lower.startsWith("type de bien:") || lower.startsWith("type bien:")) {
      const val = part.split(":")[1]?.trim().toLowerCase() || ""
      const cleanVal = PROPERTY_TYPE_LABELS[val] || val
      cleanBadges.push({ label: "Type de bien", value: cleanVal })
      continue
    }

    if (lower.startsWith("statut:") || lower.startsWith("décisionnaire:")) {
      const val = part.split(":")[1]?.trim().toLowerCase() || ""
      const cleanVal = OWNERSHIP_LABELS[val] || "Propriétaire occupant"
      cleanBadges.push({ label: "Statut", value: cleanVal })
      continue
    }

    if (lower.startsWith("couverture:") || lower.startsWith("toiture:")) {
      const val = part.split(":")[1]?.trim().toLowerCase() || ""
      const cleanVal = ROOF_MATERIAL_LABELS[val] || val
      cleanBadges.push({ label: "Couverture", value: cleanVal })
      continue
    }

    if (lower.startsWith("surface toiture:") || lower.startsWith("surface:")) {
      const val = part.split(":")[1]?.trim() || ""
      cleanBadges.push({ label: "Surface", value: val.includes("m²") ? val : `${val} m²` })
      continue
    }

    if (lower.startsWith("batterie:")) {
      const val = part.split(":")[1]?.trim().toLowerCase() || ""
      const isInterested = val === "oui" || val === "true" || val.includes("interesse")
      if (isInterested) {
        cleanBadges.push({ label: "Option", value: "Intérêt Batterie" })
      }
      continue
    }

    if (lower.startsWith("borne ve:") || lower.startsWith("borne:")) {
      const val = part.split(":")[1]?.trim().toLowerCase() || ""
      const isInterested = val === "oui" || val === "true" || val.includes("interesse")
      if (isInterested) {
        cleanBadges.push({ label: "Option", value: "Borne IRVE" })
      }
      continue
    }

    if (lower.startsWith("précisions:") || lower.startsWith("precisions:") || lower.startsWith("remarques:")) {
      const text = part.split(":").slice(1).join(":").trim()
      if (text.length > 3) {
        humanRemark = text
      }
      continue
    }

    // Si c'est une phrase libre sans clé technique
    if (!part.includes(":") && part.length > 5 && !humanRemark) {
      humanRemark = part
    }
  }

  return { cleanRemarks: humanRemark, cleanBadges }
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
  } else {
    rounded = Math.round(amount / 50) * 50
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
  const creditPriceEur = 12 // Prix unitaire indicatif moyen d'un crédit HTVA
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

