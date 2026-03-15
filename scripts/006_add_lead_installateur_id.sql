-- Phase 2 : assignation d'un lead à un installateur partenaire
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS installateur_id UUID REFERENCES public.installateurs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_installateur_id ON public.leads(installateur_id);

COMMENT ON COLUMN public.leads.installateur_id IS 'Installateur partenaire assigné (Phase 2)';
