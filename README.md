# Aegis Solaire

Plateforme de **génération et mise en relation de leads photovoltaïques qualifiés** en Wallonie (Belgique). Cible les décideurs B2B (DAF, RSE, dirigeants) soumis aux obligations PEB 2026, Plan PACE 2030 et Directive UE 2024/1275, ainsi que les propriétaires résidentiels wallons. 

Les opportunités vérifiées manuellement sont distribuées à un réseau d'installateurs certifiés RESCERT via une **marketplace privative avec système de crédits**.

- **Exploitant légal :** INIT42 (Nathan Remacle, personne physique en transition SRL) · BCE `1039.899.980` · TVA `BE 1039.899.980` · Liège, Belgique.
- **Direction & Équipe :** 
  - **Nathan Remacle** : Fondateur & Architecte Logiciel (étudiant ingénieur civil à Liège, concepteur de la plateforme avec l'IA Antigravity / Gemini).
  - **Fabrice Remacle** : Chief Technical Advisor (expert photovoltaïque, onduleurs et batteries en Wallonie, formateur d'installateurs, en poste chez PhotonSolar à Fléron).

---

## Documentation de Référence

| Fichier | Contenu & Statut |
|---|---|
| **[BUSINESS-PLAN.md](./BUSINESS-PLAN.md)** | **Dossier d'évaluation stratégique & financière** — P&L prévisionnel à 3 ans, unit economics, modèle de crédits, gouvernance Nathan & Fabrice Remacle, consultance B2B. |
| **[FORMULAIRES.md](./FORMULAIRES.md)** | **Inventaire exhaustif des formulaires** — Analyse détaillée des 10+ tunnels de capture (accueil B2B, `/particuliers`, `/devis-panneaux-solaires`, candidatures, portails), schémas Zod et validation. |
| **[docs/FONCTIONNEMENT-SITE.md](./docs/FONCTIONNEMENT-SITE.md)** | **Architecture & fonctionnement global** — Parcours utilisateurs, modèle de données Supabase, API, sécurité CSRF/RLS, packs de crédits par virement bancaire. |
| **[docs/AUDIT-GLOBAL-SITE.md](./docs/AUDIT-GLOBAL-SITE.md)** | **Audit global & conformité légale** — Synthèse de l'audit d'octobre 2026 (légalité INIT42, compte pro, RGPD, suppression faux avis, moteur solaire). |
| **[docs/ETAT-DU-SITE.md](./docs/ETAT-DU-SITE.md)** | **État du site & Reste à faire** — Bilan des 16 points résolus et checklist opérationnelle avant lancement publicitaire Meta/Google Ads. |
| **[docs/DIRECTION-ARTISTIQUE.md](./docs/DIRECTION-ARTISTIQUE.md)** | **Charte graphique & UI/UX** — Palette (Bleu Nuit, Or Solaire), tokens Tailwind, typographie Inter/DM Sans et design system. |
| **[docs/RAPPORT-MARCHE-WALLONIE.md](./docs/RAPPORT-MARCHE-WALLONIE.md)** | **Étude de marché B2B Wallonie** — Analyse réglementaire (PEB 2026, PACE 2030, Directive UE 2024/1275, fiscalité DPI 40 %). |
| **[docs/VISION-ADMIN-PARFAIT.md](./docs/VISION-ADMIN-PARFAIT.md)** | **Roadmap du Dashboard Admin** — Recommandations ergonomiques et backlog d'améliorations pour l'administration des leads et installateurs. |
| **[docs/JOURNAL-DE-BORD.md](./docs/JOURNAL-DE-BORD.md)** | **Journal de bord & logs de suivi** — Suivi chronologique horodaté des interventions techniques, fonctionnelles et stratégiques. |
| **[PROMPTS D'AUDIT IA](./PROMPT-ET-CONTEXTE-AUDIT-EXPERT.md)** | Dossiers de prompts maîtres pour challenger la plateforme via LLMs externes ([Expert](./PROMPT-ET-CONTEXTE-AUDIT-EXPERT.md), [UI/UX CRO](./PROMPT-ET-CONTEXTE-AUDIT-UI-UX-CRO.md), [Perf & DB](./PROMPT-ET-CONTEXTE-AUDIT-DASHBOARD-PERF.md)). |

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
# Configurer .env.local (Supabase, Resend, etc.)
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
