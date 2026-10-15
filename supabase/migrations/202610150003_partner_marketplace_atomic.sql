-- Fichier : supabase/migrations/202610150003_partner_marketplace_atomic.sql

-- 1. Transaction atomique d'achat de lead avec verrouillage pessimiste FOR UPDATE
CREATE OR REPLACE FUNCTION public.purchase_marketplace_lead(
  p_lead_id uuid,
  p_partner_id uuid
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
  v_purchase_id uuid;
BEGIN
  -- Verrouillage exclusif du lead et du partenaire dans l'ordre déterministe pour éviter tout deadlock
  SELECT id, segment, marketplace_status, credit_cost
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

  SELECT id, credits
    INTO v_partner
    FROM public.partners
   WHERE id = p_partner_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARTNER_NOT_FOUND: Profil partenaire introuvable.';
  END IF;

  -- Vérifier si le partenaire a déjà acheté ce lead
  IF EXISTS (
    SELECT 1 FROM public.lead_purchases
    WHERE lead_id = p_lead_id AND partner_id = p_partner_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_PURCHASED: Vous avez déjà acquis ce lead.';
  END IF;

  -- Règle métier Aegis Solaire : 1 seul installateur en B2B, max 3 en B2C
  v_max_slots := CASE WHEN v_lead.segment = 'B2B' THEN 1 ELSE 3 END;

  SELECT count(*)::int INTO v_taken_slots
    FROM public.lead_purchases
   WHERE lead_id = p_lead_id;

  IF v_taken_slots >= v_max_slots THEN
    UPDATE public.leads SET marketplace_status = 'sold_out' WHERE id = p_lead_id;
    RAISE EXCEPTION 'SLOTS_FULL: Tous les créneaux pour ce lead viennent d''être attribués.';
  END IF;

  -- Vérification du solde de crédits
  IF v_partner.credits < v_lead.credit_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Solde insuffisant (% crédits requis, % disponibles).',
      v_lead.credit_cost, v_partner.credits;
  END IF;

  -- 1. Débiter le solde du partenaire
  UPDATE public.partners
     SET credits = credits - v_lead.credit_cost
   WHERE id = p_partner_id;

  -- 2. Créer l'achat dans lead_purchases
  INSERT INTO public.lead_purchases (
    lead_id, partner_id, purchased_at, credits_spent, pipeline_status
  ) VALUES (
    p_lead_id, p_partner_id, now(), v_lead.credit_cost, 'to_contact'
  ) RETURNING id INTO v_purchase_id;

  -- 3. Journaliser dans credit_transactions
  INSERT INTO public.credit_transactions (
    partner_id, amount, type, reference, created_at
  ) VALUES (
    p_partner_id, -v_lead.credit_cost, 'purchase', 'LEAD:' || p_lead_id::text, now()
  );

  -- 4. Mettre à jour le statut du lead si le dernier créneau vient d'être vendu
  IF (v_taken_slots + 1) >= v_max_slots THEN
    UPDATE public.leads
       SET marketplace_status = 'sold_out'
     WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'remaining_credits', v_partner.credits - v_lead.credit_cost,
    'slots_remaining', v_max_slots - (v_taken_slots + 1)
  );
END;
$$;

-- 2. RPC d'initialisation unifiée du Dashboard Partenaire
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
  -- Feed Marketplace anonymisé avec calcul exact des créneaux (1 B2B / 3 B2C)
  marketplace_feed AS (
    SELECT
      l.id,
      l.created_at,
      l.segment,
      l.province,
      substring(coalesce(l.postal_code, ''), 1, 2) || 'XX' AS masked_postal_code,
      l.surface_type,
      l.surface_area,
      l.annual_electricity_bill,
      l.grd,
      l.project_timeline,
      l.estimated_roi_years,
      l.estimated_savings,
      l.autoconsumption_rate,
      l.credit_cost,
      l.lead_score,
      l.wants_irve,
      l.roof_material,
      l.ownership_status,
      (CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END) AS max_slots,
      count(lp.id)::int AS taken_slots,
      ((CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END) - count(lp.id)::int) AS remaining_slots,
      bool_or(lp.partner_id = p_partner_id) AS already_purchased
    FROM public.leads l
    LEFT JOIN public.lead_purchases lp ON lp.lead_id = l.id
    WHERE l.marketplace_status = 'available'
    GROUP BY l.id
    HAVING bool_or(lp.partner_id = p_partner_id) IS NOT TRUE
       AND count(lp.id) < (CASE WHEN l.segment = 'B2B' THEN 1 ELSE 3 END)
    ORDER BY l.created_at DESC
    LIMIT 60
  ),
  -- Portefeuille CRM complet des leads achetés par ce partenaire (avec coordonnées déverrouillées)
  my_purchased_leads AS (
    SELECT
      lp.id AS purchase_id,
      lp.purchased_at,
      lp.credits_spent,
      lp.pipeline_status,
      lp.notes,
      lp.next_action_at,
      l.id AS lead_id,
      l.first_name,
      l.last_name,
      l.email,
      l.phone,
      l.company,
      l.company_vat,
      l.job_title,
      l.segment,
      l.province,
      l.postal_code,
      l.surface_type,
      l.surface_area,
      l.annual_electricity_bill,
      l.grd,
      l.project_timeline,
      l.estimated_roi_years,
      l.estimated_savings,
      l.lead_score,
      d.id AS dispute_id,
      d.status AS dispute_status,
      d.reason AS dispute_reason
    FROM public.lead_purchases lp
    INNER JOIN public.leads l ON l.id = lp.lead_id
    LEFT JOIN public.lead_disputes d ON d.purchase_id = lp.id
    WHERE lp.partner_id = p_partner_id
    ORDER BY lp.purchased_at DESC
  )
  SELECT jsonb_build_object(
    'partner', (SELECT row_to_json(partner_info) FROM partner_info),
    'marketplace', (SELECT coalesce(jsonb_agg(row_to_json(marketplace_feed)), '[]'::jsonb) FROM marketplace_feed),
    'portfolio', (SELECT coalesce(jsonb_agg(row_to_json(my_purchased_leads)), '[]'::jsonb) FROM my_purchased_leads)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_marketplace_lead(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_marketplace_lead(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_partner_dashboard_init(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_init(uuid) TO service_role;
