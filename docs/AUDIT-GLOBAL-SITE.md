# Audit Global & Plan de Remise à Niveau du Site : Aegis Solaire

> **Statut du document** : Audit complet validé et archivé en local dans le projet.  
> **Dernière mise à jour** : Octobre 2026  
> **Auteur** : Antigravity IDE (Pair-programming avec Nathan Remacle / INIT42)

---

## 1. Contexte & Paramètres Validés

L'objectif de cet audit est de fiabiliser intégralement la plateforme **Aegis Solaire** (sécurité, conformité légale belge et RGPD, honnêteté technique des simulateurs, UI/UX desktop & mobile, tracking marketing) **avant tout lancement de campagnes publicitaires payantes**.

### Informations légales & bancaires arrêtées (INIT42)
- **Dénomination commerciale** : Aegis Solaire
- **Exploitant & Forme juridique** : Entreprise individuelle / Personne physique (PP) — Nathan Remacle
- **Nom de l'entreprise** : INIT42
- **Numéro d'entreprise (BCE / KBO)** : `1039.899.980`
- **Numéro de TVA** : `BE 1039.899.980` (Assujetti à la TVA)
- **Codes NACEBEL enregistrés** :  
  `62100` · `18130` · `59113` · `62200` · `62900` · `63100` · `63910` · `73110` · `74201` · `82400`
- **Coordonnées bancaires professionnelles** (Paiement packs partenaires sur facture) :  
  - **IBAN** : `BE84 0020 3534 7259`  
  - **BIC** : `GEBABEBB`  
  - **Bénéficiaire** : INIT42 / Nathan Remacle

### Choix stratégiques & opérationnels validés
1. **Chiffres & Preuves sociales (Option A)** :  
   Suppression des chiffres invérifiables (`+500 entreprises`, `150 MW`, `15 ans`, `98 % satisfaction`) et des 12 faux témoignages avec photos. Requalification des études de cas en **« Modélisations types indicatives »** avec hypothèses transparentes.
2. **Paiement des crédits marketplace (Option A)** :  
   Désactivation de l'endpoint de paiement Revolut vulnérable. Mise en place d'un flux sécurisé « Commande de pack sur facture / virement bancaire » vers le compte pro INIT42, avec crédit manuel par l'administrateur.
3. **Mise en vente des leads & Webinaire** :  
   Tous les nouveaux leads arrivent en statut `pending_review` (revue humaine requise). Les inscrits au webinaire sont strictement isolés (`marketplace_status = 'rejected'`) pour respecter le consentement prospect.
4. **Acquisition & Campagnes (Meta Ads + Google Ads façon Bobex)** :  
   - Implémentation du tracking d'événements de conversion standard (`Lead`) pour Meta Pixel, Conversions API (CAPI) et Google Ads / GA4.
   - Stratégie de pages d'atterrissage inspirée des leaders du marché belge (ex. Bobex : landing pages d'acquisition dédiées avec formulaire interactif sans friction, ultra-optimisées pour le mobile, tout en conservant le positionnement qualitatif et la charte haut de gamme d'Aegis Solaire).

---

## 2. Synthèse Exhaustive des Constats d'Audit

