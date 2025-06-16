import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Monitor, X } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { Button } from '../../components/ui/Button';
import { formatTime } from '../../utils/format';

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
    toggleScreenShare,
    isScreenSharing,
    isMicrophoneActive,
    duration,
    errorMessage,
    setTranscript
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
    if (!startedRef.current && agent && agentId) {
      startedRef.current = true;
      // Clear transcript before starting new call
      setTranscript('');
      startCall(
        agent.instructions,
        agent.callDuration,
        agent.documentationUrls,
        agentId // Pass the agentId for usage checking
      ).catch((err) => console.error(err));
    }
  }, [agent, agentId, startCall, setTranscript]);

  const handleEnd = async () => {
    endCall();
    navigate('/agents');
  };

  if (notFound) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>Agent not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-sky-200 to-sky-500" />
            </div>
            <div className="ml-3">
              <h1 className="font-semibold">{agent?.name || 'AI Agent'}</h1>
              <p className="text-sm text-muted-foreground">
                {status === 'active' ? `${formatTime(duration)} elapsed` : status}
              </p>
            </div>
          </div>
        </div>
      </div>

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
            aria-label="Toggle microphone"
            size="lg"
            variant={isMicrophoneActive ? 'primary' : 'outline'}
            className="rounded-full w-16 h-16 flex items-center justify-center p-0"
            onClick={toggleMicrophone}
          >
            {isMicrophoneActive ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>

          {agent?.canSeeScreenshare && (
            <Button
              aria-label={isScreenSharing ? 'Stop screen share' : 'Share screen'}
              size="lg"
              variant={isScreenSharing ? 'primary' : 'outline'}
              className="rounded-full w-16 h-16 flex items-center justify-center p-0"
              onClick={toggleScreenShare}
            >
              <Monitor className="h-6 w-6" />
            </Button>
          )}

          <Button
            aria-label="End call"
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 flex items-center justify-center p-0"
            onClick={handleEnd}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};