-- Migration 011 : simulateur Wallonie B2B
--
-- 1) surface_type : contrainte CHECK incluant la valeur 'terrain' (avec NULL pour leads partiels / webinaire).
-- 2) province, grd, company_vat : qualification géographique et TVA belge.
-- 3) project_details : précisions libres sur le projet (textarea « Précisions sur votre projet »).
--
-- Types : TEXT (équivalent pratique à VARCHAR sans limite fixe ; cohérent avec le reste du schéma leads).

-- ---------------------------------------------------------------------------
-- 1) Surface : autoriser 'terrain' (conserve toiture, parking, friche)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_surface_type_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_surface_type_check CHECK (
    surface_type IS NULL OR surface_type IN ('toiture', 'parking', 'friche', 'terrain')
  );

-- ---------------------------------------------------------------------------
-- 2) Colonnes Wallonie + texte libre projet
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS grd TEXT,
  ADD COLUMN IF NOT EXISTS company_vat TEXT,
  ADD COLUMN IF NOT EXISTS project_details TEXT;

COMMENT ON COLUMN public.leads.province IS 'Province wallonne du projet (liege, hainaut, namur, brabant_wallon, luxembourg).';
COMMENT ON COLUMN public.leads.grd IS 'Gestionnaire de réseau (ores, resa, aieg, rew, unknown).';
COMMENT ON COLUMN public.leads.company_vat IS 'Numéro TVA belge (BE + 10 chiffres).';
COMMENT ON COLUMN public.leads.project_details IS 'Précisions libres sur le projet (simulateur, optionnel).';

-- ---------------------------------------------------------------------------
-- 3) Rétrocompatibilité : anciennes lignes avec seulement public.leads.message
-- ---------------------------------------------------------------------------
UPDATE public.leads
SET project_details = message
WHERE project_details IS NULL
  AND message IS NOT NULL
  AND TRIM(message) <> '';
