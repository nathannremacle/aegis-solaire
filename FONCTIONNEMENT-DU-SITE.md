# Comment fonctionne le site Aegis Solaire

Ce document décrit le fonctionnement global du site : ce que voient et reçoivent les **clients** (prospects), les **installateurs**, et ce que l’équipe Aegis gère dans le **panel admin**.

---

## 1. Vue d’ensemble

**Aegis Solaire** est une plateforme B2B de **génération de leads** pour le photovoltaïque (marché C&I : commerce et industrie). Le site :

- **Attire** des décideurs (DAF, RSE, dirigeants) via une landing + simulateur ROI.
- **Qualifie** la demande (surface, consommation, délai projet, message libre, coordonnées pro).
- **Enregistre** les leads en base (Supabase) et peut les **envoyer en temps réel** vers un CRM ou un outil installateur (webhook).
- **Permet à l’admin** de voir les leads, de les assigner à un installateur, et de gérer la liste des installateurs partenaires.

Les **installateurs** ne se connectent pas au site : ils reçoivent les leads soit via le **webhook** (si configuré), soit via l’**assignation** faite par l’admin dans le panel (puis transmission manuelle ou par un autre outil).

---

## 2. Ce que voient et reçoivent les clients (prospects)

### 2.1 Parcours sur le site public

1. **Page d’accueil**  
   - Hero avec CTA « Lancer ma simulation de rentabilité ».  
   - Sections : Preuve (études de cas), Expert (obligations Loi LOM / Décret Tertiaire, financement PPA et tiers-investissement), Avantages, puis **Simulateur**. Le footer propose un lien **« Devenir Partenaire »** vers **/partenaires**.

2. **Page Devenir Partenaire (/partenaires)**  
   - Landing B2B inversée (Aegis s’adresse aux installateurs) : hero, avantages (leads exclusifs, qualification, RGPD), formulaire de candidature. Formulaire : entreprise (nom, SIRET), contact (prénom, nom, fonction, email pro, téléphone), certifications **RGE** et **QualiPV** (numéro RGE + case QualiPV obligatoire), zone d’intervention (région). Soumission vers **POST /api/installateurs/register**. Message de succès : « Votre demande a bien été envoyée. Notre équipe va vérifier vos certifications RGE/QualiPV et vous recontactera sous 48h. »

3. **Simulateur (formulaire multi-étapes)**  
   - **Étape 1 – Objectif** : intention principale (conformité, réduction facture, RSE, revenu).  
   - **Étape 2 – Votre site** : type de surface (Parking, Toiture, Friche), surface en m².  
   - **Étape 3 – Votre consommation** : facture d’électricité annuelle en € HT (min. 5 000 €), et **option IRVE** : case à cocher optionnelle « Je souhaite coupler ce projet avec l’installation de bornes de recharge (IRVE) ». La Loi LOM impose souvent solaire + IRVE ; un lead Solaire + IRVE a une valeur upsell plus forte.  
   - **Étape 4 – Délai de votre projet** : Urgent (< 3 mois), 3 à 6 mois, ou Plus de 6 mois (exploratoire).  
   - **Étape 5 – Transition** : animation « Calcul en cours » (~6 s).  
   - **Étape 6 – Contact** : prénom, nom, email professionnel, téléphone, fonction, entreprise (optionnel), message libre (optionnel), case consentement (transmission aux installateurs + offres Aegis), bloc RGPD.  
   - **Bouton « Recevoir mon audit… »** : envoi du formulaire à l’API.

4. **Après soumission**  
   - Si la validation réussit : écran de **remerciement** avec les indicateurs (ROI en années, taux d’autoconsommation, économies annuelles, puissance installée).  
   - Message du type : « Un expert vous contactera sous 48 h pour une étude détaillée gratuite et sans engagement. »

### 2.2 Contraintes côté site (validation)

Les règles suivantes sont vérifiées **avant** que l’utilisateur puisse valider (bouton « Continuer » ou « Voir mon ROI » désactivé tant que la règle n’est pas respectée). Un **message explicatif** s’affiche sous le champ concerné :

