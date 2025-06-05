import { User } from './index';

export interface Agent {
  id: string;
  name: string;
  instructions: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  canSeeScreenshare: boolean;
}

export interface AgentConversation {
  id: string;
  agentId: string;
  status: 'active' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  sentimentScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  createdAt: Date;
}

export interface AgentAnalytics {
  id: string;
  agentId: string;
  totalConversations: number;
  avgDuration: number;
  avgSentiment: number;
  commonTopics: Record<string, number>;
  updatedAt: Date;
}

export interface AgentMetrics {
  totalConversations: number;
  activeConversations: number;
  avgDuration: number;
  avgSentiment: number;
  lastActivity?: Date;
}