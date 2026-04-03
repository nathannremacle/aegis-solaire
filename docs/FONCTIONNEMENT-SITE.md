# Aegis Solaire — Fonctionnement du site (vue d’ensemble)

Ce document décrit **l’architecture**, les **flux métier**, la **base de données Supabase**, les **portails** (admin, installateurs, marketeurs) et la **sécurité**. Il sert de référence pour la maintenance et l’onboarding.

---

## 1. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | **Next.js** (App Router) — pages React, layouts, API Routes |
| Styles | **Tailwind CSS** + variables de marque (`globals.css`) |
| Animations | **Framer Motion** |
| Composants UI | **shadcn/ui** (`components/ui/`) |
| Backend / Auth / DB | **Supabase** (PostgreSQL, Auth JWT, Row Level Security) |
| Déploiement typique | **Vercel** (ou équivalent) + variables d’environnement |

---

## 2. Variables d’environnement (résumé)

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (client navigateur / server avec cookies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret serveur** — contourne la RLS ; utilisé dans les routes API sensibles |
| `NEXT_PUBLIC_SITE_URL` | URL canonique du site (SEO, liens, metadata) |
| `ADMIN_EMAILS` | Liste d’emails autorisés au **panel admin** (séparés par des virgules, insensible à la casse) |
| `LEAD_WEBHOOK_URL` | (Optionnel) URL appelée après création d’un lead (simulateur) |
| `LEAD_WEBHOOK_SECRET` | (Optionnel) Secret HMAC pour signer le corps du webhook |

Sans `SUPABASE_SERVICE_ROLE_KEY`, les routes qui appellent `createServiceRoleClient()` échouent au runtime.

---

## 3. Arborescence logique du code

- **`app/`** — Routes Next.js : pages publiques, `/admin`, `/partenaires`, `/media-partners`, `app/api/*`.
- **`components/`** — Blocs marketing (hero, simulateurs, header/footer), admin-nav, formulaires.
- **`lib/`** — Auth admin/partenaire/marketeur, schémas Zod, scoring lead, rate limit, clients Supabase.
- **`scripts/`** — Migrations SQL **à exécuter manuellement** dans Supabase SQL Editor (ordre recommandé ci-dessous).

---

## 4. Site public (marketing & conversion)

### 4.1 Pages principales

| Route | Rôle |
|-------|------|
| `/` | Accueil B2B : Hero, témoignages, expert, webinaire, avantages, simulateur ROI, FAQ teaser |
| `/particuliers` | Segment B2C : arguments + simulateur dédié |
| `/partenaires` | Programme installateurs : présentation + **formulaire de candidature** |
| `/media-partners` | Programme marketeurs (affiliation) |
| `/webinaire` | Inscription webinaire |
| `/faq-technique`, `/ressources`, `/cgv`, `/mentions-legales`, `/politique-confidentialite` | Contenu légal / technique |

Le **sitemap** est généré par `app/sitemap.ts` (liste d’URLs publiques indexables). Les zones `/admin`, `/partenaires/dashboard`, `/media-partners/dashboard` ne sont en général **pas** destinées au référencement (metadata `robots` sur certaines layouts).

### 4.2 Capture de leads (simulateurs)

- Les formulaires B2B/B2C postent vers **`POST /api/leads`** (`app/api/leads/route.ts`).
- Contrôles : honeypot (`fax_number`), **rate limiting**, durée minimale de remplissage (`form_opened_at`), validation **Zod** (`lib/leads-schema.ts`).
- **Score** et **statut** initial : `lib/lead-score.ts`.
- Insertion dans la table **`public.leads`** via le client Supabase **serveur** (session/cookies selon config RLS côté insert — en pratique l’insert peut être autorisé pour anon selon politiques projet).
- Après insert : emails « teaser » aux partenaires dont le **segment** correspond (`lib/partner-lead-teaser-email.ts`, sélection `partners` avec `segment` IN demandé ou `BOTH`).
- Optionnel : **webhook** signé HMAC vers `LEAD_WEBHOOK_URL`.

### 4.3 Attribution marketeur (`media_partner_code`)

- Un composant (ex. `components/media-partner-ref-tracker.tsx`) peut stocker un **code de tracking** (cookie / local) lorsqu’un visiteur arrive avec un paramètre d’URL ou équivalent.
- Lors de la soumission du lead, `media_partner_code` est enregistré sur **`leads.media_partner_code`** pour le suivi des commissions côté admin.

### 4.4 Webinaire

- Route dédiée + **`POST /api/leads/webinaire`** avec schéma assoupli (`lib/webinaire-schema.ts`).

### 4.5 Candidature installateur

- **`POST /api/installateurs/register`** : validation + insertion dans **`installer_applications`** (table créée par migration `016`).

---

## 5. Supabase — données et logique métier

### 5.1 Ordre d’exécution des scripts SQL (`scripts/`)

À appliquer dans l’ordre sur une base vide ou en suivant les dépendances :

1. `001` → `011` : évolution du schéma `leads`, installateurs de base, champs Wallonie, etc.
2. `012_admin_and_partners_schema.sql` : `admin_users`, `partners`, `lead_distributions`, RLS sur `leads`/`partners`, fonctions `is_admin()`, `current_partner_id()`, etc.
3. `013_add_segments.sql` : segment sur leads / partenaires si besoin.
4. `014_media_partners.sql` : `media_partners`, champ `leads.media_partner_code`, auth marketeur.
5. `015_marketplace_purchases.sql` : `lead_purchases`, `credit_transactions`, `leads.credit_cost`, RPC **`purchase_lead`**, **`add_credits`**, politiques RLS associées.
6. `016_installer_applications.sql` : table des candidatures installateurs.
7. **`017_fix_lead_purchases_credits_spent.sql`** : si une ancienne table `lead_purchases` existait **sans** la colonne `credits_spent`, ce script l’ajoute et **re-déploie** `purchase_lead()`.

### 5.2 Tables et concepts clés

| Table / objet | Rôle |
|---------------|------|
| **`leads`** | Prospects : PII, segment (B2B/B2C), province, score, statut, `marketplace_status` (`available` / `sold_out`), `credit_cost`, `media_partner_code`, etc. |
| **`installateurs`** | Référentiel installateurs pour **affectation** des leads par l’admin (flux historique / notification). |
| **`partners`** | Installateurs **marketplace** : crédits, email, `auth_user_id`, ciblage (`target_provinces`, …), `segment`. |
| **`lead_distributions`** | Lien lead ↔ partenaire (notified / unlocked / ignored) — utilisé par la RLS pour savoir si un partenaire peut **voir** un lead. |
| **`lead_purchases`** | Achat marketplace : une ligne = un partenaire a **débloqué** un lead (`credits_spent`, `purchased_at`). Contrainte d’unicité `(lead_id, partner_id)`. |
| **`credit_transactions`** | Journal des mouvements de crédits (`purchase`, `topup`, `adjustment`). |
| **`media_partners`** | Marketeurs : code tracking, commissions B2B/B2C, statut. |
| **`installer_applications`** | Candidatures depuis `/partenaires` : statut pending / approved / rejected. |
| **`admin_users`** | Emails reconnus comme admin côté **RLS** (complément ou alternative à `ADMIN_EMAILS` selon usage). |

### 5.3 Fonctions RPC (PostgreSQL)

- **`purchase_lead(p_lead_id, p_partner_id)`** : transaction atomique — vérifie disponibilité, places (B2C = 3 acheteurs max, B2B = 1), solde crédits, débite `partners`, insère `lead_purchases` + `credit_transactions`, met à jour `lead_distributions` en `unlocked`, passe le lead en `sold_out` si épuisé.
- **`add_credits(p_partner_id, p_amount, p_type, p_reference)`** : crédite le partenaire et journalise.

Ces fonctions sont en **`SECURITY DEFINER`** : elles s’exécutent avec les droits du propriétaire de la fonction ; les appels passent par les **API Routes** avec la clé service role.

### 5.4 Row Level Security (RLS) — idée générale

- **Admin** : politiques basées sur `is_admin()` (JWT + table `admin_users`) ou accès service role côté API.
- **Partenaire marketplace** : `current_partner_id()` pour ne voir que **ses** achats / transactions / distributions concernées.
- **Leads** : un partenaire authentifié ne voit les lignes `leads` que s’il existe une **`lead_distributions`** le concernant (ou achat + logique projet — selon migrations appliquées).

Les routes Next.js critiques utilisent **`createServiceRoleClient()`** pour lire/écrire sans être limitées par la RLS du rôle `authenticated`, tout en **vérifiant** l’identité applicative (email admin, ligne `partners`, etc.) dans le code.

---

## 6. Panel administrateur (`/admin`)

### 6.1 Accès

- L’utilisateur se connecte avec **Supabase Auth** (`/admin/login`).
- Côté application, l’accès est restreint par **`ADMIN_EMAILS`** (`lib/admin-auth.ts`, `getAdminUser()`).
- Les **API** sous `/api/admin/*` exigent en plus, pour les méthodes mutantes, un header **`x-admin-request: true`** et une **origine** alignée sur le `Host` (voir middleware).

### 6.2 Fonctionnalités (pages)

| Zone | Rôle |
|------|------|
| Dashboard | KPIs : leads, partenaires marketplace, marketeurs, commissions, candidatures en attente |
| Leads | Liste, filtres, détail (segment, province, code marketeur, etc.) |
| Installateurs | CRUD installateurs (affectation classique) |
| Marketplace partners (`/admin/partners`) | Liste partenaires, crédits, stats d’achat, **ajout manuel de crédits** via `add_credits` |
| Media partners (`/admin/media-partners`) | Liste marketeurs, stats leads attribués, commissions dues, édition taux / statut |
| Candidatures (`/admin/applications`) | Voir / approuver / rejeter les demandes installateurs ; à l’approbation : sync vers **`installateurs`** et **`partners`** (crédits de départ, segment) |
| Audit | Journal d’audit si activé (`009_audit_log.sql`, API associée) |

---

## 7. Portail installateur — marketplace (`/partenaires`)

### 7.1 Accès

- **`/partenaires/login`** : connexion Supabase (email / mot de passe).
- Le layout **`/partenaires/dashboard`** appelle **`getPartner()`** (`lib/partner-auth.ts`) : recherche d’une ligne **`partners`** par email JWT ou `auth_user_id`. Sinon redirection vers login.

Important : avoir un compte Auth ne suffit pas sans ligne **`partners`** correspondante (créée manuellement ou via **approbation** de candidature admin).

### 7.2 Pages

| Route | Rôle |
|-------|------|
| `/partenaires/dashboard` | **Live feed** des leads `marketplace_status = available` ; teaser (province, segment, puissance/revenu estimés) ; FOMO B2C (3 places) ; bouton déblocage |
| `/partenaires/dashboard/credits` | Packs de crédits + simulation paiement Revolut |

### 7.3 API partenaire

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/partners/marketplace` | Liste enrichie + slots + flag « déjà acheté » |
| POST | `/api/partners/purchase` | Body `{ leadId }` → RPC `purchase_lead` ; retourne le lead complet (PII) si succès |
| GET | `/api/partners/credits` | Solde, `credit_transactions`, `lead_purchases` avec détail `leads` |

Les requêtes **POST** vers `/api/partners/*` doivent inclure **`x-admin-request`** (convention CSRF du projet, nom historique).

### 7.4 Paiement simulé

- **`POST /api/payments/revolut`** : simule un webhook `payment.completed`, mappe `packId` → nombre de crédits, appelle **`add_credits`**. En production, remplacer par la vérification de signature Revolut et l’idempotence.

---

## 8. Portail marketeur (`/media-partners`)

### 8.1 Accès

- Login Supabase ; **`getMediaPartner()`** vérifie une ligne **`media_partners`** avec email + `status = active`.

### 8.2 API

- **`/api/media-partners/stats`** — statistiques agrégées.
- **`/api/media-partners/leads`** — leads attribués au code du partenaire (selon implémentation).

Même logique CSRF **`x-admin-request`** sur les mutations si les routes sont protégées par le middleware (les routes `/api/media-partners` sont incluses).

---

## 9. Sécurité globale (`middleware.ts`)

- Headers : HSTS (prod), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, **CSP**.
- **CSRF renforcé** pour `POST`/`PUT`/`DELETE`/`PATCH` sur :
  - `/api/admin/*`
  - `/api/media-partners/*`
  - `/api/partners/*`
- Vérifications : présence du header `x-admin-request` + cohérence **`Origin`** / **`Host`**.

---

## 10. Flux métier récapitulatifs

### 10.1 Visiteur → Lead

Simulateur → validation → insert **`leads`** → (optionnel) webhook → emails teaser aux **`partners`** du bon segment.

### 10.2 Candidature installateur → Accès marketplace

Formulaire `/partenaires` → **`installer_applications`** → admin **approuve** → création / mise à jour **`installateurs`** + **`partners`** (avec crédits initiaux) → l’installateur peut se connecter sur **`/partenaires/login`** si son email Auth correspond.

### 10.3 Achat de lead (marketplace)

Dashboard → `POST /api/partners/purchase` → RPC **`purchase_lead`** → débit crédits, **`lead_purchases`**, **`lead_distributions`**, éventuellement **`sold_out`**. Le client affiche les coordonnées complètes.

### 10.4 Commission marketeur

Lead avec **`media_partner_code`** → admin suit dans **Leads** et **Media partners** les volumes et commissions selon les taux **`commission_b2b` / `commission_b2c`**.

---

## 11. Maintenance courante

- Après pull : vérifier les **nouveaux fichiers `scripts/*.sql`** et les exécuter sur Supabase si nécessaire.
- En cas d’erreur SQL du type **colonne `credits_spent` absente** : exécuter **`scripts/017_fix_lead_purchases_credits_spent.sql`**.
- Ne jamais commiter la **`SUPABASE_SERVICE_ROLE_KEY`** ni l’exposer au client.

---

*Document généré pour le dépôt Aegis Solaire — à tenir à jour lors d’évolutions majeures du schéma ou des routes.*
