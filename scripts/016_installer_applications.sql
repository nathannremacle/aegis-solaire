-- Migration 016 : Table candidatures installateurs (formulaire /partenaires)
-- Stocke les demandes en attente de validation admin.

CREATE TABLE IF NOT EXISTS public.installer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  siret TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  rescert_ref TEXT NOT NULL,
  regions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.installer_applications IS 'Candidatures installateurs en attente de vérification RESCERT.';

CREATE INDEX IF NOT EXISTS idx_installer_applications_status ON public.installer_applications (status);
CREATE INDEX IF NOT EXISTS idx_installer_applications_email ON public.installer_applications (email);
CREATE INDEX IF NOT EXISTS idx_installer_applications_created_at ON public.installer_applications (created_at DESC);

ALTER TABLE public.installer_applications ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_installer_applications_updated_at ON public.installer_applications;
CREATE TRIGGER update_installer_applications_updated_at
  BEFORE UPDATE ON public.installer_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
