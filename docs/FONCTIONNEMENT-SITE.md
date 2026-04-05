# Aegis Solaire — Fonctionnement du site (référence unique)

Ce document est la **seule source à jour** pour comprendre le site : **parcours** (visiteurs, installateurs, marketeurs, admin), **architecture**, **Supabase**, **sécurité** et **maintenance**. Anciennement réparti entre la racine (`FONCTIONNEMENT-DU-SITE.md`) et ce fichier — tout est regroupé ici.

**Utilisation comme contexte pour une IA** : la **section 22** indique comment s’appuyer sur ce fichier, ce qu’il ne remplace pas (code, SQL réel, secrets), les pièges fréquents (`installateurs` vs `partners`, header CSRF) et l’**inventaire complet des routes API**. En pratique, ce document doit permettre de répondre correctement à la majorité des questions « comment le site fonctionne » sans ouvrir le dépôt ; pour une implémentation ou un bug précis, l’IA doit **citer ou lire** les fichiers mentionnés.

---

## 1. Vue d’ensemble métier

**Aegis Solaire** est une plateforme autour du **photovoltaïque** (focus marché pro / Wallonie–Belgique) qui :

- **Attire** décideurs et particuliers (accueil, `/particuliers`, simulateurs, webinaire, FAQ, pages légales).
- **Qualifie** les demandes (localisation, GRD, consommation, identité pro B2B) : les leads sont **triés et arbitrés manuellement** par l’équipe Aegis, en complément de **modèles et algorithmes poussés** (scoring, anti-abus, règles métier), puis enregistrés dans **Supabase**.
- **Distribue** les opportunités aux **partenaires marketplace** (e-mails teaser, fil d’annonces, **achat au crédit**) tout en gardant l’**assignation admin → installateur** classique (e-mail, export CSV, webhook optionnel).
- **Gère** les **candidatures installateurs**, les **marketeurs** (code de tracking, commissions) et la **conformité** (audit, nettoyage RGPD).

---

## 2. Pages publiques

| Route | Rôle |
|-------|------|
| `/` | Accueil B2B : hero, témoignages, expertise, promo webinaire, avantages, **simulateur ROI B2B**, teaser FAQ |
| `/particuliers` | Segment résidentiel : arguments + **simulateur B2C** |
| `/partenaires` | Programme installateurs : présentation + **candidature** ; liens vers **connexion** et **dashboard marketplace** |
| `/media-partners` | Programme marketeurs (affiliation) |
| `/webinaire` | Inscription webinaire |
| `/faq-technique` | Contenu technique (FAQ) |
| `/mentions-legales`, `/politique-confidentialite`, `/cgv` | Légal |

Le **sitemap** (`app/sitemap.ts`) liste les URL **indexables**. Les zones **`/admin`**, **`/partenaires/dashboard`**, **`/media-partners/dashboard`** ne sont en général **pas** destinées au référencement (metadata `robots` sur certaines layouts). Le footer renvoie notamment vers **Devenir Partenaire** et **Media Partners**.

---

## 3. Simulateur B2B (parcours détaillé)

Fichier : `components/roi-simulator.tsx`. Formulaire en **5 étapes de saisie** ; l’**étape 4** est une **transition « calcul en cours »** (~6 s, pas de champs).

1. **Surface** — Type : toiture industrielle, parking, terrain au sol. **Fourchette** : moins de 500 m², 500–1 500 m², plus de 1 500 m². Le backend reçoit une **surface représentative** dérivée pour ROI et scoring.
2. **Localisation** — Province / région (Belgique), précision en champ libre (**obligatoire** si « Autre »), **GRD** optionnel (Ores, Resa, AIEG, REW, Fluvius, etc.).
3. **Consommation** — Fourchette de facture annuelle **HT** ou montant exact (**minimum 5 000 €** HT/an pour une étude B2B).
4. **Transition** — Messages de progression.
5. **Contact** — Prénom, nom, e-mail, téléphone, **fonction** (Dirigeant, DAF, Resp. RSE ou Technique, Autre), **entreprise**, **numéro TVA belge**, détails projet (optionnel), **consentement** obligatoire.

**Après succès** : écran de remerciement (TRI indicatif, autoconso., économies / an, puissance kWc). Lien **Calendly** si `NEXT_PUBLIC_CALENDLY_URL` est défini.

