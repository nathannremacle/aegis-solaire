# Documentation Aegis Solaire

**Ce fichier décrit le fonctionnement du site et l’architecture technique. Il est mis à jour lorsque des modifications ou ajouts sont effectués sur le projet.**

---

## 1. Vue d’ensemble

**Aegis Solaire** est une plateforme de **génération de leads B2B** pour le photovoltaïque (marché C&I : commerce et industrie). Elle cible les décideurs (DAF, directeurs RSE) souhaitant équiper toitures (> 500 m²) ou parkings (> 1 500 m²) pour la **conformité Loi LOM** et **Décret Tertiaire**.

- **Positionnement :** « Financement, Rentabilité & Ombrières Pro »
- **Cœur métier :** simulateur de rentabilité (ROI) + capture de coordonnées B2B ; les leads sont enregistrés puis peuvent être revendus ou traités par des installateurs partenaires.

---

## 2. Stack technique

| Élément | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router), React 19 |
| Langage | TypeScript |
| Styles | Tailwind CSS 4, composants Shadcn/UI (Radix) |
| Formulaires | Champs contrôlés (pas encore React Hook Form / Zod côté simulateur) |
| Base de données | **Supabase** (PostgreSQL hébergé) |
| Analytics | Vercel Analytics |
| Hébergement front / API | Prévu pour **Vercel** |
| **Responsive** | Mobile-first (sm: 640px, md: 768px, lg: 1024px), safe-area pour encoches, zone de touch ≥ 44px, pas de débordement horizontal |
| **Branding** | Logo horizontal `/public/logo.png` (header, footer). Logo carré `/public/logo-square.png` (favicon, icône Apple, JSON-LD). Couleurs : #112f4b (primary), #e6ad35 (accent), #7a8b98 (muted/secondary). Open Graph utilise logo.png ; Pour un partage optimal, ajouter `og-image.png` 1200×630 si le logo n’est pas à ce format. |

---

## 3. Architecture des pages et flux

### 3.1 Arborescence des routes

```
/                         → Page d’accueil (landing + simulateur)
/ressources               → Ressources (études de cas, subventions, webinaires Loi LOM « Bientôt disponible »)
/mentions-legales          → Mentions légales
/politique-confidentialite → RGPD, droits, désinscription (#desinscription)
/cgv                      → Conditions générales de vente
/api/leads                 → POST : enregistrement d’un lead (appelé par le formulaire)
```

- **Sitemap / SEO :** `app/sitemap.ts` et `app/robots.ts` génèrent sitemap et robots.txt.  
- **JSON-LD :** composant `JsonLd` (Organization + WebSite) injecté dans `app/layout.tsx`.

### 3.2 Structure de la page d’accueil (MEP)

Ordre des sections :

1. **Hero** – Titre accroche (« centres de profit », Loi LOM), CTA unique : « Lancer ma simulation de rentabilité »
2. **Preuve** (`#preuve`) – Études de cas chiffrées + témoignages clients
3. **Expert** (`#expert`) – Texte PPA / stockage / Décret Tertiaire + vidéo Fondateur (configurable via `NEXT_PUBLIC_FOUNDER_VIDEO_URL`, YouTube/Vimeo)
4. **Avantages** (`#benefits`) – Pourquoi passer au solaire B2B
5. **Simulateur** (`#simulator`) – Formulaire multi-étapes (voir ci-dessous)

Header et footer incluent la baseline, les liens Preuve / Expert / Avantages / Simulateur, une colonne **Ressources** pointant vers `/ressources` (études de cas, subventions & financement, webinaires Loi LOM avec badge « Bientôt disponible »), les pages légales et le lien **Désinscription / Opposition** vers `politique-confidentialite#desinscription`.

### 3.3 Alignement avec le fonctionnement imaginé (entonnoir en 5 étapes)

Le site implémente le funnel décrit dans *Fonctionnement imaginé de Aegis Solaire* :

