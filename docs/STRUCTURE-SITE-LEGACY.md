# Structure actuelle — Aegis Solaire (Next.js)

Document de contexte pour adaptation marché (ex. Belgique). Synthèse textuelle de l’état actuel du site et de la machine d’acquisition B2B, sans code source.

**Périmètre couvert :** page d’accueil principale, composants associés, simulateur de leads, API de soumission, politique de confidentialité, fichiers publics SEO/IA, métadonnées globales.

---

## 1. Arborescence et architecture de la landing page

### Ordre des sections sur la page d’accueil (`/`)

La page principale enchaîne les blocs suivants, **dans cet ordre exact** dans `app/page.tsx` (méthode **MEP** : *Message → Élément de preuve → Push vers l’action*).

| Ordre | Section (composant / zone) | Objectif MEP |
|------|-----------------------------|--------------|
| 1 | **En-tête global (Header)** | Navigation rapide vers les ancres de la page (Preuve, Expertise, Avantages), accès Webinaire, et **CTA principal** « Lancer ma simulation » (libellé exact du bouton) vers le simulateur. |
| 2 | **Hero** | **Message d’accroche** : valorisation toitures/parkings, conformité Loi LOM, promesse de ROI rapide et étude gratuite. **CTA** vers le simulateur ; lien secondaire vers l’expertise. Indicateurs de confiance chiffrés (ROI moyen, garantie, autoconsommation). |
| 3 | **FAQ technique (AISO / GEO)** | **Densité sémantique** : questions-réponses sur Loi LOM, Décret Tertiaire, financement (PPA, tiers-investissement), études de cas chiffrées ; tableau comparatif des modèles de financement. Sert de pilier pour moteurs génératifs et compréhension du cadre. **Titre de section affiché en `h3`** ; chaque question FAQ est un **`h2`**. |
| 4 | **Preuve sociale & études de cas** (`id="preuve"`) | **Preuve** : trois études de cas avec chiffres (économies, ROI, kWc, etc.) puis témoignages clients, puis bandeau certifications/partenaires. Réassurance B2B. |
| 5 | **Expertise / cadre légal / financement / vidéo** (`id="expert"`) | **Autorité et pédagogie** : PEB, PACE, cartes PPA vs tiers-investissement, engagements (RESCERT Photovoltaïque, RGIE), vidéo, statistiques réseau. |
| 6 | **Promo Webinaire** | **Lead nurturing / contenu** : renvoi vers la page Webinaire, mise en avant du replay « Masterclass Zéro CAPEX » et du tiers-investissement (références Sofiac, Orange Business dans le texte). |
| 7 | **Avantages produit** (`id="benefits"`) | **Bénéfices métier** : coûts, RSE, patrimoine, budget énergie — arguments « pourquoi le solaire B2B ». |
| 8 | **Simulateur ROI** (`id="simulator"`) | **Conversion principale** : tunnel multi-étapes puis **capture B2B** (gated) et envoi des données. |
| 9 | **Pied de page (Footer)** | Navigation secondaire, liens légaux, contact email, positionnement France / Belgique / francophonie. |

### Architecture applicative (vue d’ensemble)

- **Framework :** application Next.js (App Router), pages publiques et espace admin séparé.
- **Page d’accueil :** composition par sections React réutilisables ; métadonnées SEO globales (titre, description, Open Graph) définies au niveau du layout.
- **Données structurées :** injection globale d’un schéma « organisation / site » ; sur la home, schéma « FAQ » aligné sur les questions-réponses affichées.
- **Analytics :** suivi d’audience côté client (outil type Vercel Analytics).
- **Contenu statique SEO/IA :** fichiers accessibles à la racine du site public pour robots et synthèse pour LLM.

### Autres routes publiques (hors landing, utiles au contexte)

- Pages légales : mentions légales, CGV, politique de confidentialité.
- Contenu : ressources, webinaire (page dédiée), partenaires (recrutement installateurs).
- Espace administration : connexion et tableaux de bord (leads, installateurs, audit) — hors parcours visiteur standard.

---

## 2. Copywriting et arguments actuels (titres, CTA, légal & finance)

### Positionnement et promesse (métadonnées globales)

