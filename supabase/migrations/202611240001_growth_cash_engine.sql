-- ==============================================================================
-- MIGRATION : 202611240001_growth_cash_engine.sql
-- Titre     : Moteur Croissance & Cash Aegis Solaire (Stratégies 1, 2, 3, 4)
--             - Exclusivité indexée B2C (6/9/12) & B2B 2 slots / Conciergerie CFO (15/24/40)
--             - Auto-Recharge < 6 crédits & Opt-In SMS Sniper < 20 km
--             - Table quote_audits (Contre-Expertise Devis Avant Signature)
-- ==============================================================================

BEGIN;

-- 1. Colonnes Quotas Prioritaires, Auto-Recharge & Opt-In SMS sur public.partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS auto_topup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_topup_pack_id text NOT NULL DEFAULT 'pack_24',
  ADD COLUMN IF NOT EXISTS sms_alerts_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_alerts_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescert_number text;

-- 2. Colonnes allocation_mode & sniper_sent_at sur public.leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS allocation_mode text NOT NULL DEFAULT 'shared_3',
  ADD COLUMN IF NOT EXISTS sniper_sent_at timestamptz;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_allocation_mode_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_allocation_mode_check
  CHECK (allocation_mode IN ('shared_3', 'single_vetted', 'b2b_tender_2', 'b2b_exclusive_cfo', 'quote_audit_2'));

-- 3. Colonnes Conciergerie CFO / Success Fee sur public.lead_purchases
ALTER TABLE public.lead_purchases
  ADD COLUMN IF NOT EXISTS b2b_success_fee_eur numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS b2b_cfo_mandate_accepted_at timestamptz;

-- 4. Table des audits de devis concurrents (/verifier-mon-devis)
CREATE TABLE IF NOT EXISTS public.quote_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  segment text NOT NULL DEFAULT 'B2C' CHECK (segment IN ('B2C', 'B2B')),
  postal_code text NOT NULL,
  city text,
  province text,
  email text NOT NULL,
  phone text NOT NULL,
  phone_verified boolean NOT NULL DEFAULT false,
  contact_preference text NOT NULL DEFAULT 'written_first',
  wants_counter_offer boolean NOT NULL DEFAULT false,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_mime text NOT NULL,
  extracted_kwc numeric(6,2),
  extracted_battery_kwh numeric(6,2),
  extracted_panel_brand text,
  extracted_inverter_brand text,
  extracted_price_htva numeric(10,2),
  extracted_price_tvac numeric(10,2),
  benchmark_min_tvac numeric(10,2),
  benchmark_max_tvac numeric(10,2),
  estimated_overcharge_eur numeric(10,2),
  audit_summary text,
  status text NOT NULL DEFAULT 'pending_audit' CHECK (status IN ('pending_audit', 'report_sent', 'published_counter_offer', 'archived_fair_price')),
  report_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_audits_status_created
  ON public.quote_audits (status, created_at DESC);

ALTER TABLE public.quote_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on quote_audits" ON public.quote_audits;
CREATE POLICY "Service role full access on quote_audits"
  ON public.quote_audits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Mise à jour RPC purchase_marketplace_lead : Exclusivité indexée B2C (6/9/12) & B2B (15/24/40) + B2B 2 slots