- **Type de surface** : obligatoire (sinon : « Veuillez sélectionner le type de surface »).
- **Surface** : minimum 1 500 m² pour parking, 500 m² pour toiture/friche (sinon : « Surface minimum : 1 500 m² pour un parking, 500 m² pour toiture ou friche »).
- **Facture annuelle** (étape 4) : minimum 5 000 € (sinon : « Facture annuelle minimum de 5 000 € requise pour une étude B2B »).
- **Email professionnel** : formats personnels (gmail, orange, free, etc.) refusés (sinon : « Veuillez utiliser une adresse e-mail professionnelle (domaines personnels type gmail, orange, free, etc. non acceptés) »).
- **Téléphone** : numéro français ou belge valide (sinon : « Veuillez indiquer un numéro de téléphone français ou belge valide »).
- **Prénom / Nom** : au moins 2 caractères ; **Fonction** : obligatoire.
- **Consentement** : case à cocher obligatoire pour recevoir l’étude (sinon : « Pour recevoir votre étude, veuillez accepter la transmission de vos données… »).

En cas d’erreur côté serveur (ex. rate limit, time-to-fill), un message générique s’affiche en haut du formulaire.

### 2.3 Ce que le client ne reçoit pas par le site

- Pas d’email automatique de confirmation envoyé par le site.  
- Pas d’accès à un espace client.  
- La prise de contact est faite **par Aegis ou l’installateur** (téléphone, email, CRM, etc.) en dehors du site.

---

## 3. Ce que reçoivent les installateurs

Les installateurs **n’ont pas de compte ni de page de connexion** sur aegissolaire.com. Ils reçoivent les leads de deux manières possibles :

### 3.1 Via le webhook (temps réel, optionnel)

- Si la variable d’environnement **`LEAD_WEBHOOK_URL`** est renseignée, chaque nouveau lead enregistré déclenche un **POST** vers cette URL avec un JSON contenant notamment :  
  `id`, `first_name`, `last_name`, `email`, `phone`, `job_title`, `company`, `message`, `surface_type`, `surface_area`, `project_timeline`, `annual_electricity_bill`, `estimated_roi_years`, `autoconsumption_rate`, `estimated_savings`, `lead_score`, `status`, `created_at`.
- Cette URL peut pointer vers un **CRM** (HubSpot, Pipedrive, etc.) ou un **outil interne** qui notifie l’installateur (email, logiciel métier, etc.).
- En cas d’échec du webhook (timeout 5 s, erreur réseau), l’erreur est loguée côté serveur mais le lead reste bien enregistré et le client voit le succès.

### 3.2 Via l’assignation dans le panel admin (Speed-to-Lead)

- Dans le panel admin, chaque lead peut être **assigné à un installateur** (liste déroulante dans le détail du lead).
- **Dès qu’un administrateur assigne un lead à un installateur**, le site envoie **automatiquement un e-mail transactionnel** à l’adresse e-mail de l’installateur avec les détails du lead (surface, facture, coordonnées, etc.). Un toast de confirmation s’affiche : « Lead assigné et envoyé à l’installateur par e-mail ».  
  (L’envoi d’e-mail est implémenté côté API ; en développement il peut s’agir d’un `console.log` ; en production on branche Resend, Nodemailer ou un autre service.)
- La liste des leads peut être **filtrée par installateur** et **exportée en CSV** (bouton « Exporter CSV ») pour partager les leads avec le bon partenaire.

En résumé : **les installateurs reçoivent les leads** soit via le webhook (temps réel), soit par **e-mail automatique** lors de l’assignation dans le panel, soit via l’export CSV transmis manuellement.

---

## 4. Ce qu’on voit sur le panel admin

Accès : **/admin** (redirection vers **/admin/dashboard**). Connexion obligatoire sur **/admin/login** (Supabase Auth). Seuls les emails listés dans **`ADMIN_EMAILS`** ont accès.

### 4.1 Dashboard (/admin/dashboard)

- **Cartes KPI** : nombre total de leads, leads du mois, nouveaux du jour.  
- **Tableau** des derniers leads (ex. 10 derniers) avec lien vers le détail.  
- Liens rapides vers la liste complète des leads.

### 4.2 Leads (/admin/leads)

