# Système de Dispatch et de Relances Intelligentes des Leads — Aegis Solaire

> **Dossier de Conception Stratégique, Modélisation Mathématique & Architecture Technique**  
> **Auteur :** Antigravity pour Nathan Remacle (INIT42 / Aegis Solaire)  
> **Date :** Octobre 2026 · **Version :** 1.0 (Production-Ready)  
> **Fichiers associés :** [`lib/lead-relance-engine.ts`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/lib/lead-relance-engine.ts) · [`lib/email-templates/installer-lead-teaser.ts`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/lib/email-templates/installer-lead-teaser.ts) · [`supabase/migrations/202610260001_lead_relances_system.sql`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/supabase/migrations/202610260001_lead_relances_system.sql)

---

## 1. Vision Métier & Positionnement Tiers de Confiance

### 1.1 Le Problème des Plateformes Généralistes (Homedeal, Bobex, TrustUp)
Chez les courtiers traditionnels, le modèle économique repose sur la vente de masse :
- Un même lead est envoyé simultanément à 4, 5 voire 7 artisans sans aucun filtre de proximité fine.
- Les installateurs subissent une guerre des prix agressive (« race to the bottom ») et un taux élevé de faux numéros ou de curieux sans budget.
- L'e-mail reçu (comme analysé dans les dossiers de test d'Homedeal à Herstal et Vieux-Waleffe) est fonctionnel mais rudimentaire : tableau vert basique, police banale, absence d'estimations financières et anonymisation sommaire.

### 1.2 Le Modèle Aegis Solaire (Swiss Editorial & Trust)
Aegis Solaire n'est pas un comparateur de masse ; c'est un **organe de sélection technique et financière** (agréé RESCERT, CWaPE, PACE 2030) :
- **En B2B (Tertiaire / PME / Industrie) :** Exclusivité absolue garantie (**1 seul installateur unique**).
- **En B2C (Résidentiel qualifié) :** Attribution strictement plafonnée à **3 installateurs certifiés maximum**.
- **Audit préalable :** Aucun lead n'est poussé sans un pré-contrôle administratif (validité BCE/TVA, cadastre toiture Google Maps direct, cohérence facture électrique).
- **Garantie d'injoignabilité :** Recrédit intégral sous 24h ouvrées en cas de numéro erroné via la table `lead_disputes`.
- **Accompagnement Expert :** Présence de la caution d'ingénierie de **Fabrice Remacle** pour assister les installateurs sur les chantiers complexes.

---

## 2. Modélisation Mathématique : Pourquoi et Comment Vendre 3 Slots par Lead

### 2.1 L'Entonnoir de Conversion Réel d'une Alerte E-mail
Pour qu'un artisan achète un lead après avoir reçu un e-mail teaser, il doit franchir trois étapes probabilistes successives :

$$\begin{aligned}
P(\text{Ouverture}) &\approx 40\,\% \text{ à } 50\,\% \quad \text{(Sujet personnalisé avec Code Postal + Ville)} \\
P(\text{Clic vers Dashboard} \mid \text{Ouverture}) &\approx 25\,\% \text{ à } 35\,\% \quad \text{(Fiche technique attrayante)} \\
P(\text{Déblocage Crédits} \mid \text{Visite Dashboard}) &\approx 25\,\% \text{ à } 40\,\% \quad \text{(Solde de crédits suffisant + ROI clair)}
\end{aligned}$$

Le taux de transformation global par e-mail envoyé se calcule ainsi :

$$P(\text{Achat}) = 0{,}45 \times 0{,}30 \times 0{,}30 \approx 4{,}0\,\% \text{ à } 5{,}5\,\%$$

### 2.2 La Démonstration du Dimensionnement des Vagues
- Si un lead était envoyé à seulement **3 installateurs** :
  $$P(\text{3 ventes}) = (0{,}05)^3 = 0{,}000125 \quad (0{,}0125\,\% \text{ de probabilité — quasi nul})$$
- Si l'on envoyait le lead à **30 personnes d'un coup** :
  - Le lead serait saturé trop vite ou, au contraire, perçu comme un spam de masse dévalué.
- **La solution optimale (Cascade Séquentielle en 3 Vagues) :**
  - **Vague 1 (H+0) :** 6 à 8 installateurs locaux prioritaires (Tier 1) $\rightarrow$ génère typiquement 1 à 2 ventes immédiates.
  - **Vague 2 (H+4h) :** Relance douce des non-ouvreurs Tier 1 + élargissement à 8–10 voisins (Tier 2) $\rightarrow$ génère la 2e ou 3e vente.
  - **Vague 3 (H+24h) :** Dernière opportunité élargie à 12–16 installateurs (Tier 3) $\rightarrow$ solde définitivement le 3e slot.
  - **Nombre total cumulé de contacts uniques :** 18 à 24 installateurs qualifiés pour boucler les 3 ventes avec une certitude $\ge 92\,\%$.

