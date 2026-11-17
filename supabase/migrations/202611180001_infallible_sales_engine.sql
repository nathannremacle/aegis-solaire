-- =============================================================================
-- MIGRATION : Moteur Commercial V3 (Tarifs Dynamiques, Exclusivité B2C, Auto-Pilot & H+48h)
-- =============================================================================

BEGIN;

-- 1. Colonnes complémentaires sur public.leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS max_slots integer,
  ADD COLUMN IF NOT EXISTS exclusive_buyout boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_tier text,
  ADD COLUMN IF NOT EXISTS reconfirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconfirm_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS stale_closed_at timestamptz;

UPDATE public.leads
   SET max_slots = CASE WHEN segment = 'B2B' THEN 1 ELSE 3 END
 WHERE max_slots IS NULL;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_pricing_tier_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_pricing_tier_check
  CHECK (pricing_tier IS NULL OR pricing_tier IN ('eco', 'standard', 'premium'));

-- 2. Colonnes Auto-Pilot & Mandat Mollie 1-clic sur public.partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS target_surfaces text[] DEFAULT ARRAY['toiture', 'parking'],
  ADD COLUMN IF NOT EXISTS auto_buy_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_buy_weekly_cap integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS auto_buy_include_b2c_exclusive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mollie_customer_id text,
  ADD COLUMN IF NOT EXISTS mollie_mandate_id text,
  ADD COLUMN IF NOT EXISTS mollie_mandate_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_auto_buy_weekly_cap_check;
ALTER TABLE public.partners ADD CONSTRAINT partners_auto_buy_weekly_cap_check
  CHECK (auto_buy_weekly_cap >= 1 AND auto_buy_weekly_cap <= 50);

-- 3. Colonnes d'audit sur public.lead_purchases
ALTER TABLE public.lead_purchases
  ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_channel text NOT NULL DEFAULT 'credits';

-- 4. Index de performance pour Auto-Pilot et Protocole H+48h
CREATE INDEX IF NOT EXISTS idx_partners_auto_buy_active
  ON public.partners (segment)
  WHERE auto_buy_enabled = true;

CREATE INDEX IF NOT EXISTS idx_leads_available_reconfirm
  ON public.leads (created_at, reconfirm_sent_at)
  WHERE marketplace_status = 'available';

-- 5. Suppression propre des anciennes signatures 2-arg avant recréation avec p_exclusive
DROP FUNCTION IF EXISTS public.purchase_marketplace_lead(uuid, uuid);
DROP FUNCTION IF EXISTS public.purchase_lead(uuid, uuid);

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
  v_is_b2c_exclusive boolean;
  v_cost int;
  v_purchase_id uuid;
  v_effective_max_slots int;
BEGIN
  -- Verrouillage exclusif dans un ordre déterministe (leads -> partners)
  SELECT id, segment, marketplace_status, credit_cost, max_slots, pricing_version, exclusive_buyout
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

  -- Vérifier doublon d'achat pour ce partenaire
  IF EXISTS (
    SELECT 1 FROM public.lead_purchases
    WHERE lead_id = p_lead_id AND partner_id = p_partner_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_PURCHASED: Vous avez déjà acquis ce lead.';
  END IF;

  v_buyer_is_test := COALESCE(v_partner.is_test, false) OR lower(COALESCE(v_partner.company_name, '')) LIKE '%test%';
  v_max_slots := COALESCE(v_lead.max_slots, CASE WHEN v_lead.segment = 'B2B' THEN 1 ELSE 3 END);

  -- Compter uniquement les places prises par des installateurs réels
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

  v_is_b2c_exclusive := COALESCE(p_exclusive, false) AND v_lead.segment = 'B2C';

  IF v_is_b2c_exclusive THEN
    IF NOT v_buyer_is_test AND v_taken_slots > 0 THEN
      RAISE EXCEPTION 'EXCLUSIVE_UNAVAILABLE: Ce dossier a déjà été partiellement attribué et ne peut plus être acheté en exclusivité.';
    END IF;
    v_cost := 7; -- Tarif exclusivité totale B2C (7 crédits = 65 € HT)
    v_effective_max_slots := CASE WHEN v_buyer_is_test THEN v_max_slots ELSE 1 END;
  ELSE
    v_cost := COALESCE(v_lead.credit_cost, CASE WHEN v_lead.segment = 'B2B' THEN 9 ELSE 3 END);
    v_effective_max_slots := v_max_slots;
  END IF;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE: Le coût en crédits du dossier doit être strictement positif.';
  END IF;

  IF v_partner.credits < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Solde insuffisant (% crédits requis, % disponibles).',
      v_cost, v_partner.credits;
  END IF;

  -- 1. Débit atomique du solde partenaire
  UPDATE public.partners
     SET credits = credits - v_cost
   WHERE id = p_partner_id;

  -- 2. Enregistrement de l'achat
  INSERT INTO public.lead_purchases (
    lead_id, partner_id, purchased_at, credits_spent, pipeline_status, is_exclusive, purchase_channel
  ) VALUES (
    p_lead_id,
    p_partner_id,
    now(),
    v_cost,
    'to_contact',
    v_is_b2c_exclusive OR v_lead.segment = 'B2B',
    'credits'
  ) RETURNING id INTO v_purchase_id;

  -- 3. Journalisation dans credit_transactions
  INSERT INTO public.credit_transactions (
    partner_id, amount, type, reference, created_at
  ) VALUES (
    p_partner_id,
    -v_cost,
    'purchase',
    CASE WHEN v_is_b2c_exclusive THEN 'LEAD:' || p_lead_id::text || ':EXCLUSIVE' ELSE 'LEAD:' || p_lead_id::text END,
    now()
  );

  -- 4. Clôture du dossier si exclusif B2C ou dernier créneau réel attribué
  IF v_is_b2c_exclusive AND NOT v_buyer_is_test THEN
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
    'exclusive', v_is_b2c_exclusive OR v_lead.segment = 'B2B',
    'max_slots', v_effective_max_slots,
    'slots_remaining', CASE
      WHEN v_is_b2c_exclusive AND NOT v_buyer_is_test THEN 0
      WHEN v_buyer_is_test THEN GREATEST(v_effective_max_slots - v_taken_slots, 0)
      ELSE GREATEST(v_effective_max_slots - (v_taken_slots + 1), 0)
    END
  );
END;
$$;

-- 6. RPC de secours purchase_lead alignée avec p_exclusive
CREATE OR REPLACE FUNCTION public.purchase_lead(
  p_lead_id uuid,
  p_partner_id uuid,
  p_exclusive boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.purchase_marketplace_lead(p_lead_id, p_partner_id, p_exclusive);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 7. Mise à jour de get_partner_dashboard_init : respecte l.max_slots, pricing_tier, reconfirmed_at & Auto-Pilot
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
      l.reconfirmed_at,
      l.exclusive_buyout,
      l.lead_score,
      l.wants_irve,
      l.qualification_metadata,
      coalesce(l.max_slots, CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END) AS max_slots,
      count(lp.id) FILTER (
        WHERE p.id IS NOT NULL
          AND coalesce(p.is_test, false) = false
          AND lower(coalesce(p.company_name, '')) NOT LIKE '%test%'
      )::int AS taken_slots,
      (coalesce(l.max_slots, CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END) - count(lp.id) FILTER (
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
       ) < coalesce(l.max_slots, CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END)
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

REVOKE ALL ON FUNCTION public.purchase_lead(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_lead(uuid, uuid, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.get_partner_dashboard_init(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_init(uuid) TO service_role;

COMMIT;
