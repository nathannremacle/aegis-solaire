-- Migration : Table de stockage des modèles d'e-mails d'invitation réseau personnalisés par ton
-- Permet à Fabrice Remacle et aux administrateurs de conserver leurs personnalisations (Tutoiement, Vouvoiement, WhatsApp)

CREATE TABLE IF NOT EXISTS public.admin_invite_templates (
  tone text PRIMARY KEY,
  subject text NOT NULL,
  body text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- RLS Sécurisé
ALTER TABLE public.admin_invite_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on invite templates"
ON public.admin_invite_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
