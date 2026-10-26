# Cockpit Opérationnel & Dashboard Admin — Spécifications UI/UX (Fintech Slate & Solar Trust)

> **RÈGLE HIÉRARCHIQUE UI-UX-PRO-MAX :** Ce document définit les règles de composition, d'information-density et d'interaction pour la page `/admin/dashboard` (Cockpit Opérationnel).
> Il complète et décline le document maître `design-system/aegis-solaire/MASTER.md`.

---

## 1. Objectif & Expérience Utilisateur (Cockpit Admin)

Le dashboard d'administration d'Aegis Solaire est la **tour de contrôle opérationnelle et financière** du tiers de confiance photovoltaïque en Wallonie.
- **Rôle principal :** Arbitrage en temps réel des leads entrants, validation instantanée des virements bancaires SEPA, supervision de la liquidité du catalogue marketplace (sell-through rate), et gestion des invitations d'installateurs signées Fabrice Remacle.
- **Inspirations :** Qonto Business Cockpit, Stripe Dashboard, Linear Triage, Supabase Platform.
- **Densité d'information :** Élevée (Tier 9/10 `ui-ux-pro-max`), typographie chirurgicale, chiffres à chasse fixe (`font-mono tabular-nums`), zero latence perçue avec Streaming SSR (`Suspense`).

---

## 2. Tokens & Couleurs Sémantiques

- **Surfaces :**
  - Fond de page : `bg-background` (`#FFFFFF`)
  - Cartes et panneaux : `bg-card` (`#FFFFFF`)
  - Conteneurs secondaires : `bg-secondary` (`#F1F5F9`)
  - Sections d'information tamisée : `bg-muted` (`#F8FAFC`)
- **Textes & Hiérarchie :**
  - Titre principal et chiffres clés : `text-foreground` (`#0F172A`)
  - Descriptions et métadonnées : `text-muted-foreground` (`#64748B`)
  - Accents Tech & Actions : `bg-accent` (`#2563EB`), `text-accent`, `text-accent-foreground`
  - Accents Solaires & Énergie : `text-accent-solar` (`#F59E0B`), `bg-accent-solar`
- **Bordures & Contours :** `border-border` (`#E2E8F0`, 1px net)
- **Chiffres financiers & techniques :** `font-mono tabular-nums` obligatoire sur les montants (`€ HTVA`, `€ TTC`), crédits (`cr.`), taux d'écoulement (`%`), scores de leads (`/100`), dates et heures (`HH:mm`).

---

## 3. Architecture Bento du Dashboard

1. **Header Cockpit Opérationnel :**
   - Unique `<h1>` : *Cockpit & Supervision Aegis Solaire*
   - Badge statut : Indicateur de santé système temps réel avec pulse vert
   - Boutons d'accès rapide : *Triage Leads*, *Finances SEPA*, *Réseau Installateurs*
2. **Tour de Contrôle des Actions Requises (`ActionRequiredTray`) :**
   - Synthèse des urgences opérationnelles sous SLA 24h
   - Onglets de tri instantané : Litiges en attente, Virements SEPA à pointer, Leads en attente de publication
   - Validation en 1 clic avec Server Actions asynchrones et retours sonner toasts
3. **Grille Bento de Performance Financière & Marketplace (`AdminKpiGrid`) :**
   - Ligne 1 (4 métriques majeures) : CA Validé HTVA, Taux d'Écoulement Catalogue, Stock de Leads en Vente, Réseau Partenaires & Crédits en circulation
   - Ligne 2 (3 métriques stratégiques) : Flux d'Acquisition (B2B vs B2C avec jauge), Trésorerie SEPA en Cours, Commissions Partenaires Média
   - Modales d'inspection transparente : Décomposition mathématique et échantillon de données réelles pour chaque KPI
4. **Hub d'Invitation Réseau Grossiste — Fabrice Remacle (`AdminNetworkInviteHub`) :**
   - Outil de prospection personnalisé avec modèles persistants (Tutoiement, Vouvoiement, WhatsApp)
   - Liens tracés avec attribution automatique de crédits de découverte
5. **Dernières Activités & Journal d'Audit (`AdminRecentActivity`) :**
   - Tableau en direct des 8 derniers leads enregistrés avec badges de segment, province, score et bouton d'inspection
   - Fil d'audit de sécurité des 6 dernières actions administratives

---

## 4. Règles d'Accessibilité & Performance

- Respect strict de WCAG AA : Contraste de texte >= 4.5:1 sur toutes les surfaces.
- Focus rings visibles au clavier (`focus-visible:ring-2 focus-visible:ring-ring`).
- Tableaux avec scroll horizontal fluide (`overflow-x-auto`) sans altérer le viewport sur mobile.
- Suspense streaming avec Skeleton harmonisé en design tokens (zéro flash blanc).