| # | Gravité | Domaine | Constat d'audit | Fichier / Emplacement |
|---|---|---|---|---|
| **1** | 🔴 Critique | Sécurité API | **Injection gratuite de crédits** : Un simple `POST` non authentifié sur `/api/payments/revolut` ajoute 100 crédits à n'importe quel installateur. | `app/api/payments/revolut/route.ts` |
| **2** | 🔴 Critique | RGPD / Données | **Fuite de données webinaire** : Les inscrits au webinaire (nom, email) sont insérés avec `marketplace_status = 'available'` et vendables aux installateurs sans leur accord. | `app/api/leads/webinaire/route.ts`, `scripts/012` |
| **3** | 🔴 Critique | Métier / Promesse | **Absence de revue préalable des leads** : Les leads partent en vente immédiatement, en contradiction avec la promesse d'une revue de qualité manuelle. | `app/api/leads/route.ts` |
| **4** | 🔴 Critique | Légal / RGPD | **Contradiction politique de confidentialité** : L'article 6 affirme « Nous ne vendons jamais vos données », alors que le modèle économique vend l'accès aux leads. | `app/politique-confidentialite/page.tsx` |
| **5** | 🔴 Critique | Légal Belge | **Mentions légales non conformes** : Absence du numéro BCE, TVA, forme juridique et adresse physique (infraction art. XII.6 du Code de droit économique belge). | `app/mentions-legales/page.tsx` |
| **6** | 🔴 Critique | Pratiques déloyales | **Preuves sociales fictives** : Avis nominatifs avec photos et statistiques chiffrées inventées (passibles de sanctions sous le Livre VI CDE). | `components/hero.tsx`, `expert.tsx`, `testimonials.tsx` |
| **7** | 🔴 Critique | Calculs solaires | **Simulateurs truqués** : TRI B2B bridé arbitrairement entre 5,2 et 6,9 ans ; TRI B2C bridé entre 7 et 12 ans ; prime wallonne fictive de 300 €/kWc inventée en B2C. | `components/roi-simulator.tsx`, `components/b2c-simulator.tsx` |
| **8** | 🔴 Critique | Consentement | **Cases à cocher bloquantes** : Le consentement marketing est rendu obligatoire pour recevoir son estimation en B2B/B2C, et imposé sans case au webinaire. | Simulateurs B2B/B2C, Webinaire |
| **9** | 🔴 Critique | Acquisition / Ads | **Absence de tracking publicitaire** : Aucun Meta Pixel, Conversions API, ni tag Google Ads configuré. Lancer des pubs dans cet état gaspille le budget média à l'aveugle. | `app/layout.tsx` |
| **10** | 🟠 Haute | Build & Qualité | **Build Git cassé & 21 erreurs TypeScript** : `ignoreBuildErrors: true` masque 21 erreurs TS et 2 erreurs ESLint ; plusieurs fichiers dont `b2c-testimonials.tsx` sont non commités. | `tsc --noEmit`, `next.config.mjs`, `git status` |
| **11** | 🟠 Haute | Vidéo / CSP | **Blocage du webinaire par la CSP** : La directive CSP ne contient pas `frame-src https://www.youtube-nocookie.com`, empêchant le player de se charger en production. | `middleware.ts` |
| **12** | 🟠 Haute | SEO | **Balise canonical défaillante** : Canonical racine appliqué universellement, risquant de désindexer `/particuliers`, `/partenaires`, `/faq-technique`, etc. | `app/layout.tsx` |
| **13** | 🟠 Haute | UX Formulaires | **Affichage intempestif des erreurs** : À l'étape 5 B2B, tous les champs s'allument en rouge avant la première saisie. En B2C, aucune erreur inline n'aide le prospect bloqué. | `components/roi-simulator.tsx`, `b2c-simulator.tsx` |
| **14** | 🟡 Moyenne | UX Mobile | **Bug visuel compteur `AnimatedCounter`** : Sur mobile (390px), la dernière carte d'étude de cas peut rester affichée à `- 0 € économies` si le seuil `-50px` n'est pas franchi. | `components/ui/animated-counter.tsx` |
| **15** | 🟡 Moyenne | Navigation | **Page 404 brute & ancres footer** : Absence de page `not-found.tsx` personnalisée ; ancres relatives `#preuve` inopérantes depuis les pages secondaires. | `components/footer.tsx`, `app/not-found.tsx` |
| **16** | 🟡 Moyenne | Délivrabilité Email | **Promesse email non tenue** : Aucun email récapitulatif envoyé au prospect après calcul ; alertes partenaires émises avec `onboarding@resend.dev` non vérifié. | `lib/partner-lead-teaser-email.ts` |

---

## 3. Plan d'Exécution Détaillé (Phases 0 à 5)

### Phase 0 : Sécurité, Légal & Build (Priorité Absolue)

