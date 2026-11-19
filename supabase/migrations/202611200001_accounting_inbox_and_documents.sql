-- ============================================================================
-- Migration : 202611200001_accounting_inbox_and_documents.sql
-- Titre     : Boîte de réception factures IA, archivage PDF, brouillons à valider
-- Entité    : INIT42 (BCE / TVA BE 1039.899.980) — Aegis Solaire
-- ============================================================================

-- 1. Enrichissement de public.accounting_expenses (archivage PDF, devises & mode paiement)
ALTER TABLE public.accounting_expenses
  ADD COLUMN IF NOT EXISTS document_storage_path text,
  ADD COLUMN IF NOT EXISTS document_filename text,
  ADD COLUMN IF NOT EXISTS document_mime_type text,
  ADD COLUMN IF NOT EXISTS document_sha256 text,
  ADD COLUMN IF NOT EXISTS original_currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS original_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(10,6),
  ADD COLUMN IF NOT EXISTS payment_source text NOT NULL DEFAULT 'pro_account',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_accounting_expenses_payment_source'
  ) THEN
    ALTER TABLE public.accounting_expenses
      ADD CONSTRAINT chk_accounting_expenses_payment_source
      CHECK (payment_source IN ('pro_account', 'personal_card', 'mollie_balance', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_accounting_expenses_source'
  ) THEN
    ALTER TABLE public.accounting_expenses
      ADD CONSTRAINT chk_accounting_expenses_source
      CHECK (source IN ('manual', 'drag_drop', 'email_inbound', 'mollie_api'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounting_expenses_sha256
  ON public.accounting_expenses (document_sha256)
  WHERE document_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_expenses_invoice_ref
  ON public.accounting_expenses (invoice_ref)
  WHERE invoice_ref IS NOT NULL;

-- 2. Table public.accounting_expense_drafts (file de vérification avant journal des achats)
CREATE TABLE IF NOT EXISTS public.accounting_expense_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  source text NOT NULL DEFAULT 'drag_drop' CHECK (source IN ('drag_drop', 'email_inbound', 'mollie_api')),
  document_storage_path text,
  document_filename text,
  document_mime_type text,
  document_sha256 text,
  document_size_bytes int,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_name text NOT NULL DEFAULT 'Fournisseur à vérifier',
  supplier_country text NOT NULL DEFAULT 'BE' CHECK (supplier_country IN ('BE', 'EU', 'NON_EU')),
  supplier_vat_number text,
  category text NOT NULL DEFAULT 'saas_cloud_non_eu',
  description text NOT NULL DEFAULT '',
  nace_code text NOT NULL DEFAULT '62100',
  original_currency text NOT NULL DEFAULT 'EUR',
  original_amount_htva numeric(10,2) NOT NULL DEFAULT 0,
  original_vat_amount numeric(10,2) NOT NULL DEFAULT 0,
  original_amount_ttc numeric(10,2) NOT NULL DEFAULT 0,
  exchange_rate numeric(10,6) NOT NULL DEFAULT 1.000000,
  exchange_rate_source text,
  amount_htva numeric(10,2) NOT NULL DEFAULT 0,
  vat_paid_be numeric(10,2) NOT NULL DEFAULT 0,
  vat_deductible_pct numeric(5,2) NOT NULL DEFAULT 100,
  tax_deductible_pct numeric(5,2) NOT NULL DEFAULT 100,
  is_reverse_charge boolean NOT NULL DEFAULT false,
  is_investment boolean NOT NULL DEFAULT false,
  invoice_ref text,
  payment_source text NOT NULL DEFAULT 'pro_account' CHECK (payment_source IN ('pro_account', 'personal_card', 'mollie_balance', 'other')),
  is_valid_tax_invoice boolean NOT NULL DEFAULT true,
  client_vat_present boolean NOT NULL DEFAULT true,
  ai_confidence numeric(3,2) DEFAULT 0.90,
  ai_model text,
  ai_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_raw_extraction jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  approved_expense_id uuid REFERENCES public.accounting_expenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_expense_drafts_status_created
  ON public.accounting_expense_drafts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_expense_drafts_sha256
  ON public.accounting_expense_drafts (document_sha256)
  WHERE document_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_expense_drafts_invoice_ref
  ON public.accounting_expense_drafts (invoice_ref)
  WHERE invoice_ref IS NOT NULL;

ALTER TABLE public.accounting_expense_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage accounting_expense_drafts" ON public.accounting_expense_drafts;
CREATE POLICY "Service role can manage accounting_expense_drafts"
  ON public.accounting_expense_drafts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Bucket privé Supabase Storage pour archivage légal des pièces justificatives (7-10 ans)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'accounting-documents',
  'accounting-documents',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
