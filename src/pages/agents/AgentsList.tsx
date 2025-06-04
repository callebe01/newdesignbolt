import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Bot, Activity, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAgents } from '../../context/AgentContext';

export const AgentsList: React.FC = () => {
  const { agents, fetchAgents, loading } = useAgents();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAgents, setFilteredAgents] = useState(agents);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const filtered = agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.instructions.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAgents(filtered);
  }, [agents, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Agents</h1>
        <Button>
          <Link to="/agents/new" className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            fullWidth
          />
        </div>
        <Button variant="outline" className="sm:w-auto w-full">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse-subtle"></div>
          ))}
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No agents found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm ? 'No agents match your search' : 'Create your first AI agent'}
          </p>
          {!searchTerm && (
            <Button>
              <Link to="/agents/new" className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

interface AgentCardProps {
  agent: Agent;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{agent.name}</CardTitle>
          <div className={`px-2 py-1 text-xs rounded-full font-medium ${
            agent.status === 'active' 
              ? 'bg-success/10 text-success' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {agent.status.toUpperCase()}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {agent.instructions}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Activity className="mr-2 h-4 w-4 text-primary" />
              <span>0 conversations</span>
            </div>
            <div className="flex items-center text-sm">
              <Users className="mr-2 h-4 w-4 text-accent" />
              <span>0 active now</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Clock className="mr-2 h-4 w-4 text-secondary" />
              <span>No data</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Last active: Never</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex justify-between w-full">
          <Button variant="outline">
            <Link to={`/agents/${agent.id}`}>View Details</Link>
          </Button>
          <Button variant="primary">
            <Link to={`/agent/${agent.id}`}>Start Chat</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};