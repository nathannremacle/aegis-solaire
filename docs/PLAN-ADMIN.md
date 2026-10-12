# Plan – Panel d’administration Aegis Solaire

Panel de gestion complet et sécurisé pour administrer les leads et les installateurs partenaires.

---

## 1. Objectifs

- **Voir l’activité** : tableau de bord (KPIs, derniers leads).
- **Gérer les leads** : liste avec tri, filtres, détail, statut.
- **Gérer les installateurs** : CRUD (créer, modifier, supprimer), contact.
- **Sécurité** : accès réservé aux admins, authentification obligatoire, pas d’exposition de clés sensibles.

---

## 2. Sécurité et authentification

| Élément | Choix |
|--------|--------|
| **Auth** | Supabase Auth (email + mot de passe). |
| **Qui est admin ?** | Liste d’emails dans `ADMIN_EMAILS` (variable d’environnement, séparée par des virgules). Après connexion, vérification que `user.email` est dans cette liste. |
| **Protection des routes** | Toutes les URLs `/admin/*` sauf `/admin/login` : vérification de la session (cookie Supabase) + vérification email ∈ ADMIN_EMAILS. Sinon redirection vers `/admin/login`. |
| **Protection des API** | Routes `/api/admin/*` : lecture du cookie de session, vérification de l’utilisateur et du rôle admin. Utilisation du **service role** Supabase uniquement côté serveur pour lire/écrire `leads` et `installateurs`. |
| **Pas d’exposition** | `SUPABASE_SERVICE_ROLE_KEY` et `ADMIN_EMAILS` uniquement côté serveur (jamais envoyés au client). |

---

## 3. Structure des routes

| Route | Description |
|-------|-------------|
| `/admin` | Redirection vers `/admin/dashboard`. |
| `/admin/login` | Page de connexion (email, mot de passe). Pas de lien depuis le site public. |
| `/admin/dashboard` | Tableau de bord : nombre de leads, évolution, derniers leads. |
| `/admin/leads` | Liste des leads (table, filtres statut/installateur/recherche, filtres avancés date/surface/région), détail, assignation, export CSV, nettoyage RGPD. |
| `/admin/installateurs` | Liste des installateurs partenaires + boutons Créer / Modifier / Supprimer. |
| `/admin/audit` | Logs d’audit : qui a fait quoi (modification lead, envoi email, export, nettoyage). |

---

## 4. Données et schéma Supabase

### 4.1 Table `leads` (existante)

- Aucune modification obligatoire. Lecture via API admin avec **service role** (bypass RLS ou politique dédiée admin).
- **Phase 2 (implémentée) :** colonne d’une colonne `installateur_id` (FK vers `installateurs`) pour assigner un lead à un installateur. Script : `scripts/006_add_lead_installateur_id.sql`.

### 4.2 Nouvelle table `installateurs`

- `id` (UUID, PK)
- `name` (texte, nom de l’entreprise ou du contact)
- `email` (texte, unique)
- `phone` (texte, optionnel)
- `region` (texte, optionnel – zone géographique ou région)
- `actif` (booléen, défaut true)
- `notes` (texte, optionnel)
- `created_at`, `updated_at`

Script : `scripts/002_create_installateurs_table.sql`.

### 4.3 Table `audit_log`

- `id` (UUID, PK)
- `admin_email` (texte)
- `action` (texte : lead_updated, lead_notify_installateur, leads_export, leads_anonymized)
- `entity_type` (texte), `entity_id` (texte, optionnel)
- `details` (JSONB, optionnel)
- `created_at` (timestamptz)

Script : `scripts/009_audit_log.sql`. Utilisée par `lib/audit-log.ts` pour tracer les actions admin.

---

## 5. API côté serveur (Next.js)

Toutes les routes ci‑dessous :

1. Vérifient la session Supabase (cookie).
2. Vérifient que l’email de l’utilisateur est dans `ADMIN_EMAILS`.
3. Utilisent un client Supabase **service role** pour accéder aux données.