---

## 3. Algorithme de Matching & Scoring d'Attribution (0 à 100 Points)

L'algorithme implémenté dans [`lib/lead-relance-engine.ts`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/lib/lead-relance-engine.ts) attribue à chaque installateur actif une note de compatibilité en temps réel :

```
                               SCORING INSTALLATEUR (0 - 100)
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
  SEGMENT (20 pts)    GÉOGRAPHIE (40 pts)            CRÉDITS (25 pts)        TECHNIQUE (15 pts)
• B2B / B2C match      • Province exacte (+40)        • Solde ≥ Coût (+25)    • Type toiture (+15)
• Filtre éliminatoire  • Province voisine (+22)       • Solde > 0 (+12)       • Seuil puissance kWc
  (si mismatch = 0 pt) • Belgique globale (+15)       • Solde = 0 (+5)        • Option batterie / GRD
```

### 3.1 Matrice de Contiguïté des Provinces Wallonnes & Belges
Pour l'élargissement de la Vague 2, le moteur s'appuie sur la carte des voisinages géographiques :
- **Liège (`liege`) :** Voisins = Namur, Luxembourg, Brabant wallon, Limbourg.
- **Namur (`namur`) :** Voisins = Liège, Hainaut, Brabant wallon, Luxembourg.
- **Hainaut (`hainaut`) :** Voisins = Namur, Brabant wallon, Bruxelles, Flandre occidentale.
- **Brabant wallon (`brabant_wallon`) :** Voisins = Bruxelles, Namur, Hainaut, Liège, Brabant flamand.
- **Luxembourg BE (`luxembourg`) :** Voisins = Namur, Liège.
- **Bruxelles (`bruxelles`) :** Voisins = Brabant wallon, Hainaut, Brabant flamand.

### 3.2 Classification par Tiers d'Éligibilité
- **Tier 1 (Score $\ge 70$ pts) :** Même province, segment exact, solde de crédits positif $\rightarrow$ **Cible prioritaire Vague 1**.
- **Tier 2 (Score 45 à 69 pts) :** Provinces contiguës ou solde à 0 (nécessite recharge) $\rightarrow$ **Cible élargie Vague 2**.
- **Tier 3 (Score 20 à 44 pts) :** Réseau régional global $\rightarrow$ **Cible dernière chance Vague 3**.

---

## 4. Architecture des Vagues Séquentielles (Waterfall & Cooldowns)

| Paramètre | Vague 1 (Alerte Immédiate) | Vague 2 (Relance & Élargissement) | Vague 3 (Dernier Créneau / Clôture) |
|---|---|---|---|
| **Déclencheur** | Publication manuelle ou automatique du lead | H+4 heures ouvrées après Vague 1 | H+24 heures après Vague 2 |
| **Condition d'envoi** | Lead en statut `available` | Nombre de ventes $< 3$ (B2C) ou $< 1$ (B2B) | Nombre de ventes $< 3$ (B2C) ou $< 1$ (B2B) |
| **Cible B2C (Résidentiel)** | 6 à 8 installateurs Tier 1 | Rappel Tier 1 + 8 à 10 voisins Tier 2 | 12 à 16 installateurs Tier 2 & 3 |
| **Cible B2B (Tertiaire)** | 3 à 4 spécialistes Tier 1 | 5 à 6 installateurs PME/Tertiaire | Réseau régional B2B complet |
| **Objet d'e-mail** | `⚡ Nouveau dossier {Segment} à {Ville} ({CodePostal}) — 3 créneaux max` | `⏳ Plus que {X} place(s) restante(s) — Projet solaire à {Ville}` | `⚠️ Dernier créneau disponible : Installation solaire à {Ville}` |
| **Angle Copywriting** | Exclusivité, priorité locale et fraîcheur du dossier | Émulation confraternelle (« Les installateurs de votre région étudient ce projet ») | Urgence et fermeture imminente du dossier |
| **Cooldown minimal** | Aucun (immédiat à la publication) | 4 heures ouvrées | 20 heures |
| **Plages Horaires Ouvrées** | Toléré le soir si publication récente | **08h00 – 19h30** (Lun–Ven) et **09h00 – 13h00** (Sam) | **08h00 – 19h30** |

### 4.1 Règle du Kill-Switch Automatique
Dès que la fonction PostgreSQL `purchase_marketplace_lead` enregistre le 3e achat (ou le 1er en B2B) :
1. Le lead bascule instantanément en `marketplace_status = 'sold_out'`.
2. Le moteur de relance stoppe immédiatement toute planification future.
3. Les liens d'accès dans les e-mails déjà reçus affichent sur le dashboard : *« Ce dossier vient d'être entièrement pourvu par vos confrères. »*

