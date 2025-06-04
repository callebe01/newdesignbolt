import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, X } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { Agent } from '../../types';
import { saveTranscript } from '../../services/transcripts';
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
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-background">
      <div className="flex-1 flex items-center justify-center w-full">
        <div className={`w-40 h-40 rounded-full bg-gradient-to-b from-sky-200 to-sky-500 flex items-center justify-center ${status === 'active' ? 'animate-pulse-subtle' : ''}`}></div>
      </div>

      {errorMessage && (
        <div className="mb-4 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex space-x-6">
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
          variant="secondary"
          className="rounded-full w-16 h-16 shadow-lg"
          onClick={handleEnd}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};