- **Tableau** : date, nom, email, tél., entreprise, installateur assigné, surface, facture, ROI, **score**, statut.  
- **Score lead** : affiché sous forme de **badge coloré** (sur 100 points) — **Rouge/Feu** si score > 70, **Orange** si 40–70, **Gris** si < 40. Le score est calculé automatiquement à l’insertion selon les règles métiers (délai, fonction, facture, option IRVE).  
- **Filtres** : par statut, par **installateur**, **recherche par email**.  
- **Filtres avancés** (bloc dédié) : **date** (du / au sur la date de création), **surface min** (m²), **type de surface** (toiture, parking, friche), **région** (région de l’installateur assigné). Bouton « Appliquer » pour mettre à jour la liste.  
- **Pagination** (conserve tous les filtres).  
- **Clic sur une ligne** : ouverture d’un **détail (drawer)** avec toutes les infos du lead (dont option IRVE si cochée), **changement de statut**, et **assignation à un installateur** (liste déroulante). Lors de l’assignation, un e-mail est envoyé automatiquement à l’installateur (toast : « Lead assigné et envoyé à l’installateur par e-mail »). Si un installateur est déjà assigné, un bouton **« Renvoyer l’email à l’installateur »** permet d’envoyer à nouveau les détails du lead par e-mail.  
- **Bouton « Exporter CSV »** : téléchargement d’un fichier CSV des leads en appliquant **tous les filtres en cours** (statut, installateur, recherche, date, surface, région ; max 5 000 lignes).  
- **Bouton « Nettoyage RGPD (3 ans) »** : lance l’anonymisation des leads dont la date de création est supérieure à 3 ans (voir section 5.1).

### 4.3 Installateurs (/admin/installateurs)

- **Liste** des installateurs partenaires : nom, email, téléphone, région, actif.  
- La **région** de chaque installateur est utilisée pour le filtre « Région installateur » sur la page Leads (affichage des leads assignés à un installateur de cette région).

### 4.4 Logs d’audit (/admin/audit)

- **Tableau** des dernières actions admin : date, email de l’admin, action, entité concernée, détails (JSON).  
- Actions enregistrées : **lead_updated** (changement de statut ou d’installateur), **lead_notify_installateur** (renvoi d’email à l’installateur), **leads_export** (export CSV avec les filtres utilisés), **leads_anonymized** (nettoyage RGPD).  
- Permet de tracer **qui a fait quoi** (conformité, support, revue).  
- **Création** d’un nouvel installateur (nom, email obligatoires ; téléphone, région, actif, notes optionnels).  
- **Modification** et **suppression** d’un installateur.  
- Les installateurs **inactifs** restent dans la liste (utile pour l’historique) mais peuvent être exclus des listes d’assignation si besoin (selon l’UI).

---

## 5. Comment on gère les clients (leads) et les installateurs

### 5.1 Gestion des leads

- **Consultation** : liste et détail dans **Leads** (voir ci-dessus).  
- **Statut** : chaque lead a un statut (nouveau, contacté, qualifié, converti, perdu, etc.) modifiable dans le détail.  
- **Scoring automatique** : à l’insertion, le score (0–100) est calculé selon les règles métiers :  
  - Délai « Urgent (< 3 mois) » = +40 pts ; « 3 à 6 mois » = +20 pts ; « > 6 mois » = 0 pt.  
  - Fonction contenant « Directeur », « DAF », « PDG », « CEO », « Gérant » = +20 pts.  
  - Facture annuelle > 50 000 € = +20 pts.  
  - Option IRVE cochée = +20 pts.  
  Le score est affiché dans le tableau (badge Rouge / Orange / Gris) et dans le détail.  
