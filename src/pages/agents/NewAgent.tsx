import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Bot, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createAgent } = useAgents();
  const navigate = useNavigate();

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
      const agent = await createAgent(name, instructions, canSeeScreenshare);
      navigate(`/agents/${agent.id}`);
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError('Failed to create agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/agents" className="flex items-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Agents
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            Create New Agent
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
                {error}
              </div>
            )}

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

            <div className="space-y-4">
              <label className="text-sm font-medium">Call Duration</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                      duration === option.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setDuration(option.value)}
                  >
                    <Clock className={`h-5 w-5 mb-2 ${
                      duration === option.value ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <span className={`text-sm font-medium ${
                      duration === option.value ? 'text-primary' : ''
                    }`}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="canSeeScreenshare"
                checked={canSeeScreenshare}
                onChange={(e) => setCanSeeScreenshare(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="canSeeScreenshare" className="text-sm font-medium">
                Allow this agent to see screen shares
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/agents')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Agent'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};