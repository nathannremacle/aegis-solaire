-- =============================================================================
-- MIGRATION : Vérification d'e-mail 1-clic & suivi livraison / bounce Resend
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_verification_method text NULL,
  ADD COLUMN IF NOT EXISTS email_delivery_status text NULL,
  ADD COLUMN IF NOT EXISTS email_bounced_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS resend_last_email_id text NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_verified
  ON public.leads (email_verified);

CREATE INDEX IF NOT EXISTS idx_leads_resend_last_email_id
  ON public.leads (resend_last_email_id)
  WHERE resend_last_email_id IS NOT NULL;
