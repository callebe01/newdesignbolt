/*
  # Add Share Domain Configuration

  1. Changes
    - Add share_domain column to store the custom domain for agent sharing
    - Add share_url column to store the complete sharing URL
    - Set default values for existing agents
*/

-- Add share domain configuration
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS share_domain text NOT NULL DEFAULT 'voicepilot.live',
ADD COLUMN IF NOT EXISTS share_url text GENERATED ALWAYS AS (
  'https://' || share_domain || '/agent/' || id
) STORED;

-- Update existing agents
UPDATE agents
SET share_domain = 'voicepilot.live'
WHERE share_domain IS NULL;