-- Migration 014 : Media Partners (programme d'affiliation media buyers)
--
-- Table media_partners : profils des affiliés, tracking codes, commissions.
-- Colonne leads.media_partner_code : attribution du lead au media partner.
-- RLS : media partner voit sa propre ligne ; admin voit tout.
--
-- Prérequis auto-créés ci-dessous si absents (idempotent).

-- ---------------------------------------------------------------------------
-- 0) Prérequis : admin_users + is_admin() (normalement dans 012)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ---------------------------------------------------------------------------
-- 1) Table media_partners
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tracking_code TEXT NOT NULL UNIQUE,
  commission_b2b INTEGER NOT NULL DEFAULT 100 CHECK (commission_b2b >= 0),
  commission_b2c INTEGER NOT NULL DEFAULT 25 CHECK (commission_b2c >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
  auth_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.media_partners IS 'Affiliés media buyers : tracking, commissions, lien auth.users.';
COMMENT ON COLUMN public.media_partners.tracking_code IS 'Code unique passé via ?ref=CODE dans les URLs.';
COMMENT ON COLUMN public.media_partners.commission_b2b IS 'Commission en EUR par lead B2B qualifié.';
COMMENT ON COLUMN public.media_partners.commission_b2c IS 'Commission en EUR par lead B2C qualifié.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_partners_auth_user_id
  ON public.media_partners (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_partners_tracking_code ON public.media_partners (tracking_code);
CREATE INDEX IF NOT EXISTS idx_media_partners_status ON public.media_partners (status);

DROP TRIGGER IF EXISTS update_media_partners_updated_at ON public.media_partners;
CREATE TRIGGER update_media_partners_updated_at
  BEFORE UPDATE ON public.media_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.media_partners ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) Attribution sur leads
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS media_partner_code TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_media_partner_code ON public.leads (media_partner_code)
  WHERE media_partner_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) Helper RLS : current_media_partner_id()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_media_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mp.id
  FROM public.media_partners mp
  WHERE mp.auth_user_id = auth.uid()
     OR lower(mp.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_media_partner_id() IS 'UUID du media partner lié au JWT (auth_user_id ou e-mail).';
GRANT EXECUTE ON FUNCTION public.current_media_partner_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS policies — media_partners (DROP IF EXISTS pour idempotence)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "media_partners_select" ON public.media_partners;
DROP POLICY IF EXISTS "media_partners_insert" ON public.media_partners;
DROP POLICY IF EXISTS "media_partners_update" ON public.media_partners;
DROP POLICY IF EXISTS "media_partners_delete" ON public.media_partners;

CREATE POLICY "media_partners_select"
  ON public.media_partners
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR id = public.current_media_partner_id());

CREATE POLICY "media_partners_insert"
  ON public.media_partners
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "media_partners_update"
  ON public.media_partners
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "media_partners_delete"
  ON public.media_partners
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
