# AEGIS SOLAIRE — DESIGN SYSTEM & ARCHITECTURE UI (Fintech Slate & Solar Trust)

## 1. Philosophie Visuelle & Positionnement
Aegis Solaire est l'**organe de sélection technique et d'audit financier indépendant** pour le photovoltaïque en Wallonie (Tiers de confiance neutre, CWaPE, RESCERT, PACE 2030).
- **Inspirations :** Stripe, Qonto, Linear, Apple Bento Grid, Supabase.
- **Principes cardinaux :**
  - **Clarté & Luminosité :** Fond blanc pur (`#FFFFFF`) et surfaces gris ardoise léger (`#F8FAFC`, `#F1F5F9`) garantissant un contraste maximal et éliminant tout aspect jauni ou terne.
  - **Autorité & Rigueur Financière :** Texte et structure en Bleu Nuit Ardoise profond (`#0F172A`), souligné par des bordures ultra-nettes (`#E2E8F0`, 1px).
  - **Double Accent Sémantique :**
    - **Bleu Cobalt Tech (`#2563EB`) :** Marqueur d'autorité institutionnelle, de sécurité, de certification et d'actions primaires du tunnel.
    - **Or Solaire (`#F59E0B`) :** Marqueur d'énergie solaire, d'économies annuelles (`€`), de puissance installée (`kWc`) et de taux d'autoconsommation.
  - **Structure Modulaire Bento :** Cartes à coins arrondis soignés (`rounded-xl` 12px, `rounded-2xl` 16px) avec micro-reliefs d'élévation modernes (`shadow-xs`, `shadow-sm`).

---

## 2. Tokens de Couleurs (Tailwind v4 — `app/globals.css`)
Le fichier unique de configuration est `app/globals.css`. La palette unifiée s'articule comme suit :

```css
:root {
  /* Surfaces : Blanc pur & Gris ardoise clair ultra-net */
  --background: #FFFFFF;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;

  /* Primary : Bleu Nuit Ardoise Profond (Rigueur, Autorité Institutionnelle & B2B) */
  --primary: #0F172A;
  --primary-foreground: #FFFFFF;

  /* Secondary & Muted : Surfaces Slate techniques */
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --muted: #F8FAFC;
  --muted-foreground: #64748B;

  /* Accent : Bleu Cobalt Tech (Confiance bancaire, focus & conversion primaire) */
  --accent: #2563EB;
  --accent-foreground: #FFFFFF;

  /* Accent Solaire : Or Solaire & Énergie (Indicateurs ROI, kWh, primes & gains) */
  --accent-solar: #F59E0B;
  --accent-solar-foreground: #0F172A;

  /* États & Bordures nettes 1px */
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #2563EB;

  /* Graphiques & Data-viz (Recharts / Simulateur ROI) */
  --chart-1: #2563EB; /* Cobalt Tech */
  --chart-2: #F59E0B; /* Or Solaire */
  --chart-3: #0F172A; /* Ardoise Profonde */
  --chart-4: #10B981; /* Vert Économies */
  --chart-5: #6366F1; /* Indigo Réseau */

  /* Rayon de courbure : Bento modulaire (12px base) */
  --radius: 0.75rem;

  /* Statuts opérationnels (Pipeline & Litiges) */
  --status-new: #2563EB;
  --status-review: #D97706;
  --status-qualified: #059669;
  --status-distributed: #0F172A;
  --status-disputed: #EF4444;
  --status-converted: #10B981;
  --status-archived: #64748B;

  /* Sidebar */
  --sidebar: #FFFFFF;
  --sidebar-foreground: #0F172A;
  --sidebar-primary: #0F172A;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #F1F5F9;
  --sidebar-accent-foreground: #0F172A;
  --sidebar-border: #E2E8F0;
  --sidebar-ring: #2563EB;
}
```

---

## 3. Système Typographique
3 familles de polices complémentaires définies dans `@theme inline` :
1. **Titres (`font-heading` / `DM Sans` ou `Plus Jakarta Sans`)** :
   - Toujours en `tracking-tight` (`-0.025em`), `font-bold` (700) ou `font-semibold` (600), couleur `text-foreground` (`#0F172A`).
   - `H1` (Hero) : `text-3xl sm:text-4xl lg:text-5xl leading-[1.12] font-extrabold tracking-tight` (UN SEUL `<h1>` par page dans le DOM).
   - `H2` (Titres de sections) : `text-2xl sm:text-3xl lg:text-4xl leading-[1.2] font-bold tracking-tight`.
   - `H3` (Titres de cartes/sous-blocs) : `text-lg sm:text-xl leading-snug font-semibold`.
2. **Corps de texte (`font-sans` / `Inter`)** :
   - Texte standard : `text-base leading-relaxed text-muted-foreground`.
   - Labels de formulaires : `text-sm font-semibold text-foreground`.
3. **Données techniques & financières (`font-mono tabular-nums` / `Geist Mono`)** :
   - **OBLIGATOIRE** pour : Montants financiers (`€`, `€ HT`), puissances (`kWc`), consommations & productions (`kWh`), pourcentages (`%`), durées & délais (`48 h`, `45 s`), numéros d'étapes (`01/05`), codes postaux, numéros de TVA (`BE 0XXX.XXX.XXX`).
   - Surtitres de sections (Eyebrows) : `font-mono text-xs uppercase tracking-wider text-accent font-semibold`.

---

## 4. Grille Bento & Espacements ("Fintech Bento Grid")
- **Conteneur global :** `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`.
- **Rythme vertical standardisé :**
  - Section standard (`ROISimulator`, `WebinairePromo`, `Testimonials`, `Expert`, `Benefits`, `FAQ`) : `py-16 md:py-24 border-b border-border`.
  - Hero B2C (`/devis-panneaux-solaires`) : `py-10 md:py-16 bg-muted/40 border-b border-border` avec formulaire immédiatement visible au-dessus de la ligne de flottaison.
  - Hero B2B (`/`) : `py-12 md:py-20 bg-muted/40 border-b border-border`.
- **Cartes Bento & Élévation :**
  - Rayon : `rounded-xl` (12px) pour les sous-blocs et cartes d'options, `rounded-2xl` (16px) pour les conteneurs de section et tunnels.
  - Ombres : `shadow-xs` ou `shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)]` (micro-relief moderne, doux, sans halo dur).

---

## 5. Composants Clés & Interactions

### A. Boutons
- **Bouton d'Action Principale / Conversion :**
  - Standard Tech / B2B : `bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-3 font-semibold transition-all shadow-xs active:scale-[0.99]`.
  - Action Solaire Spécifique (Tunnel particuliers, calcul immédiat) : `bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-5 py-3.5 font-bold tracking-wide transition-all shadow-sm active:scale-[0.99]` (possibilité d'indicateurs or solaire `text-accent-solar` sur les chiffres).
- **Bouton Secondaire :** `bg-card text-foreground border border-border hover:bg-secondary/80 rounded-xl px-5 py-3 font-medium transition-colors`.

### B. Cartes de Choix Interactives (Simulateur & Tunnel)
- **État repos :** `bg-card border border-border rounded-xl p-4 text-left hover:border-accent/40 hover:bg-muted/40 transition-all cursor-pointer`.
- **État sélectionné :** `bg-accent/[0.04] border-2 border-accent text-foreground ring-1 ring-accent/20 rounded-xl p-4 shadow-xs`.
- Indicateur radio : Coche ou pastille en `bg-accent text-accent-foreground`.

### C. Badges RESCERT & Conformité
- Style unique : `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold`.