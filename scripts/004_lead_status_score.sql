-- Statuts de qualification (scoring) et colonne score pour les leads
-- NEEDS_HUMAN_REVIEW : score < 40, à vérifier avant envoi installateur
-- HOT_LEAD : score > 70, lead chaud

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS lead_score SMALLINT;

COMMENT ON COLUMN public.leads.lead_score IS 'Score de qualification 0-100 (algorithme prédictif).';

ALTER TABLE public.leads
DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
ADD CONSTRAINT leads_status_check CHECK (status IN (
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost',
  'NEEDS_HUMAN_REVIEW',
  'HOT_LEAD'
));
