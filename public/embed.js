/\b(fill\s+in|enter|type\s+in)\s+(?:the\s+)?['"]?([^'".\s]+(?:\s+[^'".\s]+)*?)['"]?(?:\s+(?:field|input|box|area))/i
      ];
      
      for (const pattern of patterns) {
        const match = this.streamBuffer.match(pattern);
        if (match && match[2] && match[2].length > 2) {
          this.processStream(match[2]);
          return;
        }
      }
      
      // Fallback: process with short delay for any other potential matches
      this.streamTimeout = setTimeout(() => this.processStreamBuffer(), 200);
    }

    processStream(elementText) {
      const now = Date.now();
      if (now - this.lastStreamHighlight < 800) return; // Shorter cooldown for streaming
      
      console.log('[VoicePilot] Real-time highlight attempt:', elementText);
      if (domHighlighter.highlightElement(elementText)) {
        this.lastStreamHighlight = now;
        this.streamBuffer = ''; // Clear buffer on successful highlight
      }
    }

    processStreamBuffer() {
      // Extract the most recent potential element name
      const words = this.streamBuffer.trim().split(/\s+/);
      if (words.length >= 2) {
        // Try last 2-4 words as potential element names
        for (let i = Math.min(4, words.length); i >= 2; i--) {
          const phrase = words.slice(-i).join(' ');
          if (phrase.length > 3 && phrase.length < 30) {
            this.processStream(phrase);
            break;
          }
        }
      }
    }

    // Original method for backward compatibility
    addText(txt) {
      if (!txt || !txt.trim()) return;
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
      this.textBuffer += (this.textBuffer && !this.textBuffer.endsWith(' ') && /^[A-Za-z]/.test(txt) ? ' ' : '') + txt;
      this.bufferTimeout = setTimeout(() => this.process(), this.delay);
    }

    process() {
      const now = Date.now();
      if (now - this.lastHighlightTime < this.cooldown) {
        this.textBuffer = '';
        return;
      }
      const phrase = this.textBuffer.trim();
      this.textBuffer = '';
      if (!phrase || phrase.length < 3) return;
      // simple filter to skip greetings
      if (/^(hi|hello|thanks?|please)$/i.test(phrase)) return;
      console.log('[VoicePilot] Trying to highlight:', phrase);
      if (domHighlighter.highlightElement(phrase)) {
        this.lastHighlightTime = now;
      }
    }

    clear() {
      this.textBuffer = '';
      this.streamBuffer = '';
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
      if (this.streamTimeout) clearTimeout(this.streamTimeout);
    }
  }

  const smartHighlighter = new SmartHighlighter();

  // Expose global functions
  window.voicePilotHighlight = text => { 
    if (text && text.trim()) {
      smartHighlighter.addText(text); 
    }
    return true; 
  };

  // 🆕 NEW: Expose real-time streaming highlight function
  window.voicePilotHighlightStream = text => {
    if (text && text.trim()) {
      smartHighlighter.addStreamingText(text);
    }
    return true;
  };
  
  window.voicePilotClearHighlights = () => {
    domHighlighter.clearHighlights();
    smartHighlighter.clear();
  };

  // ✅ NEW: Expose page context function
  window.voicePilotGetPageContext = () => {
    return pageContextCapture.getContextSummary();
  };

  // ────────────────────────────────────────────────────
  // Widget creation with NEW SLEEK UI
  // ────────────────────────────────────────────────────
  function createWidget() {
    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'voicepilot-widget';
    
    // Position mapping
    const positions = {
      'bottom-right': { bottom: '24px', right: '24px' },
      'bottom-left': { bottom: '24px', left: '24px' },
      'top-right': { top: '24px', right: '24px' },
      'top-left': { top: '24px', left: '24px' }
    };
    
    const pos = positions[position] || positions['bottom-right'];
    
    // Apply styles
    Object.assign(widget.style, {
      position: 'fixed',
      zIndex: '10000',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      ...pos
    });

    // Inject CSS for the new design
    const styleSheet = document.createElement('style');
    styleSheet.id = 'voicepilot-widget-styles';
    styleSheet.textContent = `
      #voicepilot-widget * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Minimized State */
      .vp-minimized {
        background: white;
        border-radius: 24px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 8px 16px;
        gap: 12px;
        min-width: 140px;
        height: 48px;
        border: none;
        font-family: inherit;
      }

      .vp-minimized:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      }

      /* Logo */
      .vp-logo {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #00d4ff 0%, #0066ff 100%);
        border-radius: 50%;
        position: relative;
        flex-shrink: 0;
      }

      .vp-logo::before {
        content: '';
        position: absolute;
        top: 4px;
        left: 4px;
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, #0099cc 0%, #003d7a 100%);
        border-radius: 50% 0 50% 50%;
        transform: rotate(-45deg);
      }

      /* Brand Text */
      .vp-brand {
        font-weight: 600;
        font-size: 14px;
        color: #333;
        white-space: nowrap;
      }

      /* Connected State Actions */
      .vp-actions {
        display: none;
        gap: 8px;
        margin-left: auto;
      }

      .vp-minimized.connected .vp-actions {
        display: flex;
      }

      .vp-minimized.connected .vp-brand {
        display: none;
      }

      .vp-minimized.connected {
        animation: connectedGlow 2s infinite;
      }

      @keyframes connectedGlow {
        0%, 100% { box-shadow: 0 4px 20px rgba(0, 212, 255, 0.2); }
        50% { box-shadow: 0 4px 30px rgba(0, 212, 255, 0.4); }
      }

      .vp-action-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: bold;
        font-size: 14px;
        font-family: inherit;
      }

      .vp-end-call {
        background: #ff4444;
        color: white;
      }

      .vp-end-call:hover {
        background: #cc3333;
        transform: scale(1.1);
      }

      .vp-expand {
        background: #f0f0f0;
        color: #666;
      }

      .vp-expand:hover {
        background: #e0e0e0;
        transform: scale(1.1);
      }

      /* Expanded Widget */
      .vp-expanded {
        position: absolute;
        bottom: 56px;
        right: 0;
        width: 300px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        transform: translateY(20px) scale(0.9);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(0, 0, 0, 0.05);
      }

      .vp-expanded.show {
        transform: translateY(0) scale(1);
        opacity: 1;
        visibility: visible;
      }

      .vp-header {
        padding: 16px 20px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .vp-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        color: #1a1a1a;
        font-size: 16px;
      }

      .vp-title .vp-logo {
        width: 24px;
        height: 24px;
      }

      .vp-close {
        width: 32px;
        height: 32px;
        border: none;
        background: #f5f5f5;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        font-family: inherit;
      }

      .vp-close:hover {
        background: #e5e5e5;
      }

      .vp-content {
        padding: 16px 20px;
      }

      /* States */
      .vp-status {
        text-align: center;
        margin-bottom: 12px;
        font-size: 14px;
      }

      .vp-status.ready {
        color: #666;
      }

      .vp-status.connecting {
        color: #ff6b35;
      }

      .vp-status.connected {
        color: #00c853;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .vp-indicator {
        width: 8px;
        height: 8px;
        background: #00c853;
        border-radius: 50%;
        animation: blink 1.5s infinite;
      }

      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }

      .vp-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }

      .vp-btn.primary {
        background: linear-gradient(135deg, #00d4ff 0%, #0066ff 100%);
        color: white;
      }

      .vp-btn.primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(0, 212, 255, 0.3);
      }

      .vp-btn.danger {
        background: #ff4444;
        color: white;
      }

      .vp-btn.danger:hover {
        background: #cc3333;
      }

      /* Loading spinner */
      .vp-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #00d4ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .vp-hidden {
        display: none;
      }

      /* Consent Modal */
      .vp-consent-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s;
      }

      .vp-consent-overlay.show {
        opacity: 1;
        visibility: visible;
      }

      .vp-consent-modal {
        background: white;
        padding: 32px;
        border-radius: 16px;
        max-width: 400px;
        margin: 20px;
        transform: scale(0.9);
        transition: transform 0.3s;
      }

      .vp-consent-overlay.show .vp-consent-modal {
        transform: scale(1);
      }

      .vp-consent-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #1a1a1a;
      }

      .vp-consent-text {
        font-size: 14px;
        color: #666;
        line-height: 1.5;
        margin-bottom: 24px;
      }

      .vp-consent-actions {
        display: flex;
        gap: 12px;
      }

      .vp-consent-actions button {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
    `;
    document.head.appendChild(styleSheet);

    // Widget HTML with new design
    widget.innerHTML = `
      <!-- Minimized State -->
      <button class="vp-minimized" id="vp-minimized">
        <div class="vp-logo"></div>
        <span class="vp-brand">Voice Pilot</span>
        
        <!-- Actions when connected -->
        <div class="vp-actions">
          <button class="vp-action-btn vp-end-call" id="vp-end-call" title="End Call">✕</button>
          <button class="vp-action-btn vp-expand" id="vp-expand" title="Expand">↑</button>
        </div>
      </button>

      <!-- Expanded Widget -->
      <div class="vp-expanded" id="vp-expanded">
        <div class="vp-header">
          <div class="vp-title">
            <div class="vp-logo"></div>
            Voice Pilot
          </div>
          <button class="vp-close" id="vp-close">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="vp-content">
          <!-- Ready State -->
          <div id="vp-ready-state">
            <div class="vp-status ready">Ready to help you navigate</div>
            <button class="vp-btn primary" id="vp-start-call">Start Call</button>
          </div>

          <!-- Connecting State -->
          <div id="vp-connecting-state" class="vp-hidden">
            <div class="vp-status connecting">Connecting...</div>
            <div class="vp-spinner"></div>
          </div>

          <!-- Connected State -->
          <div id="vp-connected-state" class="vp-hidden">
            <div class="vp-status connected">
              <span class="vp-indicator"></span>
              Connected - Speak now
            </div>
            <button class="vp-btn danger" id="vp-end-call-2">End Call</button>
          </div>
        </div>
      </div>

      <!-- Consent Modal -->
      <div class="vp-consent-overlay" id="vp-consent-overlay">
        <div class="vp-consent-modal">
          <h3 class="vp-consent-title">Start Voice Session</h3>
          <p class="vp-consent-text">
            Your conversation will be recorded to help us provide better support. 
            You can end the session at any time.
          </p>
          <div class="vp-consent-actions">
            <button id="vp-consent-cancel" style="background: #f5f5f5; color: #666;">Cancel</button>
            <button id="vp-consent-accept" style="background: #00d4ff; color: white;">Start Session</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Get elements
    const minimized = widget.querySelector('#vp-minimized');
    const expanded = widget.querySelector('#vp-expanded');
    const expandBtn = widget.querySelector('#vp-expand');
    const endCallBtn = widget.querySelector('#vp-end-call');
    const endCallBtn2 = widget.querySelector('#vp-end-call-2');
    const closeBtn = widget.querySelector('#vp-close');
    const startCallBtn = widget.querySelector('#vp-start-call');
    const consentOverlay = widget.querySelector('#vp-consent-overlay');
    const consentAccept = widget.querySelector('#vp-consent-accept');
    const consentCancel = widget.querySelector('#vp-consent-cancel');
    
    const readyState = widget.querySelector('#vp-ready-state');
    const connectingState = widget.querySelector('#vp-connecting-state');
    const connectedState = widget.querySelector('#vp-connected-state');

    let currentState = 'ready';
    let isExpanded = false;
    let isCallActive = false;
    let websocket = null;

    // Audio processing refs (mirroring original code)
    let audioContextRef = { current: null };
    let audioQueueTimeRef = { current: 0 };
    let committedTextRef = { current: '' };
    let partialTextRef = { current: '' };
    let greetingSentRef = { current: false };
    let pageContextIntervalRef = { current: null };
    let currentPageContextRef = { current: '' };
    let lastSentPageContextRef = { current: '' };

    // Initialize Supabase client
    let supabaseClient = null;
    if (window.voicepilotSupabaseUrl && window.voicepilotSupabaseKey) {
      // Dynamically import Supabase client
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      document.head.appendChild(script);
      
      script.onload = () => {
        supabaseClient = window.supabase.createClient(
          window.voicepilotSupabaseUrl,
          window.voicepilotSupabaseKey
        );
      };
    }

    // Helper functions
    function showState(state) {
      // Hide all states
      readyState.classList.add('vp-hidden');
      connectingState.classList.add('vp-hidden');
      connectedState.classList.add('vp-hidden');
      
      // Show target state
      if (state === 'ready') readyState.classList.remove('vp-hidden');
      if (state === 'connecting') connectingState.classList.remove('vp-hidden');
      if (state === 'connected') connectedState.classList.remove('vp-hidden');
      
      currentState = state;
      
      // Update minimized appearance
      minimized.classList.remove('connected');
      if (state === 'connected') {
        minimized.classList.add('connected');
      }
    }

    function toggleWidget() {
      isExpanded = !isExpanded;
      if (isExpanded) {
        expanded.classList.add('show');
      } else {
        expanded.classList.remove('show');
      }
    }

    function handleMinimizedClick(e) {
      // Only expand if not clicking on action buttons and not connected
      if (!e.target.closest('.vp-actions') && currentState !== 'connected') {
        toggleWidget();
      }
    }

    function expandWidget(e) {
      e.stopPropagation();
      toggleWidget();
    }

    // Audio processing functions (copied from original)
    const playAudioBuffer = async (pcmBlob) => {
      try {
        console.log('[VoicePilot][Audio] Received audio buffer, size:', pcmBlob.size, 'bytes');
        
        const arrayBuffer = await pcmBlob.arrayBuffer();
        const pcm16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }

        if (!audioContextRef.current) {
          audioContextRef.current =
            new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = audioContextRef.current;

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
        
        console.log('[VoicePilot][Audio] Playing audio buffer, duration:', buffer.duration.toFixed(3), 'seconds');
      } catch (err) {
        console.error('[VoicePilot] playAudioBuffer() error decoding PCM16:', err);
      }
    };

    const getPageContext = () => {
      try {
        if (typeof window !== 'undefined' && window.voicePilotGetPageContext) {
          return window.voicePilotGetPageContext();
        }
      } catch (error) {
        console.warn('[VoicePilot] Error getting page context:', error);
      }
      
      // Fallback context
      return `Page: ${document.title || 'Unknown'}, URL: ${window.location.pathname}`;
    };

    const startPageContextMonitoring = () => {
      if (pageContextIntervalRef.current) {
        clearInterval(pageContextIntervalRef.current);
      }

      pageContextIntervalRef.current = setInterval(() => {
        if (!isCallActive || !websocket || websocket.readyState !== WebSocket.OPEN) {
          return;
        }

        try {
          const newContext = getPageContext();
          currentPageContextRef.current = newContext;

          // Check if context has changed significantly
          if (newContext !== lastSentPageContextRef.current) {
            console.log('[VoicePilot] Page context changed, updating AI:', newContext);
            
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

            websocket.send(JSON.stringify(contextUpdateMessage));
            lastSentPageContextRef.current = newContext;
            
            console.log('[VoicePilot] Sent page context update to AI');
          }
        } catch (error) {
          console.warn('[VoicePilot] Error monitoring page context:', error);
        }
      }, 2000); // Check every 2 seconds
    };

    const stopPageContextMonitoring = () => {
      if (pageContextIntervalRef.current) {
        clearInterval(pageContextIntervalRef.current);
        pageContextIntervalRef.current = null;
      }
    };

    const startMicStreaming = async () => {
      try {
        console.log('[VoicePilot][Audio] Requesting microphone access...');
        
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        
        console.log('[VoicePilot][Audio] Microphone access granted, setting up audio processing...');

        if (!audioContextRef.current) {
          audioContextRef.current =
            new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = audioContextRef.current;

        const sourceNode = audioCtx.createMediaStreamSource(micStream);
        const bufferSize = 4096;
        const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);

        sourceNode.connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (event) => {
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

          if (websocket?.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify(payload));
            // Log audio data transmission (throttled to avoid spam)
            if (Math.random() < 0.01) { // Log ~1% of audio chunks
              console.log(`[VoicePilot][Audio] Sent PCM16 chunk (${pcm16.byteLength * 2} bytes) to relay`);
            }
          }
        };

        console.log('[VoicePilot][Audio] Microphone streaming started successfully');
      } catch (err) {
        console.error('[VoicePilot] Mic streaming error:', err);
        // Could show error in UI here
      }
    };

    // Start call function
    async function startCall() {
      if (isCallActive) return;

      try {
        showState('connecting');

        // Reset state
        committedTextRef.current = '';
        partialTextRef.current = '';
        greetingSentRef.current = false;

        console.log('[VoicePilot] Configuration check:', {
          hasSupabaseUrl: !!window.voicepilotSupabaseUrl,
          hasSupabaseKey: !!window.voicepilotSupabaseKey,
          hasSupabaseClient: !!supabaseClient
        });

        // Fetch agent details from Supabase
        let agentInstructions = 'You are VoicePilot, an AI assistant embedded in a SaaS application to help users navigate and use the app effectively.';
        let documentationUrls = [];

        if (supabaseClient && agentId) {
          try {
            console.log('[VoicePilot] Fetching agent details for ID:', agentId);
            const { data: agent, error } = await supabaseClient
              .from('agents')
              .select('instructions, documentation_urls, status')
              .eq('id', agentId)
              .single();

            if (error) {
              console.error('[VoicePilot] Error fetching agent:', error);
            } else if (agent) {
              if (agent.status !== 'active') {
                throw new Error('This agent is not currently active');
              }
              agentInstructions = agent.instructions || agentInstructions;
              documentationUrls = agent.documentation_urls || [];
              console.log('[VoicePilot] Using agent instructions:', agentInstructions.substring(0, 100) + '...');
            } else {
              console.warn('[VoicePilot] Agent not found, using default instructions');
            }
          } catch (err) {
            console.error('[VoicePilot] Failed to fetch agent details:', err);
            throw new Error('Failed to load agent configuration: ' + err.message);
          }
        } else {
          console.warn('[VoicePilot] No Supabase client or agent ID, using default instructions');
        }

        // Use relay through Supabase
        console.log('[VoicePilot] Using Supabase relay connection');

        const response = await fetch(`${window.voicepilotSupabaseUrl}/functions/v1/start-call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.voicepilotSupabaseKey}`,
          },
          body: JSON.stringify({
            agentId: agentId,
            instructions: agentInstructions,
            documentationUrls: documentationUrls
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to start call');
        }

        const { relayUrl } = await response.json();
        console.log('[VoicePilot] Got relay URL:', relayUrl);

        // Connect to WebSocket
        websocket = new WebSocket(relayUrl);

        websocket.onopen = () => {
          console.log('[VoicePilot] WebSocket connected');
          
          // Get current page context and initialize monitoring
          const pageContext = getPageContext();
          currentPageContextRef.current = pageContext;
          lastSentPageContextRef.current = pageContext;
          console.log('[VoicePilot] Initial page context:', pageContext);

          // Create URL context tools if documentation URLs are provided
          const tools = [];
          
          if (documentationUrls?.length) {
            tools.push({
              url_context: {
                urls: documentationUrls
              }
            });
          }

          // Enhanced system instruction with page context
          const enhancedSystemInstruction = `${agentInstructions} 

