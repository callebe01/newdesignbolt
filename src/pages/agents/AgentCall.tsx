import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { Button } from '../../components/ui/Button';

export const AgentCall: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getAgent } = useAgents();
  const { startCall, endCall, status, transcript, toggleMicrophone, toggleVideo, toggleScreenShare, isMicrophoneActive, isVideoActive, isScreenSharing } = useLiveCall();
  const agentRef = useRef<Agent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (!agentId) return;
      const a = await getAgent(agentId);
      agentRef.current = a;
      if (!a) {
        setNotFound(true);
      }
    };
    init();
  }, [agentId, getAgent]);

  useEffect(() => {
    if (!startedRef.current && agentRef.current) {
      startedRef.current = true;
      startCall(agentRef.current.instructions).catch((err) => console.error(err));
    }
  }, [startCall]);

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="text-sm text-muted-foreground">Status: {status}</div>
        <div className="flex gap-3">
          <Button variant={isMicrophoneActive ? 'primary' : 'outline'} onClick={toggleMicrophone}>Mic</Button>
          <Button variant={isScreenSharing ? 'primary' : 'outline'} onClick={() => toggleScreenShare()}>Share Screen</Button>
          <Button variant={isVideoActive ? 'primary' : 'outline'} onClick={toggleVideo}>Video</Button>
          <Button variant="destructive" onClick={handleEnd}>End Call</Button>
        </div>
        <div className="border rounded-md p-4 min-h-[200px] whitespace-pre-wrap">
          {transcript || 'No transcript yet.'}
        </div>
      </div>
    </div>
  );
};
