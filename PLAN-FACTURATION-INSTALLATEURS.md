# Facturation des leads aux installateurs

Contexte : les installateurs reçoivent des leads assignés par l’admin et doivent les payer (modèle 50–150 €/lead selon la doc). Ce document décrit les options pour gérer le paiement de ces leads.

---

## Option 1 : Facturation manuelle (sans paiement dans l’app)

**Idée** : l’app sert uniquement à **suivre qui a reçu quels leads**. La facturation se fait en dehors (Excel, logiciel compta, facture manuelle).

### À mettre en place

1. **Suivi déjà disponible**  
   - Chaque lead a un `installateur_id`.  
   - En base ou via l’admin on peut déjà savoir : combien de leads par installateur, sur quelle période.

2. **Export / rapport “Facturation”**  
   - Une page ou un export (ex. CSV) “Relevé par installateur” :  
     - Installateur, période (mois), nombre de leads assignés, (optionnel) détail des leads (id, date, score).  
   - Tu appliques ton barème (ex. 80 €/lead ou grille selon score) dans Excel / compta et tu édites la facture.

3. **Optionnel : marquer les leads “facturés”**  
   - Ajouter sur `leads` un champ `factured_at` (date) ou `billing_status` (`pending` | `invoiced`).  
   - Lors de l’export ou du rapport, filtrer “non encore facturés” pour ne facturer qu’une fois par lead.  
   - Après édition de ta facture, marquer ces leads comme facturés (bouton admin ou script).

**Avantages** : simple, pas de Stripe, pas de gestion CB.  
**Inconvénients** : relances manuelles, pas de paiement en ligne.

---

## Option 2 : Relevé dans l’app + statut “facturé” (toujours facturation manuelle)

**Idée** : l’app affiche un **relevé par installateur** (leads assignés, total à payer) et enregistre ce qui a été facturé pour éviter les doublons.

### Évolutions possibles

1. **Table `lead_billing` (ou champs sur `leads`)**  
   - Soit une table : `installateur_id`, `period` (ex. `2025-03`), `leads_ids[]`, `total_amount`, `invoiced_at`, `status`.  
   - Soit plus simple : sur `leads` ajouter `invoiced_at` (NULL = pas encore facturé).

2. **Page admin “Facturation” ou “Relevés”**  
   - Liste des installateurs avec, pour une période choisie :  
     - Nombre de leads assignés.  
     - Montant (calculé avec un prix par lead configurable, ou grille selon score).  
   - Bouton “Marquer comme facturé” qui remplit `invoiced_at` (ou crée une ligne dans `lead_billing`) pour les leads concernés.  
   - Export PDF/CSV du relevé pour joindre à ta facture.

3. **Prix par lead**  
   - Configurable en admin (ex. 80 € par défaut) ou dans `.env` (ex. `LEAD_PRICE_DEFAULT=80`).  
   - Optionnel : grille par score (ex. lead “chaud” > 70 pts = 120 €, autre = 80 €).

**Avantages** : tout le suivi dans l’app, pas de double facturation, prêt pour un passage ultérieur à Stripe.  
**Inconvénients** : l’installateur ne paie toujours pas dans l’app ; tu envoies la facture toi-même.

---

## Option 3 : Paiement en ligne (Stripe)

**Idée** : les installateurs paient dans l’app (CB, virement Stripe, etc.).

### Variantes

- **A. Crédits / prépaiement**  
  - Chaque installateur a un “solde” (ex. rechargé 500 €).  
  - À chaque assignation, on débite X € du solde.  
  - Recharge via Stripe Checkout (paiement unique ou abonnement).  
  - Nécessite : table `installateur_balances` ou champs `balance_eur`, `ledger` des mouvements.

- **B. Facturation Stripe (invoice)**  
  - En fin de mois (ou à la demande) : création d’une facture Stripe = somme des leads assignés × prix.  
  - Stripe envoie la facture par email à l’installateur ; il paie par lien (CB, SEPA).  
  - Nécessite : Stripe Customer par installateur, Stripe Invoicing, et lien lead → ligne de facture.

- **C. Paiement à la carte**  
  - À chaque assignation (ou par lot), bouton “Payer ce(s) lead(s)” → Stripe Checkout, montant = nombre de leads × prix.  
  - Plus simple à brancher que B, mais moins “pro” (pas de facture mensuelle automatique).

**Avantages** : encaissement automatique, moins de relances manuelles.  
**Inconvénients** : intégration Stripe (compte, webhooks, conformité PCI), coût Stripe.

---

## Recommandation par phase

1. **Court terme**  
   - Partir sur **Option 1 ou 2** :  
     - Export/relevé “leads par installateur” (déjà possible avec les données actuelles).  
     - Optionnel : champ `invoiced_at` (ou équivalent) sur `leads` + page “Relevés / Facturation” pour marquer “facturé” et éviter les doublons.  
   - Tu factures en dehors de l’app (facture manuelle ou logiciel compta).

2. **Moyen terme**  
   - Si le volume augmente : introduire **Option 2** proprement (relevé dans l’app, prix par lead, statut facturé).  
   - Puis, si tu veux automatiser l’encaissement : ajouter **Stripe** (Option 3 A ou B selon préférence crédits vs facture mensuelle).

---

## Résumé

| Approche              | Où ça se passe      | À coder / à faire |
|-----------------------|--------------------|----------------------------------|
| Facturation manuelle  | Hors app           | Export CSV “par installateur” (déjà possible avec les leads + installateur_id). |
| Relevé + “facturé”    | Dans l’app         | Champ `invoiced_at` (ou table facturation), page Relevés, calcul montant, “Marquer facturé”. |
| Paiement en ligne     | Stripe dans l’app  | Stripe SDK, Customers, Checkout ou Invoicing, webhooks, solde ou facture. |

Si tu dis quelle option tu vises en premier (1, 2 ou 3), on peut détailler les changements concrets (schéma DB, routes API, écrans admin) étape par étape.
