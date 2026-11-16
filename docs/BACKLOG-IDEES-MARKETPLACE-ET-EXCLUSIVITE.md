# 💡 Backlog Produit & Réflexions Stratégiques — Feedback Installateurs, B2B/B2C & Exclusivité B2C

**Date de rédaction :** 16 novembre 2026  
**Statut :** En attente / Mis de côté pour implémentation ultérieure (aucune modification applicative effectuée à ce stade)  
**Périmètre :** Marketplace partenaires, télémétrie installateurs, tarification B2C/B2B et parcours particulier (`/devis-panneaux-solaires`)

---

## Contexte & Base technique existante (État au 16/11/2026)

Avant toute future implémentation, rappel des règles économiques et briques techniques déjà présentes dans le dépôt :

- **Barème V2 (`lib/credit-pricing.ts`) :**
  - `1 crédit ≈ 9,83 € HTVA` (`29,50 € HTVA / 3`).
  - **B2C (partagé max `3` installateurs) :** `3 crédits` (`29,50 € HTVA`) par acheteur → recette maximale par lead = **`88,50 € HTVA`**.
  - **B2B (exclusif `1` installateur) :** `9 crédits` (`88,50 € HTVA`) → recette par lead = **`88,50 € HTVA`**.
  - **Commissions partenaires média (`app/cgv/page.tsx`) :** `10,00 € HTVA` par lead B2C validé, `30,00 € HTVA` par lead B2B validé.
- **Télémétrie comportementale existante (`supabase/migrations/202611130001_partner_activity_telemetry.sql`, `lib/partner-telemetry.ts`) :**
  - Table `partner_activity_events` traçant : `session_start`, `email_deep_link`, `lead_inspect_open`, `lead_inspect_duration`, `roof_photo_zoom`, `unlock_intent`, `credit_modal_open`, `marketplace_filter`, `crm_tab_open`.
- **Préférences & Suivi CRM existants :**
  - `app/api/partners/preferences/route.ts` et `components/partners/partner-notifications-client.tsx` gèrent déjà `segment` (`B2B` / `B2C` / `BOTH`), `target_provinces`, `target_surfaces`, `min_facture` et des liens signés par `token`.
  - `app/api/partners/purchases/[id]/route.ts` gère déjà `pipeline_status` (`to_contact`, `contacted`, `meeting_scheduled`, `quote_sent`, `won`, `lost`).
- **Promesse particulier actuelle (`app/devis-panneaux-solaires/devis-landing-client.tsx`, `lib/prospect-confirmation-email.ts`) :**
  - B2C : *« Comparez jusqu'à 3 devis »* / *« transmis à jusqu'à 3 installateurs certifiés RESCERT »*.
  - B2B : *« transmis en exclusivité à 1 installateur partenaire certifié RESCERT »*.

---

## 1. Recueillir du feedback auprès des installateurs

### Idées brutes issues du brainstorm
- Comprendre précisément ce qui freine l'achat de leads (localisation, photos du bâtiment, puissance `kWc`, prix, concurrence, vécu du dernier achat, appétit pour l'exclusivité).
- Associer un questionnaire général rapide à des questions ciblées basées sur l'historique des consultations, clics et achats (ex. consulte souvent sans acheter, clique sur les grosses puissances, cible certaines zones géographiques sans convertir, ou a cessé d'acheter).

### Limites identifiées sur l'approche « questionnaire classique »
- Un formulaire de 8+ questions subit un fort biais de survie auprès des artisans/dirigeants PME belges : les profils inactifs ou hésitants ne le remplissent pas.
- Les questions hypothétiques sur le prix (*« Seriez-vous prêt à payer davantage ? »*) déclenchent un réflexe de négociation déclaratif qui ne reflète pas le comportement réel d'achat.

### Solution optimale retenue pour l'implémentation future : *In-Moment Micro-Feedback* + E-mails 1-clic
1. **Micro-sondage in-app déclenché par la télémétrie (`1 question, 1 clic`) :**
   - **Déclencheur :** fermeture du tiroir d'inspection (`components/partners/dashboard/lead-inspection-drawer.tsx`) après `lead_inspect_duration > 20s` ou événement `unlock_intent` / `credit_modal_open` sans achat (plafonné à 1 affichage tous les 14 jours par partenaire).
   - **Question :** *« Qu'est-ce qui vous a retenu sur ce dossier ? »* → 4 boutons 1-clic : `Prix du lead` · `Zone hors secteur` · `Projet trop petit` · `Concurrence (3 devis)` + champ libre facultatif.
