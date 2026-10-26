"use client"

import * as React from "react"
import { useMemo } from "react"

interface LeadGeoRadarMapProps {
  city: string
  postalCode: string
  provinceLabel?: string
  isPurchased?: boolean
  siteAddress?: string | null
  coords?: [number, number]
}

// Tracé vectoriel officiel des régions du Royaume de Belgique (Simplemaps / ISO 3166-2:BE)
const SVG_PATH_BRUSSELS =
  "M507.5 300.7l-19.2 10.3-5 1.2-5.2-0.9-6.5-4.4-6.3-13.3-4.3 2.3-8.8-5 2.8-5.7 6-1 1.5-6.3-2.4-4.2 4.4-8.9 8.7-4.3 10.1 1.7 6.1-6.1 4.1 3.2 3.7 6.3-0.1 3.6-3.7 3.9 9.4 6 3.8 11.9-5 0.6-2 3.3 7.9 5.8z"

const SVG_PATH_WALLONIA =
  "M163.9 310.9l-12.4 3.8-5.4 3.5-4.3 4.6-7.1 12.3-3.1 2.5-3.7-0.8-1.1-0.5-1-3.6-4.7-15.3 6.2-3.9 1.6-0.5 3.3 3.1 6.8-1.3 1-3.5 8.9-3.6-4.8-5.8 0.2-1.6 13.7-5.6 3.7 2.4 2 12.5 0.2 1.3z m621.4-14.7l1.4 0.9 5.1 2.5 3.7 1.1-0.4 4.4-2.5 8.5 4.3 2.5 2.6 0.5 2.5-0.5 1.1-1.7 0.6 0.9 3.5 3.5 6.1-1.6 10 13.3 8.5-1.2 5.6 2.9 2.1-0.9 5.5-8.4-4.5-5.7 2.6 0.8 17.1 0.6 4.8-0.9-0.4 0.7-0.2 0.7 0.1 0.6 0.3 0.7 3.9 2.1 0.1 3.6-0.8 3.9 0.9 3.1 3.1 0.4 9.4-2.6 3.9 0.4 4.5 4.5 14.4 22-3.2 2.1 2.8 5.3 4.8 2.6 16.3 0.4 0.6 2.2-1.7 3.3-2.7 3.3 0 1.3-5.2 3.1-7.5 6.3-4.3 6.8 3.9 5-1.8 2.8 0.3 1.7 1.9 0.8 2.7 0.2-1.8 3.2 1.9 1.8 2 4.2 1.9 1.5 2.3 0.1 8-2.4 0.5-0.5 0.6-0.2 0.5 0.2 0.5 0.5 3.7 1.7 10.2 2.4 4.3 0.2-2.7 2.6-0.6 3 0.7 3.3 1.3 3.7 2 3.4 1.7 0.3 0.9 1.3-0.1 6.2-1.7 8.7-1.7 4.9 0.4 4.4 8.2 14.3 0.2 2.4 0.2 2.8-2.9 3.1-6.3 1.2-3.1-0.6-2.7-1.1-2.7-0.2-3.2 1.9-2.3 2.8-1.6 3.6-0.4 3.7 1 3.3-4.3 4-10.2 2.8-4.9 2.3-2.3 3.6-5.3 3.8-2.5 3.2 3.2 3.5 1.3 4.2-0.2 4.2-1.4 3.4-1.7 1.2-4.7 0.4-2.1 1.2-0.4 1.2-0.8 4.2-0.5 1.8 2.4 1.9 0.8 2.3-0.4 1.4-0.3 1.1-2.1 2.5-3.5-1.6-0.6-2.9 0.3-3.5-1-3.4-3.1-2.9-0.5 0.1-1.3 0.1-1.5 1.7-2 1.2-5.4 0.9-2.7-0.4-1-0.5-2.1-1-1.4-2.7-0.8-3.5-1.5-1.7-3.7 2.9-4.4 0.5-0.6 0.1-2 3.4-1 5-1.8 5.3-1.9 2-1.6 1.7-8.6 4.2-0.2 0.1-3.9 3.6-0.9 2.3-0.4 6-0.6 2.2 0 0.3-1.5 2.1-0.3 0.2-3.1 2.8-1.4 2.2 0.2 4.3 0 3.5-0.5 2.6 0 0.3-1.7 1.8-1.2 0.5-3.6 1.6-1.5 2-0.3 5 1.7 2.1 1 2-2.6 5-2 1.9-0.7 0.1-1.6 0.4-1.2 0.3-1.6 1.1-0.5 0.6-1.4 1.9-0.9 1.9-0.5 1.8-1 2.4-8.1 14.2-1 3.5 2.8 1.3 5.2 4 0.9 1.4 1.3 1.9-1.7-0.1-4.5-0.5 0 2.1-0.3 1.1-0.5 0.9-0.4 1.3 2.3 2.1-2.8 1.9-1 3.5 0.3 4.4 1.4 4.6 2.5 4.1 2.4 1.2 2.5 0.4 3 1.9 1.6 2.3 5.6 11 0.3 1.7 0.5 5.1-0.1 0.9 1.6 1.2 3.2 1 1.5 0.8 1.3 0.2 1.5-0.5 1.5 0.1 1.4 2.2 0.1 0.8 0.2 2-0.9 1.5-1.1 1.3-0.4 2-0.1 2.4-0.7 1.2-0.3 1.3 0.8 2.6 1.6 1.3 4.7 0.5 1.7 1.5 1.3 5.1-1.3 3.2-2.3 2.2-1.9 2.2-3 8.4-1.9 3.6-2.7 2.6 4 2.2-2.2 5.6-2.4 2.6-2.2 2.3-0.8 1-5.6 2.6-2.8-0.6-5.1-3.2-2.6-0.4-2.5 1.3-3.1 4.1-2.9 1.3-5.1-0.9-5.1-2.5-5.3-1.3-5.9 3.1-2.8 3.8-0.5 2.6-0.8 1.5-3.5 0.4-2-0.5-7.4-3.5-4.4 2-5.9 4.7-6.2 3.6-5.1-1.4-1.4-3.2 0.2-3.2 0.8-3.4 0-3.8-0.9-3.4-11.4-20.6-2.6-2.3-1.8-1.6-7.3-2.7-2.7-1.7-1.5-0.2-0.8 1-1 2-1.3 1.8-1.7 0.5-3.9-0.7-1.1-1.5-0.6-3.3 0.7-5.2 1.9-1.2 1.1-1.3-1.6-5.5-4.6-5.6-4.9-4.9-5.1 0.1-10.7 3-5.4-1.6-4.3-3.2-3.5-3.4-10.1-14.6-2.8-2.7-8.4-2.4-4.7-2.7-8.8-8.7-4.2-2.4-0.7 0-4.3 0.2-10.2 3.7-5.3 0.8-6.2-0.9-2.1-2.7 0-13.7-0.5-2.2-2.4-3.8-0.5-1.9 0.5-2.2 2.1-2.5 0.8-1.9 1.2-4.5 1.2-3 0.6-3.2-0.4-4.8-3.7-6.7-11.1-4.6-3.2-5.1 1.1-5.9 9-22.7 0.2-3.9-0.3-3 0.2-3.4 4.5-9.8 1.4-0.3 2.6 2.8 0.5-6.5 1.3-7.6 0.3-6.4-2.2-2.9-7.4 1.5-2.6-1.1-1.1-5.5-6.4 3-25.1 25.5-1.4 2.9-0.6 3.6 0.5 2.3 0.9 1.8 0.2 2.5-1.8 11.8-1.6 5.8-2.2 4.2-2.6 1.7-9.8 1.5-32.9 16.4-7 1.2-1.7-0.5-35.4-9.7-14.6 2.1-3.5 0.5-3.2-0.9-13.2-7.2 0.2 0.1 1.7 0.1-0.3-5.4-1.3-5.6-1.1-0.5 1-4.3 1.2-2.7 1.7-2.1 4.3-4.1 5.4-3.9 5.7-2.8 0.1-2.4-1.7-3-1.4-3.4-3.9-15.9-2.4-1.2-2.5 0.4-4.7 2.2-3.4-1.7 0.6-6.7 4.5-14.8 1.3-6.7 1.1-3 2.5-3.6 5.5-4.4 2.4-2.6 0.5-3.9-1.4-2.4-2.9-2.6-3.2-2-2.1-0.7-3 1.2-0.1 2.4 0.3 2.5-1.8 1.8-4.3-2.1-6.5-13.9-4.8-4.4-5.1-2.9-7.8-8.7-4.6-2.2-5 0.5-15 6.4-5.3 0-4.2-2-4.1-2.8-4.9-2.5-9.8-1.2-10.2 0.8-3.2 1.2-1.9 2.1-4.3 7.3-1 3-0.6 1.2-1.1 0.7-0.4-0.3-0.4 0.2-0.9 2.3-8.3-7.7-2-15.2-0.1-17.2-2-14.3-3.8-7-4.7-4.5-5.1-2.6-5.4-1.1-15.2-0.1-3-2.2 2.3-4.1 0.4-3-1.5-2-3.4-1-3.4 0.3-2.4 1.5-2.3 2.4-3.2 2.5-10.4 3.8-5.7 0.6-4.1-1.1-10.3-5.4-3.1-2.5-3.8-4.7-1.2-4.3-0.3-11.8-6.3-20.9-1.9-10.8 3.3-6.2-2.7-8.9-1.9-3.4-3.1-1.1-3.3-0.4-1.9-2.2-2.9-7.1-3.3-5.9 2.9-1 10.5-5.5 9.7 5.6 10.1-1.5 5 7.2-0.4 5.1 5.9 4.3 1.3 0.1 2.4 0.7 0.9-2.8 10.7-11.3 10.6-7.8 8.6 3.6 9.4-2.9 1.5 11.8 15.6 0.3 6.6 4.6 9.6-18.7 6.8-3.8 2.5 5 10.2-4.3 4 11.7 9.4-1.1 3.2 3.1 13.3-2.9 2.5 6.4-1.7 6.2 1.1 4.1 3.4 4.4 5 1.8 14.3 0.4 4.8-3.8 4.5 1.5 5.5-2.9 1.7 2.5 3.3-6.3 6.4 2.2 1.8-3.8 5.8 0.1 1.7-4.1 2.3-0.9 2.3 0.9 5.1 7.2 6.4-0.2 7.7 6.4 4.6-3.4 6.5 2.2 3.5-1.2 1.6-1.9 0.6-5.7 5.2-0.1-2.5-3.7 1.7-2 4.5 6.2 4.5 0.4 1.3-5.7 11.4-1.7 8.5-6.7 5.2-1.7 3.4 0.5-1 4.3 1.2 1.9 7.5 4.3 0.5-4.6 10.3-2.4 5.6-6.1 1.3 8.1 7.8-0.4 4.6-5.4-4.3-5.8 1-9.5 12.3 3.2 4.1-2.4 1 2.8 2-4.7 6.3-2.3 9.9 3.4 5.1 8.4 5.6 0.6-1 4 17.8-1.8-0.8 6.7 3 2.5 3.5-0.5 11.6-9.2 8.9 7 5.8 3.4-0.1 6.7 3.9 5 3.5 1.7 6.3-1 15.7 4.6 3-3.7-2.6-6.1 14 1.8 1.7-3.5 1.7 4.2 7.6-4.7 7.5 4.2 1.2-4.3 4.7-4.2 10.9-3.6 3.1 1.3 3 7.4 6.3 2.4 5.3-0.5 1.8-6.6 4.7 5.1 3.7-0.9 6.4-5.6-0.4-6.1 20.4-6.1 11.5-11.6z"