- **Titre SEO par défaut (extrait) :** mise sur la **rentabilité solaire B2B**, **Loi LOM**, **Décret Tertiaire**, **PPA** et **tiers-investissement**.
- **Description meta (extrait) :** conformité Loi LOM et Décret Tertiaire, solutions PPA et tiers-investissement, **simulation de ROI en 2 minutes**, périmètre **France, Belgique, francophonie**.
- **Open Graph / Twitter :** variantes centrées simulateur ROI, conformité Loi LOM & Décret Tertiaire.

### Hero — titres et textes clés

- **Badge :** « +500 entreprises accompagnées ».
- **H1 exact :** « Transformez vos parkings et toitures en centres de profit. Mise en conformité Loi LOM garantie. » (avec mise en avant visuelle du segment « centres de profit »).
- **Sous-titre :** rappel **Décret Tertiaire**, seuils **ombrières > 1 500 m²**, **toitures > 500 m²**, promesse **ROI en 2 minutes** et **étude personnalisée gratuite**.
- **CTA principal :** « Lancer ma simulation de rentabilité » (scroll vers le simulateur).
- **Lien secondaire :** « Découvrir notre expertise » (ancre vers la section expertise).
- **Indicateurs de confiance :** « 7 ans — ROI moyen », « 25 ans — Garantie panneaux », « 70 % — Autoconsommation ».

### En-tête et navigation

- **Sous-marque (desktop) :** « Financement, Rentabilité & Ombrières Pro ».
- **Menu :** Preuve · Expertise · Avantages · Webinaire · bouton « Lancer ma simulation » (le Hero utilise le libellé plus long « Lancer ma simulation de rentabilité »).

### Section FAQ (home) — titres et structure

- **Titre de section (niveau sous-titre affiché) :** « FAQ technique (Loi LOM, Décret Tertiaire, PPA & tiers-investissement) ».
- **Intro :** réponses directes, arbitrage du financement, sécurisation de la conformité ; formulation orientée extraction par moteurs génératifs.
- **H2 (questions FAQ, formulations exactes telles qu’affichées) :**
  1. « Quelles amendes la Loi LOM prévoit-elle en 2026 pour les parkings concernés ? »
  2. « Comment financer une ombrière solaire en tiers-investissement (Zéro CAPEX) ? »
  3. « Comment se mettre en conformité avec le Décret Tertiaire et la Loi LOM ? »
  4. « Quel résultat peut-on obtenir sur un entrepôt logistique de 2 000 m² ? »
  5. « Quel résultat peut-on obtenir sur un parking de 3 000 m² en conformité LOM ? »
  6. « Quel résultat peut-on obtenir sur un site industriel de 5 000 m² ? »
  7. « Achat propre, PPA ou tiers-investissement : quel modèle choisir ? »
  8. « Pourquoi nos partenaires sont certifiés RESCERT Photovoltaïque ? »

Chaque réponse est un paragraphe factuel sous la question ; les trois **études de cas chiffrées** reprennent notamment : **45 000 € / an**, **72 %** d’autoconsommation, **ROI 8,5 ans** ; **52 000 € / an**, **420 kWc**, ombrières **50 %** de surface, facture divisée par deux ; **120 000 € / an**, **PPA** sans mise de fonds, **Décret Tertiaire**.

- **Tableau comparatif (intitulés de colonnes) :** Modèle · Qui finance l’installation ? · Effet principal · Points d’attention — lignes **Achat propre**, **PPA**, **Tiers-investissement**.

### Section « Preuve » (études de cas + témoignages)

- **Titre de bloc :** « Études de cas chiffrées ».
- **Sous-texte :** résultats concrets, besoin de réassurance B2B.
- **Trois cas (titres affichés) :** entrepôt 2 000 m² ; parking 3 000 m² — conformité LOM ; site industriel 5 000 m² — avec libellés d’économies et détails chiffrés comme ci-dessus.
- **Témoignages :** trois citations anonymisées (initiales), rôles (DF, RSE, Dirigeant), secteurs ; ton : baisse de facture, conviction du comité, continuité d’activité.
- **Bandeau :** « Certifications et partenaires » (défilement de logos).

### Section Expertise

