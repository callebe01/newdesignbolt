import React, { useState, useEffect } from 'react';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { VoicePilotUI } from './VoicePilotUI';

interface AgentWidgetProps {
  agentId: string;
  initialOpen?: boolean;
  exposeApi?: (api: {
    open: () => void;
    close: () => void;
    startCall: () => Promise<void>;
    endCall: () => void;
  }) => void;
}

export const AgentWidget: React.FC<AgentWidgetProps> = ({
  agentId,
  initialOpen = false,
  exposeApi
}) => {
  const [agent, setAgent] = useState<any>(null);
  const { 
    startCall, 
    endCall, 
    status, 
    transcript,
    toggleMicrophone,
    isMicrophoneActive,
    duration,
    errorMessage
  } = useLiveCall();
  const { getAgent } = useAgents();

  useEffect(() => {
    const loadAgent = async () => {
      const fetchedAgent = await getAgent(agentId);
      setAgent(fetchedAgent);
    };
    loadAgent();
  }, [agentId, getAgent]);

  const handleStartCall = async () => {
    if (!agent) return;
    await startCall(
      agent.instructions,
      agent.callDuration,
      agent.documentationUrls,
      agentId
    );
  };

  const handleEndCall = () => {
    endCall();
  };

  return (
    <VoicePilotUI
      agentName={agent?.name}
      status={status}
      duration={duration}
      transcript={transcript}
      errorMessage={errorMessage}
      isMicrophoneActive={isMicrophoneActive}
      onStartCall={handleStartCall}
      onEndCall={handleEndCall}
      onToggleMicrophone={toggleMicrophone}
      initialOpen={initialOpen}
      onApiExpose={exposeApi}
    />
  );
};