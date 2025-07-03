(function() {
  'use strict';

  // Get configuration from script attributes
  const currentScript = document.currentScript || 
    Array.from(document.querySelectorAll('script')).find(s => s.src.includes('embed.js'));
  
  if (!currentScript) {
    console.error('[VoicePilot] Could not find embed script element');
    return;
  }

  const agentId = currentScript.getAttribute('data-agent');
  const position = currentScript.getAttribute('data-position') || 'bottom-right';
  const supabaseUrl = currentScript.getAttribute('data-supabase-url') || 
    (window.voicepilotSupabaseUrl || 'https://ljfidzppyflrrszkgusa.supabase.co');
  const supabaseAnonKey = currentScript.getAttribute('data-supabase-anon-key') || 
    (window.voicepilotSupabaseKey || '');

  if (!agentId) {
    console.error('[VoicePilot] No agent ID provided');
    return;
  }

  // Initialize Supabase client
  let supabaseClient = null;
  
  // Dynamically load Supabase if not already available
  if (typeof window.supabase === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      console.log('[VoicePilot] Supabase client initialized');
    };
    document.head.appendChild(script);
  } else {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  }

  // Widget state
  let isOpen = false;
  let status = 'idle';
  let transcript = '';
  let duration = 0;
  let websocket = null;
  let durationTimer = null;
  let maxDurationTimer = null;
  let conversationId = null;
  let agentDetails = null;

  // Audio context and streams
  let audioContext = null;
  let microphoneStream = null;
  let screenStream = null;
  let audioQueueTime = 0;
  let isMicrophoneActive = false;
  let isScreenSharing = false;

  // Transcript buffers
  let committedTextRef = '';
  let partialTextRef = '';

  // Create widget container
  const container = document.createElement('div');
  container.id = 'voicepilot-widget';
  container.style.cssText = `
    position: fixed;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Position the container
  const spacing = '24px';
  switch (position) {
    case 'bottom-left':
      container.style.bottom = spacing;
      container.style.left = spacing;
      break;
    case 'top-right':
      container.style.top = spacing;
      container.style.right = spacing;
      break;
    case 'top-left':
      container.style.top = spacing;
      container.style.left = spacing;
      break;
    default:
      container.style.bottom = spacing;
      container.style.right = spacing;
      break;
  }

  document.body.appendChild(container);

  // Enhanced highlighting system with elegant pulsating stroke
  function addHighlightStyles() {
    if (document.getElementById('voicepilot-highlight-style')) return;
    
    const style = document.createElement('style');
    style.id = 'voicepilot-highlight-style';
    style.textContent = `
      @keyframes voicepilot-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(255, 165, 0, 0.7);
          outline: 2px solid rgba(255, 165, 0, 0.8);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(255, 165, 0, 0.3);
          outline: 3px solid rgba(255, 140, 0, 1);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(255, 165, 0, 0);
          outline: 2px solid rgba(255, 165, 0, 0.8);
        }
      }
      
      .voicepilot-highlight {
        animation: voicepilot-pulse 2s ease-in-out infinite !important;
        border-radius: 4px !important;
        position: relative !important;
        z-index: 1000 !important;
      }
      
      .voicepilot-highlight::before {
        content: '';
        position: absolute;
        top: -4px;
        left: -4px;
        right: -4px;
        bottom: -4px;
        background: linear-gradient(45deg, rgba(255, 165, 0, 0.1), rgba(255, 140, 0, 0.1));
        border-radius: 8px;
        z-index: -1;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  // Enhanced element highlighting function - only highlights text in quotes
  function highlightElement(message) {
    if (!message || typeof message !== 'string') return false;
    
    console.log('[VoicePilot] Attempting to highlight element for message:', message);
    
    // Extract text within quotes using regex
    const quotedTextMatches = message.match(/"([^"]+)"/g);
    
    if (!quotedTextMatches || quotedTextMatches.length === 0) {
      console.log('[VoicePilot] No quoted text found in message');
      return false;
    }
    
    // Remove quotes from the matched text
    const quotedTexts = quotedTextMatches.map(match => match.slice(1, -1));
    console.log('[VoicePilot] Found quoted texts:', quotedTexts);
    
    // Comprehensive selector for UI elements
    const selectors = [
      // Explicit data attributes
      '[data-agent-id]',
      '[data-testid]',
      '[data-cy]',
      '[data-test]',
      
      // Interactive elements
      'button',
      'a[href]',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="option"]',
      
      // Form elements
      'input[type="button"]',
      'input[type="submit"]',
      'input[type="reset"]',
      'input[placeholder]',
      'textarea[placeholder]',
      'select',
      'label',
      
      // Navigation elements
      'nav a',
      '.nav-link',
      '.menu-item',
      '.breadcrumb a',
      
      // Common UI patterns
      '.btn',
      '.button',
      '.link',
      '.tab',
      '.card',
      '.modal-header',
      '.dropdown-item',
      '.list-item',
      
      // Headings and labels
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      '.title',
      '.heading',
      '.label',
      '.caption',
      
      // Content areas
      '.content',
      '.section',
      '.panel',
      '.widget',
      
      // Icons and images with alt text
      'img[alt]',
      'svg[aria-label]',
      '[aria-label]',
      '[title]'
    ];
    
    const candidates = Array.from(document.querySelectorAll(selectors.join(',')));
    console.log('[VoicePilot] Found', candidates.length, 'potential elements to check');
    
    // Function to extract text content from an element
    function getElementText(element) {
      const texts = [];
      
      // Get various text sources
      const dataId = element.getAttribute('data-agent-id');
      const ariaLabel = element.getAttribute('aria-label');
      const title = element.getAttribute('title');
      const alt = element.getAttribute('alt');
      const placeholder = element.getAttribute('placeholder');
      const value = element.getAttribute('value');
      const innerText = element.innerText || element.textContent || '';
      
      // Add all non-empty text sources
      if (dataId) texts.push(dataId);
      if (ariaLabel) texts.push(ariaLabel);
      if (title) texts.push(title);
      if (alt) texts.push(alt);
      if (placeholder) texts.push(placeholder);
      if (value) texts.push(value);
      if (innerText) texts.push(innerText);
      
      return texts;
    }
    
    // Function to check if text matches any of the quoted texts
    function textMatches(text, quotedTexts) {
      if (!text || text.length < 2) return null;
      
      const normalizedText = text.toLowerCase().trim();
      
      for (const quotedText of quotedTexts) {
        const normalizedQuoted = quotedText.toLowerCase().trim();
        
        // Exact match
        if (normalizedText === normalizedQuoted) {
          return { score: 100, type: 'exact', matchedText: quotedText };
        }
        
        // Contains match
        if (normalizedText.includes(normalizedQuoted) || normalizedQuoted.includes(normalizedText)) {
          return { score: 80, type: 'contains', matchedText: quotedText };
        }
        
        // Word boundary match
        const quotedWords = normalizedQuoted.split(/\s+/);
        const textWords = normalizedText.split(/\s+/);
        
        let matchingWords = 0;
        for (const quotedWord of quotedWords) {
          if (textWords.some(textWord => 
            textWord.includes(quotedWord) || quotedWord.includes(textWord)
          )) {
            matchingWords++;
          }
        }
        
        if (matchingWords > 0) {
          const score = (matchingWords / quotedWords.length) * 60;
          return { score, type: 'partial', matchedText: quotedText };
        }
        
        // Fuzzy match for common variations (case insensitive, punctuation removed)
        const cleanText = normalizedText.replace(/[^a-z0-9]/g, '');
        const cleanQuoted = normalizedQuoted.replace(/[^a-z0-9]/g, '');
        
        if (cleanText.includes(cleanQuoted) || cleanQuoted.includes(cleanText)) {
          return { score: 40, type: 'fuzzy', matchedText: quotedText };
        }
      }
      
      return null;
    }
    
    // Find the best matching element
    let bestMatch = null;
    let bestScore = 0;
    
    for (const element of candidates) {
      // Skip hidden elements
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        continue;
      }
      
      const texts = getElementText(element);
      
      for (const text of texts) {
        const match = textMatches(text, quotedTexts);
        if (match && match.score > bestScore) {
          bestScore = match.score;
          bestMatch = { element, text, ...match };
        }
      }
    }
    
    // Highlight the best match if score is good enough
    if (bestMatch && bestScore >= 40) {
      console.log('[VoicePilot] Highlighting element:', {
        element: bestMatch.element,
        text: bestMatch.text,
        matchedQuotedText: bestMatch.matchedText,
        score: bestScore,
        type: bestMatch.type
      });
      
      // Clear any existing highlights
      clearHighlights();
      
      // Add highlight class
      bestMatch.element.classList.add('voicepilot-highlight');
      
      // Scroll element into view if needed
      const rect = bestMatch.element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        bestMatch.element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
      
      return true;
    }
    
    console.log('[VoicePilot] No suitable element found for highlighting quoted text. Best score:', bestScore);
    return false;
  }

  // Clear all highlights
  function clearHighlights() {
    const highlighted = document.querySelectorAll('.voicepilot-highlight');
    highlighted.forEach(el => el.classList.remove('voicepilot-highlight'));
  }

  // Add highlight styles when the script loads
  addHighlightStyles();

  // Expose highlighting functions globally
  window.voicePilotHighlight = highlightElement;
  window.voicePilotClearHighlights = clearHighlights;

  // Clear highlights on page navigation
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      clearHighlights();
      console.log('[VoicePilot] Page navigation detected, cleared highlights');
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  // Also listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    clearHighlights();
    console.log('[VoicePilot] Popstate navigation detected, cleared highlights');
  });

  // Fetch agent details from Supabase
  async function fetchAgentDetails(agentId) {
    try {
      console.log('[VoicePilot] Fetching agent details for:', agentId);
      
      if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabaseClient
        .from('agents')
        .select('instructions, documentation_urls, status')
        .eq('id', agentId)
        .single();

      if (error) {
        console.error('[VoicePilot] Error fetching agent:', error);
        throw new Error(`Failed to fetch agent: ${error.message}`);
      }

      if (!data) {
        throw new Error('Agent not found');
      }

      if (data.status !== 'active') {
        throw new Error('Agent is not active');
      }

      console.log('[VoicePilot] Agent details loaded:', {
        hasInstructions: !!data.instructions,
        documentationUrls: data.documentation_urls?.length || 0
      });

      return {
        instructions: data.instructions || 'You are a helpful AI assistant.',
        documentationUrls: data.documentation_urls || []
      };
    } catch (error) {
      console.error('[VoicePilot] Failed to fetch agent details:', error);
      throw error;
    }
  }

  // Update transcript display
  function updateTranscriptDisplay() {
    const committed = committedTextRef;
    const partial = partialTextRef;
    
    let fullText = committed;
    if (committed && partial) {
      const needsSpace = !committed.endsWith(' ') && !partial.startsWith(' ');
      fullText = committed + (needsSpace ? ' ' : '') + partial;
    } else if (partial) {
      fullText = partial;
    }
    
    transcript = fullText;
    updateUI();
  }

  // Play audio buffer
  async function playAudioBuffer(pcmBlob) {
    try {
      console.log('[VoicePilot] Received audio buffer, size:', pcmBlob.size, 'bytes');
      
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
      if (audioQueueTime > audioContext.currentTime) {
        startAt = audioQueueTime;
      }
      source.start(startAt);
      audioQueueTime = startAt + buffer.duration;
      
      console.log('[VoicePilot] Playing audio buffer, duration:', buffer.duration.toFixed(3), 'seconds');
    } catch (err) {
      console.error('[VoicePilot] Error playing audio buffer:', err);
    }
  }

  // Start microphone streaming
  async function startMicStreaming() {
    try {
      console.log('[VoicePilot] Requesting microphone access...');
      
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStream = micStream;
      
      console.log('[VoicePilot] Microphone access granted, setting up audio processing...');

      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const sourceNode = audioContext.createMediaStreamSource(micStream);
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      sourceNode.connect(processor);
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

      isMicrophoneActive = true;
      console.log('[VoicePilot] Microphone streaming started successfully');
    } catch (err) {
      console.error('[VoicePilot] Microphone streaming error:', err);
      throw new Error('Failed to capture microphone.');
    }
  }

  // Create conversation record
  async function createConversationRecord(agentId) {
    try {
      console.log('[VoicePilot] Creating conversation record for agent:', agentId);

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
      console.log('[VoicePilot] Created conversation record:', result.conversationId);
      return result.conversationId;
    } catch (err) {
      console.error('[VoicePilot] Error creating conversation record:', err);
      return null;
    }
  }

  // Start call
  async function startCall() {
    try {
      if (websocket) {
        console.warn('[VoicePilot] Call already in progress');
        return;
      }

      console.log('[VoicePilot] Starting call...');
      status = 'connecting';
      duration = 0;
      committedTextRef = '';
      partialTextRef = '';
      transcript = '';
      updateUI();

      // Fetch agent details first
      agentDetails = await fetchAgentDetails(agentId);

      // Create conversation record
      conversationId = await createConversationRecord(agentId);

      // Start duration timer
      durationTimer = setInterval(() => {
        duration++;
        updateUI();
      }, 1000);

      // Get relay URL from backend
      const response = await fetch(`${supabaseUrl}/functions/v1/start-call`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ 
          agentId, 
          instructions: agentDetails.instructions, 
          documentationUrls: agentDetails.documentationUrls 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start call');
      }

      const { relayUrl } = await response.json();
      console.log('[VoicePilot] Using relay URL:', relayUrl);

      const ws = new WebSocket(relayUrl);
      websocket = ws;

      ws.onopen = () => {
        console.log('[VoicePilot] WebSocket connection established');
        status = 'connecting';
        updateUI();

        // Create tools array if documentation URLs are provided
        const tools = [];
        if (agentDetails.documentationUrls?.length) {
          tools.push({
            url_context: {
              urls: agentDetails.documentationUrls
            }
          });
        }

        // Enhanced system instruction with agent's actual instructions
        const enhancedSystemInstruction = `${agentDetails.instructions}

When responding, consider the user's current location and what they can see on the page. If they ask about something that doesn't match their current context, gently guide them or ask for clarification. When you mention specific UI elements, buttons, or parts of the interface in your responses, I will automatically highlight them for the user. Speak naturally about what you see and what actions the user might take.`;

        // Setup message with tools and Kore voice - AUDIO ONLY
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

        console.log('[VoicePilot] Sending setup with agent instructions');
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = async (ev) => {
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
              status = 'active';
              updateUI();

              if (ws.readyState === WebSocket.OPEN) {
                const greeting = {
                  clientContent: {
                    turns: [{ role: 'user', parts: [{ text: 'Hello!' }] }],
                    turnComplete: true,
                  },
                };
                ws.send(JSON.stringify(greeting));
                console.log('[VoicePilot] Sent initial greeting');
              }

              startMicStreaming();
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
                  console.log('[VoicePilot] AI transcription fragment:', text);
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
                  
                  // Highlight elements mentioned by AI (only if they contain quoted text)
                  if (partialText) {
                    highlightElement(partialText);
                  }
                  
                  console.log('[VoicePilot] AI said (complete):', partialText);
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
                  console.log('[VoicePilot] User transcription:', userText);
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
                console.log('[VoicePilot] Turn complete - committing partial buffer');
                const partialText = partialTextRef.trim();
                
                if (committedTextRef && partialText) {
                  const needsSpace = !committedTextRef.endsWith(' ') && !partialText.startsWith(' ');
                  committedTextRef += (needsSpace ? ' ' : '') + partialText;
                } else if (partialText) {
                  committedTextRef = partialText;
                }
                
                partialTextRef = '';
                updateTranscriptDisplay();
                
                if (partialText) {
                  highlightElement(partialText);
                }
                
                console.log('[VoicePilot] AI said (turn complete):', partialText);
              }
            }

            return;
          } catch (parseError) {
            console.error('[VoicePilot] JSON parse error:', parseError);
          }
        }

        console.log('[VoicePilot] Playing raw PCM audio');
        playAudioBuffer(blob);
      };

      ws.onerror = (err) => {
        console.error('[VoicePilot] WebSocket error:', err);
        status = 'error';
        updateUI();
      };

      ws.onclose = (ev) => {
        console.log('[VoicePilot] WebSocket closed:', ev.code, ev.reason);
        status = 'ended';
        websocket = null;
        updateUI();
      };

    } catch (err) {
      console.error('[VoicePilot] Failed to start call:', err);
      status = 'error';
      updateUI();
    }
  }

  // End call with transcript saving
  async function endCall(fromUnload = false) {
    try {
      const finalDuration = duration;
      const finalTranscript = (committedTextRef + partialTextRef).trim();
      const currentAgentId = agentId;
      const currentConversationId = conversationId;

      console.log('[VoicePilot] Ending call - Duration:', finalDuration, 'seconds, Transcript length:', finalTranscript.length);

      // Clear highlights when call ends
      clearHighlights();

      // Stop all streams
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
        isMicrophoneActive = false;
      }

      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        isScreenSharing = false;
      }

      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
        audioQueueTime = 0;
      }

      if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
      }

      if (maxDurationTimer) {
        clearTimeout(maxDurationTimer);
        maxDurationTimer = null;
      }

      if (websocket) {
        websocket.close();
        websocket = null;
      }

      status = 'ended';
      conversationId = null;
      updateUI();

      // Save transcript and conversation data
      if (currentAgentId && finalTranscript) {
        console.log('[VoicePilot] Saving transcript for agent:', currentAgentId);
        
        const saveTranscriptData = {
          agentId: currentAgentId,
          content: finalTranscript
        };

        if (fromUnload) {
          // Use sendBeacon for page unload
          const blob = new Blob([JSON.stringify(saveTranscriptData)], { type: 'application/json' });
          navigator.sendBeacon(`${supabaseUrl}/functions/v1/save-transcript-record`, blob);
        } else {
          // Normal fetch request
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/save-transcript-record`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify(saveTranscriptData)
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to save transcript');
            }

            console.log('[VoicePilot] Transcript saved successfully');
          } catch (err) {
            console.error('[VoicePilot] Failed to save transcript:', err);
          }
        }

        // Save conversation messages if we have a conversation record
        if (currentConversationId) {
          const saveMessagesData = {
            conversationId: currentConversationId,
            content: finalTranscript
          };

          if (fromUnload) {
            const blob = new Blob([JSON.stringify(saveMessagesData)], { type: 'application/json' });
            navigator.sendBeacon(`${supabaseUrl}/functions/v1/save-conversation-messages`, blob);
          } else {
            try {
              const response = await fetch(`${supabaseUrl}/functions/v1/save-conversation-messages`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify(saveMessagesData)
              });

              if (!response.ok) {
                const error = await response.json();
                console.error('[VoicePilot] Failed to save conversation messages:', error);
              } else {
                console.log('[VoicePilot] Conversation messages saved successfully');
              }
            } catch (err) {
              console.error('[VoicePilot] Failed to save conversation messages:', err);
            }
          }
        }
      }

      // End conversation record
      if (currentConversationId && finalDuration > 0) {
        const endConversationData = {
          conversationId: currentConversationId,
          duration: finalDuration,
          sentimentScore: null
        };

        if (fromUnload) {
          const blob = new Blob([JSON.stringify(endConversationData)], { type: 'application/json' });
          navigator.sendBeacon(`${supabaseUrl}/functions/v1/end-conversation-record`, blob);
        } else {
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/end-conversation-record`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify(endConversationData)
            });

            if (!response.ok) {
              const error = await response.json();
              console.error('[VoicePilot] Failed to end conversation record:', error);
            } else {
              console.log('[VoicePilot] Conversation record ended successfully');
            }
          } catch (err) {
            console.error('[VoicePilot] Failed to end conversation record:', err);
          }
        }
      }

      // Record usage for the agent owner
      if (currentAgentId && finalDuration > 0) {
        const minutes = Math.ceil(finalDuration / 60);
        const recordUsageData = {
          agentId: currentAgentId,
          minutes: minutes
        };

        if (fromUnload) {
          const blob = new Blob([JSON.stringify(recordUsageData)], { type: 'application/json' });
          navigator.sendBeacon(`${supabaseUrl}/functions/v1/record-agent-usage`, blob);
        } else {
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/record-agent-usage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify(recordUsageData)
            });

            if (!response.ok) {
              const error = await response.json();
              console.error('[VoicePilot] Failed to record agent usage:', error);
            } else {
              console.log('[VoicePilot] Agent usage recorded successfully');
            }
          } catch (err) {
            console.error('[VoicePilot] Failed to record agent usage:', err);
          }
        }
      }

      console.log('[VoicePilot] Call ended successfully');
    } catch (err) {
      console.error('[VoicePilot] Error ending call:', err);
      status = 'error';
      updateUI();
    }
  }

  // Toggle microphone
  function toggleMicrophone() {
    if (isMicrophoneActive && microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      microphoneStream = null;
      isMicrophoneActive = false;
    } else if (!isMicrophoneActive) {
      startMicStreaming().catch(err => {
        console.error('[VoicePilot] Failed to start microphone:', err);
      });
    }
    updateUI();
  }

  // Format time
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Update UI
  function updateUI() {
    if (isOpen) {
      renderExpandedWidget();
    } else {
      renderCollapsedWidget();
    }
  }

  // Render collapsed widget
  function renderCollapsedWidget() {
    container.innerHTML = `
      <button id="voicepilot-toggle" style="
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        color: white;
        font-size: 0;
        overflow: hidden;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <img src="/logovp.png" alt="VoicePilot" style="
          width: 32px;
          height: 32px;
          object-fit: contain;
        " onerror="this.style.display='none'; this.parentElement.innerHTML='💬'; this.parentElement.style.fontSize='24px';">
      </button>
    `;

    document.getElementById('voicepilot-toggle').onclick = () => {
      isOpen = true;
      updateUI();
    };
  }

  // Render expanded widget
  function renderExpandedWidget() {
    const statusColor = {
      'idle': '#6b7280',
      'connecting': '#f59e0b',
      'active': '#10b981',
      'ended': '#6b7280',
      'error': '#ef4444'
    }[status] || '#6b7280';

    container.innerHTML = `
      <div style="
        width: 320px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        border: 1px solid #e5e7eb;
        overflow: hidden;
        margin-bottom: 16px;
      ">
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 40px;
              height: 40px;
              background: rgba(255,255,255,0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            ">
              <img src="/logovp.png" alt="VoicePilot" style="
                width: 24px;
                height: 24px;
                object-fit: contain;
              " onerror="this.style.display='none'; this.parentElement.innerHTML='🤖'; this.parentElement.style.fontSize='18px';">
            </div>
            <div>
              <div style="font-weight: 600; font-size: 14px;">AI Assistant</div>
              <div style="font-size: 12px; opacity: 0.9;">
                ${status === 'active' ? `${formatTime(duration)} elapsed` : status}
              </div>
            </div>
          </div>
          <button id="voicepilot-close" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          ">×</button>
        </div>

        <div style="padding: 16px;">
          ${status !== 'active' ? `
            <div style="text-align: center; margin-bottom: 16px;">
              <div style="
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
                font-size: 24px;
              ">🎤</div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                ${status === 'connecting' ? 'Establishing connection...' : 'Start a voice conversation with your AI assistant'}
              </p>
            </div>
            <button id="voicepilot-start" style="
              width: 100%;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 12px;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              font-size: 14px;
              ${status === 'connecting' ? 'opacity: 0.7; cursor: not-allowed;' : ''}
            " ${status === 'connecting' ? 'disabled' : ''}>
              ${status === 'connecting' ? 'Connecting...' : '🎤 Start Voice Chat'}
            </button>
          ` : `
            <div style="display: flex; align-items: center; justify-center; gap: 8px; margin-bottom: 12px;">
              <div style="
                width: 8px;
                height: 8px;
                background: ${statusColor};
                border-radius: 50%;
                animation: pulse 2s infinite;
              "></div>
              <span style="font-size: 12px; font-weight: 600; color: #374151;">LIVE</span>
            </div>

            ${transcript ? `
              <div style="
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                max-height: 120px;
                overflow-y: auto;
                font-size: 13px;
                line-height: 1.4;
                color: #374151;
              ">${transcript}</div>
            ` : ''}

            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <button id="voicepilot-mic" style="
                flex: 1;
                background: ${isMicrophoneActive ? '#10b981' : '#f3f4f6'};
                color: ${isMicrophoneActive ? 'white' : '#6b7280'};
                border: none;
                padding: 8px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
              ">
                ${isMicrophoneActive ? '🎤' : '🔇'} ${isMicrophoneActive ? 'Mute' : 'Unmute'}
              </button>
            </div>

            <button id="voicepilot-end" style="
              width: 100%;
              background: #ef4444;
              color: white;
              border: none;
              padding: 10px;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 13px;
            ">📞 End Call</button>
          `}
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('voicepilot-close').onclick = () => {
      if (status === 'active') {
        endCall();
      } else {
        isOpen = false;
        updateUI();
      }
    };

    if (status !== 'active') {
      const startBtn = document.getElementById('voicepilot-start');
      if (startBtn && status !== 'connecting') {
        startBtn.onclick = startCall;
      }
    } else {
      document.getElementById('voicepilot-mic').onclick = toggleMicrophone;
      document.getElementById('voicepilot-end').onclick = () => endCall();
    }
  }

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    if (status === 'active') {
      endCall(true);
    }
  });

  // Initial render
  updateUI();

  // Expose API
  window.voicepilot = {
    open: () => {
      isOpen = true;
      updateUI();
    },
    close: () => {
      if (status === 'active') {
        endCall();
      } else {
        isOpen = false;
        updateUI();
      }
    },
    startCall: startCall,
    endCall: () => endCall(),
    setPulse: (enabled) => {
      if (enabled) {
        container.classList.add('animate-pulse');
      } else {
        container.classList.remove('animate-pulse');
      }
    }
  };

  console.log('[VoicePilot] Widget initialized successfully');
})();