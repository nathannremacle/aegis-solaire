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

    // Délai de confort élargi (15s) au cas où l'utilisateur ne clique pas de lui-même
    const t5 = setTimeout(() => {
      onComplete()
    }, 15000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
    }
  }, [onComplete])

  return (
    <div className="w-full flex flex-col justify-between gap-3.5 sm:gap-4.5 py-0.5">
      
      {/* ── 1. BARRE DE PROGRESSION & INDICATEUR ÉTAPE 5 SUR 6 ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "66%" }}
            animate={{ width: "83%" }}
            transition={{ duration: 0.4 }}
            className="h-full bg-accent-solar rounded-full"
          />
        </div>
        <span className="text-xs sm:text-sm font-semibold text-foreground shrink-0 font-mono">
          Étape 5 sur 6
        </span>
      </div>

      {/* ── 2. EN-TÊTE DU PROTOCOLE ── */}
      <div className="flex flex-col items-start text-left gap-1">
        <span className="px-2.5 py-0.5 rounded-md bg-secondary text-foreground text-[10px] sm:text-[11px] font-mono font-medium border border-border/60">
          Protocole d&apos;appel d&apos;offres
        </span>

        <h3 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight font-heading">
          Mise en concurrence sur {locationLabel}
        </h3>

        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {roofLabel} · ≈ {estimatedKwc.toFixed(1).replace(".", ",")} kWc · Régime CWaPE 2026
        </p>
      </div>

      {/* ── 3. SCHÉMA ÉPURÉ DU RÉSEAU EN TRIANGLE (Animation séquentielle sobre) ── */}
      <div className="relative w-[320px] sm:w-[340px] h-[190px] mx-auto my-1 select-none">
        
        {/* SVG des 3 lignes de connexion sobres (tracé progressif lors de la connexion) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 340 190"
        >
          {/* Ligne 1 : Installateur 1 vers Maison (tracée dès t = 350ms) */}
          <motion.line
            x1="170" y1="40" x2="170" y2="68"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{
              pathLength: connectedCount >= 1 ? 1 : 0,
              opacity: connectedCount >= 1 ? 1 : 0.2,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {/* Ligne 2 : Installateur 2 vers Maison (tracée dès t = 850ms) */}
          <motion.line
            x1="92" y1="150" x2="132" y2="118"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{
              pathLength: connectedCount >= 2 ? 1 : 0,
              opacity: connectedCount >= 2 ? 1 : 0.2,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {/* Ligne 3 : Installateur 3 vers Maison (tracée dès t = 1350ms) */}
          <motion.line
            x1="248" y1="150" x2="208" y2="118"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{
              pathLength: connectedCount >= 3 ? 1 : 0,
              opacity: connectedCount >= 3 ? 1 : 0.2,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </svg>

        {/* Nœud Haut : Installateur 1 */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[40px] bg-card rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center transition-all duration-300 ${
            connectedCount >= 1
              ? "border-2 border-amber-500/70 shadow-xs"
              : "border border-border/70 opacity-60"
          }`}
        >
          <span className="text-xs font-bold text-foreground tracking-tight leading-none">
            Installateur 1
          </span>
          <div className="flex items-center gap-1 mt-1 leading-none">
            {connectedCount >= 1 ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5 stroke-[3]" /> RESCert vérifié
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-medium">
                En attente...
              </span>
            )}
          </div>
        </div>

        {/* Nœud Central : Votre projet (Carte sombre sobre identique au modèle) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[116px] h-[50px] bg-slate-900 text-white rounded-xl p-2 flex flex-col items-center justify-center z-10 shadow-sm border border-slate-700/60">
          <svg className="w-4 h-4 text-amber-400 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="text-xs font-bold tracking-tight leading-none">Votre projet</span>
          <span className="text-[9px] font-mono text-amber-400/90 font-medium mt-0.5 leading-none">
            {connectedCount < 3 ? `${connectedCount} / 3 connectés` : "3 devis comparés"}
          </span>
        </div>

        {/* Nœud Bas-Gauche : Installateur 2 */}
        <div
          className={`absolute bottom-0 left-0 w-[126px] h-[40px] bg-card rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center transition-all duration-300 ${
            connectedCount >= 2
              ? "border-2 border-amber-500/70 shadow-xs"
              : "border border-border/70 opacity-60"
          }`}
        >
          <span className="text-xs font-bold text-foreground tracking-tight leading-none">
            Installateur 2
          </span>
          <div className="flex items-center gap-1 mt-1 leading-none">
            {connectedCount >= 2 ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5 stroke-[3]" /> RESCert vérifié
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-medium">
                En attente...
              </span>
            )}
          </div>
        </div>

        {/* Nœud Bas-Droite : Installateur 3 */}
        <div
          className={`absolute bottom-0 right-0 w-[126px] h-[40px] bg-card rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center transition-all duration-300 ${
            connectedCount >= 3
              ? "border-2 border-amber-500/70 shadow-xs"
              : "border border-border/70 opacity-60"
          }`}
        >
          <span className="text-xs font-bold text-foreground tracking-tight leading-none">
            Installateur 3
          </span>
          <div className="flex items-center gap-1 mt-1 leading-none">
            {connectedCount >= 3 ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5 stroke-[3]" /> RESCert vérifié
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-medium">
                En attente...
              </span>
            )}
          </div>
        </div>

      </div>

      {/* ── 4. BLOC : L'EFFET DE LA MISE EN CONCURRENCE (Haute Clarté & Fort Contraste) ── */}
      <div className="bg-card border-2 border-amber-500/30 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h4 className="text-sm sm:text-base font-bold text-foreground font-heading">
              Effet de la mise en concurrence directe
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
            Écart moyen Wallonie
          </span>
        </div>

        {/* Ligne 1 : Démarche isolée (1 seul devis) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Devis standard isolé</span>
            <span className="font-mono text-muted-foreground font-semibold">100 % (marge standard)</span>
          </div>
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-full bg-slate-400 dark:bg-slate-500 rounded-full" />
          </div>
        </div>

        {/* Ligne 2 : Mise en concurrence Aegis (3 installateurs) */}
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">Mise en concurrence (3 devis)</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">82 % (tarif négocié)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: phase >= 2 ? "82%" : "100%" }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                className="h-full bg-amber-500 rounded-full"
              />
            </div>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-mono font-bold shrink-0 shadow-2xs">
              -18 %
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/60">
          En sachant qu&apos;ils sont 3 sur votre dossier, les artisans réduisent leur marge commerciale dès la 1re offre.
        </p>
      </div>

      {/* ── 5. JOURNAL DE VALIDATION (2 COCHES ORANGE VÉRIFIÉES) ── */}
      <div className="flex flex-col gap-2.5 pt-0.5">
        
        {/* Check 1 : 3 installateurs sélectionnés */}
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-foreground">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-5 w-5 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </motion.div>
          <span>3 installateurs sélectionnés</span>
        </div>

        {/* Check 2 : Clause de mise en concurrence activée */}
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-foreground">
          {step2Done ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-5 w-5 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </motion.div>
          ) : (
            <div className="h-5 w-5 rounded-full bg-accent-solar/15 text-accent-solar flex items-center justify-center shrink-0">
              <Loader2 className="h-3 w-3 animate-spin stroke-[2.5]" />
            </div>
          )}
          <span className={step2Done ? "text-foreground font-semibold" : "text-muted-foreground font-medium"}>
            Clause de mise en concurrence activée
          </span>
        </div>

      </div>

      {/* ── 6. BOUTON D'ACTION CRO : CONTRÔLE UTILISATEUR ── */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onComplete}
          className={`w-full h-12 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
            step2Done
              ? "bg-primary hover:bg-slate-800 text-primary-foreground active:scale-[0.99]"
              : "bg-secondary text-muted-foreground opacity-80 cursor-not-allowed"
          }`}
          disabled={!step2Done}
        >
          {step2Done ? (
            <>
              <span>Continuer vers mes 3 devis comparatifs</span>
              <ArrowRight className="h-4 w-4 text-accent-solar" />
            </>
          ) : (
            <span className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              Sélection des 3 installateurs en cours...
            </span>
          )}
        </button>
      </div>

    </div>
  )
}
