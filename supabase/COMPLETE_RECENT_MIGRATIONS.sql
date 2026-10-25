-- ==============================================================================
-- AEGIS SOLAIRE — MIGRATION GLOBALE CONSOLIDÉE (OCTOBRE 2026)
-- À exécuter dans : https://supabase.com/dashboard/project/fvvdfhbqojtnnqsrthwl/sql/new
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SYSTÈME DE RELANCES EN CASCADES & DISPATCH INTELLIGENT
-- ------------------------------------------------------------------------------

-- Ajout des colonnes de gestion des relances sur la table leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS relance_wave int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_relance_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_slots int DEFAULT 3;

-- Mettre à jour max_slots selon le segment (1 en B2B exclusif, 3 en B2C partagé)
UPDATE public.leads
   SET max_slots = CASE WHEN segment = 'B2B' THEN 1 ELSE 3 END
 WHERE max_slots IS NULL OR max_slots = 3;

-- Table de journalisation des envois et relances automatiques
CREATE TABLE IF NOT EXISTS public.lead_relance_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  wave_number int NOT NULL CHECK (wave_number BETWEEN 1 AND 5),
  email_to text NOT NULL,
  email_subject text NOT NULL,
  matching_score int DEFAULT 0,
  matching_tier text DEFAULT 'tier_1',
  credits_at_send int DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_lead_partner_wave UNIQUE (lead_id, partner_id, wave_number)
);

-- Index pour performances cron & requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_relance_lead_id ON public.lead_relance_dispatches(lead_id);
CREATE INDEX IF NOT EXISTS idx_relance_partner_id ON public.lead_relance_dispatches(partner_id);
CREATE INDEX IF NOT EXISTS idx_relance_sent_at ON public.lead_relance_dispatches(sent_at);
CREATE INDEX IF NOT EXISTS idx_leads_relance_status ON public.leads(marketplace_status, relance_wave, last_relance_at);

-- RLS Sécurisé
ALTER TABLE public.lead_relance_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage lead_relance_dispatches" ON public.lead_relance_dispatches;
CREATE POLICY "Service role can manage lead_relance_dispatches" ON public.lead_relance_dispatches
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 2. ENRICHISSEMENT DU FLUX MARKETPLACE & RPC DASHBOARD INITIALIZATION
-- ------------------------------------------------------------------------------

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
      l.message
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


-- ------------------------------------------------------------------------------
-- 3. TABLE DES TEMPLATES D'INVITATION RÉSEAU PAR TON (FABRICE REMACLE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_invite_templates (
  tone text PRIMARY KEY,
  subject text NOT NULL,
  body text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_invite_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on invite templates" ON public.admin_invite_templates;
CREATE POLICY "Service role full access on invite templates"
  ON public.admin_invite_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed initial des modèles par défaut s'ils n'existent pas encore
INSERT INTO public.admin_invite_templates (tone, subject, body)
VALUES
  ('tutoiement', 'Des chantiers solaires qualifiés sur ta région via Fabrice', 'Salut {{prenom}},

C''est Fabrice Remacle. Comme tu le sais, je côtoie au quotidien les professionnels du photovoltaïque en Wallonie.

Avec mon équipe, nous avons lancé Aegis Solaire : une plateforme qui qualifie en amont des chantiers photovoltaïques pour les confier aux meilleurs installateurs de notre réseau.

J''aimerais beaucoup te compter parmi nos partenaires privilégiés sur ta zone.

J''ai activé pour toi un lien direct vers ton espace pro avec 1 crédit offert pour tester ton premier chantier sans engagement :
{{lien_inscription}}

Prends le temps d''y jeter un œil et dis-moi ce que tu en penses.

Bien à toi,
Fabrice Remacle'),
  ('vouvoiement', 'Opportunité chantiers photovoltaïques qualifiés — Fabrice Remacle', 'Bonjour {{prenom}},

Je me permets de vous contacter personnellement suite à nos échanges réguliers dans le secteur photovoltaïque en Wallonie.

Avec mon équipe, nous avons mis en place Aegis Solaire, une plateforme d''ingénierie et d''audit solaire qui sélectionne et qualifie rigoureusement les porteurs de projets résidentiels et tertiaires dans votre province.

Connaissant la qualité de vos réalisations, nous souhaiterions vous proposer un accès prioritaire aux demandes de devis sur votre zone.

Vous pouvez accéder à votre espace partenaire et découvrir vos premiers projets via ce lien d''accès personnalisé :
{{lien_inscription}}

Je reste à votre entière disposition pour tout renseignement.

Bien cordialement,
Fabrice Remacle'),
  ('court_whatsapp', 'Accès partenaire Aegis Solaire', 'Salut {{prenom}}, c''est Fabrice Remacle. On a lancé Aegis Solaire pour vous transmettre directement des chantiers solaires ultra-qualifiés sur ta province (Wallonie). Je t''ai ouvert un accès direct avec 1 chantier offert pour tester : {{lien_inscription}} Dis-moi quand tu as pu regarder !')
ON CONFLICT (tone) DO NOTHING;
