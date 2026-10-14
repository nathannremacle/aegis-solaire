# Inventaire Exhaustif des Formulaires — Aegis Solaire

Ce document recense l'intégralité des formulaires existants au sein de la plateforme **Aegis Solaire**, avec pour chacun son contexte métier, son emplacement (page et composant source), ses étapes, ses questions, ses champs détaillés, ses options et ses règles de validation.

---

## Sommaire

1. [Simulateur Photovoltaïque B2B & Ombrières (Page d'accueil)](#1-simulateur-photovoltaïque-b2b--ombrières)
2. [Simulateur Photovoltaïque Résidentiel B2C (/particuliers)](#2-simulateur-photovoltaïque-résidentiel-b2c)
3. [Formulaire de Devis Comparatifs (/devis-panneaux-solaires)](#3-formulaire-de-devis-comparatifs-style-bobex)
4. [Candidature Installateur Partenaire RESCERT (/partenaires)](#4-candidature-installateur-partenaire-rescert)
5. [Candidature Partenaire Média & Affiliation (/media-partners)](#5-candidature-partenaire-média--affiliation)
6. [Formulaire Déblocage Replay Webinaire B2B (/webinaire)](#6-formulaire-déblocage-replay-webinaire-b2b)
7. [Formulaires d'Authentification (Espaces Membres & Admin)](#7-formulaires-dauthentification)
   - [Connexion Installateurs Partenaires (/partenaires/login)](#71-connexion-installateur-partenaire)
   - [Connexion Media Partners (/media-partners/login)](#72-connexion-partenaire-média)
   - [Connexion Administration (/admin/login)](#73-connexion-administration)
8. [Formulaires et Actions de Gestion (Dashboards)](#8-formulaires-et-actions-de-gestion-dashboards)
   - [Espace Installateur : Notes & Alertes de vivier](#81-espace-installateur--notes--alertes-de-vivier)
   - [Administration : Création & Édition d'installateur](#82-administration--création--édition-dinstallateur)
   - [Administration : Fiche lead & Assignation](#83-administration--fiche-lead--assignation)
   - [Administration : Ajustement de crédits partenaire](#84-administration--ajustement-de-crédits-partenaire)
   - [Administration : Gestion des commissions Media Partners](#85-administration--gestion-des-commissions-media-partners)
   - [Administration : Traitement des candidatures installateurs](#86-administration--traitement-des-candidatures-installateurs)

---

## 1. Simulateur Photovoltaïque B2B & Ombrières

* **Page d'affichage :** `/` (Page d'accueil)
* **Composant source :** [`components/roi-simulator.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/components/roi-simulator.tsx)
* **Contexte & Objectif :** 
  Génération de leads à forte valeur pour le secteur professionnel wallon (bâtiments tertiaires, industriels, PME, exploitations agricoles et parkings pour ombrières). Il calcule le retour sur investissement (ROI/TRI), l'autoconsommation projetée et les économies annuelles, puis collecte les coordonnées d'un décideur (dirigeant, DAF, responsable technique/RSE) pour le mettre en relation avec un installateur certifié RESCERT membre du réseau Aegis Solaire.
* **Architecture :** Formulaire interactif en 5 étapes avec calcul intermédiaire et transition animée.
* **API de soumission :** `POST /api/leads` (segment implicite `B2B`).

### Étape 1 : Surface à valoriser
* **Question 1 :** *"Quel type de surface souhaitez-vous valoriser ?"*
  * **Champ :** `surfaceType`
  * **Type :** Boutons Radio (`RadioGroup`)
  * **Options :**
    * `toiture` : Toiture industrielle (icône usine)
    * `parking` : Parking (icône voiture)
    * `terrain` : Terrain au sol (icône pousse)
  * **Obligatoire :** Oui (conditionne le passage à l'étape suivante)
* **Question 2 :** *"Surface estimée ?"*
  * **Champ :** `surfaceRange`
  * **Type :** Menu déroulant (`Select`)
  * **Options :**
    * `lt_500` : Moins de 500 m² (équivaut à 400 m² dans le calcul)
    * `m500_1500` : De 500 à 1 500 m² (équivaut à 1 000 m² dans le calcul)
    * `gt_1500` : Plus de 1 500 m² (équivaut à 2 000 m² dans le calcul)
  * **Obligatoire :** Oui

### Étape 2 : Région & Réseau électrique
* **Question 1 :** *"Région ou province du projet"*
  * **Champ :** `province`
  * **Type :** Menu déroulant groupé (`Select` avec `SelectGroup`)
  * **Options :**
    * **Wallonie :** `liege` (Liège), `hainaut` (Hainaut), `namur` (Namur), `brabant_wallon` (Brabant wallon), `luxembourg` (Luxembourg)
    * **Région de Bruxelles-Capitale :** `bruxelles` (Bruxelles (19 communes))
    * **Flandre :** `flandre_anvers` (Anvers), `flandre_limbourg` (Limbourg), `flandre_orientale` (Flandre-Orientale), `flandre_occidentale` (Flandre-Occidentale), `brabant_flamand` (Brabant flamand)
    * **Autre :** `autre` (Autre zone / frontalier)
  * **Obligatoire :** Oui
* **Question 2 :** *"Précision (obligatoire si « Autre » / optionnelle)"*
  * **Champ :** `provinceFreeText`
  * **Type :** Zone de texte multiligne (`Textarea`, max 400 caractères)
  * **Validation :** Requis si `province === "autre"` (minimum 2 caractères), sinon optionnel.
* **Question 3 :** *"Connaissez-vous votre gestionnaire de réseau (GRD) ? (optionnel)"*
  * **Champ :** `grd`
  * **Type :** Menu déroulant (`Select`)
  * **Options :**
    * `ores` : Ores (Wallonie)
    * `resa` : Resa (Wallonie)
    * `aieg` : AIEG
    * `rew` : REW
    * `fluvius` : Fluvius (Flandre)
    * `unknown` : Je ne sais pas
  * **Obligatoire :** Non

### Étape 3 : Consommation électrique
* **Question :** *"Montant estimé de votre facture d'électricité annuelle ?"*
  * **Champ tranche :** `electricityBillBracket`
  * **Type :** Boutons d'options simples
  * **Options de tranche :**
    * `lt_50k` : Moins de 50 000 € / an (représentatif : 35 000 €)
    * `50_100k` : De 50 000 € à 100 000 € / an (représentatif : 75 000 €)
    * `gt_100k` : Plus de 100 000 € / an (représentatif : 120 000 €)
  * **OU Montant exact :**
    * **Champ :** `annualElectricityBillCustom`
    * **Type :** Champ texte numérique (`Input`, unité : € HT / an)
    * **Validation :** Minimum 5 000 € HT/an pour une étude B2B.
  * **Obligatoire :** L'un des deux modes doit être renseigné.

### Étape 4 : Calcul de l'étude (Animation de transition)
* Écran d'attente animé simulant l'analyse du gisement régional, quotas CWaPE, raccordement ORES/RESA et modélisation TRI.

### Étape 5 : Coordonnées du contact & Envoi
* **Prévisualisation :** Rappel du TRI indicatif (en années), économies annuelles estimées (€) et province.
* **Honeypot anti-spam :**
  * `fax_number` (Champ texte masqué aux humains via CSS `sr-only`, ne doit pas être complété).
* **Questions / Champs de contact :**
  * **Prénom (`firstName`) :** Champ texte, requis, min. 2 caractères.
  * **Nom (`lastName`) :** Champ texte, requis, min. 2 caractères.
  * **Fonction (`jobTitle`) :** Menu déroulant (`Select`), requis. Choix : `Dirigeant`, `DAF`, `Resp. RSE ou Technique`, `Autre`.
  * **Nom de l'entreprise (`company`) :** Champ texte, requis, min. 2 caractères.
  * **Numéro d'entreprise / TVA (`companyVat`) :** Champ texte, requis, format TVA valide (ex: `BE0123456789`).
  * **E-mail professionnel (`email`) :** Champ e-mail, requis, format e-mail d'entreprise valide.
  * **Téléphone direct (`phone`) :** Champ téléphone, requis, format valide BE/FR.
  * **Précisions sur votre projet (`projectDetails`) :** Zone de texte (`Textarea`, max 2000 caractères, optionnel).
  * **Consentement Mise en relation & Étude (`marketingConsent`) :** Case à cocher (`Checkbox`), **obligatoire** (accord pour être recontacté par 1 installateur RESCERT du réseau Aegis).
  * **Consentement Actualités solaires (`newsletterConsent`) :** Case à cocher (`Checkbox`), optionnelle (veilles réglementaires CWaPE/PEB).

---

## 2. Simulateur Photovoltaïque Résidentiel B2C

* **Page d'affichage :** `/particuliers`
* **Composant source :** [`components/b2c-simulator.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/components/b2c-simulator.tsx)
* **Contexte & Objectif :** 
  Acquisition de particuliers propriétaires de maisons unifamiliales en Wallonie souhaitant faire installer des panneaux solaires et éventuellement une batterie domestique ou une borne de recharge pour véhicule électrique (VE). Il calcule l'amortissement, l'économie mensuelle, l'autoconsommation et le gain sur 25 ans, puis transmet la demande à un maximum de 3 installateurs RESCERT.
* **Architecture :** Multi-étapes (6 étapes : 4 étapes de qualification + 1 étape de calcul animé + 1 étape de résultats et formulaire de contact).
* **API de soumission :** `POST /api/leads` (avec `segment: "B2C"`).

### Étape 1 : Toiture
* **Question 1 :** *"Type de toiture"*
  * **Champ :** `roofType`
  * **Type :** Boutons-cartes avec pictogrammes personnalisés
  * **Options :** `tuiles` (Tuiles), `ardoises` (Ardoises), `plat` (Toit plat), `zinc` (Zinc / Autre)
  * **Obligatoire :** Oui
* **Question 2 :** *"Orientation principale"*
  * **Champ :** `orientation`
  * **Type :** Boutons Radio (`RadioGroup`)
  * **Options :**
    * `sud` : Plein Sud (facteur 1.0)
    * `sud_est_ouest` : Sud-Est / Sud-Ouest (facteur 0.93)
    * `est_ouest` : Est / Ouest (facteur 0.82)
    * `unknown` : Je ne sais pas (facteur 0.90)
  * **Obligatoire :** Oui
* **Question 3 :** *"Surface de toiture exploitable"*
  * **Champ :** `roofSize`
  * **Type :** Boutons de sélection
  * **Options :**
    * `small` : Petit (< 30 m² — ≈ 3 kWc)
    * `medium` : Moyen (30 – 60 m² — ≈ 6 kWc)
    * `large` : Grand (60 – 100 m² — ≈ 9 kWc)
    * `xlarge` : Très grand (> 100 m² — ≈ 12 kWc)
  * **Obligatoire :** Oui

### Étape 2 : Consommation d'énergie
* **Question 1 :** *"Facture d'électricité annuelle"*
  * **Champ :** `annualBillBracket`
  * **Type :** Boutons de fourchette
  * **Options :**
    * `lt_1200` : Moins de 1 200 € / an (base 1 000 €)
    * `1200_2400` : 1 200 € – 2 400 € / an (base 1 800 €)
    * `2400_4000` : 2 400 € – 4 000 € / an (base 3 200 €)
    * `gt_4000` : Plus de 4 000 € / an (base 5 000 €)
  * **OU Montant exact :**
    * **Champ :** `annualBillCustom`
    * **Type :** Input texte numérique (min. 500 €/an)
  * **Obligatoire :** L'un des deux modes requis.
* **Question 2 :** *"Taille du ménage"*
  * **Champ :** `householdSize`
  * **Type :** Boutons Radio (`RadioGroup`)
  * **Options :** `1_2` (1 – 2 personnes), `3_4` (3 – 4 personnes), `5_plus` (5 personnes ou +)
  * **Obligatoire :** Oui

### Étape 3 : Équipements & Localisation
* **Question 1 :** *"Véhicule électrique ?"*
  * **Champ :** `evInterest`
  * **Type :** Boutons Radio (`RadioGroup`)
  * **Options :** `oui` (Oui, j'en ai un), `prevu` (Prévu prochainement), `non` (Non)
  * **Obligatoire :** Oui
* **Question 2 :** *"Batterie domestique ?"*
  * **Champ :** `batteryInterest`
  * **Type :** Boutons Radio (`RadioGroup`)
  * **Options :** `oui` (Oui, c'est indispensable), `hesite` (Peut-être, à évaluer), `non` (Non, uniquement panneaux)
  * **Obligatoire :** Oui
* **Question 3 :** *"Province d'installation"*
  * **Champ :** `province`
  * **Type :** Menu déroulant (`Select`) avec provinces belges (Liège, Namur, Hainaut, Brabant wallon, Luxembourg, Bruxelles, etc.)
  * **Obligatoire :** Oui

### Étape 4 : Description libre du projet
* **Question :** *"Décrivez votre projet (Situation particulière, contraintes, questions…)"*
  * **Champ :** `projectDetails`
  * **Type :** Zone de texte multiligne (`Textarea`, max 2000 caractères)
  * **Obligatoire :** Non (optionnel)

### Étape 5 : Calcul en direct
* Écran d'attente de 6 secondes calculant l'autoconsommation et le dimensionnement optimal.

### Étape 6 : Résultats chiffrés & Coordonnées
* **Bloc de résultats affiché :** Amortissement (ans), Économie mensuelle (€/mois), Économie annuelle (€/an), Autoconsommation (%), Puissance (kWc), CO₂ évité (t/an) et Gain cumulé sur 25 ans (€).
* **Honeypot :** `fax_number` (input caché, non visible).
* **Questions / Champs de contact :**
  * **Prénom (`firstName`) :** Champ texte, requis (min. 2 caractères).
  * **Nom (`lastName`) :** Champ texte, requis (min. 2 caractères).
  * **E-mail (`email`) :** Champ e-mail, requis, format regex e-mail valide.
  * **Téléphone (`phone`) :** Champ tel, requis, au moins 8 chiffres.
  * **Consentement Devis comparatifs (`marketingConsent`) :** Case à cocher (`Checkbox`), **obligatoire** (accord pour être recontacté par maximum 3 installateurs RESCERT).
  * **Consentement Guides & conseils solaires (`newsletterConsent`) :** Case à cocher (`Checkbox`), optionnelle.

---

## 3. Formulaire de Devis Comparatifs (Style Bobex)

* **Page d'affichage :** `/devis-panneaux-solaires`
* **Composant source :** [`app/devis-panneaux-solaires/devis-landing-client.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/devis-panneaux-solaires/devis-landing-client.tsx)
* **Contexte & Objectif :** 
  Landing page optimisée conversion (inspiration Bobex / Trustpilot) dédiée aux campagnes publicitaires (Google Ads, Meta Ads). Propose de comparer gratuitement jusqu'à 4 devis d'installateurs photovoltaïques locaux agréés RESCERT en Wallonie. Qualification automatique du segment B2C ou B2B selon le type de bâtiment.
* **Architecture :** Parcours en 6 étapes pas-à-pas avec auto-avancement automatique au clic sur les options.
* **API de soumission :** `POST /api/leads` (segment `B2B` si bâtiment PME, sinon `B2C`).

### Étape 1 : Consommation annuelle
* **Question :** *"Quelle est votre consommation d'électricité annuelle (estimée) ?"*
  * **Champ :** `consumption`
  * **Type :** Cartes cliquables à sélection unique avec case cochée
  * **Options :**
    * `lt_3000` : Moins de 3.000 kWh (1 à 2 personnes — petit foyer)
    * `3000_4000` : 3.000 à 4.000 kWh (2 à 3 personnes)
    * `4000_5000` : 4.000 à 5.000 kWh (3 à 4 personnes — standard belge)
    * `5000_6000` : 5.000 à 6.000 kWh (4 à 5 personnes)
    * `gt_6000` : Plus de 6.000 kWh (Grand foyer, pompe à chaleur ou borne VE)
  * **Obligatoire :** Oui (pré-sélectionné par défaut sur `4000_5000`).

### Étape 2 : Type de bâtiment
* **Question :** *"De quel type de bâtiment s'agit-il ?"*
  * **Champ :** `propertyType`
  * **Type :** Cartes cliquables avec icônes
  * **Options :**
    * `maison_4f` : Maison individuelle (4 façades)
    * `maison_mitoyenne` : Maison mitoyenne (2 ou 3 façades)
    * `pme` : Bâtiment d'activité / PME (Atelier, commerce ou bureaux) -> *Bascule le lead en segment B2B*
  * **Obligatoire :** Oui (pré-sélectionné sur `maison_4f`).

### Étape 3 : Statut d'occupation
* **Question :** *"Êtes-vous propriétaire du bâtiment ?"*
  * **Champ :** `ownership`
  * **Type :** Cartes cliquables
  * **Options :**
    * `proprietaire` : Oui, je suis propriétaire (Décision directe d'installation)
    * `locataire` : Non, je suis locataire (Accord préalable du propriétaire requis)
    * `copropriete` : Copropriété (Décision soumise au syndic / ACP)
  * **Obligatoire :** Oui (pré-sélectionné sur `proprietaire`).

### Étape 4 : Type de toiture
* **Question :** *"Quel est le type de votre toiture ?"*
  * **Champ :** `roofType`
  * **Type :** Cartes cliquables
  * **Options :**
    * `tuiles` : Toit incliné en tuiles (Revêtement le plus fréquent en Wallonie)
    * `ardoises` : Toit incliné en ardoises (Fixations et crochets spécifiques)
    * `plat` : Toit plat (Roofing / EPDM) (Pose sur structures lestées)
    * `autre` : Autre / Pose au sol (Étudié sur mesure avec l'installateur)
  * **Obligatoire :** Oui (pré-sélectionné sur `tuiles`).

### Étape 5 : Localisation Wallonne
* **Question 1 :** *"Province wallonne"*
  * **Champ :** `province`
  * **Type :** Grille de boutons radio
  * **Options :** `liege` (Liège), `hainaut` (Hainaut), `namur` (Namur), `brabant_wallon` (Brabant wallon), `luxembourg` (Luxembourg)
  * **Obligatoire :** Oui (auto-sélectionnée lors de la frappe du code postal).
* **Question 2 :** *"Code postal (4 chiffres)"*
  * **Champ :** `postalCode`
  * **Type :** Champ numérique 4 chiffres (`maxLength={4}`)
  * **Validation :** Requis, exactement 4 chiffres belges (ex: 4000, 5000, 7000).
* **Question 3 :** *"Commune (facultatif)"*
  * **Champ :** `city`
  * **Type :** Champ texte libre (max 60 car, optionnel).

### Étape 6 : Coordonnées de contact (Final Step)
* **Honeypot :** `fax_number` (input caché invisible).
* **Questions / Champs de contact :**
  * **Prénom (`firstName`) :** Champ texte, requis (min. 2 caractères).
  * **Nom (`lastName`) :** Champ texte, requis (min. 2 caractères).
  * **E-mail (`email`) :** Champ e-mail, requis, validation regex e-mail stricte.
  * **Téléphone (`phone`) :** Champ téléphone, requis, validation de format de téléphone belge/français.
  * **Adresse (Rue et numéro) (`address`) :** Champ texte, optionnel.
  * **Précisions sur votre projet (`remarks`) :** Zone de texte (`textarea`, max 500 caractères, optionnel).
  * **Consentement Mise en concurrence (`partnerConsent`) :** Case à cocher (`Checkbox`), **obligatoire** (accord pour transmission à un maximum de 4 installateurs agréés RESCERT).
  * **Consentement Conseils solaires (`newsletterConsent`) :** Case à cocher (`Checkbox`), optionnelle.

---

## 4. Candidature Installateur Partenaire RESCERT

* **Page d'affichage :** `/partenaires`
* **Composant source :** [`components/installer-registration-form.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/components/installer-registration-form.tsx)
* **Schéma de validation :** [`lib/installer-registration-schema.ts`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/lib/installer-registration-schema.ts)
* **Contexte & Objectif :** 
  Inscription et vérification des entreprises d'installation photovoltaïque souhaitant acheter des leads qualifiés sur la marketplace Aegis Solaire. Impose la vérification de la certification RESCERT Photovoltaïque obligatoire en Belgique et du numéro d'entreprise BCE/KBO.
* **Architecture :** Formulaire React Hook Form + Zod découpé en 4 étapes avec barre de progression.
* **API de soumission :** `POST /api/installateurs/register` (enregistre dans la table `installer_applications`).

### Étape 1 : Entreprise
* **Question 1 :** *"Nom de l'entreprise"*
  * **Champ :** `companyName`
  * **Type :** Champ texte (`Input`)
  * **Validation :** Requis, min. 2 caractères, max. 255.
* **Question 2 :** *"BCE / KBO (Numéro d'entreprise)"*
  * **Champ :** `siret`
  * **Type :** Champ numérique (`Input`, `inputMode="numeric"`)
  * **Validation :** Requis, 10 à 14 chiffres (format BCE/KBO belge 10 chiffres).

### Étape 2 : Contact référent
* **Question 1 :** *"Prénom"*
  * **Champ :** `firstName`
  * **Type :** Champ texte, requis, min. 2 caractères.
* **Question 2 :** *"Nom"*
  * **Champ :** `lastName`
  * **Type :** Champ texte, requis, min. 2 caractères.
* **Question 3 :** *"Fonction"*
  * **Champ :** `jobTitle`
  * **Type :** Champ texte (ex. *Directeur technique, Gérant*), requis, min. 1 caractère.
* **Question 4 :** *"E-mail"*
  * **Champ :** `email`
  * **Type :** Champ e-mail, requis, format e-mail valide.
* **Question 5 :** *"Téléphone"*
  * **Champ :** `phone`
  * **Type :** Champ tel, requis, validé par `isValidFrBePhone`.

### Étape 3 : Certification RESCERT
* **Question 1 :** *"Référence RESCERT Photovoltaïque"*
  * **Champ :** `rescertPhotovoltaicRef`
  * **Type :** Champ texte (numéro ou identifiant RESCERT)
  * **Validation :** Requis, 1 à 64 caractères.
* **Question 2 :** *"Engagement de certification sur l'honneur"*
  * **Champ :** `rescertPhotovoltaicConfirmed`
  * **Type :** Case à cocher (`Checkbox`)
  * **Texte :** *"Je certifie que mon entreprise est couverte par une certification RESCERT Photovoltaïque à jour (marché belge, RGIE et assurances)."*
  * **Validation :** **Obligatoire** (`refine(v => v === true)`).

### Étape 4 : Zones d'intervention
* **Question :** *"Région(s) couverte(s) (Cochez toutes les zones concernées)"*
  * **Champ :** `regions`
  * **Type :** Cases à cocher multiples (`Checkbox`)
  * **Options disponibles :**
    1. Liège
    2. Hainaut
    3. Namur
    4. Luxembourg (BE)
    5. Brabant wallon
    6. Bruxelles-Capitale
    7. Flandre
    8. Toute la Belgique
    9. Autre / transfrontalier
  * **Validation :** Requis au moins 1 zone cochée.

---

## 5. Candidature Partenaire Média & Affiliation

* **Page d'affichage :** `/media-partners`
* **Composant source :** [`components/media-partner-application-form.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/components/media-partner-application-form.tsx)
* **Schéma de validation :** [`lib/media-partner-registration-schema.ts`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/lib/media-partner-registration-schema.ts)
* **Contexte & Objectif :** 
  Recrutement d'affiliés, agences de marketing digital et apporteurs de trafic rémunérés au CPL (Coût par Lead qualifié B2B et B2C).
* **Architecture :** Formulaire en 2 étapes avec React Hook Form et Zod.
* **API de soumission :** `POST /api/media-partners/register` (enregistre dans `media_partner_applications`).

### Étape 1 : Vous & structure
* **Honeypot anti-spam :** `fax_number` (champ masqué).
* **Question 1 :** *"Nom et prénom"*
  * **Champ :** `name`
  * **Type :** Champ texte, requis, min. 2 caractères.
* **Question 2 :** *"E-mail professionnel"*
  * **Champ :** `email`
  * **Type :** Champ e-mail, requis, e-mail valide.
* **Question 3 :** *"Structure / société"*
  * **Champ :** `companyName`
  * **Type :** Champ texte (Nom commercial ou raison sociale), requis, min. 2 caractères.
* **Question 4 :** *"Site web (optionnel)"*
  * **Champ :** `websiteUrl`
  * **Type :** Champ URL (`type="url"`), optionnel, doit commencer par `http://` ou `https://` si renseigné.

### Étape 2 : Activité & volume
* **Question 1 :** *"Expérience & canaux"*
  * **Champ :** `experienceDescription`
  * **Type :** Zone de texte multiligne (`Textarea`)
  * **Validation :** Requis, **minimum 40 caractères**, max 8000 caractères (canaux utilisés, niches, preuves de performance, conformité publicitaire).
* **Question 2 :** *"Volume indicatif (leads qualifiés / mois)"*
  * **Champ :** `expectedLeadsPerMonth`
  * **Type :** Champ nombre entier (`Input type="number"`)
  * **Validation :** Requis, entier supérieur ou égal à 1 (ex. 20 leads/mois).

---

## 6. Formulaire Déblocage Replay Webinaire B2B

* **Page d'affichage :** `/webinaire`
* **Composant source :** [`app/webinaire/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/webinaire/page.tsx)
* **Schéma de validation :** [`lib/webinaire-schema.ts`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/lib/webinaire-schema.ts)
* **Contexte & Objectif :** 
  Gated content / Lead Magnet B2B proposant le visionnage d'une masterclass vidéo exclusive : *"Zéro CAPEX : financer 100 % de votre solaire par le tiers-investissement en Wallonie"*. Remplir le formulaire débloque instantanément le lecteur vidéo YouTube et enregistre un lead B2B qualifié.
* **Architecture :** Formulaire compact en 1 écran avec React Hook Form et Zod.
* **API de soumission :** `POST /api/leads/webinaire`.

### Champs du formulaire :
1. **Prénom (`firstName`) :**
   * **Type :** Champ texte (`Input`)
   * **Validation :** Requis, min. 2 caractères, max 255.
2. **Fonction (`jobTitle`) :**
   * **Type :** Menu déroulant (`Select`)
   * **Options :** `DAF`, `RSE`, `Dirigeant`, `Autre`
   * **Validation :** Requis, sélection obligatoire d'une option.
3. **E-mail professionnel (`email`) :**
   * **Type :** Champ e-mail (`Input type="email"`)
   * **Validation :** Requis, adresse e-mail valide.
4. **Secteur ou entreprise (`companyName`) :**
   * **Type :** Champ texte (`Input`, placeholder: *"Ex. PME industrielle, retail..."*)
   * **Validation :** Optionnel, max 200 caractères.
5. **Consentement veilles & prochains webinaires (`newsletterConsent`) :**
   * **Type :** Case à cocher (`Checkbox`)
   * **Texte :** *"J'accepte de recevoir les invitations aux prochains webinaires et analyses CWaPE / PACE 2030 d'Aegis Solaire (optionnel)."*
   * **Validation :** Optionnel.

---

## 7. Formulaires d'Authentification

### 7.1. Connexion Installateur Partenaire
* **Page d'affichage :** `/partenaires/login`
* **Composant source :** [`app/partenaires/login/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/partenaires/login/page.tsx)
* **Contexte :** Accès sécurisé au tableau de bord installateur (gestion des crédits, achat de leads et carnet de bord).
* **Champs :**
  1. **E-mail (`email`) :** Champ e-mail, requis, placeholder: `partenaire@entreprise.be`.
  2. **Mot de passe (`password`) :** Champ mot de passe masqué, requis.
* **Action :** Appel Supabase Auth `signInWithPassword`.

### 7.2. Connexion Partenaire Média
* **Page d'affichage :** `/media-partners/login`
* **Composant source :** [`app/media-partners/login/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/media-partners/login/page.tsx)
* **Contexte :** Accès au tableau de bord affilié (suivi des clics, conversions B2B/B2C et commissions dues).
* **Champs :**
  1. **E-mail (`email`) :** Champ e-mail, requis, placeholder: `partenaire@email.com`.
  2. **Mot de passe (`password`) :** Champ mot de passe, requis.
* **Action :** Appel Supabase Auth `signInWithPassword`.

### 7.3. Connexion Administration
* **Page d'affichage :** `/admin/login`
* **Composant source :** [`app/admin/login/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/admin/login/page.tsx)
* **Contexte :** Accès au back-office d'exploitation d'Aegis Solaire (super-admin).
* **Champs :**
  1. **E-mail (`email`) :** Champ e-mail, requis, placeholder: `admin@exemple.be`.
  2. **Mot de passe (`password`) :** Champ mot de passe, requis.
* **Action :** Authentification Supabase et vérification des privilèges administrateur.

---

## 8. Formulaires et Actions de Gestion (Dashboards)

### 8.1. Espace Installateur : Notes & Alertes de vivier
* **Page d'affichage :** `/partenaires/dashboard`
* **Composant source :** [`app/partenaires/dashboard/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/partenaires/dashboard/page.tsx)
* **Formulaires internes :**
  1. **Formulaire d'ajout de note de suivi sur lead débloqué :**
     * Champ texte `leadNotes` (*"Ajouter une note interne..."*) + Bouton *Sauvegarder*.
  2. **Formulaire de configuration des critères d'alerte :**
     * Curseur de surface minimale de toiture (`alertMinSurface`, slider `range` de 50 m² à 1 000 m², pas de 50 m²).
     * Case à cocher notification e-mail instantanée (`alertNotifyEmail`).
  3. **Barre de recherche et filtres de vivier :**
     * Champ texte `searchQuery` (recherche plein texte sur province, GRD, etc.).
     * Boutons filtres segments : `ALL`, `B2B`, `B2C`.

### 8.2. Administration : Création & Édition d'installateur
* **Page d'affichage :** `/admin/installateurs`
* **Composant source :** [`app/admin/(dashboard)/installateurs/installateurs-client.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/admin/%28dashboard%29/installateurs/installateurs-client.tsx)
* **Contexte :** Gestion manuelle des fiches installateurs partenaires par l'administrateur.
* **Champs de la modale (`Dialog`) :**
  1. **Nom (`name`) :** Input texte, obligatoire.
  2. **Email (`email`) :** Input e-mail, obligatoire.
  3. **Téléphone (`phone`) :** Input tel, optionnel.
  4. **Région / zone (`region`) :** Input texte, optionnel.
  5. **Actif (`actif`) :** Interrupteur (`Switch`), booléen.
  6. **Notes (`notes`) :** Zone de texte (`Textarea`), 3 lignes.

### 8.3. Administration : Fiche lead & Assignation
* **Page d'affichage :** `/admin/leads`
* **Composant source :** [`app/admin/(dashboard)/leads/lead-detail-sheet.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/admin/%28dashboard%29/leads/lead-detail-sheet.tsx)
* **Contexte :** Contrôle qualité, audit, enrichissement et routage des leads entrants.
* **Champs éditables :**
  1. **Statut interne (`status`) :** Select (`new` [Nouveau], `contacted` [En attente client], `qualified` [Qualifié], `converted` [Assigné], `lost` [Rejeté/Spam], `HOT_LEAD` [Urgent], `NEEDS_HUMAN_REVIEW` [À contrôler]).
  2. **Vivier Marketplace (`marketplace_status`) :** Select (`pending_review` [En attente], `available` [Publié], `sold_out` [Vendu], `rejected` [Exclu]).
  3. **Assignation directe installateur (`installateur_id`) :** Select des installateurs actifs du réseau + bouton *Renvoyer l'email à l'installateur*.
  4. **Notes internes (`notes`) :** Zone de texte (`Textarea`) avec debounce et sauvegarde asynchrone automatique.

### 8.4. Administration : Ajustement de crédits partenaire
* **Page d'affichage :** `/admin/partners`
* **Composant source :** [`app/admin/(dashboard)/partners/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/admin/%28dashboard%29/partners/page.tsx)
* **Contexte :** Créditer ou débiter manuellement le compte d'un installateur (après virement bancaire ou geste commercial).
* **Champs de la modale :**
  1. **Montants rapides :** Boutons raccourcis `+10`, `+25`, `+50`, `+100` crédits.
  2. **Nombre de crédits (`creditAmount`) :** Input number (positif ou négatif).
  3. **Motif de l'opération (`creditReason`) :** Select audit (`Virement bancaire validé`, `Pack Découverte offert`, `Geste commercial / compensation`, `Régularisation administrative`, `Autre ajustement manuel`).

### 8.5. Administration : Gestion des commissions Media Partners
* **Page d'affichage :** `/admin/media-partners`
* **Composant source :** [`app/admin/(dashboard)/media-partners/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/admin/%28dashboard%29/media-partners/page.tsx)
* **Contexte :** Définition personnalisée des tarifs au CPL pour chaque affilié.
* **Champs de la modale :**
  1. **Commission B2B (€) (`commission_b2b`) :** Input number (min 0).
  2. **Commission B2C (€) (`commission_b2c`) :** Input number (min 0).
  3. **Statut (`status`) :** Select (`active` [Actif], `paused` [Pausé], `suspended` [Suspendu]).

### 8.6. Administration : Traitement des candidatures installateurs
* **Page d'affichage :** `/admin/applications`
* **Composant source :** [`app/admin/(dashboard)/applications/page.tsx`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/app/admin/%28dashboard%29/applications/page.tsx)
* **Contexte :** Examen des dossiers RESCERT soumis par les installateurs candidats.
* **Champs :**
  1. **Notes d'examen administrateur (`admin_notes`) :** Zone de texte (`Textarea`).
  2. **Boutons d'action :** *Approuver* (`approved` — crée automatiquement la fiche installateur) ou *Rejeter* (`rejected`).

---

## Synthèse technique des sécurités communes

1. **Honeypot Anti-Bot (`fax_number`) :** Présent sur tous les formulaires publics de génération de leads. Un robot le remplira automatiquement alors qu'il est invisible aux utilisateurs, déclenchant le rejet silencieux du spam.
2. **Vérification d'horodatage (`form_opened_at`) :** L'API rejette les requêtes soumises en moins de 4 secondes après le rendu du formulaire.
3. **Tracking d'affiliation (`mediaPartnerCode`) :** Rapprochement automatique du code affilié stocké en `localStorage` (`aegis_mp_ref`).
4. **Consentement RGPD explicite :** Cases à cocher obligatoires et distinctes de la newsletter promotionnelle.
