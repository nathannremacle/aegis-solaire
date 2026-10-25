-- ==============================================================================
-- MIGRATION 202610220001 : SÉCURISATION RLS CRITIQUE & FIX RPC get_admin_dashboard_kpis
-- ==============================================================================

-- 1. Table leads : Réservée au service_role (le backend Next.js)
DROP POLICY IF EXISTS "Service role can manage leads" ON public.leads;
CREATE POLICY "Service role can manage leads" ON public.leads
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Table audit_log : Réservée au service_role
DROP POLICY IF EXISTS "Service role can manage audit_log" ON public.audit_log;
CREATE POLICY "Service role can manage audit_log" ON public.audit_log
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Table installateurs : Réservée au service_role
DROP POLICY IF EXISTS "Service role can manage installateurs" ON public.installateurs;
CREATE POLICY "Service role can manage installateurs" ON public.installateurs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Procédure stockée get_admin_dashboard_kpis() corrigée
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
    SELECT id, company_name, email, phone, credits, segment, target_provinces, created_at
    FROM public.partners
    WHERE coalesce(is_test, false) = false
  ),
  partners_agg AS (
    SELECT
      count(*)::int AS active_partners_count,
      coalesce(sum(credits), 0)::int AS total_partner_credits_balance,
      count(*) FILTER (WHERE segment = 'B2B' OR segment = 'both')::int AS b2b_partners_count,
      count(*) FILTER (WHERE segment = 'B2C' OR segment = 'both')::int AS b2c_partners_count
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
      'audit_logs', (SELECT items FROM recent_audit_logs)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