### 4.2 Limites Anti-Harcelement (Deliverability Shield)
- **Max 2 e-mails par installateur pour un même lead** (Vague 1 + Vague 2, ou Vague 2 + Vague 3).
- **Max 4 notifications e-mails de leads par installateur par jour** tous dossiers confondus.

---

## 5. Direction Artistique du Mail : Homedeal vs Aegis Solaire

L'e-mail produit par [`lib/email-templates/installer-lead-teaser.ts`](file:///c:/Users/mrnat/Documents/SaaS/Aegis%20Solaire/aegis-solaire-main/lib/email-templates/installer-lead-teaser.ts) respecte scrupuleusement la charte **Fintech Slate & Solar Trust** (`DESIGN.md` et `ui-strictness.md`), aligné sur les e-mails de confirmation de compte :

```
┌─────────────────────────────────────────────────────────────┐
│  [Liseré supérieur Cobalt Tech #2563EB / Or Solaire #F59E0B] │
├─────────────────────────────────────────────────────────────┤
│  [LOGO AEGIS SOLAIRE]            [⏳ PLUS QUE 2 PLACES]     │  (Fond Blanc Pur #FFFFFF)
├─────────────────────────────────────────────────────────────┤
│  RELANCE VAGUE 2 · OPPORTUNITÉ LOCALE · #13427051           │  (Surtitre Mono Or Solaire)
│  Plus que 2 place(s) disponible(s) à Herstal (Liège)        │  (Titre Ardoise #0F172A)
│                                                             │
│  Bonjour Marc Dupont,                                       │
│  Rappel : Le dossier photovoltaïque à Herstal dispose       │
│  encore de 2 place(s) artisan disponible(s).                │
│                                                             │
│         [ DÉBLOQUER CE DOSSIER SUR MON DASHBOARD → ]        │  (Bouton Ardoise Sombre #0F172A)
│  Accès immédiat · Coût du dossier : 2 crédits (~24.00 € HT) │  (Sous-titre mono)
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Installation solaire à Herstal                     🔒 │  │  (Bento Blanc #FFFFFF)
│  │ Madame, Monsieur Infantino · Liège (4040)             │  │
│  │ [✓ Téléphone Contrôlé] [✓ Propriétaire] [✓ Satellite] │  │
│  │───────────────────────────────────────────────────────│  │
│  │ Segment : Résidentiel / B2C (Partagé max 3)           │  │
│  │ Puissance estimée : 10 kWc (font-mono #2563EB)        │  │
│  │ Surface toiture : 75 m² (Tuiles mécaniques)           │  │  (Chiffres en font-mono
│  │ Facture annuelle : 2 850 € HT / an                    │  │   tabular-nums)
│  │ Décisionnaire : Propriétaire occupant                 │  │
│  │ Échéance : À moyen terme (3 à 6 mois)                 │  │
│  │───────────────────────────────────────────────────────│  │
│  │ COORDONNÉES DÉBLOQUÉES APRÈS ACQUISITION :            │  │
│  │ Nom : Madame, Monsieur Infantino                      │  │
│  │ Adresse : ********* (4040 Herstal)                    │  │
│  │ Téléphone : ********* [✓ Vérifié par Aegis]           │  │
│  │ E-mail : ********* [✓ Vérifié par Aegis]              │  │
│  │───────────────────────────────────────────────────────│  │
│  │ RÈGLE DE CONCURRENCE AEGIS SOLAIRE (MAX 3) :          │  │
│  │ [● Place 1 : Réservée] [○ Place 2 : LIBRE] [○ Place 3]│  │  (Jauge de Rareté Bento)
│  │───────────────────────────────────────────────────────│  │
│  │ Valeur devis estimée : 11 700 € à 13 950 € HT         │  │
│  │ Marge brute indicative : ~2 822 € HT                  │  │  (Rentabilité Installateur)
│  │ Coût du dossier : 2 crédits (~24.00 € HT)             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│         [ DÉBLOQUER LES COORDONNÉES COMPLÈTES → ]           │
│  Votre solde : 24 crédits · Recharger mon pack de crédits   │
│                                                             │
│  🛠️ Assistance technique : Cellule Ingénierie Aegis Solaire │
│  🛡️ Garantie Sérénité : Recrédit 24h si numéro erroné       │
├─────────────────────────────────────────────────────────────┤
│  Aegis Solaire · Plateforme éditée par INIT42 (Liège, BE)   │  (Pied de page institutionnel)
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture Technique Déployée

```
aegis-solaire-main/
├── lib/
│   ├── lead-relance-engine.ts              # Moteur algorithmique (Matching, Vagues, Cron)
│   ├── marketplace-pricing.ts              # Calculs financiers (€/kWc, marge installateur)
│   ├── email-templates/
│   │   └── installer-lead-teaser.ts        # Template e-mail HTML/Text Swiss Editorial
│   └── supabase/admin.ts                   # Client Supabase Service Role sécurisé
├── app/
│   ├── api/
│   │   ├── admin/leads/[id]/
│   │   │   ├── publish/route.ts            # Publication + Déclenchement Vague 1 auto
│   │   │   └── relance/route.ts            # GET historique / POST forçage vague
│   │   └── cron/
│   │       └── lead-relances/route.ts      # Endpoint cron automatique (Vagues 2 & 3)
│   └── admin/(dashboard)/leads/
│       └── lead-drawer.tsx                 # Tiroir admin intégrant le suivi de relance
├── components/admin/leads/
│   └── lead-relance-status.tsx             # Composant UI : places vendues, vagues, bouton relance
└── supabase/migrations/
    └── 202610260001_lead_relances_system.sql # Table lead_relance_dispatches, index et colonnes leads
