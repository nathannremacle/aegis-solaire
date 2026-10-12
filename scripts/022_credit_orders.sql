-- Migration 022 : Table credit_orders (Demandes d'achats de crédits sur facture / virement)
--
-- Permet de suivre toutes les commandes de packs de crédits passées par les installateurs,
-- avec vérification manuelle du virement par l'administrateur et attribution en 1 clic.

CREATE TABLE IF NOT EXISTS public.credit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_htva NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2) NOT NULL,
  price_ttc NUMERIC(10,2) NOT NULL,
  transfer_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_credit_orders_partner_id ON public.credit_orders (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_orders_status ON public.credit_orders (status);

ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_orders_select" ON public.credit_orders;
CREATE POLICY "credit_orders_select" ON public.credit_orders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "credit_orders_insert" ON public.credit_orders;
CREATE POLICY "credit_orders_insert" ON public.credit_orders
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "credit_orders_update" ON public.credit_orders;
CREATE POLICY "credit_orders_update" ON public.credit_orders
  FOR UPDATE TO authenticated USING (true);
