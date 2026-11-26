-- ==============================================================================
-- MIGRATION : 202611260001_partner_dispute_suspension.sql
-- Titre     : Suspension unilatérale de la faculté de litige partenaire (Art. 5.6 CGV)
--             - Ajout de disputes_suspended, disputes_suspended_at,
--               disputes_suspended_reason, disputes_suspended_by sur public.partners
-- ==============================================================================

BEGIN;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS disputes_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disputes_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputes_suspended_reason text,
  ADD COLUMN IF NOT EXISTS disputes_suspended_by text;

CREATE INDEX IF NOT EXISTS idx_partners_disputes_suspended
  ON public.partners (disputes_suspended)
  WHERE disputes_suspended = true;

COMMIT;
