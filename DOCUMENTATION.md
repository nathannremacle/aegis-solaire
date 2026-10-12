# Documentation technique — Aegis Solaire

> **Référence métier et fonctionnelle :** [`docs/FONCTIONNEMENT-SITE.md`](./docs/FONCTIONNEMENT-SITE.md) — parcours, base de données, sécurité, API.
> Ce fichier-ci est le complément **technique** : stack exacte, versions, déploiement, variables d'environnement, branding.

---

## 1. Stack technique

| Élément | Technologie |
|---------|-------------|
| Framework | **Next.js 16** (App Router), **React 19**, TypeScript 5.7 |
| Styles | **Tailwind CSS 4**, `tw-animate-css`, composants **Shadcn/UI** (Radix) |
| Animations | **Framer Motion** |
| Formulaires | Champs contrôlés + **Zod** (schémas dans `lib/`) |
| Base de données / Auth | **Supabase** (PostgreSQL hébergé, RLS, Auth JWT, cookie SSR via `@supabase/ssr`) |
| Envoi d'e-mails | **Resend** (`resend` SDK, variable `RESEND_API_KEY`) |
| Rate limiting | **Upstash Redis** (`@upstash/ratelimit`, variables `UPSTASH_*`) |
| Analytics | **Vercel Analytics** (`@vercel/analytics`) |
| Hébergement front / API | **Vercel** (compatible serverless, App Router) |
| Responsive | Mobile-first, breakpoints `sm:640px md:768px lg:1024px`, safe-area encoches, zones touch ≥ 44 px |
| Branding | Logo horizontal `/public/logo.png` (header, footer). Couleurs CSS via tokens Tailwind : `--primary` `#001D3D` (Bleu Nuit), `--accent` `#FFB800` (Or Solaire), fond global `#fafafa`. Voir [`docs/DIRECTION-ARTISTIQUE.md`](./docs/DIRECTION-ARTISTIQUE.md). |

---

## 2. Variables d'environnement

