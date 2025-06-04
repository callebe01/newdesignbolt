/*
  # Add transcripts and reports tables

  1. New Tables
    - `transcriptions`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references agents)
      - `content` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
    
    - `analysis_results`
      - `id` (uuid, primary key)
      - `transcription_ids` (uuid[])
      - `summary` (text)
      - `sentiment_scores` (jsonb)
      - `key_points` (text[])
      - `recommendations` (text[])
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create reports for own agents" ON agent_reports;
  DROP POLICY IF EXISTS "Users can view reports of own agents" ON agent_reports;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

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

-- Policies for transcriptions
DO $$ BEGIN
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

DO $$ BEGIN
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

-- Policies for analysis_results
DO $$ BEGIN
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

DO $$ BEGIN
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
DO $$ BEGIN
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

DO $$ BEGIN
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