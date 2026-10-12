-- Adding admin_notes to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT '';

-- Add a comment for documentation
COMMENT ON COLUMN leads.admin_notes IS 'Internal notes for the admin regarding this lead, such as call summaries.';
