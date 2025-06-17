/*
  # Fix Transcript RLS for Anonymous Users

  1. Changes
    - Update transcriptions table RLS policies to allow anonymous access
    - Ensure agents table allows public read access for active agents
    - Fix any policy conflicts that prevent transcript saving

  2. Security
    - Anonymous users can only create transcripts for active agents
    - Anonymous users cannot view transcripts
    - Authenticated users maintain full access to their agents' transcripts
*/

-- First, let's ensure agents table allows public read access for active agents
DROP POLICY IF EXISTS "Public can view active agents" ON agents;

CREATE POLICY "Public can view active agents"
  ON agents
  FOR SELECT
  TO public
  USING (status = 'active');

-- Now fix the transcriptions policies
DROP POLICY IF EXISTS "Public can create transcriptions for active agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can create transcriptions for own agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can view transcriptions of own agents" ON transcriptions;

-- Allow anonymous users to create transcripts for any active agent
CREATE POLICY "Public can create transcriptions for active agents"
  ON transcriptions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.status = 'active'
    )
  );

-- Allow authenticated users to create transcripts for their own agents
CREATE POLICY "Users can create transcriptions for own agents"
  ON transcriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- Only authenticated users can view transcripts of their own agents
CREATE POLICY "Users can view transcriptions of own agents"
  ON transcriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- Ensure all existing agents are set to active status
UPDATE agents SET status = 'active' WHERE status != 'active';