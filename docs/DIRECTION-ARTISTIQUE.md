# Direction Artistique & UX — Aegis Solaire

> Référence interne pour tout développeur, designer ou IA travaillant sur le projet.
> Dernière mise à jour : avril 2026.

---

## 1. Positionnement & Ton

Aegis Solaire se positionne comme un **acteur institutionnel du solaire B2B et B2C en Wallonie**. Le site n'a rien d'un comparateur low-cost ni d'un portail « startup gamifiée ». Il s'adresse à des **directeurs financiers, responsables RSE, propriétaires de patrimoine immobilier** (B2B) et à des **particuliers propriétaires wallons** (B2C).

**Mots-clés de marque** : Sérieux · Premium · Confiance · Technique · Institutionnel · Wallon.

Le ton éditorial est **factuel et expert**, jamais familier. Les arguments reposent sur des chiffres (ROI, kWc, Certificats Verts, plan PACE 2030), pas sur de l'émotion ou du marketing agressif. L'objectif est que le visiteur ait l'impression de consulter un **terminal financier de l'énergie**, pas un site e-commerce.

---

## 2. Palette de couleurs

### 2.1 Couleurs primaires

| Rôle | Valeur | Variable CSS | Usage |
|------|--------|-------------|-------|
| **Bleu Nuit** | `#001D3D` | `--primary` | Texte fort, boutons CTA principaux, header, fond des sections hero |
| **Or Solaire** | `#FFB800` | `--accent` | Accents visuels, icônes, badges, chiffres clés, CTA secondaires (hero) |
| **Blanc pur** | `#FFFFFF` | `--card` | Fond des cartes, formulaires, header, footer |

### 2.2 Couleurs secondaires et neutres

| Rôle | Valeur approx. | Usage |
|------|----------------|-------|
| **Gris-bleu logo** | `#7a8b98` | Sous-titres, texte `muted-foreground`, bordures secondaires |
| **Fond page** | `oklch(0.985 0 0)` (~`#fafafa`) | `--background`, la base de toutes les pages en mode clair |
| **Fond secondaire** | `oklch(0.96 0.01 243)` (~`#f1f3f5`) | `--secondary`, sections alternées (Expert, ROI Simulator) |
| **Bordures** | `oklch(0.88 0.02 243)` (~`#dde1e6`) | `--border`, séparateurs, contours de cartes |
| **Slate-50 / Slate-100** | `#f8fafc` / `#f1f5f9` | Fonds de zones secondaires dans le portail partenaire |
| **Slate-400** | `#94a3b8` | Labels, légendes, métadonnées dans les tables |
| **Slate-900** | `#0f172a` | Texte courant sombre dans les portails authentifiés |

### 2.3 Couleurs fonctionnelles

| Rôle | Couleur | Contexte |
|------|---------|----------|
| Badge **B2B** | `bg-blue-50 text-blue-700` | Marketplace partenaire, admin |
| Badge **B2C** | `bg-emerald-50 text-emerald-700` | Marketplace partenaire, admin |
| **Succès / crédit positif** | `text-emerald-600`, `bg-emerald-50` | Transactions, confirmations |
| **Erreur / débit** | `text-red-600`, `bg-red-50` | Alertes, erreurs, débits |
| **Attention** | `text-amber-600`, `bg-accent/10` | Warnings PEB, urgence B2C |

### 2.4 Règle fondamentale

