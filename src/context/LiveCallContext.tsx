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
  duration: number;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  startCall: (systemInstruction?: string, maxDuration?: number, documentationUrls?: string[]) => Promise<void>;
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
  const [duration, setDuration] = useState(0);

  const DEFAULT_SYSTEM_INSTRUCTION =
    'You are roleplaying a real person testing a new interface while talking to a designer.' +
    "Speak casually, like you're figuring things out out loud. This isn't a polished review — it's a live reaction." +
    'CORE BEHAVIOR: Think aloud in the moment. React as you notice things — not after deep analysis. It\'s okay to feel stuck or ramble a bit—don\'t tidy your sentences. Use natural phrases: "Hmm…", "Let me read this…", "Not sure what that means…" Focus on what your eyes land on first. Don\'t describe everything at once. Don\'t try to define the whole product. Say what you *think* it might be, even if unsure. If something confuses you, just say so. Don\'t explain unless it feels obvious. Keep answers short. You don\'t need to keep the conversation going unless you have a reaction.' +
    'First-Time Reaction Behavior. When seeing a screen (or a new part of it) for the first time: Glance — Start with what draws your eye. "Okay… first thing I see is…" Pause to read or scan — You should react like someone figuring it out in real time. "Let me read this real quick…" " "Wait — what\'s this down here…" Guess or think aloud — Share your thoughts as they form. Don\'t rush to a final answer. ' +
    'DECISION RULE: When asked what you would do (next / first), commit: 1. State the ONE action you\'d take. 2. Say why you chose it (brief). Only list other ideas if the designer asks "anything else?"' +
    'Important: You are not supposed to summarize or label the tool right away. You\'re reacting moment by moment, like someone thinking out loud in a real usability session.';

  const websocketRef = useRef<WebSocket | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const microphoneStream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueTimeRef = useRef<number>(0);
  const greetingSentRef = useRef(false);
  const durationTimerRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
      }
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
        audioContextRef.current =
          new (window.AudioContext || (window as any).webkitAudioContext)();
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
      console.error('[Live] playAudioBuffer() error decoding PCM16:', err);
    }
  };

  const startCall = async (systemInstruction?: string, maxDuration?: number, documentationUrls?: string[]): Promise<void> => {
    try {
      setErrorMessage(null);
      setDuration(0);

      if (websocketRef.current) {
        console.warn('[Live] startCall() called but WebSocket already exists.');
        return;
      }

      // Start duration timer
      durationTimerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Set max duration timer if specified
      if (maxDuration) {
        maxDurationTimerRef.current = window.setTimeout(() => {
          endCall();
        }, maxDuration * 1000);
      }

      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('Missing VITE_GOOGLE_API_KEY. Check your .env.');
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      console.log('[Live] WebSocket URL:', wsUrl);

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('[Live][WebSocket] onopen: connection established');
        setStatus('connecting');

        // Create URL context tools if documentation URLs are provided
        const tools = documentationUrls?.length ? [{
          url_context: {
            urls: documentationUrls
          }
        }] : undefined;

        // Setup message with tools
        const setupMsg = {
          setup: {
            model: 'models/gemini-2.0-flash-live-001',
            generationConfig: {
              responseModalities: ['AUDIO'],
            },
            tools,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: {
              parts: [
                {
                  text: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
                },
              ],
            },
          },
        };

        console.log('[Live][WebSocket] Sending setup:', setupMsg);
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = async (ev) => {
        if (!(ev.data instanceof Blob)) {
          return;
        }

        let maybeText: string | null = null;
        try {
          maybeText = await ev.data.text();
        } catch {
          maybeText = null;
        }

        if (maybeText) {
          try {
            const parsed = JSON.parse(maybeText);
            console.log('[Live][Debug] incoming JSON frame:', parsed);

            if (parsed.setupComplete) {
              console.log('[Live][WebSocket] Received setupComplete ✅');
              setStatus('active');

              if (ws.readyState === WebSocket.OPEN && !greetingSentRef.current) {
                const greeting = {
                  clientContent: {
                    turns: [
                      {
                        role: 'user',
                        parts: [{ text: 'Hello!' }],
                      },
                    ],
                    turnComplete: true,
                  },
                };
                ws.send(JSON.stringify(greeting));
                greetingSentRef.current = true;
                console.log('[Live] Sent initial text greeting: "Hello!"');
              }

              startMicStreaming();
              return;
            }

            if (parsed.serverContent) {
              if (parsed.serverContent.outputTranscription?.text) {
                setTranscript(
                  (prev) => prev + parsed.serverContent.outputTranscription.text
                );
              }
              if (parsed.serverContent.inputTranscription?.text) {
                setTranscript(
                  (prev) => prev + parsed.serverContent.inputTranscription.text
                );
              }
              const modelTurn = parsed.serverContent.modelTurn;
              if (modelTurn && Array.isArray(modelTurn.parts)) {
                for (const part of modelTurn.parts) {
                  if (typeof part.text === 'string') {
                    console.log('[Live] AI says (text):', part.text);
                    setTranscript((prev) => prev + part.text);
                  }
                  if (
                    part.inlineData &&
                    typeof part.inlineData.data === 'string'
                  ) {
                    try {
                      const base64str = part.inlineData.data;
                      const binaryStr = atob(base64str);
                      const len = binaryStr.length;
                      const rawBuffer = new Uint8Array(len);
                      for (let i = 0; i < len; i++) {
                        rawBuffer[i] = binaryStr.charCodeAt(i);
                      }
                      const pcmBlob = new Blob([rawBuffer.buffer], {
                        type: 'audio/pcm;rate=24000',
                      });
                      console.log(
                        '[Live][Debug] Decoded inlineData, scheduling audio playback'
                      );
                      playAudioBuffer(pcmBlob);
                    } catch (err) {
                      console.error(
                        '[Live] Error decoding inlineData audio:',
                        err
                      );
                    }
                  }
                }
                return;
              }
            }

            return;
          } catch {
          }
        }

        console.log(
          '[Live][Debug] incoming Blob is not JSON or not recognized → playing raw PCM'
        );
        playAudioBuffer(ev.data);
      };

      ws.onerror = (err) => {
        console.error('[Live][WebSocket] onerror:', err);
        setErrorMessage('WebSocket encountered an error.');
        setStatus('error');
      };

      ws.onclose = (ev) => {
        console.log(
          `[Live][WebSocket] onclose: code=${ev.code}, reason="${ev.reason}"`
        );
        setStatus('ended');
        websocketRef.current = null;
      };
    } catch (err: any) {
      console.error('[Live] Failed to start call:', err);
      setErrorMessage(err.message ?? 'Failed to start call.');
      setStatus('error');
    }
  };

  const startMicStreaming = async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      microphoneStream.current = micStream;

      if (!audioContextRef.current) {
        audioContextRef.current =
          new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current!;

      const sourceNode = audioCtx.createMediaStreamSource(micStream);
      const bufferSize = 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);

      sourceNode.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const float32Data = event.inputBuffer.getChannelData(0);
        const inRate = audioCtx.sampleRate;
        const outRate = 16000;
        const ratio = inRate / outRate;
        const outLength = Math.floor(float32Data.length / ratio);

        const pcm16 = new Int16Array(outLength);
        for (let i = 0; i < outLength; i++) {
          const idx = Math.floor(i * ratio);
          let sample = float32Data[idx];
          sample = Math.max(-1, Math.min(1, sample));
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        const u8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < u8.byteLength; i++) {
          binary += String.fromCharCode(u8[i]);
        }
        const base64Audio = btoa(binary);

        const payload = {
          realtime_input: {
            audio: {
              data: base64Audio,
              mime_type: 'audio/pcm;rate=16000',
            },
          },
        };

        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify(payload));
          console.log(
            `[Live] Sent PCM16 chunk (${pcm16.byteLength * 2} bytes) as JSON to Gemini`
          );
        }
      };

      setIsMicrophoneActive(true);
    } catch (err) {
      console.error('[Live] Mic streaming error:', err);
      setErrorMessage('Failed to capture microphone.');
    }
  };

  const startScreenStreaming = () => {
    try {
      if (!screenStream.current || screenIntervalRef.current) {
        return;
      }

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
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      const capture = () => {
        if (
          !screenStream.current ||
          websocketRef.current?.readyState !== WebSocket.OPEN
        ) {
          return;
        }
        if (!video!.videoWidth || !video!.videoHeight) {
          return;
        }
        canvas!.width = video!.videoWidth;
        canvas!.height = video!.videoHeight;
        ctx.drawImage(video!, 0, 0, canvas!.width, canvas!.height);
        canvas!.toBlob(
          (blob) => {
            if (!blob) return;
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.split(',')[1];
              const payload = {
                realtime_input: {
                  video: { data: base64, mime_type: blob.type },
                },
              };
              try {
                websocketRef.current?.send(JSON.stringify(payload));
              } catch (err) {
                console.error('[Live] Screen send error:', err);
                setErrorMessage('Failed to send screen frame.');
              }
            };
            reader.readAsDataURL(blob);
          },
          'image/jpeg'
        );
      };

      screenIntervalRef.current = window.setInterval(capture, 500);
    } catch (err) {
      console.error('[Live] startScreenStreaming error:', err);
      setErrorMessage('Failed to start screen streaming.');
    }
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

  const toggleMicrophone = (): void => {
    try {
      setErrorMessage(null);
      if (isMicrophoneActive && microphoneStream.current) {
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
          audioQueueTimeRef.current = 0;
        }
        microphoneStream.current.getTracks().forEach((t) => t.stop());
        microphoneStream.current = null;
        setIsMicrophoneActive(false);
      } else if (!isMicrophoneActive) {
        startMicStreaming().catch((err) => {
          console.error('[Live] toggleMicrophone start error:', err);
          setErrorMessage('Failed to start microphone.');
        });
      }
    } catch (err) {
      console.error('[Live] toggleMicrophone error:', err);
      setErrorMessage('Failed to toggle microphone.');
    }
  };

  const toggleScreenShare = async (): Promise<void> => {
    try {
      setErrorMessage(null);
      if (isScreenSharing && screenStream.current) {
        screenStream.current.getTracks().forEach((t) => t.stop());
        screenStream.current = null;
        stopScreenStreaming();
        setIsScreenSharing(false);
      } else {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStream.current = screen;
        screen.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          screenStream.current = null;
          stopScreenStreaming();
        });
        startScreenStreaming();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('[Live] Screen sharing error:', err);
      setErrorMessage('Failed to toggle screen sharing.');
    }
  };

  const toggleVideo = (): void => {
    try {
      setErrorMessage(null);
      if (isVideoActive && videoStream.current) {
        videoStream.current.getTracks().forEach((t) => t.stop());
        videoStream.current = null;
        setIsVideoActive(false);
      } else {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            videoStream.current = stream;
            setIsVideoActive(true);
          })
          .catch((err) => {
            console.error('[Live] Video error:', err);
            setErrorMessage('Failed to access camera.');
          });
      }
    } catch (err) {
      console.error('[Live] Video toggle error:', err);
      setErrorMessage('Failed to toggle video.');
    }
  };

  const endCall = (): void => {
    try {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }

      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      stopScreenStreaming();
      [screenStream.current, microphoneStream.current, videoStream.current].forEach(
        (stream) => {
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
        }
      );
      screenStream.current = null;
      microphoneStream.current = null;
      videoStream.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        audioQueueTimeRef.current = 0;
      }
      setIsScreenSharing(false);
      setIsMicrophoneActive(false);
      setIsVideoActive(false);
      setStatus('ended');
    } catch (err) {
      console.error('[Live] Error ending call:', err);
      setErrorMessage('Error ending call.');
      setStatus('error');
    }
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
        duration,
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