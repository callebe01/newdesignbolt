import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Bot, Activity, Clock, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAgents } from '../../context/AgentContext';
import { getTranscripts } from '../../services/transcripts';
import { formatDateTime } from '../../utils/format';

export const AgentsList: React.FC = () => {
  const { agents, loading, error, fetchAgents } = useAgents();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAgents, setFilteredAgents] = useState(agents);
  const [agentMetrics, setAgentMetrics] = useState<Record<string, { conversations: number, lastActive: Date | null }>>({});
  
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const loadMetrics = async () => {
      const metrics: Record<string, { conversations: number, lastActive: Date | null }> = {};
      
      for (const agent of agents) {
        try {
          const transcripts = await getTranscripts(agent.id);
          metrics[agent.id] = {
            conversations: transcripts.length,
            lastActive: transcripts.length > 0 ? new Date(transcripts[0].created_at) : null
          };
        } catch (err) {
          console.error(`Failed to load metrics for agent ${agent.id}:`, err);
          metrics[agent.id] = { conversations: 0, lastActive: null };
        }
      }
      
      setAgentMetrics(metrics);
    };

    if (agents.length > 0) {
      loadMetrics();
    }
  }, [agents]);
  
  useEffect(() => {
    const filtered = agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.instructions.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAgents(filtered);
  }, [agents, searchTerm]);

  const handleGetHelp = () => {
    if (window.voicepilot) {
      window.voicepilot.open();
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agents</h1>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleGetHelp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Need Help?
          </Button>
          <Link to="/agents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Agent
            </Button>
          </Link>
        </div>
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
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          Failed to load agents. Please try again.
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map(agent => (
            <Card key={agent.id} className="transition-all hover:shadow-md">
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
                      <span>
                        {agentMetrics[agent.id]?.conversations || 0} conversations
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 text-accent" />
                      <span>{agent.callDuration}s max</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>Last active: {
                        agentMetrics[agent.id]?.lastActive 
                          ? formatDateTime(agentMetrics[agent.id].lastActive!)
                          : 'Never'
                      }</span>
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
          <div className="flex items-center justify-center space-x-3">
            {!searchTerm && (
              <Button>
                <Link to="/agents/new" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Agent
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={handleGetHelp}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Need Help?
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};