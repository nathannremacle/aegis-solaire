/**
 * Calcul géospatial rapide (Haversine) par préfixes postaux belges (Wallonie & Bruxelles)
 * pour le ciblage Sniper < 20 km des 784 installateurs RESCERT.
 */

const BELGIUM_POSTAL_PREFIX_CENTROIDS: Record<string, [number, number]> = {
  "10": [50.8503, 4.3517], // Bruxelles Centre
  "11": [50.8180, 4.3950], // Bruxelles Sud-Est
  "12": [50.8460, 4.4320], // Bruxelles Est
  "13": [50.6940, 4.5800], // Brabant wallon (Wavre / Ottignies)
  "14": [50.6350, 4.3550], // Brabant wallon (Nivelles / Braine)
  "40": [50.6326, 5.5797], // Liège
  "41": [50.5620, 5.5050], // Seraing / Neupré / Huy Est
  "42": [50.6730, 5.1580], // Hannut / Waremme
  "43": [50.7010, 5.2680], // Waremme
  "44": [50.6470, 5.4750], // Grâce-Hollogne / Ans
  "45": [50.5180, 5.2380], // Huy
  "46": [50.6540, 5.6890], // Visé / Fléron / Soumagne
  "47": [50.4530, 6.1350], // Eupen / Malmedy / Saint-Vith
  "48": [50.5890, 5.8620], // Verviers / Spa
  "49": [50.4350, 5.8350], // Spa / Stavelot / Aywaille
  "50": [50.4674, 4.8719], // Namur
  "51": [50.4180, 4.8200], // Floreffe / Profondeville
  "53": [50.4040, 5.0880], // Andenne / Ciney
  "55": [50.2610, 4.9120], // Dinant / Ciney
  "56": [50.2510, 4.5440], // Philippeville / Florennes
  "60": [50.4108, 4.4446], // Charleroi
  "61": [50.4220, 4.3350], // Fontaine-l'Évêque / Courcelles
  "62": [50.4780, 4.5180], // Fleurus / Gosselies
  "64": [50.1410, 4.3160], // Chimay / Beaumont
  "65": [50.3410, 4.2120], // Thuin / Erquelinnes
  "66": [50.1320, 5.7920], // Bastogne / Vielsalm
  "67": [49.6836, 5.8167], // Arlon / Virton
  "68": [49.9180, 5.4250], // Libramont / Neufchâteau
  "69": [50.2270, 5.3440], // Marche-en-Famenne
  "70": [50.4542, 3.9567], // Mons
  "71": [50.4750, 4.1850], // La Louvière / Binche
  "73": [50.4250, 3.8120], // Boussu / Dour
  "75": [50.6056, 3.3883], // Tournai
  "77": [50.7450, 3.2140], // Mouscron
  "78": [50.6300, 3.7780], // Ath / Enghien
  "79": [50.5620, 3.6480], // Péruwelz / Leuze
}

export function getBelgianPostalCentroid(postalCode?: string | null): [number, number] | null {
  if (!postalCode) return null
  const clean = String(postalCode).trim()
  if (!/^\d{4}$/.test(clean)) return null
  const prefix2 = clean.slice(0, 2)
  return BELGIUM_POSTAL_PREFIX_CENTROIDS[prefix2] ?? null
}

export function computeHaversineKm(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export function estimateDistanceBetweenPostcodesKm(
  cpA?: string | null,
  cpB?: string | null
): number | null {
  if (cpA && cpB && cpA.trim() === cpB.trim()) return 2.5
  const cA = getBelgianPostalCentroid(cpA)
  const cB = getBelgianPostalCentroid(cpB)
  if (!cA || !cB) return null
  return computeHaversineKm(cA, cB)
}
