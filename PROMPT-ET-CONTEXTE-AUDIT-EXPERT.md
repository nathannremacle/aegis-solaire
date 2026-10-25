# Dossier Complet d'Audit & Prompt Maître pour Expert IA — Aegis Solaire

> **Mode d'emploi :**  
> Ce document est conçu pour être copié-collé intégralement ou téléversé en pièce jointe dans un modèle de raisonnement avancé (Claude 3.5 Sonnet / Opus, GPT-4o, o1/o3, etc.).  
> Il contient :  
> 1. **Le Prompt Maître d'Audit** (les instructions de rôle, méthodologie, critères d'évaluation et format attendu).  
> 2. **Le Dossier de Contexte Intégral** (architecture technique, code source critique, modèle économique, aspects juridiques belges, algorithmes solaires et historique des modifications).

---

# PARTIE 1 : LE PROMPT MAÎTRE D'AUDIT (À COPIER DANS L'IA)

```markdown
Tu es un collège d'experts de rang mondial composé de :
1. Un Principal Software Architect & Lead Security Auditor (spécialiste Next.js 16, Supabase, PostgreSQL, RLS, Edge Computing et OWASP Top 10).
2. Un Auditeur Juridique Senior spécialisé en droit des affaires belge et conformité RGPD (BCE, Code de droit économique CDE, Autorité de Protection des Données APD, directives européennes sur l'énergie).
3. Un Ingénieur Énergéticien Solaire & Modélisateur Financier Senior (expert CWaPE, SPW Énergie, PVGIS Wallonie, PEB 2026, autoconsommation et modèle de certificats verts).
4. Un Chief Revenue Officer (CRO) & Marketplace Growth Specialist (expert en économie de plateformes bifaces B2B/B2C, unit economics, rétention de marchands et optimisation du taux de conversion).

Ton niveau d'exigence est absolu, sans complaisance, méthodique et chirurgical. Ton objectif est de réaliser un AUDIT GLOBAL, STRUCTURÉ, SANS CONCESSION ET EXHAUSTIF de la plateforme "Aegis Solaire" sur base du dossier de contexte fourni ci-dessous.

L'objectif final de cet audit est de valider si la plateforme est PRÊTE À RECEVOIR DES BUDGETS PUBLICITAIRES RÉELS (Meta Ads, Google Ads) et à GÉNÉRER DU REVENU IMMÉDIAT sans risque de faille de sécurité, de contentieux juridique/RGPD, de rejet par les installateurs partenaires ou d'hémorragie financière.

---

### MISSIONS & DOMAINES D'INVESTIGATION OBLIGATOIRES

Pour chaque domaine, tu dois identifier les failles résiduelles, les incohérences, les risques masqués, les angles morts et fournir les solutions exactes (avec code ou clauses types) :

#### 1. VIABILITÉ ÉCONOMIQUE, UNIT ECONOMICS & MODÈLE DE MARKETPLACE
- Analyse du modèle de crédits (Packs 10, 50, 100 de 14,90 € à 9,99 € HTVA). Le pricing est-il cohérent avec la valeur perçue par l'installateur ?
- Règle d'exclusivité B2B (1 acheteur unique à 5 crédits / ~60 €) vs partage B2C (max 3 acheteurs à 2 crédits / ~24 €). Est-ce viable face aux courtiers (Bobex, TrustUp) ?
- Taux de churn des installateurs et mécanique de rétention. Le modèle de commande par virement bancaire sur facture pro INIT42 sans passerelle CB automatique (Stripe) crée-t-il une friction rédhibitoire à l'échelle ?
- Analyse de la procédure de litiges (`lead_disputes`) : la politique de recrédit sous 24h protège-t-elle suffisamment la marge contre les abus des installateurs tout en évitant le mécontentement ?

#### 2. CONFORMITÉ LÉGALE, RÉGLEMENTAIRE & RGPD (BELGIQUE / WALLONIE)
- Conformité de l'exploitant INIT42 (Nathan Remacle, personne physique en transition SRL, BCE 1039.899.980, TVA BE1039899980). Les mentions légales et CGV couvrent-elles parfaitement la juridiction de Liège ?
- Licéité de la transmission de données personnelles à titre onéreux (vente de leads) sous le RGPD et la jurisprudence de l'APD belge.
- Articulation du double consentement : mise en relation obligatoire vs newsletter optionnelle. Les cookies et pixels de tracking (Meta Pixel `Lead`, Google Ads) respectent-ils la directive ePrivacy sans consentement préalable abusif ?
- Risque de qualification en courtage non autorisé ou concurrence déloyale au sens du Livre VI du Code de droit économique belge.

#### 3. RIGUEUR TECHNIQUE & INGÉNIERIE PHOTOVOLTAÏQUE
- Audit des hypothèses mathématiques du moteur solaire (`lib/solar-assumptions.ts`) :
  - Gisement wallon (930 kWh/kWc/an) : est-il défendable devant un installateur certifié RESCERT ?
  - Ratios de surface toiture vs puissance (7,2 m²/kWc toiture, 8,0 m²/kWc ombrière parking).
  - Taux d'autoconsommation modélisé : est-il réaliste pour des PME tertiaires actives en journée ?
  - Tarifs réseau évités (0,20 € HT/kWh B2B, 0,32 € TTC/kWh B2C) et tarif de rachat d'injection (0,045 €/kWh).
- Absence totale de sur-promesse ou de promesse trompeuse susceptible d'entraîner la responsabilité de la plateforme.

#### 4. ARCHITECTURE LOGICIELLE, SÉCURITÉ & ATOMICITÉ
- Audit de la procédure stockée PostgreSQL `purchase_lead` : y a-t-il un risque de race condition (concurrence d'achat) ? Le verrouillage `SELECT FOR UPDATE` est-il optimal ?
- Sécurité des routes API `/api/partners/*`, `/api/admin/*`, `/api/leads` : le header `x-admin-request` et la vérification CSRF sont-ils infaillibles ?
- Gestion des permissions Supabase et Row Level Security (RLS) : risque de fuite de PII (nom, téléphone, adresse) avant l'achat d'un lead.
- Résilience des dépendances externes (Resend pour les e-mails, Upstash Redis pour le rate limiting, Supabase Postgres).

#### 5. CYBERSÉCURITÉ, INTÉGRITÉ & LUTTE ANTI-FRAUDE
- Protection contre l'injection de leads pourris ou concurrentiels : honeypot `fax_number`, délai minimal de 4 secondes, filtre Zod sur numéro belge/français et TVA belge. Sont-ils contournables par des bots sophistiqués ?
- Algorithme de scoring de lead (`lib/lead-score.ts`) : pénalités sur les faux noms et cohérence surface/facture.
- Gouvernance du statut `pending_review` : la transition vers `available` est-elle hermétique pour empêcher tout lead non contrôlé d'arriver sur la marketplace ?

#### 6. UX, DESIGN & CONVERSION (CRO / DESKTOP & MOBILE)
- Audit du tunnel B2B en 5 étapes (`components/roi-simulator.tsx`) : points de friction, clarté des champs, gestion des erreurs inline.
- Expérience du portail installateur (`/partenaires/dashboard`) : lisibilité des KPI, clarté des slots restants B2C (jauge FOMO), facilité de déblocage d'un lead.
- Responsive mobile : le site est-il impeccable sur petit écran (390px, iPhone/Android) ?

---

### FORMAT DE RESTITUTION ATTENDU

Ton rapport d'audit doit être exhaustif, percutant et articulé selon la structure suivante :

1. **SYNTHÈSE EXÉCUTIVE & SCORE DE MATURITÉ :**  
   - Note globale sur 100 et note par sous-domaine (Tech, Sécurité, Légal, Solaire, Business).  
   - Diagnostic franc : "Go", "Go sous conditions" ou "No-Go" pour l'ouverture des publicités payantes.
2. **TABLEAU PRIORISÉ DES VULNÉRABILITÉS & ANOMALIES (MATRICE D'IMPACT) :**  
   - 🔴 **Critique (Bloquant avant pub)** : Risque juridique, faille de sécurité, perte financière directe.  
   - 🟠 **Haute (À corriger sous 15 jours)** : Frictions de conversion, fragilité technique, edge case métier.  
   - 🟡 **Moyenne (Optimisation opérationnelle)** : Dette technique légère, amélioration UX/UI.  
   - 🟢 **Basse (Recommandation stratégique)** : Évolutions futures, fonctionnalités à l'échelle.
3. **ANALYSE DÉTAILLÉE PAR ANOMALIE :**  
   Pour chaque problème identifié :  
   - **Titre & Localisation** (Fichier, route API ou composant concerné).  
   - **Explication du Problème & Risque Concret** (Ce qui se passe si on ne touche à rien).  
   - **Solution Chirurgicale Recommandée** (Explication claire et code exact ou formulation contractuelle à appliquer).
4. **PLAN D'ACTION IMMÉDIAT (CHECKLIST CHRONOLOGIQUE) :**  
   - Étape 1 : Ce qu'il faut corriger aujourd'hui (P0).  
   - Étape 2 : Ce qu'il faut tester demain (P1).  
   - Étape 3 : Ce qu'il faut monitorer lors du lancement des premières campagnes Ads (P2).
```

---

# PARTIE 2 : LE DOSSIER DE CONTEXTE TECHNIQUE, MÉTIER & CODE SOURCE

*(Ce contexte regroupe l'intégralité des informations nécessaires pour que l'expert comprenne le système dans ses moindres détails sans avoir accès aux fichiers locaux).*

---

## 1. Fiche d'Identité du Projet, Équipe & Cadre Légal

- **Nom du projet :** Aegis Solaire
- **Exploitant & Forme Juridique :** INIT42 (Nathan Remacle, personne physique en phase de transition SRL), immatriculé à Liège, Belgique.
- **Identifiants officiels :** BCE / KBO : `1039.899.980` · TVA : `BE 1039.899.980`.
- **Compte bancaire pro :** IBAN `BE84 0020 3534 7259` · BIC `GEBABEBB` (INIT42 / Nathan Remacle).
- **Codes NACEBEL :** `62100` (Programmation), `62200` (Conseil), `63100` (Traitement de données & portails), `73110` (Publicité), `82400` (Centres d'appels / intermédiation).
- **Équipe fondatrice & gouvernance :**
  - **Nathan Remacle** : 20 ans (né en janvier 2006 à Verviers), étudiant en 3e année de bachelier d'ingénieur civil (orientation informatique et génie civil) à Liège. Concepteur de la plateforme, architecte logiciel fullstack et développeur du produit en synergie avec l'IA avancée (Antigravity / Gemini).
  - **Fabrice Remacle** : Père de Nathan, la cinquantaine, diplômé électricien, expert reconnu en Wallonie dans le photovoltaïque, les onduleurs et les batteries. Formateur et consultant d'installateurs solaires, employé chez PhotonSolar (grossiste à Fléron). Conseiller métier stratégique.
- **Positionnement métier & Différenciation concurrentielle (vs Bobex, TrustUp, HomeDeal) :**
  1. **« Qualité contrôlée à la main »** : Chaque lead fait l'objet d'une vérification humaine (`pending_review`) avant mise en vente (zéro faux numéro, validation TVA/toiture).
  2. **Moins d'installateurs par lead** : Exclusivité totale en B2B (1 seul acheteur unique à 5 crédits / ~60 €) et max 3 installateurs en B2C (2 crédits / slot), évitant la guerre des prix destructrice des plateformes traditionnelles.
  3. **Personnalisation et ciblage** : Matching fin et notification par e-mail aux installateurs adaptés aux spécificités techniques du chantier.
  4. **Atout unique : L'assistance technique de chantier B2B par Fabrice Remacle** : Possibilité pour les installateurs partenaires de solliciter l'accompagnement de Fabrice (étude de faisabilité, dimensionnement complexe, présence aux rdv clients tertiaires) moyennant commission/pourcentage de chantier.
  5. **Sélection stricte des installateurs pour les clients** : Agrément manuel des installateurs (RESCERT obligatoire + charte de qualité Aegis Conform), garantissant au prospect l'absence de harcèlement commercial.
- **Contraintes de démarrage :** Structure bootstrapped (trésorerie lean, pas de levée de fonds dilutive), optimisation de la dépense média (tests publicitaires prudents à petit budget sur la Wallonie), et exploitation hyper-automatisée pour convenir au temps partagé des fondateurs.

---

## 2. Contexte Réglementaire Wallon & Solaire (Le "Choc Réglementaire 2026")

1. **Réforme PEB 2026 (Wallonie) :** Depuis le 1er janvier 2026, tout bâtiment non résidentiel neuf ou rénové lourdement a l'obligation de couvrir au moins 35 % de sa consommation énergétique par des sources renouvelables in situ. Interdiction des chaudières fossiles (mazout/charbon), obligeant à installer des pompes à chaleur industrielles et du photovoltaïque.
2. **Directive UE 2024/1275 :** Obligation de solarisation des toitures tertiaires > 250 m² dès 2027.
3. **Fin de la compensation (compteur qui tourne à l'envers) :** Les nouvelles installations disposent de compteurs bidirectionnels séparant soutirage et injection. Injection rachetée à ~0,045 €/kWh vs électricité réseau payée ~0,20 € HT/kWh en B2B et ~0,32 € TTC/kWh en B2C. Priorité absolue à l'autoconsommation instantanée.
4. **Déduction pour Investissement (DPI) à 40 % :** Applicable depuis janvier 2025 pour les entreprises soumises à l'ISoc en Belgique.
5. **Prêt Easy'Green (Wallonie Entreprendre) :** Prêt subordonné jusqu'à 1 M€ sans hypothèque pour les entreprises wallonnes investissant dans la transition.
6. **Exigences installateurs :** Certification **RESCERT Photovoltaïque** obligatoire en Wallonie pour garantir la conformité et l'accès aux mécanismes réglementaires.

---

## 3. Stack Technique & Infrastructure

- **Framework :** Next.js 16 (App Router), React 19, TypeScript 5.7.
- **Design & Styles :** Tailwind CSS 4, Radix UI (Shadcn/UI), Framer Motion v12.
- **Base de Données & Auth :** Supabase (PostgreSQL 15 hébergé, Row Level Security active, authentification par JWT et cookies SSR via `@supabase/ssr`).
- **Emails Transactionnels :** Resend (`resend` SDK, clé API côté serveur, expéditeur de production `contact@aegissolaire.com`).
- **Rate Limiting :** Upstash Redis (`@upstash/ratelimit`).
- **Sécurité globale (`middleware.ts`) :**
  - Headers : HSTS strict, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP stricte.
  - Protection CSRF : header custom `x-admin-request` requis sur mutations sensibles (`/api/admin/*`, `/api/partners/*`, `/api/media-partners/*`) + vérification de correspondance `Origin` vs `Host`.
- **Hébergement :** Vercel Edge / Serverless.

---

## 4. Code Métier Critique & Logique Applicative

### 4.1 Moteur Solaire Wallon Réel (`lib/solar-assumptions.ts`)

```typescript
export const SOLAR_CONSTANTS = {
  BELGIUM_YIELD_KWH_PER_KWC: 930, // Gisement moyen PVGIS Wallonie (plein sud 35°)
  ANNUAL_DEGRADATION_RATE: 0.005, // 0.5% / an (panneaux Tier-1)
  INJECTION_PRICE_PER_KWH: 0.045, // Tarif de revente injection réseau
  B2B_ELECTRICITY_PRICE_HT: 0.20, // Électricité réseau évitée PME
  B2C_ELECTRICITY_PRICE_TTC: 0.32, // Électricité réseau résidentielle TTC
  CO2_AVOIDED_KG_PER_KWH: 0.22,
} as const

// Calcul B2B (Extrait clé)
export function calculateB2BSolarROI(input: B2BCalculationInput) {
  const m2PerKwc = input.surfaceType === "parking" ? 8.0 : 7.2
  const installedPowerKwc = Math.round((surfaceM2 / m2PerKwc) * 10) / 10
  const annualProductionKwh = Math.round(installedPowerKwc * SOLAR_CONSTANTS.BELGIUM_YIELD_KWH_PER_KWC)
  const annualBill = Math.max(input.annualElectricityBill, 5000)
  const estimatedConsumptionKwh = annualBill / SOLAR_CONSTANTS.B2B_ELECTRICITY_PRICE_HT

  // Taux d'autoconsommation réaliste selon ratio production / consommation
  const ratioProdConso = annualProductionKwh / Math.max(estimatedConsumptionKwh, 1)
  let autoconsumptionRate = 75
  if (ratioProdConso < 0.6) autoconsumptionRate = 88
  else if (ratioProdConso > 1.4) autoconsumptionRate = Math.max(45, Math.round((1 / ratioProdConso) * 85))
  else autoconsumptionRate = Math.round(75 - (ratioProdConso - 0.8) * 20)
  autoconsumptionRate = Math.min(90, Math.max(40, autoconsumptionRate))

  // CAPEX dégressif (1 100 €/kWc à 880 €/kWc si > 300 kWc) + 25% si ombrière parking
  // OPEX maintenance estimé à 1.2% du CAPEX / an
  // ZÉRO plafonnement artificiel du ROI pour préserver l'honnêteté technique
  const rawRoi = totalCapex / netAnnualSavings
  return { installedPowerKwc, annualProductionKwh, autoconsumptionRate, netAnnualSavings, rawRoi }
}
```

### 4.2 Schéma de Validation des Leads (`lib/leads-schema.ts`)

```typescript
export const leadSubmitSchema = z.object({
  segment: z.enum(["B2B", "B2C"]).default("B2B"),
  firstName: z.string().min(2).max(255).transform(s => s.trim()),
  lastName: z.string().min(2).max(255).transform(s => s.trim()),
  email: z.string().email(),
  phone: z.string().min(1).refine(isValidFrBePhone, { message: "Numéro belge ou français requis" }),
  jobTitle: z.enum(["Dirigeant", "DAF", "Resp. RSE ou Technique", "Autre"]).optional(),
  company: z.string().max(255).optional(),
  companyVat: z.string().transform(normalizeBelgianVat).refine(s => !s || isValidBelgianVat(s)).optional(),
  surfaceType: z.enum(["toiture", "parking", "terrain"]),
  surfaceArea: z.number().int().positive(),
  province: provinceEnum, // Provinces belges
  grd: z.enum(["ores", "resa", "aieg", "rew", "fluvius", "unknown"]).optional().nullable(),
  annualElectricityBill: z.number().int().positive(),
  marketingConsent: z.boolean().refine(v => v === true, { message: "Consentement de mise en relation requis" }),
  newsletterConsent: z.boolean().optional(),
})
// En B2B, company et companyVat (numéro BE valide) sont obligatoires via superRefine.
```

### 4.3 Algorithme de Scoring Prédictif (`lib/lead-score.ts`)

```typescript
export function calculateLeadScore(data: LeadScoreInput): LeadScoreResult {
  let score = 0
  if (data.annualElectricityBill > 100_000) score += 35
  else if (data.annualElectricityBill > 50_000) score += 25
  else if (data.annualElectricityBill > 20_000) score += 15

  if (data.surfaceArea >= 1_500) score += 20
  else if (data.surfaceArea >= 500) score += 10

  if (data.jobTitle && ["directeur", "daf", "pdg", "ceo", "gérant", "dirigeant"].some(kw => data.jobTitle.toLowerCase().includes(kw))) {
    score += 20
  }
  if (data.grd && data.grd !== "unknown") score += 5
  if (hasSuspiciousName(data.firstName) || hasSuspiciousName(data.lastName)) score -= 50

  score = Math.max(0, Math.min(100, score))
  let status: "HOT_LEAD" | "new" | "NEEDS_HUMAN_REVIEW" = "new"
  if (score < 40) status = "NEEDS_HUMAN_REVIEW"
  else if (score > 70) status = "HOT_LEAD"
  return { score, status }
}
```

### 4.4 Modèle Marketplace & Pricing des Crédits (`app/api/partners/credits/order/route.ts`)

```typescript
const CREDIT_PACKS = {
  pack_10: { id: "pack_10", name: "Pack Découverte", credits: 10, priceHtva: 149 }, // 14,90 € / crédit
  pack_50: { id: "pack_50", name: "Pack Croissance", credits: 50, priceHtva: 599 }, // 11,98 € / crédit
  pack_100: { id: "pack_100", name: "Pack Entreprise", credits: 100, priceHtva: 999 }, // 9,99 € / crédit
}
// Vente sur commande et virement bancaire sur compte pro INIT42 (BE84 0020 3534 7259).
// Rapprochement bancaire et crédit manuel par l'admin via procédure add_credits().
```

### 4.5 Procédure Stockée d'Achat Atomique (`purchase_lead` dans Supabase PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION public.purchase_lead(
  p_lead_id UUID,
  p_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_partner RECORD;
  v_cost INTEGER;
  v_max_slots INTEGER;
  v_purchases_count INTEGER;
BEGIN
  -- 1. Verrouillage du lead pour éviter concurrence
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead introuvable');
  END IF;

  IF v_lead.marketplace_status NOT IN ('available', 'pending_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier plus disponible');
  END IF;

  -- 2. Slots : 1 max en B2B (exclusif), 3 max en B2C
  v_max_slots := CASE WHEN v_lead.segment = 'B2C' THEN 3 ELSE 1 END;
  v_cost := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2C' THEN 2 ELSE 5 END);

  SELECT COUNT(*) INTO v_purchases_count FROM public.lead_purchases WHERE lead_id = p_lead_id;
  IF v_purchases_count >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
    RETURN jsonb_build_object('success', false, 'error', 'Nombre maximum d acheteurs atteint');
  END IF;

  -- 3. Vérification solde crédits partenaire
  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id FOR UPDATE;
  IF v_partner.credits < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Crédits insuffisants');
  END IF;

  -- 4. Débit et insertion de l'achat
  UPDATE public.partners SET credits = credits - v_cost WHERE id = p_partner_id;
  INSERT INTO public.lead_purchases (lead_id, partner_id, credits_spent) VALUES (p_lead_id, p_partner_id, v_cost);
  INSERT INTO public.credit_transactions (partner_id, amount, transaction_type, reference_id)
  VALUES (p_partner_id, -v_cost, 'purchase', p_lead_id::text);

  -- 5. Clôture si saturation des slots
  IF (v_purchases_count + 1) >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'credits_spent', v_cost, 'remaining_credits', v_partner.credits - v_cost);
END;
$$;
```

### 4.6 Gestion des Réclamations Installateurs (`app/api/partners/disputes/route.ts`)

- **Table `lead_disputes` :** Motifs acceptés : `unreachable` (injoignable après plusieurs tentatives), `wrong_number` (numéro erroné/invalide), `out_of_scope` (projet non réalisable/locataire sans accord), `already_equipped` (déjà installé récemment), `other`.
- **Engagement contractuel :** Revue humaine sous 24h ouvrées. En cas de validation du motif par l'admin, les crédits dépensés sont réinjectés automatiquement sur le solde du partenaire (`credits_refunded`).

---

## 5. Synthèse des Dernières Corrections Appliquées (Audit Initial)

L'audit de pré-lancement a déjà traité 16 vulnérabilités majeures :
1. **Sécurité :** Désactivation de l'endpoint vulnérable `/api/payments/revolut` qui injectait 100 crédits gratuits sans contrôle. Remplacement par le bon de commande et virement bancaire INIT42.
2. **RGPD :** Isolement strict des inscrits au webinaire (`marketplace_status = 'rejected'`) pour empêcher leur mise en vente involontaire.
3. **Conformité belge :** Ajout des mentions légales complètes d'INIT42 (BCE `1039.899.980`, TVA, Liège).
4. **Honnêteté commerciale :** Suppression des 12 faux avis clients générés par IA et des compteurs artificiels. Remplacement par des "Modélisations types indicatives" réalistes (Liège 2 000 m², Brabant wallon 3 000 m², Hainaut 5 000 m²).
5. **Calculs solaires :** Débridage total du simulateur (fin du bridage artificiel à 5,2-6,9 ans) et adoption de la constante PVGIS Wallonie de 930 kWh/kWc/an.
6. **Contrôle Qualité :** Tout nouveau lead arrive en statut `pending_review` et nécessite une approbation explicite de l'administrateur avant d'apparaître sur la marketplace.
7. **Tracking Marketing :** Composant `ad-tracking.tsx` avec Meta Pixel `Lead` et Google Ads conversion opérationnel.
8. **Délivrabilité :** Email de confirmation automatique envoyé au prospect avec récapitulatif de son estimation.

---

## 6. Questions Spécifiques Posées à l'Expert

1. **Y a-t-il des risques juridiques résiduels** avec l'Autorité de Protection des Données (APD) belge sur la monétisation des leads avec le libellé actuel du consentement obligatoire ?
2. **La friction du virement bancaire pour les crédits** est-elle un obstacle critique pour recruter les 20 premiers installateurs partenaires, ou est-ce un filtre de sérieux pertinent en phase d'amorçage ?
3. **L'architecture de sécurité Supabase/RLS/Next.js** présente-t-elle des failles pouvant permettre à un partenaire d'accéder au numéro de téléphone d'un lead sans l'avoir payé ?
4. **Le dimensionnement des unit economics** (CPL blended estimé à ~32 € en B2B et ~14 € en B2C vs vente à ~60 € en B2B et ~57 € en B2C) résistera-t-il à la saturation publicitaire de Meta en Wallonie ?
5. **Quels sont les 3 à 5 chantiers prioritaires absolus** à exécuter avant d'investir les 1 000 premiers euros de budget publicitaire ?
```
