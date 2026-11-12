# PACK V2 — RELANCE HAUT CTR & QUALIFICATION WALLONIE (META ADS)

> **Statut :** **Déployé & Actif (12 novembre 2026)** — Pack V1 (`PUB_1`, `PUB_2`, `PUB_3`) en pause ; **4 annonces V2 actives** (3 visuels GPT Image `1080×1350` + 1 vidéo Feed `4:5`) dans l'AdSet `120251604763100465` (**Wallonie 5 provinces complète** + **placements Feed FB/IG uniquement**).  
> **Objectif :** Faire passer le `CTR Lien` (`inline_link_click_ctr`) de **0,66 %** (Pack V1) à **>= 1,40 %**, diviser le `CPC Lien` de **3,75 €** vers **<= 1,10 €**, et ramener le `CPL` sous **<= 25–30 €** sur `/devis-panneaux-solaires`.

---

## 1. Permissions Page Meta Business Manager — Résolu

Le blocage initial **`3858749` (`Autorisation de Page manquante`)** sur `act_1596485538374624` a été résolu dans le Business Manager `Init42` (`532988283872893`) :
- L'utilisateur système `AegisLeadEngineMonitor` (`122105755887540362`) dispose désormais de l'accès complet (`MANAGE`, `ADVERTISE`, `CREATE_CONTENT`, `ANALYZE`) sur la Page `1135722802965073`.
- Le Pixel `1672474437601117` (`tracking_specs` + CAPI serveur) et le compte Instagram `17841416430125462` sont directement reliés à chaque créatif V2.
- Commande utilisée pour le déploiement :
  ```bash
  node scripts/launch-meta-pack-v2.mjs --create-ads --activate
  ```

---

## 2. Architecture de Campagne V2 Déployée

### AdSet A (Actif — Feed Statique & Vidéo 4:5) : `Wallonie_Proprietaires_Broad_30-64` (`120251604763100465`)
- **Ciblage géographique :** Région Wallonne (`4137`) **complète (5 provinces, y compris Luxembourg belge 66xx–69xx)**.
- **Exclusions actives :** Bruxelles (`296`), Flandre (`4136`), Grand-Duché de Luxembourg (`LU`).
- **Advantage+ Audience :** Désactivé (`advantage_audience: 0`) pour empêcher toute fuite hors Wallonie.
- **Placements :** `Facebook Feed` + `Instagram Stream` uniquement (**Reels / Stories / Audience Network coupés** pour éviter le trafic accidentel à 0,27 % de CTR sur du statique).
- **Budget actif (`CBO`) :** `20,00 € / jour` concentré sur **4 annonces V2 actives** (~5 €/j par variante) :
  - `V2_AD1_ECART_1850_GPT` (`120251681580910465`) — `GET_QUOTE`
  - `V2_AD2_RENTABILITE_2026_GPT` (`120251681581910465`) — `LEARN_MORE`
  - `V2_AD3_ANTI_DEMARCHAGE_GPT` (`120251681583000465`) — `GET_QUOTE`
  - `V2_VIDEO_WALLONIE_FEED_4X5` (`120251681583270465`) — `GET_QUOTE`

### AdSet B (En réserve pour Phase Scaling > 35–40 €/j) : `Wallonie_Reels_Stories_Video_30-64`
- **Ciblage :** Identique à l'AdSet A (Wallonie 5 provinces, `30–64 ans`, exclusions BXL/VL/LU, `advantage_audience: 0`).
- **Placements exclusifs :** `Facebook Reels`, `Instagram Reels`, `Facebook Stories`, `Instagram Stories`.
- **Créatif prêt dans la bibliothèque média :** `creatives-v2/v2_video_wallonie_9x16.mp4` (`1080×1920`, `15 s`, `video_id 1856643732201466`).
- **Pourquoi attendre :** À `20 €/j`, scinder le budget sur un 2ᵉ AdSet laisserait ~`10 €/j` par AdSet, insuffisant pour stabiliser l'apprentissage `LEAD` ; cet AdSet sera ouvert uniquement après validation d'un gagnant Feed et hausse du budget.

---

## 3. Paramètres UTM & URL de Destination Standardisés

