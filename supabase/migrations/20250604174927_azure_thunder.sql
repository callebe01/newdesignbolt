/*
  # Create Transcripts Table

  1. New Table
    - `transcripts`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage transcripts of their own agents
*/

-- Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create transcripts for own agents"
  ON transcripts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcripts.agent_id
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view transcripts of own agents"
  ON transcripts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = transcripts.agent_id
      AND agents.user_id = auth.uid()
    )
  );