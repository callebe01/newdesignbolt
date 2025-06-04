/*
  # Create Transcriptions and Analysis Tables

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
    - Add policies for authenticated users to:
      - View transcriptions of their own agents
      - Create transcriptions for their own agents
      - View analysis results of their own transcriptions
*/

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