- **Titre :** « Un partenaire de confiance pour votre transition énergétique ».
- **Intro :** réseau d’experts certifiés, accompagnement de l’étude à la maintenance, **France, Belgique, francophonie**.
- **Alerte réglementaire (2026) :** non-respect de l’obligation de solariser les parkings → **40 000 € par an** (formulation site).
- **Bloc conformité :** **Décret Tertiaire** et **Loi LOM** — obligations pour bâtiments **> 500 m²** et parkings **> 1 500 m²** (réduction de consommation et couverture solaire), aide à la conformité + rentabilisation.
- **Financement (cartes) :**
  - **Tiers-investissement (Zéro CAPEX)** — investisseur finance 100 % installation et maintenance ; rentabilité dès la première année sans avance de trésorerie.
  - **Contrat PPA** — achat d’électricité à prix fixe sur **15 à 25 ans** ; sécurisation du budget énergétique.
- **Engagements (liste) :** expérience B2B, **RESCERT Photovoltaïque / RGIE**, partenaires fabricants cités (SunPower, Enphase), accompagnement complet, garanties.
- **Vidéo :** titre « Vidéo – Décret Tertiaire et Financement » ; sous-texte sur obligations légales et financement (PPA, tiers-investissement, stockage) en **2 minutes**. Source vidéo : URL d’environnement possible ou fichier local selon configuration.
- **Statistiques affichées :** 500+ entreprises, 150 MW, 98 % satisfaction, monitoring 24/7.

### Promo Webinaire

- **Titre :** « Replay : Masterclass Zéro CAPEX ».
- **Texte :** financer 100 % du solaire par **Tiers-Investissement** ; replay exclusif (**Sofiac**, **Orange Business**).
- **CTA :** « Voir le replay gratuit ».

### Section Avantages

- **Titre :** « Pourquoi passer au solaire B2B ? »
- **Quatre arguments (titres) :** réduction des coûts énergétiques (jusqu’à 70 % d’économies, amortissement < 8 ans) ; RSE ; valorisation patrimoine / DPE ; sécurisation budget sur 25 ans.

### Simulateur (textes visibles du tunnel)

- **Titre du bloc :** « Calculez votre ROI en 2 minutes » — « Simulation gratuite et sans engagement ».
- **Écran de félicitations :** audit envoyé par email ; expert partenaire sous **24 à 48 h** ; options **PPA** et **Tiers-Investissement** ; grille résultats (ROI, autoconsommation, économies, kWc) ; lien optionnel vers prise de rendez-vous (Calendly si configuré).
- **Case à cocher RGPD (formulaire) :** consentement explicite pour être recontacté par Aegis Solaire et installateurs partenaires **RESCERT** ; rappel conservation **3 ans** et liens politique de confidentialité / désinscription.

### Pied de page

- **Baseline :** « Financement, Rentabilité & Ombrières Pro » ; plateforme B2B **France, Belgique, francophonie**.
- **Contact affiché :** email `contact@aegissolaire.com`.

### Fichier `llms.txt` (synthèse pour IA)

Reprend les cibles **> 1 000 m²** bâtiments et **> 1 500 m²** parkings, Loi LOM, Décret Tertiaire, PPA, tiers-investissement, FAQ synthétique et trois cas chiffrés.

---

## 3. Logique du simulateur (lead magnet)

### Nature du composant

Le simulateur sur la home est un **formulaire multi-étapes** géré en **état React local** (**pas** de React Hook Form dans ce composant). Les entrées utilisateur alimentent un **calcul de ROI simplifié** côté client ; à la soumission, les données sont **validées côté serveur** via un **schéma Zod** (`leadSubmitSchema`) puis enregistrées en base (Supabase) et optionnellement relayées par **webhook** HTTP.

**Progression :** la barre affiche « Étape X sur **7** » pendant le tunnel (étapes 1 à 6). Après envoi réussi, l’interface bascule vers un **écran de remerciement** qui **remplace** le formulaire (le décompte « 7/7 » n’apparaît pas comme une étape numérotée dans la même barre).

### Séquence fonctionnelle

1. **Étape 1 — Objectif principal**  
   Question affichée : « Quel est l’objectif principal de votre démarche aujourd’hui ? »  
   Choix (boutons) :
   - Mise en conformité légale (**Loi APER** / **Décret Tertiaire**)
   - Réduction de la facture d’électricité (autoconsommation)
   - Démarche RSE & décarbonation
   - Générer un revenu (location toiture/terrain)