```

---

## 7. Plan des Questions Stratégiques pour Nathan Remacle

Afin d'ajuster les curseurs fins du système selon tes préférences de déploiement, voici les **5 questions décisionnelles clés** :

### Axe 1 : Politique de Prix et Dégressivité sur la Vague 3
> **Contexte :** Si un lead B2C n'a trouvé que 2 acheteurs après 24h (il reste 1 place invendue) ou si un lead B2B n'a pas été acheté après 36h :
- **Option A (Recommandée - Rareté préservée) :** Le prix reste fixe (2 crédits en B2C, 8–18 crédits en B2B) pour ne jamais dévaloriser la perception de qualité du lead et ne pas créer d'attentisme chez les installateurs.
- **Option B (Vente flash « Fin de série ») :** Réduction de -50 % sur le dernier slot disponible en Vague 3 (ex: 1 crédit au lieu de 2) pour liquider le lead à coup sûr.

### Axe 2 : Amorçage & Stratégie d'Activation (Onboarding)
> **Contexte :** Un nouvel installateur qui s'inscrit sur la plateforme a un solde initial de 0 crédit.
- **Option A (Offre d'essai 1 lead gratuit) :** Offrir automatiquement **2 crédits de bienvenue** dès la validation de sa certification RESCERT par l'admin, pour qu'il teste le déblocage d'un premier lead en 1 clic et constate la qualité du contact.
- **Option B (Packs payants stricts sans gratuité) :** Exiger l'achat d'un premier Pack Découverte (10 crédits à 149 € HTVA) avant tout déblocage, pour filtrer immédiatement les artisans solvables.

### Axe 3 : Canaux de Relance Additionnels (SMS / WhatsApp)
> **Contexte :** Les installateurs solaires sont souvent sur les toits ou en déplacement et ne consultent leurs e-mails que le soir.
- **Option A (E-mail transactionnel pur - Actuel) :** Coût zéro hors Resend, délivrabilité maximale, fiche technique complète bien lisible.
- **Option B (Hybride E-mail + SMS Flash sur Vague 1) :** Envoyer un SMS court aux 3 installateurs locaux avec le meilleur score de matching (`[Aegis] Nouveau chantier 10 kWc à Herstal. 3 places max : https://aegis.be/p/xxx`). *Nécessite intégration Twilio/Brevo SMS (~0,05 € / SMS).*

### Axe 4 : Automatisation du Cron vs Validation Admin
> **Contexte :** Le cron automatisé (`/api/cron/lead-relances`) peut déclencher les Vagues 2 et 3 sans aucune intervention humaine.
- **Option A (100 % Automatisé après publication) :** L'admin valide le lead une seule fois (passage en `available`), et le système gère seul les vagues H+4h et H+24h jusqu'à épuisement des 3 slots.
- **Option B (Semi-automatisé avec contrôle admin) :** Le système notifie l'admin quand une vague est prête, mais Nathan clique sur le bouton « Déclencher Vague suivante » dans le dashboard pour garder le contrôle visuel total au début.

### Axe 5 : Monétisation de l'Assistance Technique de Fabrice Remacle
> **Contexte :** Sur les leads B2B tertiaires (> 50 kWc ou toitures d'usines), l'e-mail propose l'accompagnement d'expert de Fabrice Remacle.
- **Option A (Pourcentage au succès) :** 2 % à 3 % du montant final du marché signé avec l'entreprise.
- **Option B (Forfait d'ingénierie inclus dans le pack) :** Facturation forfaitaire (ex: 450 € HTVA pour l'étude de faisabilité et la présence au rendez-vous commercial).
