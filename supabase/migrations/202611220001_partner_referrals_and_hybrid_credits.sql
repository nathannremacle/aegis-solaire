-- ==============================================================================
-- MIGRATION : 202611220001_partner_referrals_and_hybrid_credits.sql
-- Titre     : Programme de parrainage RESCERT (+3 crédits / confrère)
--             & Débit atomique sécurisé de crédits partiels (complément €)
-- ==============================================================================

BEGIN;

-- 1. Colonnes de parrainage sur public.partners & public.installer_applications
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_partners_referral_code
  ON public.partners (referral_code)
  WHERE referral_code IS NOT NULL;

-- Backfill déterministe des codes de parrainage existants (sans caractères ambigus via hex filtré)
UPDATE public.partners
   SET referral_code = 'AEGIS-' || upper(substr(md5(id::text || coalesce(email, '')), 1, 6))
 WHERE referral_code IS NULL;

ALTER TABLE public.installer_applications
  ADD COLUMN IF NOT EXISTS referral_code_used text,
  ADD COLUMN IF NOT EXISTS referred_by_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- 2. Table de suivi des parrainages installateurs RESCERT
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  referred_application_id uuid REFERENCES public.installer_applications(id) ON DELETE SET NULL,
  referred_partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  referred_email text NOT NULL,
  referred_company_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rewarded', 'rejected')),
  reward_credits_referrer int NOT NULL DEFAULT 3 CHECK (reward_credits_referrer >= 0),
  reward_credits_referred int NOT NULL DEFAULT 3 CHECK (reward_credits_referred >= 0),
  trigger_event text,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_partner_referrals_referred_email UNIQUE (referred_email),
  CONSTRAINT chk_partner_referrals_no_self CHECK (referrer_partner_id IS DISTINCT FROM referred_partner_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_referrer
  ON public.partner_referrals (referrer_partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_referred_partner
  ON public.partner_referrals (referred_partner_id)
  WHERE referred_partner_id IS NOT NULL;

ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on partner_referrals" ON public.partner_referrals;
CREATE POLICY "Service role full access on partner_referrals"
  ON public.partner_referrals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. RPC atomique : débit sécurisé de crédits partiels (complément en euros)
CREATE OR REPLACE FUNCTION public.deduct_credits_safe(
  p_partner_id uuid,
  p_amount int,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int;
  v_debited int;
  v_new_credits int;
BEGIN
  SELECT credits
    INTO v_current
    FROM public.partners
   WHERE id = p_partner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('debited', 0, 'new_credits', 0);
  END IF;

  v_debited := LEAST(GREATEST(coalesce(v_current, 0), 0), GREATEST(coalesce(p_amount, 0), 0));

  UPDATE public.partners
     SET credits = GREATEST(0, coalesce(v_current, 0) - v_debited),
         updated_at = now()
   WHERE id = p_partner_id
   RETURNING credits INTO v_new_credits;

  IF v_debited > 0 THEN
    INSERT INTO public.credit_transactions (partner_id, amount, type, reference, created_at)
    VALUES (
      p_partner_id,
      -v_debited,
      'purchase',
      coalesce(p_reference, 'HYBRID_LEAD_COMPLEMENT'),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'debited', v_debited,
    'new_credits', coalesce(v_new_credits, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credits_safe(uuid, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_safe(uuid, int, text) TO service_role;

-- 4. RPC atomique & idempotente : récompense de parrainage au 1er achat payant du filleul
CREATE OR REPLACE FUNCTION public.reward_partner_referral_if_eligible(
  p_referred_partner_id uuid,
  p_trigger_event text DEFAULT 'first_paid_purchase'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref record;
  v_referrer_credits int := 0;
  v_referred_credits int := 0;
  v_referrer_new_balance int := 0;
  v_referred_new_balance int := 0;
BEGIN
  IF p_referred_partner_id IS NULL THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  SELECT *
    INTO v_ref
    FROM public.partner_referrals
   WHERE referred_partner_id = p_referred_partner_id
     AND status IN ('pending', 'approved')
   ORDER BY created_at ASC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  IF v_ref.referrer_partner_id IS NULL OR v_ref.referrer_partner_id = p_referred_partner_id THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  UPDATE public.partner_referrals
     SET status = 'rewarded',
         trigger_event = coalesce(p_trigger_event, trigger_event, 'first_paid_purchase'),
         rewarded_at = now()
   WHERE id = v_ref.id;

  -- Verrouillage déterministe des deux lignes partenaires pour prévenir tout deadlock
  PERFORM 1
     FROM public.partners
    WHERE id IN (v_ref.referrer_partner_id, p_referred_partner_id)
    ORDER BY id
    FOR UPDATE;

  v_referrer_credits := GREATEST(0, coalesce(v_ref.reward_credits_referrer, 3));
  v_referred_credits := GREATEST(0, coalesce(v_ref.reward_credits_referred, 3));

  IF v_referrer_credits > 0 THEN
    UPDATE public.partners
       SET credits = credits + v_referrer_credits,
           updated_at = now()
     WHERE id = v_ref.referrer_partner_id
     RETURNING credits INTO v_referrer_new_balance;

    IF FOUND THEN
      INSERT INTO public.credit_transactions (partner_id, amount, type, reference, created_at)
      VALUES (
        v_ref.referrer_partner_id,
        v_referrer_credits,
        'adjustment',
        'REFERRAL_REWARD:' || v_ref.id::text,
        now()
      );
    END IF;
  END IF;

  IF v_referred_credits > 0 THEN
    UPDATE public.partners
       SET credits = credits + v_referred_credits,
           updated_at = now()
     WHERE id = p_referred_partner_id
     RETURNING credits INTO v_referred_new_balance;

    IF FOUND THEN
      INSERT INTO public.credit_transactions (partner_id, amount, type, reference, created_at)
      VALUES (
        p_referred_partner_id,
        v_referred_credits,
        'adjustment',
        'REFERRAL_BONUS:' || v_ref.id::text,
        now()
      );
    END IF;
  END IF;

  INSERT INTO public.audit_log (admin_email, action, entity_type, entity_id, details)
  VALUES (
    'system:referral',
    'partner_referral_rewarded',
    'partner_referral',
    v_ref.id,
    jsonb_build_object(
      'referrer_partner_id', v_ref.referrer_partner_id,
      'referred_partner_id', p_referred_partner_id,
      'referrer_credits', v_referrer_credits,
      'referred_credits', v_referred_credits,
      'referrer_new_balance', v_referrer_new_balance,
      'referred_new_balance', v_referred_new_balance,
      'trigger_event', coalesce(p_trigger_event, 'first_paid_purchase')
    )
  );

  RETURN jsonb_build_object(
    'rewarded', true,
    'referral_id', v_ref.id,
    'referrer_partner_id', v_ref.referrer_partner_id,
    'referred_partner_id', p_referred_partner_id,
    'referrer_credits', v_referrer_credits,
    'referred_credits', v_referred_credits,
    'referrer_new_balance', v_referrer_new_balance,
    'referred_new_balance', v_referred_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reward_partner_referral_if_eligible(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reward_partner_referral_if_eligible(uuid, text) TO service_role;

COMMIT;
