/*
  # Secure Transcriptions Table - Widget Removed
  
  Since the embedded widget is no longer needed, we can implement
  proper security on the transcriptions table with full RLS protection.
  
  This migration:
  1. Re-enables RLS on transcriptions table
  2. Creates secure policies for authenticated users only
  3. Removes public access (no longer needed for widget)
  4. Maintains proper security for all transcript operations
*/

-- Re-enable RLS on transcriptions table
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'transcriptions'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON transcriptions';
    END LOOP;
END $$;

-- Create secure INSERT policy - authenticated users only for their own agents
CREATE POLICY "authenticated_users_insert_own_agent_transcripts"
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

-- Create secure SELECT policy - authenticated users only for their own agents
CREATE POLICY "authenticated_users_select_own_agent_transcripts"
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

-- Create secure UPDATE policy - authenticated users only for their own agents
CREATE POLICY "authenticated_users_update_own_agent_transcripts"
  ON transcriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- Create secure DELETE policy - authenticated users only for their own agents
CREATE POLICY "authenticated_users_delete_own_agent_transcripts"
  ON transcriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- Update table comment to reflect new security status
COMMENT ON TABLE transcriptions IS 'Fully secured with RLS - authenticated users can only access transcripts for their own agents. Widget functionality removed.';

-- Remove the security reminder function since it's no longer needed
DROP FUNCTION IF EXISTS remind_transcript_security();

-- Log this security improvement
INSERT INTO public.schema_migrations_log (migration_name, applied_at, description)
VALUES (
  '20250618000319_secure_transcripts_no_widget',
  NOW(),
  'Implemented full RLS security on transcriptions table. Widget removed, so public access no longer needed. All transcript operations now require authentication and user ownership verification.'
)
ON CONFLICT DO NOTHING;