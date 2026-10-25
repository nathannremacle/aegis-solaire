# 📜 Journal de Bord & Suivi des Évolutions — Aegis Solaire

Ce document est le journal de suivi chronologique de la plateforme **Aegis Solaire** (INIT42).  
Chaque intervention technique, fonctionnelle ou stratégique y est consignée avec sa date, son heure et son périmètre détaillé afin de conserver une traçabilité totale des évolutions du projet.

---

## 📅 22 Octobre 2026

### 🕒 15:15 — Grand Tri, Nettoyage et Refonte de la Documentation Markdown
- **Contexte & Entrée :** Réception du document stratégique manuscrit de Nathan Remacle (*Contexte et Stratégie.docx*) détaillant la gouvernance réelle (Nathan Remacle & Fabrice Remacle), le statut de l'entité INIT42, l'expertise PhotonSolar et les contraintes de démarrage lean.
- **Actions réalisées :**
  - **Suppression définitive de 10 fichiers obsolètes / trompeurs** :
    - `docs/CALCULATEUR-ROI.md` (anciennes formules françaises erronées).
    - `docs/STRUCTURE-SITE-LEGACY.md` (anciennes mentions Loi LOM).
    - `docs/GUIDE-EMAILS-GRATUITS.md` (Resend déjà en place, fichier supprimé).
    - `docs/GUIDE-CONFIGURATION.md` (schémas SQL 001/002 dépassés).
    - `docs/PLAN-ADMIN.md` (spécifications initiales entièrement réalisées).
    - `docs/PLAN-FACTURATION-INSTALLATEURS.md` (supplanté par les packs sur facture INIT42).
    - `DOCUMENTATION.md` (doublon avec README).
    - `emails/outreach/SUIVI-CAMPAGNE.md`, `batch-1/FICHE-ENVOI.md`, `batch-1-relance/FICHE-ENVOI-RELANCE.md` (archives ponctuelles d'avril 2026).
  - **Mise à jour majeure de [BUSINESS-PLAN.md](../BUSINESS-PLAN.md)** :
    - Intégration de la gouvernance : Nathan Remacle (fondateur INIT42, 20 ans, étudiant ingénieur civil Liège) et Fabrice Remacle (la cinquantaine, expert photovoltaïque chez PhotonSolar à Fléron, consultant/formateur).
    - Intégration des barrières à l'entrée : promesse de vérification manuelle (« Chaque lead vérifié à la main »), pression concurrentielle allégée (exclusivité B2B, max 3 B2C), et offre d'assistance technique de chantier B2B par Fabrice Remacle.
    - Prise en compte des risques opérationnels réels (trésorerie lean, micro-budgets de calibration publicitaire, exploitation automatisée en temps partagé).
  - **Mise à jour de [README.md](../README.md)** : Nettoyage de l'index des 10 documents actifs et ajout des identifiants INIT42 et de l'équipe.
  - **Mise à jour de [docs/FONCTIONNEMENT-SITE.md](./FONCTIONNEMENT-SITE.md)** : Ajout de la route `/devis-panneaux-solaires`, suppression définitive des références Revolut au profit du flux de commande de packs sur facture pro INIT42 (`BE84 0020 3534 7259`) et inventaire des migrations 001 à 028.
  - **Validation :** Build Next.js 16 (`npm run build`) validé avec succès (45 routes générées sans erreur).

---

### 🕒 15:35 — Déploiement de la Landing Page VIP Installateurs & Générateur de Liens Admin
- **Contexte :** Demande de Nathan pour doter Fabrice Remacle d'un outil simple et percutant afin de convertir son réseau d'installateurs en partenaires pilotes lors de ses démarchages directs.
- **Réalisations livrées :**
  1. **Landing Page Personnalisée ([app/partenaires/invitation/page.tsx](../app/partenaires/invitation/page.tsx))** :
     - Supporte les paramètres d'URL dynamiques (`?nom=Christophe` & `?cie=Coretec`).
     - Titre personnalisé : *"Christophe, Fabrice t'invite à rejoindre le réseau d'installateurs Aegis Solaire"*.
     - Carte avec le mot personnel de Fabrice Remacle (caution terrain 25 ans, PhotonSolar, électricien).
     - Grille comparative des 4 atouts majeurs (leads vérifiés à la main par téléphone, concurrence réduite à 1 en B2B et max 3 en B2C, accompagnement chantier B2B par Fabrice, zéro abonnement forcé).
     - Démonstration interactive de la marketplace (`<MarketplaceLivePreview />`).
     - Formulaire d'inscription VIP dédié ([components/installer-vip-invitation-form.tsx](../components/installer-vip-invitation-form.tsx)) avec pré-remplissage automatique, sélection de zone et pack 10 crédits offert.
  2. **Générateur de Liens d'Invitation dans le Dashboard Admin ([components/admin/admin-invite-generator.tsx](../components/admin/admin-invite-generator.tsx))** :
     - Intégré directement au sommet du tableau de bord admin ([app/admin/(dashboard)/dashboard/page.tsx](../app/admin/(dashboard)/dashboard/page.tsx)).
     - Conçu pour être utilisable en 3 secondes par Fabrice (ordinateur ou smartphone).
     - Saisie du prénom et de l'entreprise → Génération instantanée du lien.
     - Bouton **« Copier le lien »** (1-clic presse-papier avec confirmation visuelle).
     - Bouton **« WhatsApp »** (ouvre directement WhatsApp avec un message d'invitation pré-rempli et chaleureux prêt à envoyer).
     - Bouton **« Tester »** (prévisualisation de la page dans un nouvel onglet).
  3. **Backend & Schéma ([lib/installer-registration-schema.ts](../lib/installer-registration-schema.ts) & [app/api/installateurs/register/route.ts](../app/api/installateurs/register/route.ts))** :
     - Ajout du champ `invitedBy` au schéma Zod d'inscription.
     - Tag automatique dans la base de données : `⭐ INVITATION VIP PAR: [Nom]` dans `installer_applications.admin_notes` pour identification immédiate par l'admin.
  4. **Documentation & Contexte** :
     - Ajout de la route dans [docs/FONCTIONNEMENT-SITE.md](./FONCTIONNEMENT-SITE.md) (sections 2, 7.2 et 8.2).
     - Mise à jour du présent journal de bord.

---

### 🕒 15:42 — Précision de la Modalité de « Vérification Manuelle » des Leads
- **Clarification par Nathan Remacle :** La vérification manuelle ne consiste pas à appeler systématiquement le prospect par téléphone, mais à réaliser un **audit humain de véracité et de cohérence** dans le sas `pending_review` :
  - Élimination des identités troll / bidons indétectables par les robots classiques (ex. « John Le gros Jambon », noms farfelus).
  - Élimination des données fantaisistes ou aberrantes (ex. 99 999 999 kWh, factures délirantes, surfaces impossibles).
  - Contrôle de cohérence de l'entreprise sur la base BCE / KBO belge et vérification de la toiture sur Google Maps satellite.
  - Préservation du *speed-to-lead* : l'installateur partenaire reste le premier interlocuteur téléphonique à contacter le prospect.
- **Fichiers ajustés :**
  - [app/partenaires/invitation/invitation-client.tsx](../app/partenaires/invitation/invitation-client.tsx) : Requalification de la promesse en vérification à la main.
  - [components/admin/admin-invite-generator.tsx](../components/admin/admin-invite-generator.tsx) : Message d'invitation pré-rempli WhatsApp adapté sans mention d'appel téléphonique.

---

### 🕒 15:52 — Suppression des Crédits Offerts & Sobriété sur « Vérifié à la Main »
- **Directives de Nathan Remacle :**
  1. **N'offrir aucun crédit :** Aucun pack de crédits gratuit ni crédits de test offerts à l'inscription. Les installateurs invités accèdent à un réseau sélectif avec exclusivité et vérification manuelle, mais achètent leurs crédits selon le pricing standard (10, 50, 100 crédits sur facture INIT42).
  2. **Sobriété stricte du label « Vérifié à la main » :** Spécifier uniquement et sobrement que les leads sont *« vérifiés à la main »*, sans jamais exposer la cuisine interne ni expliquer comment ou pourquoi (aucune mention publique des filtrages anti-troll, des 99 999 999 kWh, de l'absence d'appels ou des détails de contrôle).
- **Fichiers modifiés :**
  - [app/partenaires/invitation/invitation-client.tsx](../app/partenaires/invitation/invitation-client.tsx) :
    - Retrait de la pastille « Pack Découverte (10 crédits offerts) » et du badge au-dessus du formulaire.
    - Remplacement du bouton d'action par *« Activer mon invitation partenaire »*.
    - Mot de Fabrice Remacle expurgé des justifications techniques et de la promesse de crédits gratuits.
    - Carte d'avantage 1 recentrée sur l'intitulé épuré : *« 1. Vérifié à la main »* avec la mention simple *« Chaque lead est vérifié à la main par notre équipe avant d'apparaître sur la plateforme. »*
  - [components/installer-vip-invitation-form.tsx](../components/installer-vip-invitation-form.tsx) :
    - Suppression des mentions de 10 crédits offerts sur l'en-tête, l'étape 4 et l'écran de succès.
    - Bouton final rebaptisé : *« Activer mon accès partenaire »*.
  - [components/admin/admin-invite-generator.tsx](../components/admin/admin-invite-generator.tsx) :
    - Modèle de message WhatsApp de Fabrice épuré : suppression de la promesse de crédits offerts et formulation sobre *« Chaque projet est vérifié à la main avant d'être mis en ligne, sans guerre des prix. »*
    - Badge du générateur changé en *« Accès Réseau Privé »*.
  - [docs/FONCTIONNEMENT-SITE.md](./FONCTIONNEMENT-SITE.md) : Alignement de la section 7.2 sur la nouvelle politique sans crédits offerts.

---

### 🕒 16:05 — Audit Complet de la Connexion Supabase, Sécurisation RLS & Fix du Dashboard
- **Contexte :** Demande de Nathan Remacle de vérifier la connexion complète à Supabase (API officielle, SDK `@supabase/supabase-js`, Auth, schéma de tables, RPC et RLS).
- **Résultats de l'audit en direct :**
  - **Connectivité & Auth :** API REST (`/rest/v1/`) et Auth (`/auth/v1/health`) 100% opérationnelles (latence < 140ms). Compte administrateur `mrnathanrem@gmail.com` présent, confirmé et synchronisé avec `ADMIN_EMAILS`.
  - **Tables & Données :** 14 tables contrôlées avec succès (14 leads, 1 partenaire actif, 1 partenaire média, 2 candidatures installateurs, 3 commandes de crédits, 18 transactions, 17 logs d'audit).
  - **Détection & Résolution de 2 incohérences de colonnes :**
    - `media_partners` utilise `name` et `status` (au lieu de `company_name` et `active` demandés dans le fallback de `lib/admin/queries.ts` et dans la RPC `get_admin_dashboard_kpis`).
    - `audit_log` utilise `details` (au lieu de `payload`).
    - Correction appliquée dans [lib/admin/queries.ts](../lib/admin/queries.ts) : le chargement du dashboard admin s'exécute désormais avec 0 erreur.
  - **Détection & Script de Sécurisation RLS Critique :**
    - Dans les migrations initiales (001, 002, 009), les policies RLS de `leads`, `audit_log` et `installateurs` avaient été définies sans clause `TO service_role`, permettant potentiellement à un visiteur muni de la clé publique `anon` de lire des données personnelles.
    - Création de la migration [scripts/029_secure_rls_and_fix_admin_rpc.sql](../scripts/029_secure_rls_and_fix_admin_rpc.sql) (et [supabase/migrations/202610220001_secure_rls_and_fix_admin_rpc.sql](../supabase/migrations/202610220001_secure_rls_and_fix_admin_rpc.sql)) prête à être exécutée dans le SQL Editor Supabase pour verrouiller immédiatement ces tables au rôle `service_role` et réactualiser la procédure `get_admin_dashboard_kpis()`.
- **Validation :** Build Next.js 16 (`npm run build`) validé avec succès (46 routes générées sans erreur).

---

### 🕒 16:09 — Application de la Migration 029 dans Supabase (Action 5 effectuée)
- **Action de Nathan Remacle :** Exécution avec succès du script SQL [scripts/029_secure_rls_and_fix_admin_rpc.sql](../scripts/029_secure_rls_and_fix_admin_rpc.sql) dans le SQL Editor Supabase.
- **Résultat effectif :**
  - **Verrouillage RLS effectif :** Les tables `leads`, `audit_log` et `installateurs` sont désormais strictement protégées et réservées au `service_role`. La fuite de données potentielles via la clé publique `anon` est définitivement colmatée.
  - **Procédure stockée `get_admin_dashboard_kpis()` opérationnelle :** La fonction PostgreSQL est désormais compilée sans erreur dans Supabase avec les bons alias de colonnes (`name`, `status`, `details`).


