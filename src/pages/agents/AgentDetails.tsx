import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Activity, MessageSquare, Brain } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useAgents } from '../../context/AgentContext';
import { Agent } from '../../types';
import { getAgentReports, AgentReport } from '../../services/transcripts';

export const AgentDetails: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getAgent } = useAgents();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AgentReport[]>([]);

  useEffect(() => {
    const fetch = async () => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      setAgent(a);
      setLoading(false);
    };
    fetch();
  }, [agentId, getAgent]);

  useEffect(() => {
    const fetchReports = async () => {
      if (!agentId) return;
      const r = await getAgentReports(agentId);
      setReports(r);
    };
    fetchReports();
  }, [agentId]);

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link to="/agents" className="flex items-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Agents
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">
            {agent.status === 'active' ? 'Active • Last active 2h ago' : 'Inactive'}
          </p>
        </div>
        <Badge variant={agent.status === 'active' ? 'success' : 'default'}>
          {agent.status.toUpperCase()}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium mb-1">Shareable Link</h3>
              <p className="text-sm text-muted-foreground break-all">{shareLink}</p>
            </div>
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <MessageSquare className="mr-2 h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Brain className="mr-2 h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" selectedValue={activeTab}>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Conversations</h4>
                  <p className="text-2xl font-semibold">18</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Most Common Goal</h4>
                  <p className="text-2xl font-semibold">Understand pricing</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Top Friction</h4>
                  <p className="text-2xl font-semibold">Signup flow</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" selectedValue={activeTab}>
          <div className="space-y-4">
            {[1, 2, 3].map((_, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">User #{idx + 1}</h3>
                      <p className="text-sm text-muted-foreground">3 minutes ago</p>
                    </div>
                    <Badge>Completed</Badge>
                  </div>
                  <p className="text-sm italic text-muted-foreground mb-4">
                    "I don't understand what's included in the free plan."
                  </p>
                  <Button variant="outline" size="sm">View Full Transcript</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" selectedValue={activeTab}>
          <Card>
            <CardContent className="p-6 space-y-6">
              {reports.length > 0 ? (
                <>
                  <div>
                    <h3 className="text-lg font-medium mb-2">AI Summary</h3>
                    <p className="text-sm whitespace-pre-wrap">{reports[0].summary}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Sentiment Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(reports[0].sentimentBreakdown).map(([k, v]) => (
                        <div key={k} className="bg-muted p-4 rounded-lg">
                          <p className="text-2xl font-semibold">{v}%</p>
                          <p className="text-sm text-muted-foreground capitalize">{k}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Friction Quotes</h3>
                    <div className="space-y-3">
                      {reports[0].frictionQuotes.map((q, idx) => (
                        <blockquote
                          key={idx}
                          className="text-sm italic text-muted-foreground border-l-2 pl-4"
                        >
                          {`"${q}"`}
                        </blockquote>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Recommended Actions</h3>
                    <ul className="space-y-2">
                      {reports[0].recommendedActions.map((a, idx) => (
                        <li key={idx} className="text-sm flex items-center">
                          <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No reports yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};