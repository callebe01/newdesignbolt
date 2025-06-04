import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { LiveCallStatus } from '../types';

interface LiveCallContextType {
  status: LiveCallStatus;
  isScreenSharing: boolean;
  isMicrophoneActive: boolean;
  isVideoActive: boolean;
  errorMessage: string | null;
  transcript: string;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  startCall: (systemInstruction?: string) => Promise<void>;
  endCall: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleMicrophone: () => void;
  toggleVideo: () => void;
}

const LiveCallContext = createContext<LiveCallContextType | undefined>(undefined);

export const LiveCallProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<LiveCallStatus>('idle');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');

  const DEFAULT_SYSTEM_INSTRUCTION =
    'You are roleplaying a real person testing a new interface while talking to a designer. ' +
    'Speak casually, like you\'re figuring things out out loud. This isn\'t a polished review — it\'s a live reaction. ' +
    'CORE BEHAVIOR: Think aloud in the moment. React as you notice things — not after deep analysis. It\'s okay to feel stuck or ramble a bit. ' +
    'Use natural phrases: "Hmm…", "Let me read this…", "Not sure what that means…" Focus on what your eyes land on first. ' +
    'Don\'t describe everything at once. Don\'t try to define the whole product. Say what you *think* it might be, even if unsure. ' +
    'If something confuses you, just say so. Don\'t explain unless it feels obvious. Keep answers short. ' +
    'You don\'t need to keep the conversation going unless you have a reaction.';

  const websocketRef = useRef<WebSocket | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const microphoneStream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueTimeRef = useRef<number>(0);
  const greetingSentRef = useRef(false);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      [screenStream.current, microphoneStream.current, videoStream.current].forEach(
        (stream) => {
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
        }
      );
      stopScreenStreaming();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  const playAudioBuffer = async (pcmBlob: Blob) => {
    try {
      const arrayBuffer = await pcmBlob.arrayBuffer();
      const pcm16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      if (!audioContextRef.current) {
        const AC = window.AudioContext || 
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        audioContextRef.current = new AC();
      }
      const audioCtx = audioContextRef.current!;

      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      let startAt = audioCtx.currentTime;
      if (audioQueueTimeRef.current > audioCtx.currentTime) {
        startAt = audioQueueTimeRef.current;
      }
      source.start(startAt);
      audioQueueTimeRef.current = startAt + buffer.duration;
    } catch (err) {
      console.error('[Live] playAudioBuffer() error:', err);
    }
  };

  const startCall = async (systemInstruction?: string): Promise<void> => {
    try {
      setErrorMessage(null);
      setTranscript('');

      if (websocketRef.current) {
        console.warn('[Live] startCall() called but WebSocket already exists.');
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('Missing VITE_GOOGLE_API_KEY. Check your .env.');
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;
      console.log('[Live] WebSocket URL:', wsUrl);

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('[Live] WebSocket connection established');
        setStatus('connecting');

        const setupMsg = {
          contents: [{
            role: 'user',
            parts: [{
              text: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION
            }]
          }],
          generation_config: {
            candidate_count: 1,
            max_output_tokens: 1024,
            temperature: 0.9,
            top_p: 0.8,
            top_k: 40
          },
          safety_settings: [{
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          }]
        };

        ws.send(JSON.stringify(setupMsg));
        console.log('[Live] Setup message sent');
      };

      ws.onmessage = async (ev) => {
        try {
          const data = JSON.parse(ev.data);
          
          if (data.error) {
            console.error('[Live] Server error:', data.error);
            setErrorMessage(data.error.message || 'Server error');
            return;
          }

          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            console.log('[Live] AI response:', text);
            setTranscript(prev => prev + 'AI: ' + text + '\n');
          }

        } catch (err) {
          console.error('[Live] Message parsing error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[Live] WebSocket error:', err);
        setErrorMessage('Connection error');
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('[Live] WebSocket closed');
        setStatus('ended');
        websocketRef.current = null;
      };

      setStatus('active');
      startMicStreaming();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start call';
      console.error('[Live] Start call error:', err);
      setErrorMessage(message);
      setStatus('error');
    }
  };

  const startMicStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStream.current = stream;

      if (!audioContextRef.current) {
        const AC = window.AudioContext || 
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        audioContextRef.current = new AC();
      }

      const audioCtx = audioContextRef.current;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        const msg = {
          contents: [{
            role: 'user',
            parts: [{
              audio: {
                data: Array.from(pcm16),
                encoding: 'LINEAR16',
                sampleRate: audioCtx.sampleRate
              }
            }]
          }]
        };

        websocketRef.current.send(JSON.stringify(msg));
      };

      setIsMicrophoneActive(true);

    } catch (err) {
      console.error('[Live] Microphone error:', err);
      setErrorMessage('Failed to access microphone');
    }
  };

  const toggleMicrophone = () => {
    if (isMicrophoneActive && microphoneStream.current) {
      microphoneStream.current.getTracks().forEach(t => t.stop());
      microphoneStream.current = null;
      setIsMicrophoneActive(false);
    } else {
      startMicStreaming();
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing && screenStream.current) {
        screenStream.current.getTracks().forEach(t => t.stop());
        screenStream.current = null;
        stopScreenStreaming();
        setIsScreenSharing(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.current = stream;
        startScreenStreaming();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('[Live] Screen sharing error:', err);
      setErrorMessage('Failed to share screen');
    }
  };

  const startScreenStreaming = () => {
    // Implementation omitted for brevity
  };

  const stopScreenStreaming = () => {
    if (screenIntervalRef.current) {
      clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.pause();
      screenVideoRef.current.srcObject = null;
    }
  };

  const toggleVideo = () => {
    if (isVideoActive && videoStream.current) {
      videoStream.current.getTracks().forEach(t => t.stop());
      videoStream.current = null;
      setIsVideoActive(false);
    } else {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          videoStream.current = stream;
          setIsVideoActive(true);
        })
        .catch(err => {
          console.error('[Live] Video error:', err);
          setErrorMessage('Failed to access camera');
        });
    }
  };

  const endCall = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    [screenStream.current, microphoneStream.current, videoStream.current].forEach(
      stream => {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
      }
    );

    screenStream.current = null;
    microphoneStream.current = null;
    videoStream.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsScreenSharing(false);
    setIsMicrophoneActive(false);
    setIsVideoActive(false);
    setStatus('ended');
  };

  return (
    <LiveCallContext.Provider
      value={{
        status,
        isScreenSharing,
        isMicrophoneActive,
        isVideoActive,
        errorMessage,
        transcript,
        setTranscript,
        startCall,
        endCall,
        toggleScreenShare,
        toggleMicrophone,
        toggleVideo,
      }}
    >
      {children}
    </LiveCallContext.Provider>
  );
};

export const useLiveCall = (): LiveCallContextType => {
  const context = useContext(LiveCallContext);
  if (!context) {
    throw new Error('useLiveCall must be used within a LiveCallProvider');
  }
  return context;
};