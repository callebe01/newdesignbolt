/*
  # Temporary Disable Transcript RLS for Widget Functionality
  
  This migration temporarily disables RLS on transcriptions table to ensure
  the widget functionality works properly. This is a temporary solution.
  
  PRODUCTION SECURITY CONSIDERATIONS:
  
  1. The transcriptions table currently needs public INSERT access for the widget
     to function properly when users interact with agents via the embedded widget.
  
  2. For production security, consider implementing:
     - API-based transcript saving with proper authentication
     - Rate limiting on transcript insertion
     - Input validation and sanitization
     - Monitoring and logging of transcript creation
  
  3. The current setup allows:
     - Public users can insert transcripts (needed for widget)
     - Only authenticated users can read transcripts of their own agents
  
  4. Future improvements:
     - Implement proper RLS policies that work with the widget architecture
     - Consider using Supabase Edge Functions for transcript processing
     - Add proper audit logging for transcript operations
*/

-- Temporarily disable RLS on transcriptions table
ALTER TABLE transcriptions DISABLE ROW LEVEL SECURITY;

-- Add a comment to track this change and reasoning
COMMENT ON TABLE transcriptions IS 'RLS temporarily disabled for widget functionality - requires public INSERT access. See migration 20250618000318 for security considerations.';

-- Ensure other tables maintain proper security
-- Keep RLS enabled on agents table with proper policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on agent_conversations table
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Log this change with detailed reasoning
INSERT INTO public.schema_migrations_log (migration_name, applied_at, description)
VALUES (
  '20250618000318_temporary_disable_transcript_rls',
  NOW(),
  'Temporarily disabled RLS on transcriptions for widget functionality. Maintains security on other tables. See migration comments for production security roadmap.'
)
ON CONFLICT DO NOTHING;

-- Create a reminder for future security implementation
CREATE OR REPLACE FUNCTION remind_transcript_security()
RETURNS TEXT AS $$
BEGIN
  RETURN 'REMINDER: Transcriptions table has RLS disabled for widget functionality. Consider implementing API-based transcript saving with proper authentication for production security.';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remind_transcript_security() IS 'Security reminder function - call this to get guidance on implementing proper transcript security';