| Étape | Implémentation sur le site |
|-------|----------------------------|
| **1. Acquisition** | Landing optimisée SEO (Loi LOM, Décret Tertiaire), études de cas (Preuve), CTA unique. Prêt pour Google Ads / LinkedIn Ads ; page **Ressources** (`/ressources`) : études de cas, subventions & financement, webinaires Loi LOM (bientôt). |
| **2. Qualification (simulateur)** | Saisie nature du site (parking > 1 500 m², toiture > 500 m²) + facture ; calcul ROI (8–12 ans) ; **gated content** : message explicite « audit de faisabilité complet et résultats détaillés » contre coordonnées pro. |
| **3. Traitement & RGPD** | Opt-in non pré-coché, mentions Art. 13/14, désinscription. **Filtrage automatique** : surface min selon type, facture min 5 000 €, refus des emails grand public (gmail, etc.) pour ne garder que des contacts B2B. |
| **4. Distribution** | Enregistrement en base + **webhook optionnel** (`LEAD_WEBHOOK_URL`) : envoi en temps réel du lead vers CRM (HubSpot, Pipedrive, CBM Manager) ou installateur partenaire. |
| **5. Nurturing** | Mentionné en politique de confidentialité (témoignages, échéances Loi LOM, webinaires) ; à opérer côté CRM / emailing. |

---

## 4. Fonctionnement du simulateur (lead magnet)

### 4.1 Parcours utilisateur

- **Étape 1 – Qualification du foncier**  
  - Type : Parking (> 1 500 m²), Toiture (> 500 m²), Friche  
  - Surface (m²) : minimum 1 500 pour parking, 500 pour toiture/friche.

- **Étape 2 – Facture électrique**  
  - Facture annuelle en € HT (minimum 5 000 €).

- **Effet « gated »**  
  - Après validation de l’étape 2 : écran « Calcul de votre étude financière en cours… » (animation ~2,5 s), puis passage à l’étape 3.

- **Étape 3 – Capture B2B**  
  - Encadré de promesse : « Pour recevoir votre **audit de faisabilité complet** et les **résultats détaillés** de la simulation, indiquez vos coordonnées professionnelles. Un expert vous recontactera sous 48 h. »  
  - Champs : Nom, Prénom, Email **professionnel**, Téléphone direct, Fonction (DAF, Dirigeant, RSE, etc.), Entreprise (optionnel).  
  - **Checkbox** : consentement explicite (transmission à des installateurs partenaires + offres Aegis Solaire).  
  - Bloc **RGPD (Art. 13 & 14)** : finalité, base légale, durée 3 ans, liens vers politique de confidentialité et désinscription.

À la soumission :

1. Le front envoie une requête **POST** vers `/api/leads` avec tous les champs du formulaire + résultats ROI calculés côté client.
2. L’API valide les données, enregistre le lead dans Supabase, puis renvoie succès ou erreur.
3. L’utilisateur voit un écran de remerciement avec les indicateurs (ROI, autoconsommation, économies, puissance).

### 4.2 Calcul du ROI (côté client)

- Logique dans `components/roi-simulator.tsx` (fonction `calculateROI`) : puissance installée (kWc), production annuelle, taux d’autoconsommation, économies, coût d’installation, ROI en années. Les résultats sont envoyés avec le formulaire à l’API.

---

## 5. API et base de données

### 5.1 Route `POST /api/leads`

- **Fichier :** `app/api/leads/route.ts`
- **Rôle :** recevoir le payload du formulaire, valider, filtrer les leads non qualifiés, insérer dans **`leads`** Supabase, puis (optionnel) envoyer le lead en temps réel vers un webhook (CRM / installateur).
- **Validation et filtrage B2B :**
  - Champs obligatoires : nom, prénom (≥ 2 car.), email, téléphone (format FR), fonction, type de surface, surface, facture annuelle.
  - **Surface minimale selon type :** parking ≥ 1 500 m², toiture / friche ≥ 500 m².
  - Facture annuelle ≥ 5 000 €.
  - **Filtrage « particuliers » :** les adresses email en domaine grand public (gmail, hotmail, outlook, yahoo, orange, free, sfr, laposte, icloud, etc.) sont refusées avec le message : « Merci de renseigner une adresse email professionnelle pour recevoir votre audit B2B. »
- **RGPD :** enregistrement de `marketing_consent`, `consent_date`, `data_retention_until` (3 ans).
- **Webhook (distribution temps réel) :** si la variable d’environnement `LEAD_WEBHOOK_URL` est définie, après chaque insertion réussie l’API envoie une requête **POST** (JSON) vers cette URL avec les champs du lead (id, first_name, last_name, email, phone, job_title, company, surface_type, surface_area, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, created_at). Timeout 5 s ; les erreurs webhook sont loguées sans bloquer la réponse au client. Permet d’alimenter un CRM (HubSpot, Pipedrive, CBM Manager) ou de notifier un installateur partenaire.

