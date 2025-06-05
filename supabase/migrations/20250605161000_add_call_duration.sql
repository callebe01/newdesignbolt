/*
  # Add Call Duration to Agents

  1. Changes
    - Add `call_duration` column to agents table
    - Set default value to 300
    - Update existing agents
*/

-- Add call_duration column to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS call_duration integer NOT NULL DEFAULT 300;

-- Update existing agents to have call_duration set to 300
UPDATE agents
SET call_duration = 300
WHERE call_duration IS NULL;
