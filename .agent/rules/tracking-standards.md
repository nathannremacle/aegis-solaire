# RÈGLE STRICTE SUR LE TRACKING, LES CONVERSIONS & LE MONITORING (AEGIS SOLAIRE)

## 1. PRIORITÉ ABSOLUE À L'API CONVERSIONS (CAPI SERVEUR)
- Il est **STRICTEMENT OBLIGATOIRE** de recommander et d'implémenter en priorité absolue l'**API Conversions (CAPI côté serveur)** par rapport au simple pixel navigateur.
- Ne jamais conseiller le Pixel Meta client-side seul ou comme option par défaut quand l'API Conversions est disponible.
- Justification technique impérative :
  - En Belgique francophone (Wallonie), 35 % à 50 % des utilisateurs ont des bloqueurs de publicité, des navigateurs protecteurs (Brave, Safari iOS avec ITP) ou des antivirus stricts (ex: Bitdefender Anti-tracker).
  - Le suivi côté client seul est sous-optimal, perd des leads et dégrade l'apprentissage de l'algorithme publicitaire.
  - L'API Conversions (serveur-à-serveur avec hachage SHA-256) garantit 100 % de réception des conversions Lead et un Event Match Quality (EMQ) supérieur à 8,8/10.

## 2. ARCHITECTURE HYBRIDE OPTIMALE
- Toujours viser la configuration hybride maximale :
  1. API Conversions (Serveur via `lib/meta-capi.ts`) comme colonne vertébrale infaillible.
  2. Pixel Web (Client via `components/analytics/ad-tracking.tsx`, Pixel ID `1672474437601117`) en redondance.
  3. Déduplication systématique via un `event_id` unique partagé entre les deux flux.

## 3. OUTIL DE MONITORING & DE PILOTAGE AUTONOME DES CAMPAGNES
- L'assistant dispose d'un outil de télémétrie autonome en direct : `scripts/monitor-campaigns.mjs`.
- Commande d'audit : `node --env-file=.env.local scripts/monitor-campaigns.mjs`.
- Données auditées en direct :
  - Table Supabase `funnel_step_events` : répartition des visiteurs par étape (1 à 6) et par annonce via `utm_content` (`visuel1_table_devis` vs `visuel2_maison_comparez`).
  - Table Supabase `leads` : audit exhaustif des fiches prospects créées, score de qualification, géolocalisation wallonne et attribution marketing.
  - Identifiants Meta Developer App : App ID `1688020366167372`, Ad Account `act_1596485538374624`.
