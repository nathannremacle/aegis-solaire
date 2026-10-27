# Correctifs de l'audit du 27 octobre 2026

## Changements

- Authentification obligatoire en développement comme en production. Le mode développement n'attribue plus une identité administrateur ou le premier partenaire de la base.
- Validation des commandes et journal des crédits dans une transaction PostgreSQL, avec verrouillage de la commande. Les validations simultanées ne créditent qu'une fois. Une commande payée ne peut pas être annulée ; une commande annulée ne peut pas être validée.
- Contrôle du statut Mollie, de la commande associée, du montant, de la devise et de l'identifiant de paiement. Les notifications déjà traitées ne renvoient pas d'e-mail.
- Les rôles anonymes et authentifiés ne peuvent plus créer ou modifier directement les commandes via PostgREST. Les insertions passent par les routes serveur authentifiées.
- Confirmation d'une commande par virement uniquement après insertion réussie. Références UUID uniques pour les deux moyens de paiement.
- Chargement des scripts Meta/Google uniquement après consentement, contrôle des conversions navigateur et Meta CAPI, bouton permanent « Gérer mes cookies ». Le retrait révoque le consentement, supprime les cookies publicitaires accessibles et recharge la page pour décharger les SDK.
- Suppression du suffixe de marque en double dans le titre de la page particuliers.

## Application à Supabase et déploiement

La migration `scripts/031_atomic_credit_orders.sql` a été testée sur PostgreSQL 17 local. Son exécution sur Supabase a été confirmée par le propriétaire le 27 octobre 2026 ; la présence des deux RPC a ensuite été vérifiée en lecture seule via le schéma de l'API. Les contraintes de la base distante n'ont pas été retestées par des écritures. Les étapes ci-dessous permettent de reproduire l'installation sur un autre environnement.

1. Dans Supabase, ouvrir **SQL Editor → New query** sur le projet concerné.
2. Vérifier que les migrations précédentes, notamment `030_mollie_payment_integration.sql`, sont présentes. Prévoir une fenêtre de maintenance pour les validations de paiement, afin d'éviter le chevauchement avec l'ancienne logique applicative.
3. Copier et exécuter le contenu complet de `scripts/031_atomic_credit_orders.sql`. Le script est transactionnel et réexécutable. Si la création de l'index unique échoue à cause de doublons existants de `payment_id`, ne pas supprimer arbitrairement les lignes : rapprocher ces commandes des paiements avant de reprendre. Aucun historique n'est automatiquement corrigé.
4. Déployer ensuite cette version du code. Les nouvelles routes nécessitent les RPC de la migration ; elles ne reviennent pas à l'ancien crédit non transactionnel si la migration manque.
5. Valider un achat avec une clé Mollie de test et un compte partenaire de développement avant de rouvrir les paiements. Vérifier les accès avec deux comptes partenaires distincts.

Un paiement effectivement reçu pour une commande déjà annulée est à rapprocher manuellement ; la correction ne réactive pas automatiquement une commande annulée et ne fournit pas de fonctionnalité de remboursement.

## Tests reproductibles

Depuis la racine du dépôt :

```bash
node --test scripts/test-audit-regressions.cjs

# Base temporaire dédiée, sans accès aux données Supabase :
docker run -d --rm --name aegis-audit-postgres \
  -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:55432:5432 postgres:17
# Attendre que pg_isready réussisse :
docker exec aegis-audit-postgres pg_isready -U postgres
node --test scripts/test-credit-orders-atomic.cjs
docker stop aegis-audit-postgres

NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build
npm run lint
```

Les tests PostgreSQL créent puis suppriment leur propre base locale et vérifient aussi la réexécution de la migration. Le réglage TLS utilise les certificats système, sans désactiver la vérification.

Pour tester le consentement, démarrer dans un terminal dédié :

```bash
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 \
NEXT_PUBLIC_META_PIXEL_ID=123456789 \
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-123456789 \
NEXT_PUBLIC_GTM_ID=GTM-TEST \
npm run dev -- --hostname 127.0.0.1 --port 3101
```

Puis, avec Chromium Playwright installé :

```bash
PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright-browsers node scripts/test-cookie-consent.cjs
```

Ce test bloque toutes les requêtes externes : aucune conversion publicitaire réelle n'est envoyée. Il vérifie l'absence de traceurs avant consentement et après refus, leur chargement après acceptation, le retrait, les API privées en développement et le titre SEO. Les identifiants publicitaires de test ne doivent pas être utilisés pour un build de déploiement.
