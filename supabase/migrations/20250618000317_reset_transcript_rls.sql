/*
  # Reset Transcript RLS Completely
  
  This migration completely resets RLS on transcriptions table
  and creates the minimal necessary policies.
*/

-- Disable RLS temporarily
ALTER TABLE transcriptions DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on transcriptions
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

-- Re-enable RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Create a simple INSERT policy that allows all public access
CREATE POLICY "public_insert_transcripts"
  ON transcriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create a SELECT policy for authenticated users only
CREATE POLICY "authenticated_select_own_transcripts"
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

-- Log this change
INSERT INTO public.schema_migrations_log (migration_name, applied_at, description)
VALUES (
  '20250618000317_reset_transcript_rls',
  NOW(),
  'Completely reset transcript RLS policies with minimal necessary restrictions'
)
ON CONFLICT DO NOTHING;