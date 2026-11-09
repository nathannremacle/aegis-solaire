-- Migration 202611090001 : Support des brouillons onBlur et mise en concurrence Aegis Solaire
-- Conforme RGPD / APD et architecture CRO

-- 1. Ajout des colonnes sur public.leads si absentes
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_preference TEXT NOT NULL DEFAULT 'written_first' 
    CHECK (contact_preference IN ('written_first', 'direct_call')),
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS matched_province TEXT;

-- 2. Contrainte unique sur session_id pour permettre l'UPSERT propre entre brouillon onBlur et soumission finale
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_session_id_unique;
ALTER TABLE public.leads ADD CONSTRAINT leads_session_id_unique UNIQUE (session_id);

-- 3. Mise à jour des contraintes de statuts pour autoriser les brouillons (draft_email_only & draft)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status = ANY (ARRAY['draft_email_only'::text, 'new'::text, 'contacted'::text, 'qualified'::text, 'converted'::text, 'lost'::text, 'NEEDS_HUMAN_REVIEW'::text, 'HOT_LEAD'::text]));

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_marketplace_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_marketplace_status_check 
  CHECK (marketplace_status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'available'::text, 'sold_out'::text, 'rejected'::text]));

-- 4. Rendre phone et job_title nullables pour enregistrer proprement les brouillons onBlur sans fausse valeur
ALTER TABLE public.leads ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN job_title DROP NOT NULL;

-- 5. Documentation des colonnes
COMMENT ON COLUMN public.leads.contact_preference IS 'Préférence du client : written_first (E-mail / SMS d abord) ou direct_call (Appels 9h-18h).';
COMMENT ON COLUMN public.leads.session_id IS 'Identifiant unique de session du tunnel pour UPSERT entre brouillon onBlur et soumission finale.';
COMMENT ON COLUMN public.leads.matched_province IS 'Province wallonne identifiée lors de la mise en concurrence (Liège, Namur, etc.).';
