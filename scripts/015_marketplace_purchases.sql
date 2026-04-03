-- Migration 015 : Marketplace — lead_purchases, credit_transactions,
-- purchase_lead(), add_credits().
--
-- Prérequis auto-créés ci-dessous si absents (idempotent).

-- ---------------------------------------------------------------------------
-- 0) Prérequis : tables + fonctions normalement issues de 012 / 013
--    Recréées ici avec IF NOT EXISTS / CREATE OR REPLACE pour que le
--    script fonctionne même si 012 n'a pas été exécuté sur cette base.
-- ---------------------------------------------------------------------------

-- admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- partners
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
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Colonnes ajoutées par 012/013 si la table existait déjà sans elles
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS target_provinces TEXT[];
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS target_surfaces TEXT[];
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS min_facture INTEGER;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'B2B';

-- lead_distributions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_distribution_status') THEN
    CREATE TYPE public.lead_distribution_status AS ENUM ('notified', 'unlocked', 'ignored');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.lead_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  status public.lead_distribution_status NOT NULL DEFAULT 'notified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_distributions_lead_partner_unique UNIQUE (lead_id, partner_id)
);
ALTER TABLE public.lead_distributions ENABLE ROW LEVEL SECURITY;

-- marketplace_status sur leads (012)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT NOT NULL DEFAULT 'available';

-- segment sur leads (013)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'B2B';

-- is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- current_partner_id()
CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id FROM public.partners p
  WHERE p.auth_user_id = auth.uid()
     OR lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO anon;

-- ---------------------------------------------------------------------------
-- 1) Table lead_purchases — achats de leads par les partenaires
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL CHECK (credits_spent > 0),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lead_purchases_lead_partner_unique UNIQUE (lead_id, partner_id)
);

COMMENT ON TABLE public.lead_purchases IS 'Achats de leads. Une ligne = un déblocage par un partenaire.';

CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead_id ON public.lead_purchases (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_partner_id ON public.lead_purchases (partner_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_purchased_at ON public.lead_purchases (purchased_at DESC);

ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) Table credit_transactions — historique crédits (topup / purchase / adjustment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'topup', 'adjustment')),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_transactions IS 'Journal de mouvements de crédits partenaires.';

CREATE INDEX IF NOT EXISTS idx_credit_transactions_partner_id
  ON public.credit_transactions (partner_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) Colonne credit_cost sur leads (NULL → défaut 5 B2B / 2 B2C)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT NULL;
COMMENT ON COLUMN public.leads.credit_cost IS 'Coût en crédits (NULL → défaut : 5 B2B, 2 B2C).';

-- ---------------------------------------------------------------------------
-- 4) RLS — lead_purchases
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lead_purchases_select" ON public.lead_purchases;
DROP POLICY IF EXISTS "lead_purchases_insert" ON public.lead_purchases;
DROP POLICY IF EXISTS "lead_purchases_all"    ON public.lead_purchases;

CREATE POLICY "lead_purchases_select"
  ON public.lead_purchases FOR SELECT TO authenticated
  USING (public.is_admin() OR partner_id = public.current_partner_id());

CREATE POLICY "lead_purchases_insert"
  ON public.lead_purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5) RLS — credit_transactions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "credit_transactions_select" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert" ON public.credit_transactions;

CREATE POLICY "credit_transactions_select"
  ON public.credit_transactions FOR SELECT TO authenticated
  USING (public.is_admin() OR partner_id = public.current_partner_id());

CREATE POLICY "credit_transactions_insert"
  ON public.credit_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6) Fonction atomique purchase_lead(lead_id, partner_id)
--    Vérifie solde + places, débite, insère achat, met à jour distribution,
--    passe en sold_out si nécessaire. Retourne JSONB.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_lead(p_lead_id UUID, p_partner_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead        RECORD;
  v_partner     RECORD;
  v_cost        INTEGER;
  v_current     INTEGER;
  v_max_slots   INTEGER;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lead introuvable');
  END IF;
  IF v_lead.marketplace_status = 'sold_out' THEN
    RETURN jsonb_build_object('error', 'Ce lead est épuisé');
  END IF;

  IF EXISTS (SELECT 1 FROM public.lead_purchases WHERE lead_id = p_lead_id AND partner_id = p_partner_id) THEN
    RETURN jsonb_build_object('error', 'Vous avez déjà débloqué ce lead');
  END IF;

  v_cost      := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2C' THEN 2 ELSE 5 END);
  v_max_slots := CASE WHEN v_lead.segment = 'B2C' THEN 3 ELSE 1 END;

  SELECT COUNT(*) INTO v_current FROM public.lead_purchases WHERE lead_id = p_lead_id;
  IF v_current >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
    RETURN jsonb_build_object('error', 'Plus de places disponibles');
  END IF;

  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Partenaire introuvable');
  END IF;
  IF v_partner.credits < v_cost THEN
    RETURN jsonb_build_object('error', 'Crédits insuffisants', 'required', v_cost, 'available', v_partner.credits);
  END IF;

  UPDATE public.partners SET credits = credits - v_cost WHERE id = p_partner_id;

  INSERT INTO public.lead_purchases (lead_id, partner_id, credits_spent)
  VALUES (p_lead_id, p_partner_id, v_cost);

  INSERT INTO public.credit_transactions (partner_id, amount, type, reference)
  VALUES (p_partner_id, -v_cost, 'purchase', 'lead:' || p_lead_id::text);

  INSERT INTO public.lead_distributions (lead_id, partner_id, status)
  VALUES (p_lead_id, p_partner_id, 'unlocked')
  ON CONFLICT (lead_id, partner_id)
  DO UPDATE SET status = 'unlocked', updated_at = NOW();

  IF (v_current + 1) >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'credits_spent', v_cost,
    'credits_remaining', v_partner.credits - v_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_lead(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Fonction atomique add_credits(partner_id, amount, type, reference)
--    Crédite le partenaire et journalise la transaction. Retourne le nouveau solde.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_credits(
  p_partner_id UUID,
  p_amount     INTEGER,
  p_type       TEXT,
  p_reference  TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_credits INTEGER;
BEGIN
  UPDATE public.partners SET credits = credits + p_amount WHERE id = p_partner_id
  RETURNING credits INTO v_new_credits;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partenaire % introuvable', p_partner_id;
  END IF;

  INSERT INTO public.credit_transactions (partner_id, amount, type, reference)
  VALUES (p_partner_id, p_amount, p_type, p_reference);

  RETURN v_new_credits;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;
