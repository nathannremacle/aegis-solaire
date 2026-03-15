# Aegis Solaire

Plateforme de mise en relation (lead generation) dédiée au photovoltaïque B2B pour les entreprises et l'industrie (C&I). Cible : décideurs souhaitant équiper toitures (> 500 m²) ou parkings (> 1 500 m²) pour la conformité Loi LOM et Décret Tertiaire.

**→ Fonctionnement détaillé, déploiement (Vercel / Digital Ocean) et architecture : voir [DOCUMENTATION.md](./DOCUMENTATION.md).** Ce fichier est tenu à jour à chaque modification ou ajout sur le site.

## Stack technique

- **Framework** : Next.js 16 (App Router), React 19, TypeScript
- **UI** : Tailwind CSS 4, composants Shadcn/UI
- **Backend** : Supabase (PostgreSQL) pour les leads
- **Analytics** : Vercel Analytics

## Démarrage

```bash
pnpm install
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Structure

- `app/` — Pages et routes (landing, mentions légales, politique de confidentialité, CGV, API leads)
- `components/` — Header, Footer, Hero, Simulateur ROI multi-étapes, Expert, Témoignages
- `lib/` — Utilitaires, client/serveur Supabase
- `scripts/` — SQL création table `leads`

## Fonctionnalités

- **Landing** : Hero, avantages, expertise, témoignages, CTA vers simulateur
- **Simulateur ROI** : Formulaire multi-étapes (type de surface, surface, facture annuelle, calcul ROI, capture lead avec consentement RGPD)
- **API** : `POST /api/leads` — enregistrement lead + préparation webhook CRM
- **SEO** : métadonnées, sitemap, robots, JSON-LD (Organization, WebSite)
- **RGPD** : consentement explicite, mentions sous formulaire, politique de confidentialité, droit d’opposition/suppression

## Variables d'environnement

- `NEXT_PUBLIC_SITE_URL` — URL canonique du site (ex. `https://www.aegissolaire.com`) pour SEO et liens absolus
- Variables Supabase : voir `lib/supabase/client.ts` et `lib/supabase/server.ts`

## Ressources

- [Documentation Next.js](https://nextjs.org/docs)
- [Shadcn/UI](https://ui.shadcn.com)
- [Supabase](https://supabase.com/docs)
