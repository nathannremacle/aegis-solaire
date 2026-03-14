-- Create leads table for Aegis Solaire
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT,
  
  -- Site Qualification
  surface_type TEXT NOT NULL CHECK (surface_type IN ('toiture', 'parking', 'friche')),
  surface_area INTEGER NOT NULL,
  
  -- Consumption Data
  annual_electricity_bill INTEGER NOT NULL,
  
  -- ROI Results (calculated)
  estimated_roi_years NUMERIC(4,1),
  autoconsumption_rate INTEGER,
  estimated_savings INTEGER,
  
  -- RGPD Compliance
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMPTZ,
  data_retention_until TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'simulator',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  
  -- CRM Integration
  crm_synced BOOLEAN DEFAULT false,
  crm_id TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy for service role only (leads are sensitive data)
CREATE POLICY "Service role can manage leads" ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
