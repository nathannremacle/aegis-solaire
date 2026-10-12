-- Migration 020 : Gouvernance et revue de qualité des leads marketplace
--
-- 1. Modifie la valeur par défaut de marketplace_status sur la table leads :
--    'pending_review' par défaut au lieu de 'available'.
-- 2. Isole définitivement les leads issus du webinaire ('rejected') pour qu'ils ne soient jamais vendables.
-- 3. Ajoute une documentation claire sur le cycle de vie d'un lead.

-- 1. Met à jour la contrainte CHECK pour accepter tous les statuts valides
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_marketplace_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_marketplace_status_check CHECK (
    marketplace_status IN ('pending_review', 'available', 'sold_out', 'rejected')
  );

-- 2. Met à jour la valeur par défaut pour toute nouvelle insertion de lead
ALTER TABLE public.leads 
  ALTER COLUMN marketplace_status SET DEFAULT 'pending_review';

-- Met à jour les leads existants du webinaire pour les exclure de la marketplace
UPDATE public.leads
SET marketplace_status = 'rejected'
WHERE source = 'Webinaire_Zero_CAPEX'
   OR source ILIKE '%webinaire%';

-- Commentaire descriptif sur la colonne
COMMENT ON COLUMN public.leads.marketplace_status IS 
  'Statut marketplace : pending_review (par défaut, en attente de revue admin), available (validé pour la vente), sold (quota d''achat atteint), rejected (spam, hors cible ou lead webinaire exclus de la revente).';
