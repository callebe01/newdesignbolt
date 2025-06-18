/*
  # Temporary RLS Disable Test
  
  This migration temporarily disables RLS to test if the issue is with the policies
  or with RLS itself. This is for debugging purposes only.
*/

-- Temporarily disable RLS on transcriptions table
ALTER TABLE transcriptions DISABLE ROW LEVEL SECURITY;

-- Add a comment to track this change
COMMENT ON TABLE transcriptions IS 'RLS temporarily disabled for debugging - 2025-06-18';