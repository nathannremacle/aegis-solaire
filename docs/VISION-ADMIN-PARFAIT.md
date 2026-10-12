# Vision du Dashboard Admin Parfait — Aegis Solaire

> Document basé sur l'analyse exhaustive du code existant (`app/admin/`, `components/admin-*.tsx`, `lib/lead-score.ts`, `lib/audit-log.ts`, toutes les routes `/api/admin/*`). Ce n'est pas un fantasme générique — chaque suggestion est ancrée dans ce que le code fait déjà, ce qu'il fait à moitié, ou ce qu'il lui manque.

---

## 1. Ce qui existe et fonctionne bien (à ne pas casser)

Avant d'imaginer, honnêteté sur les points acquis et solides :

- **Navigation** : `admin-nav.tsx` avec `usePathname` pour le lien actif, lien "Voir le site", bouton Déconnexion — architecture correcte.
- **Layout** : sidebar fixe 224 px sur desktop, bascule en barre horizontale en mobile — bon.
- **Dashboard** : deux rangées de KPIs (8 métriques), derniers leads cliquables avec lien vers le drawer — logique juste.
- **LeadDetailSheet** : les contrôles urgents (statut + assignation installateur) sont positionnés en premier sans scroller — bonne décision UX.
- **Status badges** : sémantique claire (`blue=nouveau`, `amber=contacté`, `emerald=qualifié`, `primary=converti`, `muted=perdu`).
- **Score badges** : gradient 0–100 en trois paliers avec couleurs.
- **Marketplace partenaires** : ajout de crédits via Dialog, compteurs en tabular-nums — sobre et fonctionnel.
- **Candidatures installateurs** : file d'attente avec distinction `pending / processed`, Dialog de détail + notes admin, toast sur approbation/rejet.
- **Marketeurs** : vue candidatures + marketeurs actifs sur la même page, copie du code ref en un clic — good.
- **Audit** : table `audit_log`, route GET dédiée — une bonne base.

---

## 2. Ce qui est fonctionnel mais incomplet ou frustrant

### 2.1 Recherche — trop limitée

La recherche dans `/admin/leads` ne porte que sur l'**e-mail** (`ilike email`). En production, l'admin cherchera par **nom**, **entreprise**, **numéro TVA** ou **téléphone**. Un champ full-text couvrant ces quatre colonnes est indispensable.

**Amélioration** : remplacer l'`ilike email` par une recherche multi-colonnes :
```sql
first_name ilike %q% OR last_name ilike %q% OR email ilike %q% OR company ilike %q% OR company_vat ilike %q%
```

### 2.2 Sidebar — pas de compteurs d'urgence

Le badge "À traiter" sur les candidatures n'est visible que depuis le **dashboard** ou la **page Candidatures** elle-même. Si l'admin est sur la page Leads, il n'a aucun signal qu'une candidature est en attente.

**Amélioration** : ajouter un badge numérique rouge à côté du lien "Candidatures" dans la sidebar, **chargé au niveau du layout** (server component) — un seul fetch supplémentaire sur `installer_applications` where `status = pending`.

### 2.3 LeadDetailSheet — manque de champ "note interne"

L'admin peut changer le statut et assigner un installateur, mais **aucune note libre** n'est enregistrable sur le lead. Résultat : les informations de suivi (rappelé le 07/04, messagerie vocale, décision après Q2) sont perdues.

**Amélioration** : ajouter une colonne `admin_notes text` sur `leads` et un `<Textarea>` dans le Sheet, sauvegardé via PATCH avec debounce (pas de bouton explicite — save automatique comme Notion).

### 2.4 Filtre segment manquant dans `/admin/leads`

Le code de la page Leads expose les filtres : statut, installateur, date, surface, région — mais **pas le segment B2B/B2C**. Pourtant, la table affiche le segment en colonne, et la requête Supabase supporte `.eq("segment", x)`. L'abandon est inexplicable.

**Amélioration** : ajouter un `<Select>` (Tous / B2B / B2C) dans la barre de filtres, mapped sur le `searchParam` `segment`.

### 2.5 Marketplace — pas de liste de leads achetés par partenaire

La page `/admin/partners` montre le **nombre** de leads achetés mais **aucun détail**. Click sur le compteur → rien. L'admin ne peut pas savoir *quels* leads un partenaire a achetés sans aller chercher dans Supabase directement.

