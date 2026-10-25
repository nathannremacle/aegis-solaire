# AEGIS SOLAIRE — DESIGN SYSTEM & ARCHITECTURE UI (Option A : Swiss Editorial & Trust)

## 1. Philosophie Visuelle & Positionnement
Aegis Solaire n'est pas un comparateur de masse agressif ; c'est un **organe de sélection technique et financier** (Tiers de confiance wallon, RESCERT, CWaPE, PACE 2030).
- **Inspirations :** Stripe Press, Financial Times, Linear (Light Mode), Architecture Suisse.
- **Principes :** Clarté éditoriale, fond pierre chaude anti-fatigue, bordures architecturales fines (`1px`), absence totale d'effets "néon IA" ou de boutons 3D "casino/discount", précision mathématique via typographie chasse fixe sur les données.

---

## 2. Tokens de Couleurs (Tailwind v4 — `app/globals.css`)
Le fichier `styles/globals.css` est obsolète et DOIT être supprimé. Seul `app/globals.css` fait foi avec la palette unifiée B2B + B2C suivante :

```css
:root {
  /* Surfaces : Pierre chaude éditoriale & Blanc pur pour les cartes actives */
  --background: #FAF8F5;
  --foreground: #111815;
  --card: #FFFFFF;
  --card-foreground: #111815;
  --popover: #FFFFFF;
  --popover-foreground: #111815;

  /* Primary : Vert Forêt Institutionnel Profond (Autorité, Ingénierie, Durabilité) */
  --primary: #0B2B22;
  --primary-foreground: #FAF8F5;

  /* Secondary & Muted : Grès chaud / Ardoise minérale */
  --secondary: #F0ECE3;
  --secondary-foreground: #182722;
  --muted: #F2EFE9;
  --muted-foreground: #525E59;

  /* Accent : Ambre Solaire Éditorial (Chaleur, Énergie, Indicateurs clés) */
  --accent: #D97706;
  --accent-foreground: #FFFFFF;

  /* États & Bordures architecturales */
  --destructive: #B91C1C;
  --destructive-foreground: #FAF8F5;
  --border: #E2DDD3;
  --input: #D5CFC4;
  --ring: #0B2B22;

  /* Graphiques & Data-viz (Recharts / Simulateur ROI) */
  --chart-1: #0B2B22; /* Vert Forêt */
  --chart-2: #D97706; /* Ambre Solaire */
  --chart-3: #2A5C4D; /* Pin Moyen */
  --chart-4: #78716C; /* Pierre Grise */
  --chart-5: #B45309; /* Ocre Foncé */

  /* Rayon de courbure : Sec et architectural (6px base) */
  --radius: 0.375rem;
}
```

---

## 3. Système Typographique
3 familles de polices complémentaires définies dans `@theme inline` :
1. **Titres (`font-heading` / `DM Sans`)** :
   - Toujours en `tracking-tight` (`-0.025em`), `font-semibold` (600), couleur `text-foreground` (`#111815`).
   - `H1` (Hero) : `text-3xl sm:text-4xl lg:text-5xl leading-[1.12] font-semibold tracking-tight` (UN SEUL `<h1>` par page dans le DOM).
   - `H2` (Titres de sections) : `text-2xl sm:text-3xl leading-[1.2] font-semibold tracking-tight`.
   - `H3` (Titres de cartes/sous-blocs) : `text-lg sm:text-xl leading-snug font-semibold`.
2. **Corps de texte (`font-sans` / `Inter`)** :
   - Texte standard : `text-base leading-relaxed text-muted-foreground`.
   - Labels de formulaires : `text-sm font-medium text-foreground`.
3. **Données techniques & financières (`font-mono tabular-nums` / `Geist Mono`)** :
   - **OBLIGATOIRE** pour : Puissances (`kWc`), consommations (`kWh`), montants (`€ HT`), pourcentages (`%`), durées (`ans`, `48 h`, `45 s`), numéros d'étapes (`01`, `02`), codes postaux, numéros de TVA (`BE 0XXX.XXX.XXX`).
   - Surtitres de sections (Eyebrows) : `font-mono text-xs uppercase tracking-widest text-primary font-medium`.

---

## 4. Grille, Espacements & Structure ("Swiss Grid")
- **Conteneur global :** `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`.
- **Rythme vertical des sections (Standardisé) :**
  - Section standard (`Testimonials`, `ROISimulator`, `Expert`, `Benefits`, `FAQ`) : `py-16 md:py-24 border-b border-border`.
  - Section Hero B2B (`/`) : `py-12 md:py-20 border-b border-border`.
  - Section Hero B2C (`/devis-panneaux-solaires`) : `py-8 md:py-14 border-b border-border` (accès immédiat au formulaire au-dessus de la ligne de flottaison).
  - Bandeau de réassurance (`Trust Bar`) : `py-6 md:py-8 bg-secondary/60 border-b border-border`.
- **Séparation visuelle :** Privilégier les filets fins (`border-border`, `divide-y divide-border`, `divide-x divide-border`) façon tableau financier plutôt que les cartes flottantes avec ombres.

---

## 5. Composants Clés & Interactions

### A. Boutons (Unification B2B & B2C)
- **Bouton Primaire (Action de conversion) :** `bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-5 py-3 font-medium transition-colors shadow-xs`. Sur les étapes finales de formulaire ("Recevoir mes 3 devis" / "Débloquer mon étude ROI"), un badge ou icône en `text-accent` peut accompagner le texte, mais AUCUNE ombre 3D (`#DEB12C`) ni halo lumineux (`rgba(255,184,0,0.4)`).
- **Bouton Secondaire :** `bg-card text-foreground border border-border hover:bg-secondary/70 rounded-md px-5 py-3 font-medium transition-colors`.
- **Cartes de choix interactives (Formulaires B2B & B2C) :**
  - État repos : `bg-card border border-border rounded-md p-4 text-left hover:border-primary/50 hover:bg-secondary/30 transition-all`.
  - État sélectionné : `bg-primary/[0.04] border-2 border-primary text-foreground ring-1 ring-primary/10`. Indicateur radio ou coche en `text-primary`.

### B. Tunnels de Conversion (Simulateur B2B & Lead Card B2C)
- **Conteneur du tunnel :** `bg-card border border-border rounded-lg shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)] overflow-hidden`.
- **En-tête du tunnel :** Fond `bg-secondary/50 border-b border-border px-6 py-4` affichant l'étape en cours en `font-mono text-xs uppercase tracking-wider text-muted-foreground` (ex: `ÉTAPE 02 / 06 — CONFIGURATION BÂTIMENT`) et une barre de progression fine (`h-1 bg-border` avec remplissage `bg-accent`).
- **Badges RESCERT / Conformité :** Style unique sur tout le site : `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary/[0.06] border border-primary/20 text-primary text-xs font-mono font-medium`.