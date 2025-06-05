/*
  # Fix Analysis Results RLS Policies

  1. Changes
    - Drop existing RLS policies for analysis_results table
    - Create new RLS policies with proper authentication checks
    - Ensure policies handle both read and write operations correctly

  2. Security
    - Enable RLS on analysis_results table
    - Add policies for authenticated users to:
      - Create analysis results for their own transcriptions
      - View analysis results they created
*/

-- First ensure RLS is enabled
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can create analysis results for own transcriptions" ON analysis_results;
DROP POLICY IF EXISTS "Users can view analysis results of own transcriptions" ON analysis_results;

-- Create new policies with proper authentication checks
CREATE POLICY "Users can create analysis results for own transcriptions"
ON analysis_results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transcriptions
    JOIN agents ON agents.id = transcriptions.agent_id
    WHERE transcriptions.id = ANY (analysis_results.transcription_ids)
    AND agents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view analysis results of own transcriptions"
ON analysis_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transcriptions
    JOIN agents ON agents.id = transcriptions.agent_id
    WHERE transcriptions.id = ANY (analysis_results.transcription_ids)
    AND agents.user_id = auth.uid()
  )
);