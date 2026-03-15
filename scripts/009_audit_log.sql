-- Logs d'audit : qui a fait quoi (panel admin)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_email ON public.audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage audit_log" ON public.audit_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.audit_log IS 'Traçabilité des actions admin (assignation, export, nettoyage RGPD, etc.).';
