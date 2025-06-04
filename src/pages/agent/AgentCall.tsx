import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useLiveCall } from '../../context/LiveCallContext';
import { getAgentById } from '../../services/agents';
import { Agent } from '../../types';

export const AgentCall: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { startCall, status } = useLiveCall();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      if (!agentId) return;
      const data = await getAgentById(agentId);
      setAgent(data);
      setLoading(false);
    };
    fetchAgent();
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse-subtle text-lg">Loading agent...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
        Agent not found
      </div>
    );
  }

  const handleStart = () => {
    startCall(agent.systemInstruction).catch((err) => console.error(err));
  };

  const shareUrl = `${window.location.origin}/agent/${agent.id}`;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{agent.name}</h1>
        <p className="text-sm text-muted-foreground break-all">Share this link: {shareUrl}</p>
      </div>
      <Button onClick={handleStart} disabled={status === 'active'}>
        Start Call
      </Button>
    </div>
  );
};
