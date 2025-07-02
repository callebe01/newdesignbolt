import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Agent } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { canUserPerformAction, recordUsage } from '../services/usage';

interface AgentContextType {
  agents: Agent[];
  currentAgent: Agent | null;
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  getAgent: (id: string) => Promise<Agent | null>;
  createAgent: (
    name: string,
    instructions: string,
    duration: number,
    documentationUrls?: string[]
  ) => Promise<Agent>;
  setCurrentAgent: (agent: Agent | null) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  interface AgentRow {
    id: string;
    name: string;
    instructions: string;
    status: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    call_duration: number;
    documentation_urls: string[] | null;
  }

  const mapAgent = (data: AgentRow): Agent => ({
    id: data.id,
    name: data.name,
    instructions: data.instructions,
    status: data.status,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    callDuration: data.call_duration,
    documentationUrls: data.documentation_urls || [],
  });

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedAgents = data.map(mapAgent);
      setAgents(mappedAgents);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAgents();
    }
  }, [user, fetchAgents]);

  const getAgent = async (id: string): Promise<Agent | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return data ? mapAgent(data) : null;
    } catch (err) {
      console.error('Failed to get agent:', err);
      setError('Failed to get agent');
      return null;
    }
  };

  const createAgent = async (
    name: string,
    instructions: string,
    duration: number,
    documentationUrls: string[] = []
  ): Promise<Agent> => {
    try {
      if (!user) {
        throw new Error('User must be authenticated to create an agent');
      }

      // Check if user can create another agent
      const canCreate = await canUserPerformAction('create_agent');
      if (!canCreate) {
        throw new Error('You have reached your agent limit for your current plan. Please upgrade or delete an existing agent.');
      }

      const { data, error: createError } = await supabase
        .from('agents')
        .insert({
          name,
          instructions,
          status: 'active',
          user_id: user.id,
          call_duration: duration,
          documentation_urls: documentationUrls,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Record the agent creation in usage tracking
      await recordUsage('agent_created', 1);

      const newAgent = mapAgent(data);
      setAgents(prev => [newAgent, ...prev]);
      return newAgent;
    } catch (err) {
      console.error('Failed to create agent:', err);
      throw err;
    }
  };

  return (
    <AgentContext.Provider
      value={{
        agents,
        currentAgent,
        loading,
        error,
        fetchAgents,
        getAgent,
        createAgent,
        setCurrentAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgents = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
};