**Amélioration** : au clic sur "X leads achetés", ouvrir un Sheet listant les leads de ce partenaire (join `lead_purchases → leads`), avec nom, segment, statut, date.

### 2.6 Tableau de bord — commissions dues sans détail

Le KPI "Commissions dues" (calculé correctement dans le dashboard) affiche un montant global mais ne drill-down pas. L'admin ne sait pas **qui** doit être payé combien.

**Amélioration** : rendre cette carte cliquable → `/admin/media-partners` avec un ancre ou un filtre "dues > 0" actif pré-appliqué.

---

## 3. Ce qui manque structurellement

### 3.1 Indicateur de "vitesse de réponse" (Speed-to-Lead)

La documentation (`Fonctionnement imaginé`) cite explicitement : *"un prospect recontacté dans les 5 minutes a 100× plus de chances d'être converti"*. Pourtant, **aucun indicateur de délai** n'est affiché dans le panel.

**Ce qu'il faudrait** : dans la table des leads, une colonne supplémentaire "Délai" calculant `now() - created_at` en heures pour les leads au statut `new`. Afficher en **Geist Mono** avec coloration sémantique :
- `< 2h` → `text-emerald-700` (dans les clous)
- `2h–24h` → `text-amber-700` (à traiter)
- `> 24h` → `text-red-700 font-semibold` (retard critique)

Ce seul ajout crée un **sentiment d'urgence immédiat** pour l'opérateur.

### 3.2 Alerte "NEEDS_HUMAN_REVIEW" visible et prioritaire

Les leads marqués `NEEDS_HUMAN_REVIEW` sont critiques (score < 40, données potentiellement fausses ou leads hors cible). Actuellement, ils sont noyés dans la liste globale.

**Ce qu'il faudrait** : une section dédiée dans le **tableau de bord**, juste après les KPIs, listant les `NEEDS_HUMAN_REVIEW` du jour avec un fond `bg-orange-50 border-orange-200`. Chaque ligne est cliquable (→ Sheet de détail). Count affiché en badge orange dans la sidebar.

### 3.3 Vue "Activité récente" dans le tableau de bord

