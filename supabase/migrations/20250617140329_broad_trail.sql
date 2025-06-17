/*
  # Fix Transcript RLS Policies for Anonymous Users

  1. Changes
    - Update transcriptions table RLS policies to allow public access
    - Allow anonymous users to create transcripts for active agents
    - Maintain existing authenticated user policies for viewing

  2. Security
    - Public users can only create transcripts for active agents
    - Public users cannot view transcripts (only create them)
    - Authenticated users maintain full access to their agents' transcripts
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can create transcriptions for own agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can view transcriptions of own agents" ON transcriptions;
DROP POLICY IF EXISTS "Public can create transcriptions for active agents" ON transcriptions;

-- Create new policy that allows public access for creation
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

-- Authenticated users can still create transcriptions for their own agents
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

-- Only authenticated users can view transcriptions of their own agents
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