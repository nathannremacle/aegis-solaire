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
* **Placements** : Exclusifs Facebook & Instagram (Audience Network et Messenger exclus le 10/11/2026).

### Pack V1 (Archivé / En pause suite à l'audit V1) :
1. **Pub 1** : `PUB_1_VISUEL_ANALYSE_DEVIS` (`120251604763110465`) — En pause (`CTR lien 0,69 %`, `38,74 €`)
2. **Pub 2** : `PUB_2_VISUEL_MAISON_COMPAREZ` (`120251605088950465`) — En pause (`CTR lien 0,74 %`, `21,55 €`)
3. **Pub 3** : `PUB_3_VISUEL_AUDIT_COMPARER` (`120251628805770465`) — En pause (`CTR lien 0,57 %`, `37,13 €`)

### Pack V2 (Déployé & Actif — GPT Image 4:5 + Vidéo Feed 4:5) :
Voir **[`6-PACK-V2-RELANCE-HAUT-CTR.md`](./6-PACK-V2-RELANCE-HAUT-CTR.md)** et le dossier `campagnes-meta/creatives-v2/` :
* **Annonces actives dans AdSet `120251604763100465`** (`Page 1135722802965073` + `IG 17841416430125462` + `Pixel 1672474437601117` + `url_tags`) :
  1. `V2_AD1_ECART_1850_GPT` (`120251681580910465`) — `v2_ad1_ecart1850_gpt_4x5.png` (`1080×1350`)
  2. `V2_AD2_RENTABILITE_2026_GPT` (`120251681581910465`) — `v2_ad2_rentabilite2026_gpt_4x5.png` (`1080×1350`)
  3. `V2_AD3_ANTI_DEMARCHAGE_GPT` (`120251681583000465`) — `v2_ad3_anti_demarchage_gpt_4x5.png` (`1080×1350`)
  4. `V2_VIDEO_WALLONIE_FEED_4X5` (`120251681583270465`) — `v2_video_wallonie_4x5.mp4` (`1080×1350`, `15 s`)
* **Réserve Scaling Reels/Stories** : `v2_video_wallonie_9x16.mp4` (`video_id 1856643732201466` pré-téléversé).
* **Script de déploiement** : `node scripts/launch-meta-pack-v2.mjs --create-ads --activate`
* **Ciblage V2 actif sur AdSet `120251604763100465`** : Wallonie complète 5 provinces (Luxembourg BE restauré), BXL/VL/`LU` exclus, placements Feed FB/IG uniquement (`advantage_audience: 0`).

---

## 🛠️ Outil de Monitoring Autonome (Scripts & Télémétrie)

Pour auditer en direct les performances sans avoir à ouvrir le Gestionnaire de publicités Meta :
* **Script de diagnostic** : `scripts/monitor-campaigns.mjs`
* **Exécution** : `node --env-file=.env.local scripts/monitor-campaigns.mjs`

### Ce que le script mesure en temps réel :
* **Annonces Meta actives & en pause** : Métriques réelles (`inline_link_clicks`, `LPV`, `Leads`) et statut de validation de chaque annonce V1/V2.
* **Entonnoir de conversion (Funnel)** :
  - Décompte des visiteurs humains à chaque étape (Étape 1 à 6) depuis la table `funnel_step_events`.
  - Comparaison directe par `utm_content` entre les annonces V2 actives (`V2_AD1_ECART_1850_GPT`, `V2_AD2_RENTABILITE_2026_GPT`, `V2_AD3_ANTI_DEMARCHAGE_GPT`, `V2_VIDEO_WALLONIE_FEED_4X5`) et l'historique V1.
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
* **[`6-PACK-V2-RELANCE-HAUT-CTR.md`](./6-PACK-V2-RELANCE-HAUT-CTR.md)** : Pack créatif V2 complet (visuels 4:5, vidéos motion 9:16 & 4:5, copies FR Wallonie, UTMs, déblocage Page ACL et règles KILL/SCALE).
