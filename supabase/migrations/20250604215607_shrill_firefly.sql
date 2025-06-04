/*
  # Add Transcriptions and Analysis Support

  1. New Tables
    - `transcriptions`
      - Stores conversation transcripts with agents
      - Links to agents and includes metadata
    - `analysis_results` 
      - Stores OpenAI analysis of transcriptions
      - Links to one or more transcriptions
      - Includes sentiment, key points, and recommendations

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create transcriptions table
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analysis results table
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_ids uuid[] NOT NULL,
  summary text NOT NULL,
  sentiment_scores jsonb NOT NULL,
  key_points text[] NOT NULL,
  recommendations text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- Add policies for transcriptions
CREATE POLICY "Users can view transcriptions of their agents"
  ON public.transcriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transcriptions for their agents"
  ON public.transcriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcriptions.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- Add policies for analysis results
CREATE POLICY "Users can view analysis of their transcriptions"
  ON public.analysis_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN agents a ON a.id = t.agent_id
      WHERE t.id = ANY(analysis_results.transcription_ids)
      AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create analysis for their transcriptions"
  ON public.analysis_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transcriptions t
      JOIN agents a ON a.id = t.agent_id
      WHERE t.id = ANY(analysis_results.transcription_ids)
      AND a.user_id = auth.uid()
    )
  );