| Méthode | Route | Description |
|--------|--------|-------------|
| GET | `/api/admin/leads` | Liste des leads (query : `page`, `limit`, `status`, `search`, `installateur`, `date_from`, `date_to`, `surface_min`, `surface_type`, `region`). |
| GET | `/api/admin/leads/[id]` | Détail d’un lead. |
| PATCH | `/api/admin/leads/[id]` | Mise à jour du statut et/ou de l’assignation (`installateur_id`). Envoi automatique d’un e-mail à l’installateur lors de l’assignation. Chaque action est enregistrée en audit. |
| POST | `/api/admin/leads/[id]/notify-installateur` | Renvoyer l’e-mail du lead à l’installateur assigné (depuis le panel). Enregistré en audit. |
| GET | `/api/admin/leads/export` | Export CSV des leads (query : mêmes filtres que la liste ; max 5 000 lignes). Enregistré en audit. |
| POST | `/api/admin/cleanup-leads` | Anonymisation des leads de plus de 3 ans (RGPD). Enregistré en audit. |
| GET | `/api/admin/audit` | Liste des logs d’audit (dernières actions admin). |
| GET | `/api/admin/installateurs` | Liste des installateurs. |
| POST | `/api/admin/installateurs` | Création d’un installateur. |
| PATCH | `/api/admin/installateurs/[id]` | Mise à jour. |
| DELETE | `/api/admin/installateurs/[id]` | Suppression. |
| GET | `/api/admin/stats` | KPIs pour le dashboard (nombre de leads, ce mois, etc.). |

---

## 6. UI admin

- **Layout** : sidebar fixe (Logo / Dashboard / Leads / Installateurs / Logs d’audit / Déconnexion) + zone de contenu. Style cohérent avec le site (Tailwind, couleurs Aegis).
- **Login** : formulaire centré (email, mot de passe), message d’erreur en cas d’échec.
- **Dashboard** : cartes (total leads, leads ce mois, nouveaux ce jour) + tableau des 10 derniers leads.
- **Leads** : DataTable avec colonnes (date, nom, email, entreprise, installateur, surface, facture, ROI, score, statut). Filtres : statut, installateur, recherche email. **Filtres avancés** : date (du/au), surface min (m²), type de surface, région installateur. Détail (drawer) : changement de statut, assignation à un installateur, **bouton « Renvoyer l’email à l’installateur »** si assigné. Boutons : Exporter CSV (respecte tous les filtres), Nettoyage RGPD (3 ans). Pagination avec conservation des filtres.
- **Installateurs** : tableau (nom, email, téléphone, région, actif) + bouton « Ajouter » ; modal ou page détail pour créer/éditer/supprimer.
- **Logs d’audit** : tableau des dernières actions (date, admin, action, entité, détails).

---

## 7. Variables d’environnement

| Variable | Usage |
|----------|--------|
| `ADMIN_EMAILS` | Liste d’emails admins (séparés par des virgules, sans espaces). Ex. : `admin@aegissolaire.com,autre@domaine.fr`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Déjà utilisé pour l’API leads ; nécessaire pour les routes admin (lecture leads, CRUD installateurs). |

**Création du premier admin :** dans le dashboard Supabase, aller dans **Authentication** → **Users** → **Add user** (créer un utilisateur avec email + mot de passe). Puis ajouter cet email dans `ADMIN_EMAILS`. Vous pourrez ensuite vous connecter sur `/admin/login`.

---

## 8. Ordre d’implémentation

1. Schéma SQL `installateurs` + doc.
2. Client Supabase admin (service role) + helper « getAdminUser » (session + check ADMIN_EMAILS).
3. Middleware : protection de `/admin/*` (sauf login).
4. Page `/admin/login` + action de connexion.
5. Layout admin (sidebar) + page `/admin/dashboard` (stats + derniers leads).
6. API `GET /api/admin/leads` et `GET /api/admin/stats`.
7. Page `/admin/leads` (liste avec DataTable).
8. API CRUD installateurs + page `/admin/installateurs`.
9. Mise à jour de la documentation (DOCUMENTATION.md) et des variables d’environnement.

---

## 9. Phases et évolutions

### Phase 1 (réalisée)
- Panel admin, leads, installateurs CRUD, dashboard, authentification.

### Phase 2 (réalisée)
- **Assignation lead → installateur :** colonne `installateur_id` sur `leads`, PATCH `/api/admin/leads/[id]` accepte `installateur_id`. Dans le détail d'un lead, sélecteur « Assigner à un installateur ». Liste des leads : filtre par installateur, colonne « Installateur ».

### Évolutions réalisées
- **Assignation lead → installateur** : `installateur_id` sur `leads`, PATCH avec envoi automatique d’email à l’installateur ; bouton « Renvoyer l’email à l’installateur » (POST `/api/admin/leads/[id]/notify-installateur`).
- **Export CSV des leads** : GET `/api/admin/leads/export` avec tous les filtres (status, installateur, search, date_from, date_to, surface_min, surface_type, region) ; max 5 000 lignes.
- **Filtres avancés** : date (création du/au), surface minimum (m²), type de surface (toiture/parking/friche), région (région de l’installateur assigné).
- **Logs d’audit** : table `audit_log` (script `009_audit_log.sql`), `lib/audit-log.ts`, enregistrement sur modification lead, envoi email installateur, export CSV, nettoyage RGPD. Page **/admin/audit** pour consulter qui a fait quoi.
