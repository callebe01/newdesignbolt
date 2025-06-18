/*
  # Temporary Disable RLS Again for Application Functionality
  
  After removing the widget, we re-enabled RLS but the main application
  still needs to save transcripts. This temporarily disables RLS again
  until we can properly implement authenticated transcript saving.
  
  TODO: Implement proper authenticated transcript saving that works with RLS
*/

-- Temporarily disable RLS on transcriptions table again
ALTER TABLE transcriptions DISABLE ROW LEVEL SECURITY;

-- Update table comment to reflect current status
COMMENT ON TABLE transcriptions IS 'Stores conversation transcripts. RLS temporarily disabled for application functionality.';