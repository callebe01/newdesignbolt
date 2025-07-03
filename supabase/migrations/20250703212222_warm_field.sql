CREATE TABLE IF NOT EXISTS agent_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  parameters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;

-- Users can manage tools for their own agents
CREATE POLICY "Users can create tools for own agents"
  ON agent_tools FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = agent_tools.agent_id 
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can view tools for own agents"
  ON agent_tools FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = agent_tools.agent_id 
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update tools for own agents"
  ON agent_tools FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = agent_tools.agent_id 
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete tools for own agents"
  ON agent_tools FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.id = agent_tools.agent_id 
    AND agents.user_id = auth.uid()
  ));