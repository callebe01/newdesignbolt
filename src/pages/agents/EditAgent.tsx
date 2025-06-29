import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Clock, Plus, X, Save, MessageCircle, Eye, Monitor, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { useAgents } from '../../context/AgentContext';
import { Agent } from '../../types';
import { updateAgent } from '../../services/agent';

interface DurationOption {
  value: number;
  label: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { value: 60, label: '1 minute' },
  { value: 180, label: '3 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
];

export const EditAgent: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { getAgent } = useAgents();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [canSeeScreenshare, setCanSeeScreenshare] = useState(false);
  const [canSeePageContext, setCanSeePageContext] = useState(false);
  const [duration, setDuration] = useState(300);
  const [documentationUrls, setDocumentationUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAgent = async () => {
      if (!agentId) return;
      
      try {
        const fetchedAgent = await getAgent(agentId);
        if (fetchedAgent) {
          setAgent(fetchedAgent);
          setName(fetchedAgent.name);
          setInstructions(fetchedAgent.instructions);
          setCanSeeScreenshare(fetchedAgent.canSeeScreenshare);
          setCanSeePageContext(fetchedAgent.canSeePageContext || false);
          setDuration(fetchedAgent.callDuration);
          setDocumentationUrls(fetchedAgent.documentationUrls || []);
        } else {
          setError('Agent not found');
        }
      } catch (err) {
        console.error('Failed to load agent:', err);
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    };

    loadAgent();
  }, [agentId, getAgent]);

  const addUrl = () => {
    if (!newUrl.trim()) return;
    try {
      new URL(newUrl); // Validate URL format
      setDocumentationUrls([...documentationUrls, newUrl.trim()]);
      setNewUrl('');
      setError(null);
    } catch (err) {
      setError('Please enter a valid URL');
    }
  };

  const removeUrl = (index: number) => {
    setDocumentationUrls(documentationUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    if (!instructions.trim()) {
      setError('Instructions are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateAgent(agentId!, {
        name,
        instructions,
        canSeeScreenshare,
        canSeePageContext,
        callDuration: duration,
        documentationUrls
      });
      
      navigate(`/agents/${agentId}`);
    } catch (err) {
      console.error('Failed to update agent:', err);
      setError('Failed to update agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetHelp = () => {
    if (window.voicepilot) {
      window.voicepilot.open();
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse-subtle text-lg">Loading agent...</div>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/agents" className="flex items-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Agents
          </Link>
        </div>
        <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/agents/${agentId}`} className="flex items-center text-muted-foreground hover:text-foreground mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Agent Details
          </Link>
          <h1 className="text-3xl font-bold">Edit Agent</h1>
          <p className="text-muted-foreground mt-1">
            Update your agent's configuration and behavior
          </p>
        </div>
        <Button variant="outline" onClick={handleGetHelp}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Need Help?
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Input
                  label="Agent Name"
                  placeholder="E.g., UX Research Assistant"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  fullWidth
                />

                <div>
                  <label className="text-sm font-medium leading-none mb-2 block">
                    Agent Instructions
                  </label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[200px]"
                    placeholder="Provide detailed instructions for how this agent should behave and interact with users..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Be specific about the agent's role, tone, and how it should handle different scenarios.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentation & Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://docs.example.com"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    fullWidth
                  />
                  <Button type="button" onClick={addUrl}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {documentationUrls.length > 0 && (
                  <div className="space-y-2">
                    {documentationUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted p-3 rounded-md">
                        <span className="text-sm flex-1 truncate">{url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUrl(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Add URLs to documentation that the agent should reference during conversations.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">Call Duration</label>
                  <div className="grid grid-cols-1 gap-3">
                    {DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          duration === option.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setDuration(option.value)}
                      >
                        <div className="flex items-center">
                          <Clock className={`h-4 w-4 mr-2 ${
                            duration === option.value ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <span className={`text-sm font-medium ${
                            duration === option.value ? 'text-primary' : ''
                          }`}>
                            {option.label}
                          </span>
                        </div>
                        {duration === option.value && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="editCanSeeScreenshare"
                    checked={canSeeScreenshare}
                    onChange={(e) => setCanSeeScreenshare(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="editCanSeeScreenshare" className="text-sm font-medium flex items-center">
                      <Monitor className="h-4 w-4 mr-2" />
                      Screen Sharing
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allow this agent to see and analyze screen shares during calls
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="editCanSeePageContext"
                    checked={canSeePageContext}
                    onChange={(e) => setCanSeePageContext(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="editCanSeePageContext" className="text-sm font-medium flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Page Context Awareness
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allow this agent to see page contents, buttons, and navigation elements to provide contextual guidance
                    </p>
                  </div>
                </div>

                {canSeePageContext && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-primary">Enhanced Guidance</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          This agent will be able to see what page users are on, highlight relevant buttons, and provide step-by-step navigation assistance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  fullWidth
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Updating...' : 'Update Agent'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/agents/${agentId}`)}
                  disabled={isLoading}
                  fullWidth
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};