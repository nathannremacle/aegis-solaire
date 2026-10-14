-- Migration 025: Add is_test column to partners table and flag test accounts
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- Flag existing test/dev partner accounts
UPDATE public.partners 
SET is_test = true 
WHERE LOWER(company_name) LIKE '%test%' 
   OR LOWER(company_name) LIKE '%dev%'
   OR email LIKE '%test%'
   OR email LIKE '%example%';
