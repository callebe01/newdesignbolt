import React, { createContext, useContext, useState, useEffect } from 'react';
import { Agent } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface AgentContextType {
  agents: Agent[];
  currentAgent: Agent | null;
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
  getAgent: (id: string) => Promise<Agent | null>;
  createAgent: (name: string, instructions: string) => Promise<Agent>;
  setCurrentAgent: (agent: Agent | null) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const mapAgent = (data: any): Agent => ({
    id: data.id,
    name: data.name,
    instructions: data.instructions,
    status: data.status,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    userId: data.user_id,
  });

  const fetchAgents = async () => {
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
  };

  useEffect(() => {
    if (user) {
      fetchAgents();
    }
  }, [user]);

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

  const createAgent = async (name: string, instructions: string): Promise<Agent> => {
    try {
      if (!user) {
        throw new Error('User must be authenticated to create an agent');
      }

      const { data, error: createError } = await supabase
        .from('agents')
        .insert({
          name,
          instructions,
          status: 'active',
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      const newAgent = mapAgent(data);
      setAgents(prev => [newAgent, ...prev]);
      return newAgent;
    } catch (err) {
      console.error('Failed to create agent:', err);
      throw new Error('Failed to create agent');
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