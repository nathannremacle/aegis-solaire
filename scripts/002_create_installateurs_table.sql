-- Table des installateurs partenaires (panel admin Aegis Solaire)
CREATE TABLE IF NOT EXISTS public.installateurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  region TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installateurs_email ON public.installateurs(email);
CREATE INDEX IF NOT EXISTS idx_installateurs_actif ON public.installateurs(actif);

ALTER TABLE public.installateurs ENABLE ROW LEVEL SECURITY;

-- Policy: accès via service role uniquement (côté API admin)
CREATE POLICY "Service role can manage installateurs" ON public.installateurs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at (réutilise la fonction créée dans 001_create_leads_table.sql)
DROP TRIGGER IF EXISTS update_installateurs_updated_at ON public.installateurs;
CREATE TRIGGER update_installateurs_updated_at
  BEFORE UPDATE ON public.installateurs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
