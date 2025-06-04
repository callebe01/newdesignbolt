-- Create the agent_reports table
CREATE TABLE IF NOT EXISTS agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
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