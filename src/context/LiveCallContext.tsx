import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { ObjectDetectionOverlay } from '../components/overlay/ObjectDetectionOverlay';
import { detectObjects, BoundingBox } from '../services/objectDetection';
import { LiveCallStatus } from '../types';
import { useAuth } from './AuthContext';
import { saveTranscript, saveTranscriptBeacon } from '../services/transcripts';
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
  highlightObjects: boolean;
  toggleHighlightObjects: () => void;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  startCall: (systemInstruction?: string, maxDuration?: number, documentationUrls?: string[], agentId?: string) => Promise<void>;
  endCall: (fromUnload?: boolean) => void;
  toggleScreenShare: () => Promise<void>;
  toggleMicrophone: () => void;
  toggleVideo: () => void;
}

const LiveCallContext = createContext<LiveCallContextType | undefined>(undefined);

// DOM Highlighting functionality
class DOMHighlighter {
  private highlightedElements: Set<HTMLElement> = new Set();
  private highlightClass = 'voice-agent-highlight';
  private highlightStyle: HTMLStyleElement | null = null;

  constructor() {
    this.injectStyles();
  }

  private injectStyles() {
    if (this.highlightStyle) {
      this.highlightStyle.remove();
    }

    this.highlightStyle = document.createElement('style');
    this.highlightStyle.id = 'voice-agent-highlight-styles';
    this.highlightStyle.textContent = `
      .${this.highlightClass} {
        position: relative !important;
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
        border-radius: 6px !important;
        background-color: rgba(59, 130, 246, 0.05) !important;
        transition: all 0.3s ease !important;
        z-index: 9999 !important;
      }
      
      .${this.highlightClass}::before {
        content: '';
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        background: linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
        border-radius: 10px;
        z-index: -1;
        animation: voice-agent-pulse 2s infinite;
      }
      
      @keyframes voice-agent-pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.02); }
      }
    `;
    document.head.appendChild(this.highlightStyle);
  }

