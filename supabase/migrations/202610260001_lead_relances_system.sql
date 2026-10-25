-- ==============================================================================
-- MIGRATION 202610260001 : SYSTÈME INTELLIGENT DE NOTIFICATIONS & RELANCES LEADS
-- Aegis Solaire — Dispatch en cascades (Vague 1 -> Vague 2 -> Vague 3)
-- ==============================================================================

-- 1. Ajout des colonnes de suivi des relances sur la table leads si absentes
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS relance_wave int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_relance_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_slots int DEFAULT 3;

-- Mettre à jour max_slots selon le segment (1 en B2B exclusif, 3 en B2C partagé)
UPDATE public.leads
   SET max_slots = CASE WHEN segment = 'B2B' THEN 1 ELSE 3 END
 WHERE max_slots IS NULL OR max_slots = 3;

-- 2. Création de la table de journalisation des envois et relances
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

-- Index pour performances et requêtes fréquentes du cron et de l'admin
CREATE INDEX IF NOT EXISTS idx_relance_lead_id ON public.lead_relance_dispatches(lead_id);
CREATE INDEX IF NOT EXISTS idx_relance_partner_id ON public.lead_relance_dispatches(partner_id);
CREATE INDEX IF NOT EXISTS idx_relance_sent_at ON public.lead_relance_dispatches(sent_at);
CREATE INDEX IF NOT EXISTS idx_leads_relance_status ON public.leads(marketplace_status, relance_wave, last_relance_at);

-- 3. Sécurité Row Level Security (RLS)
ALTER TABLE public.lead_relance_dispatches ENABLE ROW LEVEL SECURITY;

-- Seul le service_role (backend Next.js sécurisé) a accès en lecture/écriture
DROP POLICY IF EXISTS "Service role can manage lead_relance_dispatches" ON public.lead_relance_dispatches;
CREATE POLICY "Service role can manage lead_relance_dispatches" ON public.lead_relance_dispatches
  TO service_role
  USING (true)
  WITH CHECK (true);
