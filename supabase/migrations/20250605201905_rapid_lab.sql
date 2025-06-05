/*
  # Update Agent RLS Policies for Public Access

  1. Changes
    - Add public access policy for agents table
    - Add public access policy for agent conversations
    - Add public access policy for conversation messages
    - Add public access policy for transcriptions

  2. Security
    - Allow public read access to active agents
    - Allow public creation of conversations and messages
    - Maintain existing authenticated user policies
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Public can view active agents" ON agents;
DROP POLICY IF EXISTS "Public can create conversations" ON agent_conversations;
DROP POLICY IF EXISTS "Public can create messages" ON conversation_messages;
DROP POLICY IF EXISTS "Public can create transcriptions" ON transcriptions;

-- Add public access policy for agents
CREATE POLICY "Public can view active agents"
ON agents
FOR SELECT
TO public
USING (status = 'active');

-- Add public access policy for agent conversations
CREATE POLICY "Public can create conversations"
ON agent_conversations
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = agent_conversations.agent_id
    AND agents.status = 'active'
  )
);

-- Add public access policy for conversation messages
CREATE POLICY "Public can create messages"
ON conversation_messages
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_conversations
    WHERE agent_conversations.id = conversation_messages.conversation_id
  )
);

-- Add public access policy for transcriptions
CREATE POLICY "Public can create transcriptions"
ON transcriptions
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = transcriptions.agent_id
    AND agents.status = 'active'
  )
);