// Convertisseur mathématique précis : Coordonnées GPS (WGS84) vers coordonnées SVG (1000x817)
function gpsToSvgPoint(lat: number, lng: number): { x: number; y: number } {
  const x = 90.9 + (lng - 2.714436) * 235.96
  const y = 743.1 - (lat - 49.595275) * 370.98
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  }
}

// 10 Villes et carrefours de référence de Wallonie & Bruxelles
const BELGIUM_HUBS = [
  { name: "Bruxelles", lat: 50.8503, lng: 4.3517 },
  { name: "Wavre", lat: 50.7172, lng: 4.6133 },
  { name: "Tournai", lat: 50.6057, lng: 3.3888 },
  { name: "Mons", lat: 50.4542, lng: 3.9567 },
  { name: "Charleroi", lat: 50.4108, lng: 4.4446 },
  { name: "Namur", lat: 50.4674, lng: 4.872 },
  { name: "Liège", lat: 50.6326, lng: 5.5797 },
  { name: "Verviers", lat: 50.5932, lng: 5.8647 },
  { name: "Bastogne", lat: 50.0033, lng: 5.7183 },
  { name: "Arlon", lat: 49.6833, lng: 5.8167 },
]

export function LeadGeoRadarMap({
  city,
  postalCode,
  provinceLabel,
  isPurchased = false,
  siteAddress,
  coords = [50.5039, 4.869],
}: LeadGeoRadarMapProps) {
  const [lat, lng] = coords

  // Position exacte du chantier dans le repère SVG
  const leadPoint = useMemo(() => gpsToSvgPoint(lat, lng), [lat, lng])

  // Points repères des métropoles de référence
  const hubPoints = useMemo(() => {
    return BELGIUM_HUBS.map((h) => ({
      ...h,
      pt: gpsToSvgPoint(h.lat, h.lng),
    }))
  }, [])

  // Largeur dynamique du badge commune pour un centrage impeccable
  const displayCity = city || "Wallonie"
  const pillWidth = Math.max(68, Math.min(145, displayCity.length * 7.5 + 24))

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#EDF4F8] shadow-xs select-none">
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9.5] flex items-center justify-center">
        <svg
          viewBox="60 220 860 550"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ombre portée douce sous le territoire de la Wallonie */}
            <filter id="walloniaShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" floodColor="#0F172A" floodOpacity="0.09" />
            </filter>

            {/* Découpe stricte sur les frontières de la Wallonie pour les textures intérieures */}
            <clipPath id="walloniaClip">
              <path d={SVG_PATH_WALLONIA} />
            </clipPath>
          </defs>

          {/* ── 1. Fond Pastel & Hydrographie de Contexte Extérieur ── */}
          <rect x="0" y="0" width="1000" height="817" fill="#EDF4F8" />

          {/* Tracés hydrographiques et régionaux extérieurs (Flandre, France, Luxembourg) */}
          <g fill="none" stroke="#D3E1EC" strokeWidth="1.2" strokeLinecap="round" opacity="0.85">
            {/* Bassin de l'Escaut / Lys en Flandre */}
            <path d="M 180 340 Q 230 280 320 250 T 450 190 T 560 170" />
            <path d="M 280 290 Q 380 260 460 230" />
            <path d="M 500 240 Q 520 210 570 190" />
            {/* Vallée de la Moselle et Sûre à l'est */}
            <path d="M 830 730 Q 860 710 880 670 T 895 600" />
            {/* Rivières de France vers la frontière sud */}
            <path d="M 140 330 Q 110 360 90 410 T 80 480" />
            <path d="M 330 460 Q 310 500 280 540 T 260 620" />
          </g>

          {/* Enclave de la Région de Bruxelles-Capitale */}
          <path
            d={SVG_PATH_BRUSSELS}
            fill="#E2EBF1"
            stroke="#CADBE6"
            strokeWidth="1"
          />

          {/* Forêts de transition périurbaines */}
          <path d="M 460 290 Q 480 285 500 295 Q 510 310 490 315 Q 470 310 460 290 Z" fill="#DCECE0" opacity="0.55" />
          <path d="M 525 295 Q 545 290 555 305 Q 550 318 530 315 Z" fill="#DCECE0" opacity="0.55" />

          {/* ── 2. Territoire de la Wallonie (Fond Blanc & Relief) ── */}
          <path
            d={SVG_PATH_WALLONIA}
            fill="#FFFFFF"
            filter="url(#walloniaShadow)"
          />

          {/* ── 3. Détails Cartographiques Intérieurs à la Wallonie ── */}
          <g clipPath="url(#walloniaClip)">
            {/* Nuances géographiques & Massifs forestiers (Ardennes, Condroz, Hautes Fagnes) */}
            <path
              d="M 640 450 Q 750 420 860 400 L 890 550 Q 820 620 720 620 Q 660 550 640 450 Z"
              fill="#F4F8F4"
              opacity="0.8"
            />

            {/* Hautes Fagnes & Hertogenwald (Est de Verviers & Liège) */}
            <path d="M 810 370 Q 850 350 880 375 Q 890 420 860 440 Q 820 430 810 370 Z" fill="#D7EBDB" opacity="0.65" />
            <path d="M 780 410 Q 830 395 850 430 Q 830 460 790 445 Z" fill="#DCEDE0" opacity="0.6" />

            {/* Massif Ardennais (Saint-Hubert / Bastogne / La Roche) */}
            <path d="M 680 480 Q 750 460 790 500 Q 810 560 760 590 Q 710 580 675 530 Z" fill="#D6EAD9" opacity="0.65" />
            <path d="M 740 540 Q 800 520 820 570 Q 790 620 740 600 Z" fill="#DCEDE0" opacity="0.6" />
            <path d="M 650 540 Q 700 510 720 560 Q 690 610 640 580 Z" fill="#DCEDE0" opacity="0.6" />

            {/* Forêt d'Anlier & Gaume (Entre Bastogne et Arlon) */}
            <path d="M 760 620 Q 810 600 830 640 Q 820 680 770 670 Z" fill="#D7EBDB" opacity="0.65" />

            {/* Condroz & Famenne (Sud de Namur & Huy) */}
            <path d="M 570 450 Q 630 440 660 475 Q 640 510 580 495 Z" fill="#E0EFE3" opacity="0.55" />
            <path d="M 500 480 Q 560 465 575 510 Q 540 540 495 515 Z" fill="#E0EFE3" opacity="0.55" />

            {/* Botte du Hainaut & Chimay */}
            <path d="M 430 520 Q 480 500 500 545 Q 470 595 425 570 Z" fill="#D8EBDC" opacity="0.6" />
            <path d="M 370 540 Q 420 525 435 570 Q 400 610 365 580 Z" fill="#DCEDE0" opacity="0.55" />

            {/* Brabant Wallon / Forêts de Lauzelle */}
            <path d="M 510 320 Q 545 315 560 335 Q 540 355 515 345 Z" fill="#E2EFE5" opacity="0.55" />

            {/* Hydrographie principale (Meuse, Sambre, Ourthe, Semois & Lacs) */}
            <g fill="none" stroke="#BAE6FD" strokeLinecap="round" opacity="0.85">
              {/* La Meuse */}
              <path d="M 580 515 Q 585 460 600 420 Q 640 410 685 400 Q 730 385 767 358 Q 780 335 785 310" strokeWidth="2.2" />
              {/* La Sambre */}
              <path d="M 440 460 Q 470 450 499 441 Q 550 435 600 420" strokeWidth="1.8" />
              {/* L'Ourthe */}
              <path d="M 767 358 Q 740 410 720 460 Q 710 510 740 550" strokeWidth="1.4" />
              {/* La Semois */}
              <path d="M 810 690 Q 740 680 670 660 T 570 650" strokeWidth="1.4" />
            </g>

            {/* Plans d'eau wallons de référence */}
            <ellipse cx="485" cy="525" rx="7" ry="5" fill="#93C5FD" opacity="0.85" />
            <ellipse cx="493" cy="522" rx="5" ry="4" fill="#93C5FD" opacity="0.85" />
            <ellipse cx="855" cy="365" rx="6" ry="4" fill="#93C5FD" opacity="0.85" />

            {/* Réseau Autoroutier Wallon Structurant (Tracés nets et discrets en blanc) */}
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Soulignement d'ombrage des autoroutes */}
              <g stroke="#E2E8F0" strokeWidth="3">
                <path d="M 477 278 L 767 358 L 834 373" />
                <path d="M 477 278 L 539 327 L 600 420 L 720 520 L 823 711" />
                <path d="M 250 369 L 384 425 L 499 441 L 600 420 L 767 358" />
                <path d="M 767 358 L 800 592 L 823 711" />
                <path d="M 600 420 L 711 508 L 800 592" />
                <path d="M 499 441 L 505 520 L 500 570" />
              </g>

              {/* Voies principales en blanc pur */}
              <g stroke="#FFFFFF" strokeWidth="1.8">
                {/* E40 : Bruxelles - Liège - Verviers */}
                <path d="M 477 278 L 767 358 L 834 373" />
                {/* E411 : Bruxelles - Wavre - Namur - Arlon */}
                <path d="M 477 278 L 539 327 L 600 420 L 720 520 L 823 711" />
                {/* E42 : Tournai - Mons - Charleroi - Namur - Liège */}
                <path d="M 250 369 L 384 425 L 499 441 L 600 420 L 767 358" />
                {/* E25 : Liège - Bastogne - Arlon */}
                <path d="M 767 358 L 800 592 L 823 711" />
                {/* N4 : Namur - Marche - Bastogne */}
                <path d="M 600 420 L 711 508 L 800 592" />
                {/* N5 : Charleroi - Couvin */}
                <path d="M 499 441 L 505 520 L 500 570" />
              </g>
            </g>
          </g>

          {/* ── 4. Frontière Bleue Royale Nette de la Wallonie ── */}
          <path
            d={SVG_PATH_WALLONIA}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* ── 5. Métropoles & Villes de Référence (Points Noirs & Noms à Droite) ── */}
          {hubPoints.map((hub) => (
            <g key={hub.name} className="pointer-events-none">
              <circle
                cx={hub.pt.x}
                cy={hub.pt.y}
                r="3.2"
                fill="#0F172A"
              />
              <text
                x={hub.pt.x + 9}
                y={hub.pt.y + 3.5}
                textAnchor="start"
                fontSize="11"
                fontWeight="700"
                fill="#0F172A"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinejoin="round"
                paintOrder="stroke"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {hub.name}
              </text>
            </g>
          ))}

          {/* ── 6. Marqueur du Chantier Lead & Rayon de Floutage Confidentiel ── */}
          <g className="pointer-events-none">
            {/* Cercle pointillé orange / ambre de la zone de confidentialité 3 km */}
            <circle
              cx={leadPoint.x}
              cy={leadPoint.y}
              r={24}
              fill="#F59E0B"
              fillOpacity="0.10"
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* Guide concentrique intermédiaire */}
            <circle
              cx={leadPoint.x}
              cy={leadPoint.y}
              r={10}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="0.75"
              strokeDasharray="2 2"
              opacity="0.45"
            />

            {/* Point central stable (ambre si masqué, émeraude si débloqué) */}
            <circle
              cx={leadPoint.x}
              cy={leadPoint.y}
              r="4"
              fill={isPurchased ? "#10B981" : "#F59E0B"}
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />

            {/* Tige de liaison verticale reliant le point au badge */}
            <line
              x1={leadPoint.x}
              y1={leadPoint.y - 4}
              x2={leadPoint.x}
              y2={leadPoint.y - 12}
              stroke="#0F172A"
              strokeWidth="1.5"
            />

            {/* Badge sombre arrondi portant le nom de la commune */}
            <rect
              x={leadPoint.x - pillWidth / 2}
              y={leadPoint.y - 32}
              width={pillWidth}
              height="20"
              rx="6"
              fill="#0F172A"
              stroke="#2563EB"
              strokeWidth="0.8"
            />

            <text
              x={leadPoint.x}
              y={leadPoint.y - 21.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="700"
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {displayCity}
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