**URL cible propre (`link_data.link`) :** `https://www.aegissolaire.com/devis-panneaux-solaires`  
**`url_tags` dynamiques appliqués sur chaque annonce V2 :**
```text
utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=<AD_NAME>&utm_term={{placement}}
```

*(Note : ajouter `&utm_term={{placement}}` permet dans Supabase `funnel_step_events` de distinguer immédiatement les sessions issues de `Facebook_Mobile_Feed` vs `Instagram_Stream` vs `Reels`.)*

---

## 4. Les 4 Créatifs Actifs & Textes Complets (Français Belgique / Wallonie)

### V2-AD1 — Angle Douleur / Écart Réel de Prix (`V2_AD1_ECART_1850_GPT` — `120251681580910465`)
- **Fichier visuel déployé :** `campagnes-meta/creatives-v2/v2_ad1_ecart1850_gpt_4x5.png` (`1080×1350`, ratio 4:5 — fallback CSS `v2_ad1_ecart1850_4x5.png`)
- **Image hash Meta :** `cb94e847464b80d7ebcf44d35c0370ff`
- **CTA Meta :** `Obtenir un devis` (`GET_QUOTE`)

**Texte principal — Version Courte (recommandée test mobile) :**
> Panneaux solaires en Wallonie : sur une même toiture et pour des panneaux équivalents, l'écart constaté entre deux devis dépasse souvent 1 500 € à 1 850 €.
>
> Comparez gratuitement jusqu'à 3 installateurs agréés RESCERT de votre province (Liège, Namur, Hainaut, Brabant wallon, Luxembourg) en 45 secondes.
> 👉 Réponse claire sous 48 h, zéro engagement.

**Texte principal — Version Moyenne :**
> Vous envisagez le photovoltaïque en 2026 ? Ne signez jamais le premier devis reçu sans point de comparaison.
>
> Sur une maison unifamiliale wallonne (~6 kWc), nos audits relèvent régulièrement jusqu'à 1 850 € d'écart à matériel identique, simplement selon la marge commerciale de l'installateur.
>
> Sur Aegis Solaire :
> ✅ Estimation réaliste selon votre toiture et votre facture en 45 sec
> ✅ Mise en concurrence limitée à max 3 installateurs RESCERT locaux
> ✅ Choix du contact écrit d'abord respecté — pas de harcèlement téléphonique
>
> Faites votre simulation gratuite ci-dessous 👇

**Titre (Headline, <= 40 car.) :** `Comparez jusqu'à 3 devis RESCERT`
**Description :** `Gratuit · 45 sec · Wallonie uniquement`

---

### V2-AD2 — Angle Rentabilité 2026 & Fin du Compteur à l'Envers (`V2_AD2_RENTABILITE_2026_GPT` — `120251681581910465`)
- **Fichier visuel déployé :** `campagnes-meta/creatives-v2/v2_ad2_rentabilite2026_gpt_4x5.png` (`1080×1350`, ratio 4:5 — fallback CSS `v2_ad2_rentabilite2026_4x5.png`)
- **Image hash Meta :** `c0b05538c6e0d7ebfdb7be68958f0add`
- **CTA Meta :** `En savoir plus` (`LEARN_MORE`)

**Texte principal — Version Courte :**
> Fin du compteur qui tourne à l'envers : le solaire reste-t-il rentable sur votre maison en Wallonie en 2026 ?
>
> Oui, si l'installation est bien dimensionnée pour votre autoconsommation (sans sur-vendre de kWc inutiles). Testez votre économie annuelle et comparez jusqu'à 3 offres RESCERT locales.

**Texte principal — Version Longue (Pédagogique) :**
> « Depuis la fin du compteur qui tourne à l'envers en Wallonie, est-ce que ça vaut encore le coup ? »
>
> C'est la question n°1 des propriétaires en 2026. La vérité en chiffres : avec des prix de matériel historiquement bas mais des écarts énormes sur la main-d'œuvre, une installation bien calibrée s'amortit aujourd'hui en 4 à 6 ans et génère environ 1 480 € d'économie annuelle moyenne.
>
> En revanche, un dimensionnement gonflé ou un tarif commercial excessif ruine votre rendement.
>
> 🔍 Vérifiez votre chiffre réel en 45 secondes sur Aegis Solaire et comparez jusqu'à 3 installateurs RESCERT audités près de chez vous.

