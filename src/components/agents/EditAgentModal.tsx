import React, { useState } from 'react';
import { X, Clock, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Agent } from '../../types';
import { updateAgent } from '../../services/agent';

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onAgentUpdated: (updatedAgent: Agent) => void;
}

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

export const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  agent,
  onAgentUpdated
}) => {
  const [name, setName] = useState(agent.name);
  const [instructions, setInstructions] = useState(agent.instructions);
  const [canSeeScreenshare, setCanSeeScreenshare] = useState(agent.canSeeScreenshare);
  const [duration, setDuration] = useState(agent.callDuration);
  const [documentationUrls, setDocumentationUrls] = useState<string[]>(agent.documentationUrls || []);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const updatedAgent = await updateAgent(agent.id, {
        name,
        instructions,
        canSeeScreenshare,
        callDuration: duration,
        documentationUrls
      });
      
      onAgentUpdated(updatedAgent);
      onClose();
    } catch (err) {
      console.error('Failed to update agent:', err);
      setError('Failed to update agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Agent</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
              <label className="text-sm font-medium">Documentation URLs</label>
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
                    <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded-md">
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
                id="editCanSeeScreenshare"
                checked={canSeeScreenshare}
                onChange={(e) => setCanSeeScreenshare(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="editCanSeeScreenshare" className="text-sm font-medium">
                Allow this agent to see screen shares
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};