CREATE OR REPLACE FUNCTION public.purchase_marketplace_lead(
  p_lead_id uuid,
  p_partner_id uuid,
  p_exclusive boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_partner record;
  v_max_slots int;
  v_taken_slots int;
  v_buyer_is_test boolean;
  v_is_exclusive_buyout boolean;
  v_base_cost int;
  v_cost int;
  v_purchase_id uuid;
  v_effective_max_slots int;
BEGIN
  SELECT id, segment, marketplace_status, credit_cost, max_slots, pricing_version, exclusive_buyout, allocation_mode
    INTO v_lead
    FROM public.leads
   WHERE id = p_lead_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND: Ce lead est introuvable.';
  END IF;

  IF v_lead.marketplace_status <> 'available' THEN
    RAISE EXCEPTION 'LEAD_UNAVAILABLE: Ce lead n''est plus disponible sur la marketplace.';
  END IF;

  SELECT id, credits, company_name, is_test
    INTO v_partner
    FROM public.partners
   WHERE id = p_partner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARTNER_NOT_FOUND: Profil partenaire introuvable.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lead_purchases
    WHERE lead_id = p_lead_id AND partner_id = p_partner_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_PURCHASED: Vous avez déjà acquis ce lead.';
  END IF;

  v_buyer_is_test := COALESCE(v_partner.is_test, false) OR lower(COALESCE(v_partner.company_name, '')) LIKE '%test%';
  v_max_slots := COALESCE(v_lead.max_slots, CASE WHEN v_lead.segment = 'B2B' THEN 2 ELSE 3 END);

  SELECT count(*)::int INTO v_taken_slots
    FROM public.lead_purchases lp
    JOIN public.partners p ON p.id = lp.partner_id
   WHERE lp.lead_id = p_lead_id
     AND COALESCE(p.is_test, false) = false
     AND lower(COALESCE(p.company_name, '')) NOT LIKE '%test%';

  IF NOT v_buyer_is_test AND v_taken_slots >= v_max_slots THEN
    UPDATE public.leads
       SET marketplace_status = 'sold_out'
     WHERE id = p_lead_id;
    RAISE EXCEPTION 'SLOTS_FULL: Tous les créneaux pour ce lead viennent d''être attribués.';
  END IF;

  v_base_cost := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2B' THEN 13 ELSE 3 END);
  v_is_exclusive_buyout := COALESCE(p_exclusive, false) OR v_max_slots = 1;

  IF COALESCE(p_exclusive, false) AND v_max_slots > 1 THEN
    IF NOT v_buyer_is_test AND v_taken_slots > 0 THEN
      RAISE EXCEPTION 'EXCLUSIVE_UNAVAILABLE: Ce dossier a déjà été partiellement attribué et ne peut plus être acheté en exclusivité.';
    END IF;

    IF v_lead.segment = 'B2B' THEN
      v_cost := CASE
        WHEN v_base_cost <= 8 THEN 15
        WHEN v_base_cost <= 13 THEN 24
        ELSE 40
      END;
    ELSE
      v_cost := CASE
        WHEN v_base_cost <= 2 THEN 6
        WHEN v_base_cost = 3 THEN 9
        ELSE 12
      END;
    END IF;
    v_effective_max_slots := CASE WHEN v_buyer_is_test THEN v_max_slots ELSE 1 END;
  ELSE
    v_cost := v_base_cost;
    v_effective_max_slots := v_max_slots;
  END IF;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE: Le coût en crédits du dossier doit être strictement positif.';
  END IF;

  IF v_partner.credits < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Solde insuffisant (% crédits requis, % disponibles).',
      v_cost, v_partner.credits;
  END IF;

  UPDATE public.partners
     SET credits = credits - v_cost
   WHERE id = p_partner_id;

  INSERT INTO public.lead_purchases (
    lead_id, partner_id, purchased_at, credits_spent, pipeline_status, is_exclusive, purchase_channel
  ) VALUES (
    p_lead_id,
    p_partner_id,
    now(),
    v_cost,
    'to_contact',
    v_is_exclusive_buyout,
    'credits'
  ) RETURNING id INTO v_purchase_id;

  INSERT INTO public.credit_transactions (
    partner_id, amount, type, reference, created_at
  ) VALUES (
    p_partner_id,
    -v_cost,
    'purchase',
    CASE WHEN COALESCE(p_exclusive, false) THEN 'LEAD:' || p_lead_id::text || ':EXCLUSIVE' ELSE 'LEAD:' || p_lead_id::text END,
    now()
  );

  IF COALESCE(p_exclusive, false) AND NOT v_buyer_is_test THEN
    UPDATE public.leads
       SET max_slots = 1,
           exclusive_buyout = true,
           marketplace_status = 'sold_out'
     WHERE id = p_lead_id;
  ELSIF NOT v_buyer_is_test AND (v_taken_slots + 1) >= v_effective_max_slots THEN
    UPDATE public.leads
       SET marketplace_status = 'sold_out'
     WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'credits_spent', v_cost,
    'remaining_credits', v_partner.credits - v_cost,
    'exclusive', v_is_exclusive_buyout,
    'max_slots', v_effective_max_slots,
    'slots_remaining', CASE
      WHEN COALESCE(p_exclusive, false) AND NOT v_buyer_is_test THEN 0
      WHEN v_buyer_is_test THEN GREATEST(v_effective_max_slots - v_taken_slots, 0)
      ELSE GREATEST(v_effective_max_slots - (v_taken_slots + 1), 0)
    END
  );
END;
$$;

-- 6. Mise à jour get_partner_dashboard_init : inclut auto_topup, sms_alerts_opt_in, allocation_mode
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

REVOKE ALL ON FUNCTION public.purchase_marketplace_lead(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_marketplace_lead(uuid, uuid, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.get_partner_dashboard_init(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_init(uuid) TO service_role;

COMMIT;
