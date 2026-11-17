-- ============================================================================
-- Migration : 202611170001_accounting_and_invoicing_engine.sql
-- Titre     : Moteur comptable interne, facturation séquentielle B2B & TVA BE
-- Entité    : INIT42 (BCE / TVA BE 1039.899.980) — Aegis Solaire
-- ============================================================================

-- 1. Enrichissement légal B2B de la table public.partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS bce_number text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS billing_street text,
  ADD COLUMN IF NOT EXISTS billing_postal_code text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'BE',
  ADD COLUMN IF NOT EXISTS peppol_participant_id text;

CREATE INDEX IF NOT EXISTS idx_partners_bce_number
  ON public.partners (bce_number)
  WHERE bce_number IS NOT NULL;

-- 2. Table public.invoices (Factures séquentielles FA-YYYY-XXXX & Notes de crédit NC-YYYY-XXXX)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  invoice_type text NOT NULL DEFAULT 'invoice' CHECK (invoice_type IN ('invoice', 'credit_note')),
  fiscal_year int NOT NULL,
  sequence_number int NOT NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  credit_order_id uuid REFERENCES public.credit_orders(id) ON DELETE SET NULL,
  lead_purchase_id uuid REFERENCES public.lead_purchases(id) ON DELETE SET NULL,
  client_company_name text NOT NULL,
  client_vat_number text,
  client_bce_number text,
  client_street text,
  client_postal_code text,
  client_city text,
  client_country text DEFAULT 'BE',
  client_email text,
  line_description text NOT NULL,
  credits_amount int DEFAULT 0,
  amount_htva numeric(10,2) NOT NULL,
  vat_rate numeric(5,2) NOT NULL DEFAULT 21.00,
  amount_vat numeric(10,2) NOT NULL,
  amount_ttc numeric(10,2) NOT NULL,
  processor_fee_eur numeric(10,2) DEFAULT 0,
  payment_method text,
  payment_reference text,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('issued', 'paid', 'credited', 'cancelled')),
  peppol_status text NOT NULL DEFAULT 'ready_ubl' CHECK (peppol_status IN ('ready_ubl', 'sent', 'manual_uploaded', 'not_applicable')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoices_type_year_seq UNIQUE (invoice_type, fiscal_year, sequence_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_credit_order
  ON public.invoices (credit_order_id)
  WHERE credit_order_id IS NOT NULL AND invoice_type = 'invoice';

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_lead_purchase
  ON public.invoices (lead_purchase_id)
  WHERE lead_purchase_id IS NOT NULL AND invoice_type = 'invoice';

CREATE INDEX IF NOT EXISTS idx_invoices_issued_at
  ON public.invoices (issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_partner_id
  ON public.invoices (partner_id);

-- 3. Fonction atomique de numérotation séquentielle sans rupture (Code TVA belge)
CREATE OR REPLACE FUNCTION public.next_invoice_number(
  p_type text DEFAULT 'invoice',
  p_year int DEFAULT EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/Brussels'))::int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := CASE WHEN p_type = 'credit_note' THEN 'credit_note' ELSE 'invoice' END;
  v_prefix text := CASE WHEN v_type = 'credit_note' THEN 'NC' ELSE 'FA' END;
  v_year int := COALESCE(p_year, EXTRACT(YEAR FROM (now() AT TIME ZONE 'Europe/Brussels'))::int);
  v_next_seq int;
  v_number text;
BEGIN
  -- Verrou consultatif transactionnel unique par (type, année) pour garantir 0 doublon & 0 trou
  PERFORM pg_advisory_xact_lock(
    hashtext('aegis_invoice_seq_' || v_type || '_' || v_year::text)
  );

  SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO v_next_seq
    FROM public.invoices
   WHERE invoice_type = v_type
     AND fiscal_year = v_year;

  v_number := v_prefix || '-' || v_year::text || '-' || lpad(v_next_seq::text, 4, '0');

  RETURN jsonb_build_object(
    'invoice_number', v_number,
    'sequence_number', v_next_seq,
    'fiscal_year', v_year,
    'invoice_type', v_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(text, int) TO service_role;

-- 4. Table public.accounting_expenses (Journal des Achats, Autoliquidation & Frais Déductibles)
CREATE TABLE IF NOT EXISTS public.accounting_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_name text NOT NULL,
  supplier_country text NOT NULL DEFAULT 'BE',
  supplier_vat_number text,
  category text NOT NULL,
  description text NOT NULL,
  nace_code text DEFAULT '62100',
  amount_htva numeric(10,2) NOT NULL,
  vat_paid_be numeric(10,2) NOT NULL DEFAULT 0,
  vat_deductible_pct numeric(5,2) NOT NULL DEFAULT 100,
  tax_deductible_pct numeric(5,2) NOT NULL DEFAULT 100,
  is_reverse_charge boolean NOT NULL DEFAULT false,
  is_investment boolean NOT NULL DEFAULT false,
  invoice_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_expenses_date
  ON public.accounting_expenses (expense_date DESC);

-- 5. Table public.accounting_checklist_state (Parcours & rappels fiscaux persistants)
CREATE TABLE IF NOT EXISTS public.accounting_checklist_state (
  period_key text NOT NULL,
  task_id text NOT NULL,
  completed_at timestamptz,
  notes text,
  PRIMARY KEY (period_key, task_id)
);

-- 6. Sécurisation RLS stricte (service_role uniquement)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_checklist_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage invoices" ON public.invoices;
CREATE POLICY "Service role can manage invoices" ON public.invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage accounting_expenses" ON public.accounting_expenses;
CREATE POLICY "Service role can manage accounting_expenses" ON public.accounting_expenses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage accounting_checklist_state" ON public.accounting_checklist_state;
CREATE POLICY "Service role can manage accounting_checklist_state" ON public.accounting_checklist_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
