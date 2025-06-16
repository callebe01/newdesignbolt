// src/components/AgentCall.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { formatTime } from '../../utils/format';

// A simple styled button
const ControlButton: React.FC<{
  onClick: () => void;
  label: string;
  bg: string;
  hoverBg: string;
}> = ({ onClick, label, bg, hoverBg }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center space-x-2
      px-4 py-2 rounded-full font-medium text-white
      bg-${bg} hover:bg-${hoverBg}
      transition-colors
    `}
  >
    <span>{label}</span>
  </button>
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

  const [agent, setAgent] = useState<Agent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const startedRef = useRef(false);

  // Load the agent
  useEffect(() => {
    (async () => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      setAgent(a);
      if (!a) setNotFound(true);
    })();
  }, [agentId, getAgent]);

  // Start the call once
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
      <div className="bg-red-100 text-red-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>Agent not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-white shadow">
        <h1 className="text-lg font-semibold">{agent?.name || 'AI Agent'}</h1>
        <span className="text-sm text-gray-500">
          {status === 'active' ? `${formatTime(duration)} elapsed` : status}
        </span>
      </header>

      {/* Transcript area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {transcript ? (
          <div className="w-full max-w-2xl bg-white border rounded-lg p-4 mb-6 shadow">
            <p className="whitespace-pre-wrap">{transcript}</p>
          </div>
        ) : (
          <p className="text-gray-400 mb-6">Start speaking to begin the conversation</p>
        )}

        {errorMessage && (
          <div className="mb-6 w-full max-w-2xl bg-red-100 text-red-800 px-4 py-3 rounded shadow">
            {errorMessage}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <ControlButton
            onClick={toggleMicrophone}
            label={isMicrophoneActive ? '🔇 Mute' : '🎙️ Unmute'}
            bg={isMicrophoneActive ? 'blue-600' : 'gray-600'}
            hoverBg={isMicrophoneActive ? 'blue-700' : 'gray-700'}
          />

          {agent?.canSeeScreenshare && (
            <ControlButton
              onClick={toggleScreenShare}
              label={isScreenSharing ? '🛑 Stop Share' : '🖥️ Share Screen'}
              bg={isScreenSharing ? 'green-600' : 'gray-600'}
              hoverBg={isScreenSharing ? 'green-700' : 'gray-700'}
            />
          )}

          <ControlButton
            onClick={handleEnd}
            label="❌ End Call"
            bg="red-600"
            hoverBg="red-700"
          />
        </div>
      </main>
    </div>
  );
};
