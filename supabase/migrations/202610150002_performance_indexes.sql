-- Fichier : supabase/migrations/202610150002_performance_indexes.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Colonne générée pour recherche plein texte / partielle instantanée sur 1 seul index GIN
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

CREATE INDEX IF NOT EXISTS idx_leads_search_text_trgm
  ON public.leads USING gin (search_text gin_trgm_ops);

-- 2. Index composites pour la pagination et le filtrage de /admin/leads
CREATE INDEX IF NOT EXISTS idx_leads_created_at_desc
  ON public.leads (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_leads_admin_filters
  ON public.leads (segment, province, marketplace_status, status, created_at DESC);

-- 3. Index partiel haute vitesse pour le Feed Marketplace (/api/partners/marketplace)
CREATE INDEX IF NOT EXISTS idx_leads_marketplace_available
  ON public.leads (segment, province, created_at DESC)
  INCLUDE (id, credit_cost, surface_area, annual_electricity_bill, lead_score, surface_type, project_timeline)
  WHERE marketplace_status = 'available';

-- 4. Index partiel pour la file d'attente de validation humaine (Action Required Tray)
CREATE INDEX IF NOT EXISTS idx_leads_pending_review_queue
  ON public.leads (created_at DESC)
  WHERE marketplace_status = 'pending_review' OR status = 'NEEDS_HUMAN_REVIEW';

-- 5. Index partiel pour le calcul des commissions Media Partners
CREATE INDEX IF NOT EXISTS idx_leads_media_partner_code
  ON public.leads (media_partner_code, segment, marketplace_status, created_at DESC)
  WHERE media_partner_code IS NOT NULL;

-- 6. Index et contrainte d'unicité sur lead_purchases (anti-doublon d'achat + jointures rapides)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_purchases_unique_buyer
  ON public.lead_purchases (lead_id, partner_id);

CREATE INDEX IF NOT EXISTS idx_lead_purchases_partner_pipeline
  ON public.lead_purchases (partner_id, pipeline_status, purchased_at DESC);

-- 7. Index partiels sur credit_orders, lead_disputes, installer_applications et partners
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
