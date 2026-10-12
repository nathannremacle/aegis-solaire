-- Add optional newsletter_consent to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT false;
