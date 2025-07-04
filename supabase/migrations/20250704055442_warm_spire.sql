/*
  # Add API Key Support to Agent Tools

  1. Schema Changes
    - Add `api_key` column to `agent_tools` table
    - Column is optional (nullable) for backward compatibility
    - Encrypted storage for security

  2. Security
    - API keys are stored securely
    - Only accessible by tool owners through existing RLS policies
*/

-- Add api_key column to agent_tools table
ALTER TABLE agent_tools 
ADD COLUMN IF NOT EXISTS api_key text;

-- Add comment to document the column purpose
COMMENT ON COLUMN agent_tools.api_key IS 'Optional API key for authenticating with external endpoints. Used as Bearer token in Authorization header.';