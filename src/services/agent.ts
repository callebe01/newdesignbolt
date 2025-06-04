import { supabase } from './supabase';
import { Agent, AgentConversation, ConversationMessage, AgentAnalytics, AgentMetrics } from '../types/agent';

export async function createAgent(name: string, instructions: string): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .insert({
      name,
      instructions,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return mapAgent(data);
}

export async function getAgent(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data ? mapAgent(data) : null;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapAgent(data);
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getAgentMetrics(agentId: string): Promise<AgentMetrics> {
  const { data: analytics, error: analyticsError } = await supabase
    .from('agent_analytics')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (analyticsError) throw analyticsError;

  const { data: activeConversations, error: conversationsError } = await supabase
    .from('agent_conversations')
    .select('id')
    .eq('agent_id', agentId)
    .eq('status', 'active');

  if (conversationsError) throw conversationsError;

  return {
    totalConversations: analytics.total_conversations,
    activeConversations: activeConversations.length,
    avgDuration: analytics.avg_duration,
    avgSentiment: analytics.avg_sentiment,
    lastActivity: analytics.updated_at,
  };
}

export async function startConversation(agentId: string): Promise<AgentConversation> {
  const { data, error } = await supabase
    .from('agent_conversations')
    .insert({
      agent_id: agentId,
      status: 'active',
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapConversation(data);
}

export async function endConversation(conversationId: string, duration: number, sentimentScore?: number): Promise<void> {
  const { error } = await supabase
    .from('agent_conversations')
    .update({
      status: 'completed',
      end_time: new Date().toISOString(),
      duration,
      sentiment_score: sentimentScore,
    })
    .eq('id', conversationId);

  if (error) throw error;
}

export async function addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<ConversationMessage> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return mapMessage(data);
}

export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data.map(mapMessage);
}

function mapAgent(row: Record<string, any>): Agent {
  return {
    id: row.id,
    name: row.name,
    instructions: row.instructions,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    userId: row.user_id,
  };
}

function mapConversation(row: Record<string, any>): AgentConversation {
  return {
    id: row.id,
    agentId: row.agent_id,
    status: row.status,
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : undefined,
    duration: row.duration,
    sentimentScore: row.sentiment_score,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapMessage(row: Record<string, any>): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.timestamp),
    createdAt: new Date(row.created_at),
  };
}