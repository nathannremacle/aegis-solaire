# Dossier d'Audit UI/UX, Design System & Conversion (CRO) — Aegis Solaire

> **Mode d'emploi :**  
> 1. Ouvrez ce fichier ou téléversez-le directement dans votre modèle d'IA web (ChatGPT Plus, Claude 3.5 Sonnet, Gemini Advanced, etc.).  
> 2. L'IA va analyser l'ensemble des écrans, styles, hiérarchies et tunnels de conversion.  
> 3. Copiez ensuite sa réponse directement dans votre conversation avec Antigravity pour une application chirurgicale des modifications dans le code.

---

# PARTIE 1 : LE PROMPT SYSTÈME MAÎTRE (À COPIER DANS L'IA WEB)

```markdown
Tu es un Lead Product Designer, Directeur Artistique Web et Spécialiste CRO (Conversion Rate Optimization) de renommée mondiale, expert en applications SaaS / Marketplaces à forte valeur ajoutée (high-ticket B2B & lead generation solaire).
Tu maîtrises parfaitement Next.js 16 (App Router), Tailwind CSS 4, Radix UI (Shadcn), Framer Motion et les principes d'ergonomie mobile/desktop moderne (Refactoring UI, Nielsen Norman Group, Apple Human Interface Guidelines).

Voici le dossier de conception complet de la plateforme "Aegis Solaire" (Wallonie, Belgique).

Ta mission : Réaliser un AUDIT SANS CONCESSION de l'UI, de l'UX, de l'identité visuelle et de l'efficacité de conversion (CRO) sur les parcours B2B (Entreprises & Industrie) et B2C (Particuliers & Résidentiel).

IMPORTANT - RÈGLES DE RESTITUTION STRICTES :
Je ne vais pas coder moi-même tes retours : je vais transmettre ta réponse directement à mon agent d'ingénierie (Antigravity) qui a un accès direct aux fichiers et au terminal.
Tu ne dois donc donner AUCUN conseil vague ou philosophique (ex: "rendez la page plus attrayante" ou "ajoutez de l'espace"). 
Chacune de tes recommandations DOIT être formulée sous la forme d'une DIRECTIVE TECHNIQUE PRÉCISE ET EXÉCUTABLE.

Pour chaque point d'amélioration identifié, utilise rigoureusement ce format :

### [ID-XX] [Priorité: P0-Critique / P1-Important / P2-Polissage] Titre explicite
- **Fichier concerné** : Chemin relatif exact (ex: `components/hero.tsx`, `components/b2c-simulator.tsx`, `app/globals.css`)
- **Diagnostic UX/UI** : Pourquoi la version actuelle crée une friction cognitive, un décrochage visuel ou une perte de conversion (manque de contraste, surcharge d'information, CTA mal placé, hiérarchie floue, mobile mal optimisé).
- **Solution recommandée** : Ce qu'il faut modifier concrètement (espacements, typographie, structure de composant, micro-interaction).
- **Code de remplacement / Directive d'implémentation** :
  Fournis les classes Tailwind exactes, le bloc JSX/TSX complet à remplacer ou le CSS à insérer. PAS DE PSEUDO-CODE.

---

### DOMAINES D'AUDIT OBLIGATOIRES :

1. **Hiérarchie Visuelle & Cohérence du Design System**
   - Palette : Bleu Nuit (`#001D3D`), Or Solaire (`#FFB800`), arrières-plans clairs (`oklch(0.985 0 0)`). La transition entre les sections sombres (Hero, Final CTA) et claires est-elle fluide ou brutale ?
   - Typographie (Inter + DM Sans) : lisibilité des sous-titres, tailles de police sur mobile, contrastes WCAG AA/AAA (texte jaune/or sur fond sombre et texte gris sur fond blanc).
   - Effet "SaaS / Fintech premium" vs "site d'artisan classique" : le site dégage-t-il le standing d'un tiers de confiance institutionnel ?

2. **Le Switcher de Segments B2B vs B2C (`components/header.tsx`)**
   - Comment l'utilisateur comprend-il instantanément s'il est sur la page Entreprises ou Particuliers ?
   - Ergonomie du toggle sur mobile et desktop : risque de confusion, navigation croisée, fluidité de la transition de vue (`::view-transition`).

