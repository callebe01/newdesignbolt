-- Add documentation_urls column to personas table
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS documentation_urls text[] DEFAULT ARRAY[]::text[];

-- Update existing personas to have empty documentation_urls array
UPDATE personas
SET documentation_urls = ARRAY[]::text[]
WHERE documentation_urls IS NULL;
