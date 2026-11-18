-- =============================================================================
-- MIGRATION : Inclure lead_id et l'état de litige (dispute_id / dispute_status)
-- dans le portfolio retourné par get_partner_dashboard_init()
-- Corrige l'erreur client lors d'une contestation sur d'anciens achats
-- =============================================================================

BEGIN;

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
      lp.lead_id,
      lp.purchased_at,
      lp.credits_spent,
      lp.pipeline_status,
      lp.notes,
      lp.next_action_at,
      lp.is_exclusive,
      d.id AS dispute_id,
      d.status AS dispute_status,
      d.credits_refunded AS dispute_credits_refunded,
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
    LEFT JOIN LATERAL (
      SELECT id, status, credits_refunded
      FROM public.lead_disputes
      WHERE purchase_id = lp.id
      ORDER BY created_at DESC
      LIMIT 1
    ) d ON true
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
