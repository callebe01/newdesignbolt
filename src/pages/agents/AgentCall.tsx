// src/components/AgentCall.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { Button } from '../../components/ui/Button';
import { formatTime } from '../../utils/format';

// -- ICONS WITH FIXED SIZE + CONTRASTING STROKE --

const MicIcon = ({ className = "stroke-current text-white" }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    <line x1="8"  y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
  </svg>
);

const MicOffIcon = ({ className = "stroke-current text-gray-600" }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 9v3a3 3 0 0 0 5.12 2.12l1.88-1.88" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    <line x1="8"  y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
  </svg>
);

const MonitorIcon = ({ className = "stroke-current text-gray-600" }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    <line x1="8"  y1="21" x2="16" y2="21" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
  </svg>
);

const XIcon = ({ className = "stroke-current text-white" }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="18" y1="6"  x2="6"  y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    <line x1="6"  y1="6"  x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
  </svg>
);

// -- MAIN COMPONENT --

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

  const [agent,   setAgent]   = useState<Agent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const startedRef = useRef(false);

  // Load agent
  useEffect(() => {
    (async () => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      setAgent(a);
      if (!a) setNotFound(true);
    })();
  }, [agentId, getAgent]);

  // Kick off call once
  useEffect(() => {
    if (!startedRef.current && agent && agentId) {
      startedRef.current = true;
      setTranscript('');
      startCall(
        agent.instructions,
        agent.callDuration,
        agent.documentationUrls,
        agentId
      ).catch(console.error);
    }
  }, [agent, agentId, startCall, setTranscript]);

  const handleEnd = () => {
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-sky-200 to-sky-500" />
          </div>
          <div className="ml-3">
            <h1 className="font-semibold">{agent?.name || 'AI Agent'}</h1>
            <p className="text-sm text-muted-foreground">
              {status === 'active'
                ? `${formatTime(duration)} elapsed`
                : status}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div
          className={`
            w-32 h-32 rounded-full bg-gradient-to-b from-sky-200 to-sky-500
            flex items-center justify-center mb-8
            ${status === 'active' ? 'animate-pulse-subtle' : ''}
          `}
        />

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

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <Button
            aria-label="Toggle microphone"
            size="lg"
            variant={isMicrophoneActive ? 'primary' : 'outline'}
            className="rounded-full w-16 h-16 flex items-center justify-center p-0"
            onClick={toggleMicrophone}
          >
            {isMicrophoneActive ? <MicIcon /> : <MicOffIcon />}
          </Button>

          {agent?.canSeeScreenshare && (
            <Button
              aria-label={isScreenSharing ? 'Stop screen share' : 'Share screen'}
              size="lg"
              variant={isScreenSharing ? 'primary' : 'outline'}
              className="rounded-full w-16 h-16 flex items-center justify-center p-0"
              onClick={toggleScreenShare}
            >
              <MonitorIcon />
            </Button>
          )}

          <Button
            aria-label="End call"
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 flex items-center justify-center p-0"
            onClick={handleEnd}
          >
            <XIcon />
          </Button>
        </div>
      </div>
    </div>
  );
};
