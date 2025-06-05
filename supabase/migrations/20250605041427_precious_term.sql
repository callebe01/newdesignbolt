/*
  # Add Screen Sharing Support for Agents

  1. Changes
    - Add `can_see_screenshare` column to agents table
    - Set default value to false
    - Make column non-nullable
    - Add to existing agents
*/

-- Add can_see_screenshare column to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS can_see_screenshare boolean NOT NULL DEFAULT false;

-- Update existing agents to have can_see_screenshare set to false
UPDATE agents 
SET can_see_screenshare = false 
WHERE can_see_screenshare IS NULL;