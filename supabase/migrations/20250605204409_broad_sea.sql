-- Add documentation_urls column to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS documentation_urls text[] DEFAULT ARRAY[]::text[];

-- Update existing agents to have empty documentation_urls array
UPDATE agents
SET documentation_urls = ARRAY[]::text[]
WHERE documentation_urls IS NULL;