**Important – Supabase et RLS :**  
La table `leads` est protégée par Row Level Security (RLS). Le script SQL prévoit une politique pour le **service role**. En production, l’API doit utiliser la clé **service role** (et non la clé anon) pour insérer dans `leads`. À prévoir : client Supabase côté serveur dédié à l’API avec `SUPABASE_SERVICE_ROLE_KEY` (variable non exposée au client).

### 5.2 Schéma de la table `leads`

- **Contact :** `first_name`, `last_name`, `email`, `phone`, `job_title`, `company` (optionnel)
- **Site :** `surface_type`, `surface_area`, `annual_electricity_bill`
- **ROI (calculé) :** `estimated_roi_years`, `autoconsumption_rate`, `estimated_savings`
- **RGPD :** `marketing_consent`, `consent_date`, `data_retention_until`
- **Métadonnées :** `created_at`, `updated_at`, `source` (ex. `simulator`), `status` (new, contacted, qualified, converted, lost)
- **CRM :** `crm_synced`, `crm_id` (pour webhook / intégration future)

Script d’initialisation : `scripts/001_create_leads_table.sql` (à exécuter dans le projet Supabase).

### 5.3 Panel admin

- **Accès :** `/admin` (redirige vers `/admin/dashboard`). Connexion obligatoire sur `/admin/login` (Supabase Auth : email + mot de passe). Seuls les emails listés dans `ADMIN_EMAILS` ont accès.
- **Fonctions :** tableau de bord (nombre de leads, ce mois, aujourd’hui, derniers leads), liste des leads (filtre par statut, filtre par installateur assigné, recherche par email, pagination, export CSV), détail lead avec assignation à un installateur (Phase 2), gestion des installateurs partenaires (création, modification, suppression).
- **Sécurité :** toutes les routes `/admin/*` (sauf `/admin/login`) et `/api/admin/*` vérifient la session Supabase et que l’email appartient à `ADMIN_EMAILS`. Les données sont lues/écrites via le client **service role** (côté serveur uniquement).
- **Table `installateurs` :** script `scripts/002_create_installateurs_table.sql` (à exécuter dans Supabase après la table `leads`). Colonnes : id, name, email, phone, region, actif, notes, created_at, updated_at.
- **Phase 2 (assignation lead → installateur) :** colonne `installateur_id` sur `leads` (FK vers `installateurs`). Script `scripts/006_add_lead_installateur_id.sql`. PATCH `/api/admin/leads/[id]` accepte `installateur_id`. Export CSV : GET `/api/admin/leads/export?status=…&installateur=…&search=…` (max 5 000 lignes).

Voir **PLAN-ADMIN.md** pour le détail du plan et des phases.

---

## 6. Variables d’environnement

À définir (ex. dans Vercel ou `.env.local`) :

| Variable | Usage |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme (lecture publique si besoin) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role pour l’API (insertion `leads`) – **ne pas exposer au client** |
| `NEXT_PUBLIC_SITE_URL` | URL canonique du site (ex. `https://www.aegis-solaire.fr`) pour sitemap, robots, JSON-LD, métadonnées |
| `LEAD_WEBHOOK_URL` | (Optionnel) URL de webhook pour envoi temps réel du lead vers CRM ou installateur (POST JSON). Ne pas exposer au client. |
| `NEXT_PUBLIC_FOUNDER_VIDEO_URL` | (Optionnel) URL YouTube ou Vimeo de la vidéo Fondateur (section Expert). Si défini, la vidéo est affichée en embed ; sinon placeholder « Vidéo à venir ». |
| `ADMIN_EMAILS` | Liste d’emails autorisés à accéder au panel admin (séparés par des virgules, sans espaces). Ex. : `admin@aegis-solaire.fr`. **Ne pas exposer au client.** |

Sans `NEXT_PUBLIC_SITE_URL`, la valeur par défaut utilisée dans le code est `https://www.aegis-solaire.fr`.

---

## 7. Déploiement sur Vercel

