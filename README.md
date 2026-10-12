# Aegis Solaire

Plateforme de **génération et mise en relation de leads photovoltaïques** en Wallonie. Cible les décideurs B2B (DAF, RSE, dirigeants) soumis aux obligations PEB, Plan PACE 2030 et Directive UE 2024/1275, ainsi que les particuliers wallons. Les leads qualifiés sont distribués à un réseau d'installateurs RESCERT Photovoltaïque via une **marketplace avec système de crédits**.

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| **[docs/FONCTIONNEMENT-SITE.md](./docs/FONCTIONNEMENT-SITE.md)** | **Référence principale** — parcours B2B, B2C, webinaire, marketplace partenaires, marketeurs, panel admin, base de données, sécurité, variables d'environnement |
| [docs/DIRECTION-ARTISTIQUE.md](./docs/DIRECTION-ARTISTIQUE.md) | Palette, typographie, composants, règles d'or UI |
| [docs/GUIDE-CONFIGURATION.md](./docs/GUIDE-CONFIGURATION.md) | Mise en production pas à pas : Supabase, .env, Vercel, compte admin |
| [docs/GUIDE-EMAILS-GRATUITS.md](./docs/GUIDE-EMAILS-GRATUITS.md) | Intégration Resend / Brevo pour les e-mails transactionnels |
| [docs/CALCULATEUR-ROI.md](./docs/CALCULATEUR-ROI.md) | Formules et messages du simulateur ROI (simulateur B2B) |
| [docs/PLAN-ADMIN.md](./docs/PLAN-ADMIN.md) | Architecture et phases du panel admin |
| [docs/PLAN-FACTURATION-INSTALLATEURS.md](./docs/PLAN-FACTURATION-INSTALLATEURS.md) | Options de facturation des leads aux installateurs |
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Stack technique, déploiement, variables d'environnement (complément) |
| [emails/GUIDE-CAMPAGNE.md](./emails/GUIDE-CAMPAGNE.md) | Guide de campagne outreach installateurs & media buyers |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styles | Tailwind CSS 4, Shadcn/UI (Radix), `tw-animate-css` |
| Animations | Framer Motion |
| Base de données / Auth | Supabase (PostgreSQL, RLS, Auth JWT) |
| E-mails transactionnels | Resend (via `RESEND_API_KEY`) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Analytics | Vercel Analytics |
| Hébergement | Vercel |

---

## Démarrage local

```bash
pnpm install
# Copier .env.local (voir docs/GUIDE-CONFIGURATION.md pour les variables obligatoires)
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Structure du projet

```
app/              Pages, layouts, routes API (App Router)
components/       Composants marketing, simulateurs, admin-nav, UI
lib/              Auth, schémas Zod, scoring, rate-limit, Supabase
scripts/          Scripts SQL à exécuter manuellement dans Supabase
docs/             Documentation et guides
emails/           Templates HTML outreach + guide de campagne
public/           Assets statiques (logo, images, robots.txt, llms.txt)
styles/           globals.css
```

---

## Commandes

```bash
pnpm dev      # Serveur de développement
pnpm build    # Build de production
pnpm lint     # ESLint
```
