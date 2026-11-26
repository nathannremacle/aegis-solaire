-- ==============================================================================
-- MIGRATION : 202611270001_approach1_installer_growth_engine.sql
-- Titre     : Approche 1 — Machine Autonome 3 Étages (Acquisition & Activation)
--             - Programme Alliés Distributeurs / Grossistes PV (distributor_partners)
--             - Préférences & Cooldowns Digest Hebdo / Relances Comportementales / min_kwc
--             - Micro-feedback 1-clic installateurs (partner_micro_feedback)
--             - RPC atomique reward_distributor_bonus_if_eligible
--             - Mise à jour get_partner_dashboard_init
-- ==============================================================================

BEGIN;

-- 1. Table des distributeurs / grossistes photovoltaïques partenaires
CREATE TABLE IF NOT EXISTS public.distributor_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  referral_code text NOT NULL UNIQUE,
  reward_credits_referred int NOT NULL DEFAULT 3 CHECK (reward_credits_referred >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distributor_partners_status
  ON public.distributor_partners (status, created_at DESC);

ALTER TABLE public.distributor_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on distributor_partners" ON public.distributor_partners;
CREATE POLICY "Service role full access on distributor_partners"
  ON public.distributor_partners
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Extensions sur public.partners & public.installer_applications
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS min_kwc int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_weekly_digest_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_behavioral_nudge_at timestamptz,
  ADD COLUMN IF NOT EXISTS distributor_partner_id uuid REFERENCES public.distributor_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS distributor_bonus_rewarded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_partners_distributor_partner_id
  ON public.partners (distributor_partner_id)
  WHERE distributor_partner_id IS NOT NULL;

ALTER TABLE public.installer_applications
  ADD COLUMN IF NOT EXISTS distributor_partner_id uuid REFERENCES public.distributor_partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS distributor_code_used text;

CREATE INDEX IF NOT EXISTS idx_installer_apps_distributor_partner_id
  ON public.installer_applications (distributor_partner_id)
  WHERE distributor_partner_id IS NOT NULL;

-- 3. Table de micro-feedback 1-clic installateurs
CREATE TABLE IF NOT EXISTS public.partner_micro_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('price', 'out_of_zone', 'too_small', 'competition', 'other')),
  custom_note text,
  source text NOT NULL DEFAULT 'drawer_in_app',
  action_applied text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_micro_feedback_partner_created
  ON public.partner_micro_feedback (partner_id, created_at DESC);

ALTER TABLE public.partner_micro_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on partner_micro_feedback" ON public.partner_micro_feedback;
CREATE POLICY "Service role full access on partner_micro_feedback"
  ON public.partner_micro_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. RPC atomique & idempotente : bonus filleul distributeur/grossiste au 1er achat payant
