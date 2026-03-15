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
   - Sections : Preuve (études de cas), Expert (obligations Loi LOM / Décret Tertiaire, financement PPA et tiers-investissement), Avantages, puis **Simulateur**.

2. **Simulateur (formulaire en 5 étapes)**  
   - **Étape 1 – Votre site** : type de surface (Parking > 1 500 m², Toiture > 500 m², Friche), surface en m².  
   - **Étape 2 – Délai de votre projet** : Urgent (< 3 mois), 3 à 6 mois, ou Plus de 6 mois (exploratoire).  
   - **Étape 3 – Précisions sur votre projet** : message libre optionnel (transmis à l’installateur, non utilisé pour le calcul).  
   - **Étape 4 – Votre consommation** : facture d’électricité annuelle en € HT (min. 5 000 €).  
     - Au clic sur « Continuer », animation « Calcul en cours » (~2,5 s), puis passage à l’étape 5.  
   - **Étape 5 – Contact** : prénom, nom, email professionnel, téléphone, fonction, entreprise (optionnel), case consentement (transmission aux installateurs + offres Aegis), bloc RGPD.  
   - **Bouton « Voir mon ROI »** : envoi du formulaire à l’API.

3. **Après soumission**  
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

### 3.2 Via l’assignation dans le panel admin

- Dans le panel admin, chaque lead peut être **assigné à un installateur** (liste déroulante dans le détail du lead).
- Une fois assigné, le lead est « attribué » à cet installateur dans la base ; **la transmission effective** (envoi d’email, envoi du détail du lead, etc.) doit être faite par l’équipe Aegis (processus manuel ou outil externe), car le site ne contient pas encore de fonction « Envoyer un email à l’installateur ».
- La liste des leads peut être **filtrée par installateur** et **exportée en CSV** (bouton « Exporter CSV ») pour partager les leads avec le bon partenaire.

En résumé : **les installateurs voient les leads** soit via l’outil alimenté par le webhook, soit via ce que l’admin leur transmet après assignation (ou export CSV).

---

## 4. Ce qu’on voit sur le panel admin

Accès : **/admin** (redirection vers **/admin/dashboard**). Connexion obligatoire sur **/admin/login** (Supabase Auth). Seuls les emails listés dans **`ADMIN_EMAILS`** ont accès.

### 4.1 Dashboard (/admin/dashboard)

- **Cartes KPI** : nombre total de leads, leads du mois, nouveaux du jour.  
- **Tableau** des derniers leads (ex. 10 derniers) avec lien vers le détail.  
- Liens rapides vers la liste complète des leads.

### 4.2 Leads (/admin/leads)

- **Tableau** : date, nom, email, tél., entreprise, installateur assigné, surface, facture, ROI, statut.  
- **Filtres** : par statut (nouveau, contacté, qualifié, converti, perdu, etc.), par **installateur** (affichage des leads assignés à un installateur donné).  
- **Recherche** par email.  
- **Pagination**.  
- **Clic sur une ligne** : ouverture d’un **détail (drawer)** avec toutes les infos du lead, **changement de statut**, et **assignation à un installateur** (liste déroulante).  
- **Bouton « Exporter CSV »** : téléchargement d’un fichier CSV des leads (selon les filtres en cours, max 5 000 lignes).

### 4.3 Installateurs (/admin/installateurs)

- **Liste** des installateurs partenaires : nom, email, téléphone, région, actif.  
- **Création** d’un nouvel installateur (nom, email obligatoires ; téléphone, région, actif, notes optionnels).  
- **Modification** et **suppression** d’un installateur.  
- Les installateurs **inactifs** restent dans la liste (utile pour l’historique) mais peuvent être exclus des listes d’assignation si besoin (selon l’UI).

---

## 5. Comment on gère les clients (leads) et les installateurs

### 5.1 Gestion des leads

- **Consultation** : liste et détail dans **Leads** (voir ci-dessus).  
- **Statut** : chaque lead a un statut (nouveau, contacté, qualifié, converti, perdu, etc.) modifiable dans le détail.  
- **Assignation** : dans le détail d’un lead, choix de l’installateur dans la liste déroulante « Assigner à un installateur ». Sauvegarde immédiate en base.  
- **Export** : export CSV pour partager les leads (par statut, installateur, recherche).  
- **Scoring** : un score de lead est calculé côté API à l’insertion (surface, facture, etc.) et stocké ; il peut être affiché dans le détail ou l’export selon l’implémentation.

Aucune suppression de lead ni envoi d’email depuis le panel n’est décrit ici (à ajouter si vous les mettez en place).

### 5.2 Gestion des installateurs

- **Création** : ajout d’un partenaire (nom, email obligatoires).  
- **Modification** : mise à jour des infos (téléphone, région, actif, notes).  
- **Suppression** : suppression de l’installateur en base. Les leads déjà assignés à cet installateur gardent une clé `installateur_id` qui peut devenir orpheline (selon la contrainte en base : souvent `ON DELETE SET NULL`).  
- **Actif / inactif** : le champ `actif` permet de désactiver un partenaire sans le supprimer (ex. ne plus proposer dans la liste d’assignation).

---

## 6. Flux de données (résumé)

```
Visiteur remplit le simulateur (5 étapes)
        ↓
POST /api/leads (validation : email pro, téléphone FR/BE, surface, facture, etc.)
        ↓
Insertion en base (table leads) + calcul du score
        ↓
Réponse succès au client → écran de remerciement
        ↓
[Optionnel] POST vers LEAD_WEBHOOK_URL (même payload) → CRM / outil installateur
        ↓
Admin voit le lead dans /admin/leads
        ↓
Admin peut : changer le statut, assigner à un installateur, exporter en CSV
        ↓
Transmission du lead à l’installateur : via le webhook déjà reçu, ou manuellement (email, export, etc.)
```

---

## 7. Fichiers et variables utiles

| Rôle | Fichier / variable |
|------|--------------------|
| Simulateur (étapes, formulaire) | `components/roi-simulator.tsx` |
| API enregistrement lead | `app/api/leads/route.ts` |
| Webhook (URL) | Variable d’env. `LEAD_WEBHOOK_URL` |
| Panel admin (pages) | `app/admin/(dashboard)/` |
| API admin (leads, installateurs, stats, export) | `app/api/admin/` |
| Liste des admins | Variable d’env. `ADMIN_EMAILS` (emails séparés par des virgules) |

Pour plus de détails techniques (stack, schéma BDD, déploiement), voir **DOCUMENTATION.md** et **PLAN-ADMIN.md**.
