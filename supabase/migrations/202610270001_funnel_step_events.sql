-- Migration 202610270001 : Création de la table de télémétrie anonyme d'entonnoir (funnel_step_events)
-- Conforme RGPD / APD : Ne stocke AUCUNE PII (ni nom, ni email, ni adresse IP, ni numéro de téléphone).
-- Utilisé pour la mesure des abandons par étape du formulaire et l'attribution créative par utm_content.

CREATE TABLE IF NOT EXISTS public.funnel_step_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  step_number SMALLINT NOT NULL CHECK (step_number >= 1 AND step_number <= 6),
  step_name TEXT,
  province TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_content TEXT, -- Nom du créatif Meta (ex: Ad1-Batterie, Ad2-Rescert, Ad3-Ecart1850)
  utm_term TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index pour requêter rapidement les abandons par créatif publicitaire (règles KILL / SCALE)
CREATE INDEX IF NOT EXISTS idx_funnel_step_events_utm_content_step 
  ON public.funnel_step_events (utm_content, step_number);

CREATE INDEX IF NOT EXISTS idx_funnel_step_events_session_step 
  ON public.funnel_step_events (session_id, step_number);

CREATE INDEX IF NOT EXISTS idx_funnel_step_events_created_at 
  ON public.funnel_step_events (created_at DESC);

-- Activation du Row Level Security
ALTER TABLE public.funnel_step_events ENABLE ROW LEVEL SECURITY;

-- Politique de sécurité : Seul le service role (API interne) dispose des droits d'insertion et de lecture
CREATE POLICY "Allow service_role full access on funnel_step_events"
  ON public.funnel_step_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.funnel_step_events IS 'Télémétrie anonyme des étapes du simulateur pour attribution créative sans cookies tiers.';
COMMENT ON COLUMN public.funnel_step_events.session_id IS 'Identifiant anonyme de session généré aléatoirement côté client (sans empreinte digitale).';
COMMENT ON COLUMN public.funnel_step_events.step_number IS 'Numéro de l étape franchie (1 à 6).';
COMMENT ON COLUMN public.funnel_step_events.utm_content IS 'Paramètre utm_content correspondant à la variante créative Meta Ads {{ad.name}}.';
