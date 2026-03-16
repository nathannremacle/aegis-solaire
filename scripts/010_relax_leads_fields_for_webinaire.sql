-- Permettre des leads "partiels" (ex: webinaire) sans valeurs fake.
-- Objectif : stocker NULL si l'info n'est pas demandée, plutôt que des valeurs par défaut (0000000000, 500 m², 5000 €).

-- 1) Colonnes à rendre optionnelles
ALTER TABLE public.leads
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN surface_type DROP NOT NULL,
  ALTER COLUMN surface_area DROP NOT NULL,
  ALTER COLUMN annual_electricity_bill DROP NOT NULL;

-- 2) Adapter la contrainte CHECK sur surface_type (autoriser NULL)
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_surface_type_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_surface_type_check CHECK (
    surface_type IS NULL OR surface_type IN ('toiture', 'parking', 'friche')
  );