2. **Feedback post-achat J+7 dans le CRM (`lead_purchases`) :**
   - Pour les dossiers restés en `to_contact` ou passés en `lost`, capture rapide du motif : `Injoignable` · `Déjà signé ailleurs` · `Budget insuffisant` · `Hors zone`.
3. **Campagne e-mail 1-clic signée par token pour les profils segmentés (consultants sans achat / dormants > 30 jours) :**
   - Réutiliser le pattern de token signé déjà présent dans `components/partners/partner-notifications-client.tsx` : 4 liens de réponse directe dans l'e-mail (le simple clic enregistre le motif en base avant d'afficher une confirmation optionnelle).
   - Adapter l'accroche selon `partner_activity_events` : ex. installateur qui ouvre principalement des dossiers > 15 kWc → proposition directe de passer ses alertes sur du B2B / haute puissance uniquement.
4. **Complément qualitatif hors code :** 5 à 10 appels de 10 min menés par L'équipe Support Partenaires Aegis Solaire auprès de profils mixtes (acheteurs réguliers, consultants sans achat, dormants).

---

## 2. Comprendre et exploiter la préférence B2B / B2C

### Constat du brainstorm
- Un installateur a indiqué par e-mail ne vouloir que des leads B2B et aucun B2C, alors que le pourcentage de marge modélisé est plus élevé en B2C (`20 %` en B2C vs `14–18 %` en B2B dans `lib/marketplace-pricing.ts`).

### Analyse économique & terrain
- **Marge absolue par heure commerciale :** 20 % sur 7 500 € HTVA (1 500 €) exige souvent autant de temps commercial, de déplacements et de démarches (ORES/RESA, RGIE) que 16 % sur un projet B2B à 60 000 € HTVA (9 600 €).
- **Exclusivité asymétrique existante :** sur Aegis Solaire, le B2B est déjà 100 % exclusif (`1` acheteur), contrairement au B2C (`3` acheteurs max).
- **Positionnement technique :** certains installateurs tertiaires ne sont pas structurés pour du résidentiel (tuiles/ardoises).

### Solution optimale retenue pour l'implémentation future
- Ne pas chercher à convaincre un partenaire B2B d'acheter du petit B2C ; affiner plutôt le ciblage :
  - Ajouter un **seuil de puissance minimale souhaitée (`min_kwc`)** et des préférences techniques (batterie, borne VE, type de toiture) dans `partners` et `app/api/partners/preferences/route.ts`.
  - Mettre en avant dans la marketplace et les e-mails le **gain brut absolu estimé (€)** et le ratio **temps commercial / panier** en plus du taux de marge.

---

## 3. Leads B2C exclusifs & perception de la concurrence

