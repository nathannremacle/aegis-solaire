-- Réponse libre du formulaire simulateur (non utilisée dans le calcul ROI, transmise aux installateurs à terme)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS message TEXT;

COMMENT ON COLUMN public.leads.message IS 'Message ou précisions libres du prospect, transmis aux installateurs partenaires.';
