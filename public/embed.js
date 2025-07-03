(function() {
  'use strict';

  // Get script attributes
  const currentScript = document.currentScript;
  const agentId = currentScript?.getAttribute('data-agent') || '';
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  const supabaseUrl = currentScript?.getAttribute('data-supabase-url') || 'https://ljfidzppyflrrszkgusa.supabase.co';
  const supabaseAnonKey = currentScript?.getAttribute('data-supabase-anon-key') || '';

  if (!agentId) {
    console.error('[VoicePilot] No agent ID provided');
    return;
  }

  // Add simple highlight CSS
  if (!document.getElementById('voicepilot-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'voicepilot-highlight-style';
    style.textContent = `.agent-highlight {
      outline: 3px solid #f00;
      box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.6);
      transition: outline-color 0.2s;
    }`;
    document.head.appendChild(style);
  }

  // Simple highlighting functions
  window.voicePilotHighlight = (message) => {
    if (!message) return;
    const lower = message.toLowerCase();
    const candidates = Array.from(
      document.querySelectorAll('[data-agent-id],button,a,[role="button"],input')
    );
    for (const el of candidates) {
      const label = (
        el.getAttribute('data-agent-id') ||
        el.getAttribute('aria-label') ||
        el.innerText ||
        ''
      ).trim();
      if (label && label.length > 2 && lower.includes(label.toLowerCase())) {
        el.classList.add('agent-highlight');
        setTimeout(() => el.classList.remove('agent-highlight'), 3000);
        break;
      }
    }
  };

  window.voicePilotClearHighlights = () => {
    document.querySelectorAll('.agent-highlight').forEach(el => {
      el.classList.remove('agent-highlight');
    });
  };

  // Page context monitoring
  window.voicePilotGetPageContext = () => {
    try {
      const title = document.title || 'Unknown Page';
      const url = window.location.pathname;
      const visibleText = Array.from(document.querySelectorAll('h1, h2, h3, button, a, [role="button"]'))
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 2)
        .slice(0, 10)
        .join(', ');
      
      return `Page: ${title}, URL: ${url}, Elements: ${visibleText}`;
    } catch (error) {
      console.warn('[VoicePilot] Error getting page context:', error);
      return `Page: ${document.title || 'Unknown'}, URL: ${window.location.pathname}`;
    }
  };

  // Initialize Supabase client
  let supabaseClient = null;
  
  const initSupabase = async () => {
    try {
      if (typeof window.supabase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }
      
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      console.log('[VoicePilot] Supabase client initialized');
    } catch (error) {
      console.error('[VoicePilot] Failed to initialize Supabase:', error);
    }
  };

  // Widget state
  let isOpen = false;
  let isCallActive = false;
  let websocket = null;
  let audioContext = null;
  let audioQueue = 0;
  let microphoneStream = null;
  let duration = 0;
  let durationTimer = null;
  let maxDurationTimer = null;
  let greetingSent = false;
  let callEnded = false;
  let agentInstructions = '';
  let agentDuration = 300;
  let agentDocUrls = [];
  let conversationId = null;

  // Transcript buffers
  let committedTextRef = '';
  let partialTextRef = '';

  // Page context monitoring
  let currentPageContext = '';
  let lastSentPageContext = '';
  let pageContextInterval = null;

  // Create widget container
  const container = document.createElement('div');
  container.id = 'voicepilot-widget';
  container.style.cssText = `
    position: fixed;
    z-index: 9999;
    ${position.includes('bottom') ? 'bottom: 24px;' : 'top: 24px;'}
    ${position.includes('right') ? 'right: 24px;' : 'left: 24px;'}
  `;
  document.body.appendChild(container);

  // Widget HTML
  const widgetHTML = `
    <div id="voicepilot-chat" style="display: none; width: 320px; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center;">
            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
                <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
              </svg>
            </div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #111827;" id="agent-name">AI Assistant</div>
              <div style="font-size: 12px; color: #6b7280;" id="agent-status">Ready to help</div>
            </div>
          </div>
          <button id="close-chat" style="background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; color: #6b7280;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      
      <div style="padding: 16px;">
        <div id="call-inactive" style="text-align: center;">
          <div style="width: 48px; height: 48px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          <p style="margin: 0 0 16px; font-size: 14px; color: #6b7280;">Start a voice conversation with your AI assistant</p>
          <button id="start-call" style="width: 100%; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px;">
            Start Voice Chat
          </button>
        </div>
        
        <div id="call-active" style="display: none;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite;"></div>
            <span style="font-size: 12px; font-weight: 500; color: #6b7280;">LIVE</span>
          </div>
          
          <div id="transcript" style="background: #f9fafb; padding: 12px; border-radius: 8px; max-height: 120px; overflow-y: auto; font-size: 13px; line-height: 1.4; color: #374151; margin-bottom: 12px; display: none;">
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button id="toggle-mic" style="flex: 1; background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 12px; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              Mute
            </button>
            <button id="end-call" style="flex: 1; background: #ef4444; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 12px; cursor: pointer;">
              End Call
            </button>
          </div>
          
          <div id="error-message" style="display: none; background: #fef2f2; color: #dc2626; padding: 8px; border-radius: 6px; font-size: 12px; margin-top: 8px;">
          </div>
        </div>
      </div>
    </div>
    
    <button id="voicepilot-toggle" style="width: 56px; height: 56px; background: #1f2937; color: white; border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
  `;

  container.innerHTML = widgetHTML;

  // Get elements
  const toggleBtn = container.querySelector('#voicepilot-toggle');
  const chatWidget = container.querySelector('#voicepilot-chat');
  const closeBtn = container.querySelector('#close-chat');
  const startCallBtn = container.querySelector('#start-call');
  const endCallBtn = container.querySelector('#end-call');
  const toggleMicBtn = container.querySelector('#toggle-mic');
  const callInactive = container.querySelector('#call-inactive');
  const callActive = container.querySelector('#call-active');
  const transcriptEl = container.querySelector('#transcript');
  const errorEl = container.querySelector('#error-message');
  const agentNameEl = container.querySelector('#agent-name');
  const agentStatusEl = container.querySelector('#agent-status');

  // Fetch agent data
  const fetchAgentData = async () => {
    try {
      if (!supabaseClient) {
        console.warn('[VoicePilot] Supabase client not initialized');
        return;
      }

      const { data, error } = await supabaseClient
        .from('agents')
        .select('name, instructions, call_duration, documentation_urls')
        .eq('id', agentId)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('[VoicePilot] Error fetching agent:', error);
        return;
      }

      if (data) {
        agentInstructions = data.instructions || '';
        agentDuration = data.call_duration || 300;
        agentDocUrls = data.documentation_urls || [];
        
        if (agentNameEl && data.name) {
          agentNameEl.textContent = data.name;
        }
        
        console.log('[VoicePilot] Agent data loaded:', data.name);
      }
    } catch (error) {
      console.error('[VoicePilot] Failed to fetch agent data:', error);
    }
  };

  // Audio processing
  const playAudioBuffer = async (pcmBlob) => {
    try {
      const arrayBuffer = await pcmBlob.arrayBuffer();
      const pcm16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(pcm16.length);
      
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const buffer = audioContext.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0, 0);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      let startAt = audioContext.currentTime;
      if (audioQueue > audioContext.currentTime) {
        startAt = audioQueue;
      }
      
      source.start(startAt);
      audioQueue = startAt + buffer.duration;
    } catch (err) {
      console.error('[VoicePilot] Audio playback error:', err);
    }
  };

  // Update transcript display
  const updateTranscriptDisplay = () => {
    const committed = committedTextRef;
    const partial = partialTextRef;
    
    let fullText = committed;
    if (committed && partial) {
      const needsSpace = !committed.endsWith(' ') && !partial.startsWith(' ');
      fullText = committed + (needsSpace ? ' ' : '') + partial;
    } else if (partial) {
      fullText = partial;
    }
    
    if (transcriptEl && fullText.trim()) {
      transcriptEl.textContent = fullText;
      transcriptEl.style.display = 'block';
    }
  };

  // Page context monitoring
  const startPageContextMonitoring = () => {
    if (pageContextInterval) {
      clearInterval(pageContextInterval);
    }

    pageContextInterval = setInterval(() => {
      if (!isCallActive || !websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        const newContext = window.voicePilotGetPageContext();
        currentPageContext = newContext;

        if (newContext !== lastSentPageContext) {
          console.log('[VoicePilot] Page context changed, updating AI:', newContext);
          
          const contextUpdateMessage = {
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: `PAGE CONTEXT UPDATE: ${newContext}` }],
                },
              ],
              turnComplete: true,
            },
          };

          websocket.send(JSON.stringify(contextUpdateMessage));
          lastSentPageContext = newContext;
        }
      } catch (error) {
        console.warn('[VoicePilot] Error monitoring page context:', error);
      }
    }, 2000);
  };

  const stopPageContextMonitoring = () => {
    if (pageContextInterval) {
      clearInterval(pageContextInterval);
      pageContextInterval = null;
    }
  };

  // Microphone handling
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStream = stream;

      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (event) => {
        const float32Data = event.inputBuffer.getChannelData(0);
        const inRate = audioContext.sampleRate;
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

        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify(payload));
        }
      };

      toggleMicBtn.style.background = '#3b82f6';
      toggleMicBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        Mute
      `;
    } catch (err) {
      console.error('[VoicePilot] Microphone error:', err);
      showError('Failed to access microphone');
    }
  };

  const stopMicrophone = () => {
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      microphoneStream = null;
    }

    toggleMicBtn.style.background = '#6b7280';
    toggleMicBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12l1.27-1.27A3 3 0 0 0 15 12V4a3 3 0 0 0-3-3 3 3 0 0 0-3 3v5"></path>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
      Unmute
    `;
  };

  // Error handling
  const showError = (message) => {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 5000);
    }
  };

  // Create conversation record
  const createConversationRecord = async () => {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/create-conversation-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ agentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create conversation record');
      }

      const result = await response.json();
      conversationId = result.conversationId;
      console.log('[VoicePilot] Created conversation record:', conversationId);
    } catch (err) {
      console.error('[VoicePilot] Error creating conversation record:', err);
    }
  };

  // Start call
  const startCall = async () => {
    try {
      if (isCallActive) return;

      callEnded = false;
      committedTextRef = '';
      partialTextRef = '';
      duration = 0;
      greetingSent = false;

      // Create conversation record
      await createConversationRecord();

      // Get relay URL
      const response = await fetch(`${supabaseUrl}/functions/v1/start-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          agentId,
          instructions: agentInstructions,
          documentationUrls: agentDocUrls
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start call');
      }

      const { relayUrl } = await response.json();
      console.log('[VoicePilot] Using relay URL:', relayUrl);

      // Connect WebSocket
      websocket = new WebSocket(relayUrl);

      websocket.onopen = () => {
        console.log('[VoicePilot] WebSocket connected');
        isCallActive = true;

        // Update UI
        callInactive.style.display = 'none';
        callActive.style.display = 'block';
        agentStatusEl.textContent = 'Connected';

        // Start page context monitoring
        const pageContext = window.voicePilotGetPageContext();
        currentPageContext = pageContext;
        lastSentPageContext = pageContext;
        startPageContextMonitoring();

        // Setup message with enhanced system instruction
        const enhancedSystemInstruction = `${agentInstructions || 'You are a helpful AI assistant.'} 

CURRENT PAGE CONTEXT: ${pageContext}

When responding, consider the user's current location and what they can see on the page. If they ask about something that doesn't match their current context, gently guide them or ask for clarification. When you mention specific UI elements, buttons, or parts of the interface in your responses, I will automatically highlight them for the user. Speak naturally about what you see and what actions the user might take.`;

        const tools = [];
        if (agentDocUrls?.length) {
          tools.push({
            url_context: {
              urls: agentDocUrls
            }
          });
        }

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
            tools: tools.length > 0 ? tools : undefined,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: enhancedSystemInstruction }],
            },
          },
        };

        websocket.send(JSON.stringify(setupMsg));

        // Start duration timer
        durationTimer = setInterval(() => {
          duration++;
          agentStatusEl.textContent = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} elapsed`;
        }, 1000);

        // Set max duration timer
        if (agentDuration > 0) {
          maxDurationTimer = setTimeout(() => {
            endCall();
          }, agentDuration * 1000);
        }
      };

      websocket.onmessage = async (ev) => {
        let blob;
        if (ev.data instanceof Blob) {
          blob = ev.data;
        } else if (ev.data instanceof ArrayBuffer) {
          blob = new Blob([ev.data]);
        } else {
          return;
        }

        let maybeText = null;
        try {
          maybeText = await blob.text();
        } catch {
          maybeText = null;
        }

        if (maybeText) {
          try {
            const parsed = JSON.parse(maybeText);

            if (parsed.setupComplete) {
              console.log('[VoicePilot] Setup complete');
              startMicrophone();

              if (websocket.readyState === WebSocket.OPEN && !greetingSent) {
                const greeting = {
                  clientContent: {
                    turns: [{ role: 'user', parts: [{ text: 'Hello!' }] }],
                    turnComplete: true,
                  },
                };
                websocket.send(JSON.stringify(greeting));
                greetingSent = true;
              }
              return;
            }

            if (parsed.serverContent) {
              const sc = parsed.serverContent;

              // Handle AI speech transcription
              if (sc.outputTranscription) {
                const { text, finished } = sc.outputTranscription;
                
                if (text) {
                  partialTextRef += text;
                  updateTranscriptDisplay();
                }

                if (finished && partialTextRef) {
                  const partialText = partialTextRef.trim();
                  
                  if (committedTextRef && partialText) {
                    const needsSpace = !committedTextRef.endsWith(' ') && !partialText.startsWith(' ');
                    committedTextRef += (needsSpace ? ' ' : '') + partialText;
                  } else if (partialText) {
                    committedTextRef = partialText;
                  }
                  
                  partialTextRef = '';
                  updateTranscriptDisplay();
                  
                  // Highlight mentioned elements
                  if (window.voicePilotHighlight && partialText) {
                    window.voicePilotHighlight(partialText);
                  }
                }
              }

              // Handle user speech transcription
              if (sc.inputTranscription?.text) {
                const userText = sc.inputTranscription.text.trim();
                if (userText) {
                  if (committedTextRef) {
                    const needsSpace = !committedTextRef.endsWith(' ') && !userText.startsWith(' ');
                    committedTextRef += (needsSpace ? ' ' : '') + userText;
                  } else {
                    committedTextRef = userText;
                  }
                  updateTranscriptDisplay();
                }
              }

              // Handle audio data
              const mt = sc.modelTurn;
              if (mt?.parts) {
                for (const part of mt.parts) {
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
                      playAudioBuffer(pcmBlob);
                    } catch (err) {
                      console.error('[VoicePilot] Error decoding audio:', err);
                    }
                  }
                }
                return;
              }

              // Handle turn complete
              if (sc.turnComplete && partialTextRef) {
                const partialText = partialTextRef.trim();
                
                if (committedTextRef && partialText) {
                  const needsSpace = !committedTextRef.endsWith(' ') && !partialText.startsWith(' ');
                  committedTextRef += (needsSpace ? ' ' : '') + partialText;
                } else if (partialText) {
                  committedTextRef = partialText;
                }
                
                partialTextRef = '';
                updateTranscriptDisplay();
                
                if (window.voicePilotHighlight && partialText) {
                  window.voicePilotHighlight(partialText);
                }
              }
            }
            return;
          } catch (parseError) {
            // Continue to fallback for binary data
          }
        }

        // Handle binary audio data
        playAudioBuffer(blob);
      };

      websocket.onerror = (err) => {
        console.error('[VoicePilot] WebSocket error:', err);
        showError('Connection error occurred');
        endCall();
      };

      websocket.onclose = (ev) => {
        console.log('[VoicePilot] WebSocket closed:', ev.code, ev.reason);
        endCall();
      };

    } catch (err) {
      console.error('[VoicePilot] Failed to start call:', err);
      showError(err.message || 'Failed to start call');
    }
  };

  // End call
  const endCall = (fromUnload = false) => {
    if (callEnded) return;
    callEnded = true;

    try {
      const finalDuration = duration;
      const finalTranscript = (committedTextRef + partialTextRef).trim();

      console.log('[VoicePilot] Ending call - Duration:', finalDuration, 'seconds, Transcript length:', finalTranscript.length);

      // Clear highlights
      if (window.voicePilotClearHighlights) {
        window.voicePilotClearHighlights();
      }

      // Stop microphone
      stopMicrophone();

      // Stop page context monitoring
      stopPageContextMonitoring();

      // Clear timers
      if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
      }
      if (maxDurationTimer) {
        clearTimeout(maxDurationTimer);
        maxDurationTimer = null;
      }

      // Close WebSocket
      if (websocket) {
        websocket.close();
        websocket = null;
      }

      // Close audio context
      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
        audioQueue = 0;
      }

      // Save transcript and conversation data
      if (agentId && finalTranscript) {
        console.log('[VoicePilot] Saving transcript for agent:', agentId);
        
        const saveTranscript = async () => {
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/save-transcript-record`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                agentId,
                content: finalTranscript
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to save transcript');
            }

            console.log('[VoicePilot] Transcript saved successfully');
          } catch (err) {
            console.error('[VoicePilot] Failed to save transcript:', err);
          }
        };

        if (fromUnload) {
          // Use sendBeacon for page unload
          const data = JSON.stringify({
            agentId,
            content: finalTranscript
          });
          navigator.sendBeacon(`${supabaseUrl}/functions/v1/save-transcript-record`, data);
        } else {
          saveTranscript();
        }

        // Save conversation messages
        if (conversationId) {
          const saveMessages = async () => {
            try {
              const response = await fetch(`${supabaseUrl}/functions/v1/save-conversation-messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                  conversationId,
                  content: finalTranscript
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save conversation messages');
              }

              console.log('[VoicePilot] Conversation messages saved successfully');
            } catch (err) {
              console.error('[VoicePilot] Failed to save conversation messages:', err);
            }
          };

          if (!fromUnload) {
            saveMessages();
          }
        }
      }

      // End conversation record
      if (conversationId && finalDuration > 0) {
        const endConversation = async () => {
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/end-conversation-record`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                conversationId,
                duration: finalDuration,
                sentimentScore: null
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to end conversation record');
            }

            console.log('[VoicePilot] Conversation record ended successfully');
          } catch (err) {
            console.error('[VoicePilot] Failed to end conversation record:', err);
          }
        };

        if (!fromUnload) {
          endConversation();
        }
      }

      // Record agent usage
      if (agentId && finalDuration > 0) {
        const recordUsage = async () => {
          try {
            const minutes = Math.ceil(finalDuration / 60);
            const response = await fetch(`${supabaseUrl}/functions/v1/record-agent-usage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                agentId,
                minutes
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to record agent usage');
            }

            console.log('[VoicePilot] Agent usage recorded successfully');
          } catch (err) {
            console.error('[VoicePilot] Failed to record agent usage:', err);
          }
        };

        if (!fromUnload) {
          recordUsage();
        }
      }

      // Reset state
      isCallActive = false;
      duration = 0;
      committedTextRef = '';
      partialTextRef = '';
      conversationId = null;

      // Update UI
      callActive.style.display = 'none';
      callInactive.style.display = 'block';
      agentStatusEl.textContent = 'Ready to help';
      transcriptEl.style.display = 'none';
      transcriptEl.textContent = '';

      console.log('[VoicePilot] Call ended successfully');
    } catch (err) {
      console.error('[VoicePilot] Error ending call:', err);
    }
  };

  // Event listeners
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    chatWidget.style.display = isOpen ? 'block' : 'none';
  });

  closeBtn.addEventListener('click', () => {
    if (isCallActive) {
      endCall();
    } else {
      isOpen = false;
      chatWidget.style.display = 'none';
    }
  });

  startCallBtn.addEventListener('click', startCall);
  endCallBtn.addEventListener('click', () => endCall());

  toggleMicBtn.addEventListener('click', () => {
    if (microphoneStream) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  });

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    if (isCallActive) {
      endCall(true);
    }
  });

  // Initialize
  const init = async () => {
    await initSupabase();
    await fetchAgentData();
    console.log('[VoicePilot] Widget initialized');
  };

  // Expose API
  window.voicepilot = {
    open: () => {
      isOpen = true;
      chatWidget.style.display = 'block';
    },
    close: () => {
      if (isCallActive) {
        endCall();
      } else {
        isOpen = false;
        chatWidget.style.display = 'none';
      }
    },
    startCall: () => {
      if (!isCallActive) {
        startCall();
      }
    },
    endCall: () => {
      if (isCallActive) {
        endCall();
      }
    },
    setPulse: (enabled) => {
      if (enabled) {
        toggleBtn.style.animation = 'pulse 2s infinite';
      } else {
        toggleBtn.style.animation = 'none';
      }
    }
  };

  // Start initialization
  init();
})();