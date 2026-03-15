-- Objectif principal du prospect (Écran 1 : déclencheur / intention)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS objective TEXT;

COMMENT ON COLUMN public.leads.objective IS 'Objectif principal : conformite, reduction_facture, rse, revenu (Loi APER, autoconsommation, RSE, location toiture)';
