# RÈGLE STRICTE SUR LE TRACKING & LES CONVERSIONS (AEGIS SOLAIRE)

## 1. PRIORITÉ ABSOLUE À L'API CONVERSIONS (CAPI SERVEUR)
- Il est **STRICTEMENT OBLIGATOIRE** de recommander et d'implémenter en priorité absolue l'**API Conversions (CAPI côté serveur)** par rapport au simple pixel navigateur.
- Ne jamais conseiller le Pixel Meta client-side seul ou comme option par défaut quand l'API Conversions est disponible.
- Justification technique impérative :
  - En Belgique francophone (Wallonie), 35 % à 50 % des utilisateurs ont des bloqueurs de publicité, des navigateurs protecteurs (Brave, Safari iOS avec ITP) ou des antivirus stricts (ex: Bitdefender Anti-tracker).
  - Le suivi côté client seul est sous-optimal, perd des leads et dégrade l'apprentissage de l'algorithme publicitaire.
  - L'API Conversions (serveur-à-serveur avec hachage SHA-256) garantit 100 % de réception des conversions Lead et un Event Match Quality (EMQ) supérieur à 8,8/10.

## 2. ARCHITECTURE HYBRIDE OPTIMALE
- Toujours viser la configuration hybride maximale :
  1. API Conversions (Serveur) comme colonne vertébrale infaillible.
  2. Pixel Web (Client) en redondance.
  3. Déduplication systématique via un `event_id` unique partagé entre les deux flux.
