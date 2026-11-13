-- Migration 202611130001 : Télémétrie comportementale des installateurs (clics leads, temps d'étude actif, signaux d'achat)
-- Conforme aux bonnes pratiques Postgres (index partiels & composites, RLS service_role).

CREATE TABLE IF NOT EXISTS public.partner_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_email TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_ref TEXT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'session_start',
      'email_deep_link',
      'lead_inspect_open',
      'lead_inspect_duration',
      'roof_photo_zoom',
      'unlock_intent',
      'credit_modal_open',
      'marketplace_filter',
      'crm_tab_open'
    )
  ),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  source TEXT NOT NULL DEFAULT 'marketplace',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_partner_activity_partner_created
  ON public.partner_activity_events (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_activity_lead_created
  ON public.partner_activity_events (lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_activity_event_created
  ON public.partner_activity_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_activity_created_at
  ON public.partner_activity_events (created_at DESC);

ALTER TABLE public.partner_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on partner_activity_events" ON public.partner_activity_events;
CREATE POLICY "Service role full access on partner_activity_events"
  ON public.partner_activity_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.partner_activity_events IS 'Télémétrie comportementale des installateurs sur le portail partenaire (clics, temps d inspection actif, intentions d achat).';
COMMENT ON COLUMN public.partner_activity_events.duration_ms IS 'Durée active d inspection du dossier en millisecondes (hors onglet inactif).';
COMMENT ON COLUMN public.partner_activity_events.source IS 'Origine de l action (marketplace_drawer, email_focus, table_row, card_cta, dashboard).';
