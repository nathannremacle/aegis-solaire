-- ==============================================================================
-- Migration 013 : Ajout du Segment de marché (B2B vs B2C)
-- ==============================================================================

-- 1. Ajouter la colonne 'segment' à la table Leads (un lead est soit B2B, soit B2C)
ALTER TABLE public.leads
ADD COLUMN "segment" text DEFAULT 'B2B' 
CHECK (segment IN ('B2B', 'B2C'));

-- 2. Ajouter la colonne 'segment' à la table Partners 
-- (Un partenaire peut faire le segment B2B, B2C ou bien les deux)
ALTER TABLE public.partners
ADD COLUMN "segment" text DEFAULT 'B2B' 
CHECK (segment IN ('B2B', 'B2C', 'BOTH'));

-- Note: Les colonnes email de la table partners existent déjà depuis la migration 012.
