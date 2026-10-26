# Design System Master File — Aegis Solaire

> **RÈGLE HIÉRARCHIQUE UI-UX-PRO-MAX :** Lors de la construction d'une page spécifique, vérifier d'abord si `design-system/aegis-solaire/pages/[page-name].md` existe.
> Si ce fichier existe, ses règles sont **prioritaires** sur ce fichier Master.
> Dans le cas contraire, appliquer strictement les règles définies ci-dessous.

---

**Projet :** Aegis Solaire  
**Direction Artistique :** Fintech Slate & Solar Trust (Option 3 — Inspirations Stripe, Qonto, Linear, Apple Bento Grid)  
**Catégorie :** Comparateur & Tiers de Confiance Solaire (Ingénierie, Certification & Audit Financier)  
**Plateforme :** Web Responsive (Mobile-First, Breakpoints : 375px, 768px, 1024px, 1280px)

---

## 1. Philosophie Visuelle & Identité

Aegis Solaire n'est pas un comparateur de devis low-cost ou discount. C'est l'**organe indépendant d'audit technique et financier** pour le photovoltaïque en Wallonie (CWaPE, RESCERT, PACE 2030).
- **Surfaces :** Blanc pur (`#FFFFFF`) et surfaces techniques ardoise clair (`#F8FAFC`, `#F1F5F9`). Clarté totale, zéro teinte "papier jauni".
- **Structure :** Bleu nuit ardoise profond (`#0F172A`), bordures chirurgicales 1px (`#E2E8F0`).
- **Confiance & Autorité :** Bleu Cobalt Tech (`#2563EB`) pour la certification, la sécurité et la validation.
- **Énergie & Rendement :** Or Solaire (`#F59E0B`) pour les chiffres clés de rentabilité, d'économies annuelles (`€`) et d'autoconsommation.

---

## 2. Nuancier Global & Tokens Sémantiques

| Rôle Sémantique | Hex | Variable CSS | Usage & Comportement |
| :--- | :--- | :--- | :--- |
| **Background** | `#FFFFFF` | `--background` / `--color-background` | Fond de page principal |
| **Card Surface** | `#FFFFFF` | `--card` / `--color-card` | Surface des cartes de contenu et de formulaires |
| **Foreground (Texte)** | `#0F172A` | `--foreground` / `--color-foreground` | Titres et corps de texte principal (contraste 15.8:1) |
| **Primary** | `#0F172A` | `--primary` / `--color-primary` | Boutons d'action institutionnels et éléments maîtres |
| **Primary Foreground** | `#FFFFFF` | `--primary-foreground` | Texte sur fond primary |
| **Secondary Surface** | `#F1F5F9` | `--secondary` / `--color-secondary` | Conteneurs imbriqués, sous-cartes Bento |
| **Muted Surface** | `#F8FAFC` | `--muted` / `--color-muted` | Fond des sections d'impact (Hero, FAQ) |
| **Muted Foreground** | `#64748B` | `--muted-foreground` | Texte secondaire, descriptions, labels discrets |
| **Accent Tech / Confiance** | `#2563EB` | `--accent` / `--color-accent` | Boutons de validation, focus rings, badges sécurité |
| **Accent Solaire / ROI** | `#F59E0B` | `--accent-solar` / `--color-accent-solar` | Indicateurs de rentabilité, gains solaires, étoiles avis |
| **Border** | `#E2E8F0` | `--border` / `--color-border` | Filets fins de séparation 1px |
| **Input Border** | `#E2E8F0` | `--input` / `--color-input` | Contours des champs de saisie |
| **Ring** | `#2563EB` | `--ring` / `--color-ring` | Anneaux de focus accessibles (2px à 3px) |
| **Destructive** | `#EF4444` | `--destructive` / `--color-destructive` | Messages d'erreur de formulaire |

### Palette Graphiques & Data-Viz (`Recharts`)

| Index | Hex | Désignation |
| :--- | :--- | :--- |
| `--chart-1` | `#2563EB` | Cobalt Tech (Production solaire) |
| `--chart-2` | `#F59E0B` | Or Solaire (Autoconsommation & Injection) |
| `--chart-3` | `#0F172A` | Ardoise Profonde (Consommation réseau) |
| `--chart-4` | `#10B981` | Vert Émeraude (Économies nettes cumulées) |
| `--chart-5` | `#6366F1` | Indigo (Batterie domestique) |

---

## 3. Système Typographique

| Rôle | Police | Poids | Classes Clés | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Titres (Heading)** | `DM Sans` / `Plus Jakarta Sans` | `700` (Bold) & `600` (Semibold) | `font-heading tracking-tight text-foreground` | H1, H2, H3 |
| **Corps (Body)** | `Inter` | `400` (Regular) & `500` (Medium) | `font-sans leading-relaxed text-muted-foreground` | Paragraphes, descriptions |
| **Labels & UI** | `Inter` | `600` (Semibold) | `text-sm font-semibold text-foreground` | Boutons, champs de formulaires |
| **Données & Chiffres** | `Geist Mono` | `600` / `700` | `font-mono tabular-nums font-semibold` | Montants `€`, puissances `kWc`, `kWh`, `48 h`, `01/05` |
| **Eyebrows (Surtitres)** | `Geist Mono` | `600` | `font-mono text-xs uppercase tracking-wider text-accent` | Badges de section |

