import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Bot, Clock, Plus, X, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useAgents } from '../../context/AgentContext';

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

export const NewAgent: React.FC = () => {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [canSeeScreenshare, setCanSeeScreenshare] = useState(false);
  const [duration, setDuration] = useState<number>(300); // Default to 5 minutes
  const [documentationUrls, setDocumentationUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createAgent } = useAgents();
  const navigate = useNavigate();

  const addUrl = () => {
    if (!newUrl.trim()) return;
    try {
      new URL(newUrl); // Validate URL format
      setDocumentationUrls([...documentationUrls, newUrl.trim()]);
      setNewUrl('');
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
      const agent = await createAgent(
        name,
        instructions,
        canSeeScreenshare,
        duration,
        documentationUrls
      );
      navigate(`/agents/${agent.id}`);
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError('Failed to create agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetHelp = () => {
    if (window.voicepilot) {
      window.voicepilot.open();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/agents" className="flex items-center text-muted-foreground hover:text-foreground mb-2">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Agents
          </Link>
          <h1 className="text-3xl font-bold flex items-center">
            <Bot className="mr-3 h-8 w-8 text-primary" />
            Create New Agent
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your AI agent with custom instructions and behavior
          </p>
        </div>
        <Button variant="outline" onClick={handleGetHelp}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Need Help?
        </Button>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-lg p-6 border border-primary/20">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Create Your First AI Agent</h2>
            <p className="text-muted-foreground mt-1">
              Define how your agent should behave, what it knows, and how long conversations should last.
            </p>
          </div>
        </div>
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

                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <input
                    type="checkbox"
                    id="canSeeScreenshare"
                    checked={canSeeScreenshare}
                    onChange={(e) => setCanSeeScreenshare(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="canSeeScreenshare" className="text-sm font-medium flex-1">
                    Allow this agent to see screen shares
                  </label>
                </div>
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
                  {isLoading ? 'Creating...' : 'Create Agent'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/agents')}
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