2. **Étape 2 — Type de surface et taille**  
   Question : « Quel type de surface souhaitez-vous valoriser ? »  
   Sous-texte : « Aegis Solaire accompagne exclusivement les projets d'envergure professionnelle. »  
   Types : **Parking extérieur** ; **Toiture tertiaire ou industrielle** ; **Terrain nu ou Friche**.  
   Pour parking et toiture : **tranches de surface** (parking : **&lt; 1 500 m²** / **&gt; 1 500 m²** ; toiture : **&lt; 500 m²** ; **500 à 1 000 m²** ; **&gt; 1 000 m²**). La friche n’a pas de sous-tranche.  
   Bloc optionnel « **Ou indiquez une surface exacte** » : saisie en m² (prioritaire sur les tranches si valide, **minimum 500 m²**). Texte d’aide parking : à partir de **1 500 m²**, le parking est présenté comme concerné par la **Loi LOM (ombrières)**.

3. **Étape 3 — Facture d’électricité**  
   Question : « À combien s'élève votre facture annuelle d'électricité ? »  
   Sous-texte : la donnée sert à calculer le potentiel d’**autoconsommation**.  
   Choix par **tranches** : **Moins de 20 000 € / an** ; **De 20 000 € à 50 000 € / an** ; **De 50 000 € à 100 000 € / an** ; **Plus de 100 000 € / an** — ou **montant exact** en **€ HT / an** (minimum **5 000 € HT/an** pour une étude B2B).  
   Option **IRVE** (case à cocher) : « Je souhaite coupler ce projet avec l'installation de bornes de recharge (IRVE). » — précision : la **Loi LOM** impose souvent solaire et IRVE ensemble ; cette option augmente la valeur du dossier.

4. **Étape 4 — Délai de projet**  
   Question : « Sous quel délai souhaitez-vous concrétiser ce projet ? »  
   Sous-texte : l’étude de faisabilité et les raccordements peuvent prendre plusieurs mois.  
   Choix affichés : **Urgent (Moins de 3 mois)** ; **À moyen terme (3 à 6 mois)** ; **Exploratoire (Plus de 6 mois)** (avec pictogrammes d’emoji dans l’interface).

5. **Étape 5 — Transition / calcul**  
   Écran de chargement **6 secondes** au total, avec **quatre messages** affichés successivement (changement **toutes les 1,5 secondes**) : analyse du gisement solaire ; obligations réglementaires ; éligibilité au financement zéro CAPEX (tiers-investissement) ; estimation du retour sur investissement.  
   À la fin : passage automatique à l’étape de capture ; **horodatage** de l’ouverture du formulaire de contact pour le contrôle **anti-bot** côté API (délai minimum entre cette ouverture et l’envoi).

6. **Étape 6 — Capture B2B (gated content)**  
   - **Honeypot** : champ invisible « ne pas remplir » (les bots qui le remplissent ne déclenchent pas d’enregistrement réel côté API).  
   - **Message personnalisé** selon le ROI estimé, la surface, la facture et l’objectif (ex. excellent ROI, éligibilité tiers-investissement sous conditions, messages spécifiques parking vs Loi LOM).  
   - **Champs de saisie :** prénom, nom, fonction (liste : Dirigeant, DAF, Directeur RSE, Services généraux, Autre), entreprise (optionnel), **email professionnel**, téléphone, case **consentement obligatoire** pour être recontacté.  
   - **Bloc RGPD** court avec lien vers la politique de confidentialité.  
   - **CTA :** « Recevoir mon audit de rentabilité complet ».

7. **Écran de remerciement (post-soumission réussie)**  
   Message de confirmation d’envoi d’audit par email ; rappel contact sous 24–48 h ; réaffichage des **indicateurs chiffrés** (ROI, autoconsommation, économies, puissance) ; lien optionnel « Prendre un rendez-vous téléphonique de 10 min » si une URL Calendly (variable d’environnement publique) est définie.

### Logique de calcul (vue métier)

