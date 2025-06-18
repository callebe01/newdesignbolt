/*
  # Allow All Transcript Insertion
  
  This migration creates a permissive policy for transcript insertion
  to ensure the widget functionality works properly.
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "allow_public_transcript_insert" ON transcriptions;

-- Create a permissive INSERT policy for transcriptions
-- Allows anyone to insert transcripts (needed for widget functionality)
CREATE POLICY "allow_all_transcript_insert"
  ON transcriptions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Log this change
INSERT INTO public.schema_migrations_log (migration_name, applied_at, description)
VALUES (
  '20250618000316_allow_all_transcript_insert',
  NOW(),
  'Created permissive transcript insert policy to ensure widget functionality'
)
ON CONFLICT DO NOTHING;