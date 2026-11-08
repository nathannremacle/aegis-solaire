# Campagnes Meta Ads — Aegis Solaire Wallonie

Dossier de travail et état du lancement en production au 8 novembre 2026.  
Ce dossier centralise la recherche concurrentielle, les créations publicitaires, les paramètres de diffusion et l'outil de monitoring autonome en temps réel.

---

## 🚀 Campagne Active en Diffusion

* **Nom de la Campagne** : `[AEGIS] B2C_SOLAIRE_WALLONIE_LANCEMENT`
* **Compte Publicitaire** : `act_1596485538374624` (INIT42 - Aegis Solaire)
* **Pixel ID** : `1672474437601117`
* **Budget Quotidien** : `20,00 € / jour`
* **Plafond Strict de Sécurité** : `500,00 €` (fixé dans les paramètres de paiement)
* **Ciblage** : Wallonie (Liège, Namur, Hainaut, Brabant wallon, Luxembourg), 30–64 ans, langue Français.

### Annonces Actives en Test Dynamique :
1. **Pub 1** : `PUB_1_VISUEL_ANALYSE_DEVIS`
   * *Visuel* : Devis sur table en bois (« Un devis solaire, ce n'est pas que le prix »)
   * *UTM Tracking* : `utm_content=visuel1_table_devis`
2. **Pub 2** : `PUB_2_VISUEL_MAISON_COMPAREZ`
   * *Visuel* : Maison en briques avec toiture solaire (« Panneaux solaires ? Comparez avant de signer »)
   * *UTM Tracking* : `utm_content=visuel2_maison_comparez`

---

## 🛠️ Outil de Monitoring Autonome (Scripts & Télémétrie)

Pour auditer en direct les performances sans avoir à ouvrir le Gestionnaire de publicités Meta :
* **Script de diagnostic** : `scripts/monitor-campaigns.mjs`
* **Exécution** : `node --env-file=.env.local scripts/monitor-campaigns.mjs`

### Ce que le script mesure en temps réel :
* **Entonnoir de conversion (Funnel)** :
  - Décompte des visiteurs à chaque étape (Étape 1 à 6) depuis la table `funnel_step_events`.
  - Comparaison directe entre la Pub 1 (`visuel1_table_devis`) et la Pub 2 (`visuel2_maison_comparez`).
* **CV Complet des Prospects (Leads)** :
  - Nom, commune, code postal, puissance estimée (kWc), facture annuelle déclarée.
  - Horodatage et publicité exacte ayant généré la conversion.
* **Taux de Conversion Réel (CVR)** :
  - Ratio visiteurs / formulaires complets transmis aux installateurs partenaires.

---

## 📁 Structure du Dossier

* **[`1-AUDIT-ADS-LIBRARY-CONCURRENTS.md`](./1-AUDIT-ADS-LIBRARY-CONCURRENTS.md)** : Analyse concurrentielle de 530+ publicités actives sur le marché belge.
* **[`2-PACK-PUBLICITAIRE-COMPLET.md`](./2-PACK-PUBLICITAIRE-COMPLET.md)** : Pack créatif complet, angles, équation de valeur et scripts.
* **[`3-PLAN-LANCEMENT-ET-CONFIG-META-500E.md`](./3-PLAN-LANCEMENT-ET-CONFIG-META-500E.md)** : Plan stratégique et règles de pilotage (KILL / KEEP / SCALE).
* **[`4-BRIEFS-CANVA-ET-CARROUSEL.md`](./4-BRIEFS-CANVA-ET-CARROUSEL.md)** : Spécifications des gabarits créatifs.
* **[`5-RAPPORT-STRATEGIQUE-POUR-EXPERT.md`](./5-RAPPORT-STRATEGIQUE-POUR-EXPERT.md)** : Rapport d'ingénierie publicitaire.
