-- Migration 031 : Ajout du statut de vérification d'email pour les candidatures installateurs
-- Permet de tracer la confirmation de l'e-mail lors de l'onboarding

ALTER TABLE public.installer_applications 
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Index pour optimiser les requêtes de vérification
CREATE INDEX IF NOT EXISTS idx_installer_applications_email_verified 
  ON public.installer_applications (email_verified_at) 
  WHERE email_verified_at IS NOT NULL;

COMMENT ON COLUMN public.installer_applications.email_verified_at IS 'Date et heure de confirmation de l''adresse e-mail par l''installateur.';
COMMENT ON COLUMN public.installer_applications.verification_token IS 'Jeton de vérification d''e-mail envoyé lors de l''inscription.';