3. **Tunnel de Conversion Simulateur B2B (`components/roi-simulator.tsx`)**
   - Friction du formulaire multi-étapes (Type de surface, Facture d'électricité, Données société, Numéro TVA belge, Coordonnées).
   - Lisibilité du retour financier (Production kWh, Économies annuelles, ROI estimé sans sur-promesse).
   - Clarté du moment où l'utilisateur passe d'une simulation anonyme à la saisie de ses coordonnées personnelles.

4. **Tunnel de Conversion Simulateur B2C (`components/b2c-simulator.tsx`)**
   - Comparaison avec le simulateur B2B : cohérence du parcours, simplicité des questions (toiture, orientation, consommation, batterie).
   - Ancrage des réassurances wallonnes (RESCERT, primes Région Wallonne, tarif prosumer).

5. **Expérience Mobile & Ergonomie tactile ("Thumb Zone")**
   - Boutons CTA : accessibilité du pouce, sticky footer sur mobile pour lancer la simulation, taille des cibles tactiles (min 48px).
   - Champs de formulaire : auto-focus, types de claviers adaptés (`tel`, `email`, `numeric`), gestion des erreurs inline en temps réel.
```

---

# PARTIE 2 : LE DOSSIER DE CONTEXTE TECHNIQUE & UI/UX

## 1. Identité de Marque & Tokens de Design (`app/globals.css`)

```css
:root {
  /* Aegis Solaire – Branding : #112f4b, #e6ad35, #7a8b98 */
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.22 0.04 254);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.04 254);
  
  /* Primary: #001D3D (Bleu Nuit Institutionnel) */
  --primary: #001D3D;
  --primary-foreground: #FFFFFF;

  /* Secondary / muted: #7a8b98 (gris-bleu) */
  --secondary: oklch(0.96 0.01 243);
  --secondary-foreground: oklch(0.28 0.04 254);
  --muted: oklch(0.96 0.01 243);
  --muted-foreground: oklch(0.54 0.05 243);

  /* Accent: #FFB800 (Or Solaire) */
  --accent: #FFB800;
  --accent-foreground: #000000;

  --border: oklch(0.88 0.02 243);
  --radius: 0.5rem;
}

@theme inline {
  --font-sans: var(--font-inter), 'Inter', system-ui, sans-serif;
  --font-heading: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
  --color-primary: var(--primary);
  --color-accent: var(--accent);
}
```

---

## 2. Navigation & Switcher de Segment (`components/header.tsx`)

Le header gère deux univers : B2B (Page d'accueil `/`) et B2C (`/particuliers`).
Un toggle visuel permet de basculer entre les deux modes avec une transition fluide.

```tsx
// Extrait de components/header.tsx
const B2B_NAV_ITEMS = [
  { label: "Preuve", href: "/#preuve" },
  { label: "Expertise", href: "/#expert" },
  { label: "Avantages", href: "/#benefits" },
  { label: "Webinaire", href: "/webinaire" },
]

const B2C_NAV_ITEMS = [
  { label: "Preuve", href: "/particuliers#preuve" },
  { label: "Expertise", href: "/particuliers#expertise" },
  { label: "Avantages", href: "/particuliers#arguments" },
  { label: "FAQ", href: "/faq-technique" },
]

// Toggle Segment Desktop
<div className="hidden lg:flex items-center rounded-full bg-neutral-100 p-1 border border-neutral-200">
  <Link
    href="/"
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all",
      !isB2C ? "bg-[#001D3D] text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
    )}
  >
    <Building2 className="h-3.5 w-3.5" />
    Entreprises & Industrie
  </Link>
  <Link
    href="/particuliers"
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full transition-all",
      isB2C ? "bg-[#001D3D] text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
    )}
  >
    <Home className="h-3.5 w-3.5" />
    Particuliers
  </Link>