**Soumission** : `POST /api/leads` (segment **B2B** par défaut dans le schéma Zod).

---

## 4. Capture de leads : validation et anti-abus

Fichier API : `app/api/leads/route.ts`. Schéma : `lib/leads-schema.ts`.

- **Zod** : en B2B, surface représentative **supérieure à 200 m²**, **entreprise + TVA BE** obligatoires, province et règle « Autre », facture positive, consentement, téléphone **FR/BE**, e-mail au format valide (**pas** de liste noire de domaines dans le schéma actuel).
- **Honeypot** `fax_number` : si rempli → réponse succès **sans** insert (anti-bot).
- **Rate limiting** (`lib/rate-limit.ts`).
- **Délai minimal** entre ouverture et envoi : `form_opened_at`, **4 s** minimum côté API.

Après insert : **score** et **statut** via `lib/lead-score.ts` ; e-mails **teaser** aux lignes **`partners`** dont le **`segment`** est celui du lead ou **`BOTH`** (`lib/partner-lead-teaser-email.ts`) ; optionnellement **webhook** signé HMAC vers `LEAD_WEBHOOK_URL` / `LEAD_WEBHOOK_SECRET` (en-tête `x-payload-signature`).

**Tri et qualification** : au-delà du score automatique, l’**équipe Aegis** intervient pour **prioriser, vérifier et classer** les leads ; la chaîne combine ce **tri manuel** et des **algorithmes avancés** (scoring, détection d’anomalies, règles opérationnelles).

**Ce que le visiteur ne reçoit pas** : pas d’e-mail de confirmation automatique ; le suivi se fait par rappel humain / partenaire / CRM.

---

## 5. Attribution marketeur (`media_partner_code`)

Le composant **`MediaPartnerRefTracker`** est monté dans **`app/layout.tsx`** (`components/media-partner-ref-tracker.tsx`). Il lit le paramètre d’URL **`?ref=...`** (via `useSearchParams`) et enregistre la valeur dans **`sessionStorage`** (clé interne `mp_ref`). Les simulateurs lisent ce code avec **`getStoredMediaPartnerRef()`** au moment du `POST`. Le corps de requête envoie **`mediaPartnerCode`** → colonne **`leads.media_partner_code`** (alignée sur **`media_partners.tracking_code`** côté admin). **Limite** : si `sessionStorage` est indisponible ou vidé avant soumission, le code n’est pas transmis.

---

## 6. Parcours B2C et webinaire

- **`/particuliers`** + `components/b2c-simulator.tsx` → `POST /api/leads` avec **`segment: "B2C"`**. Règles Zod allégées (pas d’exigence entreprise/TVA comme en B2B). Teasers vers partenaires **B2C** / **BOTH**.
- **`/webinaire`** → **`POST /api/leads/webinaire`** (`lib/webinaire-schema.ts`).

---

## 7. Candidature installateur

**`POST /api/installateurs/register`** → table **`installer_applications`** (migration `016`). L’accès **marketplace** (`partners` + Auth) suit en général une **approbation** admin (`/admin/applications`).

---

## 8. Installateurs : trois niveaux

### 8.1 Sans compte (flux classique)

- **Webhook** : si `LEAD_WEBHOOK_URL` est défini, **POST** JSON après création de lead (champs enrichis : province, GRD, `company_vat`, score, etc.). Signature HMAC optionnelle.
- **Assignation** dans l’admin : référentiel **`installateurs`** → e-mail transactionnel (`lib/notify-installateur.ts`). **`POST /api/admin/leads/[id]/notify-installateur`** pour renvoyer l’e-mail.

### 8.2 Marketplace (compte partenaire)

- **`/partenaires/login`** (Supabase). **`getPartner()`** (`lib/partner-auth.ts`) exige une ligne **`partners`** (email ou `auth_user_id`).
- **`/partenaires/dashboard`** : leads disponibles, déblocage contre **crédits** (RPC **`purchase_lead`**). Les opportunités affichées sont **triées et validées** par l’**équipe Aegis** avant mise en vente, **en complément d’algorithmes avancés** (voir aussi section **4** et **10.3**).
- **`/partenaires/dashboard/credits`** : packs ; **`POST /api/payments/revolut`** — voir **section 17.3** *Crédits et paiement Revolut Pay* (stub démo / prod).