- **Assignation** : dans le détail d’un lead, choix de l’installateur dans la liste déroulante « Assigner à un installateur ». Sauvegarde immédiate en base **et envoi automatique d’un e-mail** à l’installateur (Speed-to-Lead). Un bouton **« Renvoyer l’email à l’installateur »** permet d’envoyer à nouveau l’email si un installateur est déjà assigné (route **POST /api/admin/leads/[id]/notify-installateur**).  
- **Export** : export CSV pour partager les leads ; **tous les filtres** sont appliqués (statut, installateur, recherche, date du/au, surface min, type de surface, région installateur).  
- **Filtres avancés** : date (création), surface minimum (m²), type de surface, région de l’installateur assigné (liste dérivée des installateurs).  
- **Logs d’audit** : toutes les actions sensibles (modification lead, envoi email installateur, export CSV, nettoyage RGPD) sont enregistrées dans la table `audit_log` (admin, action, entité, détails). Consultation dans **/admin/audit**.  
- **Nettoyage RGPD** : une route API protégée **POST /api/admin/cleanup-leads** permet d’**anonymiser** les leads dont la date de création (`created_at`) est **strictement supérieure à 3 ans** (36 mois). C’est une obligation légale CNIL pour la prospection B2B. Un bouton « Nettoyage RGPD (3 ans) » est disponible sur la page Leads ; après confirmation, les enregistrements concernés sont anonymisés (nom, email, téléphone, entreprise, message remplacés par des valeurs génériques), les lignes restent en base pour les statistiques agrégées.

### 5.2 Gestion des installateurs

- **Création** : ajout d’un partenaire (nom, email obligatoires).  
- **Modification** : mise à jour des infos (téléphone, région, actif, notes).  
- **Suppression** : suppression de l’installateur en base. Les leads déjà assignés à cet installateur gardent une clé `installateur_id` qui peut devenir orpheline (selon la contrainte en base : souvent `ON DELETE SET NULL`).  
- **Actif / inactif** : le champ `actif` permet de désactiver un partenaire sans le supprimer (ex. ne plus proposer dans la liste d’assignation).

---

## 6. Flux de données (résumé)

```
Visiteur remplit le simulateur (étapes : objectif, surface, facture + option IRVE, délai, contact)
        ↓
POST /api/leads (validation : email pro, téléphone FR/BE, surface, facture, etc.)
        ↓
Insertion en base (table leads) + calcul du score (délai, fonction, facture > 50k, IRVE)
        ↓
Réponse succès au client → écran de remerciement
        ↓
[Optionnel] POST vers LEAD_WEBHOOK_URL (même payload, dont wants_irve) → CRM / outil installateur
        ↓
Admin voit le lead dans /admin/leads (avec badge score Rouge / Orange / Gris)
        ↓
Admin peut : changer le statut, assigner à un installateur, exporter en CSV, lancer le nettoyage RGPD (3 ans)
        ↓
Lors de l’assignation → envoi automatique d’un e-mail à l’installateur (Speed-to-Lead)
```

---

## 7. Fichiers et variables utiles

| Rôle | Fichier / variable |
|------|--------------------|
| Simulateur (étapes, formulaire, option IRVE) | `components/roi-simulator.tsx` |
| API enregistrement lead (scoring, wants_irve) | `app/api/leads/route.ts` |
| Calcul du score lead (délai, fonction, facture, IRVE) | `lib/lead-score.ts` |
| Notification e-mail à l’installateur (Speed-to-Lead) | `lib/notify-installateur.ts` |
| Webhook (URL) | Variable d’env. `LEAD_WEBHOOK_URL` |
| Panel admin (pages) | `app/admin/(dashboard)/` |
| API admin (leads, installateurs, stats, export, cleanup) | `app/api/admin/` |
| Nettoyage RGPD (anonymiser leads > 3 ans) | `POST /api/admin/cleanup-leads` |
| Renvoyer email à l’installateur (panel) | `POST /api/admin/leads/[id]/notify-installateur` |
| Export CSV (filtres : date, surface, région) | `GET /api/admin/leads/export?status=…&installateur=…&search=…&date_from=…&date_to=…&surface_min=…&surface_type=…&region=…` |
| Logs d’audit (qui a fait quoi) | Table `audit_log` ; `lib/audit-log.ts` ; page `/admin/audit` ; `GET /api/admin/audit` |
| Page Devenir Partenaire (candidature installateurs) | `app/partenaires/page.tsx`, `components/installer-registration-form.tsx` |
| Candidature installateur (API) | `POST /api/installateurs/register`, `lib/installer-registration-schema.ts` |
| Liste des admins | Variable d’env. `ADMIN_EMAILS` (emails séparés par des virgules) |

Pour plus de détails techniques (stack, schéma BDD, déploiement), voir **DOCUMENTATION.md** et **PLAN-ADMIN.md**.
