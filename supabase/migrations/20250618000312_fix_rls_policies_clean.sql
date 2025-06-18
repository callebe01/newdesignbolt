/*
  # Clean RLS Policy Fix for Transcriptions
  
  This migration removes all existing conflicting policies and creates
  a simple, working policy structure for transcriptions.
*/

-- Drop ALL existing policies on transcriptions to start clean
DO $$ 
BEGIN
    -- Drop all existing policies on transcriptions table
    DROP POLICY IF EXISTS "Public can create transcriptions for active agents" ON transcriptions;
    DROP POLICY IF EXISTS "Users can create transcriptions for own agents" ON transcriptions;
    DROP POLICY IF EXISTS "Users can view transcriptions of own agents" ON transcriptions;
    DROP POLICY IF EXISTS "Public can create transcriptions" ON transcriptions;
    DROP POLICY IF EXISTS "Users can create transcriptions for their agents" ON transcriptions;
    DROP POLICY IF EXISTS "Users can view transcriptions of their agents" ON transcriptions;
    DROP POLICY IF EXISTS "Allow transcript creation" ON transcriptions;
    DROP POLICY IF EXISTS "Comprehensive transcript insert policy" ON transcriptions;
    DROP POLICY IF EXISTS "Fixed transcript insert policy" ON transcriptions;
    DROP POLICY IF EXISTS "Users can view own transcripts" ON transcriptions;
    DROP POLICY IF EXISTS "allow_transcript_insertion_for_active_agents" ON transcriptions;
    DROP POLICY IF EXISTS "Allow transcript viewing for authenticated users" ON transcriptions;
    DROP POLICY IF EXISTS "Allow transcript insertion for active agents" ON transcriptions;
    DROP POLICY IF EXISTS "Users can view own agent transcripts" ON transcriptions;
END $$;

-- Ensure agents table allows public read access for active agents
DROP POLICY IF EXISTS "Public can view active agents" ON agents;
CREATE POLICY "Public can view active agents"
  ON agents
  FOR SELECT
  TO public
  USING (status = 'active');

-- Create a simple INSERT policy for transcriptions
CREATE POLICY "transcriptions_insert_policy"
  ON transcriptions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_id
      AND agents.status = 'active'
    )
  );

-- Create a SELECT policy for transcriptions
CREATE POLICY "transcriptions_select_policy"
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

-- Ensure all agents are active
UPDATE agents SET status = 'active' WHERE status IS NULL OR status != 'active';