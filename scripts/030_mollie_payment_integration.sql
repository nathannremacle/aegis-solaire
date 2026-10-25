-- Migration 030 : Intégration Mollie (Bancontact / Payconiq) pour achats de crédits instantanés
--
-- Permet aux installateurs belges de recharger leur solde immédiatement par Bancontact/Payconiq
-- sans vérification manuelle d'IBAN par l'administrateur, tout en conservant le virement classique
-- comme option de repli sur devis/facture.

-- 1. Ajout des colonnes de suivi de paiement en ligne sur credit_orders
ALTER TABLE public.credit_orders 
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

-- 2. Index pour recherche rapide par identifiant de paiement Mollie
CREATE INDEX IF NOT EXISTS idx_credit_orders_payment_id ON public.credit_orders (payment_id)
  WHERE payment_id IS NOT NULL;

-- 3. Commentaires explicatifs
COMMENT ON COLUMN public.credit_orders.payment_provider IS 'Méthode d''acquisition : bank_transfer (manuel) ou mollie (instantané Bancontact)';
COMMENT ON COLUMN public.credit_orders.payment_id IS 'Identifiant de transaction Mollie (ex: tr_WDqYK6vllg)';
COMMENT ON COLUMN public.credit_orders.checkout_url IS 'URL de redirection vers la session de paiement sécurisée';
