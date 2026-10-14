-- ==============================================================================
-- Migration 024 : Modèle de Données Canonique des Leads & Standardisation
-- ==============================================================================
-- 
-- Objectifs :
-- 1. Standardiser les colonnes de qualification communes B2B & B2C (tronc commun).
-- 2. Ajouter la localisation précise (code postal 4 chiffres, commune, adresse physique pour vue satellite).
-- 3. Ajouter la qualification toiture (matériau, amiante, etc.) et propriété (owner vs tenant).
-- 4. Ajouter la colonne extensible 'qualification_metadata' (JSONB) pour les spécificités sans migration.
-- 5. Tracker la source précise du lead ('source_form').
-- 6. Rétrocompatibilité totale avec les colonnes historiques (surface_area, annual_electricity_bill).

-- 1. Tronc commun de qualification et de matching
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_form TEXT DEFAULT 'b2b_simulator',
  ADD COLUMN IF NOT EXISTS ownership_status TEXT,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(4),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS site_address TEXT,
  ADD COLUMN IF NOT EXISTS roof_material TEXT,
  ADD COLUMN IF NOT EXISTS surface_area_m2 INTEGER,
  ADD COLUMN IF NOT EXISTS annual_bill_eur INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_power_kwc NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS project_driver TEXT,
  ADD COLUMN IF NOT EXISTS timeframe TEXT,
  ADD COLUMN IF NOT EXISTS qualification_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Contraintes de validation sur les nouvelles valeurs énumérées
DO $$
BEGIN
  -- Contrainte sur le statut de propriété
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_ownership_status_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_ownership_status_check CHECK (
        ownership_status IS NULL OR ownership_status IN (
          'owner',                 -- Propriétaire occupant
          'tenant_authorized',     -- Locataire avec accord préalable
          'tenant_unauthorized',   -- Locataire sans accord (bloqué/warning)
          'co_ownership'           -- Copropriété / ACP
        )
      );
  END IF;

  -- Contrainte sur le matériau de couverture
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_roof_material_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_roof_material_check CHECK (
        roof_material IS NULL OR roof_material IN (
          'tuiles',               -- Tuiles en terre cuite ou béton
          'ardoises',             -- Ardoises naturelles ou synthétiques
          'plat_epdm',            -- Toit plat (EPDM / Bitume / Roofing)
          'bac_acier',            -- Bac acier / Panneaux sandwich
          'zinc_autre',           -- Zinc à joint debout ou autre métallique
          'fibrociment_amiante'   -- Fibrociment / Amiante (deal-breaker sans rénovation)
        )
      );
  END IF;

  -- Contrainte sur le format du code postal belge (4 chiffres)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_postal_code_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_postal_code_check CHECK (
        postal_code IS NULL OR postal_code ~ '^[0-9]{4}$'
      );
  END IF;

  -- Contrainte sur la source du formulaire
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_source_form_check') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_source_form_check CHECK (
        source_form IS NULL OR source_form IN (
          'b2b_simulator',        -- Page d'accueil /
          'b2c_simulator',        -- /particuliers
          'b2c_devis_landing',    -- /devis-panneaux-solaires
          'webinar_upsell',       -- /webinaire
          'manual_admin',         -- Ajout manuel admin
          'api_partner'           -- Import webhook partenaire
        )
      );
  END IF;
END$$;

-- 3. Synchronisation et rétro-remplissage des colonnes canoniques
UPDATE public.leads
SET 
  surface_area_m2 = COALESCE(surface_area_m2, surface_area),
  annual_bill_eur = COALESCE(annual_bill_eur, annual_electricity_bill)
WHERE surface_area_m2 IS NULL OR annual_bill_eur IS NULL;

-- 4. Indexation optimisée pour les filtres du Live Feed et la recherche géographique
CREATE INDEX IF NOT EXISTS idx_leads_postal_code ON public.leads(postal_code);
CREATE INDEX IF NOT EXISTS idx_leads_source_form ON public.leads(source_form);
CREATE INDEX IF NOT EXISTS idx_leads_roof_material ON public.leads(roof_material);
CREATE INDEX IF NOT EXISTS idx_leads_ownership_status ON public.leads(ownership_status);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_metadata ON public.leads USING GIN (qualification_metadata);

-- 5. Commentaires explicatifs sur le dictionnaire de données
COMMENT ON COLUMN public.leads.source_form IS 'Formulaire précis ayant capté le lead pour analyse de conversion CPL.';
COMMENT ON COLUMN public.leads.ownership_status IS 'Statut juridique d occupation du bien (owner, tenant_authorized, tenant_unauthorized, co_ownership).';
COMMENT ON COLUMN public.leads.postal_code IS 'Code postal belge à 4 chiffres (ex: 4000, 7000, 1410). Permet le matching d alertes installateurs.';
COMMENT ON COLUMN public.leads.city IS 'Commune ou localité d installation.';
COMMENT ON COLUMN public.leads.site_address IS 'Adresse physique complète (rue et numéro) pour audit satellitaire Google Maps.';
COMMENT ON COLUMN public.leads.roof_material IS 'Revêtement principal de la toiture (détecteur immédiat d amiante ou de fixations spécifiques).';
COMMENT ON COLUMN public.leads.surface_area_m2 IS 'Surface exploitable normalisée en m2 (entier strictement comparable).';
COMMENT ON COLUMN public.leads.annual_bill_eur IS 'Facture électrique annuelle normalisée en EUR TTC ou HT.';
COMMENT ON COLUMN public.leads.estimated_power_kwc IS 'Puissance crête calculée par l algorithme de dimensionnement.';
COMMENT ON COLUMN public.leads.project_driver IS 'Déclencheur d achat B2B (reduire_facture, peb_permis, flotte_irve, tiers_invest).';
COMMENT ON COLUMN public.leads.timeframe IS 'Horizon de réalisation du projet (immediat_3mois, 3_6mois, plus_6mois, simple_renseignement).';
COMMENT ON COLUMN public.leads.qualification_metadata IS 'Champs secondaires libres au format JSONB (batterie, borne VE, orientation, taille ménage, etc.).';
