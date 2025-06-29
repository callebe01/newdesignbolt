/*
  # Add missing columns to analysis_results table

  1. New Columns
    - `conversation_outcomes` (jsonb) - stores conversation outcome analysis data
    - `common_exit_points` (jsonb) - stores exit point analysis data

  2. Changes
    - Add conversation_outcomes column with default empty object
    - Add common_exit_points column with default empty object
    - Both columns are nullable to maintain compatibility
*/

-- Add conversation_outcomes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_results' AND column_name = 'conversation_outcomes'
  ) THEN
    ALTER TABLE analysis_results ADD COLUMN conversation_outcomes jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add common_exit_points column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_results' AND column_name = 'common_exit_points'
  ) THEN
    ALTER TABLE analysis_results ADD COLUMN common_exit_points jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;