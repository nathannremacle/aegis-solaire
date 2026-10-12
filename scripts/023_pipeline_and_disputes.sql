-- Migration 023 : Pipeline commercial installateur, réclamations (Garantie 48h) et expiration des leads
--
-- 1. Ajoute les colonnes de suivi commercial (CRM Pipeline) dans lead_purchases
-- 2. Crée la table lead_disputes pour le traitement transparent des réclamations 48h
-- 3. Ajoute expires_at et priority_until sur la table leads

-- 1. Enrichissement de lead_purchases
ALTER TABLE public.lead_purchases
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'to_contact',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Contrainte sur le statut de pipeline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_purchases_pipeline_status_check'
  ) THEN
    ALTER TABLE public.lead_purchases
      ADD CONSTRAINT lead_purchases_pipeline_status_check
      CHECK (pipeline_status IN ('to_contact', 'contacted', 'meeting_scheduled', 'quote_sent', 'won', 'lost'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_purchases_pipeline
  ON public.lead_purchases (partner_id, pipeline_status);

-- 2. Table des réclamations (Garantie 48h Aegis Solaire)
CREATE TABLE IF NOT EXISTS public.lead_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.lead_purchases(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('unreachable', 'wrong_number', 'out_of_scope', 'already_equipped', 'other')),
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  credits_refunded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_disputes_partner_id
  ON public.lead_disputes (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_disputes_status
  ON public.lead_disputes (status);

ALTER TABLE public.lead_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_disputes_select" ON public.lead_disputes;
CREATE POLICY "lead_disputes_select" ON public.lead_disputes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "lead_disputes_insert" ON public.lead_disputes;
CREATE POLICY "lead_disputes_insert" ON public.lead_disputes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "lead_disputes_update" ON public.lead_disputes;
CREATE POLICY "lead_disputes_update" ON public.lead_disputes
  FOR UPDATE TO authenticated USING (true);

-- 3. Expiration et priorité des leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_expires_at
  ON public.leads (expires_at)
  WHERE marketplace_status = 'available';
