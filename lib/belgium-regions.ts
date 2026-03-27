/**
 * Régions / provinces pour qualification des leads B2B (Belgique).
 * Clés stables stockées en base (colonne province).
 */

export const BELGIUM_PROVINCE_KEYS = [
  // Wallonie
  "liege",
  "hainaut",
  "namur",
  "luxembourg",
  "brabant_wallon",
  // Région de Bruxelles-Capitale
  "bruxelles",
  // Flandre
  "flandre_anvers",
  "flandre_limbourg",
  "flandre_occidentale",
  "flandre_orientale",
  "flandre_brabant_flamand",
  // Cas particuliers
  "plusieurs_regions_be",
  "autre",
  "etranger",
] as const

export type BelgiumProvinceKey = (typeof BELGIUM_PROVINCE_KEYS)[number]

export const BELGIUM_PROVINCE_LABELS: Record<BelgiumProvinceKey, string> = {
  liege: "Liège",
  hainaut: "Hainaut",
  namur: "Namur",
  luxembourg: "Luxembourg",
  brabant_wallon: "Brabant wallon",
  bruxelles: "Bruxelles-Capitale",
  flandre_anvers: "Flandre — Anvers",
  flandre_limbourg: "Flandre — Limbourg",
  flandre_occidentale: "Flandre — Flandre occidentale",
  flandre_orientale: "Flandre — Flandre orientale",
  flandre_brabant_flamand: "Flandre — Brabant flamand",
  plusieurs_regions_be: "Plusieurs régions (Belgique)",
  autre: "Autre (précisez ci-dessous)",
  etranger: "Hors Belgique",
}

/** Groupes pour le select UI */
export const BELGIUM_PROVINCE_GROUPS: {
  heading: string
  items: { value: BelgiumProvinceKey; label: string }[]
}[] = [
  {
    heading: "Wallonie",
    items: [
      { value: "liege", label: BELGIUM_PROVINCE_LABELS.liege },
      { value: "hainaut", label: BELGIUM_PROVINCE_LABELS.hainaut },
      { value: "namur", label: BELGIUM_PROVINCE_LABELS.namur },
      { value: "luxembourg", label: BELGIUM_PROVINCE_LABELS.luxembourg },
      { value: "brabant_wallon", label: BELGIUM_PROVINCE_LABELS.brabant_wallon },
    ],
  },
  {
    heading: "Bruxelles",
    items: [{ value: "bruxelles", label: BELGIUM_PROVINCE_LABELS.bruxelles }],
  },
  {
    heading: "Flandre",
    items: [
      { value: "flandre_anvers", label: BELGIUM_PROVINCE_LABELS.flandre_anvers },
      { value: "flandre_limbourg", label: BELGIUM_PROVINCE_LABELS.flandre_limbourg },
      { value: "flandre_occidentale", label: BELGIUM_PROVINCE_LABELS.flandre_occidentale },
      { value: "flandre_orientale", label: BELGIUM_PROVINCE_LABELS.flandre_orientale },
      { value: "flandre_brabant_flamand", label: BELGIUM_PROVINCE_LABELS.flandre_brabant_flamand },
    ],
  },
  {
    heading: "Autre",
    items: [
      { value: "plusieurs_regions_be", label: BELGIUM_PROVINCE_LABELS.plusieurs_regions_be },
      { value: "autre", label: BELGIUM_PROVINCE_LABELS.autre },
      { value: "etranger", label: BELGIUM_PROVINCE_LABELS.etranger },
    ],
  },
]

export function getProvinceDisplayLabel(key: string, freeText?: string | null): string {
  const base = BELGIUM_PROVINCE_LABELS[key as BelgiumProvinceKey] ?? key
  const extra = freeText?.trim()
  if (!extra) return base
  if (key === "autre") return `Autre : ${extra}`
  if (key === "etranger") return `Hors Belgique : ${extra}`
  if (key === "plusieurs_regions_be") return `${base} — ${extra}`
  return `${base} (${extra})`
}
