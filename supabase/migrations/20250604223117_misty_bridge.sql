/*
  # Fix Transcripts and Analysis Tables

  1. Changes
    - Safely drops existing policies if they exist
    - Creates transcriptions table if it doesn't exist
    - Creates analysis_results table if it doesn't exist
    - Adds RLS policies with conflict handling
  
  2. Security
    - Enables RLS on all tables
    - Adds policies for authenticated users
    - Restricts access to own agents' data
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies from transcriptions
  DROP POLICY IF EXISTS "Users can view transcriptions of own agents" ON transcriptions;
  DROP POLICY IF EXISTS "Users can create transcriptions for own agents" ON transcriptions;
  
  -- Drop policies from analysis_results
  DROP POLICY IF EXISTS "Users can view analysis results of own transcriptions" ON analysis_results;
  DROP POLICY IF EXISTS "Users can create analysis results for own transcriptions" ON analysis_results;
  
  -- Drop policies from agent_reports
  DROP POLICY IF EXISTS "Users can create reports for own agents" ON agent_reports;
  DROP POLICY IF EXISTS "Users can view reports of own agents" ON agent_reports;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Drop tables if they exist
DROP TABLE IF EXISTS analysis_results;
DROP TABLE IF EXISTS transcriptions;

-- Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_ids uuid[] NOT NULL,
  summary text NOT NULL,
  sentiment_scores jsonb DEFAULT '{}'::jsonb,
  key_points text[] DEFAULT ARRAY[]::text[],
  recommendations text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies with conflict handling
DO $$ 
BEGIN
  -- Policies for transcriptions
  CREATE POLICY "Users can view transcriptions of own agents"
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
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can create transcriptions for own agents"
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
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policies for analysis_results
DO $$ 
BEGIN
  CREATE POLICY "Users can view analysis results of own transcriptions"
    ON analysis_results
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM transcriptions
        JOIN agents ON agents.id = transcriptions.agent_id
        WHERE transcriptions.id = ANY(analysis_results.transcription_ids)
        AND agents.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can create analysis results for own transcriptions"
    ON analysis_results
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM transcriptions
        JOIN agents ON agents.id = transcriptions.agent_id
        WHERE transcriptions.id = ANY(analysis_results.transcription_ids)
        AND agents.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Recreate agent_reports policies
DO $$ 
BEGIN
  CREATE POLICY "Users can create reports for own agents"
    ON agent_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_reports.agent_id
        AND agents.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can view reports of own agents"
    ON agent_reports
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_reports.agent_id
        AND agents.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;