</div>
```

---

## 3. Structure de la Page d'Accueil B2B (`app/page.tsx` & Composants Clés)

La page d'accueil cible les chefs d'entreprise, directeurs financiers et directeurs RSE possédant des toitures industrielles (> 500 m²) ou des parkings éligibles à des ombrières solaires.

### Enchaînement des sections :
1. **Hero (`components/hero.tsx`)** : Fond sombre `#001D3D`, image progressive en blur-up, badge de certification RESCERT, proposition de valeur ("Transformez vos infrastructures en centres de profit"), double CTA vers le simulateur B2B ou la page Particuliers.
2. **Preuve & Témoignages (`components/testimonials.tsx`)** : 3 études de cas chiffrées réelles (Liège 2 000 m², Brabant wallon 3 000 m², Hainaut 5 000 m²).
3. **Expertise Réglementaire (`components/expert.tsx`)** : Cadre wallon (PACE 2030, PEB 2026, Prêt Easy'Green, Déduction pour Investissement à 40%).
4. **Promo Webinaire (`components/webinaire-promo.tsx`)** : Invitation à la masterclass B2B.
5. **Avantages Économiques (`components/benefits.tsx`)** : Réduction des coûts, RSE, valorisation du patrimoine, PPA/Tiers-investissement.
6. **Simulateur ROI B2B (`components/roi-simulator.tsx`)** : Le cœur de conversion de la page.
7. **FAQ Teaser & Footer (`components/footer.tsx`)**.

```tsx
// Extrait de components/hero.tsx
<h1 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-xl">
  Transformez vos infrastructures en{" "}
  <span className="text-accent drop-shadow-[0_0_15px_rgba(255,184,0,0.3)]">centres de profit</span>.
</h1>
<p className="mx-auto mt-5 max-w-2xl text-pretty text-base font-light leading-relaxed text-neutral-200 sm:text-lg md:text-xl">
  Anticipez le <strong className="font-semibold text-white">Plan PACE 2030</strong> et rentabilisez votre surface. Estimez votre modèle financier (Prêt Easy'Green, Tiers-investissement) avec les <strong className="font-semibold text-white">Certificats Verts CWaPE</strong>.
</p>
<div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
  <Button size="lg" onClick={scrollToSimulator} className="h-14 gap-3 bg-accent text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.3)] hover:scale-[1.02] hover:bg-[#e6a600]">
    <Building2 className="h-5 w-5 shrink-0" />
    <span>Entreprises & Industrie</span>
    <ArrowRight className="h-4 w-4" />
  </Button>
  <Link href="/particuliers">
    <Button variant="outline" size="lg" className="h-14 w-full gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20">
      <Home className="h-5 w-5" />
      <span>Vous êtes un particulier ?</span>
    </Button>
  </Link>
</div>
```

---

## 4. Structure de la Page Particuliers B2C (`app/particuliers/page.tsx`)

La page `/particuliers` cible les propriétaires de maisons individuelles en Wallonie confrontés à la fin du compteur qui tourne à l'envers et à la hausse des tarifs réseau.

### Enchaînement des sections :
1. **Hero B2C (`components/particuliers-hero.tsx`)** : 4 métriques clés (8-10 ans ROI, 25 ans garantie, jusqu'à 70% autoconsommation avec batterie, 100% conforme RESCERT).
2. **Simulateur B2C (`components/b2c-simulator.tsx`)** : Placé très haut sur la page pour maximiser la conversion immédiate.
3. **Nos Atouts (`advantages`)** : Garanties industrielles, autonomie maximisée (batteries), bouclier tarifaire prosumer.
4. **Checklist Wallonne** : 6 critères de réassurance (Certification RESCERT, RGIE, Déclaration d'urbanisme, GRD Ores/Resa, Primes Région Wallonne).
5. **Témoignages Résidentiels (`components/b2c-testimonials.tsx`)**.
6. **CTA Final** : Bannière contrastée `#001D3D` avec bouton or solaire 3D.

---

## 5. Anatomie des Tunnels de Conversion (Simulateurs)

### 5.1 Simulateur B2B (`components/roi-simulator.tsx`)
- **Étape 1 (Surface & Technique) :**
  - Type : Toiture industrielle / Ombrière de parking / Terrain.
  - Surface : Sélecteur de tranche (500-1 000 m², 1 000-2 500 m², 2 500-5 000 m², > 5 000 m²).
  - Matériau toiture (Bac acier, Béton, Étanchéité bitumineuse, Tuile).
  - Province wallonne (Liège, Hainaut, Namur, Brabant wallon, Luxembourg).
- **Étape 2 (Consommation & Finances) :**
  - Facture d'électricité annuelle (€/an ou tranche de montant).
  - GRD (Ores, Resa, AIEG, REW, Fluvius).
  - Statut de propriété (Propriétaire occupant, Bailleur, Locataire avec bail commercial).
- **Étape 3 (Lead Capture - Formulaire Contact) :**
  - Prénom, Nom, Email professionnel, Numéro de téléphone belge/français (+32 / +33).
  - Société & Numéro de TVA belge (vérifié avec algorithme modulo 97 en temps réel).
  - Titre du poste (Dirigeant, DAF, Resp. RSE/Technique, Autre).
  - Checkbox légale RGPD obligatoire (Mise en relation avec un installateur certifié RESCERT).
- **Étape 4 (Restitution des Résultats) :**
  - Puissance estimée (kWc).
  - Production annuelle (kWh).
  - Économies nettes estimées (€/an).
  - Taux d'autoconsommation calculé et ROI prévisionnel.

### 5.2 Simulateur B2C (`components/b2c-simulator.tsx`)
- **Étape 1 (Habitation) :**
  - Statut (Propriétaire / En cours d'achat).
  - Type de toit (Incliné tuiles/ardoises, Plat/roofing).
  - Orientation (Sud, Est-Ouest, Nord).
  - Taille approximative de la toiture.
- **Étape 2 (Consommation & Besoins) :**
  - Facture annuelle d'électricité (€/an).
  - Taille du foyer (1-2 personnes, 3-4 personnes, 5+ personnes).
  - Intérêt pour une batterie domestique (Oui, Non, À étudier).
  - Intérêt pour une borne de recharge véhicule électrique.
- **Étape 3 (Coordonnées du Particulier) :**
  - Prénom, Nom, Email, Téléphone.
  - Code postal & Province.
  - Checkbox de consentement RGPD.
- **Étape 4 (Résultats Chiffrés) :**
  - Économies annuelles estimées.
  - Temps d'amortissement estimé (8-10 ans).
  - Récapitulatif envoyé par email.

---

## 6. Composants UI & Primitives Partagées (`components/ui/button.tsx`)

```tsx
// Variantes des boutons dans le projet (CVA)
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```
```
