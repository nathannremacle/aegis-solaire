-- =============================================================================
-- MIGRATION 202611180006 :
-- 1. Autoriser le motif 'duplicate' sur public.lead_disputes
-- 2. Corriger refund_lead_dispute() : marketplace_status='rejected' (conforme à
--    leads_marketplace_status_check) + retrait auto sur 'unreachable' ou >=2 litiges
-- 3. Exposer phone_verified / email_verified / contact_preference dans
--    get_partner_dashboard_init() pour affichage transparent sur le portail
-- =============================================================================

BEGIN;

-- 1. Étendre les motifs admissibles de réclamation
ALTER TABLE public.lead_disputes
  DROP CONSTRAINT IF EXISTS lead_disputes_reason_check;

ALTER TABLE public.lead_disputes
  ADD CONSTRAINT lead_disputes_reason_check
  CHECK (reason = ANY (ARRAY[
    'unreachable'::text,
    'wrong_number'::text,
    'out_of_scope'::text,
    'already_equipped'::text,
    'duplicate'::text,
    'other'::text
  ]));

-- 2. Corriger refund_lead_dispute (utilisation de 'rejected' au lieu de 'archived' + règles automatiques)
CREATE OR REPLACE FUNCTION public.refund_lead_dispute(
  p_dispute_id uuid,
  p_admin_email text,
  p_admin_notes text DEFAULT NULL,
  p_refund_credits integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute record;
  v_purchase record;
  v_credits_to_refund integer;
  v_new_balance integer;
  v_other_approved_count integer;
BEGIN
  -- 1. Verrouiller la réclamation
  SELECT * INTO v_dispute
    FROM public.lead_disputes
   WHERE id = p_dispute_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISPUTE_NOT_FOUND: Réclamation introuvable.';
  END IF;

  IF v_dispute.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_resolved', true,
      'status', v_dispute.status,
      'message', 'Cette réclamation a déjà été traitée.'
    );
  END IF;

  -- 2. Récupérer l'achat pour obtenir le coût réellement débité
  SELECT * INTO v_purchase
    FROM public.lead_purchases
   WHERE id = v_dispute.purchase_id;

  v_credits_to_refund := COALESCE(p_refund_credits, v_purchase.credits_spent, 0);

  -- 3. Si crédits > 0, recréditer le partenaire atomiquement
  IF v_credits_to_refund > 0 THEN
    UPDATE public.partners
       SET credits = credits + v_credits_to_refund,
           updated_at = now()
     WHERE id = v_dispute.partner_id
     RETURNING credits INTO v_new_balance;

    INSERT INTO public.credit_transactions (
      partner_id, amount, type, reference, created_at
    ) VALUES (
      v_dispute.partner_id,
      v_credits_to_refund,
      'refund',
      'Garantie Lead Conforme - Réclamation #' || substr(p_dispute_id::text, 1, 8),
      now()
    );
  ELSE
    SELECT credits INTO v_new_balance FROM public.partners WHERE id = v_dispute.partner_id;
  END IF;

  -- 4. Mettre à jour le statut du lead sur la Marketplace (statuts conformes à leads_marketplace_status_check)
  SELECT count(*)::int INTO v_other_approved_count
    FROM public.lead_disputes
   WHERE lead_id = v_dispute.lead_id
     AND status = 'approved'
     AND id <> p_dispute_id;

  IF v_dispute.reason IN ('wrong_number', 'already_equipped', 'unreachable')
     OR v_other_approved_count >= 1 THEN
    UPDATE public.leads
       SET marketplace_status = 'rejected',
           status = 'lost'
     WHERE id = v_dispute.lead_id;
  ELSIF v_dispute.reason = 'out_of_scope' THEN
    UPDATE public.leads
       SET marketplace_status = 'available'
     WHERE id = v_dispute.lead_id
       AND marketplace_status = 'sold_out';
  END IF;

  -- 5. Clôturer la réclamation
  UPDATE public.lead_disputes
     SET status = 'approved',
         credits_refunded = v_credits_to_refund,
         admin_notes = COALESCE(p_admin_notes, admin_notes),
         resolved_at = now()
   WHERE id = p_dispute_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_resolved', false,
    'credits_refunded', v_credits_to_refund,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refund_lead_dispute(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_lead_dispute(uuid, text, text, integer) TO service_role;

-- 3. Mettre à jour get_partner_dashboard_init avec les colonnes de certification et préférence de contact
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
      l.contact_preference,
      l.phone_verified,
      l.phone_verification_method,
      l.phone_carrier,
      l.phone_line_type,
      l.email_verified,
      l.email_delivery_status,
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
      l.contact_preference,
      l.phone_verified,
      l.phone_verification_method,
      l.phone_carrier,
      l.phone_line_type,
      l.email_verified,
      l.email_delivery_status,
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
