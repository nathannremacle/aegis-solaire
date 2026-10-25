---
trigger: always_on
description: "Règles strictes de design system et interdiction de classes CSS arbitraires pour Aegis Solaire"
---

# RÈGLES D'INGÉNIERIE UI STRICTES — AEGIS SOLAIRE

Tu agis comme un intégrateur front-end senior soumis au fichier `DESIGN.md` à la racine du projet. Toute modification de composant React/Tailwind v4 doit respecter les lois suivantes sans exception.

## 1. INTERDICTIONS FORMELLES (BANNISSEMENT DE LA DETTE LEGACY)
- **INTERDICTION D'UTILISER DES COULEURS HEXADÉCIMALES EN DUR :** Les couleurs historiques `#001D3D`, `#002A45`, `#FFB800`, `#F8C630`, `#DEB12C`, `#F6F9FC`, `#FAFCFE`, `#001019`, `#082d56`, `#002D5A` ainsi que les classes `bg-emerald-*`, `bg-blue-*`, `text-slate-*`, `text-yellow-*` sont STRICTEMENT INTERDITES. Utilise exclusivement les tokens sémantiques de `app/globals.css` (`bg-background`, `bg-card`, `bg-secondary`, `bg-primary`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`).
- **INTERDICTION DES EFFETS "BOBEX 3D" ET "GLOW IA" :**
  - Ne jamais utiliser d'ombres dures colorées (ex: `shadow-[0_4px_0_0_#DEB12C]`, `active:translate-y-[2px]`).
  - Ne jamais utiliser de lueurs néon (ex: `shadow-[0_0_20px_rgba(255,184,0,0.4)]`), de dégradés de texte (`bg-clip-text`), ni de glassmorphism sombre (`backdrop-blur-md border-white/10`) sur les composants de contenu.
  - Les seules élévations autorisées sont `shadow-none`, `shadow-2xs`, `shadow-xs` ou `shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)]` pour les cartes de formulaires principales.
- **FICHIER CSS UNIQUE :** Ne jamais recréer ni importer `styles/globals.css`. Toute la configuration Tailwind v4 (`@theme inline` et `:root`) réside dans `app/globals.css`.

## 2. SÉMANTIQUE HTML, ACCESSIBILITÉ & SEO
- **UNICITÉ DU `<H1>` :** Chaque route (`/` et `/devis-panneaux-solaires`) doit posséder exactement UN SEUL élément `<h1>` dans le DOM. Il est interdit de dupliquer un `<h1>` avec `lg:hidden` et `hidden lg:block` (utiliser un seul `<h1>` responsive et déplacer l'ordre visuel via CSS Grid `order-*`).
- **HIÉRARCHIE DES TITRES :** Les titres principaux de chaque section (`ROISimulator`, `WebinairePromo`, `Testimonials`, `Expert`, `Benefits`, `FaqHomeTeaser`) doivent obligatoirement être des balises `<h2>` (jamais de `<h4>` ou `<p>` stylisé en titre).

## 3. TYPOGRAPHIE & PRÉCISION DES DONNÉES
- **CHASSE FIXE OBLIGATOIRE SUR LES CHIFFRES :** Tout montant financier (`€`), puissance (`kWc`, `kWh`), délai (`48 h`, `45 s`), pourcentage (`%`), compteur d'étape (`01/06`), code postal ou numéro de TVA doit porter les classes `font-mono tabular-nums`.
- **RYTHME VERTICAL STANDARDISÉ :**
  - Sections standards : `py-16 md:py-24 border-b border-border`
  - Conteneur de section : `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
  - Espacements internes : utiliser exclusivement `flex` ou `grid` avec `gap-*` (ne jamais utiliser `space-x-*` ou `space-y-*`).

## 4. PRÉSERVATION DE LA LOGIQUE MÉTIER
- Lors du refactoring visuel de `devis-landing-client.tsx` et `roi-simulator.tsx`, ne jamais supprimer ni altérer :
  - Les champs honeypot anti-spam (`fax_number`).
  - La validation algorithmique du numéro de TVA belge et les validateurs `getEmailError` / `getPhoneError`.
  - L'auto-advance (180ms) sur les étapes à choix unique.
  - Les appels à `trackLeadConversion` et `MediaPartnerRefTracker`.