- **Compatibilité :** le projet est adapté à un déploiement sur **Vercel** (Next.js 16, App Router, Route Handlers pour `/api/leads`).
- **Build :** `npm run build` (ou `pnpm build`). En cas d’erreur Turbopack/racine, vérifier `next.config.mjs` et la racine du projet si besoin.
- **À faire sur Vercel :**
  - Connecter le dépôt Git.
  - Définir les variables d’environnement listées ci-dessus (dont `SUPABASE_SERVICE_ROLE_KEY` pour l’API).
  - La base de données reste sur **Supabase** ; rien à héberger sur Vercel pour la DB.

La base de données n’est **pas** hébergée sur Vercel : elle est sur **Supabase** (PostgreSQL managé). Donc **pas besoin de “déplacer la base” vers Digital Ocean** uniquement pour faire fonctionner le site.

---

## 8. Digital Ocean (ou autre) – quand y penser ?

- **Actuellement :** Next.js sur Vercel + base Supabase = déploiement cohérent et opérationnel.
- **Digital Ocean (ou autre hébergeur) peut devenir pertinent si :**
  - Vous voulez **auto-héberger PostgreSQL** (coût long terme, contrôle total, conformité données en EU sur vos serveurs).
  - Vous avez besoin de **workers / tâches longues** (envoi d’emails, sync CRM, jobs planifiés) que Vercel ne gère pas aussi simplement.
  - Vous préférez **tout héberger au même endroit** (app + DB + workers) pour des raisons de simplicité ou de conformité.

En résumé : **Vercel + Supabase suffisent pour faire tourner le site et enregistrer les leads.** Un passage à Digital Ocean (ou autre) est une évolution possible, pas une nécessité pour le fonctionnement actuel.

---

## 9. Résumé des fichiers clés

| Rôle | Fichier(s) |
|------|------------|
| Layout global, métadonnées, JSON-LD | `app/layout.tsx`, `components/json-ld.tsx` |
| Page d’accueil | `app/page.tsx` |
| Hero, Preuve, Expert, Avantages | `components/hero.tsx`, `testimonials.tsx`, `expert.tsx`, `benefits.tsx` |
| Simulateur multi-étapes | `components/roi-simulator.tsx` |
| Header / Footer | `components/header.tsx`, `components/footer.tsx` |
| API leads | `app/api/leads/route.ts` |
| Supabase | `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| SEO | `app/sitemap.ts`, `app/robots.ts` |
| Pages légales | `app/mentions-legales/page.tsx`, `app/politique-confidentialite/page.tsx`, `app/cgv/page.tsx` |
| Schéma DB | `scripts/001_create_leads_table.sql` |

---

## 10. Historique des mises à jour du document

- **Création** : description complète du fonctionnement, stack, déploiement Vercel, rôle de Digital Ocean, variables d’environnement et recommandation sur l’usage de la clé service role Supabase pour l’API.
- **Alignement « Fonctionnement imaginé »** : ajout de la section 3.3 (entonnoir 5 étapes : Acquisition, Qualification, RGPD/filtrage, Distribution, Nurturing). Simulateur : promesse « audit de faisabilité complet » et « résultats détaillés » (gated). API : validation surface selon type (1 500 / 500 m²), filtrage email pro (refus domaines grand public), webhook optionnel `LEAD_WEBHOOK_URL` pour distribution temps réel. Politique de confidentialité : qualité des données (filtrage des leads non qualifiés), lead nurturing (témoignages, Loi LOM, webinaires). Footer : colonne Ressources (études de cas, subventions & financement, webinaires à venir).
- **Responsive** : optimisation multi-appareils (desktop, tablette, smartphone). Base : `overflow-x: hidden`, viewport, `min-w-0` sur conteneurs flex/grid. Header : bouton menu 44px touch, nav mobile avec zones de tap, safe-area. Hero : titres en échelle (2xl → 6xl), CTA et trust grid adaptés. Footer : grille 1/2/5 colonnes, email `break-all`. Simulateur : padding et boutons full-width sur mobile, grilles 1 col puis 2. Sections Preuve, Expert, Benefits : grilles et typo responsive. Pages légales : titres et padding adaptés. Lien d’évitement avec safe-area.

**Règle :** à chaque modification ou ajout significatif sur le site (nouvelles pages, nouvelles routes API, changement de schéma, d’env ou d’hébergement), ce fichier doit être mis à jour en conséquence.