La table "Derniers leads" (10 lignes) existe mais **mélange tous les événements**. Un opérateur a besoin de distinguer rapidement :
- Nouveaux leads entrants
- Statuts changés (par l'admin lui-même)
- Leads achetés sur la marketplace
- E-mails installateurs renvoyés

**Ce qu'il faudrait** : afficher un **fil d'activité** en colonne droite de la page dashboard (layout 2 colonnes sur desktop) issu de `audit_log`, avec des icônes distinctes par type d'action et un timestamp relatif (`il y a 3h`).

### 3.4 Page Installateurs — manque d'information opérationnelle

La page `installateurs` est un CRUD pur (nom, email, téléphone, région, actif). Mais l'admin qui travaille quotidiennement avec son réseau a besoin de voir :
- **Nombre de leads assignés** à chaque installateur
- **Taux de conversion** (leads assignés → `converted`)
- **Dernière assignation** (date)

**Ce qu'il faudrait** : enrichir la query de chargement avec un count de `leads where installateur_id = ?` et le dernier `updated_at` — un join simple. Afficher dans la table en colonnes `Leads assignés` et `Dernier`.

### 3.5 Export CSV — pas de feedback visuel en cours de téléchargement

Le bouton "Exporter CSV" est un `<a href="...">` direct sur `/api/admin/leads/export`. Si la requête prend du temps (5 000 lignes), l'utilisateur ne voit rien. Pas de spinner, pas de confirmation.

**Ce qu'il faudrait** : transformer en `fetch()` programmatique avec état local `loading` + toast "Export en cours…" / "Export prêt — fichier téléchargé" (comme pour les autres actions).

---

## 4. Ce qui manque par manque de recul métier

### 4.1 Recherche globale (Cmd+K)

Aujourd'hui : 7 sections cloisonnées. Si l'admin reçoit un appel d'un prospect dont il n'a que le nom de société, il doit aller dans `/admin/leads`, effacer les filtres, saisir dans la recherche, attendre le reload de page.

**Vision parfaite** : une `<CommandDialog>` (déjà disponible via `cmdk` dans les dépendances) activable par `⌘K` depuis n'importe quelle page. Elle interroge instantanément :
- Leads (nom, email, entreprise, TVA)
- Installateurs (nom)
- Partenaires marketplace (company_name)
- Marketeurs (nom, code ref)

Résultat en liste avec icône de type, clic → navigation directe vers le détail.

### 4.2 Page de login — branding inexistant

`app/admin/login/` n'a pas été lu ici mais d'après la doc elle est fonctionnelle. Il y a fort à parier qu'elle est basique. La page de login est l'unique point d'entrée. Elle devrait afficher :
- Le logo horizontal Aegis Solaire
- Un fond blanc pur (pas `bg-background` gris)
- Le titre "Administration Aegis Solaire" en `text-primary` (`#001D3D`)
- Un lien subtil "← Retour au site" en bas de formulaire

### 4.3 Segment B2C — traitement dissymétrique

Les leads B2C existent (segment `B2C`, simulateur `/particuliers`), sont scorés, apparaissent dans les tables — mais l'admin **ne peut pas les assigner différemment**. Un lead B2C a vocation à aller vers des installateurs spécialisés résidentiel, pas vers les mêmes que les B2B (parkings 3 000 m²).

**Vision** : dans le Sheet de détail, si `segment = B2C`, adapter la liste d'installateurs proposés pour ne montrer que ceux ayant `actif = true` et éventuellement un champ `specialite` futur. En attendant, afficher au minimum un badge `B2C` incontournable en préfixe du sélecteur d'installateur.

---

## 5. La hierachie visuelle idéale (page par page)

### 5.1 `/admin/dashboard`

```
┌── H1 "Tableau de bord"   [date du jour en muted-foreground]
│
├── Bandeau alerte (conditionnel)
│   └── "X leads NEEDS_HUMAN_REVIEW aujourd'hui" [bg-orange-50, border-orange-200]
│
├── Rangée 1 — KPIs Leads (4 cartes)
│   ├── Total (+ B2B / B2C en sous-ligne)
│   ├── Ce mois
│   ├── Aujourd'hui
│   └── [CTA] Voir tous les leads
│
├── Rangée 2 — KPIs Activité (4 cartes)
│   ├── Marketplace : N partenaires · N leads achetés [cliquable]
│   ├── Marketeurs : N actifs · N leads attribués [cliquable]
│   ├── Commissions dues : XX,XX € [amber, cliquable → /admin/media-partners]
│   └── Candidatures : N en attente [rouge si > 0, cliquable]
│
└── Grille 2 colonnes (desktop)
    ├── [Gauche] Derniers leads (table 10 lignes, cliquables)
    └── [Droite] Fil d'activité (audit_log, 15 entrées, timestamps relatifs)
```

### 5.2 `/admin/leads`

```
┌── H1 "Leads" [N résultats en muted-foreground]
│
├── Barre de filtres (ligne 1 — filtres courants)
│   ├── Input full-text (nom / email / entreprise / TVA)
│   ├── Select Statut
│   ├── Select Segment (B2B / B2C / Tous) ← MANQUANT ACTUELLEMENT
│   ├── Select Installateur
│   ├── Bouton Exporter CSV (avec état loading)
│   └── Bouton Nettoyage RGPD
│
├── Barre filtres avancés (ligne 2 — collapsible)
│   ├── Date De / À
│   ├── Surface min (m²)
│   ├── Type surface
│   └── Région installateur
│
└── Table (rounded-xl, border-slate-200, bg-white)
    ├── En-têtes [text-[10px] uppercase tracking-wider text-slate-400]
    │   Date · Nom · Email · Seg · Province · Entreprise · Surface · Facture · Délai · Score · Statut
    │
    └── Lignes [hover bg-slate-50/60, cursor-pointer → Sheet]
        └── Colonne "Délai" colorée selon ancienneté (emerald / amber / red)
```

### 5.3 Lead Detail Sheet (côté droit, `sm:max-w-lg`)

```
┌── Header Sheet
│   ├── Prénom + Nom [text-lg font-semibold]
│   └── ScoreBadge + StatusBadge [côté droit]
│
├── Bloc Actions (bg-muted/30, border, rounded-lg)
│   ├── Select Statut
│   ├── Select Installateur → auto-email
│   ├── Bouton "Renvoyer l'email à l'installateur" [si assigné]
│   └── Textarea Note interne [debounce auto-save] ← MANQUANT ACTUELLEMENT
│
├── Pills contextuelles
│   └── Badge Segment · Province · Marketeur (si code ref)
│
├── Bloc Contact
│   Email · Téléphone [cliquable tel:] · Fonction · Entreprise · N° TVA
│
├── Grd (si renseigné)
│
├── Message / précisions du prospect (bg-muted/50, whitespace-pre-wrap)
│
├── Séparateur ──────────────────
│
├── Bloc Technique
│   Surface (m² + type) · Délai projet · Facture annuelle (font-mono)
│   ROI estimé (font-mono) · Autoconsommation % · Économies/an (font-mono)
│   Option IRVE [si activé]
│
└── Footer
    Reçu le [date complète + heure] · Dernière mise à jour
```

### 5.4 `/admin/partners` (Marketplace)

```
┌── H1 "Partenaires Marketplace"
│
├── KPIs (3 cartes)
│   ├── Crédits en circulation
│   ├── Leads achetés [total, cliquable → Sheet liste des leads]
│   └── Crédits rechargés
│
└── Table partenaires
    Entreprise · Email · Segment · Crédits [bold] · Leads achetés [cliquable] · Dépensés · Rechargés · Actions
    └── Dialog "Ajouter des crédits" (existant, bon)
```

### 5.5 `/admin/media-partners` (Marketeurs)

Bonne page mais suggère une **séparation en deux sections explicites** :

```
Section 1 — Candidatures [bg-card, border, rounded-xl]
└── Table candidatures + boutons Dossier / Approuver / Rejeter

Section 2 — Marketeurs actifs
├── KPIs (3 cartes existantes)
└── Table avec colonne "Commission due" en text-amber-700 font-mono
```

### 5.6 `/admin/installateurs`

```
┌── H1 "Installateurs" + Bouton "Ajouter" [Bleu Nuit]
│
└── Table
    Nom · Email · Région · Statut (actif/inactif) · Leads assignés · Taux converti · Dernière assignation
    └── Actions : Modifier · (Supprimer si 0 leads)
```

---

## 6. Règles de style (conformes à la Direction Artistique)

| Règle | Application concrète |
|-------|---------------------|
| **Fond clair strict** | `bg-background` = `#fafafa` pour le layout, `bg-white` pour les cartes |
| **Sidebar** | `bg-card` (blanc) + `border-r border-slate-200` — jamais de fond sombre |
| **KPI chiffrés** | `font-mono tabular-nums` + taille `text-2xl` à `text-3xl` |
| **Or Solaire `#FFB800`** | Uniquement pour commissions dues (alerte financière), jamais pour du texte courant |
| **Bleu Nuit `#001D3D`** | Boutons CTA primaires, titres H1, liens actifs de navigation |
| **Badges B2B** | `bg-blue-50 text-blue-700` |
| **Badges B2C** | `bg-emerald-50 text-emerald-700` |
| **Animations** | `Framer Motion` spring (stiffness 300, damping 24) pour l'ouverture du Sheet. `viewport: { once: true }` pour les listes. **Aucun bounce excessif.** |
| **Ombres** | `shadow-sm` au repos → `shadow-md` au hover. Jamais de `shadow-xl` sur fonds clairs |
| **Bordures** | `border-slate-200` (éléments clairs) — fines, jamais épaisses |
| **Icônes** | Lucide React exclusivement, `h-4 w-4` inline, `h-5 w-5` boutons |
| **Recherche** | Input `h-11 rounded-xl` avec icône `Search` intégrée (pas de bouton séparé si possible) |

---

## 7. Ce qu'il ne faut surtout pas faire

1. **Ne pas implémenter de mode sombre** — contraire à la direction artistique, aucun fond `#0a0a0a`.
2. **Ne pas ajouter de Kanban lead** — la table filtrée + Sheet est plus adaptée à la volumétrie quotidienne et plus rapide à exploiter qu'un drag-and-drop.
3. **Ne pas surcharger la sidebar** — 7 entrées c'est déjà la limite. Toute nouvelle section doit être une sous-page ou un onglet, pas un nouvel item de nav.
4. **Ne pas changer l'architecture API** — les routes `/api/admin/*` avec header `x-admin-request` sont solides et cohérentes. Les améliorations visuelles ne nécessitent aucune refonte sécurité.
5. **Ne pas remplacer les composants Radix/Shadcn existants** par des alternatives custom — cohérence de l'accessibilité et du comportement.
