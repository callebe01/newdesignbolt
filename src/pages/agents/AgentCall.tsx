import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mic, MicOff, X } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { Button } from '../../components/ui/Button';

export const AgentCall: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getAgent } = useAgents();
  const { 
    startCall, 
    endCall, 
    status, 
    transcript, 
    toggleMicrophone, 
    isMicrophoneActive,
    errorMessage 
  } = useLiveCall();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      setAgent(a);
      if (!a) {
        setNotFound(true);
      }
    };
    init();
  }, [agentId, getAgent]);

  useEffect(() => {
    if (!startedRef.current && agent) {
      startedRef.current = true;
      startCall(agent.instructions).catch((err) => console.error(err));
    }
  }, [agent, startCall]);

  const handleEnd = () => {
    endCall();
  };

  if (notFound) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>Agent not found</p>
        <Link to="/agents" className="underline">
          Back to Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-sky-200 to-sky-500" />
          </div>
          <div className="ml-3">
            <h1 className="font-semibold">{agent?.name || 'AI Agent'}</h1>
            <p className="text-sm text-muted-foreground">
              {status === 'active' ? 'Listening...' : status}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleEnd}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-4">
            {transcript ? (
              <div className="bg-card border rounded-lg p-4">
                <p className="whitespace-pre-wrap">{transcript}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Start speaking to begin the conversation
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t">
        <div className="max-w-2xl mx-auto flex justify-center">
          <Button
            size="lg"
            variant={isMicrophoneActive ? 'primary' : 'outline'}
            className="rounded-full w-16 h-16"
            onClick={toggleMicrophone}
          >
            {isMicrophoneActive ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>
        </div>

        {errorMessage && (
          <div className="mt-4 max-w-2xl mx-auto">
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {errorMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};