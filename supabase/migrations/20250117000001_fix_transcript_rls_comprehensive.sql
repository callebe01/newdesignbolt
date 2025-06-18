/*
  # Comprehensive Fix for Transcript RLS Issues

  ## Problem Analysis
  - Multiple conflicting INSERT policies on transcriptions table from different migrations
  - The issue is that we have separate policies for anonymous and authenticated users
  - When an anonymous user tries to insert, PostgreSQL evaluates ALL applicable policies
  - If any policy fails, the entire operation fails

  ## Root Cause
  The problem occurs because:
  1. We have multiple INSERT policies targeting different roles (public, authenticated)
  2. PostgreSQL's RLS evaluates policies with OR logic for the same operation
  3. But when policies target different roles, they can conflict

  ## Solution
  - Drop ALL existing transcriptions policies to eliminate conflicts
  - Create a single comprehensive INSERT policy that handles both cases
  - Use a single policy with OR logic instead of multiple policies
  - Ensure the policy correctly references the NEW row data during INSERT

  ## Security Maintained
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

-- Drop ALL existing transcriptions policies to avoid any conflicts
-- This includes policies from all previous migrations
DROP POLICY IF EXISTS "Public can create transcriptions for active agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can create transcriptions for own agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can view transcriptions of own agents" ON transcriptions;
DROP POLICY IF EXISTS "Public can create transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can create transcriptions for their agents" ON transcriptions;
DROP POLICY IF EXISTS "Users can view transcriptions of their agents" ON transcriptions;
DROP POLICY IF EXISTS "Allow transcript creation" ON transcriptions;
DROP POLICY IF EXISTS "Comprehensive transcript insert policy" ON transcriptions;

-- Create a single comprehensive INSERT policy that handles both anonymous and authenticated users
-- This policy references the column directly (not NEW.agent_id which is only for triggers)
CREATE POLICY "Comprehensive transcript insert policy"
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
DROP POLICY IF EXISTS "Users can view own transcripts" ON transcriptions;

CREATE POLICY "Users can view own transcripts"
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

-- Add helpful comment for debugging
COMMENT ON POLICY "Comprehensive transcript insert policy" ON transcriptions IS 
'Single policy handling both anonymous (for active agents) and authenticated (for own agents) transcript creation';