CREATE OR REPLACE FUNCTION public.reward_distributor_bonus_if_eligible(
  p_partner_id uuid,
  p_trigger_event text DEFAULT 'first_paid_purchase'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner record;
  v_dist record;
  v_bonus int := 0;
  v_new_balance int := 0;
BEGIN
  IF p_partner_id IS NULL THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  SELECT id, company_name, credits, distributor_partner_id, distributor_bonus_rewarded_at
    INTO v_partner
    FROM public.partners
   WHERE id = p_partner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  IF v_partner.distributor_partner_id IS NULL OR v_partner.distributor_bonus_rewarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  SELECT id, slug, company_name, reward_credits_referred, status
    INTO v_dist
    FROM public.distributor_partners
   WHERE id = v_partner.distributor_partner_id;

  IF NOT FOUND OR v_dist.status <> 'active' THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  v_bonus := GREATEST(0, coalesce(v_dist.reward_credits_referred, 3));
  IF v_bonus <= 0 THEN
    RETURN jsonb_build_object('rewarded', false);
  END IF;

  UPDATE public.partners
     SET credits = credits + v_bonus,
         distributor_bonus_rewarded_at = now(),
         updated_at = now()
   WHERE id = p_partner_id
   RETURNING credits INTO v_new_balance;

  INSERT INTO public.credit_transactions (partner_id, amount, type, reference, created_at)
  VALUES (
    p_partner_id,
    v_bonus,
    'adjustment',
    'DISTRIBUTOR_BONUS:' || v_dist.slug,
    now()
  );

  INSERT INTO public.audit_log (admin_email, action, entity_type, entity_id, details)
  VALUES (
    'system:distributor',
    'distributor_bonus_rewarded',
    'distributor_partner',
    v_dist.id,
    jsonb_build_object(
      'distributor_id', v_dist.id,
      'distributor_slug', v_dist.slug,
      'distributor_company', v_dist.company_name,
      'partner_id', p_partner_id,
      'partner_company', v_partner.company_name,
      'credits_awarded', v_bonus,
      'new_balance', v_new_balance,
      'trigger_event', coalesce(p_trigger_event, 'first_paid_purchase')
    )
  );

  RETURN jsonb_build_object(
    'rewarded', true,
    'distributor_id', v_dist.id,
    'distributor_slug', v_dist.slug,
    'credits_awarded', v_bonus,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reward_distributor_bonus_if_eligible(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reward_distributor_bonus_if_eligible(uuid, text) TO service_role;

-- 5. Mise à jour get_partner_dashboard_init : inclut min_kwc, weekly_digest_enabled, distributor_partner_id
CREATE OR REPLACE FUNCTION public.get_partner_dashboard_init(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  partner_info AS (
    SELECT
      id,
      company_name,
      email,
      phone,
      credits,
      segment,
      target_provinces,
      target_surfaces,
      min_facture,
      min_kwc,
      weekly_digest_enabled,
      distributor_partner_id,
      auto_buy_enabled,
      auto_buy_weekly_cap,
      auto_buy_include_b2c_exclusive,
      auto_topup_enabled,
      auto_topup_pack_id,
      sms_alerts_opt_in,
      mollie_mandate_status,
      created_at
    FROM public.partners
    WHERE id = p_partner_id
  ),
  marketplace_feed AS (
    SELECT
      l.id,
      l.created_at,
      l.segment,
      l.province,
      l.city,
      l.postal_code,
      coalesce(l.postal_code, substring(coalesce(l.postal_code, ''), 1, 2) || 'XX') AS masked_postal_code,
      l.surface_type,
      l.surface_area,
      l.annual_electricity_bill,
      l.estimated_power_kwc,
      l.roof_material,
      l.ownership_status,
      l.timeframe,
      l.project_timeline,
      l.project_driver,
      l.project_details,
      l.message,
      l.first_name,
      l.last_name,
      l.grd,
      l.estimated_roi_years,
      l.estimated_savings,
      l.autoconsumption_rate,
      l.credit_cost,
      l.pricing_tier,
      l.allocation_mode,
      l.reconfirmed_at,
      l.exclusive_buyout,
      l.lead_score,
      l.wants_irve,
      l.qualification_metadata,
      coalesce(l.max_slots, CASE WHEN l.segment = 'B2B' THEN 2 ELSE 3 END) AS max_slots,
      count(lp.id) FILTER (
        WHERE p.id IS NOT NULL
          AND coalesce(p.is_test, false) = false
          AND lower(coalesce(p.company_name, '')) NOT LIKE '%test%'
      )::int AS taken_slots,
      (coalesce(l.max_slots, CASE WHEN l.segment = 'B2B' THEN 2 ELSE 3 END) - count(lp.id) FILTER (
        WHERE p.id IS NOT NULL
          AND coalesce(p.is_test, false) = false
          AND lower(coalesce(p.company_name, '')) NOT LIKE '%test%'
      )::int) AS remaining_slots,
      bool_or(lp.partner_id = p_partner_id) AS already_purchased
    FROM public.leads l
    LEFT JOIN public.lead_purchases lp ON lp.lead_id = l.id
    LEFT JOIN public.partners p ON p.id = lp.partner_id
    WHERE l.marketplace_status = 'available'
      AND coalesce((l.qualification_metadata->>'is_showcase')::boolean, false) IS NOT TRUE
    GROUP BY l.id
    HAVING bool_or(lp.partner_id = p_partner_id) IS NOT TRUE
       AND count(lp.id) FILTER (
         WHERE p.id IS NOT NULL
           AND coalesce(p.is_test, false) = false
           AND lower(coalesce(p.company_name, '')) NOT LIKE '%test%'
       ) < coalesce(l.max_slots, CASE WHEN l.segment = 'B2B' THEN 2 ELSE 3 END)
    ORDER BY greatest(l.created_at, coalesce(l.reconfirmed_at, l.created_at)) DESC
    LIMIT 60
  ),
  my_purchased_leads AS (
    SELECT
      lp.id AS purchase_id,
      lp.purchased_at,
      lp.credits_spent,
      lp.pipeline_status,
      lp.notes,
      lp.next_action_at,
      lp.is_exclusive,
      l.id,
      l.first_name,
      l.last_name,
      l.email,
      l.phone,
      l.company,
      l.company_vat,
      l.province,
      l.city,
      l.postal_code,
      l.site_address,
      l.segment,
      l.surface_type,
      l.surface_area,
      l.roof_material,
      l.annual_electricity_bill,
      l.estimated_power_kwc,
      l.lead_score,
      l.project_details,
      l.message,
      l.qualification_metadata
    FROM public.lead_purchases lp
    JOIN public.leads l ON l.id = lp.lead_id
    WHERE lp.partner_id = p_partner_id
    ORDER BY lp.purchased_at DESC
  )
  SELECT jsonb_build_object(
    'partner', (SELECT to_jsonb(p) FROM partner_info p),
    'marketplace', coalesce((SELECT jsonb_agg(m) FROM marketplace_feed m), '[]'::jsonb),
    'portfolio', coalesce((SELECT jsonb_agg(pl) FROM my_purchased_leads pl), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_dashboard_init(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_init(uuid) TO service_role;

COMMIT;
