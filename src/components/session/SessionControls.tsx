import React from 'react';
import { Mic, MicOff, Monitor, Video, VideoOff, PhoneOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatTime } from '../../utils/format';
import { useLiveCall } from '../../context/LiveCallContext';
import { useSession } from '../../context/SessionContext';

interface SessionControlsProps {
  onEndSession: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({ onEndSession }) => {
  const { 
    isMicrophoneActive, 
    isVideoActive, 
    isScreenSharing,
    toggleMicrophone,
    toggleVideo,
    toggleScreenShare,
    endCall,
  } = useLiveCall();
  
  const { sessionDuration } = useSession();

  const handleEndSession = () => {
    endCall();
    onEndSession();
  };

  return (
    <div className="rounded-lg bg-card border border-border p-6 space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold mb-1">Session Controls</h2>
        <div className="text-2xl font-bold text-primary">
          {formatTime(sessionDuration)} elapsed
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Button
          variant={isMicrophoneActive ? 'primary' : 'outline'}
          size="lg"
          onClick={toggleMicrophone}
          className="flex flex-col items-center py-4 h-auto"
        >
          {isMicrophoneActive ? (
            <Mic className="h-6 w-6 mb-1" />
          ) : (
            <MicOff className="h-6 w-6 mb-1" />
          )}
          <span className="text-xs mt-1">
            {isMicrophoneActive ? 'Mute' : 'Unmute'}
          </span>
        </Button>

        <Button
          variant={isScreenSharing ? 'primary' : 'outline'}
          size="lg"
          onClick={() => toggleScreenShare()}
          className="flex flex-col items-center py-4 h-auto"
        >
          <Monitor className="h-6 w-6 mb-1" />
          <span className="text-xs mt-1">
            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
          </span>
        </Button>

        <Button
          variant={isVideoActive ? 'primary' : 'outline'}
          size="lg"
          onClick={toggleVideo}
          className="flex flex-col items-center py-4 h-auto"
        >
          {isVideoActive ? (
            <Video className="h-6 w-6 mb-1" />
          ) : (
            <VideoOff className="h-6 w-6 mb-1" />
          )}
          <span className="text-xs mt-1">
            {isVideoActive ? 'Stop Video' : 'Start Video'}
          </span>
        </Button>
      </div>

      <Button
        variant="destructive"
        size="lg"
        fullWidth
        onClick={handleEndSession}
        className="mt-6"
      >
        <PhoneOff className="mr-2 h-5 w-5" />
        End Session
      </Button>
    </div>
  );
};