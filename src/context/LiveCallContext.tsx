import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

  // WebSocket and media stream refs
  const websocketRef = useRef<WebSocket | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const microphoneStream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueTimeRef = useRef<number>(0);
  const greetingSentRef = useRef(false);

  // Screen capture refs
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const startCall = async (systemInstruction?: string): Promise<void> => {
    try {
      setErrorMessage(null);
      setTranscript('');

      if (websocketRef.current) {
        console.warn('[Live] WebSocket already exists');
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('Missing VITE_GOOGLE_API_KEY. Check your .env file.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = 'gemini-2.0-flash-live-001';

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('[Live] Connection opened');
        setStatus('connecting');

        // Send setup message
        const setupMsg = {
          setup: {
            model,
            generationConfig: {
              responseModalities: ['TEXT'],
            },
            systemInstruction: {
              parts: [{ text: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION }],
            },
          },
        };

        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.setupComplete) {
            setStatus('active');
            if (!greetingSentRef.current) {
              ws.send(JSON.stringify({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: 'Hello!' }] }],
                  turnComplete: true,
                },
              }));
              greetingSentRef.current = true;
            }
            startMicStreaming();
            return;
          }

          if (data.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.text) {
                console.log('[Live] AI:', part.text);
                setTranscript(prev => prev + 'AI: ' + part.text + '\n');
              }
            }
          }

          if (data.serverContent?.inputTranscription?.text) {
            console.log('[Live] User:', data.serverContent.inputTranscription.text);
            setTranscript(prev => prev + 'User: ' + data.serverContent.inputTranscription.text + '\n');
          }
        } catch (err) {
          console.error('[Live] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[Live] WebSocket error:', error);
        setErrorMessage('Connection error occurred');
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('[Live] Connection closed');
        setStatus('ended');
        websocketRef.current = null;
      };

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
        audioContextRef.current = new (window.AudioContext || 
          (window as any).webkitAudioContext)();
      }

      const audioCtx = audioContextRef.current;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const payload = {
          realtime_input: {
            audio: {
              data: Array.from(pcm16),
              mime_type: 'audio/pcm;rate=16000',
            },
          },
        };

        websocketRef.current.send(JSON.stringify(payload));
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
    if (!screenStream.current || screenIntervalRef.current) return;

    let video = screenVideoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      screenVideoRef.current = video;
    }
    video.srcObject = screenStream.current;
    video.play().catch(() => {});

    let canvas = screenCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      screenCanvasRef.current = canvas;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const capture = () => {
      if (!screenStream.current || !websocketRef.current?.readyState === WebSocket.OPEN) return;
      if (!video!.videoWidth || !video!.videoHeight) return;

      canvas!.width = video!.videoWidth;
      canvas!.height = video!.videoHeight;
      ctx.drawImage(video!, 0, 0, canvas!.width, canvas!.height);

      canvas!.toBlob((blob) => {
        if (!blob || !websocketRef.current) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          const payload = {
            realtime_input: {
              video: { 
                data: base64,
                mime_type: blob.type
              }
            }
          };
          websocketRef.current.send(JSON.stringify(payload));
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg');
    };

    screenIntervalRef.current = window.setInterval(capture, 500);
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

    stopScreenStreaming();
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