Le site est **nativement en Light Mode**. Le fond global est blanc ou quasi-blanc (`#fafafa`). Les seules sections à fond sombre (`#001D3D`) sont les **hero sections** (haut de page d'accueil, `/particuliers`, `/partenaires`, `/media-partners`) et les **sections « Benefits »** et **« Webinaire Promo »** qui utilisent un dégradé radial `#001D3D → #000A19`.

**Tout portail authentifié** (admin, marketplace partenaires, media partners) doit être en **fond blanc / `slate-50`**, prolongement direct de la landing page.

---

## 3. Typographie

### 3.1 Familles

| Variable | Police | Rôle |
|----------|--------|------|
| `--font-sans` | **Inter** | Corps de texte, UI, navigation |
| `--font-heading` | **DM Sans** | Disponible pour les titres (actuellement les titres utilisent Inter bold/extrabold) |
| `--font-mono` | **Geist Mono** | Chiffres financiers (kWc, €, crédits, ROI), données tabulaires |

### 3.2 Hiérarchie

| Élément | Taille | Poids | Couleur |
|---------|--------|-------|---------|
| H1 Hero | `text-3xl` → `text-6xl` (responsive) | `font-bold` / `font-extrabold` | `text-white` (sur hero dark) |
| H2 Section | `text-2xl` → `text-5xl` | `font-extrabold tracking-tight` | `text-foreground` (`#001D3D`) |
| H3 Sous-section | `text-xl` → `text-2xl` | `font-bold` | `text-foreground` |
| Corps | `text-sm` → `text-base` | `font-normal` / `font-medium` | `text-muted-foreground` |
| KPI / Chiffre-clé | `text-2xl` → `text-4xl` | `font-extrabold tabular-nums` + `font-mono` | `text-primary` ou `text-accent` |
| Label / Légende | `text-[10px]` → `text-xs` | `font-bold uppercase tracking-wider` | `text-slate-400` ou `text-muted-foreground` |
| Badge catégorie | `text-[10px]` | `font-bold uppercase tracking-wider` | Couleur du segment (bleu/vert) |

### 3.3 Règles

- Les **montants financiers** (€, kWc, crédits) utilisent toujours `font-mono tabular-nums` pour un alignement parfait en colonnes.
- L'Or Solaire (`text-accent`) est réservé aux **chiffres d'impact** (économies, ROI) et aux **icônes/badges d'action**. Ne jamais l'utiliser pour du texte courant.
- Les titres et sous-titres courants sont en `text-primary` (`#001D3D`) ou `text-foreground`, jamais en accent.

---

## 4. Composants visuels récurrents

### 4.1 Header (navigation principale)

```
sticky top-0 z-[100]
border-b border-neutral-200
bg-white/95 backdrop-blur-xl shadow-sm
```

- Logo Aegis Solaire en couleurs originales (Bleu Nuit + Or), aligné à gauche.
- Segment toggle (pilule arrondie `rounded-full`, fond `bg-neutral-100`, indicateur actif `bg-[#001D3D] text-white`).
- Navigation desktop : liens `text-neutral-600 hover:text-[#001D3D]`.
- CTA header : `bg-[#001D3D] text-white font-bold shadow-md`.
- Hauteur : `min-h-16` mobile, `min-h-20` desktop.

### 4.2 Hero Section (pages publiques)

Structure commune à toutes les pages publiques :

```
bg-[#001D3D] (fond sombre)
+ image de fond (bg-cover) avec mask linéaire (fade vers le bas)
+ overlay radial-gradient (assombrit les bords)
```

- Texte blanc, accents en Or Solaire.
- Badge de contexte : `rounded-full border-accent/30 bg-white/5 backdrop-blur-md`.
- CTAs : CTA primaire = `bg-accent text-[#001D3D]` ; CTA secondaire = `border-white/30 bg-white/10 text-white backdrop-blur-lg`.
- Trust indicators : cartes glass `border-white/10 bg-white/5 backdrop-blur-md` avec icônes `text-accent`.

### 4.3 Cartes (sections claires)

```
rounded-2xl (ou rounded-3xl)
border border-border (ou border-primary/10)
bg-card (blanc) ou bg-card/60 (translucide)
shadow-sm (repos) → shadow-md / shadow-xl (hover)
backdrop-blur-xl (si fond translucide)
```

Hover systématique : léger `translateY(-4px)` ou `-translate-y-1`, changement de bordure vers `border-accent/30`.

### 4.4 Cartes (sections sombres — Benefits, Webinaire)

```
rounded-3xl
border border-white/10
bg-white/5 backdrop-blur-xl
hover:border-accent/40 hover:bg-white/10
```

Icônes en `text-accent` avec `drop-shadow`.

### 4.5 Badges de segment

| Segment | Style |
|---------|-------|
| B2B | `bg-blue-50 text-blue-700 rounded-md px-2 text-[10px] font-bold uppercase` |
| B2C | `bg-emerald-50 text-emerald-700 rounded-md px-2 text-[10px] font-bold uppercase` |

### 4.6 Boutons

| Type | Style |
|------|-------|
| **CTA Principal** | `bg-[#001D3D] text-white font-bold shadow-md hover:bg-[#00152e] hover:shadow-lg` |
| **CTA Accent (hero)** | `bg-accent text-[#001D3D] font-bold shadow-[0_0_25px_rgba(255,184,0,0.3)] hover:bg-[#e6a600]` |
| **Secondaire** | `border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50` |
| **Ghost / Chip actif** | `bg-[#001D3D] text-white rounded-full` |
| **Ghost / Chip inactif** | `text-slate-500 hover:bg-slate-100 rounded-full` |
| **Destructif** | Conforme au token `--destructive` |

Rayon par défaut : `rounded-lg` (boutons) ou `rounded-xl` (boutons premium larges).

### 4.7 Formulaires

- Inputs : `h-11` ou `h-12`, bordure `border-border`, `rounded-xl`.
- Labels : `text-sm font-medium text-foreground` (clair) ou `text-slate-700`.
- RadioGroup / Checkbox : bordure `border-2`, état checked = `border-accent bg-accent/5`.
- Messages d'erreur : `rounded-lg border-red-200 bg-red-50 text-red-700`.

### 4.8 Tables / Listes de données (portail partenaire)

Structure de type « liste élégante » dans un conteneur :

```
rounded-2xl border border-slate-200 bg-white shadow-sm
```

- En-têtes de colonnes : `bg-slate-50/50`, texte `text-[10px] font-bold uppercase tracking-wider text-slate-400`.
- Lignes : `border-b border-slate-100`, hover `bg-slate-50/60`.
- Pas de bordures verticales entre colonnes.
- Données numériques alignées avec `font-mono tabular-nums`.

### 4.9 Panneau expandable (Accordion / Reveal)

Au clic sur une ligne, animation `height: 0 → auto` (Framer Motion `AnimatePresence`).

```
bg-slate-50/50 (fond subtil)
border-b border-slate-100
```

Structure interne en `grid sm:grid-cols-3` pour Contact / Localisation / Technique.

Labels de section : `text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400`.

---

## 5. Animations (Framer Motion)

### 5.1 Principes

- **Subtilité > Spectacle**. Les animations servent la lisibilité, pas la décoration.
- Les conteneurs utilisent `staggerChildren` (0.04 à 0.15s) pour un dévoilement séquentiel.
- Les éléments individuels : `spring` (`stiffness: 200–400, damping: 20–30`) ou `easeOut` (0.3–0.6s).
- `viewport: { once: true }` systématique (l'animation ne joue qu'une fois au scroll).

### 5.2 Patterns récurrents

| Pattern | Paramètres |
|---------|-----------|
| **Fade-in + slide-up** (élément) | `opacity: 0→1, y: 20→0`, spring stiff 300 damping 24 |
| **Fade-in + slide-up** (ligne de table) | `opacity: 0→1, y: 8→0`, easeOut 0.3s |
| **Counter animé** | Composant `<AnimatedCounter>`, interpolation numérique fluide |
| **Expand/Collapse** | `height: 0 → auto`, ease `[0.25, 0.46, 0.45, 0.94]`, 0.3s |
| **Credit badge bounce** | `initial: { y: -6, opacity: 0 }`, spring stiff 300 |
| **Progress bar fill** | `width: 0 → X%`, easeOut 0.6s |
| **Shimmer on hover** | Pseudo-élément skewed `via-white/10`, `transition-all duration-700` |

### 5.3 Marquee (défilement infini)

Deux bandes : `certifications-marquee` (120s) et `avis-marquee` (80–90s), `linear infinite`. Pause au hover. Ralentissement ×2 si `prefers-reduced-motion`.

---

## 6. Iconographie

- Bibliothèque : **Lucide React** exclusivement.
- Taille standard : `h-4 w-4` (inline), `h-5 w-5` (boutons), `h-6 w-6` à `h-8 w-8` (features).
- Couleur par défaut : `text-accent` (Or Solaire) pour les icônes de feature ; `text-slate-400` pour les icônes utilitaires (labels, metadata).
- Sur fond sombre (hero) : `text-accent drop-shadow-[0_0_8px_rgba(255,184,0,0.8)]`.

---

## 7. Imagerie

- **Hero backgrounds** : photographies de panneaux solaires / installations wallonnes, haute résolution, avec un mask linéaire (`opacity 1 → 0.1 de haut en bas`) et un overlay radial assombrissant.
- **Testimonials** : photos de profil circulaires (`rounded-full`), 36px, `border border-primary/15`.
- **Logo** : `/logo.png` (horizontal, Bleu Nuit + Or Solaire) — **jamais inversé** sur fond clair. Sur les hero dark, il est utilisé inversé (`brightness-0 invert`) mais **uniquement** dans ces contextes.

---

## 8. Layout & Grille

- Container max : `max-w-7xl` (1280px) pour le site public, `max-w-[1440px]` pour le portail partenaire.
- Padding horizontal : `px-4 sm:px-6 lg:px-8`, avec `env(safe-area-inset-*)` pour les écrans à encoche.
- Grilles : `grid-cols-1 → sm:grid-cols-2 → md:grid-cols-3 → lg:grid-cols-4` selon le contenu.
- Espacement vertical entre sections : `py-16 sm:py-24 lg:py-32` (sections publiques), `py-10` (portails).

---

## 9. Responsive

| Breakpoint | Adaptations |
|-----------|-------------|
| Mobile (`< 640px`) | Navigation hamburger, colonnes empilées, tailles de texte réduites, padding réduit |
| Tablet (`640–1024px`) | Grilles 2 colonnes, segment toggle visible, padding intermédiaire |
| Desktop (`> 1024px`) | Grilles 3–4 colonnes, navigation complète, effets hover avancés |

Règle : **mobile-first**. Le design de base est toujours pour mobile, les adaptations sont ajoutées via `sm:`, `md:`, `lg:`.

---

## 10. Accessibilité

- Contraste WCAG AA minimum pour tout texte.
- `role="main"`, `role="contentinfo"`, `aria-label` sur les régions.
- Skip-link (`Aller au contenu principal`) en haut de page.
- `prefers-reduced-motion` : animations marquee ralenties ×2.
- Formulaires : `<Label>` associés, `aria-expanded` sur les menus, `role="alert"` sur les erreurs.
- Liens `tel:` et `mailto:` cliquables dans les panneaux de reveal.

---

## 11. Récapitulatif — Règles d'or

1. **Fond clair partout**, sauf hero et sections dark d'accent. Jamais de fond `#001D3D` pour un portail entier.
2. **Or Solaire = action et impact**. Réservé aux icônes, chiffres-clés et CTAs accent. Pas de texte courant en or.
3. **Bleu Nuit = autorité**. CTAs principaux, texte fort, header.
4. **`font-mono tabular-nums`** pour tout chiffre financier.
5. **Ombres légères** : `shadow-sm` au repos, `shadow-md`/`shadow-xl` au hover. Jamais de `drop-shadow` massif sur des éléments clairs.
6. **Bordures fines** : `border-slate-200` (clair) ou `border-white/10` (dark). Pas de bordures épaisses.
7. **Animations spring**, jamais de rebond excessif. Tout doit respirer le calme institutionnel.
8. **Consistance cross-portail** : admin, partenaires, media-partners partagent les mêmes tokens, le même header blanc, le même système de cartes.