### Idée brute du brainstorm
- Un installateur a arrêté d'acheter des leads par crainte d'être en concurrence avec « 4 ou 5 installateurs » (sans qu'on lui ait rappelé que le plafond B2C Aegis Solaire est de `3` max).
- Piste évoquée dans le brainstorm : Option A partagé (`30 €`) vs Option B exclusif (`60 €`).

### Alerte économique majeure (pourquoi `60 €` est à rejeter)
- **Cannibalisation de revenu :** un lead B2C vendu 3 fois au tarif actuel (`29,50 € HTVA`) rapporte **`88,50 € HTVA`** (comme un B2B exclusif). Plafonner l'exclusivité à `60 €` amputerait la recette maximale de **-32 %**.
- **Sélection adverse (anti-sélection) :** les installateurs verrouilleraient à `60 €` uniquement les meilleurs dossiers B2C (ceux qui se seraient de toute façon vendus 3 fois à `88,50 €`), tout en laissant les dossiers moyens en partagé (souvent 1 ou 2 acheteurs). Le revenu moyen par lead (ARPL) s'effondrerait.

### Solution optimale retenue pour l'implémentation future
1. **Correction immédiate de perception (prioritaire avant toute refonte tarifaire) :**
   - Rappeler explicitement dans les échanges commerciaux, les teasers e-mail et l'interface marketplace : **B2B = 100 % exclusif (1 seul installateur)** et **B2C = strictement plafonné à 3 maximum** (contre 5 à 8 chez les courtiers généralistes).
   - Afficher un signal clair de fraîcheur et de priorité lorsque `taken_slots === 0` (*« 0/3 attribué — Soyez le premier à contacter »*).
2. **Tarification saine si lancement d'une option B2C exclusive :**
   - **Prix plancher strict ≥ 100 % du revenu partagé max :** minimum **`9 crédits` (`88,50 € HTVA`)**, idéalement **`10 à 12 crédits` (`98,33 €` à `118,00 € HTVA`)** (soit ~3,3× à 4× le slot partagé).
   - **Règle d'éligibilité atomique dans `purchase_marketplace_lead` (`supabase/migrations/202610280001_pricing_v2.sql`) :** l'achat exclusif n'est autorisé que lorsque **`taken_slots === 0`**. Dès le 1er achat partagé (`1/3`), le mode exclusif est masqué/bloqué.

---

## 4. Problème des « 3 devis » côté particulier (et évaluation de l'effet de leurre)

### Problème identifié
- Le tunnel B2C promet actuellement *« jusqu'à 3 devis »*. Si un installateur achète le lead en exclusivité :
  - le particulier peut être déçu, bloquer sa signature en attendant les 2 autres devis, ou **aller déposer une demande sur un site concurrent (Bobex, TrustUp, etc.)** — annulant de facto l'exclusivité payée par l'installateur.

### Pourquoi l'effet de leurre (« 1 vrai devis + 2 propositions comparatives artificielles ») est à écarter
1. **Risque juridique (Code de droit économique belge, Livre VI) :** simuler 2 propositions comparatives artificielles autour d'un seul devis réel pour orienter le choix via un effet de leurre expose une plateforme se présentant comme comparateur à une qualification de **pratique commerciale trompeuse**.
2. **Risque commercial contre-productif :** si l'estimation indicative affichée est plus basse que le devis réel de l'installateur (contraintes RGIE, charpente, ardoises), elle discrédite votre propre acheteur exclusif ; si elle est artificiellement haute, elle détruit la confiance envers Aegis Solaire.
3. **Frustration client :** le particulier distingue vite une fourchette générique d'un devis d'artisan local.

### Solution optimale retenue pour l'implémentation future : Double Parcours Explicite
- **Option principale (recommandée) — Séparer la promesse dès l'acquisition / le formulaire :**
  - **Parcours A — « Comparatif jusqu'à 3 devis » :** routé vers le pool B2C partagé (`3 slots max`, `29,50 € HTVA`).
  - **Parcours B — « Étude Unique Prioritaire (1 seul installateur certifié RESCERT, zéro démarchage multiple) » :** ciblé en acquisition (angle anti-harcèlement téléphonique très performant sur Meta Ads) ou choisi en fin de formulaire, routé vers la marketplace en **exclusivité native à `9–12 crédits` (`88,50 € – 118,00 € HTVA`)**.
  - **Bénéfice :** promesse 100 % alignée de la publicité à l'e-mail de confirmation (`lib/prospect-confirmation-email.ts`), 0 déception, 0 fuite vers des comparateurs tiers, taux de closing maximal.
- **Option complémentaire (si conservation temporaire d'un seul formulaire) :**
  - Ne jamais générer de fausses offres comparatives. Fournir au particulier un **Benchmark neutre €/Wc Wallonie 2026 + checklist technique de contrôle de devis** (onduleur, garantie, RGIE, C10/11) et annoncer en toute transparence qu'un installateur RESCERT prioritaire de sa zone prend en charge son étude (avec option de solliciter d'autres artisans seulement sur demande explicite ultérieure).

---

## 5. Critères pour déclencher l'implémentation plus tard

Quand il sera décidé de sortir ce chantier du backlog, procéder dans cet ordre :
1. **Valider qualitativement** (5–10 appels installateurs + analyse des données existantes dans `partner_activity_events`).
2. **Déployer d'abord** le micro-feedback 1-clic + le filtre `min_kwc` dans les préférences partenaires (faible risque, impact immédiat sur la rétention et la qualification).
3. **Tester l'exclusivité B2C en A/B contrôlé** sur 30 à 50 leads avec promesse alignée côté particulier (« 1 installateur unique sans démarchage ») au tarif **≥ `9 crédits` (`88,50 € HTVA`)**, en comparant **ARPL réel**, **taux de déblocage** et **taux de closing `won` dans le CRM** face au B2C partagé.
