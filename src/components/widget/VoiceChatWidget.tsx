import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, X, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveCall } from '../../context/LiveCallContext';
import { useAgents } from '../../context/AgentContext';
import { formatTime } from '../../utils/format';

interface VoiceChatWidgetProps {
  agentId: string;
}

export const VoiceChatWidget: React.FC<VoiceChatWidgetProps> = ({ agentId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
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
    setIsExpanded(false);
  };

  const minimize = () => setIsExpanded(false);

  const toggleWidget = () => {
    if (status === 'active') {
      setIsExpanded(!isExpanded);
    } else {
      setIsExpanded(true);
    }
  };

  useEffect(() => {
    if (!isExpanded) return;

    const handleClick = (e: MouseEvent) => {
      const expandedEl = document.getElementById('voicepilot-expanded');
      const toggleBtn = document.getElementById('voicepilot-toggle');
      if (
        expandedEl &&
        !expandedEl.contains(e.target as Node) &&
        toggleBtn &&
        !toggleBtn.contains(e.target as Node)
      ) {
        minimize();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isExpanded]);

  // ✅ IMPROVED: Better status text based on call state
  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'active':
        return `${formatTime(duration)} elapsed`;
      case 'error':
        return 'Connection failed';
      case 'ended':
        return 'Call ended';
      default:
        return 'Ready to help';
    }
  };

  // ✅ IMPROVED: Determine if start button should be disabled
  const isStartDisabled = status === 'connecting' || status === 'active';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="voicepilot-expanded"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{agent?.name || 'AI Assistant'}</h3>
                    <p className="text-xs opacity-90">
                      {getStatusText()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {status !== 'active' ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {status === 'connecting' 
                      ? 'Establishing connection...' 
                      : 'Start a voice conversation with your AI assistant'
                    }
                  </p>
                  <button
                    onClick={handleStartCall}
                    disabled={isStartDisabled}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                      isStartDisabled
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>
                      {status === 'connecting' ? 'Connecting...' : 'Start Voice Chat'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Live indicator */}
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">LIVE</span>
                  </div>

                  {/* Transcript */}
                  {transcript && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {transcript}
                      </p>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex space-x-2">
                    <button
                      onClick={toggleMicrophone}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                        isMicrophoneActive 
                          ? 'bg-primary text-white shadow-md' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {isMicrophoneActive ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <MicOff className="w-4 h-4" />
                      )}
                      <span>{isMicrophoneActive ? 'Mute' : 'Unmute'}</span>
                    </button>
                    
                    <button
                      onClick={handleEndCall}
                      className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg font-medium text-sm hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>End Call</span>
                    </button>
                  </div>

                  {/* Error message */}
                  {errorMessage && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs">
                      {errorMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        id="voicepilot-toggle"
        onClick={toggleWidget}
        className="bg-black dark:bg-gray-900 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center overflow-hidden group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          width: status === 'active' ? 'auto' : isExpanded ? 60 : 'auto',
        }}
      >
        {/* Icon circle */}
        <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 relative">
          {status === 'active' && (
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
          )}
          {status === 'connecting' && (
            <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse"></div>
          )}
          <Phone className="w-6 h-6 text-white" />
        </div>
        
        {/* Text (only show when not active or expanded) */}
        <AnimatePresence>
          {status !== 'active' && status !== 'connecting' && !isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-0 overflow-hidden"
            >
              <span className="font-semibold text-sm whitespace-nowrap">VOICE CHAT</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active call indicator */}
        {status === 'active' && !isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            className="px-4 py-0 overflow-hidden"
          >
            <span className="font-semibold text-xs whitespace-nowrap text-red-400">
              {formatTime(duration)}
            </span>
          </motion.div>
        )}

        {/* Connecting indicator */}
        {status === 'connecting' && !isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            className="px-4 py-0 overflow-hidden"
          >
            <span className="font-semibold text-xs whitespace-nowrap text-yellow-400">
              CONNECTING
            </span>
          </motion.div>
        )}
      </motion.button>
    </div>
  );
};