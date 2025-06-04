import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, ArrowLeft } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { saveTranscript, generateAndSaveReport } from '../../services/transcripts';
import { Button } from '../../components/ui/Button';

export const AgentCall: React.FC = () => {
  const navigate = useNavigate();
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

  const handleEnd = async () => {
    endCall();
    if (agentId) {
      await saveTranscript(agentId, transcript);
      await generateAndSaveReport(agentId, transcript);
    }
    navigate('/agents');
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEnd}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={`w-32 h-32 rounded-full bg-gradient-to-b from-sky-200 to-sky-500 flex items-center justify-center mb-8 ${
          status === 'active' ? 'animate-pulse-subtle' : ''
        }`} />

        {transcript ? (
          <div className="max-w-2xl w-full bg-card border rounded-lg p-4 mb-8">
            <p className="whitespace-pre-wrap">{transcript}</p>
          </div>
        ) : (
          <p className="text-muted-foreground mb-8">
            Start speaking to begin the conversation
          </p>
        )}

        {errorMessage && (
          <div className="mb-8 w-full max-w-2xl bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center space-x-4">
          <Button
            size="lg"
            variant={isMicrophoneActive ? 'primary' : 'outline'}
            className="rounded-full w-16 h-16 shadow-lg"
            onClick={toggleMicrophone}
          >
            {isMicrophoneActive ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>

          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 shadow-lg"
            onClick={handleEnd}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};