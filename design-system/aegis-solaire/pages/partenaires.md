# Page Partenaires & Marketplace Solaire — Spécifications UI/UX (Fintech Slate & Solar Trust)

> **RÈGLE HIÉRARCHIQUE :** Ce document définit les règles de composition et d'interaction pour la page `/partenaires` (Marketplace installateurs et acquisition B2B).
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
   - Ticker de marché en direct : Nombre de chantiers disponibles, puissance totale, volume d'affaires estimé, audit toiture & TVA vérifiés.
2. **Aperçu Interactif du Live Feed (`MarketplaceLivePreview`) :**
   - Barre d'outils avec filtres segment (Tous, B2B, B2C), province, recherche texte, tri par rentabilité, et toggle grille/tableau.
   - Cartes Bento avec badges clairs, puissance kWc, facture réseau, surface toiture, marge installateur estimée, et modal d'inspection complète.
3. **Matrice Comparative (Aegis Solaire vs Courtiers Traditionnels) :**
   - Tableau contrasté sur 5 critères clés : Concurrence sur le lead, Modèle économique, Qualification technique, Garantie contact injoignable, Exigence RESCERT.
   - 4 Cartes Bento des garanties : B2B Exclusif (1 seul acheteur), B2C Transparent (Max 3 places), Packs sans engagement, 100% Qualité & Remplacement.
4. **Simulateur de Rentabilité Métier (`InstallerRoiCalculator`) :**
   - Sliders interactifs : Segment (Mixte / B2C / B2B), volume de dossiers débloqués par mois (2 à 20), taux de transformation (20% à 50%).
   - Calcul en direct : Budget crédits requis, chantiers signés, C.A. prévisionnel, marge brute installateur et multiplicateur ROI (x15 à x25).
5. **Grille Tarifaire des Packs de Crédits (Zéro Abonnement) :**
   - 4 paliers : Pack Découverte (10 crédits), Pack Croissance (25 crédits - Recommandé), Pack Entreprise (50 crédits), Pack Grands Projets (100 crédits).
   - Unité de calcul : De 11,98 € HT / crédit à 8,90 € HT / crédit (-26% de remise dégressive).
   - Factures officielles INIT42 SRL déductibles avec TVA 21%.
6. **Témoignages & Confiance Installateurs :**
   - Retours vérifiés d'installateurs partenaires à Liège, Namur et Brabant Wallon avec agréments RESCERT mentionnés.
   - Chiffres clés de confiance : 94% satisfaction, 100% certifiés RESCERT, <48h délai d'audit, 0€ abonnement imposé.
7. **Processus d'Intégration en 3 Étapes :**
   - 01 Candidature en ligne (BCE + RESCERT).
   - 02 Revue technique sous 48h & Accès portail.
   - 03 Consultation du live feed & Déblocage instantané.
8. **Formulaire de Candidature Sécurisé (`InstallerRegistrationForm`) :**
   - Tunnel en 4 étapes : Entreprise & BCE, Contact référent, Agrément RESCERT, Régions d'intervention.
   - Boutons Fintech Slate modernes conformes aux tokens sémantiques.
9. **FAQ Spécialisée Installateurs :**
   - Réponses chirurgicales sur la fiscalité belge, le remplacement sous 7 jours, l'absence de commission de fin de chantier, et la validité illimitée des crédits.
