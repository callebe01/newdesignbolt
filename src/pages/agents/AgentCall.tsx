// src/components/AgentCall.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { Button } from '../../components/ui/Button';
import { formatTime } from '../../utils/format';

// I removed the h-6/w-6 classes and added width/height attrs
const MicIcon = ({ className = "stroke-current text-white" }: { className?: string }) => (
  <svg
    width="24" height="24"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    {/* …paths unchanged… */}
  </svg>
);

const MicOffIcon = ({ className = "stroke-current text-gray-600" }: { className?: string }) => (
  <svg
    width="24" height="24"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    {/* …paths unchanged… */}
  </svg>
);

const MonitorIcon = ({ className = "stroke-current text-gray-600" }: { className?: string }) => (
  <svg
    width="24" height="24"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    {/* …paths unchanged… */}
  </svg>
);

const XIcon = ({ className = "stroke-current text-white" }: { className?: string }) => (
  <svg
    width="24" height="24"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    {/* …paths unchanged… */}
  </svg>
);

export const AgentCall: React.FC = () => {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
  const { getAgent } = useAgents();
  const {
    startCall, endCall, status, transcript,
    toggleMicrophone, toggleScreenShare,
    isScreenSharing, isMicrophoneActive,
    duration, errorMessage, setTranscript
  } = useLiveCall();

  const [agent, setAgent] = useState<Agent|null>(null);
  const [notFound, setNotFound] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    (async() => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      setAgent(a);
      if (!a) setNotFound(true);
    })();
  }, [agentId, getAgent]);

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
      <div className="flex items-center justify-between p-4 border-b bg-card">
        {/* header... */}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* avatar, transcript, errors... */}

        <div className="flex items-center space-x-4">
          <Button
            aria-label="Toggle microphone"
            size="lg"
            variant={isMicrophoneActive ? 'primary' : 'outline'}
            className="rounded-full w-16 h-16 flex items-center justify-center p-0"
            onClick={toggleMicrophone}
          >
            {isMicrophoneActive
              ? <MicIcon />
              : <MicOffIcon />
            }
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
