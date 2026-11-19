"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Check, Loader2, TrendingDown, ArrowRight } from "lucide-react"

export interface CompetitionInterstitialProps {
  postalCode: string
  city: string
  province: string
  roofType: string
  estimatedKwc: number
  onComplete: () => void
}

const ROOF_TYPE_LABELS: Record<string, string> = {
  tuiles: "Toiture en tuiles",
  ardoises: "Toiture en ardoises",
  plat_epdm: "Toit plat (EPDM)",
  plat: "Toit plat (EPDM)",
  bac_acier: "Toiture bac acier",
  zinc_autre: "Toiture zinc / autre",
  fibrociment_amiante: "Toiture fibrociment",
  autre: "Autre toiture / pose au sol",
}

export function CompetitionInterstitial({
  postalCode,
  city,
  province: _province,
  roofType,
  estimatedKwc,
  onComplete,
}: CompetitionInterstitialProps) {
  const [connectedCount, setConnectedCount] = useState<number>(0)
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [step2Done, setStep2Done] = useState(false)

  const roofLabel = ROOF_TYPE_LABELS[roofType] || "Toiture en tuiles"
  const locationLabel = [postalCode, city].filter(Boolean).join(" ") || "Wallonie"

  useEffect(() => {
    // Étape 1 (350ms) : Installateur 1 se connecte au projet
    const t1 = setTimeout(() => {
      setConnectedCount(1)
    }, 350)

    // Étape 2 (850ms) : Installateur 2 se connecte au projet
    const t2 = setTimeout(() => {
      setConnectedCount(2)
    }, 850)

    // Étape 3 (1350ms) : Installateur 3 se connecte au projet -> 3 artisans reliés
    const t3 = setTimeout(() => {
      setConnectedCount(3)
    }, 1350)

    // Étape 4 (1750ms) : La concurrence frontale s'active -> la marge baisse de -18 %
    const t4 = setTimeout(() => {
      setPhase(2)
      setStep2Done(true)
    }, 1750)

    // Auto-avance rapide après 2,45 s de lecture confortable du -18 % (animation terminée à 1750 ms)
    const t5 = setTimeout(() => {
      onComplete()
    }, 4200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
    }
  }, [onComplete])

  return (
    <div className="w-full flex flex-col justify-between gap-4 py-0.5">
      {/* ── 1. BARRE DE PROGRESSION ORANGE & INDICATEUR ÉTAPE 5 SUR 6 ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-2 flex-1 bg-[var(--aegis-divider)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "66%" }}
            animate={{ width: "83%" }}
            transition={{ duration: 0.4 }}
            className="h-full bg-accent-solar rounded-full"
          />
        </div>
        <span className="text-[13px] font-bold text-[var(--aegis-ink)] shrink-0 font-mono tabular-nums">
          Étape 5 sur 6
        </span>
      </div>

      {/* ── 2. EN-TÊTE DU PROTOCOLE ── */}
      <div className="flex flex-col items-start text-left gap-1.5">
        <span className="inline-flex items-center rounded-[5px] border border-[var(--aegis-preference-accent)]/45 bg-[var(--aegis-preference-bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--aegis-preference-label)]">
          Protocole d&apos;appel d&apos;offres
        </span>

        <h2 className="text-[20px] sm:text-[22px] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--aegis-ink)]">
          Mise en concurrence sur {locationLabel}
        </h2>

        <p className="text-[13px] sm:text-[14px] text-[var(--aegis-muted)]">
          {roofLabel} ·{" "}
          <span className="font-mono tabular-nums font-bold text-[var(--aegis-ink)]">
            env. {estimatedKwc.toFixed(1).replace(".", ",")} kWc
          </span>{" "}
          · Régime CWaPE 2026
        </p>
      </div>

      {/* ── 3. SCHÉMA ARCHITECTURE RÉSEAU (Symétrique & Haut Contraste) ── */}
      <div className="rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-4 sm:p-5">
        <div className="relative w-full max-w-[380px] h-[212px] mx-auto select-none">
          {/* Courbes de connexion vectorielles symétriques */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 380 212"
            preserveAspectRatio="none"
          >
            {/* Pistes neutres permanentes pour ancrer la structure */}
            <path d="M 190 48 L 190 78" fill="none" stroke="var(--aegis-border)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <path d="M 80 164 C 80 144, 152 154, 152 134" fill="none" stroke="var(--aegis-border)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <path d="M 300 164 C 300 144, 228 154, 228 134" fill="none" stroke="var(--aegis-border)" strokeWidth="2" vectorEffect="non-scaling-stroke" />

            {/* Connexion 1 : Installateur 1 -> Votre projet */}
            <motion.path
              d="M 190 48 L 190 78"
              fill="none"
              stroke="var(--aegis-ink)"
              strokeWidth="2.25"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: connectedCount >= 1 ? 1 : 0,
                opacity: connectedCount >= 1 ? 1 : 0,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />

            {/* Connexion 2 : Installateur 2 -> Votre projet */}
            <motion.path
              d="M 80 164 C 80 144, 152 154, 152 134"
              fill="none"
              stroke="var(--aegis-ink)"
              strokeWidth="2.25"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: connectedCount >= 2 ? 1 : 0,
                opacity: connectedCount >= 2 ? 1 : 0,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />

            {/* Connexion 3 : Installateur 3 -> Votre projet */}
            <motion.path
              d="M 300 164 C 300 144, 228 154, 228 134"
              fill="none"
              stroke="var(--aegis-ink)"
              strokeWidth="2.25"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: connectedCount >= 3 ? 1 : 0,
                opacity: connectedCount >= 3 ? 1 : 0,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </svg>

          {/* Nœud Haut : Installateur 1 */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-[44%] min-w-[142px] max-w-[164px] h-[50px] rounded-[8px] px-2.5 py-1.5 flex flex-col items-center justify-center transition-all duration-300 ${
              connectedCount >= 1
                ? "border border-[var(--aegis-ink)] bg-[var(--aegis-surface)] shadow-xs"
                : "border border-[var(--aegis-border)] bg-[var(--aegis-surface)]/80 opacity-80"
            }`}
          >
            <div className="flex items-center gap-1.5 leading-none">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  connectedCount >= 1
                    ? "bg-accent-solar ring-1 ring-[var(--aegis-focus)]/40"
                    : "bg-[var(--aegis-input-border)]"
                }`}
              />
              <span className="text-[12px] font-bold text-[var(--aegis-ink)] tracking-tight">
                Installateur 1
              </span>
            </div>
            <div className="mt-1.5 leading-none">
              {connectedCount >= 1 ? (
                <span className="rounded-[4px] bg-[var(--aegis-availability-bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--aegis-availability-text)] font-bold inline-flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> RESCert vérifié
                </span>
              ) : (
                <span className="text-[11px] text-[var(--aegis-muted)] font-medium">
                  En attente…
                </span>
              )}
            </div>
          </div>

          {/* Nœud Central : Votre projet */}
          <div className="absolute top-[78px] left-1/2 -translate-x-1/2 w-[160px] h-[56px] bg-[var(--aegis-ink)] text-white rounded-[8px] px-3 py-2 flex flex-col items-center justify-center z-10 border border-[var(--aegis-primary-hover)] shadow-sm">
            <div className="flex items-center gap-1.5 leading-none">
              <svg className="w-3.5 h-3.5 text-accent-solar shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="text-[13px] font-bold tracking-tight text-white">Votre projet</span>
            </div>
            <span
              className={`mt-1.5 inline-flex items-center rounded-[4px] px-2 py-0.5 text-[10.5px] font-mono tabular-nums font-bold leading-none ${
                connectedCount < 3
                  ? "bg-white/15 text-white"
                  : "bg-accent-solar text-accent-solar-foreground"
              }`}
            >
              {connectedCount < 3 ? `${connectedCount} / 3 connectés` : "3 devis comparés"}
            </span>
          </div>

          {/* Nœud Bas-Gauche : Installateur 2 */}
          <div
            className={`absolute bottom-0 left-0 w-[43%] max-w-[164px] h-[50px] rounded-[8px] px-2.5 py-1.5 flex flex-col items-center justify-center transition-all duration-300 ${
              connectedCount >= 2
                ? "border border-[var(--aegis-ink)] bg-[var(--aegis-surface)] shadow-xs"
                : "border border-[var(--aegis-border)] bg-[var(--aegis-surface)]/80 opacity-80"
            }`}
          >
            <div className="flex items-center gap-1.5 leading-none">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  connectedCount >= 2
                    ? "bg-accent-solar ring-1 ring-[var(--aegis-focus)]/40"
                    : "bg-[var(--aegis-input-border)]"
                }`}
              />
              <span className="text-[12px] font-bold text-[var(--aegis-ink)] tracking-tight">
                Installateur 2
              </span>
            </div>
            <div className="mt-1.5 leading-none">
              {connectedCount >= 2 ? (
                <span className="rounded-[4px] bg-[var(--aegis-availability-bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--aegis-availability-text)] font-bold inline-flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> RESCert vérifié
                </span>
              ) : (
                <span className="text-[11px] text-[var(--aegis-muted)] font-medium">
                  En attente…
                </span>
              )}
            </div>
          </div>

          {/* Nœud Bas-Droite : Installateur 3 */}
          <div
            className={`absolute bottom-0 right-0 w-[43%] max-w-[164px] h-[50px] rounded-[8px] px-2.5 py-1.5 flex flex-col items-center justify-center transition-all duration-300 ${
              connectedCount >= 3
                ? "border border-[var(--aegis-ink)] bg-[var(--aegis-surface)] shadow-xs"
                : "border border-[var(--aegis-border)] bg-[var(--aegis-surface)]/80 opacity-80"
            }`}
          >
            <div className="flex items-center gap-1.5 leading-none">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  connectedCount >= 3
                    ? "bg-accent-solar ring-1 ring-[var(--aegis-focus)]/40"
                    : "bg-[var(--aegis-input-border)]"
                }`}
              />
              <span className="text-[12px] font-bold text-[var(--aegis-ink)] tracking-tight">
                Installateur 3
              </span>
            </div>
            <div className="mt-1.5 leading-none">
              {connectedCount >= 3 ? (
                <span className="rounded-[4px] bg-[var(--aegis-availability-bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--aegis-availability-text)] font-bold inline-flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> RESCert vérifié
                </span>
              ) : (
                <span className="text-[11px] text-[var(--aegis-muted)] font-medium">
                  En attente…
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BLOC : EFFET DE LA MISE EN CONCURRENCE DIRECTE ── */}
      <div className="rounded-[8px] border border-[var(--aegis-preference-accent)]/50 bg-[var(--aegis-summary)] p-3.5 sm:p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[var(--aegis-availability-text)] shrink-0" />
            <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--aegis-ink)]">
              Effet de la mise en concurrence directe
            </h3>
          </div>
          <span className="text-[12px] text-[var(--aegis-muted)] font-medium hidden sm:inline">
            Écart moyen Wallonie
          </span>
        </div>

        {/* Ligne 1 : Démarche isolée (1 seul devis) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-[var(--aegis-muted)]">Devis standard isolé</span>
            <span className="font-mono tabular-nums text-[var(--aegis-muted)] font-semibold">
              100 % (marge standard)
            </span>
          </div>
          <div className="h-2.5 w-full bg-[var(--aegis-divider)] rounded-full overflow-hidden">
            <div className="h-full w-full bg-[var(--aegis-input-border)] rounded-full" />
          </div>
        </div>

        {/* Ligne 2 : Mise en concurrence Aegis (3 installateurs) */}
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-bold text-[var(--aegis-ink)]">Mise en concurrence (3 devis)</span>
            <span className="font-mono tabular-nums text-[var(--aegis-availability-text)] font-bold">
              82 % (tarif négocié)
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-3 bg-[var(--aegis-surface)] rounded-full overflow-hidden p-0.5 border border-[var(--aegis-border)]">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: phase >= 2 ? "82%" : "100%" }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className="h-full bg-accent-solar rounded-full"
              />
            </div>
            <span className="px-2.5 py-0.5 rounded-[5px] bg-accent-solar text-accent-solar-foreground border border-[var(--aegis-preference-accent)] text-[12px] font-mono tabular-nums font-bold shrink-0">
              -18 %
            </span>
          </div>
        </div>

        <p className="text-[12px] text-[var(--aegis-muted)] leading-[1.45] pt-2 border-t border-[var(--aegis-divider)]">
          En sachant qu&apos;ils sont 3 sur votre dossier, les artisans réduisent leur marge commerciale dès la première offre.
        </p>
      </div>

      {/* ── 5. JOURNAL DE VALIDATION (COCHES ORANGE SOLAIRE) ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--aegis-ink)]">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-5 w-5 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </motion.div>
          <span>3 installateurs sélectionnés</span>
        </div>

        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--aegis-ink)]">
          {step2Done ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-5 w-5 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </motion.div>
          ) : (
            <div className="h-5 w-5 rounded-full bg-[var(--aegis-preference-bg)] text-[var(--aegis-focus)] flex items-center justify-center shrink-0">
              <Loader2 className="h-3 w-3 animate-spin stroke-[2.5]" />
            </div>
          )}
          <span className={step2Done ? "text-[var(--aegis-ink)] font-semibold" : "text-[var(--aegis-muted)] font-medium"}>
            Clause de mise en concurrence activée
          </span>
        </div>
      </div>

      {/* ── 6. BOUTON D'ACTION ── */}
      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-8 -mb-4 sm:-mb-8 px-4 sm:px-8 pt-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[var(--aegis-surface)] border-t border-[var(--aegis-divider)] rounded-b-[14px]">
        <button
          type="button"
          onClick={onComplete}
          className={`w-full min-h-[48px] rounded-[6px] font-bold text-[15px] flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
            step2Done
              ? "bg-accent-solar hover:bg-accent-solar/90 text-accent-solar-foreground border border-[var(--aegis-preference-accent)] cursor-pointer"
              : "bg-[var(--aegis-surface-subtle)] border border-[var(--aegis-border)] text-[var(--aegis-muted)] cursor-not-allowed"
          }`}
          disabled={!step2Done}
        >
          {step2Done ? (
            <>
              <span>Continuer vers mes 3 devis comparatifs</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </>
          ) : (
            <span className="flex items-center gap-2 text-[14px] font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--aegis-focus)]" />
              <span>Sélection des 3 installateurs en cours…</span>
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
