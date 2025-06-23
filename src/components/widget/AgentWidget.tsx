import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Monitor, X, MessageCircle, BoxSelect } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveCall } from '../../context/LiveCallContext';
import { useAgents } from '../../context/AgentContext';
import { formatTime } from '../../utils/format';

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
  const [isOpen, setIsOpen] = useState(initialOpen);
  const { 
    startCall, 
    endCall, 
    status, 
    transcript,
    toggleMicrophone,
    toggleScreenShare,
    isScreenSharing,
    highlightObjects,
    toggleHighlightObjects,
    isMicrophoneActive,
    duration,
    errorMessage
  } = useLiveCall();
  const { getAgent } = useAgents();
  const [agent, setAgent] = useState<any>(null);

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
      agent.documentationUrls
    );
  };

  const handleEndCall = () => {
    endCall();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!exposeApi) return;
    exposeApi({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      startCall: handleStartCall,
      endCall: handleEndCall,
    });
  }, [exposeApi, handleStartCall]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-[320px] rounded-2xl shadow-xl border border-border bg-card relative mb-4">
              <button
                onClick={() => {
                  if (status === 'active') {
                    handleEndCall();
                  } else {
                    setIsOpen(false);
                  }
                }}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-4">
                <div className="flex gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-sky-200 to-sky-500" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{agent?.name || 'AI Agent'}</h3>
                    </div>

                    {status !== 'active' ? (
                      <>
                        <p className="text-sm mt-1 text-muted-foreground">
                          Ready to help. Start a call to get voice guidance.
                        </p>
                        <button
                          onClick={handleStartCall}
                          className="mt-3 w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Mic className="w-4 h-4" />
                          Start Call
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-sm mt-1 text-muted-foreground">
                          {formatTime(duration)} elapsed
                        </div>

                        {transcript && (
                          <div className="mt-3 p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto">
                            {transcript}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={toggleMicrophone}
                            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                              isMicrophoneActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {isMicrophoneActive ? (
                              <Mic className="w-4 h-4" />
                            ) : (
                              <MicOff className="w-4 h-4" />
                            )}
                            {isMicrophoneActive ? 'Mute' : 'Unmute'}
                          </button>

                          {agent?.canSeeScreenshare && (
                            <button
                              onClick={toggleScreenShare}
                              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                                isScreenSharing
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <Monitor className="w-4 h-4" />
                              {isScreenSharing ? 'Stop Share' : 'Share'}
                            </button>
                          )}

                          <button
                            onClick={toggleHighlightObjects}
                            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                              highlightObjects
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <BoxSelect className="w-4 h-4" />
                            {highlightObjects ? 'Hide Boxes' : 'Show Boxes'}
                          </button>
                        </div>
                      </>
                    )}

                    {errorMessage && (
                      <div className="mt-3 p-2 text-sm bg-destructive/10 text-destructive rounded-md">
                        {errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full shadow-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          aria-label="Open Agent Chat"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};