/*
  # Fix Transcript RLS for Anonymous Users - Final Fix

  1. Problem
    - Multiple conflicting INSERT policies on transcriptions table
    - Anonymous users cannot save transcripts due to RLS violations

  2. Solution
    - Drop all existing conflicting policies
    - Create a single comprehensive INSERT policy that allows both:
      a) Anonymous users to create transcripts for any active agent
      b) Authenticated users to create transcripts for their own agents
    - Maintain separate SELECT policy for authenticated users only

  3. Security
    - Anonymous users can only INSERT transcripts for active agents
    - Anonymous users cannot SELECT/view any transcripts
    - Authenticated users can INSERT transcripts for their own agents
    - Authenticated users can SELECT transcripts for their own agents
*/

-- First, ensure agents table allows public read access for active agents
DROP POLICY IF EXISTS "Public can view active agents" ON agents;

CREATE POLICY "Public can view active agents"
  ON agents
  FOR SELECT
  TO public
  USING (status = 'active');

-- Drop ALL existing transcriptions policies to avoid conflicts
DROP POLICY IF EXISTS "Public can create transcriptions for active agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can create transcriptions for own agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can view transcriptions of own agents" ON transcriptions;
DROP POLICY IF EXISTS "Public can create transcriptions" ON transcriptions;

-- Create a single comprehensive INSERT policy that handles both cases
CREATE POLICY "Allow transcript creation"
  ON transcriptions
  FOR INSERT
  TO public
  WITH CHECK (
    -- Case 1: Anonymous users can create transcripts for any active agent
    (auth.role() = 'anon' AND EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_id
      AND agents.status = 'active'
    ))
    OR
    -- Case 2: Authenticated users can create transcripts for their own agents
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_id
      AND agents.user_id = auth.uid()
    ))
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
UPDATE agents SET status = 'active' WHERE status IS NULL OR status != 'active';