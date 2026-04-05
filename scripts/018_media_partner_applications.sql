-- Migration 018 : Candidatures partenaires média (formulaire /media-partners)
-- Stockage des demandes en attente de validation admin.
-- Insertion publique via API service role uniquement ; lecture / mise à jour admin.

CREATE TABLE IF NOT EXISTS public.media_partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  website_url TEXT,
  experience_description TEXT NOT NULL,
  expected_leads_per_month INTEGER NOT NULL CHECK (expected_leads_per_month >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.media_partner_applications IS 'Candidatures affiliés média — validation avant création media_partners.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_partner_applications_email_unique
  ON public.media_partner_applications (lower(email));

CREATE INDEX IF NOT EXISTS idx_media_partner_applications_status
  ON public.media_partner_applications (status);

CREATE INDEX IF NOT EXISTS idx_media_partner_applications_created_at
  ON public.media_partner_applications (created_at DESC);

ALTER TABLE public.media_partner_applications ENABLE ROW LEVEL SECURITY;

-- Pas de politique INSERT pour authenticated / anon : seul le service role (API) insère.
-- Admin (JWT) : lecture et mise à jour pour outils clients éventuels ; le panel utilise surtout le service role.

DROP POLICY IF EXISTS "media_partner_applications_select_admin" ON public.media_partner_applications;
CREATE POLICY "media_partner_applications_select_admin"
  ON public.media_partner_applications
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "media_partner_applications_update_admin" ON public.media_partner_applications;
CREATE POLICY "media_partner_applications_update_admin"
  ON public.media_partner_applications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
