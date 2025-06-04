/*
  # Agent Management System Schema

  1. New Tables
    - `agents`
      - `id` (uuid, primary key)
      - `name` (text)
      - `instructions` (text)
      - `status` (text) - active/inactive
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, foreign key)
    
    - `agent_conversations`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `status` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `duration` (integer)
      - `sentiment_score` (float)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `conversation_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `role` (text)
      - `content` (text)
      - `timestamp` (timestamp)
      - `created_at` (timestamp)

    - `agent_analytics`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key)
      - `total_conversations` (integer)
      - `avg_duration` (integer)
      - `avg_sentiment` (float)
      - `common_topics` (jsonb)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  instructions text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create agent_conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'completed', 'error')),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration integer,
  sentiment_score float,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create agent_analytics table
CREATE TABLE IF NOT EXISTS agent_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  total_conversations integer DEFAULT 0,
  avg_duration integer DEFAULT 0,
  avg_sentiment float DEFAULT 0,
  common_topics jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analytics ENABLE ROW LEVEL SECURITY;

-- Agents policies
CREATE POLICY "Users can view own agents"
  ON agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents"
  ON agents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Agent conversations policies
CREATE POLICY "Users can view conversations of own agents"
  ON agent_conversations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_conversations.agent_id
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can create conversations"
  ON agent_conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update conversations of own agents"
  ON agent_conversations FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_conversations.agent_id
    AND agents.user_id = auth.uid()
  ));

-- Conversation messages policies
CREATE POLICY "Users can view messages of own agents"
  ON conversation_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agent_conversations
    JOIN agents ON agents.id = agent_conversations.agent_id
    WHERE agent_conversations.id = conversation_messages.conversation_id
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can create messages"
  ON conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Analytics policies
CREATE POLICY "Users can view analytics of own agents"
  ON agent_analytics FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_analytics.agent_id
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update analytics of own agents"
  ON agent_analytics FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_analytics.agent_id
    AND agents.user_id = auth.uid()
  ));