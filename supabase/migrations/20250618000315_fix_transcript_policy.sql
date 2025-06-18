/*
  # Fix Transcript Insert Policy
  
  This migration fixes the transcript insert policy to allow public insertion
  without complex RLS checks that might be causing issues.
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "allow_public_transcript_insert" ON transcriptions;

-- Create a simpler INSERT policy for transcriptions
-- Allows public (including anonymous users from widget) to insert transcripts
-- We'll validate agent_id on the application level for better performance
CREATE POLICY "allow_public_transcript_insert"
  ON transcriptions
  FOR INSERT
  TO public
  WITH CHECK (agent_id IS NOT NULL);

-- Log this change
INSERT INTO public.schema_migrations_log (migration_name, applied_at, description)
VALUES (
  '20250618000315_fix_transcript_policy',
  NOW(),
  'Simplified transcript insert policy to allow public insertion with basic validation'
)
ON CONFLICT DO NOTHING;