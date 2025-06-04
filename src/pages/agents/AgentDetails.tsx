import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Copy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAgents } from '../../context/AgentContext';
import { Agent } from '../../types';

export const AgentDetails: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getAgent } = useAgents();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      setAgent(a);
      setLoading(false);
    };
    fetch();
  }, [agentId, getAgent]);

  const shareLink = `${window.location.origin}/agent/${agentId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!agent) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>Agent not found</p>
        <Link to="/agents" className="underline">Back to Agents</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to="/agents" className="flex items-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Agents
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{agent.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Instructions</h3>
            <p className="whitespace-pre-wrap">{agent.instructions}</p>
          </div>

          <div className="bg-muted p-4 rounded-md flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Shareable Link</p>
              <p className="text-sm font-medium break-all">{shareLink}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
