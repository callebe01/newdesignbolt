import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Monitor, X, MessageCircle, PhoneCall, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveCall } from '../../context/LiveCallContext';
import { useAgents } from '../../context/AgentContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
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

type WidgetState = 'expanded' | 'minimized' | 'closed';

export const AgentWidget: React.FC<AgentWidgetProps> = ({
  agentId,
  initialOpen = false,
  exposeApi
}) => {
  const [widgetState, setWidgetState] = useState<WidgetState>(initialOpen ? 'expanded' : 'minimized');
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  
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
    setWidgetState('minimized');
  };

  const handleConsentAgree = async () => {
    setShowConsentDialog(false);
    await handleStartCall();
  };

  const handleConsentCancel = () => {
    setShowConsentDialog(false);
  };

  const handleStartCallClick = () => {
    setShowConsentDialog(true);
  };

  useEffect(() => {
    if (!exposeApi) return;
    exposeApi({
      open: () => setWidgetState('expanded'),
      close: () => setWidgetState('closed'),
      startCall: handleStartCallClick,
      endCall: handleEndCall,
    });
  }, [exposeApi, handleStartCall]);

  // Don't render anything if closed
  if (widgetState === 'closed') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {widgetState === 'expanded' && (
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
                    setWidgetState('minimized');
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
                      <h3 className="font-semibold text-sm">{agent?.name || 'Voice Pilot'}</h3>
                    </div>

                    {status !== 'active' ? (
                      <>
                        <p className="text-sm mt-1 text-muted-foreground">
                          Ready to help you navigate
                        </p>
                        <button
                          onClick={handleStartCallClick}
                          disabled={status === 'connecting'}
                          className="mt-3 w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PhoneCall className="w-4 h-4" />
                          {status === 'connecting' ? 'Connecting...' : 'Start Call'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-sm mt-1 text-muted-foreground">
                          {formatTime(duration)} elapsed
                        </div>

                        {transcript && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">Conversation</span>
                              <button
                                onClick={() => setShowTranscript(!showTranscript)}
                                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                              >
                                {showTranscript ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {showTranscript ? 'Hide' : 'Show'}
                              </button>
                            </div>
                            {showTranscript && (
                              <div className="p-3 bg-muted rounded-lg text-sm max-h-32 overflow-y-auto">
                                {transcript}
                              </div>
                            )}
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

        {widgetState === 'minimized' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center bg-white dark:bg-gray-900 rounded-full shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Agent Icon Button */}
            <button
              onClick={() => setWidgetState('expanded')}
              className="w-12 h-12 bg-gradient-to-b from-sky-200 to-sky-500 rounded-full flex items-center justify-center hover:from-sky-300 hover:to-sky-600 transition-colors"
              aria-label="Open Voice Pilot"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full" />
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                if (status === 'active') {
                  handleEndCall();
                }
                setWidgetState('closed');
              }}
              className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Expand Button */}
            <button
              onClick={() => setWidgetState('expanded')}
              className="w-12 h-12 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-colors"
              aria-label="Expand"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent Dialog */}
      <Dialog
        isOpen={showConsentDialog}
        onClose={handleConsentCancel}
        title="Start Voice Call"
        footer={
          <>
            <Button variant="outline" onClick={handleConsentCancel}>
              Cancel
            </Button>
            <Button onClick={handleConsentAgree}>
              Agree & Start Call
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will start a voice conversation with our AI assistant. The call may be recorded for quality and training purposes.
          </p>
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">What to expect:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Voice conversation with AI assistant</li>
              <li>• Microphone access will be requested</li>
              <li>• Call duration: up to {Math.floor((agent?.callDuration || 300) / 60)} minutes</li>
            </ul>
          </div>
        </div>
      </Dialog>
    </div>
  );
};