> Voir aussi `docs/GUIDE-CONFIGURATION.md` pour la procédure complète.

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique (client / cookies SSR) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secret** — bypass RLS, routes API admin/partenaires |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL canonique (sitemap, metadata, OG) |
| `ADMIN_EMAILS` | ✅ | E-mails admin séparés par virgule (sans espaces) |
| `RESEND_API_KEY` | Recommandé | E-mails transactionnels (assignation leads, teasers partenaires) |
| `RESEND_FROM_EMAIL` | — | Expéditeur Resend (défaut : `onboarding@resend.dev`) |
| `PARTNER_LEAD_ALERT_EMAILS` | — | E-mails supplémentaires pour les teasers marketplace |
| `LEAD_WEBHOOK_URL` | — | POST JSON après création d'un lead (CRM externe) |
| `LEAD_WEBHOOK_SECRET` | — | Signature HMAC du webhook |
| `NEXT_PUBLIC_CALENDLY_URL` | — | Lien post-simulation B2B (bouton RDV) |
| `NEXT_PUBLIC_FOUNDER_VIDEO_URL` | — | URL YouTube/Vimeo section Expert |
| `UPSTASH_REDIS_REST_URL` | — | Rate limiting (requis si `lib/rate-limit.ts` utilise Upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | — | Token Upstash |

---

## 3. Arborescence des routes

```
/                             Accueil B2B (landing + simulateur ROI B2B)
/particuliers                 Segment résidentiel (simulateur B2C)
/partenaires                  Programme installateurs + candidature
/partenaires/login            Connexion marketplace
/partenaires/dashboard        Feed leads marketplace + achat crédits
/media-partners               Programme marketeurs (affiliation)
/media-partners/login
/media-partners/dashboard
/webinaire                    Inscription webinaire
/faq-technique                FAQ
/mentions-legales
/politique-confidentialite
/cgv
/admin/login                  Connexion admin
/admin/dashboard              Tableau de bord
/admin/leads                  Gestion leads
/admin/installateurs          CRUD installateurs (assignation classique)
/admin/partners               Gestion partenaires marketplace
/admin/media-partners         Gestion marketeurs
/admin/applications           Candidatures installateurs
/admin/audit                  Journal d'audit
```

**Sitemap** : `app/sitemap.ts` (zones `/admin`, `/partenaires/dashboard`, `/media-partners/dashboard` **non indexées**).

---

## 4. Fichiers clés

| Rôle | Fichier(s) |
|------|------------|
| Layout global, métadonnées, JSON-LD | `app/layout.tsx`, `components/json-ld.tsx` |
| Simulateur B2B | `components/roi-simulator.tsx` |
| Simulateur B2C | `components/b2c-simulator.tsx` |
| Tracking marketeur | `components/media-partner-ref-tracker.tsx` |
| Schéma / validation leads | `lib/leads-schema.ts`, `lib/leads-validation.ts` |
| API leads | `app/api/leads/route.ts`, `app/api/leads/webinaire/route.ts` |
| Scoring | `lib/lead-score.ts` |
| E-mail installateur | `lib/notify-installateur.ts` |
| Teaser partenaires | `lib/partner-lead-teaser-email.ts` |
| Auth admin | `lib/admin-auth.ts`, `getAdminUser()` |
| Auth partenaire | `lib/partner-auth.ts`, `getPartner()` |
| Audit | `lib/audit-log.ts` |
| Supabase (client / server) | `lib/supabase/client.ts`, `lib/supabase/server.ts` |
| Middleware (CSRF, headers sécurité) | `middleware.ts` |
| SEO | `app/sitemap.ts`, `app/robots.ts` |
| Scripts SQL | `scripts/001` → `scripts/017` (voir `docs/FONCTIONNEMENT-SITE.md` §16) |

---

## 5. Déploiement Vercel

1. **Connecter** le dépôt Git sur [vercel.com](https://vercel.com).
2. **Framework preset** : Next.js (détecté automatiquement).
3. **Variables d'environnement** : ajouter toutes les variables du tableau §2 (marquer les secrets `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, etc. comme sensibles).
4. Chaque push sur `main` déclenche un redéploiement.
5. Après configuration d'un domaine personnalisé, mettre à jour `NEXT_PUBLIC_SITE_URL`.

> La base de données est sur **Supabase** (PostgreSQL managé). Rien n'est hébergé sur Vercel côté DB.

---

## 6. Supabase — ordre des migrations

Exécuter **dans l'ordre** via SQL Editor de Supabase :

| Script | Contenu |
|--------|---------|
| `001_create_leads_table.sql` | Table `leads`, index, RLS, trigger `updated_at` |
| `002_create_installateurs_table.sql` | Table `installateurs` |
| `003` → `008` | Colonnes additionnelles `leads` (message, score, timeline, installateur_id, objective, wants_irve) |
| `009_audit_log.sql` | Table `audit_log` |
| `012_admin_and_partners_schema.sql` | `admin_users`, `partners`, `lead_distributions`, RLS avancée |
| `013_add_segments.sql` | Segments B2B/B2C sur leads et partenaires |
| `014_media_partners.sql` | `media_partners`, `leads.media_partner_code` |
| `015_marketplace_purchases.sql` | `lead_purchases`, `credit_transactions`, RPC `purchase_lead` / `add_credits` |
| `016_installer_applications.sql` | Table `installer_applications` (candidatures) |
| `017_fix_lead_purchases_credits_spent.sql` | Correctif `credits_spent` si migration partielle |

**Règle** : en cas d'erreur "table already exists", vérifier l'état réel dans Table Editor avant de ré-exécuter.

---

## 7. Historique des mises à jour

- **Création** : landing B2B, simulateur, API leads, panel admin basique, déploiement Vercel.
- **Phase 2** : assignation lead → installateur, export CSV, filtres avancés, logs d'audit.
- **Marketplace** : segment B2C, `/particuliers`, pages `/partenaires` et `/media-partners`, crédits Revolut (stub démo), candidatures.
- **Sécurité** : HSTS, CSP, CSRF renforcé, rate limiting Upstash, signature HMAC webhook.
- **Performance** : images WebP optimisées, `ProgressiveImage`, suppression `unoptimized: true` Next.js.
- **Mise à jour DA** : `docs/DIRECTION-ARTISTIQUE.md` (Light Mode strict, palette institutionnelle).

**Règle** : à chaque modification significative (nouvelles routes, schéma DB, variables), mettre à jour ce fichier **et** `docs/FONCTIONNEMENT-SITE.md`.