### 8.3 E-mails teaser

Envoi **asynchrone** aux e-mails **`partners`** alignés sur le **segment** du lead — voir `lib/partner-lead-teaser-email.ts`.

---

## 9. Marketeurs (`/media-partners`)

- Page publique + **`/media-partners/login`**. **`getMediaPartner()`** : ligne **`media_partners`** active.
- API : **`/api/media-partners/stats`**, **`/api/media-partners/leads`**. CSRF : header **`x-admin-request`** (voir middleware).

---

## 10. Panel administrateur (`/admin`)

### 10.1 Accès

- **`/admin/login`** (Supabase Auth).
- Liste **`ADMIN_EMAILS`** (`lib/admin-auth.ts`, `getAdminUser()`).
- Mutations **`/api/admin/*`** : header **`x-admin-request: true`** + **Origin** cohérente avec **`Host`** (`middleware.ts`).

### 10.2 Navigation (`components/admin-nav.tsx`)

| Zone | Rôle |
|------|------|
| **Tableau de bord** | KPI : total leads, mois, jour, B2B/B2C, candidatures pending, partenaires marketplace, achats, marketeurs, **commissions dues** (estimation), derniers leads |
| **Leads** | Liste, filtres (statut, installateur, recherche, dates, surface min, type surface, région installateur…), **pagination**, **score** (badges : score élevé / moyen / faible selon seuils 70 et 40), **drawer** détail, changement **statut**, **assignation** installateur + e-mail auto, **« Renvoyer l’e-mail »**, **export CSV** (filtres appliqués, plafond côté API), **nettoyage RGPD (3 ans)** |
| **Installateurs** | CRUD **`installateurs`** (affectation classique, région pour filtres) |
| **Marketplace** (`/admin/partners`) | **`partners`**, crédits, stats, **add_credits** |
| **Marketeurs** (`/admin/media-partners`) | **`media_partners`**, commissions, statuts |
| **Candidatures** (`/admin/applications`) | Approuver / rejeter → sync **`installateurs`** + **`partners`** (**0 crédit** par défaut à l’approbation) |
| **Audit** | Actions sensibles (`lib/audit-log.ts`, `GET /api/admin/audit`) |

### 10.3 Scoring lead (tunnel actuel)

`lib/lead-score.ts` (0–100), à partir notamment de :

- Tranches **facture** (seuils 100k, 50k et 20k € annuels),
- **Surface** représentative (seuils 500 m² et 1 500 m²),
- **Fonction** (mots-clés dirigeant, DAF, PDG, etc.),
- **GRD** renseigné (hors « inconnu ») : petit bonus,
- **Noms suspects** : forte pénalité.

Statut initial possible : **`new`**, **`HOT_LEAD`**, **`NEEDS_HUMAN_REVIEW`**.

En production, la **décision finale** sur la valeur et le statut d’un lead (y compris pour les commissions marketeurs et la marketplace) repose sur une **démarche hybride** : **revue manuelle** par l’équipe Aegis et **moteurs algorithmiques** (score, signaux, workflows).

**Note** : colonnes **`project_timeline`** et **`wants_irve`** peuvent exister en base (exports, anciennes données). Le tunnel B2B actuel les met à **`null`** / **`false`** ; l’admin peut encore les afficher pour l’historique.

### 10.4 RGPD

**`POST /api/admin/cleanup-leads`** : anonymisation des leads dont la création remonte à **plus de 3 ans** (bouton sur la page Leads). Traçabilité dans l’audit.

---

## 11. Flux de données (résumé)

```
Visiteur (B2B, B2C ou webinaire)
        ↓
POST /api/leads ou POST /api/leads/webinaire
        ↓
Validation, rate limit, anti-bot
        ↓
Insert leads (Supabase) + score + statut
        ↓
E-mails teaser (non bloquant) → partners (segment)
        ↓
[Optionnel] Webhook signé → CRM / outil externe
        ↓
Admin : leads, assignation, export, marketplace, marketeurs, candidatures, audit
        ↓
Partenaires : feed marketplace, crédits, purchase_lead
```

---

## 12. Fichiers et variables (index rapide)

