import { supabase } from './supabase';
import { Agent, AgentConversation, ConversationMessage, AgentAnalytics, AgentMetrics } from '../types/agent';

export async function createAgent(
  name: string,
  instructions: string,
  duration: number
): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .insert({
      name,
      instructions,
      status: 'active',
      call_duration: duration,
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
  const {
    callDuration,
    canSeeScreenshare,
    documentationUrls,
    ...rest
  } = updates as any;

  const updateData: Record<string, any> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };

  if (callDuration !== undefined) {
    updateData.call_duration = callDuration;
  }

  if (canSeeScreenshare !== undefined) {
    updateData.can_see_screenshare = canSeeScreenshare;
  }

  if (documentationUrls !== undefined) {
    updateData.documentation_urls = documentationUrls;
  }

  const { data, error } = await supabase
    .from('agents')
    .update(updateData)
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
    .eq('agent_id', agentId);

  if (analyticsError) throw analyticsError;

  // Provide default metrics if no analytics data exists
  const defaultMetrics: AgentMetrics = {
    totalConversations: 0,
    activeConversations: 0,
    avgDuration: 0,
    avgSentiment: 0,
    lastActivity: null,
  };

  // If no analytics data exists, return default metrics with active conversations count
  if (!analytics || analytics.length === 0) {
    const { data: activeConversations, error: conversationsError } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('agent_id', agentId)
      .eq('status', 'active');

    if (conversationsError) throw conversationsError;

    return {
      ...defaultMetrics,
      activeConversations: activeConversations?.length || 0,
    };
  }

  // If analytics data exists, use it along with active conversations count
  const { data: activeConversations, error: conversationsError } = await supabase
    .from('agent_conversations')
    .select('id')
    .eq('agent_id', agentId)
    .eq('status', 'active');

  if (conversationsError) throw conversationsError;

  return {
    totalConversations: analytics[0].total_conversations || 0,
    activeConversations: activeConversations?.length || 0,
    avgDuration: analytics[0].avg_duration || 0,
    avgSentiment: analytics[0].avg_sentiment || 0,
    lastActivity: analytics[0].updated_at ? new Date(analytics[0].updated_at) : null,
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
    canSeeScreenshare: row.can_see_screenshare,
    callDuration: row.call_duration,
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