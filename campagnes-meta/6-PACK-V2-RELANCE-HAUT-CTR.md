# PACK V2 — RELANCE HAUT CTR & QUALIFICATION WALLONIE (META ADS)

> **Statut :** Prêt au déploiement (`PUB_1`, `PUB_2`, `PUB_3` en pause ; ciblage AdSet `120251604763100465` migré sur **Wallonie 5 provinces complète** + **placements Feed FB/IG uniquement**).  
> **Objectif :** Faire passer le `CTR Lien` (`inline_link_click_ctr`) de **0,66 %** (Pack V1) à **>= 1,40 %**, diviser le `CPC Lien` de **3,75 €** vers **<= 1,10 €**, et ramener le `CPL` sous **<= 25–30 €** sur `/devis-panneaux-solaires`.

---

## 1. Déblocage préalable dans Meta Business Manager (`Init42`)

Lors des tests API sur `act_1596485538374624`, l'API Graph retourne l'erreur **`3858749` (`Autorisation de Page manquante`)** dès la création d'un objet `AdCreative` rattaché à la Page `1135722802965073` :
- Le compte publicitaire et le Pixel `1672474437601117` sont opérationnels via `META_MARKETING_TOKEN`.
- Il manque uniquement le rôle **Annonces (`ADS`)** sur la Page Facebook `1135722802965073` pour le Système User / profil `AegisLeadEngineMonitor` (`122105755887540362`).

**Action en 30 secondes dans `business.facebook.com/settings` (Business Manager `Init42` — `532988283872893`) :**
1. Ouvrir **Utilisateurs → Utilisateurs système** (ou **Comptes → Pages → Aegis Solaire `1135722802965073`**).
2. Sélectionner **`AegisLeadEngineMonitor`** → **Attribuer des actifs → Pages → Cocher la Page `1135722802965073` → Activer l'autorisation `Créer des publicités / Annonces`**.
3. Enregistrer, puis exécuter :
   ```bash
   node scripts/launch-meta-pack-v2.mjs --create-ads
   ```
   *(Tous les visuels et vidéos V2 sont déjà pré-téléversables dans la bibliothèque médias de `act_1596485538374624` via `--stage-assets`.)*

---

## 2. Architecture de Campagne V2 Recommandée

### AdSet A (Actif — Feed Statique & Vidéo 4:5) : `Wallonie_Proprietaires_Broad_30-64` (`120251604763100465`)
- **Ciblage géographique :** Région Wallonne (`4137`) **complète (5 provinces, y compris Luxembourg belge 66xx–69xx)**.
- **Exclusions actives :** Bruxelles (`296`), Flandre (`4136`), Grand-Duché de Luxembourg (`LU`).
- **Advantage+ Audience :** Désactivé (`advantage_audience: 0`) pour empêcher toute fuite hors Wallonie.
- **Placements :** `Facebook Feed` + `Instagram Feed` uniquement (**Reels / Stories / Audience Network coupés** pour ne plus brûler de budget à 0,27 % de CTR sur du statique).
- **Budget recommandé :** `20 € / jour` sur **3 annonces V2 actives max** simultanément (1 AdSet propre = sortie plus rapide de la phase d'apprentissage avec `Lead` + `InitiateCheckout` + `Contact` CAPI).

### AdSet B (Optionnel à J+3 ou dès lancement dédié Vidéo 9:16) : `Wallonie_Reels_Stories_Video_30-64`
- **Ciblage :** Identique à l'AdSet A (Wallonie 5 provinces, `30–64 ans`, exclusions BXL/VL/LU, `advantage_audience: 0`).
- **Placements exclusifs :** `Facebook Reels`, `Instagram Reels`, `Facebook Stories`, `Instagram Stories`.
- **Créatif exclusif :** `creatives-v2/v2_video_wallonie_9x16.mp4` (`1080×1920`, `15 s`, zones sûres Reels/Stories respectées).
- **Pourquoi séparer :** Empêche Meta de diffuser des vignettes statiques 4:5 en Reels, tout en captant les CPM plus bas du format vertical immersif avec un vrai motion design.

---

## 3. Paramètres UTM & URL de Destination Standardisés

**URL de destination recommandée :**
```text
https://www.aegissolaire.com/devis-panneaux-solaires?utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{placement}}
```

*(Note : ajouter `&utm_term={{placement}}` permet dans Supabase `funnel_step_events` de distinguer immédiatement les sessions issues de `Facebook_Mobile_Feed` vs `Instagram_Stream` vs `Reels`.)*

---

## 4. Les 4 Créatifs & Textes Complets (Français Belgique / Wallonie)

### V2-AD1 — Angle Douleur / Écart Réel de Prix (`V2_AD1_ECART_1850_4X5`)
- **Fichier visuel :** `campagnes-meta/creatives-v2/v2_ad1_ecart1850_4x5.png` (`1080×1350`, ratio 4:5)
- **URL CTA :** `https://www.aegissolaire.com/devis-panneaux-solaires?utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=V2_AD1_ECART_1850_4X5&utm_term={{placement}}`
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

### V2-AD2 — Angle Rentabilité 2026 & Fin du Compteur à l'Envers (`V2_AD2_RENTABILITE_2026_4X5`)
- **Fichier visuel :** `campagnes-meta/creatives-v2/v2_ad2_rentabilite2026_4x5.png` (`1080×1350`, ratio 4:5)
- **URL CTA :** `https://www.aegissolaire.com/devis-panneaux-solaires?utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=V2_AD2_RENTABILITE_2026_4X5&utm_term={{placement}}`
- **CTA Meta :** `En savoir plus` (`LEARN_MORE`) ou `Obtenir un devis` (`GET_QUOTE`)

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

### V2-AD3 — Angle Anti-Démarchage & Zéro Harcèlement (`V2_AD3_ANTI_DEMARCHAGE_4X5`)
- **Fichier visuel :** `campagnes-meta/creatives-v2/v2_ad3_anti_demarchage_4x5.png` (`1080×1350`, ratio 4:5)
- **URL CTA :** `https://www.aegissolaire.com/devis-panneaux-solaires?utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=V2_AD3_ANTI_DEMARCHAGE_4X5&utm_term={{placement}}`
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

### V2-VIDEO1 — Vidéo Motion 15s (`V2_VIDEO_WALLONIE_REELS_9X16` & `V2_VIDEO_WALLONIE_FEED_4X5`)
- **Fichiers visuels :**
  - `campagnes-meta/creatives-v2/v2_video_wallonie_9x16.mp4` (`1080×1920`, `15 s`, `30 fps`, H.264) → AdSet Reels/Stories
  - `campagnes-meta/creatives-v2/v2_video_wallonie_4x5.mp4` (`1080×1350`, `15 s`, `30 fps`, H.264) → AdSet Feed FB/IG
- **URL CTA :** `https://www.aegissolaire.com/devis-panneaux-solaires?utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content=V2_VIDEO_WALLONIE_15S&utm_term={{placement}}`
- **Texte principal :** Utiliser la version courte de **V2-AD1** (`1 850 € d'écart`).
- **Titre (Headline) :** `1 850 € d'écart ? Comparez 3 devis`
- **Description :** `Gratuit · 45 sec · Wallonie (RESCERT)`

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

