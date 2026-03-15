-- Add project_timeline to leads (délai du projet : urgent, 3_6_months, 6_plus_months)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_timeline TEXT;

COMMENT ON COLUMN public.leads.project_timeline IS 'Délai projet: urgent, 3_6_months, 6_plus_months';
