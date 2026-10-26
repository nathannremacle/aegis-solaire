# Marketplace Solaire — Spécifications UI/UX (Fintech Slate & Solar Trust)

> **RÈGLE HIÉRARCHIQUE :** Ce document définit les règles de composition et d'interaction pour la page `/partenaires` (Marketplace installateurs).
> Il complète et décline le document maître `design-system/aegis-solaire/MASTER.md`.

---

## 1. Objectif & Expérience Utilisateur (Installateurs Partenaires)
La page `/partenaires` est le portail d'acquisition et d'information B2B d'Aegis Solaire à destination des installateurs photovoltaïques certifiés RESCERT en Wallonie.
- **Mission :** Démontrer la supériorité du modèle Aegis Solaire face aux plateformes discount (Bobex, TrustUp) grâce à une transparence totale (B2B exclusif 1 seul acheteur, B2C limité à 3 places, qualification technique toiture & facture réseau).
- **Inspirations :** Trading desk financier, Qonto, Stripe Dashboard, Apple Bento Grid.

---

## 2. Tokens & Couleurs Sémantiques
- **Surfaces :** Blanc pur (`#FFFFFF`), Ardoise technique (`#F8FAFC`, `#F1F5F9`).
- **Structure & Typographie :** `text-foreground` (`#0F172A`), `text-muted-foreground` (`#64748B`).
- **Accent Tech / Sécurité :** `bg-accent` (`#2563EB`), `text-accent`.
- **Accent Marge & Chiffres Clés :** `text-accent-solar` (`#F59E0B`), `bg-accent-solar`.
- **Bordures :** `border-border` (`#E2E8F0`, 1px).
- **Chiffres financiers & techniques :** `font-mono tabular-nums font-semibold` pour tout montant `€`, marge `€`, puissance `kWc`, crédits `8 crédits / 2 crédits`, et taux de TVA `21%`.

---

## 3. Sections & Structure de la Page
1. **Hero Institutionnel :**
   - Eyebrow : `RÉSEAU OFFICIEL · INSTALLATEURS CERTIFIÉS RESCERT WALLONIE`.
   - Titre `<h1>` unique : `La Marketplace Photovoltaïque des Professionnels en Wallonie`.
   - Cartes comparatives de segment : B2B Exclusif (100% exclusivité dès 8 crédits) & B2C Comparatif (Max 3 installateurs dès 2 crédits).
   - Ticker de marché en direct : Nombre de chantiers disponibles, puissance totale, volume d'affaires estimé.
2. **Garanties Anti-Cannibalisation :** 4 piliers d'ingénierie (Anti-cannibalisation, Qualification toiture réelle, Factures officielles déductibles, Garantie prospect injoignable).
3. **Live Feed Interactif (`MarketplaceLivePreview`) :**
   - Barre d'outils avec filtres segment (Tous, B2B, B2C), province, recherche texte, tri par rentabilité, et toggle grille/tableau.
   - Cartes Bento avec badges clairs, puissance kWc, facture réseau, surface toiture, marge installateur estimée, et modal d'inspection complète.
4. **Grille Tarifaire des Packs de Crédits (Zéro Abonnement) :**
   - Pack Démarrage (10 crédits), Pack Croissance (25 crédits), Pack Entreprise (50 crédits).
   - Simulateur de ROI pour l'installateur.
5. **Processus d'Intégration en 3 Étapes :** 01 Candidature en ligne, 02 Audit RESCERT & Accès sous 48h, 03 Déblocage direct des chantiers.
6. **Formulaire de Candidature Sécurisé :** Vérification BCE, Agrément RESCERT, Provinces cibles.
7. **FAQ Spécialisée Installateurs :** Réponses chirurgicales sur les crédits, le remboursement et la législation CWaPE.
