-- =============================================================================
-- MIGRATION : Certification téléphonique Twilio Lookup v2 & OTP SMS/Appel
-- Colonnes additives sur public.leads pour tracer la certification du numéro
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS phone_verification_method text NULL,
  ADD COLUMN IF NOT EXISTS phone_carrier text NULL,
  ADD COLUMN IF NOT EXISTS phone_line_type text NULL;

CREATE INDEX IF NOT EXISTS idx_leads_phone_verified
  ON public.leads (phone_verified);

COMMENT ON COLUMN public.leads.phone_verified IS
  'Vrai uniquement lorsque le prospect a validé son code OTP SMS/appel via Twilio Verify.';
COMMENT ON COLUMN public.leads.phone_verification_method IS
  'Canal de certification : twilio_sms, twilio_call, twilio_lookup ou dev_mock.';
