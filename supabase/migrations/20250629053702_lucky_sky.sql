/*
  # Add can_see_page_context column to agents table

  1. Changes
    - Add `can_see_page_context` column to `agents` table
    - Set default value to `false` for existing records
    - Column allows agents to see page contents and provide contextual guidance

  2. Security
    - No RLS changes needed as this is just adding a column to existing table
*/

-- Add the can_see_page_context column to the agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS can_see_page_context BOOLEAN DEFAULT false;

-- Update the column comment for documentation
COMMENT ON COLUMN agents.can_see_page_context IS 'Whether the agent can see page contents, buttons, and navigation elements to provide contextual guidance';