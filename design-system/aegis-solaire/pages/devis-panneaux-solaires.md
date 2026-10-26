# Devis Panneaux Solaires — Spécifications UI/UX (Fintech Slate & Solar Trust)

> **RÈGLE HIÉRARCHIQUE :** Ce document définit les règles de composition et d'interaction pour la page `/devis-panneaux-solaires`.
> Il complète et décline le document maître `design-system/aegis-solaire/MASTER.md`.

---

## 1. Objectif & Expérience de Conversion (CRO)
La page `/devis-panneaux-solaires` est le tunnel d'acquisition B2C principal d'Aegis Solaire en Wallonie.
- **Mission :** Permettre aux propriétaires wallons d'obtenir jusqu'à 3 devis comparatifs gratuits d'installateurs certifiés RESCERT en moins de 45 secondes, avec une réassurance technique maximale (zéro harcèlement, conformité RGIE, ORES/RESA).
- **Architecture :** Split Screen asymétrique Desktop (6 cols Preuve & Valeur / 6 cols Lead Card Interactive), avec transition fluide et auto-advance de 180 ms sur les étapes à choix unique.

---

## 2. Tokens & Couleurs Sémantiques
- **Fond de page :** `bg-background` (`#FFFFFF`).
- **Surfaces :** `bg-card` (`#FFFFFF`), `bg-secondary` (`#F1F5F9`), `bg-muted` (`#F8FAFC`).
- **Structure & Texte :** `text-foreground` (`#0F172A`), `text-muted-foreground` (`#64748B`).
- **Accent Confiance & Boutons :** `bg-primary` (`#0F172A`), `bg-accent` (`#2563EB`).
- **Accent Énergie & Chiffres Clés :** `text-accent-solar` (`#F59E0B`), `bg-accent-solar`.
- **Bordures :** `border-border` (`#E2E8F0`, 1px).
- **Chiffres financiers & techniques :** `font-mono tabular-nums font-semibold` pour tout montant `€`, puissance `kWc`, délai `48 h`, `45 s`, et pourcentage `%`.

---

## 3. Composants Clés & Layout
1. **Header Léger :** Logo Aegis Solaire, badge `Service Indépendant Wallonie`, badge `Label RESCERT`.
2. **Hero Split Screen :**
   - Colonne gauche : Eyebrow institutionnel, Titre `<h1>` unique, 3 arguments techniques certifiés, cas réel Chaudfontaine (écart 1 850 € TTC constaté).
   - Colonne droite : Lead Card interactive en 6 étapes avec stepper dynamique, barre de progression fine, sélection fluide, détection automatique de la province wallonne via code postal belge.
3. **Trust Bar 4 Piliers :** 100% RESCERT, Jusqu'à 3 devis, 0 € sans engagement, 48 h délai moyen.
4. **Bento Comparatif :** Tableau comparatif "Devis Sans Aegis" vs "Avec Audit Aegis Solaire".
5. **Processus 3 Étapes :** 01 Remplissez en 45 s, 02 Sélection d'experts locaux, 03 Comparez et économisez.
6. **Études de Cas & Avis Wallons Vérifiés :** Liège, Brabant wallon, Namur.
7. **FAQ Accordion Accessible :** Clarté totale sur le tarif prosumer, le compteur communicant et l'obligation RESCERT.
8. **Bandeau Flottant Mobile (Sticky CTA) :** Accessible au scroll pour relancer le formulaire en 1 clic.