Le moteur est une **approximation** : à partir de la surface retenue et de la facture, il estime puissance installée, production, taux d’autoconsommation plafonné, économies et durée de retour sur investissement. Les paramètres internes (coefficients, prix de l’électricité, coût au kWc installé) sont des **hypothèses de simulation**, pas un devis.

### Données envoyées au backend (vue métier)

Identité et contact B2B, objectif, type et surface de site, facture, délai, option IRVE, résultats de simulation (ROI, autoconsommation, économies), consentement marketing, horodatage anti-bot, champ leurre si présent.

### Après enregistrement

- **Stockage** en base de données (table des leads) avec **score de lead**, **statut de qualification**, dates de consentement et **durée de conservation** calculée.
- **Webhook HTTP optionnel** : si une URL est configurée en variable d’environnement, envoi asynchrone d’un **payload JSON** avec les principaux champs du lead (identité, projet, estimations, score, statut).

---

## 4. Cadre légal et RGPD

### Base légale et finalités (site — politique de confidentialité)

La page « Politique de confidentialité » (mise à jour indiquée **mars 2026**) précise notamment :

- **Responsable du traitement :** Aegis Solaire.
- **Données collectées via le simulateur :** nom, prénom, email professionnel, téléphone, fonction, entreprise optionnelle, caractéristiques du site (type, superficie), données de consommation.
- **Finalités :** calcul d’estimation de ROI ; recontact pour étude et audit ; **lead nurturing** (infos commerciales, témoignages, échéances Loi LOM, actualités, webinaires) **si consentement** ; transmission à des installateurs partenaires après qualification ; amélioration des services ; mention d’un **filtrage** des leads non qualifiés.
- **Bases légales invoquées :** consentement ; **mesures précontractuelles** (simulation) ; intérêt légitime (amélioration des services).
- **Durée de conservation :** jusqu’à **3 ans** après la dernière interaction (référence aux recommandations CNIL dans le texte).
- **Destinataires :** équipes internes, partenaires installateurs RESCERT après qualification, sous-traitants (hébergement, CRM).
- **Exercice des droits / DPO :** contact **`dpo@aegissolaire.com`** ; section **désinscription** avec traitement annoncé sous **24 à 48 heures** pour les demandes d’opposition ou de désinscription.
- **Réclamation :** renvoi vers la **CNIL** (`www.cnil.fr`) en cas de différend.

### Opt-in et consentement (parcours simulateur)

- La soumission du formulaire de contact **exige** la case d’acceptation d’être recontacté par Aegis Solaire et installateurs partenaires **RESCERT Photovoltaïque** pour évaluer le projet.
- Un encart rappelle le RGPD : traitement sur la base du consentement, conservation **maximale 3 ans** après dernier contact, droits d’accès, rectification et opposition, liens vers la **politique de confidentialité** et la **désinscription**.

### Mesures de sécurité et loyauté des soumissions (API)

- **Pot de miel** : si le champ leurre est renseigné, la réponse peut être un succès simulé **sans enregistrement**.
- **Limitation de fréquence** : **3 soumissions maximum par heure et par adresse IP** (réponse HTTP 429 si dépassement).
- **Délai minimum** : **4 secondes** entre l’horodatage d’ouverture du formulaire de contact et l’envoi (sinon erreur 400 générique côté client).
- **Validation stricte** des données : email **professionnel** (domaines grand public typiquement refusés), téléphone **France ou Belgique** valide, surfaces et factures minimales, types et énumérations contrôlés.
- **Nettoyage** des chaînes avant stockage ; **scoring** et **statut** de qualification du lead.

### Webhook / intégration

- Si configuré, un **appel HTTP POST** vers une URL externe envoie un résumé structuré du lead après insertion en base (identité, projet, estimations, score, statut, horodatage). En cas d’échec d’envoi, l’erreur est journalisée sans bloquer la réponse de succès côté utilisateur.

### Fichiers publics `robots.txt` et `llms.txt`

- **Robots :** autorisation large pour l’exploration du site ; exclusions typiques des zones **API** et **admin** ; déclaration de sitemap.
- **llms.txt :** document de synthèse pour assistants IA (positionnement, cibles, cadre légal, financement, FAQ et cas chiffrés).

---

*Fin du document — reflète l’état fonctionnel et éditorial du projet au moment de sa génération pour contextualiser une adaptation belge sans dupliquer le code source.*
