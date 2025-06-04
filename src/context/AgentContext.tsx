import React, { createContext, useContext, useState, useEffect } from 'react';
import { Agent } from '../types';

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

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockAgents: Agent[] = [];
      setAgents(mockAgents);
    } catch (err) {
      setError('Failed to fetch agents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const getAgent = async (id: string): Promise<Agent | null> => {
    try {
      const agent = agents.find((a) => a.id === id) || null;
      return agent;
    } catch (err) {
      console.error(err);
      setError('Failed to get agent');
      return null;
    }
  };

  const createAgent = async (name: string, instructions: string): Promise<Agent> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const newAgent: Agent = {
        id: crypto.randomUUID(),
        name,
        instructions,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAgents((prev) => [...prev, newAgent]);
      return newAgent;
    } catch (err) {
      console.error(err);
      setError('Failed to create agent');
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