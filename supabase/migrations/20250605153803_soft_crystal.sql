/*
  # Add new analysis fields

  1. Changes
    - Add new columns to analysis_results table for enhanced metrics
    - Update existing rows with default values
*/

ALTER TABLE analysis_results
ADD COLUMN IF NOT EXISTS resolution_rate jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_intent jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS workflow_patterns text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS repetitive_questions text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS feature_requests text[] DEFAULT ARRAY[]::text[];

-- Update existing rows to have default values
UPDATE analysis_results
SET 
  resolution_rate = '{}'::jsonb,
  engagement_score = 0,
  user_intent = '{}'::jsonb,
  workflow_patterns = ARRAY[]::text[],
  repetitive_questions = ARRAY[]::text[],
  feature_requests = ARRAY[]::text[]
WHERE resolution_rate IS NULL;