CURRENT PAGE CONTEXT: ${pageContext}

When responding, consider the user's current location and what they can see on the page. If they ask about something that doesn't match their current context, gently guide them or ask for clarification. When you mention specific UI elements, buttons, or parts of the interface in your responses, I will automatically highlight them for the user. Speak naturally about what you see and what actions the user might take.`;

          // Send setup message
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
                parts: [{
                  text: enhancedSystemInstruction,
                }]
              }
            }
          };

          console.log('[VoicePilot] Sending setup:', setupMsg);
          websocket.send(JSON.stringify(setupMsg));
        };

        websocket.onmessage = async (ev) => {
          let blob;

          // Chrome delivers ArrayBuffer, Firefox delivers Blob — handle both
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
              console.log('[VoicePilot][Debug] incoming JSON frame:', parsed);

              if (parsed.setupComplete) {
                console.log('[VoicePilot] Received setupComplete ✅');
                isCallActive = true;
                showState('connected');

                // Start page context monitoring when call becomes active
                startPageContextMonitoring();

                if (websocket.readyState === WebSocket.OPEN && !greetingSentRef.current) {
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
                  websocket.send(JSON.stringify(greeting));
                  greetingSentRef.current = true;
                  console.log('[VoicePilot] Sent initial text greeting: "Hello!"');
                }

                startMicStreaming();
                return;
              }

              if (parsed.serverContent) {
                const sc = parsed.serverContent;

                // Handle AI speech transcription with two-buffer system
                if (sc.outputTranscription) {
                  const { text, finished } = sc.outputTranscription;
                  
                  if (text) {
                    // Accumulate fragments in the partial buffer
                    partialTextRef.current += text;
                    console.log('[VoicePilot] AI transcription fragment (partial):', text);
                  }

                  // When finished, move partial to committed and clear partial
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
                    
                    // Highlight the complete phrase
                    if (window.voicePilotHighlight && partialText) {
                      window.voicePilotHighlight(partialText);
                    }
                    
                    console.log('[VoicePilot] AI said (complete phrase):', partialText);
                  }
                }

                // Handle user speech transcription
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
                    
                    console.log('[VoicePilot] User transcription:', userText);
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
                        console.log('[VoicePilot][Debug] Decoded inlineData, scheduling audio playback');
                        playAudioBuffer(pcmBlob);
                      } catch (err) {
                        console.error('[VoicePilot] Error decoding inlineData audio:', err);
                      }
                    }
                  }
                  return; // Bail out after handling audio
                }

                // Check for turn complete to force commit partial buffer
                if (sc.turnComplete && partialTextRef.current) {
                  console.log('[VoicePilot] Turn complete - committing partial buffer');
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
                  
                  if (window.voicePilotHighlight && partialText) {
                    window.voicePilotHighlight(partialText);
                  }
                  
                  console.log('[VoicePilot] AI said (turn complete commit):', partialText);
                }
              }

              return;
            } catch (parseError) {
              console.error('[VoicePilot] JSON parse error:', parseError);
              // Continue to fallback for binary data
            }
          }

          console.log('[VoicePilot][Debug] incoming Blob is not JSON or not recognized → playing raw PCM');
          playAudioBuffer(blob);
        };

        websocket.onerror = (err) => {
          console.error('[VoicePilot] WebSocket error:', err);
          showState('ready');
        };

        websocket.onclose = (ev) => {
          console.log(`[VoicePilot] WebSocket closed: code=${ev.code}, reason="${ev.reason}"`);
          isCallActive = false;
          showState('ready');
          websocket = null;
          
          // Stop page context monitoring when call ends
          stopPageContextMonitoring();
        };

      } catch (error) {
        console.error('[VoicePilot] Failed to start call:', error);
        showState('ready');
      }
    }

    // End call function
    function endCall() {
      if (!isCallActive) return;

      try {
        if (websocket) {
          websocket.close();
          websocket = null;
        }

        isCallActive = false;
        showState('ready');
        
        // Clear any highlights
        if (window.voicePilotClearHighlights) {
          window.voicePilotClearHighlights();
        }

        // Stop page context monitoring
        stopPageContextMonitoring();

        // Close expanded view
        if (isExpanded) {
          toggleWidget();
        }

        console.log('[VoicePilot] Call ended');

      } catch (error) {
        console.error('[VoicePilot] Error ending call:', error);
      }
    }

    function showConsent() {
      consentOverlay.classList.add('show');
    }

    function hideConsent() {
      consentOverlay.classList.remove('show');
    }

    function acceptConsent() {
      hideConsent();
      startCall();
    }

    function cancelConsent() {
      hideConsent();
    }

    // Event listeners
    minimized.addEventListener('click', handleMinimizedClick);
    expandBtn.addEventListener('click', expandWidget);
    endCallBtn.addEventListener('click', endCall);
    endCallBtn2.addEventListener('click', endCall);
    closeBtn.addEventListener('click', toggleWidget);
    startCallBtn.addEventListener('click', showConsent);
    consentAccept.addEventListener('click', acceptConsent);
    consentCancel.addEventListener('click', cancelConsent);

    // Close widget when clicking outside
    document.addEventListener('click', (e) => {
      if (!widget.contains(e.target) && isExpanded) {
        toggleWidget();
      }
    });

    // Return widget API
    return {
      show: () => widget.style.display = 'block',
      hide: () => widget.style.display = 'none',
      startCall: () => showConsent(),
      endCall,
      isActive: () => isCallActive
    };
  }

  // Initialize widget
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.voicepilot = createWidget();
    });
  } else {
    window.voicepilot = createWidget();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    pageContextCapture.destroy();
    domHighlighter.destroy();
  });

})();(function() {
  'use strict';

  // Get script attributes
  const currentScript = document.currentScript;
  const agentId = currentScript?.getAttribute('data-agent');
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  const supabaseUrl = currentScript?.getAttribute('data-supabase-url');
  const supabaseAnonKey = currentScript?.getAttribute('data-supabase-anon-key');

  if (!agentId) {
    console.error('VoicePilot: data-agent attribute is required');
    return;
  }

  // Set global configuration if provided
  if (supabaseUrl) {
    window.voicepilotSupabaseUrl = supabaseUrl;
  }
  if (supabaseAnonKey) {
    window.voicepilotSupabaseKey = supabaseAnonKey;
  }

  // ═══════════════════════════════════════════════
  // Enhanced Page Context Capture System - GENERIC APPROACH
  // ═══════════════════════════════════════════════
  class PageContextCapture {
    constructor() {
      this.lastContext = null;
      this.contextUpdateInterval = null;
      this.startContextMonitoring();
    }

    capturePageContext() {
      try {
        const context = {
          url: {
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            hostname: window.location.hostname
          },
          page: {
            title: document.title || '',
            description: this.getMetaDescription(),
            mainHeading: this.getMainHeading(),
            breadcrumbs: this.getBreadcrumbs(),
            navigationItems: this.getNavigationItems(),
            currentScreen: this.getCurrentScreen()
          },
          ui: {
            visibleButtons: this.getVisibleButtons(),
            formElements: this.getFormElements(),
            activeSection: this.getActiveSection()
          },
          timestamp: new Date().toISOString()
        };

        this.lastContext = context;
        return context;
      } catch (error) {
        console.warn('[VoicePilot] Error capturing page context:', error);
        return {
          url: { pathname: window.location.pathname },
          page: { title: document.title || 'Unknown Page', currentScreen: 'Unknown' },
          ui: {},
          timestamp: new Date().toISOString()
        };
      }
    }

    getMetaDescription() {
      const metaDesc = document.querySelector('meta[name="description"]');
      return metaDesc ? metaDesc.getAttribute('content') || '' : '';
    }

    getMainHeading() {
      // Look for the most prominent heading in order of importance
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent?.trim()) {
        return h1.textContent.trim();
      }
      
      // Fallback to h2 if no h1
      const h2 = document.querySelector('h2');
      if (h2 && h2.textContent?.trim()) {
        return h2.textContent.trim();
      }

      // Fallback to h3 if no h2
      const h3 = document.querySelector('h3');
      if (h3 && h3.textContent?.trim()) {
        return h3.textContent.trim();
      }

      return '';
    }

    getCurrentScreen() {
      // ✅ GENERIC APPROACH - Focus on content, not specific URLs
      const mainHeading = this.getMainHeading().toLowerCase();
      const title = document.title.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      
      // Look for common UI patterns and content indicators
      const indicators = [];
      
      // Check for form-related content
      if (mainHeading.includes('create') || mainHeading.includes('new') || mainHeading.includes('add')) {
        indicators.push('creation_form');
      }
      if (mainHeading.includes('edit') || mainHeading.includes('update') || mainHeading.includes('modify')) {
        indicators.push('edit_form');
      }
      if (mainHeading.includes('settings') || mainHeading.includes('preferences') || mainHeading.includes('configuration')) {
        indicators.push('settings_page');
      }
      if (mainHeading.includes('dashboard') || mainHeading.includes('overview') || mainHeading.includes('home')) {
        indicators.push('dashboard_page');
      }
      if (mainHeading.includes('list') || mainHeading.includes('browse') || document.querySelectorAll('table, .list, .grid').length > 0) {
        indicators.push('list_page');
      }
      if (mainHeading.includes('details') || mainHeading.includes('view') || mainHeading.includes('information')) {
        indicators.push('details_page');
      }
      if (mainHeading.includes('login') || mainHeading.includes('sign in') || title.includes('login')) {
        indicators.push('login_page');
      }
      if (mainHeading.includes('signup') || mainHeading.includes('register') || mainHeading.includes('sign up')) {
        indicators.push('signup_page');
      }

      // Check for specific form elements to determine page type
      const forms = document.querySelectorAll('form');
      if (forms.length > 0) {
        const hasPasswordField = document.querySelector('input[type="password"]');
        const hasEmailField = document.querySelector('input[type="email"]');
        
        if (hasPasswordField && hasEmailField) {
          if (mainHeading.includes('sign up') || mainHeading.includes('register')) {
            indicators.push('signup_form');
          } else {
            indicators.push('login_form');
          }
        } else if (forms.length === 1 && forms[0].querySelectorAll('input, textarea, select').length > 3) {
          indicators.push('data_entry_form');
        }
      }

      // Return the most specific indicator, or a generic description
      if (indicators.length > 0) {
        return indicators[0];
      }

      // Fallback to generic content description
      if (mainHeading) {
        return `content_page_${mainHeading.replace(/[^a-z0-9]/g, '_').substring(0, 20)}`;
      }

      return 'content_page';
    }

    getBreadcrumbs() {
      const breadcrumbs = [];
      
      // Common breadcrumb selectors
      const selectors = [
        '[aria-label*="breadcrumb"] a',
        '.breadcrumb a',
        '.breadcrumbs a',
        'nav[role="navigation"] a',
        '.nav-breadcrumb a'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && elements.length < 10) { // Reasonable breadcrumb size
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 100) {
              breadcrumbs.push(text);
            }
          });
          break; // Use first matching selector
        }
      }

      return breadcrumbs.slice(0, 5); // Limit to 5 items
    }

    getNavigationItems() {
      const navItems = [];
      
      // Look for main navigation - prioritize semantic navigation
      const navSelectors = [
        'nav[role="navigation"] a',
        'nav a',
        '[role="navigation"] a',
        'header nav a',
        '.navigation a',
        '.nav a'
      ];

      for (const selector of navSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && elements.length < 20) { // Reasonable nav size
          elements.forEach(el => {
            if (this.isElementVisible(el)) {
              const text = el.textContent?.trim();
              if (text && text.length > 0 && text.length < 50) {
                navItems.push(text);
              }
            }
          });
          if (navItems.length > 0) break; // Use first successful selector
        }
      }

      return navItems.slice(0, 10); // Limit to 10 items
    }

    getVisibleButtons() {
      const buttons = [];
      const buttonElements = document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
      
      buttonElements.forEach(el => {
        if (this.isElementVisible(el)) {
          const text = el.textContent?.trim() || 
                      el.value?.trim() || 
                      el.getAttribute('aria-label')?.trim() ||
                      el.getAttribute('title')?.trim();
          if (text && text.length > 0 && text.length < 50) {
            buttons.push(text);
          }
        }
      });

      return buttons.slice(0, 15); // Limit to 15 buttons
    }

    getFormElements() {
      const forms = [];
      const formElements = document.querySelectorAll('form');
      
      formElements.forEach(form => {
        if (this.isElementVisible(form)) {
          const inputs = form.querySelectorAll('input:not([type="hidden"]), textarea, select');
          const labels = [];
          
          inputs.forEach(input => {
            const label = this.getInputLabel(input);
            if (label && label.length < 50) {
              labels.push(label);
            }
          });

          if (labels.length > 0) {
            forms.push({
              action: form.action || '',
              fields: labels.slice(0, 10) // Limit fields per form
            });
          }
        }
      });

      return forms.slice(0, 3); // Limit to 3 forms
    }

    getInputLabel(input) {
      // Try various ways to get input label
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label && label.textContent?.trim()) {
          return label.textContent.trim();
        }
      }

      // Check for parent label
      const parentLabel = input.closest('label');
      if (parentLabel && parentLabel.textContent?.trim()) {
        return parentLabel.textContent.trim();
      }

      const placeholder = input.placeholder?.trim();
      if (placeholder) return placeholder;

      const ariaLabel = input.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;

      const title = input.getAttribute('title')?.trim();
      if (title) return title;

      return '';
    }

    getActiveSection() {
      // Try to determine what section of the page is most prominent
      const sections = document.querySelectorAll('main, section, article, .content, .main-content, [role="main"]');
      
      for (const section of sections) {
        if (this.isElementVisible(section)) {
          const heading = section.querySelector('h1, h2, h3');
          if (heading && heading.textContent?.trim()) {
            return heading.textContent.trim();
          }
        }
      }

      return '';
    }

    isElementVisible(el) {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 && rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    }

    startContextMonitoring() {
      // Update context periodically and on navigation changes
      this.contextUpdateInterval = setInterval(() => {
        this.capturePageContext();
      }, 5000); // Update every 5 seconds

      // Listen for navigation changes
      let lastUrl = window.location.href;
      const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          setTimeout(() => this.capturePageContext(), 500); // Small delay for DOM updates
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Listen for popstate (back/forward navigation)
      window.addEventListener('popstate', () => {
        setTimeout(() => this.capturePageContext(), 500);
      });
    }

    getContextSummary() {
      const context = this.lastContext || this.capturePageContext();
      
      // Create a concise summary for the AI with prioritized current screen info
      const summary = [];
      
      // ✅ PRIORITIZE MAIN HEADING - Most descriptive context
      if (context.page.mainHeading) {
        summary.push(`Current page: "${context.page.mainHeading}"`);
      }

      // Page type context (if different from heading)
      if (context.page.currentScreen && !summary.join(' ').toLowerCase().includes(context.page.currentScreen.replace(/_/g, ' '))) {
        const screenType = context.page.currentScreen.replace(/_/g, ' ').replace(/page|form/, '').trim();
        if (screenType) {
          summary.push(`Page type: ${screenType}`);
        }
      }

      // Page title for additional context (if different from heading)
      if (context.page.title && !summary.join(' ').includes(context.page.title)) {
        summary.push(`Page title: "${context.page.title}"`);
      }
      
      // URL context (only if meaningful)
      if (context.url.pathname !== '/' && context.url.pathname.length > 1) {
        const pathParts = context.url.pathname.split('/').filter(p => p && p.length > 0);
        if (pathParts.length > 0) {
          summary.push(`URL path: /${pathParts.join('/')}`);
        }
      }

      // Navigation context
      if (context.page.breadcrumbs && context.page.breadcrumbs.length > 0) {
        summary.push(`Navigation: ${context.page.breadcrumbs.join(' > ')}`);
      }

      // Available actions (most relevant buttons)
      if (context.ui.visibleButtons && context.ui.visibleButtons.length > 0) {
        const buttons = context.ui.visibleButtons.slice(0, 5).join(', ');
        summary.push(`Available actions: ${buttons}`);
      }

      // Form context (if user is on a form)
      if (context.ui.formElements && context.ui.formElements.length > 0) {
        const formFields = context.ui.formElements[0].fields.slice(0, 3).join(', ');
        summary.push(`Form fields: ${formFields}`);
      }

      return summary.join('. ');
    }

    destroy() {
      if (this.contextUpdateInterval) {
        clearInterval(this.contextUpdateInterval);
      }
    }
  }

  const pageContextCapture = new PageContextCapture();

  // ═══════════════════════════════════════════════
  // Enhanced DOM Highlighting System – EXPANDED ELEMENT SUPPORT
  // ═══════════════════════════════════════════════
  class DOMHighlighter {
    constructor() {
      this.highlightedElements = new Set();
      this.highlightClass = 'voicepilot-highlight';
      this.highlightStyle = null;
      this.injectStyles();
    }

    injectStyles() {
      if (this.highlightStyle) this.highlightStyle.remove();
      this.highlightStyle = document.createElement('style');
      this.highlightStyle.id = 'voicepilot-highlight-styles';
      this.highlightStyle.textContent = `
        .${this.highlightClass} {
          position: relative !important;
          outline: 2px solid #f59e0b !important;
          outline-offset: 2px !important;
          box-shadow: 
            0 0 0 4px rgba(245, 158, 11, 0.2),
            0 0 12px rgba(245, 158, 11, 0.4) !important;
          border-radius: 8px !important;
          transition: all 0.3s ease !important;
          z-index: 9999 !important;
          animation: gentle-pulse 2s infinite ease-in-out;
        }
        
        @keyframes gentle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        .${this.highlightClass}-badge {
          position: absolute;
          top: -12px;
          right: -8px;
          background: #f59e0b;
          color: #ffffff;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10000;
          animation: badge-appear 0.3s ease-out;
          pointer-events: none;
        }
        
        @keyframes badge-appear {
          0% { opacity: 0; transform: translateY(-4px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `;
      document.head.appendChild(this.highlightStyle);
    }

    isElementVisible(el) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 && rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0' &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    }

    // 🆕 EXPANDED: More comprehensive element selector
    getInteractiveElements() {
      const selectors = [
        // Original button/input selectors
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        
        // 🆕 Form elements
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="search"]',
        'input[type="tel"]',
        'input[type="url"]',
        'input[type="number"]',
        'input[type="date"]',
        'input[type="datetime-local"]',
        'input[type="time"]',
        'input[type="checkbox"]',
        'input[type="radio"]',
        'input[type="file"]',
        'textarea',
        'select',
        
        // 🆕 Navigation elements
        'a[href]',
        '[role="tab"]',
        '[role="tabpanel"]',
        '[data-tab]',
        '.tab',
        '.nav-item',
        '.navigation-item',
        
        // 🆕 Interactive UI elements
        '[role="button"]',
        '[role="menuitem"]',
        '[role="option"]',
        '[role="switch"]',
        '[role="slider"]',
        '[aria-expanded]',
        '[data-toggle]',
        '[data-action]',
        
        // 🆕 Common clickable elements
        '.dropdown-toggle',
        '.menu-item',
        '.clickable',
        '[onclick]',
        
        // 🆕 Cards and panels (if they're clickable)
        '.card[role="button"]',
        '.panel[role="button"]',
        '[data-clickable="true"]'
      ];

      return Array.from(
        document.querySelectorAll(selectors.join(','))
      ).filter(el => this.isElementVisible(el) && this.isElementInteractive(el));
    }

    // 🆕 Helper to determine if element is truly interactive
    isElementInteractive(el) {
      // Skip if disabled
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
        return false;
      }

      // Skip if it's a label without for attribute (not directly interactive)
      if (el.tagName === 'LABEL' && !el.getAttribute('for')) {
        return false;
      }

      // For links, ensure they have href
      if (el.tagName === 'A' && !el.getAttribute('href')) {
        return false;
      }

      // Check if element has click handlers or interactive roles
      const hasClickHandler = el.onclick || 
                             el.getAttribute('onclick') || 
                             el.getAttribute('data-action') ||
                             el.getAttribute('data-toggle');
                             
      const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName);
      
      const hasInteractiveRole = [
        'button', 'tab', 'menuitem', 'option', 'switch', 'slider'
      ].includes(el.getAttribute('role'));

      return isFormElement || hasClickHandler || hasInteractiveRole || el.tagName === 'A';
    }

    // 🆕 ENHANCED: Better text extraction for different element types
    getElementText(el) {
      let text = '';
      
      // For form inputs, prioritize labels and placeholders
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        // Try to find associated label by ID
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label && label.textContent?.trim()) {
            text = label.textContent.trim();
          }
        }
        
        // 🆕 Try to find nearby labels (common pattern where label appears before input)
        if (!text) {
          // Look for label immediately before this element
          let previousElement = el.previousElementSibling;
          while (previousElement && !text) {
            if (previousElement.tagName === 'LABEL' && previousElement.textContent?.trim()) {
              text = previousElement.textContent.trim();
              break;
            }
            // Also check if the previous element contains a label
            const labelInPrev = previousElement.querySelector('label');
            if (labelInPrev && labelInPrev.textContent?.trim()) {
              text = labelInPrev.textContent.trim();
              break;
            }
            previousElement = previousElement.previousElementSibling;
          }
        }

        // 🆕 Try to find parent container with label
        if (!text) {
          let parent = el.parentElement;
          let depth = 0;
          while (parent && depth < 3) { // Don't go too far up
            const labelInParent = parent.querySelector('label');
            if (labelInParent && labelInParent.textContent?.trim()) {
              text = labelInParent.textContent.trim();
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
        }
        
        // Fallback to placeholder or aria-label
        if (!text) {
          text = el.placeholder?.trim() || 
                 el.getAttribute('aria-label')?.trim() || 
                 el.getAttribute('title')?.trim() || 
                 el.value?.trim() || '';
        }
      }
      // For other elements, use text content or aria-label
      else {
        text = el.getAttribute('aria-label')?.trim() ||
               el.getAttribute('title')?.trim() ||
               el.textContent?.trim() ||
               el.value?.trim() || '';
      }

      return text;
    }

    // 🆕 ENHANCED: Smarter scoring system for different element types
    scoreMatch(element, searchPhrase) {
      const elementText = this.getElementText(element).toLowerCase();
      const phrase = searchPhrase.toLowerCase();
      
      if (!elementText || !phrase) return 0;

      // Exact match gets highest score
      if (elementText === phrase) return 10;
      
      // Word boundary matches get high score
      const wordBoundaryRegex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (wordBoundaryRegex.test(elementText)) return 8;
      
      // Starts with gets good score
      if (elementText.startsWith(phrase)) return 6;
      
      // Contains gets medium score
      if (elementText.includes(phrase)) return 4;
      
      // Fuzzy matching for slight variations
      const similarity = this.calculateSimilarity(elementText, phrase);
      if (similarity > 0.8) return 3;
      if (similarity > 0.6) return 2;
      
      return 0;
    }

    // 🆕 Simple similarity calculation for fuzzy matching
    calculateSimilarity(str1, str2) {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      const editDistance = this.levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
      const matrix = Array(str2.length + 1).fill(null).map(() => 
        Array(str1.length + 1).fill(null)
      );
      
      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          );
        }
      }
      
      return matrix[str2.length][str1.length];
    }

    highlightElement(searchText) {
      // Extract phrase from quotes or use full text
      let phrase = searchText.trim();
      const quotedMatch = phrase.match(/['"]([^'"]+)['"]/);
      if (quotedMatch) {
        phrase = quotedMatch[1];
      }

      phrase = phrase.toLowerCase();
      if (!phrase || phrase.length < 2) return false;

      // Get all interactive elements
      const elements = this.getInteractiveElements();
      
      // Score all matches
      const matches = elements
        .map(el => ({
          el,
          text: this.getElementText(el),
          score: this.scoreMatch(el, phrase)
        }))
        .filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score);

      if (!matches.length) {
        console.log('[VoicePilot] No interactive elements matching:', phrase);
        return false;
      }

      // Highlight the best match
      this.clearHighlights();
      const bestMatch = matches[0];
      this.addHighlight(bestMatch.el, true);
      bestMatch.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      console.log('[VoicePilot] Highlighting element:', {
        text: bestMatch.text,
        type: bestMatch.el.tagName,
        score: bestMatch.score
      });
      
      return true;
    }

    addHighlight(el, isPrimary = false) {
      el.classList.add(this.highlightClass);
      this.highlightedElements.add(el);

      if (isPrimary) {
        const badge = document.createElement('div');
        badge.className = `${this.highlightClass}-badge`;
        badge.textContent = 'AI';
        badge.style.position = 'absolute';
        el.style.position = 'relative';
        el.appendChild(badge);
      }
    }

    clearHighlights() {
      this.highlightedElements.forEach(el => {
        el.classList.remove(this.highlightClass);
        el.querySelectorAll(`.${this.highlightClass}-badge`)
          .forEach(badge => badge.remove());
      });
      this.highlightedElements.clear();
    }

    destroy() {
      this.clearHighlights();
      if (this.highlightStyle) this.highlightStyle.remove();
      this.highlightStyle = null;
    }
  }

  const domHighlighter = new DOMHighlighter();

  // ═══════════════════════════════════════════════
  // SmartHighlighter (real-time highlighting as AI speaks)
  // ═══════════════════════════════════════════════
  class SmartHighlighter {
    constructor() {
      this.textBuffer = '';
      this.bufferTimeout = null;
      this.lastHighlightTime = 0;
      this.cooldown = 1500;   // Reduced from 2000ms
      this.delay    = 300;    // Reduced from 1500ms for faster response
      this.streamBuffer = ''; // New: for real-time streaming
      this.streamTimeout = null;
      this.lastStreamHighlight = 0;
    }

    // 🆕 NEW: Real-time highlighting for streaming text
    addStreamingText(txt) {
      if (!txt || !txt.trim()) return;
      
      // Clear existing timeout
      if (this.streamTimeout) clearTimeout(this.streamTimeout);
      
      // Add to stream buffer
      this.streamBuffer += (this.streamBuffer && !this.streamBuffer.endsWith(' ') && /^[A-Za-z]/.test(txt) ? ' ' : '') + txt;
      
      // Process immediately if we detect quoted text (highest priority)
      const quotedMatch = this.streamBuffer.match(/['"]([^'"]+)['"]/);
      if (quotedMatch && quotedMatch[1].length > 2) {
        this.processStream(quotedMatch[1]);
        return;
      }
      
      // Look for common UI element patterns in real-time
      const patterns = [
        /\b(click|tap|press)\s+(?:the\s+)?['"]?([^'".\s]+(?:\s+[^'".\s]+)*?)['"]?(?:\s+(?:button|link|tab|field|input|dropdown|menu))/i,
        /\b(go\s+to|open|select)\s+(?:the\s+)?['"]?([^'".\s]+(?:\s+[^'".\s]+)*?)['"]?(?:\s+(?:tab|section|page|menu))/i,
        /\b(fill\s+in|enter|type\s+in)\s+(?:the\s+)?['"]?([^'".\s]+(?:\s+[^'"