---

## 4. Échelle d'Espacements & Élévations

### Espacements
- `--space-xs` : `4px` (`0.25rem`) — Micro-gaps, badges
- `--space-sm` : `8px` (`0.5rem`) — Espacements inline, icônes
- `--space-md` : `16px` (`1rem`) — Padding standard de carte
- `--space-lg` : `24px` (`1.5rem`) — Padding de section compacte / grands conteneurs
- `--space-xl` : `32px` (`2rem`) — Gaps de grille Bento
- `--space-2xl` : `48px` (`3rem`) — Marges de respiration
- `--space-3xl` : `64px` (`4rem`) à `96px` — Rythme vertical inter-sections (`py-16 md:py-24`)

### Rayons de Courbure (Border-Radius)
- `rounded-sm` : `4px` — Badges textuels
- `rounded-md` : `8px` — Champs inputs, petits boutons
- `rounded-xl` : `12px` — Cartes d'options interactives du simulateur, sous-cartes
- `rounded-2xl` : `16px` — Grandes cartes Bento, conteneurs principaux de tunnel

### Ombres Douces (Fintech Soft Shadows)
- `shadow-xs` : `0 1px 2px rgba(15, 23, 42, 0.05)` (Boutons et badges)
- `shadow-sm` : `0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 6px -1px rgba(15, 23, 42, 0.03)` (Cartes de formulaires)
- `shadow-bento` : `0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(15, 23, 42, 0.05)` (Grandes cartes en lévitation subtile)

---

## 5. Spécifications des Composants Clés

### A. Boutons
```css
/* Bouton Primaire Institutionnel */
.btn-primary {
  background-color: var(--color-primary); /* #0F172A */
  color: var(--color-primary-foreground); /* #FFFFFF */
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 600;
  box-shadow: var(--shadow-xs);
  transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-primary:hover {
  background-color: #1E293B;
  transform: translateY(-1px);
}

/* Bouton Conversion Solaire (Action principale du tunnel) */
.btn-conversion {
  background-color: var(--color-accent); /* #2563EB */
  color: #FFFFFF;
  padding: 0.875rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 4px 14px -2px rgba(37, 99, 235, 0.3);
  transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-conversion:hover {
  background-color: #1D4ED8;
  transform: translateY(-1px);
}
```

### B. Cartes de Choix Interactives (Simulateur B2B / B2C)
- **Repos :** `bg-card border border-border rounded-xl p-4 text-left hover:border-accent/40 hover:bg-muted/50 transition-all cursor-pointer`
- **Actif (Sélectionné) :** `bg-accent/[0.04] border-2 border-accent text-foreground ring-1 ring-accent/20 rounded-xl p-4 shadow-xs`
- **Indicateur visuel :** Pastille circulaire avec coche animée en `text-accent`.

### C. Bento Grid Layout (Hero & Dashboard)
- Structure asymétrique 12 colonnes : `grid grid-cols-1 lg:grid-cols-12 gap-6`.
- Bloc d'impact gauche : `lg:col-span-7` avec métriques géantes et 3 piliers de réassurance.
- Bloc tunnel droit : `lg:col-span-5` avec barre de progression fine et options cliquables.

---

## 6. Anti-Patterns Absolus (À Proscrire)

- ❌ **Interdiction des fonds jaunis / pierre chaude :** Jamais de `#FAF8F5`, `#F0ECE3`, `#F2EFE9`. Utiliser le blanc pur `#FFFFFF` ou l'ardoise claire `#F8FAFC`.
- ❌ **Interdiction des ombres 3D "discount" :** Jamais d'ombres dures colorées type Bobex (`shadow-[0_4px_0_0_#DEB12C]`, etc.).
- ❌ **Interdiction des halos néon IA :** Jamais de `rgba(255,184,0,0.4)` ni de dégradés multicolores criards.
- ❌ **Interdiction des emojis comme icônes de structure :** Utiliser exclusivement des icônes SVG vectorielles (`lucide-react`).
- ❌ **Interdiction des polices proportionnelles pour les chiffres :** Toujours `font-mono tabular-nums` pour tout chiffre financier ou énergétique.

---

## 7. Checklist de Pré-Livraison UI

- [ ] Unicité absolue du `<h1>` par page
- [ ] Titres de section en balises sémantiques `<h2>`
- [ ] Chiffres et montants en `font-mono tabular-nums`
- [ ] Contrastes de texte conformes WCAG AA (>= 4.5:1)
- [ ] Anneaux de focus clavier visibles sur tous les éléments interactifs (`ring-ring`)
- [ ] Responsive validé sans overflow horizontal sur 375px, 768px, 1024px et 1440px
- [ ] Micro-interactions au survol avec transitions douces (150-250ms)
- [ ] Préservation stricte de la logique métier (Honeypot, validation TVA belge, 180ms auto-advance)
