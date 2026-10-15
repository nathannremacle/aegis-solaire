-- ==============================================================================
-- SCRIPT DE MIGRATION GLOBAL SUPABASE - OPTIMISATIONS PERF & DASHBOARDS
-- AUTO-RÉPARATEUR & CLÉ EN MAIN
-- À COPIER / COLLER DIRECTEMENT DANS LE SQL EDITOR DE SUPABASE ET CLIQUER SUR "RUN"
-- ==============================================================================

-- ==============================================================================
-- SECTION 0 : PRÉ-REQUIS & COLONNES MANQUANTES (AUTO-RÉPARATION DU SCHÉMA)
-- ==============================================================================

-- 1. Table partners : ajout sécurisé de la colonne is_test et métadonnées
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS target_provinces TEXT[] DEFAULT ARRAY['liege', 'namur', 'hainaut', 'brabant_wallon', 'luxembourg'];

ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'both';

-- Flag automatique des comptes de test existants
UPDATE public.partners 
SET is_test = true 
WHERE LOWER(company_name) LIKE '%test%' 
   OR LOWER(company_name) LIKE '%dev%'
   OR email LIKE '%test%'
   OR email LIKE '%example%';

-- 2. Table lead_purchases : suivi commercial CRM Pipeline
ALTER TABLE public.lead_purchases
ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'to_contact',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Table credit_orders (commandes de packs par virement SEPA)
CREATE TABLE IF NOT EXISTS public.credit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_htva NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2) NOT NULL,
  price_ttc NUMERIC(10,2) NOT NULL,
  transfer_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  notes TEXT
);