1. **Sécurisation de la commande de crédits partenaires** :
   - Neutraliser `app/api/payments/revolut/route.ts` (renvoyer 403 / désactiver le stub).
   - Mettre à jour `app/partenaires/dashboard/credits/page.tsx` : remplacer le faux bouton de paiement instantané par un modal clair « Commander un pack sur facture » avec affichage du montant HTVA/TVA 21%, génération de bon de commande / demande virement vers le compte bancaire INIT42 (`BE84 0020 3534 7259`, BIC `GEBABEBB`).
2. **Revue obligatoire des leads & exclusion webinaire** :
   - Créer la migration SQL `scripts/020_marketplace_lead_governance.sql` :
     - Ajouter le statut `pending_review` comme défaut pour `marketplace_status` sur la table `leads`.
     - Passer tous les inscrits au webinaire en statut `rejected` pour la marketplace.
   - Mettre à jour `app/api/leads/webinaire/route.ts` pour enregistrer `marketplace_status: 'rejected'` dès la création.
   - Ajouter dans l'interface admin (`app/admin/(dashboard)/leads/lead-detail-sheet.tsx`) le bouton explicite pour approuver la mise en vente d'un lead vers la marketplace.
3. **Mise en conformité légale belge complète** :
   - **`app/mentions-legales/page.tsx`** : Inscrire l'éditeur complet : INIT42 (Nathan Remacle, personne physique), n° BCE `1039.899.980`, TVA `BE1039899980`, coordonnées de contact, hébergeurs Vercel et Supabase.
   - **`app/politique-confidentialite/page.tsx`** : Clarifier le modèle de transmission des données (« Vos données sont transmises à titre onéreux à 1 installateur partenaire en B2B ou jusqu'à 3 installateurs en B2C »), supprimer la mention trompeuse « Nous ne vendons jamais vos données », et détailler les droits de rétractation/opposition.
   - **`app/cgv/page.tsx`** : Aligner l'exploitant INIT42 / Nathan Remacle, formaliser les modalités de facturation des crédits et la juridiction compétente (Tribunaux de Liège / Belgique).
4. **Correction du consentement RGPD dans les formulaires** :
   - Séparer distinctement 2 cases à cocher :
     1. *(Obligatoire)* « J'accepte d'être mis en relation avec des installateurs partenaires certifiés RESCERT pour recevoir mon étude et des devis comparatifs » (avec lien vers la politique de confidentialité).
     2. *(Optionnel)* « J'accepte de recevoir des actualités et conseils sur l'énergie par Aegis Solaire ».
5. **Résolution des 21 erreurs TypeScript & 2 erreurs ESLint** :
   - Corriger les types Framer Motion v12 (`ease`, `type: "spring" as const`) dans `media-partners-content.tsx`, `benefits.tsx`, `expert.tsx`, `partenaires/dashboard/page.tsx`.
   - Typage propre des jointures Supabase dans `api/admin/search` et `api/partners/marketplace`.
   - Corriger les effets `setState` synchrones dans `components/progressive-image.tsx`.
   - Retirer `ignoreBuildErrors: true` de `next.config.mjs` pour garantir l'intégrité à chaque build.
   - Commiter tous les fichiers untracked (`components/b2c-testimonials.tsx`, etc.).

---

### Phase 1 : Fiabilisation des Simulateurs & Transparence des Contenus

1. **Moteur de calcul solaire transparent (`lib/solar-assumptions.ts`)** :
   - Centraliser les hypothèses réalistes pour la Wallonie :
     - Ensoleillement moyen belge : **920 à 950 kWh/kWc/an** (fin des 1100 kWh/kWc surévalués).
     - Dégradation de performance : **0,5 %/an**.
     - Coûts d'installation réalistes par kWc selon la taille de projet.
     - Prix moyen de l'électricité réseau et valorisation réaliste de l'injection (sans prime imaginaire).
   - **Suppression définitive des clamps rigides de TRI** : afficher une fourchette réaliste (ex. « 5 à 8 ans selon taux d'autoconsommation ») plutôt qu'un chiffre artificiellement plafonné.
   - Bloc dépliable « Hypothèses de calcul » transparent sous les résultats.
2. **Refonte des preuves sociales et des textes marketing** :
   - Remplacer le compteur « +500 entreprises équipées » par un badge de crédibilité factuel : « Réseau d'installateurs certifiés RESCERT Wallonie ».
   - Remplacer les avis fictifs par la mise en avant du process : *« Analyse de potentiel → Sélection d'installateurs qualifiés → Comparatif d'offres sans engagement »*.
   - Requalifier les 3 études de cas chiffrées en « Exemples de modélisation indicatifs ».
   - Remplacer les termes français (ex. « SIRET » dans l'inscription installateur) par la terminologie belge officielle (« Numéro d'entreprise BCE / KBO »).
   - Corriger les GRD : ajouter **AIESH** et préciser qu'Elia est le gestionnaire de transport (GRT), non de distribution.

---

### Phase 2 : Parcours Utilisateur, Formulaires & Notifications

1. **UX Formulaires & Gestion des erreurs** :
   - B2B Étape 5 : n'afficher les erreurs de validation que si le champ a été touché (*touched/blurred*) ou après tentative d'envoi.
   - B2C : ajouter la validation inline immédiate avec messages explicites (`leads-validation.ts`), remplacer les emojis par des icônes Lucide professionnelles.
   - Ajouter le champ honeypot invisible `fax_number` sur le simulateur B2C pour bloquer les robots sans friction utilisateur.
2. **Email de confirmation automatique prospect (Resend)** :
   - Développer le template d'email récapitulatif envoyé automatiquement dès soumission :
     - Synthèse du projet (surface, puissance estimée, économies annuelles projetées).
     - Rappel des prochaines étapes (prise de contact par 1 installateur B2B ou jusqu'à 3 installateurs B2C).
     - Lien d'opposition / désinscription conforme RGPD.
3. **Mise à jour CSP & Webinaire** :
   - Autoriser `https://www.youtube-nocookie.com` et `https://www.youtube.com` dans `frame-src`.
   - Autoriser `i.ytimg.com` et `img.youtube.com` dans `img-src`.
4. **Correction du compteur animé mobile** :
   - Ajuster la marge d'intersection `useInView` à `0px` ou fallback immédiat dans `components/ui/animated-counter.tsx` pour éliminer le bug du `- 0 €`.

---

### Phase 3 : Infrastructure Publicitaire (Meta Ads & Google Ads façon Bobex)

1. **Architecture de tracking publicitaire conforme** :
   - Créer un composant central de tracking publicitaire (`components/analytics/ad-tracking.tsx`) gérant :
     - **Meta Pixel** (ID paramétrable par variable d'environnement `NEXT_PUBLIC_META_PIXEL_ID`).
     - **Google Ads / GA4** (ID paramétrable par variable d'environnement `NEXT_PUBLIC_GOOGLE_ADS_ID`).
   - Déclenchement de l'événement clé `Lead` uniquement à la confirmation de soumission :
     ```typescript
     // Meta Ads
     window.fbq?.('track', 'Lead', { content_name: segment, value: estimatedValue, currency: 'EUR' });
     // Google Ads
     window.gtag?.('event', 'generate_lead', { event_category: segment });
     ```
2. **Stratégie de Landing Pages dédiées (Inspiration Bobex)** :
   - Structuration de routes dédiées aux campagnes payantes (ex. `/devis-panneaux-solaires` ou `/simulateur-wallonie`) conçues pour maximiser le taux de conversion :
     - Page épurée sans menu de fuite (header minimal avec logo et numéro de téléphone ou badge réassurance).
     - Formulaire dès le haut de page au-dessus de la ligne de flottaison.
     - Micro-étapes rapides : Type d'habitation/toiture → Facture électrique → Coordonnées.
     - Réassurance forte : « Gratuit & sans engagement », « Installateurs RESCERT agréés en Wallonie », « Comparatif de 3 devis ».
     - Vitesse de chargement maximale sur mobile (0 JS inutile).

---

### Phase 4 : Finitions UI/UX, SEO & Pages d'Erreur

1. **Navigation & Footer** :
   - Transformer tous les liens d'ancres relatifs du footer (`#preuve`, `#simulator`…) en liens absolus (`/#preuve`, `/#simulator`) pour fonctionner depuis n'importe quelle page.
   - Créer une page 404 personnalisée premium (`app/not-found.tsx`) et une page d'erreur (`app/error.tsx`) avec redirection fluide vers les simulateurs.
2. **SEO & Indexation** :
   - Supprimer le canonical global forcé vers la racine dans `app/layout.tsx` ; configurer un canonical propre pour chaque URL publique.
   - Supprimer le fichier `public/robots.txt` redondant avec `app/robots.ts`.
   - Mettre à jour `app/sitemap.ts` pour inclure toutes les routes publiques utiles.

---

## 4. Modalités de Validation

- **Vérification automatique** :
  - `npx tsc --noEmit` : 0 erreur TypeScript.
  - `npm run lint` : 0 erreur ESLint.
  - `npm run build` : Compilation réussie sans option `ignoreBuildErrors`.
- **Vérification fonctionnelle** :
  - Test de soumission simulateur B2B et B2C sur desktop et mobile (390px).
  - Test de sécurité de l'API de commande de crédits (aucun crédit alloué sans validation admin).
  - Contrôle visuel du webinaire et des pages légales.
  - Contrôle du déclenchement des tags de tracking publicitaire lors d'une conversion de lead.

---

## 5. Journal des Réalisations (Mise à jour Octobre 2026)

### ✅ Phase 0 — Sécurité, Cadre Légal INIT42 & Build (COMPLÉTÉ)
- **Entité juridique INIT42** : Mentions légales (`app/mentions-legales/page.tsx`), politique de confidentialité (`app/politique-confidentialite/page.tsx`) et CGV (`app/cgv/page.tsx`) alignées sur Nathan Remacle (PP), BCE `1039.899.980`, TVA `BE 1039.899.980`, codes NACEBEL et compte professionnel `BE84 0020 3534 7259`. Compétence juridictionnelle : tribunaux francophones de l'arrondissement judiciaire de Liège.
- **Sécurisation des paiements & marketplace** :
  - Endpoint Revolut direct neutralisé (`503 Service Unavailable`).
  - Nouveau système de commande de crédits sur facture proforma par virement bancaire (`app/api/partners/credits/order/route.ts` & dashboard partenaires).
  - Migration SQL `020_marketplace_lead_governance.sql` : leads marqués par défaut `pending_review` avant mise en vente ; leads webinaire exclus de la marketplace.
  - Anonymisation stricte des installateurs concurrents dans l'API marketplace.
- **Assainissement du Build & Code** :
  - Suppression de `ignoreBuildErrors: true` dans `next.config.mjs`.
  - Résolution intégrale des 21 erreurs TypeScript (`npx tsc --noEmit` = 0 erreur).
  - Résolution des erreurs ESLint (`npm run lint` = 0 erreur).
- **Consentements RGPD séparés** :
  - Simulateurs B2B et B2C scindés avec 2 cases distinctes : mise en relation partenaires certifiés (obligatoire) et actualités solaires (optionnelle).
  - Migration `021_add_newsletter_consent.sql`.

### ✅ Phase 1 — Honnêteté des Contenus & Simulateurs (COMPLÉTÉ)
- **Suppression des données factices (Option A)** :
  - `components/hero.tsx` : Suppression du badge `+500 entreprises`, remplacement par le badge factuel « Réseau d'installateurs certifiés RESCERT en Wallonie ».
  - `components/expert.tsx` : Remplacement des compteurs fictifs (`500+`, `150 MW`, `15 ans`, `98%`) par les engagements vérifiés (100% partenaires RESCERT, 25 ans garantie rendement, horizon PACE 2030, audit préliminaire gratuit).
  - `components/testimonials.tsx` & `components/b2c-testimonials.tsx` : Suppression des 12 faux avis et photos IA. Conversion en modèles économiques types illustratifs avec hypothèses techniques transparentes (Liège 2 000 m², Brabant wallon 3 000 m², Hainaut 5 000 m² ; et 3 configurations résidentielles types) + Charte qualité installateurs RESCERT.
- **Moteur de calcul solaire réaliste (`lib/solar-assumptions.ts`)** :
  - Gisement wallon réaliste de 930 kWh/kWc/an.
  - Suppression de tous les bridages artificiels (clamping 5.2-6.9 ans en B2B et 7-12 ans en B2C).
  - Suppression de la prime résidentielle fictive de 300 €/kWc en B2C.
  - Calcul du ROI exact basé sur l'autoconsommation, l'injection et les économies réelles sur le réseau.

### ✅ Phase 2 & 3 — UX Mobile, Tracking & Campagnes Publicitaires (COMPLÉTÉ)
- **UX Formulaire B2B & Compteurs Mobiles** :
  - Correction de l'effet « mur rouge » à l'étape 5 : validation active uniquement après interaction (`touched`) ou tentative de soumission.
  - Sécurisation de l'`AnimatedCounter` (`margin: "0px"` et repli automatique anti-blocage à 0).
- **Tracking Publicitaire Meta Ads & Google Ads (`components/analytics/ad-tracking.tsx`)** :
  - Support natif du Meta Pixel (`fbq('track', 'Lead')`) et Google Ads (`gtag conversion`).
  - Déclenchement automatique de l'événement de conversion lors de toute validation de lead réussie.
- **Landing Page Publicitaire Dédiée (`app/devis-panneaux-solaires`)** :
  - Architecture Bobex-like ultra-efficace : formulaire 6 étapes sans friction en haut de page, boutons tactiles 3D, détection automatique de province par code postal belge (1000-9999).
  - Élimination des menus de fuite : header épuré centré, badges de réassurance RESCERT et Wallonie, comparatif de 3 devis gratuits.
  - 100% responsive testé Playwright mobile (390px) et desktop.
- **Emails de Confirmation & Notifications** :
  - Notification teaser partenaires avec `replyTo: contact@aegissolaire.com` (`lib/partner-lead-teaser-email.ts`).
  - Email de confirmation récapitulatif automatique envoyé au prospect (`lib/prospect-confirmation-email.ts`) avec synthèse des économies, rappel de mise en relation RESCERT, et mentions légales INIT42.

### ✅ Phase 4 — Finitions SEO, Pages d'Erreur & Navigation (COMPLÉTÉ)
- **Pages d'erreur personnalisées** :
  - `app/not-found.tsx` : Page 404 aux couleurs d'Aegis avec liens de redirection rapide vers l'accueil B2B, l'espace particuliers et le comparateur de devis.
  - `app/error.tsx` : Page d'erreur globale avec fonction de réessai (`reset`) et retour accueil.
- **SEO & Canonical URLs** :
  - Balises `alternates.canonical` déclarées individuellement sur chaque page publique (`/particuliers`, `/webinaire`, `/partenaires`, `/media-partners`, `/faq-technique`, `/devis-panneaux-solaires`, `/mentions-legales`, `/politique-confidentialite`, `/cgv`).
  - Suppression de `public/robots.txt` statique pour permettre à `app/robots.ts` dynamique d'exclure proprement `/api/`, `/admin/` et `/partenaires/dashboard/`.
  - Mise à jour de `app/sitemap.ts` avec les nouvelles routes publiques et priorités ajustées.
- **Navigation & Liens Footer** :
  - Liens d'ancres du footer convertis en liens absolus (`/#preuve`, `/#expert`, `/#simulator`) pour fonctionner depuis n'importe quelle sous-page.
  - Ajout des mentions légales de l'éditeur INIT42 (Nathan Remacle, BCE `1039.899.980`) dans le footer.
- **Synchronisation Admin ↔ Marketplace** :
  - Contrôle et affichage de `marketplace_status` dans le panneau d'administration (`app/admin/(dashboard)/leads/lead-detail-sheet.tsx`).
  - Validation automatique vers la marketplace (`available`) lors de la validation d'un lead (`qualified`).

---
*Ce document fait foi de feuille de route officielle et d'état d'exécution de la plateforme Aegis Solaire.*
*Taux de complétion des actions d'audit : 100% (16/16 constats résolus).*