| Rôle | Emplacement |
|------|-------------|
| Simulateur B2B | `components/roi-simulator.tsx` |
| Simulateur B2C | `components/b2c-simulator.tsx` |
| Tracking marketeur | `components/media-partner-ref-tracker.tsx` |
| Schéma / validation lead | `lib/leads-schema.ts`, `lib/leads-validation.ts` |
| API leads / webinaire | `app/api/leads/route.ts`, `app/api/leads/webinaire/route.ts` |
| Score | `lib/lead-score.ts` |
| E-mail installateur | `lib/notify-installateur.ts` |
| Teaser partenaires | `lib/partner-lead-teaser-email.ts` |
| Candidature installateur | `app/api/installateurs/register`, `lib/installer-registration-schema.ts` |
| Auth partenaire | `lib/partner-auth.ts` |
| API partenaires / paiement | `app/api/partners/*`, `app/api/payments/revolut/route.ts` |
| Panel admin | `app/admin/(dashboard)/`, `components/admin-nav.tsx` |
| API admin | `app/api/admin/` |
| Audit | `lib/audit-log.ts` |
| **Stack / déploiement général** | `DOCUMENTATION.md` (si présent) |

Variables courantes : voir **section 14** (y compris **`RESEND_API_KEY`**, **`RESEND_FROM_EMAIL`**, **`PARTNER_LEAD_ALERT_EMAILS`** pour les e-mails).

---

## 13. Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | **Next.js** (App Router) |
| Styles | **Tailwind CSS** + `globals.css` |
| Animations | **Framer Motion** |
| UI | **shadcn/ui** (`components/ui/`) |
| Backend / Auth / DB | **Supabase** (PostgreSQL, Auth JWT, RLS) |
| Hébergement typique | **Vercel** + variables d’environnement |

Sans **`SUPABASE_SERVICE_ROLE_KEY`**, les routes utilisant **`createServiceRoleClient()`** échouent au runtime.

---