-- 4. Table lead_disputes (réclamations sous garantie 24h ouvrées)
CREATE TABLE IF NOT EXISTS public.lead_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.lead_purchases(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  credits_refunded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 5. Table media_partner_applications (candidatures d'apporteurs d'affaires)
CREATE TABLE IF NOT EXISTS public.media_partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  website_url TEXT,
  experience_description TEXT NOT NULL,
  expected_leads_per_month INTEGER NOT NULL CHECK (expected_leads_per_month >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- SECTION 1 : EXTENSIONS, RECHERCHE PLEIN TEXTE & INDEXATION HAUTE PERFORMANCE
-- ==============================================================================

-- 1. Extension Trigramme pour recherche textuelle instantanée
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Colonne générée combinant les informations clés de recherche (avec lower et coalesce)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (
  lower(
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(company_vat, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(postal_code, '')
  )
) STORED;

-- 3. Index GIN Trigramme ultra-rapide sur la colonne de recherche
CREATE INDEX IF NOT EXISTS idx_leads_search_text_trgm
  ON public.leads USING gin (search_text gin_trgm_ops);

-- 4. Index composites pour l'affichage chronologique et les filtres de /admin/leads
CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc
  ON public.leads (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_leads_admin_filters
  ON public.leads (segment, province, marketplace_status, status, created_at DESC);

-- 5. Index partiel pour le Feed Marketplace (/api/partners/marketplace)
CREATE INDEX IF NOT EXISTS idx_leads_marketplace_available
  ON public.leads (segment, province, created_at DESC)
  INCLUDE (id, credit_cost, surface_area, annual_electricity_bill, lead_score, surface_type, project_timeline)
  WHERE marketplace_status = 'available';

-- 6. Index partiel pour la file d'attente de validation humaine (Action Required Tray)
CREATE INDEX IF NOT EXISTS idx_leads_pending_review_queue
  ON public.leads (created_at DESC)
  WHERE marketplace_status = 'pending_review' OR status = 'NEEDS_HUMAN_REVIEW';

-- 7. Index partiel pour le calcul rapide des commissions Media Partners
CREATE INDEX IF NOT EXISTS idx_leads_media_partner_code
  ON public.leads (media_partner_code, segment, marketplace_status, created_at DESC)
  WHERE media_partner_code IS NOT NULL;

-- 8. Nettoyage préventif d'éventuels doublons d'achats de test avant création de l'index unique
DELETE FROM public.lead_purchases a
USING public.lead_purchases b
WHERE a.id < b.id
  AND a.lead_id = b.lead_id
  AND a.partner_id = b.partner_id;

-- 9. Index unique d'intégrité anti-doublon d'achat par partenaire sur un même lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_purchases_unique_buyer
  ON public.lead_purchases (lead_id, partner_id);

CREATE INDEX IF NOT EXISTS idx_lead_purchases_partner_pipeline
  ON public.lead_purchases (partner_id, pipeline_status, purchased_at DESC);

-- 10. Index partiels sur les files d'attente opérationnelles
CREATE INDEX IF NOT EXISTS idx_credit_orders_pending
  ON public.credit_orders (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_credit_orders_partner_history
  ON public.credit_orders (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_disputes_pending
  ON public.lead_disputes (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_installer_applications_pending
  ON public.installer_applications (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_partners_real_only
  ON public.partners (id, segment)
  WHERE coalesce(is_test, false) = false;


-- ==============================================================================
-- SECTION 2 : PROCÉDURE STOCKÉE ADMIN DASHBOARD (RÉDUCTION 23 REQUÊTES -> 1 RPC)
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
  -- 1. Agrégation en une seule lecture (Single-Pass Scan) sur la table leads
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
  -- 2. Partenaires réels uniquement (exclusion stricte de is_test = true)
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
  -- 3. Achats de leads (uniquement par des partenaires non-test) & Sell-Through Rate
  purchases_agg AS (
    SELECT
      count(lp.id)::int AS total_purchases,
      coalesce(sum(lp.credits_spent), 0)::int AS total_credits_spent,
      count(DISTINCT lp.lead_id)::int AS distinct_purchased_leads
    FROM public.lead_purchases lp
    INNER JOIN real_partners rp ON rp.id = lp.partner_id
  ),
  -- 4. Commandes de crédits (HTVA / TTC / En attente de validation SEPA)
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
  -- 5. Commissions Media Partners calculées directement par jointure SQL
  media_commissions_agg AS (
    SELECT
      mp.id,
      mp.company_name,
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
    WHERE mp.active = true
    GROUP BY mp.id, mp.company_name, mp.tracking_code
  ),
  -- 6. Compteurs pour la Sidebar Admin & Action Required Tray
  pending_counts AS (
    SELECT
      (SELECT count(*)::int FROM public.installer_applications WHERE status = 'pending') AS pending_installer_apps,
      (SELECT count(*)::int FROM public.media_partner_applications WHERE status = 'pending') AS pending_media_apps,
      (SELECT count(*)::int FROM public.lead_disputes WHERE status = 'pending') AS pending_disputes_count
  ),
  -- 7. Listes d'actions immédiates (Top 10 leads à valider, Top 10 commandes SEPA en attente, Top 5 litiges 24h)
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
      SELECT id, admin_email, action, entity_type, entity_id, payload, created_at
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

-- Procédure d'incrémentation atomique de crédits compatible avec actions.ts
CREATE OR REPLACE FUNCTION public.increment_partner_credits(
  p_partner_id uuid,
  p_amount integer,
  p_reference text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_credits integer;
BEGIN
  UPDATE public.partners
     SET credits = credits + p_amount
   WHERE id = p_partner_id
   RETURNING credits INTO v_new_credits;

  INSERT INTO public.credit_transactions (partner_id, amount, type, reference, created_at)
  VALUES (p_partner_id, p_amount, 'topup', p_reference, now());

  RETURN v_new_credits;
END;
$$;


-- ==============================================================================
-- SECTION 3 : PROCÉDURES MARKETPLACE & PARTENAIRES (ANTI-RACE CONDITION)
-- ==============================================================================

-- 1. Achat atomique de lead avec verrouillage pessimiste FOR UPDATE (1 B2B / 3 B2C)
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
  -- Verrouillage exclusif déterministe pour éviter les deadlocks
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

  -- Débiter le solde du partenaire
  UPDATE public.partners
     SET credits = credits - v_lead.credit_cost
   WHERE id = p_partner_id;

  -- Créer l'achat dans lead_purchases
  INSERT INTO public.lead_purchases (
    lead_id, partner_id, purchased_at, credits_spent, pipeline_status
  ) VALUES (
    p_lead_id, p_partner_id, now(), v_lead.credit_cost, 'to_contact'
  ) RETURNING id INTO v_purchase_id;

  -- Journaliser dans credit_transactions
  INSERT INTO public.credit_transactions (
    partner_id, amount, type, reference, created_at
  ) VALUES (
    p_partner_id, -v_lead.credit_cost, 'purchase', 'LEAD:' || p_lead_id::text, now()
  );

  -- Mettre à jour le statut du lead si le dernier créneau vient d'être vendu
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

-- 2. Initialisation unifiée du Dashboard Partenaire (1 seule requête pour feed + CRM)
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
  -- Feed Marketplace anonymisé avec créneaux exacts (1 B2B / 3 B2C)
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
  -- Portefeuille CRM complet des leads achetés par ce partenaire
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


-- ==============================================================================
-- SECTION 4 : PERMISSIONS DE SÉCURITÉ (SERVICE_ROLE / ADMIN ONLY)
-- ==============================================================================

REVOKE ALL ON FUNCTION public.get_admin_dashboard_kpis() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_kpis() TO service_role;

REVOKE ALL ON FUNCTION public.increment_partner_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_partner_credits(uuid, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.purchase_marketplace_lead(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_marketplace_lead(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_partner_dashboard_init(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_init(uuid) TO service_role;
