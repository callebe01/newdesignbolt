// src/components/AgentCall.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { formatTime } from '../../utils/format';

// a reusable pill button with 3 variants
const ControlButton: React.FC<{ onClick: () => void; label: string; variant: 'primary' | 'outline' | 'destructive'; }> = ({ onClick, label, variant }) => {
  const base = 'px-4 py-2 text-sm font-medium rounded-full transition';
  const variants = {
    primary:     'bg-blue-600 text-white hover:bg-blue-700',
    outline:     'border-2 border-gray-600 text-gray-600 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  } as const;

  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      {label}
    </button>
  );
};

export const AgentCall: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getAgent } = useAgents();
  const {
    startCall,
    endCall,
    status,
    transcript,
    toggleMicrophone,
    toggleScreenShare,
    toggleHighlightObjects,
    isScreenSharing,
    isMicrophoneActive,
    highlightObjects,
    duration,
    errorMessage,
    setTranscript
  } = useLiveCall();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [callCompleted, setCallCompleted] = useState(false);
  const startedRef = useRef(false);

  // load agent metadata
  useEffect(() => {
    (async () => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      setAgent(a);
      if (!a) setNotFound(true);
    })();
  }, [agentId, getAgent]);

  // kick off the call exactly once
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
    setCallCompleted(true);
    // For enterprise clients, don't redirect to protected routes
    // Show completion message instead of navigating
  };

  if (notFound) {
    return (
      <div className="bg-red-50 text-red-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>Agent not found</p>
      </div>
    );
  }

  if (callCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Call Completed</h2>
          <p className="text-gray-600 mb-4">Thank you for using {agent?.name || 'our AI agent'}!</p>
          <p className="text-sm text-gray-500">Duration: {formatTime(duration)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 bg-white border-b shadow">
        <h1 className="text-lg font-semibold">{agent?.name || 'AI Agent'}</h1>
        <span className="text-sm text-gray-500">
          {status === 'active' ? `${formatTime(duration)} elapsed` : status}
        </span>
      </header>

      {/* TRANSCRIPT */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {transcript ? (
          <div className="w-full max-w-2xl bg-white border rounded-lg p-4 mb-6 shadow">
            <p className="whitespace-pre-wrap">{transcript}</p>
          </div>
        ) : (
          <p className="text-gray-400 mb-6">Start speaking to begin the conversation</p>
        )}

        {errorMessage && (
          <div className="w-full max-w-2xl bg-red-50 text-red-800 px-4 py-3 rounded mb-6 shadow">
            {errorMessage}
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex items-center space-x-4">
          <ControlButton
            onClick={toggleMicrophone}
            label={isMicrophoneActive ? 'Mute' : 'Unmute'}
            variant={isMicrophoneActive ? 'outline' : 'primary'}
          />

          {agent?.canSeeScreenshare && (
            <ControlButton
              onClick={toggleScreenShare}
              label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
              variant={isScreenSharing ? 'primary' : 'outline'}
            />
          )}

          <ControlButton
            onClick={toggleHighlightObjects}
            label={highlightObjects ? 'Hide Boxes' : 'Show Boxes'}
            variant={highlightObjects ? 'primary' : 'outline'}
          />

          <ControlButton
            onClick={handleEnd}
            label="End Call"
            variant="destructive"
          />
        </div>
      </main>
    </div>
  );
};
