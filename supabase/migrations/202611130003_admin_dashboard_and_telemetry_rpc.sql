-- ==============================================================================
-- MIGRATION 202611130003 : OPTIMISATION RPC DASHBOARD ADMIN & TÉLÉMÉTRIE BUNDLE
-- ==============================================================================
-- 1. Enrichit get_admin_dashboard_kpis() avec paid_orders, active_partners et
--    available_leads pour supprimer 3 requêtes HTTP PostgREST supplémentaires.
-- 2. Crée get_partner_telemetry_bundle() pour agréger/filtrer en 1 seul appel
--    SQL les événements de télémétrie, partenaires et uniquement les leads/achats
--    effectivement référencés (0 full-table scan sur leads & lead_purchases).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start_of_month timestamptz := date_trunc('month', v_now AT TIME ZONE 'Europe/Brussels');
  v_start_of_day timestamptz := date_trunc('day', v_now AT TIME ZONE 'Europe/Brussels');
  v_result jsonb;
BEGIN
  WITH
  leads_agg AS (
    SELECT
      count(*)::int AS total_leads,
      count(*) FILTER (WHERE created_at >= v_start_of_month)::int AS leads_month,
      count(*) FILTER (WHERE created_at >= v_start_of_day)::int AS leads_today,
      count(*) FILTER (WHERE segment = 'B2B')::int AS leads_b2b,
      count(*) FILTER (WHERE segment = 'B2C')::int AS leads_b2c,
      count(*) FILTER (WHERE marketplace_status = 'available')::int AS available_count,
      coalesce(sum(credit_cost) FILTER (WHERE marketplace_status = 'available'), 0)::int AS available_credits_pool,
      count(*) FILTER (WHERE marketplace_status = 'sold_out')::int AS sold_out_count,
      count(*) FILTER (WHERE marketplace_status = 'pending_review' OR status = 'NEEDS_HUMAN_REVIEW')::int AS pending_review_count,
      count(*) FILTER (WHERE status = 'new')::int AS status_new_count,
      count(*) FILTER (WHERE status = 'qualified')::int AS status_qualified_count,
      count(*) FILTER (WHERE marketplace_status IN ('available', 'sold_out'))::int AS publishable_pool_count
    FROM public.leads
  ),
  real_partners AS (
    SELECT id, company_name, email, phone, credits, segment, target_provinces, created_at, is_test
    FROM public.partners
    WHERE coalesce(is_test, false) = false
      AND lower(coalesce(company_name, '')) NOT LIKE '%test%'
  ),
  partners_agg AS (
    SELECT
      count(*)::int AS active_partners_count,
      coalesce(sum(credits), 0)::int AS total_partner_credits_balance,
      count(*) FILTER (WHERE upper(coalesce(segment, '')) IN ('B2B', 'BOTH'))::int AS b2b_partners_count,
      count(*) FILTER (WHERE upper(coalesce(segment, '')) IN ('B2C', 'BOTH'))::int AS b2c_partners_count
    FROM real_partners
  ),
  purchases_agg AS (
    SELECT
      count(lp.id)::int AS total_purchases,
      coalesce(sum(lp.credits_spent), 0)::int AS total_credits_spent,
      count(DISTINCT lp.lead_id)::int AS distinct_purchased_leads
    FROM public.lead_purchases lp
    INNER JOIN real_partners rp ON rp.id = lp.partner_id
  ),
  credit_orders_agg AS (
    SELECT
      count(*) FILTER (WHERE co.status = 'pending')::int AS pending_orders_count,
      coalesce(sum(co.price_htva) FILTER (WHERE co.status = 'pending'), 0)::numeric(12,2) AS pending_htva,
      coalesce(sum(co.price_ttc) FILTER (WHERE co.status = 'pending'), 0)::numeric(12,2) AS pending_ttc,
      coalesce(sum(co.price_htva) FILTER (WHERE co.status = 'paid'), 0)::numeric(12,2) AS paid_htva_total,
      coalesce(sum(co.price_ttc) FILTER (WHERE co.status = 'paid'), 0)::numeric(12,2) AS paid_ttc_total,
      coalesce(sum(co.price_htva) FILTER (WHERE co.status = 'paid' AND co.validated_at >= v_start_of_month), 0)::numeric(12,2) AS paid_htva_month
    FROM public.credit_orders co
    INNER JOIN real_partners rp ON rp.id = co.partner_id
  ),
  media_commissions_agg AS (
    SELECT
      mp.id,
      mp.name AS company_name,
      mp.tracking_code,
      count(l.id)::int AS attributed_leads_count,
      count(l.id) FILTER (WHERE l.marketplace_status IN ('available', 'sold_out'))::int AS validated_leads_count,
      coalesce(
        sum(
          CASE
            WHEN l.marketplace_status IN ('available', 'sold_out') AND l.segment = 'B2B' THEN coalesce(mp.commission_b2b, 0)
            WHEN l.marketplace_status IN ('available', 'sold_out') AND l.segment = 'B2C' THEN coalesce(mp.commission_b2c, 0)
            ELSE 0
          END
        ), 0
      )::numeric(12,2) AS total_commission_due
    FROM public.media_partners mp
    LEFT JOIN public.leads l ON l.media_partner_code = mp.tracking_code
    WHERE mp.status = 'active'
    GROUP BY mp.id, mp.name, mp.tracking_code
  ),
  pending_counts AS (
    SELECT
      (SELECT count(*)::int FROM public.installer_applications WHERE status = 'pending') AS pending_installer_apps,
      (SELECT count(*)::int FROM public.media_partner_applications WHERE status = 'pending') AS pending_media_apps,
      (SELECT count(*)::int FROM public.lead_disputes WHERE status = 'pending') AS pending_disputes_count
  ),
  needs_review_list AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT id, created_at, first_name, last_name, company, segment, province, surface_area,
             annual_electricity_bill, lead_score, status, marketplace_status, credit_cost
      FROM public.leads
      WHERE marketplace_status = 'pending_review' OR status = 'NEEDS_HUMAN_REVIEW'
      ORDER BY created_at DESC
      LIMIT 10
    ) t
  ),
  recent_leads_list AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT id, created_at, first_name, last_name, email, phone, company, segment, province,
             status, marketplace_status, credit_cost, lead_score, media_partner_code,
             surface_type, surface_area, estimated_roi_years
      FROM public.leads
      ORDER BY created_at DESC
      LIMIT 15
    ) t
  ),
  pending_orders_list AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT co.id, co.partner_id, rp.company_name AS partner_name, co.pack_name,
             co.credits, co.price_htva, co.price_ttc, co.transfer_reference, co.status, co.created_at
      FROM public.credit_orders co
      INNER JOIN real_partners rp ON rp.id = co.partner_id
      WHERE co.status = 'pending'
      ORDER BY co.created_at ASC
      LIMIT 15
    ) t
  ),
  pending_disputes_list AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT ld.id, ld.purchase_id, ld.lead_id, ld.partner_id, rp.company_name AS partner_name,
             l.first_name || ' ' || l.last_name AS lead_name, l.company AS lead_company, l.segment,
             ld.reason, ld.details, ld.created_at, lp.credits_spent
      FROM public.lead_disputes ld
      INNER JOIN real_partners rp ON rp.id = ld.partner_id
      INNER JOIN public.leads l ON l.id = ld.lead_id
      LEFT JOIN public.lead_purchases lp ON lp.id = ld.purchase_id
      WHERE ld.status = 'pending'
      ORDER BY ld.created_at ASC
      LIMIT 10
    ) t
  ),
  recent_audit_logs AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT id, admin_email, action, entity_type, entity_id, details AS payload, created_at
      FROM public.audit_log
      ORDER BY created_at DESC
      LIMIT 10
    ) t
  ),
  paid_orders_list AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT co.id, co.partner_id, co.pack_name, co.credits, co.price_htva, co.price_ttc,
             co.transfer_reference, co.status, co.created_at, co.validated_at,
             coalesce(p.company_name, 'Partenaire') AS partner_name
      FROM public.credit_orders co
      LEFT JOIN public.partners p ON p.id = co.partner_id
      WHERE co.status = 'paid'
      ORDER BY co.validated_at DESC NULLS LAST
      LIMIT 20
    ) t
  ),
  active_partners_list AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT id, company_name, email, phone, credits, segment, target_provinces, created_at, is_test
      FROM real_partners
      ORDER BY credits DESC
      LIMIT 20
    ) t
  ),
  available_leads_list AS (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) AS items
    FROM (
      SELECT id, first_name, last_name, company, postal_code, city, province, credit_cost,
             segment, surface_area, annual_electricity_bill, created_at
      FROM public.leads
      WHERE marketplace_status = 'available'
      ORDER BY created_at DESC
      LIMIT 20
    ) t
  )
  SELECT jsonb_build_object(
    'generated_at', v_now,
    'leads', (SELECT row_to_json(leads_agg) FROM leads_agg),
    'partners', (SELECT row_to_json(partners_agg) FROM partners_agg),
    'purchases', jsonb_build_object(
      'total_purchases', (SELECT total_purchases FROM purchases_agg),
      'total_credits_spent', (SELECT total_credits_spent FROM purchases_agg),
      'distinct_purchased_leads', (SELECT distinct_purchased_leads FROM purchases_agg),
      'sell_through_rate', CASE
        WHEN (SELECT publishable_pool_count FROM leads_agg) > 0
        THEN round(((SELECT distinct_purchased_leads FROM purchases_agg)::numeric / (SELECT publishable_pool_count FROM leads_agg)::numeric) * 100, 1)
        ELSE 0
      END
    ),
    'revenue', (SELECT row_to_json(credit_orders_agg) FROM credit_orders_agg),
    'media_partners', jsonb_build_object(
      'total_commissions_due', (SELECT coalesce(sum(total_commission_due), 0) FROM media_commissions_agg),
      'breakdown', (SELECT coalesce(jsonb_agg(row_to_json(media_commissions_agg)), '[]'::jsonb) FROM media_commissions_agg)
    ),
    'badges', jsonb_build_object(
      'pending_review_leads', (SELECT pending_review_count FROM leads_agg),
      'pending_credit_orders', (SELECT pending_orders_count FROM credit_orders_agg),
      'pending_installer_apps', (SELECT pending_installer_apps FROM pending_counts),
      'pending_media_apps', (SELECT pending_media_apps FROM pending_counts),
      'pending_disputes', (SELECT pending_disputes_count FROM pending_counts)
    ),
    'lists', jsonb_build_object(
      'needs_review', (SELECT items FROM needs_review_list),
      'recent_leads', (SELECT items FROM recent_leads_list),
      'pending_orders', (SELECT items FROM pending_orders_list),
      'pending_disputes', (SELECT items FROM pending_disputes_list),
      'audit_logs', (SELECT items FROM recent_audit_logs),
      'paid_orders', (SELECT items FROM paid_orders_list),
      'active_partners', (SELECT items FROM active_partners_list),
      'available_leads', (SELECT items FROM available_leads_list)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_kpis() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_kpis() TO service_role;


CREATE OR REPLACE FUNCTION public.get_partner_telemetry_bundle(
  p_since timestamptz,
  p_partner_id uuid DEFAULT NULL,
  p_lead_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  raw_events AS (
    SELECT id, partner_id, partner_email, partner_name, lead_id, lead_ref,
           session_id, event_type, duration_ms, source, metadata, created_at
    FROM public.partner_activity_events
    WHERE created_at >= p_since
      AND (p_partner_id IS NULL OR partner_id = p_partner_id)
      AND (p_lead_id IS NULL OR lead_id = p_lead_id)
    ORDER BY created_at DESC
    LIMIT 2000
  ),
  raw_audit AS (
    SELECT id, admin_email, action, entity_type, entity_id, details, created_at
    FROM public.audit_log
    WHERE entity_type = 'partner_telemetry'
      AND created_at >= p_since
    ORDER BY created_at DESC
    LIMIT 500
  ),
  relevant_lead_ids AS (
    SELECT DISTINCT lead_id AS id FROM raw_events WHERE lead_id IS NOT NULL
    UNION
    SELECT DISTINCT entity_id AS id FROM raw_audit WHERE entity_id IS NOT NULL
    UNION
    SELECT DISTINCT (details->>'lead_id')::uuid AS id
    FROM raw_audit
    WHERE details->>'lead_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  relevant_leads AS (
    SELECT l.id, l.segment, l.province, l.city, l.postal_code,
           l.credit_cost, l.marketplace_status, l.estimated_power_kwc
    FROM public.leads l
    INNER JOIN relevant_lead_ids r ON r.id = l.id
  ),
  relevant_purchases AS (
    SELECT lp.lead_id, lp.partner_id, lp.purchased_at
    FROM public.lead_purchases lp
    INNER JOIN relevant_lead_ids r ON r.id = lp.lead_id
  ),
  all_partners AS (
    SELECT id, company_name, email, credits, is_test, segment
    FROM public.partners
  )
  SELECT jsonb_build_object(
    'events', coalesce((SELECT jsonb_agg(row_to_json(raw_events)) FROM raw_events), '[]'::jsonb),
    'audit_events', coalesce((SELECT jsonb_agg(row_to_json(raw_audit)) FROM raw_audit), '[]'::jsonb),
    'partners', coalesce((SELECT jsonb_agg(row_to_json(all_partners)) FROM all_partners), '[]'::jsonb),
    'leads', coalesce((SELECT jsonb_agg(row_to_json(relevant_leads)) FROM relevant_leads), '[]'::jsonb),
    'purchases', coalesce((SELECT jsonb_agg(row_to_json(relevant_purchases)) FROM relevant_purchases), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_telemetry_bundle(timestamptz, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_telemetry_bundle(timestamptz, uuid, uuid) TO service_role;


-- 3. Mise à jour de get_partner_dashboard_init pour inclure qualification_metadata (visuels toiture)
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
    SELECT id, company_name, email, phone, credits, segment, target_provinces, created_at
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
      l.lead_score,
      l.wants_irve,
      l.qualification_metadata,
      (CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END) AS max_slots,
      count(lp.id) FILTER (
        WHERE p.id IS NOT NULL
          AND coalesce(p.is_test, false) = false
          AND lower(coalesce(p.company_name, '')) NOT LIKE '%test%'
      )::int AS taken_slots,
      ((CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END) - count(lp.id) FILTER (
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
       ) < (CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END)
    ORDER BY l.created_at DESC
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

