import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAgents } from '../../context/AgentContext';

export const AgentsList: React.FC = () => {
  const { agents, fetchAgents, loading } = useAgents();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agents</h1>
        <Link to="/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse-subtle"></div>
          ))}
        </div>
      ) : agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(agent => (
            <Card key={agent.id} className="transition-all hover:shadow-md h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{agent.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {agent.instructions}
                </p>
              </CardContent>
              <CardFooter className="pt-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/agents/${agent.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-2">No agents found</h3>
          <p className="text-muted-foreground mb-6">Create your first AI agent</p>
          <Link to="/agents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
