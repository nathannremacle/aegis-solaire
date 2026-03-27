-- Migration 012 : Tour de contrôle — admin_users, partners (ciblage), lead_distributions (routing)
--
-- Prérequis : public.leads existe (001+), fonction update_updated_at_column() (001).
-- Si public.partners existait déjà : colonnes target_* / min_facture / auth_user_id ajoutées.
-- Table lead_purchases (ancienne variante) : si présente, politique RLS restreinte ; sinon ignorée.
--
-- RLS : les politiques s’appliquent aux clients Supabase avec JWT (anon / authenticated).
-- Le service role (clé secrète serveur) contourne RLS — routes API Next.js inchangées.
--
-- À faire après exécution : insérer au moins une ligne dans admin_users pour votre e-mail admin,
-- et lier les partenaires (auth_user_id et/ou même e-mail que le compte Supabase Auth).

-- ---------------------------------------------------------------------------
-- 0) Type enum — statut de distribution (matchmaking + déblocage)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_distribution_status') THEN
    CREATE TYPE public.lead_distribution_status AS ENUM ('notified', 'unlocked', 'ignored');
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 1) Table admin_users — e-mails autorisés comme administrateurs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_users IS 'Comptes autorisés à la route /admin (vérifié par RLS + auth JWT).';

CREATE INDEX IF NOT EXISTS idx_admin_users_email_lower ON public.admin_users (lower(email));

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) Table partners — installateurs (ciblage + crédits)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  target_provinces TEXT[] DEFAULT NULL,
  target_surfaces TEXT[] DEFAULT NULL,
  min_facture INTEGER DEFAULT NULL CHECK (min_facture IS NULL OR min_facture >= 0),
  auth_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partners_email_unique UNIQUE (email)
);

COMMENT ON TABLE public.partners IS 'Installateurs partenaires : crédits, critères de routage, lien optionnel auth.users.';
COMMENT ON COLUMN public.partners.target_provinces IS 'Provinces servies (clés type liege, namur). NULL = toutes.';
COMMENT ON COLUMN public.partners.target_surfaces IS 'Types de surface (toiture, parking, terrain, friche). NULL = tous.';
COMMENT ON COLUMN public.partners.min_facture IS 'Facture annuelle min. (€ HT) pour accepter le lead. NULL = pas de plancher.';
COMMENT ON COLUMN public.partners.auth_user_id IS 'Lien vers Supabase Auth pour RLS partenaire.';

-- Nouvelles colonnes si la table existait déjà (ancien brouillon 012)
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS target_provinces TEXT[];
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS target_surfaces TEXT[];
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS min_facture INTEGER;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_auth_user_id ON public.partners (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partners_created_at ON public.partners (created_at DESC);

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) Table lead_distributions — lien lead ↔ partenaire (max 5 par lead côté applicatif)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  status public.lead_distribution_status NOT NULL DEFAULT 'notified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_distributions_lead_partner_unique UNIQUE (lead_id, partner_id)
);

COMMENT ON TABLE public.lead_distributions IS 'Matchmaking : quels partenaires ont reçu le lead, et état (notified / unlocked / ignored).';

CREATE INDEX IF NOT EXISTS idx_lead_distributions_lead_id ON public.lead_distributions (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_distributions_partner_id ON public.lead_distributions (partner_id);
CREATE INDEX IF NOT EXISTS idx_lead_distributions_status ON public.lead_distributions (status);

DROP TRIGGER IF EXISTS update_lead_distributions_updated_at ON public.lead_distributions;
CREATE TRIGGER update_lead_distributions_updated_at
  BEFORE UPDATE ON public.lead_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.lead_distributions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4) Leads — marketplace (si pas déjà présent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT NOT NULL DEFAULT 'available';

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_marketplace_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_marketplace_status_check CHECK (
    marketplace_status IN ('available', 'sold_out')
  );

COMMENT ON COLUMN public.leads.marketplace_status IS 'Vivier partenaires : available | sold_out.';

CREATE INDEX IF NOT EXISTS idx_leads_marketplace_status ON public.leads (marketplace_status);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5) Fonctions helper (SECURITY DEFINER — lecture sécurisée pour RLS)
-- ---------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.is_admin() IS 'Vrai si l’e-mail JWT est listé dans admin_users.';

CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.partners p
  WHERE p.auth_user_id = auth.uid()
     OR lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_partner_id() IS 'UUID du partenaire lié au JWT (auth_user_id ou e-mail).';

CREATE OR REPLACE FUNCTION public.admin_users_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.admin_users;
$$;

COMMENT ON FUNCTION public.admin_users_count() IS 'Compte les admins (bypass RLS — pour politique bootstrap uniquement).';

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO anon;
GRANT EXECUTE ON FUNCTION public.admin_users_count() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) RLS — supprimer les anciennes politiques trop permissives sur leads / partners
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Service role can manage partners" ON public.partners;

DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_bootstrap_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_all" ON public.admin_users;
DROP POLICY IF EXISTS "partners_select" ON public.partners;
DROP POLICY IF EXISTS "partners_update" ON public.partners;
DROP POLICY IF EXISTS "partners_insert" ON public.partners;
DROP POLICY IF EXISTS "partners_delete" ON public.partners;
DROP POLICY IF EXISTS "lead_distributions_select" ON public.lead_distributions;
DROP POLICY IF EXISTS "lead_distributions_update" ON public.lead_distributions;
DROP POLICY IF EXISTS "lead_distributions_insert" ON public.lead_distributions;
DROP POLICY IF EXISTS "lead_distributions_delete" ON public.lead_distributions;
DROP POLICY IF EXISTS "leads_select" ON public.leads;

DO $$
BEGIN
  IF to_regclass('public.lead_purchases') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Service role can manage lead_purchases" ON public.lead_purchases';
  END IF;
END$$;

-- admin_users : CRUD réservé aux admins (premier INSERT via SQL Editor / rôle superuser)
CREATE POLICY "admin_users_select"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_users_insert"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Premier admin : table vide + e-mail JWT = sa propre ligne (compte réel via fonction SECURITY DEFINER)
CREATE POLICY "admin_users_bootstrap_insert"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.admin_users_count() = 0
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "admin_users_delete"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- partners : admin tout ; partenaire voit / met à jour sa ligne
CREATE POLICY "partners_select"
  ON public.partners
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR id = public.current_partner_id());

CREATE POLICY "partners_insert"
  ON public.partners
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "partners_update"
  ON public.partners
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR id = public.current_partner_id())
  WITH CHECK (public.is_admin() OR id = public.current_partner_id());

CREATE POLICY "partners_delete"
  ON public.partners
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- lead_distributions : admin tout ; partenaire voit ses lignes
CREATE POLICY "lead_distributions_select"
  ON public.lead_distributions
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR partner_id = public.current_partner_id());

CREATE POLICY "lead_distributions_insert"
  ON public.lead_distributions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "lead_distributions_update"
  ON public.lead_distributions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR partner_id = public.current_partner_id())
  WITH CHECK (public.is_admin() OR partner_id = public.current_partner_id());

CREATE POLICY "lead_distributions_delete"
  ON public.lead_distributions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- leads : admin tout ; partenaire uniquement si une distribution le concerne
CREATE POLICY "leads_select"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.lead_distributions ld
      WHERE ld.lead_id = leads.id
        AND ld.partner_id = public.current_partner_id()
    )
  );

-- Politique lead_purchases si la table existe (ancienne migration)
DO $$
BEGIN
  IF to_regclass('public.lead_purchases') IS NOT NULL THEN
    ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "lead_purchases_select" ON public.lead_purchases';
    EXECUTE 'DROP POLICY IF EXISTS "lead_purchases_all" ON public.lead_purchases';
    EXECUTE $p$
      CREATE POLICY "lead_purchases_select"
        ON public.lead_purchases
        FOR SELECT
        TO authenticated
        USING (
          public.is_admin()
          OR partner_id = public.current_partner_id()
        );
    $p$;
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 7) Notes post-déploiement
-- ---------------------------------------------------------------------------
-- Option A — SQL Editor (recommandé prod) : INSERT INTO public.admin_users (email) VALUES ('vous@domaine.be');
-- Option B — Bootstrap : premier utilisateur connecté peut s’insérer une fois si la table est vide (policy admin_users_bootstrap_insert).
-- Les INSERT sur leads / lead_distributions depuis l’API Next.js avec la clé service role contournent RLS.