**Titre (Headline) :** `Simulez votre vrai gain solaire 2026`
**Description :** `Audit gratuit · Installateurs agréés RESCERT`

---

### V2-AD3 — Angle Anti-Démarchage & Zéro Harcèlement (`V2_AD3_ANTI_DEMARCHAGE_GPT` — `120251681583000465`)
- **Fichier visuel déployé :** `campagnes-meta/creatives-v2/v2_ad3_anti_demarchage_gpt_4x5.png` (`1080×1350`, ratio 4:5 — fallback CSS `v2_ad3_anti_demarchage_4x5.png`)
- **Image hash Meta :** `87aa62b15455c8907befc0b0700c1ec2`
- **CTA Meta :** `Obtenir un devis` (`GET_QUOTE`)

**Texte principal — Version Courte :**
> Marre de recevoir 10 appels commerciaux dès le lendemain d'une demande de devis solaire ?
>
> Sur Aegis Solaire, votre dossier n'est jamais revendu en masse : jusqu'à 3 installateurs RESCERT de votre province maximum, et vous pouvez exiger un premier contact par écrit uniquement.

**Texte principal — Version Moyenne :**
> Pourquoi hésiter à demander un devis solaire en ligne ? Par peur de voir son numéro revendu à 8 plateformes le lendemain matin.
>
> Notre promesse pour les propriétaires wallons :
> • Maximum 3 installateurs locaux agréés RESCERT par dossier
> • Entreprises belges vérifiées (BCE & certification technique)
> • Option « Contact écrit d'abord (e-mail/SMS) » intégrée dès la demande
>
> Comparez sereinement les prix et garanties en 45 secondes 👇

**Titre (Headline) :** `3 devis max · Zéro harcèlement`
**Description :** `Entreprises wallonnes RESCERT vérifiées`

---

### V2-VIDEO1 — Vidéo Motion 15s (`V2_VIDEO_WALLONIE_FEED_4X5` — `120251681583270465`)
- **Fichiers visuels :**
  - `campagnes-meta/creatives-v2/v2_video_wallonie_4x5.mp4` (`1080×1350`, `15 s`, `30 fps`, H.264 — `video_id 1706548700861731`) → **Actif dans AdSet A (Feed FB/IG)**
  - `campagnes-meta/creatives-v2/v2_video_wallonie_9x16.mp4` (`1080×1920`, `15 s`, `30 fps`, H.264 — `video_id 1856643732201466`) → **En réserve pour AdSet B (Reels/Stories)**
- **CTA Meta :** `Obtenir un devis` (`GET_QUOTE`)
- **Texte principal :** Angle `1 850 € d'écart` adapté Feed.
- **Titre (Headline) :** `1 850 € d'écart ? Comparez 3 devis`
- **Description :** `Gratuit · 45 s · Wallonie (RESCERT)`

---

## 5. Règles d'Arbitrage Strict (48 h / 72 h après relance V2)

Exécuter quotidiennement :
```bash
node scripts/monitor-campaigns.mjs
```

| Signal observé (`monitor-campaigns.mjs`) | Seuil d'évaluation | Action immédiate |
| --- | --- | --- |
| `CTR lien (inline_link_click_ctr) < 0,90 %` | >= 20 € dépensés sur l'annonce | **KILL immédiat** (changer le visuel/hook) |
| `LPV / Clics lien < 55 %` | >= 15 clics lien | Vérifier latence landing ou placer sur Feed uniquement |
| `Taux Step 1 -> Step 2 (humains) < 35 %` | >= 30 sessions humaines | Auditer l'ordre mobile et le chargement initial |
| `CPL > 35 €` et `0 Lead` | >= 45–50 € dépensés sur l'annonce | **KILL strict** et réallocation sur l'annonce gagnante |
| `CPL <= 25 €` avec `Leads >= 3` | 72 h consécutives | **SCALE** (+20 % de budget max par palier de 48 h) |