  private extractSearchTerms(text: string): string[] {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'click', 'press', 'tap', 'select', 'choose', 'find', 'locate', 'go', 'navigate',
      'button', 'link', 'menu', 'option', 'item', 'element'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 5);
  }

  private calculateMatchConfidence(element: HTMLElement, searchTerms: string[]): number {
    const texts = [
      element.textContent?.toLowerCase() || '',
      element.getAttribute('aria-label')?.toLowerCase() || '',
      element.getAttribute('title')?.toLowerCase() || '',
      element.getAttribute('data-testid')?.toLowerCase() || '',
      element.getAttribute('data-agent-id')?.toLowerCase() || '',
      element.className.toLowerCase(),
      element.id.toLowerCase()
    ].filter(Boolean);

    let totalScore = 0;
    let maxPossibleScore = searchTerms.length;

    searchTerms.forEach(term => {
      let termScore = 0;
      
      texts.forEach((text, index) => {
        if (text.includes(term)) {
          const weights = [1.0, 0.9, 0.8, 0.7, 0.9, 0.5, 0.6];
          termScore = Math.max(termScore, weights[index] || 0.3);
        }
      });

      if (texts.some(text => text === term)) {
        termScore = Math.min(1.0, termScore + 0.3);
      }

      if (texts.some(text => new RegExp(`\\b${term}\\b`).test(text))) {
        termScore = Math.min(1.0, termScore + 0.2);
      }

      totalScore += termScore;
    });

    return totalScore / maxPossibleScore;
  }

  private isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0' &&
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

  public highlightElement(searchText: string): boolean {
    console.log('[DOMHighlighter] Attempting to highlight:', searchText);
    
    const searchTerms = this.extractSearchTerms(searchText);
    if (searchTerms.length === 0) {
      console.log('[DOMHighlighter] No search terms extracted');
      return false;
    }

    console.log('[DOMHighlighter] Search terms:', searchTerms);

    const selectors = [
      'button',
      'a',
      '[role="button"]',
      '[role="link"]',
      'input[type="button"]',
      'input[type="submit"]',
      '[data-testid]',
      '[aria-label]',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '[class*="button"]',
      '[class*="btn"]',
      '[class*="link"]',
      '[class*="nav"]',
      '[class*="menu"]',
      'label',
      '.card-title',
      '.title',
      '[data-agent-id]'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    const matches: Array<{element: HTMLElement, confidence: number, text: string}> = [];
    
    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      if (!this.isElementVisible(htmlElement)) return;
      
      const confidence = this.calculateMatchConfidence(htmlElement, searchTerms);
      
      if (confidence > 0.3) {
        const elementText = htmlElement.textContent?.trim() || htmlElement.getAttribute('aria-label') || 'Element';
        matches.push({
          element: htmlElement,
          confidence,
          text: elementText
        });
      }
    });

    matches.sort((a, b) => b.confidence - a.confidence);
    
    console.log('[DOMHighlighter] Found matches:', matches.map(m => ({
      text: m.text,
      confidence: m.confidence
    })));

    if (matches.length === 0) {
      console.log('[DOMHighlighter] No matches found');
      return false;
    }

    // Clear previous highlights
    this.clearHighlights();

    // Highlight the best match(es)
    const bestMatch = matches[0];
    const threshold = Math.max(0.7, bestMatch.confidence - 0.2);
    
    const elementsToHighlight = matches
      .filter(match => match.confidence >= threshold)
      .slice(0, 3)
      .map(match => match.element);

    console.log('[DOMHighlighter] Highlighting elements:', elementsToHighlight.length);

    elementsToHighlight.forEach(element => {
      element.classList.add(this.highlightClass);
      this.highlightedElements.add(element);
    });

    // Scroll to the best match
    bestMatch.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Auto-remove highlights after 5 seconds
    setTimeout(() => {
      this.clearHighlights();
    }, 5000);

    return true;
  }

  public clearHighlights(): void {
    this.highlightedElements.forEach(element => {
      element.classList.remove(this.highlightClass);
    });
    this.highlightedElements.clear();
  }

  public destroy(): void {
    this.clearHighlights();
    if (this.highlightStyle) {
      this.highlightStyle.remove();
      this.highlightStyle = null;
    }
  }
}

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
  const [highlightObjects, setHighlightObjects] = useState(false);
  const [objectBoxes, setObjectBoxes] = useState<BoundingBox[]>([]);
  const { user } = useAuth();

  const DEFAULT_SYSTEM_INSTRUCTION =
    'You are roleplaying a real person testing a new interface while talking to a designer.' +
    "Speak casually, like you're figuring things out out loud. This isn't a polished review — it's a live reaction." +
    'CORE BEHAVIOR: Think aloud in the moment. React as you notice things — not after deep analysis. It\'s okay to feel stuck or ramble a bit—don\'t tidy your sentences. Use natural phrases: "Hmm…", "Let me read this…", "Not sure what that means…" Focus on what your eyes land on first. Don\'t describe everything at once. Don\'t try to define the whole product. Say what you *think* it might be, even if unsure. If something confuses you, just say so. Don\'t explain unless it feels obvious. Keep answers short. You don\'t need to keep the conversation going unless you have a reaction.' +
    'First-Time Reaction Behavior. When seeing a screen (or a new part of it) for the first time: Glance — Start with what draws your eye. "Okay… first thing I see is…" Pause to read or scan — You should react like someone figuring it out in real time. "Let me read this real quick…" " "Wait — what\'s this down here…" Guess or think aloud — Share your thoughts as they form. Don\'t rush to a final answer. ' +
    'DECISION RULE: When asked what you would do (next / first), commit: 1. State the ONE action you\'d take. 2. Say why you chose it (brief). Only list other ideas if the designer asks "anything else?"' +
    'Important: You are not supposed to summarize or label the tool right away. You\'re reacting moment by moment, like someone thinking out loud in a real usability session.' +
    'HIGHLIGHTING TOOL: You have access to a highlight_element tool. Use it when you mention specific UI elements, buttons, or parts of the interface. For example, if you say "click the New Post button", call highlight_element with "New Post button" as the text parameter. This helps users see exactly what you\'re referring to.';

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
  const domHighlighterRef = useRef<DOMHighlighter | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenIntervalRef = useRef<number | null>(null);
  const detectionInProgressRef = useRef(false);

  const handleBeforeUnload = () => {
    endCall(true);
  };

  useEffect(() => {
    // Initialize DOM highlighter
    domHighlighterRef.current = new DOMHighlighter();

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
      if (domHighlighterRef.current) {
        domHighlighterRef.current.destroy();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
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

  const checkAgentOwnerUsage = async (agentId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/check-agent-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
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
      await fetch(
        `${env.VITE_SUPABASE_URL}/functions/v1/record-agent-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
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
      const { data, error } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          status: 'active',
          start_time: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create conversation record:', error);
        return null;
      }

      console.log('Created conversation record:', data.id);
      return data.id;
    } catch (err) {
      console.error('Error creating conversation record:', err);
      return null;
    }
  };

  const endConversationRecord = async (conversationId: string, duration: number): Promise<void> => {
    try {
      const { error } = await supabase
        .from('agent_conversations')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          duration: duration,
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Failed to end conversation record:', error);
      } else {
        console.log('Ended conversation record:', conversationId);
      }
    } catch (err) {
      console.error('Error ending conversation record:', err);
    }
  };

  const saveConversationMessages = async (conversationId: string, transcript: string): Promise<void> => {
    try {
      // For now, save the entire transcript as a single message
      // In the future, we could parse it into individual messages
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: transcript,
        });

      if (error) {
        console.error('Failed to save conversation messages:', error);
      } else {
        console.log('Saved conversation messages for:', conversationId);
      }
    } catch (err) {
      console.error('Error saving conversation messages:', err);
    }
  };

  const startCall = async (systemInstruction?: string, maxDuration?: number, documentationUrls?: string[], agentId?: string): Promise<void> => {
    try {
      setErrorMessage(null);
      setDuration(0);
      usageRecordedRef.current = false;
      currentAgentIdRef.current = agentId || null;
      conversationIdRef.current = null;
      callEndedRef.current = false;
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Check agent owner's usage limits if agentId is provided
      if (agentId) {
        const canUse = await checkAgentOwnerUsage(agentId);
        if (!canUse) {
          throw new Error('You have exceeded your monthly minute limit. Please upgrade your plan to continue using the service.');
        }

        // Create conversation record
        const conversationId = await createConversationRecord(agentId);
        conversationIdRef.current = conversationId;
      }

      // Optionally validate provided documentation URLs
      if (documentationUrls && documentationUrls.length) {
        for (const url of documentationUrls) {
          try {
            const resp = await fetch(url, { method: 'HEAD' });
            if (!resp.ok) {
              throw new Error(`HEAD request failed with status ${resp.status}`);
            }
          } catch (err) {
            console.error('[Live] URL validation failed:', err);
            setErrorMessage(`Unable to access ${url}. Please check the link and try again.`);
            setStatus('error');
            return;
          }
        }
      }

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

      const apiKey =
        (window as any).voicepilotGoogleApiKey ||
        env.VITE_GOOGLE_API_KEY;
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
        const tools = [];
        
        if (documentationUrls?.length) {
          tools.push({
            url_context: {
              urls: documentationUrls
            }
          });
        }

        // Add DOM highlighting tool
        tools.push({
          function_declarations: [{
            name: 'highlight_element',
            description: 'Highlight a UI element on the page when mentioning it in conversation. Use this when referring to specific buttons, links, or interface elements.',
            parameters: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'The text or description of the element to highlight (e.g., "New Post button", "Settings menu", "Login form")'
                }
              },
              required: ['text']
            }
          }]
        });

        // Setup message with tools and Kore voice
        const setupMsg = {
          setup: {
            model: 'models/gemini-2.0-flash-live-001',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore'
                  }
                }
              }
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
                  
                  // Handle function calls (tool usage) - CRITICAL FIX
                  if (part.functionCall) {
                    const { name, args } = part.functionCall;
                    console.log('[Live] Function call received:', name, args);
                    
                    if (name === 'highlight_element' && args?.text) {
                      console.log('[Live] Highlighting element for text:', args.text);
                      if (domHighlighterRef.current) {
                        const highlighted = domHighlighterRef.current.highlightElement(args.text);
                        console.log(`[Live] Highlight result:`, highlighted);
                        
                        // Send function response back to the model - ASYNC to prevent blocking
                        setTimeout(() => {
                          if (ws.readyState === WebSocket.OPEN) {
                            const functionResponse = {
                              clientContent: {
                                turns: [{
                                  role: 'model',
                                  parts: [{
                                    functionResponse: {
                                      name: 'highlight_element',
                                      response: {
                                        success: highlighted,
                                        message: highlighted ? 'Element highlighted successfully' : 'No matching element found'
                                      }
                                    }
                                  }]
                                }],
                                turnComplete: true
                              }
                            };
                            
                            try {
                              ws.send(JSON.stringify(functionResponse));
                              console.log('[Live] Sent function response');
                            } catch (sendError) {
                              console.error('[Live] Error sending function response:', sendError);
                            }
                          }
                        }, 100); // Small delay to prevent race conditions
                      }
                    }
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
          } catch (parseError) {
            console.error('[Live] JSON parse error:', parseError);
            // Continue to fallback for binary data
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

              if (highlightObjects && !detectionInProgressRef.current) {
                detectionInProgressRef.current = true;
                detectObjects(base64)
                  .then((boxes) => {
                    const scaled = boxes.map((b) => ({
                      x: (b.x / 1000) * canvas!.width,
                      y: (b.y / 1000) * canvas!.height,
                      width: (b.width / 1000) * canvas!.width,
                      height: (b.height / 1000) * canvas!.height,
                      label: b.label,
                    }));
                    setObjectBoxes(scaled);
                  })
                  .catch((err) => console.error('[Live] object detection error:', err))
                  .finally(() => {
                    detectionInProgressRef.current = false;
                  });
              } else if (!highlightObjects) {
                setObjectBoxes([]);
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
    setObjectBoxes([]);
    detectionInProgressRef.current = false;
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

  const toggleHighlightObjects = (): void => {
    setHighlightObjects((prev) => !prev);
    if (!highlightObjects) {
      setObjectBoxes([]);
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
      const finalTranscript = transcript.trim();
      const agentId = currentAgentIdRef.current;
      const conversationId = conversationIdRef.current;

      // Clear any DOM highlights
      if (domHighlighterRef.current) {
        domHighlighterRef.current.clearHighlights();
      }

      // Save transcript and conversation data
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
      agentOwnerIdRef.current = null;
      currentAgentIdRef.current = null;
      conversationIdRef.current = null;
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
        highlightObjects,
        toggleHighlightObjects,
        setTranscript,
        startCall,
        endCall,
        toggleScreenShare,
        toggleMicrophone,
        toggleVideo,
      }}
    >
      {children}
      <ObjectDetectionOverlay
        boxes={objectBoxes}
        visible={highlightObjects && isScreenSharing}
      />
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