## 14. Variables d’environnement (détail)

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (client / server cookies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** — contourne la RLS ; routes API sensibles |
| `NEXT_PUBLIC_SITE_URL` | URL canonique (SEO, metadata) |
| `ADMIN_EMAILS` | E-mails autorisés **admin** (virgules, casse ignorée) |
| `LEAD_WEBHOOK_URL` | (Optionnel) Webhook après création lead |
| `LEAD_WEBHOOK_SECRET` | (Optionnel) HMAC corps webhook |
| `NEXT_PUBLIC_CALENDLY_URL` | (Optionnel) Lien post-simulation B2B |
| `RESEND_API_KEY` | (Optionnel mais requis pour de vrais envois) Clé **Resend** pour e-mails assignation + teasers partenaires |
| `RESEND_FROM_EMAIL` | Expéditeur Resend (défaut `onboarding@resend.dev` si absent) |
| `PARTNER_LEAD_ALERT_EMAILS` | (Optionnel) Liste d’e-mails (virgules) **ajoutés** aux destinataires des **teasers** marketplace (en plus des e-mails issus de la table **`partners`**) |

Sans **`RESEND_API_KEY`**, **`notify-installateur`** et **`partner-lead-teaser-email`** **ne partent pas** : un **`console.log`** simule l’envoi (voir les fichiers dans `lib/`).

---

## 15. Arborescence logique du code

- **`app/`** — Pages, layouts, **`app/api/*`**
- **`components/`** — Marketing, simulateurs, admin-nav, UI
- **`lib/`** — Auth, Zod, scoring, rate limit, Supabase
- **`scripts/`** — SQL **manuel** dans l’éditeur Supabase (ordre ci-dessous)

---

## 16. Supabase — migrations et modèle

### 16.1 Ordre des scripts (`scripts/`)

1. `001` → `011` : schéma `leads`, installateurs, champs métier.
2. **`009_audit_log.sql`** (si utilisé sur le projet) : table **`audit_log`** pour l’admin.
3. **`012_admin_and_partners_schema.sql`** : `admin_users`, `partners`, `lead_distributions`, RLS, `is_admin()`, `current_partner_id()`, etc.
4. **`013_add_segments.sql`** : segments leads / partenaires.
5. **`014_media_partners.sql`** : `media_partners`, `leads.media_partner_code`.
6. **`015_marketplace_purchases.sql`** : `lead_purchases`, `credit_transactions`, RPC **`purchase_lead`**, **`add_credits`**, RLS.
7. **`016_installer_applications.sql`** : candidatures.
8. **`017_fix_lead_purchases_credits_spent.sql`** : si `lead_purchases` sans **`credits_spent`**, ajout + re-déploiement de **`purchase_lead()`**.

L’ordre exact peut varier selon l’historique du projet Supabase : en cas de doute, comparer les dépendances entre scripts et l’état réel des tables.

### 16.2 Tables clés

| Table | Rôle |
|-------|------|
| **`leads`** | PII, segment, province, score, statut, marketplace, `credit_cost`, `media_partner_code`, … |
| **`installateurs`** | Référentiel **assignation** classique + notifications. |
| **`partners`** | Marketplace : crédits, email, `auth_user_id`, ciblage, `segment`. |
| **`lead_distributions`** | Lead ↔ partenaire (notified / unlocked / …), RLS. |
| **`lead_purchases`** | Achat : `(lead_id, partner_id)` unique, `credits_spent`, … |
| **`credit_transactions`** | Journal crédits (`purchase`, `topup`, `adjustment`). |
| **`media_partners`** | Marketers : code, commissions B2B/B2C, statut. |
| **`installer_applications`** | Candidatures pending / approved / rejected. |
| **`admin_users`** | Admins côté RLS (complément à `ADMIN_EMAILS`). |
| **`audit_log`** | Journal des actions admin (export, nettoyage RGPD, etc.) si migration `009` appliquée. |

### 16.3 RPC

- **`purchase_lead(p_lead_id, p_partner_id)`** : disponibilité, places (ex. B2C = 3 acheteurs, B2B = 1), solde, débit **`partners`**, `lead_purchases` + `credit_transactions`, `lead_distributions`, **`sold_out`** si épuisé.
- **`add_credits(...)`** : crédit + journal.

**SECURITY DEFINER** — appels depuis API Next avec **service role**, contrôle d’identité dans le code.

### 16.4 RLS (principe)

- **Admin** : `is_admin()` ou service role côté API.
- **Partenaire** : `current_partner_id()` pour ses données.
- **Leads** : visibilité partenaire liée à **`lead_distributions`** / achats (selon migrations).

Les routes critiques utilisent **`createServiceRoleClient()`** tout en vérifiant admin / `partners` / marketeur en application.

---

## 17. Portail installateur — marketplace (API + Revolut)

### 17.1 Pages

| Route | Rôle |
|-------|------|
| `/partenaires/dashboard` | Feed `marketplace_status = available`, teaser, FOMO B2C (3 places), déblocage |
| `/partenaires/dashboard/credits` | Packs + paiement (démo ou prod) |

### 17.2 API partenaire

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/partners/marketplace` | Liste, slots, « déjà acheté » |
| POST | `/api/partners/purchase` | `{ leadId }` → **`purchase_lead`** |
| GET | `/api/partners/credits` | Solde, transactions, achats |

Les **POST** `/api/partners/*` : header **`x-admin-request`** (convention CSRF, nom historique).

### 17.3 Crédits et paiement Revolut Pay

**Démo** : solde initial **0** ; **`POST /api/payments/revolut`** accepte un JSON minimal (`event`, `partnerId`, `packId`, `transactionId`) et crédite via **`add_credits`** — **pas** un vrai paiement.

**Production (Revolut Merchant)** — à implémenter dans la même route ou webhook dédié :

1. Compte **Revolut Business** + **Merchant API** ([guide](https://developer.revolut.com/docs/guides/accept-payments/get-started/make-your-first-payment)).
2. Clés **sandbox** puis **prod** en variables serveur (ex. `REVOLUT_MERCHANT_API_KEY`, jamais exposées au navigateur).
3. **Order** côté backend avec montant du pack (`app/api/payments/revolut/route.ts`, `app/partenaires/dashboard/credits/page.tsx`) ; **metadata** : au minimum **`partnerId`** (UUID `partners.id`) et **`packId`** (`pack_10`, `pack_50`, `pack_100`).
4. Webhook Revolut vers URL publique (ex. `/api/payments/revolut`) ; [création webhook](https://developer.revolut.com/docs/merchant/2024-05-01/create-webhook).
5. **Vérifier** signature HMAC `Revolut-Signature` / `Revolut-Request-Timestamp` ; anti-replay ([verify payload](https://developer.revolut.com/docs/guides/accept-payments/tutorials/work-with-webhooks/verify-the-payload-signature)).
6. **Idempotence** avant **`add_credits`** (transaction / `order_id` déjà traité).
7. Frontend : widget ou checkout Revolut documenté, avec `order_id` serveur.

---

## 18. Portail marketeur — API

- **`GET /api/media-partners/stats`**, **`GET /api/media-partners/leads`** (selon implémentation).
- CSRF **`x-admin-request`** si le middleware protège ces routes.

---

## 19. Sécurité globale (`middleware.ts`)

- Headers : HSTS (prod), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, **CSP** (notamment `connect-src` vers Supabase, analytics, etc. — voir le fichier pour la liste exacte).
- **CSRF** renforcé sur **POST, PUT, DELETE, PATCH** uniquement pour les chemins **`/api/admin/*`**, **`/api/media-partners/*`**, **`/api/partners/*`** : présence du header **`x-admin-request`** (valeur truthy côté code client) **et**, si l’en-tête **`Origin`** est envoyé, égalité **`origin.host`** avec **`Host`**. Les **GET** sur ces préfixes ne sont pas soumis à cette règle.
- Les routes **publiques** de conversion (**`/api/leads`**, **`/api/leads/webinaire`**, **`/api/installateurs/register`**, **`/api/payments/revolut`**) **ne passent pas** par ce garde-fou CSRF (pas de `x-admin-request` requis).

**Fichier** : `middleware.ts` ; **`export const config.matcher`** limite l’exécution (exclusion `_next/static`, `favicon.ico`, etc.).

---

## 20. Flux métier récapitulatifs

1. **Visiteur → lead** : simulateur → validation → **`leads`** → (optionnel) webhook → teasers **`partners`**.
2. **Candidature → marketplace** : `/partenaires` → **`installer_applications`** → approbation → **`installateurs`** + **`partners`** (0 crédit) → login **`/partenaires/login`** ; crédits : Revolut prod ou admin.
3. **Achat lead** : `POST /api/partners/purchase` → **`purchase_lead`** → PII débloquées côté client.
4. **Commission marketeur** : **`media_partner_code`** sur le lead → suivi admin **Leads** + **Media partners** (`commission_b2b` / `commission_b2c`).

---

## 21. Maintenance

- Après **pull** : exécuter les nouveaux **`scripts/*.sql`** sur Supabase si besoin.
- Erreur **colonne `credits_spent` absente** : **`scripts/017_fix_lead_purchases_credits_spent.sql`**.
- Ne jamais commiter ni exposer **`SUPABASE_SERVICE_ROLE_KEY`**.

---

## 22. Contexte pour une IA (comment utiliser ce document)

### 22.1 Ce que ce document permet

- Expliquer **les parcours** (B2B, B2C, webinaire, partenaires, marketeurs, admin) et **où** ils vivent dans le repo (sections 1 à 11, 17 à 20).
- Expliquer **la donnée** : tables Supabase, RPC, RLS en résumé (section 16).
- Expliquer **la sécurité** : CSRF sur quelles API, pourquoi le header s’appelle `x-admin-request` alors qu’il protège aussi partenaires et marketeurs (section 19).
- Orienter vers les **fichiers** et **variables d’environnement** à lire pour une réponse au niveau code (sections 12, 14, 15).

### 22.2 Ce que ce document ne remplace pas

- Le **code source** : comportement exact, conditions d’erreur, champs `select` Supabase, textes UI.
- L’état **réel** de la base Supabase (migrations partiellement appliquées, données de prod).
- Les **secrets** (jamais dans le dépôt) : `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, clés Revolut, etc.
- **`DOCUMENTATION.md`** : complément possible sur déploiement, stack versions, branding (vérifier la cohérence avec le code si une phrase semble ancienne).

**Règle pour une IA** : si la question est « que fait l’utilisateur / le métier ? », priorité à ce fichier ; si « pourquoi cette erreur 403 / ce champ null ? », ouvrir **`middleware.ts`**, la route **`app/api/.../route.ts`** et **`lib/*`** cités.

### 22.3 Pièges fréquents (à ne pas confondre)

| Piège | Précision |
|-------|-----------|
| **`installateurs` vs `partners`** | **`installateurs`** = référentiel **assignation manuelle** par l’admin + e-mail Speed-to-Lead. **`partners`** = comptes **marketplace** (crédits, Auth, feed, `purchase_lead`). Un même acteur métier peut exister dans les deux tables après **approbation** d’une candidature. |
| **`x-admin-request`** | Nom **historique** ; requis pour les **mutations** sur admin, `/api/partners`, `/api/media-partners`, **pas** pour `POST /api/leads`. |
| **Teasers vs assignation** | Teasers = e-mails **anonymisés** aux **`partners`** (segment) + option **`PARTNER_LEAD_ALERT_EMAILS`**. Assignation = lien lead → ligne **`installateurs`** + e-mail **avec PII** via **`notify-installateur`**. |
| **Revolut** | La route **`/api/payments/revolut`** est un **stub** tant que la prod n’est pas câblée (section 17.3). |
| **Lead « message »** | Côté API leads, le champ **`message`** / **`project_details`** en base peut agréger **précision de localisation** + texte projet (voir `app/api/leads/route.ts`). |

### 22.4 Routes applicatives (hors API) utiles

| Préfixe | Rôle |
|---------|------|
| `/admin`, `/admin/login`, `/admin/dashboard`, `/admin/leads`, `/admin/installateurs`, `/admin/partners`, `/admin/media-partners`, `/admin/applications`, `/admin/audit` | Panel admin |
| `/partenaires`, `/partenaires/login`, `/partenaires/dashboard`, `/partenaires/dashboard/credits` | Public installateurs + espace marketplace |
| `/media-partners`, `/media-partners/login`, `/media-partners/dashboard` | Public + espace marketeur |

**SEO** : `app/sitemap.ts`, `app/robots.ts`.

### 22.5 Inventaire des routes API (`app/api/**/route.ts`)

Méthodes relevées dans le code au moment de la rédaction de ce document (vérifier le fichier si comportement douteux).

| Méthode(s) | Chemin |
|------------|--------|
| POST | `/api/leads` |
| POST | `/api/leads/webinaire` |
| POST | `/api/installateurs/register` |
| POST | `/api/payments/revolut` |
| GET | `/api/partners/marketplace` |
| GET | `/api/partners/credits` |
| POST | `/api/partners/purchase` |
| GET | `/api/media-partners/stats` |
| GET | `/api/media-partners/leads` |
| GET | `/api/admin/stats` |
| GET | `/api/admin/leads` |
| GET, PATCH | `/api/admin/leads/[id]` |
| GET | `/api/admin/leads/export` |
| POST | `/api/admin/leads/[id]/notify-installateur` |
| POST | `/api/admin/cleanup-leads` |
| GET | `/api/admin/audit` |
| GET, POST | `/api/admin/installateurs` |
| PATCH, DELETE | `/api/admin/installateurs/[id]` |
| GET | `/api/admin/partners` |
| PATCH | `/api/admin/partners/[id]` |
| GET | `/api/admin/media-partners` |
| PATCH | `/api/admin/media-partners/[id]` |
| GET | `/api/admin/applications` |
| PATCH | `/api/admin/applications/[id]` |
| POST | `/api/admin/logout` |

**Authentification** : les routes admin / partenaire / marketeur s’attendent en général à une **session Supabase** (cookies) **et** à des contrôles applicatifs dans la route (`getAdminUser`, `getPartner`, etc.). Le détail est dans chaque `route.ts` et les fichiers `lib/*-auth.ts`.

### 22.6 Carte sujet → sections

| Sujet | Sections |
|-------|----------|
| Tunnel simulateur B2B, validation | 3, 4 |
| B2C, webinaire | 6 |
| Tracking affiliation | 5 |
| Webhook CRM | 4, 8.1, 14 |
| Marketplace, crédits, achat lead | 8.2, 8.3, 17, 20 |
| Candidature installateur | 7, 20 |
| Admin, RGPD, export | 10, 20, 21 |
| Schéma BDD, RPC, RLS | 16 |
| CSRF, headers | 19 |
| Variables d’environnement | 14, 22.3 (e-mail) |

---

*Document unique — à mettre à jour lors des évolutions de schéma, routes ou parcours (notamment l’inventaire API section 22.5 si de nouvelles routes sont ajoutées).*
