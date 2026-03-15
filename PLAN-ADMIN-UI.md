# Plan – Amélioration UI/UX du panel admin Aegis Solaire

Objectif : améliorer nettement l’expérience du panel admin (design, clarté, fonctionnalités).

---

## 1. Layout & navigation

- **Sidebar** : Indication de la page active (style distinct pour le lien courant). Branding « Aegis Admin » avec sous-titre optionnel. Lien « Voir le site » vers la landing. Séparateur visuel avant le bouton Déconnexion. Espacement et hiérarchie clarifiés.
- **Toasts** : Intégration de Sonner dans le layout racine pour afficher des retours (succès / erreur) après actions (CRUD installateurs, changement de statut lead).

---

## 2. Tableau de bord

- **Cartes KPI** : Utiliser le composant `Card` avec icônes et couleurs discrètes (primary pour total, muted pour ce mois / aujourd’hui). Lien « Voir tous les leads » mis en avant.
- **Statuts** : Badges colorés cohérents pour les statuts (new, contacted, qualified, converted, lost).
- **Derniers leads** : Chaque ligne cliquable → ouverture du détail lead (drawer). Lien « Voir toute la liste » conservé.

---

## 3. Page Leads

- **Badges statut** : Couleurs sémantiques (nouveau = bleu, contacté = jaune/orange, qualifié = vert, converti = primary, perdu = muted).
- **Détail lead** : Clic sur une ligne ouvre un **Sheet** (drawer) avec toutes les infos du lead en lecture seule + **changement de statut** (Select) avec sauvegarde via API.
- **API** : Nouvelle route `PATCH /api/admin/leads/[id]` pour mettre à jour le statut (et éventuellement `updated_at`).

---

## 4. Installateurs

- **Toasts** : Après création, modification et suppression d’un installateur, afficher un toast de succès (ou erreur). Utiliser `sonner` (déjà dans le projet).

---

## 5. Page de connexion

- **UI** : Card avec ombre légère, titre « Administration Aegis Solaire » plus lisible. Lien « Retour au site » bien visible. Conserver le formulaire simple (email + mot de passe).

---

## 6. Résumé technique

| Élément              | Action |
|----------------------|--------|
| Layout racine        | Ajouter `<Toaster />` (Sonner) pour les toasts. |
| Layout admin         | `usePathname` pour lien actif ; lien « Voir le site » ; séparateur. |
| Dashboard            | Card pour KPI ; badges statut ; lignes leads cliquables → détail. |
| Leads                | Badge statut coloré ; Sheet détail + Select statut ; PATCH API. |
| Installateurs        | `toast.success()` / `toast.error()` après CRUD. |
| Login                | Ajustements visuels (titre, card, lien retour). |
