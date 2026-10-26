---
trigger: always_on
description: "Règles strictes de design system Fintech Slate & Solar Trust et interdiction de classes CSS arbitraires pour Aegis Solaire"
---

# RÈGLES D'INGÉNIERIE UI STRICTES — AEGIS SOLAIRE (FINTECH SLATE & SOLAR TRUST)

Tu agis comme un intégrateur front-end senior soumis au fichier `DESIGN.md` à la racine du projet. Toute modification de composant React/Tailwind v4 doit respecter les lois suivantes sans exception.

## 1. INTERDICTIONS FORMELLES (BANNISSEMENT DE LA DETTE LEGACY ET DES TEINTES TERNES)
- **INTERDICTION D'UTILISER DES COULEURS HEXADÉCIMALES EN DUR :**
  - Les couleurs historiques discount (`#001D3D`, `#002A45`, `#FFB800`, `#F8C630`, `#DEB12C`, `#082d56`, `#002D5A`) ainsi que les anciennes teintes "pierre chaude / papier jauni" (`#FAF8F5`, `#F0ECE3`, `#F2EFE9`, `#E2DDD3`, `#0B2B22`, `#111815`) sont STRICTEMENT INTERDITES en dur dans le code.
  - Utilise **exclusivement** les tokens sémantiques de `app/globals.css` :
    - Surfaces : `bg-background`, `bg-card`, `bg-secondary`, `bg-muted`
    - Textes : `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-accent-foreground`
    - Actions & Accents : `bg-primary`, `bg-accent`, `bg-accent-solar`, `text-accent`, `text-accent-solar`
    - Bordures & Contours : `border-border`, `border-input`, `ring-ring`
- **INTERDICTION DES EFFETS "BOBEX 3D" ET "GLOW IA" :**
  - Ne jamais utiliser d'ombres dures colorées (ex: `shadow-[0_4px_0_0_#DEB12C]`, `active:translate-y-[2px]`).
  - Ne jamais utiliser de lueurs néon artificielles (ex: `shadow-[0_0_20px_rgba(255,184,0,0.4)]`), de dégradés de texte multicolores (`bg-clip-text`), ni de glassmorphism opaque sombre.
  - Les élévations autorisées sont les ombres modernes subtiles : `shadow-none`, `shadow-2xs`, `shadow-xs`, `shadow-sm` ou `shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)]`.
- **FICHIER CSS UNIQUE :** Ne jamais recréer ni importer `styles/globals.css`. Toute la configuration Tailwind v4 (`@theme inline` et `:root`) réside dans `app/globals.css`.

## 2. SÉMANTIQUE HTML, ACCESSIBILITÉ & SEO
- **UNICITÉ DU `<H1>` :** Chaque route (`/` et `/devis-panneaux-solaires`) doit posséder exactement UN SEUL élément `<h1>` dans le DOM. Il est interdit de dupliquer un `<h1>` avec `lg:hidden` et `hidden lg:block` (utiliser un seul `<h1>` responsive et adapter la disposition via CSS Grid/Flex).
- **HIÉRARCHIE DES TITRES :** Les titres principaux de chaque section (`ROISimulator`, `WebinairePromo`, `Testimonials`, `Expert`, `Benefits`, `FaqHomeTeaser`) doivent obligatoirement être des balises `<h2>` (jamais de `<h4>` ou `<p>` stylisé en titre).

## 3. TYPOGRAPHIE & PRÉCISION DES DONNÉES
- **CHASSE FIXE OBLIGATOIRE SUR LES CHIFFRES :** Tout montant financier (`€`, `€ HT`), puissance (`kWc`), production & consommation (`kWh`), délai (`48 h`, `45 s`), pourcentage (`%`), compteur d'étape (`01/05`), code postal ou numéro de TVA belge doit porter les classes `font-mono tabular-nums`.
- **RYTHME VERTICAL STANDARDISÉ :**
  - Sections standards : `py-16 md:py-24 border-b border-border`
  - Conteneur de section : `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
  - Espacements internes : utiliser exclusivement `flex` ou `grid` avec `gap-*` (ne jamais utiliser `space-x-*` ou `space-y-*`).

## 4. PRÉSERVATION DE LA LOGIQUE MÉTIER
- Lors de toute modification sur `devis-landing-client.tsx`, `roi-simulator.tsx` et les formulaires de devis, ne jamais supprimer ni altérer :
  - Les champs honeypot anti-spam (`fax_number`).
  - La validation algorithmique du numéro de TVA belge et les validateurs `getEmailError` / `getPhoneError`.
  - L'auto-advance (180ms) sur les étapes à choix unique.
  - Les appels à `trackLeadConversion` et `MediaPartnerRefTracker`.

## 5. ANONYMAT STRICT & INTERDICTION DE MENTIONNER NATHAN REMACLE OU FABRICE REMACLE
- **INTERDICTION FORMELLE :** Il est strictement interdit de mentionner **Nathan Remacle** ou **Fabrice Remacle** comme fondateurs, gérants, dirigeants, interlocuteurs, référents techniques, gestionnaires de compte ou toute autre fonction sur le site web, les simulateurs, les e-mails transactionnels ou promotionnels, les landing pages, les formulaires, les notifications ou les interfaces du projet.
- **SEULE EXCEPTION STRICTEMENT LÉGALE :** La seule et unique exception autorisée concerne les mentions légales obligatoires requises par le droit belge pour l'entreprise individuelle exploitante :
  - Dans `/mentions-legales`, `/politique-confidentialite`, `/cgv` et le footer légal : `"Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique"`.
- **DÉNOMINATIONS INSTITUTIONNELLES OBLIGATOIRES :**
  - Partout ailleurs (signatures d'e-mails, support, accompagnement, fiches de contact, présentations d'équipe), utiliser exclusivement des dénominations collectives et institutionnelles :
    - Signatures & Équipe : *"L'équipe Aegis Solaire"*, *"Le Support Partenaires Aegis Solaire"*, *"La Cellule Technique & Ingénierie"*.
    - Contact officiel unique : `contact@aegissolaire.com` (aucun numéro de téléphone personnel).