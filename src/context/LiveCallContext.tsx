import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { LiveCallStatus } from '../types';
import { useAuth } from './AuthContext';
import { saveTranscript, saveTranscriptBeacon } from '../services/transcripts';
import { runToolCall } from '../services/runToolCall';
import { supabase } from '../services/supabase';

const env: any =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

interface LiveCallContextType {
  status: LiveCallStatus;
  isScreenSharing: boolean;
  isMicrophoneActive: boolean;
  isVideoActive: boolean;
  errorMessage: string | null;
  transcript: string;
  duration: number;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  startCall: (systemInstruction?: string, maxDuration?: number, documentationUrls?: string[], agentId?: string) => Promise<void>;
  endCall: (fromUnload?: boolean) => void;
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
  const { user } = useAuth();

  const websocketRef = useRef<WebSocket | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const microphoneStream = useRef<MediaStream | null>(null);
  const videoStream = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueTimeRef = useRef<number>(0);
  const greetingSentRef = useRef(false);
  const durationTimerRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);
  const usageRecordedRef = useRef(false);
  const callEndedRef = useRef(false);
  const agentOwnerIdRef = useRef<string | null>(null);
  const currentAgentIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  // ✅ TWO-BUFFER SYSTEM FOR REAL-TIME TRANSCRIPTION
  const committedTextRef = useRef<string>(''); // All finalized text
  const partialTextRef = useRef<string>('');   // Current in-flight fragment

  // ✅ PAGE CONTEXT MONITORING REFS
  const currentPageContextRef = useRef<string>('');
  const lastSentPageContextRef = useRef<string>('');
  const pageContextIntervalRef = useRef<number | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvas | null>(null);
  const screenIntervalRef = useRef<number | null>(null);

  const handleBeforeUnload = () => {
    endCall(true);
  };

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
      }
      if (pageContextIntervalRef.current) {
        clearInterval(pageContextIntervalRef.current);
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
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // ✅ HELPER FUNCTION TO UPDATE TRANSCRIPT WITH TWO-BUFFER SYSTEM
  const updateTranscriptDisplay = () => {
    const committed = committedTextRef.current;
    const partial = partialTextRef.current;
    
    // Smart spacing: add space between committed and partial if needed
    let fullText = committed;
    if (committed && partial) {
      const needsSpace = !committed.endsWith(' ') && !partial.startsWith(' ');
      fullText = committed + (needsSpace ? ' ' : '') + partial;
    } else if (partial) {
      fullText = partial;
    }
    
    setTranscript(fullText);
  };

  const playAudioBuffer = async (pcmBlob: Blob) => {
    try {
      // ✅ ADDED: Log audio buffer reception
      console.log('[Live][Audio] Received audio buffer, size:', pcmBlob.size, 'bytes');
      
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
      
      // ✅ ADDED: Log successful audio playback
      console.log('[Live][Audio] Playing audio buffer, duration:', buffer.duration.toFixed(3), 'seconds');
    } catch (err) {
      console.error('[Live] playAudioBuffer() error decoding PCM16:', err);
    }
  };

  // ✅ NEW: Get page context for AI system instruction
  const getPageContext = (): string => {
    try {
      if (typeof window !== 'undefined' && window.voicePilotGetPageContext) {
        return window.voicePilotGetPageContext();
      }
    } catch (error) {
      console.warn('[Live] Error getting page context:', error);
    }
    
    // Fallback context
    return `Page: ${document.title || 'Unknown'}, URL: ${window.location.pathname}`;
  };

  // ✅ NEW: Monitor page context changes during active call
  const startPageContextMonitoring = () => {
    if (pageContextIntervalRef.current) {
      clearInterval(pageContextIntervalRef.current);
    }

    pageContextIntervalRef.current = window.setInterval(() => {
      if (status !== 'active' || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        const newContext = getPageContext();
        currentPageContextRef.current = newContext;

        // Check if context has changed significantly
        if (newContext !== lastSentPageContextRef.current) {
          console.log('[Live] Page context changed, updating AI:', newContext);
          
          // Send page context update to AI
          const contextUpdateMessage = {
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ 
                    text: `PAGE CONTEXT UPDATE: ${newContext}` 
                  }],
                },
              ],
              turnComplete: true,
            },
          };

          websocketRef.current.send(JSON.stringify(contextUpdateMessage));
          lastSentPageContextRef.current = newContext;
          
          console.log('[Live] Sent page context update to AI');
        }
      } catch (error) {
        console.warn('[Live] Error monitoring page context:', error);
      }
    }, 2000); // Check every 2 seconds
  };

  const stopPageContextMonitoring = () => {
    if (pageContextIntervalRef.current) {
      clearInterval(pageContextIntervalRef.current);
      pageContextIntervalRef.current = null;
    }
  };

  const checkAgentOwnerUsage = async (agentId: string): Promise<boolean> => {
    try {
      // Get the current session to access the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/check-agent-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ 
            agentId,
            estimatedDuration: 5 // Estimate 5 minutes for the check
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check usage');
      }

      const result = await response.json();
      agentOwnerIdRef.current = result.ownerId;
      return result.canUse;
    } catch (err) {
      console.error('Error checking agent owner usage:', err);
      return false;
    }
  };

  const recordAgentUsage = async (agentId: string, minutes: number): Promise<void> => {
    try {
      // Get the current session to access the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/record-agent-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ 
            agentId,
            minutes
          })
        }
      );
    } catch (err) {
      console.error('Error recording agent usage:', err);
    }
  };

  const createConversationRecord = async (agentId: string): Promise<string | null> => {
    try {
      console.log(`[Live] Creating conversation record for agent ${agentId}`);

      // Get the current session to access the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Use the Edge Function to create the conversation record
      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/create-conversation-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ agentId })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create conversation record');
      }

      const result = await response.json();
      console.log('Created conversation record via Edge Function:', result.conversationId);
      return result.conversationId;
    } catch (err) {
      console.error('Error creating conversation record:', err);
      return null;
    }
  };

  const endConversationRecord = async (conversationId: string, duration: number): Promise<void> => {
    try {
      console.log(`[Live] Ending conversation record ${conversationId} with duration ${duration}s`);

      // Get the current session to access the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Use the Edge Function to update the conversation record
      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/end-conversation-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            conversationId,
            duration,
            sentimentScore: null // Could be calculated from transcript analysis in the future
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to end conversation record');
      }

      const result = await response.json();
      console.log('Successfully ended conversation record:', result);
    } catch (err) {
      console.error('Error ending conversation record:', err);
      // Don't throw here to avoid breaking the call end flow
    }
  };

  const saveConversationMessages = async (conversationId: string, transcript: string): Promise<void> => {
    try {
      console.log(`[Live] Saving conversation messages for ${conversationId}`);

      // Get the current session to access the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Use the Edge Function to save conversation messages
      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/save-conversation-messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            conversationId,
            content: transcript
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save conversation messages');
      }

      const result = await response.json();
      console.log('Saved conversation messages for:', conversationId);
    } catch (err) {
      console.error('Error saving conversation messages:', err);
      // Don't throw here to avoid breaking the call end flow
    }
  };

  const startCall = async (systemInstruction?: string, maxDuration?: number, documentationUrls?: string[], agentId?: string): Promise<void> => {
    try {
      // ✅ IMPROVED: Check for existing WebSocket and handle stale connections
      if (websocketRef.current) {
        const ws = websocketRef.current;
        
        // Check the readyState of the existing WebSocket
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.warn('[Live] startCall() called but WebSocket is already active or connecting.');
          return;
        } else if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
          console.log('[Live] Clearing stale WebSocket reference (state:', ws.readyState, ')');
          // Attempt to close if still closing, then clear the reference
          if (ws.readyState === WebSocket.CLOSING) {
            try {
              ws.close();
            } catch (error) {
              console.warn('[Live] Error closing stale WebSocket:', error);
            }
          }
          websocketRef.current = null;
        }
      }

      setErrorMessage(null);
      setDuration(0);
      usageRecordedRef.current = false;
      currentAgentIdRef.current = agentId || null;
      conversationIdRef.current = null;
      callEndedRef.current = false;
      
      // ✅ CLEAR BOTH BUFFERS AND TRANSCRIPT
      committedTextRef.current = '';
      partialTextRef.current = '';
      setTranscript('');
      
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Check agent owner's usage limits if agentId is provided
      if (agentId) {
        const canUse = await checkAgentOwnerUsage(agentId);
        if (!canUse) {
          throw new Error('You have exceeded your monthly minute limit. Please upgrade your plan to continue using the service.');
        }

        // Create conversation record using Edge Function
        const conversationId = await createConversationRecord(agentId);
        conversationIdRef.current = conversationId;
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

      // ✅ Get the current session to access the access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // ✅ NEW: Get relay URL from backend instead of direct Gemini connection
      const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/start-call`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          agentId, 
          instructions: systemInstruction, 
          documentationUrls 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start call');
      }

      const { relayUrl } = await response.json();
      console.log('[Live] Using relay URL:', relayUrl);

      const ws = new WebSocket(relayUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('[Live][WebSocket] onopen: connection established');
        setStatus('connecting');

        // ✅ Get current page context and initialize monitoring
        const pageContext = getPageContext();
        currentPageContextRef.current = pageContext;
        lastSentPageContextRef.current = pageContext;
        console.log('[Live] Initial page context:', pageContext);

        // Create URL context tools if documentation URLs are provided
        const tools = [];
        
        if (documentationUrls?.length) {
          tools.push({
            url_context: {
              urls: documentationUrls
            }
          });
        }

        // ✅ Enhanced system instruction with page context
        const enhancedSystemInstruction = `${systemInstruction || 'You are a helpful AI assistant.'} 

CURRENT PAGE CONTEXT: ${pageContext}

When responding, consider the user's current location and what they can see on the page. If they ask about something that doesn't match their current context, gently guide them or ask for clarification. When you mention specific UI elements, buttons, or parts of the interface in your responses, I will automatically highlight them for the user. Speak naturally about what you see and what actions the user might take.`;

        // Setup message with tools and Kore voice - AUDIO ONLY
        // ✅ IMPORTANT: Include agent ID for tool call handling
        const setupMsg = {
          setup: {
            model: 'models/gemini-2.0-flash-live-001',
            generationConfig: {
              responseModalities: ['AUDIO'], // ✅ AUDIO ONLY - no TEXT
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore'
                  }
                }
              }
            },
            tools: tools.length > 0 ? tools : undefined,
            outputAudioTranscription: {}, // ✅ Enable transcription of AI speech
            inputAudioTranscription: {},  // ✅ Enable transcription of user speech
            systemInstruction: {
              parts: [
                {
                  text: enhancedSystemInstruction,
                },
              ],
            },
          },
          // Include agent ID for tool call handling
          agentId: agentId
        };

        console.log('[Live][WebSocket] Sending setup:', setupMsg);
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = async (ev) => {
        let blob: Blob;

        // Chrome delivers ArrayBuffer, Firefox delivers Blob — handle both
        if (ev.data instanceof Blob) {
          blob = ev.data;                     // unchanged
        } else if (ev.data instanceof ArrayBuffer) {
          blob = new Blob([ev.data]);         // wrap the buffer
        } else {
          // unknown type – ignore
          return;
        }

        // ↓ everything that previously used ev.data continues to use `blob`
        let maybeText: string | null = null;
        try {
          maybeText = await blob.text();
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

              // ✅ Start page context monitoring when call becomes active
              startPageContextMonitoring();

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

            // --- TOOL CALL SUPPORT ---
            if (parsed.toolCall && currentAgentIdRef.current) {
              console.log('[Live] Tool call detected:', parsed.toolCall);
              
              for (const fc of parsed.toolCall.functionCalls) {
                try {
                  const result = await runToolCall(
                    currentAgentIdRef.current, 
                    fc.name, 
                    fc.args
                  );
                  
                  const responseMsg = {
                    functionResponses: [{
                      id: fc.id,
                      name: fc.name,
                      response: result
                    }]
                  };
                  
                  if (websocketRef.current?.readyState === WebSocket.OPEN) {
                    websocketRef.current.send(JSON.stringify(responseMsg));
                    console.log('[Live] Sent function response back to Gemini');
                  }
                } catch (toolError) {
                  console.error('[Live] Tool execution error:', toolError);
                  
                  // Send error response back to Gemini
                  const errorResponse = {
                    functionResponses: [{
                      id: fc.id,
                      name: fc.name,
                      response: { error: toolError.message }
                    }]
                  };
                  
                  if (websocketRef.current?.readyState === WebSocket.OPEN) {
                    websocketRef.current.send(JSON.stringify(errorResponse));
                  }
                }
              }
              return; // skip normal flow
            }

            if (parsed.serverContent) {
              const sc = parsed.serverContent;

              // ✅ HANDLE AI SPEECH TRANSCRIPTION WITH TWO-BUFFER SYSTEM
              if (sc.outputTranscription) {
                const { text, finished } = sc.outputTranscription;
                
                if (text) {
                  // 1) ACCUMULATE fragments in the partial buffer (don't replace!)
                  partialTextRef.current += text;
                  
                  // 2) Update the display immediately with committed + partial
                  updateTranscriptDisplay();
                  
                  console.log('[Live] AI transcription fragment (partial):', text);
                }

                // 3) When finished, MOVE partial to committed and clear partial
                if (finished && partialTextRef.current) {
                  const partialText = partialTextRef.current.trim();
                  
                  // Add to committed with smart spacing
                  if (committedTextRef.current && partialText) {
                    const needsSpace = !committedTextRef.current.endsWith(' ') && !partialText.startsWith(' ');
                    committedTextRef.current += (needsSpace ? ' ' : '') + partialText;
                  } else if (partialText) {
                    committedTextRef.current = partialText;
                  }
                  
                  // Clear partial buffer
                  partialTextRef.current = '';
                  
                  // Update display with committed text only
                  updateTranscriptDisplay();
                  
                  // ✅ HIGHLIGHT THE COMPLETE PHRASE
                  if (window.voicePilotHighlight && partialText) {
                    window.voicePilotHighlight(partialText);
                  }
                  
                  console.log('[Live] AI said (complete phrase):', partialText);
                }
              }

              // ✅ HANDLE USER SPEECH TRANSCRIPTION
              if (sc.inputTranscription?.text) {
                const userText = sc.inputTranscription.text.trim();
                if (userText) {
                  // Add to committed text with smart spacing
                  if (committedTextRef.current) {
                    const needsSpace = !committedTextRef.current.endsWith(' ') && !userText.startsWith(' ');
                    committedTextRef.current += (needsSpace ? ' ' : '') + userText;
                  } else {
                    committedTextRef.current = userText;
                  }
                  
                  updateTranscriptDisplay();
                  console.log('[Live] User transcription:', userText);
                }
              }

              // Handle audio data from modelTurn.parts
              const mt = sc.modelTurn;
              if (mt?.parts) {
                for (const part of mt.parts) {
                  // Handle audio data
                  if (part.inlineData && typeof part.inlineData.data === 'string') {
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
                      console.log('[Live][Debug] Decoded inlineData, scheduling audio playback');
                      playAudioBuffer(pcmBlob);
                    } catch (err) {
                      console.error('[Live] Error decoding inlineData audio:', err);
                    }
                  }
                }
                return; // ✅ BAIL OUT AFTER HANDLING AUDIO
              }

              // ✅ CHECK FOR TURN COMPLETE TO FORCE COMMIT PARTIAL BUFFER
              if (sc.turnComplete && partialTextRef.current) {
                console.log('[Live] Turn complete - committing partial buffer');
                const partialText = partialTextRef.current.trim();
                
                // Move partial to committed
                if (committedTextRef.current && partialText) {
                  const needsSpace = !committedTextRef.current.endsWith(' ') && !partialText.startsWith(' ');
                  committedTextRef.current += (needsSpace ? ' ' : '') + partialText;
                } else if (partialText) {
                  committedTextRef.current = partialText;
                }
                
                // Clear partial buffer
                partialTextRef.current = '';
                
                updateTranscriptDisplay();
                
                if (window.voicePilotHighlight && partialText) {
                  window.voicePilotHighlight(partialText);
                }
                
                console.log('[Live] AI said (turn complete commit):', partialText);
              }
            }

            return;
          } catch (parseError) {
            console.error('[Live] JSON parse error:', parseError);
            // Continue to fallback for binary data
          }
        }

        console.log('[Live][Debug] incoming Blob is not JSON or not recognized → playing raw PCM');
        playAudioBuffer(blob);
      };

      ws.onerror = (err) => {
        console.error('[Live][WebSocket] onerror:', err);
        setErrorMessage('WebSocket encountered an error.');
        setStatus('error');
      };

      ws.onclose = (ev) => {
        console.log(`[Live][WebSocket] onclose: code=${ev.code}, reason="${ev.reason}"`);
        setStatus('ended');
        websocketRef.current = null;
        // ✅ Stop page context monitoring when call ends
        stopPageContextMonitoring();
      };
    } catch (err: any) {
      console.error('[Live] Failed to start call:', err);
      setErrorMessage(err.message ?? 'Failed to start call.');
      setStatus('error');
    }
  };

  const startMicStreaming = async () => {
    try {
      // ✅ ADDED: Log microphone access attempt
      console.log('[Live][Audio] Requesting microphone access...');
      
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      microphoneStream.current = micStream;
      
      console.log('[Live][Audio] Microphone access granted, setting up audio processing...');

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
          // ✅ ADDED: Log audio data transmission (throttled to avoid spam)
          if (Math.random() < 0.01) { // Log ~1% of audio chunks
            console.log(`[Live][Audio] Sent PCM16 chunk (${pcm16.byteLength * 2} bytes) to relay`);
          }
        }
      };

      setIsMicrophoneActive(true);
      console.log('[Live][Audio] Microphone streaming started successfully');
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
        console.log('[Live][Audio] Stopping microphone...');
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
          audioQueueTimeRef.current = 0;
        }
        microphoneStream.current.getTracks().forEach((t) => t.stop());
        microphoneStream.current = null;
        setIsMicrophoneActive(false);
        console.log('[Live][Audio] Microphone stopped');
      } else if (!isMicrophoneActive) {
        console.log('[Live][Audio] Starting microphone...');
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

  const endCall = (fromUnload = false): void => {
    if (callEndedRef.current) {
      return;
    }
    callEndedRef.current = true;
    window.removeEventListener('beforeunload', handleBeforeUnload);
    
    try {
      const finalDuration = duration;
      // ✅ GET FINAL TRANSCRIPT FROM BOTH BUFFERS
      const finalTranscript = (committedTextRef.current + partialTextRef.current).trim();
      const agentId = currentAgentIdRef.current;
      const conversationId = conversationIdRef.current;

      console.log('[Live] Ending call - Duration:', finalDuration, 'seconds, Transcript length:', finalTranscript.length);

      // Clear any DOM highlights
      if (window.voicePilotClearHighlights) {
        window.voicePilotClearHighlights();
      }

      // ✅ IMPROVED: Explicitly stop microphone stream first with detailed logging
      if (microphoneStream.current) {
        console.log('[Live][Audio] Explicitly stopping microphone stream...');
        try {
          microphoneStream.current.getTracks().forEach((track) => {
            console.log('[Live][Audio] Stopping microphone track:', track.kind, track.readyState);
            track.stop();
            console.log('[Live][Audio] Microphone track stopped, new state:', track.readyState);
          });
          microphoneStream.current = null;
          setIsMicrophoneActive(false);
          console.log('[Live][Audio] Microphone stream fully stopped and cleared');
        } catch (err) {
          console.error('[Live][Audio] Error stopping microphone stream:', err);
        }
      }

      // ✅ IMPROVED: Explicitly stop screen stream with detailed logging
      if (screenStream.current) {
        console.log('[Live][Screen] Explicitly stopping screen stream...');
        try {
          screenStream.current.getTracks().forEach((track) => {
            console.log('[Live][Screen] Stopping screen track:', track.kind, track.readyState);
            track.stop();
            console.log('[Live][Screen] Screen track stopped, new state:', track.readyState);
          });
          screenStream.current = null;
          setIsScreenSharing(false);
          console.log('[Live][Screen] Screen stream fully stopped and cleared');
        } catch (err) {
          console.error('[Live][Screen] Error stopping screen stream:', err);
        }
      }
      
      // ✅ IMPROVED: Stop screen streaming explicitly
      stopScreenStreaming();

      // ✅ IMPROVED: Explicitly stop video stream with detailed logging
      if (videoStream.current) {
        console.log('[Live][Video] Explicitly stopping video stream...');
        try {
          videoStream.current.getTracks().forEach((track) => {
            console.log('[Live][Video] Stopping video track:', track.kind, track.readyState);
            track.stop();
            console.log('[Live][Video] Video track stopped, new state:', track.readyState);
          });
          videoStream.current = null;
          setIsVideoActive(false);
          console.log('[Live][Video] Video stream fully stopped and cleared');
        } catch (err) {
          console.error('[Live][Video] Error stopping video stream:', err);
        }
      }

      // ✅ IMPROVED: Explicitly close audio context with detailed logging
      if (audioContextRef.current) {
        console.log('[Live][Audio] Explicitly closing audio context...');
        try {
          audioContextRef.current.close().then(() => {
            console.log('[Live][Audio] Audio context closed successfully');
          }).catch((err) => {
            console.error('[Live][Audio] Error closing audio context:', err);
          });
          audioContextRef.current = null;
          audioQueueTimeRef.current = 0;
          console.log('[Live][Audio] Audio context reference cleared');
        } catch (err) {
          console.error('[Live][Audio] Error closing audio context:', err);
        }
      }

      // Save transcript and conversation data using Edge Functions
      if (agentId && finalTranscript) {
        console.log('[Live] Saving transcript for agent:', agentId);
        const save = fromUnload ? saveTranscriptBeacon : saveTranscript;
        save(agentId, finalTranscript).catch(err => {
          console.error('Failed to save transcript:', err);
          if (!fromUnload) {
            alert(`Transcript wasn't saved: ${err.message ?? err}`);
          }
        });

        // Save conversation messages if we have a conversation record
        if (conversationId) {
          saveConversationMessages(conversationId, finalTranscript).catch(err => {
            console.error('Failed to save conversation messages:', err);
          });
        }
      }

      // End conversation record
      if (conversationId && finalDuration > 0) {
        endConversationRecord(conversationId, finalDuration).catch(err => {
          console.error('Failed to end conversation record:', err);
        });
      }

      // Record usage for the agent owner if we have the agent ID and duration
      if (agentId && finalDuration > 0 && !usageRecordedRef.current) {
        const minutes = Math.ceil(finalDuration / 60);
        recordAgentUsage(agentId, minutes).catch(err => {
          console.error('Failed to record agent usage:', err);
        });
        usageRecordedRef.current = true;
      }

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }

      // ✅ Stop page context monitoring
      stopPageContextMonitoring();

      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      
      setStatus('ended');
      agentOwnerIdRef.current = null;
      currentAgentIdRef.current = null;
      conversationIdRef.current = null;
      
      // ✅ CLEAR BOTH BUFFERS
      committedTextRef.current = '';
      partialTextRef.current = '';
      
      console.log('[Live] Call ended successfully - all streams stopped and resources cleaned up');
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

// Extend window interface for TypeScript
declare global {
  interface Window {
    voicePilotHighlight?: (text: string) => boolean;
    voicePilotClearHighlights?: () => void;
    voicePilotGetPageContext?: () => string;
  }
}