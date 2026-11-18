-- =============================================================================
-- MIGRATION : Autoriser le type 'refund' dans public.credit_transactions
-- Corrige la contrainte CHECK legacy qui bloquait refund_lead_dispute()
-- =============================================================================

BEGIN;

ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN ('purchase', 'topup', 'adjustment', 'refund'));

COMMIT;
