import React, { useState, useEffect } from 'react';
import { X, ChevronUp, MessageSquare, MessageSquareOff } from 'lucide-react';

interface VoicePilotUIProps {
  // Agent data
  agentName?: string;
  
  // Call state
  status: 'idle' | 'connecting' | 'active' | 'ended' | 'error';
  duration: number;
  transcript: string;
  errorMessage: string | null;
  isMicrophoneActive: boolean;
  
  // Callbacks
  onStartCall: () => Promise<void>;
  onEndCall: () => void;
  onToggleMicrophone: () => void;
  
  // Widget control
  initialOpen?: boolean;
  onApiExpose?: (api: {
    open: () => void;
    close: () => void;
    startCall: () => Promise<void>;
    endCall: () => void;
  }) => void;
}

export const VoicePilotUI: React.FC<VoicePilotUIProps> = ({
  agentName = 'Voice Pilot',
  status,
  duration,
  transcript,
  errorMessage,
  isMicrophoneActive,
  onStartCall,
  onEndCall,
  onToggleMicrophone,
  initialOpen = false,
  onApiExpose
}) => {
  const [isExpanded, setIsExpanded] = useState(initialOpen);
  const [showConsent, setShowConsent] = useState(false);
  const [showTranscriptContent, setShowTranscriptContent] = useState(true);

  // Format duration for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Close widget when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const widget = document.querySelector('.voicepilot-widget-container');
      if (widget && !widget.contains(event.target as Node) && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isExpanded]);

  // Expose API for external control
  useEffect(() => {
    if (onApiExpose) {
      onApiExpose({
        open: () => setIsExpanded(true),
        close: () => setIsExpanded(false),
        startCall: onStartCall,
        endCall: onEndCall,
      });
    }
  }, [onApiExpose, onStartCall, onEndCall]);

  const handleMinimizedClick = (e: React.MouseEvent) => {
    // Only expand if not clicking on action buttons and not connected
    if (!(e.target as Element).closest('.widget-actions') && status !== 'active') {
      setIsExpanded(!isExpanded);
    }
  };

  const expandWidget = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const startCall = () => {
    setShowConsent(true);
  };

  const acceptConsent = async () => {
    setShowConsent(false);
    try {
      await onStartCall();
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const cancelConsent = () => {
    setShowConsent(false);
  };

  const endCall = () => {
    onEndCall();
    setIsExpanded(false);
  };

  const toggleWidget = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleTranscript = () => {
    setShowTranscriptContent(!showTranscriptContent);
  };

  return (
    <div className="voicepilot-widget-container fixed bottom-6 right-6 z-50">
      {/* Minimized State */}
      <div 
        className={`
          bg-white rounded-3xl shadow-lg flex items-center cursor-pointer transition-all duration-300 
          px-4 py-2 gap-3 min-w-[140px] h-12 hover:shadow-xl hover:-translate-y-0.5
          ${status === 'active' ? 'animate-pulse shadow-blue-300' : ''}
        `}
        onClick={handleMinimizedClick}
      >
        {/* Logo */}
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex-shrink-0 overflow-hidden">
          <img 
            src="/logovp.png" 
            alt="Voice Pilot" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to gradient design if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="absolute top-1 left-1 w-6 h-6 bg-gradient-to-br from-cyan-600 to-blue-800 rounded-full transform rotate-45 origin-center" style="clip-path: polygon(0 0, 100% 0, 0 100%)"></div>';
              }
            }}
          />
        </div>
        
        {/* Brand Text (hidden when connected) */}
        {status !== 'active' && (
          <span className="font-semibold text-sm text-gray-800 whitespace-nowrap">
            Voice Pilot
          </span>
        )}
        
        {/* Duration when connected */}
        {status === 'active' && (
          <span className="font-semibold text-sm text-blue-600 whitespace-nowrap">
            {formatTime(duration)}
          </span>
        )}
        
        {/* Actions when connected */}
        {status === 'active' && (
          <div className="widget-actions flex gap-2 ml-auto">
            <button 
              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold hover:bg-red-600 hover:scale-110 transition-all"
              onClick={endCall}
              title="End Call"
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 hover:scale-110 transition-all"
              onClick={expandWidget}
              title="Expand"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Widget */}
      <div className={`
        absolute bottom-14 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100
        transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
        ${isExpanded 
          ? 'translate-y-0 scale-100 opacity-100 visible' 
          : 'translate-y-5 scale-95 opacity-0 invisible'
        }
      `}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-semibold text-gray-900">
            <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 overflow-hidden">
              <img 
                src="/logovp.png" 
                alt="Voice Pilot" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to gradient design if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="absolute top-0.5 left-0.5 w-5 h-5 bg-gradient-to-br from-cyan-600 to-blue-800 rounded-full transform rotate-45 origin-center" style="clip-path: polygon(0 0, 100% 0, 0 100%)"></div>';
                  }
                }}
              />
            </div>
            Voice Pilot
          </div>
          <button 
            className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
            onClick={toggleWidget}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Ready State */}
          {status === 'idle' && (
            <div>
              <div className="text-center text-gray-600 text-sm mb-4">
                Ready to help you navigate
              </div>
              <button 
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
                onClick={startCall}
              >
                Start Call
              </button>
            </div>
          )}

          {/* Connecting State */}
          {status === 'connecting' && (
            <div>
              <div className="text-center text-orange-500 text-sm mb-4">
                Connecting...
              </div>
              <div className="flex justify-center">
                <div className="w-6 h-6 border-3 border-gray-200 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          {/* Connected State */}
          {status === 'active' && (
            <div>
              <div className="text-center text-green-600 text-sm mb-4 flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Connected - Speak now
              </div>

              {/* Transcript Section */}
              {transcript && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Transcript</span>
                    <button
                      onClick={toggleTranscript}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title={showTranscriptContent ? "Hide transcript" : "Show transcript"}
                    >
                      {showTranscriptContent ? (
                        <MessageSquareOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {showTranscriptContent && (
                    <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm text-gray-700">
                      {transcript}
                    </div>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={onToggleMicrophone}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                    isMicrophoneActive 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isMicrophoneActive ? 'Mute' : 'Unmute'}
                </button>
              </div>

              <button 
                className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
                onClick={endCall}
              >
                End Call
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div>
              <div className="text-center text-red-500 text-sm mb-4">
                Connection failed
              </div>
              {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                  {errorMessage}
                </div>
              )}
              <button 
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
                onClick={startCall}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Ended State */}
          {status === 'ended' && (
            <div>
              <div className="text-center text-gray-500 text-sm mb-4">
                Call ended
              </div>
              <button 
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
                onClick={startCall}
              >
                Start New Call
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Consent Modal */}
      {showConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white p-8 rounded-2xl max-w-md mx-5 transform transition-transform duration-300">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Start Voice Session
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Your conversation will be recorded to help us provide better support. 
              You can end the session at any time.
            </p>
            <div className="flex gap-3">
              <button 
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                onClick={cancelConsent}
              >
                Cancel
              </button>
              <button 
                className="flex-1 py-3 bg-cyan-400 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                onClick={acceptConsent}
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};