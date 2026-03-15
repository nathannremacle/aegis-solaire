-- Option IRVE (bornes de recharge) : upsell Loi LOM
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS wants_irve BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leads.wants_irve IS 'Lead souhaite coupler le projet avec installation de bornes de recharge (IRVE).';
