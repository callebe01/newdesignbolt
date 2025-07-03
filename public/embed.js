(function() {
  'use strict';

  // Get configuration from script attributes
  const currentScript = document.currentScript || document.querySelector('script[data-agent]');
  if (!currentScript) {
    console.error('[VoicePilot] Script element not found');
    return;
  }

  const agentId = currentScript.getAttribute('data-agent');
  const position = currentScript.getAttribute('data-position') || 'bottom-right';
  const supabaseUrl = currentScript.getAttribute('data-supabase-url') || 
                     window.voicepilotSupabaseUrl || 
                     'https://ljfidzppyflrrszkgusa.supabase.co';
  const supabaseAnonKey = currentScript.getAttribute('data-supabase-anon-key') || 
                         window.voicepilotSupabaseKey || 
                         '';

  if (!agentId) {
    console.error('[VoicePilot] No agent ID provided');
    return;
  }

  // State variables
  let isOpen = false;
  let status = 'idle'; // 'idle', 'connecting', 'active', 'ended', 'error'
  let duration = 0;
  let errorMessage = null;
  let isMicrophoneActive = false;
  let isScreenSharing = false;
  let websocketRef = null;
  let microphoneStream = null;
  let screenStream = null;
  let audioContextRef = null;
  let audioQueueTimeRef = 0;
  let durationTimerRef = null;
  let maxDurationTimerRef = null;
  let usageRecordedRef = false;
  let callEndedRef = false;
  let agentOwnerIdRef = null;
  let currentAgentIdRef = null;
  let conversationIdRef = null;
  let supabaseClient = null;

  // Two-buffer system for real-time transcription
  let committedTextRef = '';
  let partialTextRef = '';

  // Page context monitoring
  let currentPageContextRef = '';
  let lastSentPageContextRef = '';
  let pageContextIntervalRef = null;

  // Screen streaming
  let screenVideoRef = null;
  let screenCanvasRef = null;
  let screenIntervalRef = null;

  // Initialize Supabase client
  async function initSupabase() {
    if (supabaseClient) return supabaseClient;

    try {
      // Dynamically import Supabase
      const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2.39.3');
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      console.log('[VoicePilot] Supabase client initialized');
      return supabaseClient;
    } catch (error) {
      console.error('[VoicePilot] Failed to initialize Supabase:', error);
      return null;
    }
  }

  // Create widget HTML
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'voicepilot-widget';
    widget.style.cssText = `
      position: fixed;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ${getPositionStyles(position)}
    `;

    widget.innerHTML = `
      <div id="voicepilot-fab" style="
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      
      <div id="voicepilot-panel" style="
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 320px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: none;
        overflow: hidden;
      ">
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          position: relative;
        ">
          <button id="voicepilot-close" style="
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">AI Assistant</h3>
          <p id="voicepilot-status" style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Ready to help</p>
        </div>
        
        <div style="padding: 16px;">
          <div id="voicepilot-content">
            <div id="voicepilot-idle" style="text-align: center;">
              <div style="
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
              ">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
              <p style="margin: 0 0 16px; color: #666; font-size: 14px;">Start a voice conversation with your AI assistant</p>
              <button id="voicepilot-start" style="
                width: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
              ">Start Voice Chat</button>
            </div>
            
            <div id="voicepilot-active" style="display: none;">
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
                gap: 8px;
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  background: #ef4444;
                  border-radius: 50%;
                  animation: pulse 2s infinite;
                "></div>
                <span style="font-size: 12px; font-weight: 500; color: #666;">LIVE</span>
              </div>
              
              <div id="voicepilot-transcript" style="
                background: #f8f9fa;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
                max-height: 120px;
                overflow-y: auto;
                font-size: 13px;
                line-height: 1.4;
                color: #333;
                min-height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
              ">Start speaking to begin the conversation</div>
              
              <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                <button id="voicepilot-mic" style="
                  flex: 1;
                  background: #667eea;
                  color: white;
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  Mute
                </button>
                
                <button id="voicepilot-screen" style="
                  flex: 1;
                  background: #f3f4f6;
                  color: #374151;
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  Share
                </button>
              </div>
              
              <button id="voicepilot-end" style="
                width: 100%;
                background: #ef4444;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
              ">End Call</button>
            </div>
            
            <div id="voicepilot-error" style="display: none;">
              <div style="
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
              ">
                <p style="margin: 0; color: #dc2626; font-size: 13px;" id="voicepilot-error-text"></p>
              </div>
              <button id="voicepilot-retry" style="
                width: 100%;
                background: #667eea;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
              ">Try Again</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      #voicepilot-fab:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(0,0,0,0.2);
      }
      #voicepilot-start:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
    `;
    document.head.appendChild(style);

    return widget;
  }

  function getPositionStyles(pos) {
    const spacing = '24px';
    switch (pos) {
      case 'bottom-left':
        return `bottom: ${spacing}; left: ${spacing};`;
      case 'top-right':
        return `top: ${spacing}; right: ${spacing};`;
      case 'top-left':
        return `top: ${spacing}; left: ${spacing};`;
      default:
        return `bottom: ${spacing}; right: ${spacing};`;
    }
  }

  // Update transcript display
  function updateTranscriptDisplay() {
    const transcriptEl = document.getElementById('voicepilot-transcript');
    if (!transcriptEl) return;

    const committed = committedTextRef;
    const partial = partialTextRef;
    
    let fullText = committed;
    if (committed && partial) {
      const needsSpace = !committed.endsWith(' ') && !partial.startsWith(' ');
      fullText = committed + (needsSpace ? ' ' : '') + partial;
    } else if (partial) {
      fullText = partial;
    }
    
    if (fullText.trim()) {
      transcriptEl.textContent = fullText;
      transcriptEl.style.textAlign = 'left';
    } else {
      transcriptEl.textContent = 'Start speaking to begin the conversation';
      transcriptEl.style.textAlign = 'center';
    }
  }

  // Update UI based on status
  function updateUI() {
    const statusEl = document.getElementById('voicepilot-status');
    const idleEl = document.getElementById('voicepilot-idle');
    const activeEl = document.getElementById('voicepilot-active');
    const errorEl = document.getElementById('voicepilot-error');
    const micBtn = document.getElementById('voicepilot-mic');
    const screenBtn = document.getElementById('voicepilot-screen');

    // Update status text
    if (statusEl) {
      switch (status) {
        case 'connecting':
          statusEl.textContent = 'Connecting...';
          break;
        case 'active':
          statusEl.textContent = `${formatTime(duration)} elapsed`;
          break;
        case 'error':
          statusEl.textContent = 'Connection failed';
          break;
        case 'ended':
          statusEl.textContent = 'Call ended';
          break;
        default:
          statusEl.textContent = 'Ready to help';
      }
    }

    // Show/hide content sections
    if (idleEl) idleEl.style.display = (status === 'idle' || status === 'ended') ? 'block' : 'none';
    if (activeEl) activeEl.style.display = (status === 'active' || status === 'connecting') ? 'block' : 'none';
    if (errorEl) errorEl.style.display = status === 'error' ? 'block' : 'none';

    // Update button states
    if (micBtn) {
      micBtn.style.background = isMicrophoneActive ? '#667eea' : '#f3f4f6';
      micBtn.style.color = isMicrophoneActive ? 'white' : '#374151';
      micBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${isMicrophoneActive ? 
            '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>' :
            '<path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/><line x1="2" y1="2" x2="22" y2="22"/>'
          }
        </svg>
        ${isMicrophoneActive ? 'Mute' : 'Unmute'}
      `;
    }

    if (screenBtn) {
      screenBtn.style.background = isScreenSharing ? '#667eea' : '#f3f4f6';
      screenBtn.style.color = isScreenSharing ? 'white' : '#374151';
      screenBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        ${isScreenSharing ? 'Stop Share' : 'Share'}
      `;
    }

    // Update error message
    const errorTextEl = document.getElementById('voicepilot-error-text');
    if (errorTextEl && errorMessage) {
      errorTextEl.textContent = errorMessage;
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Audio playback
  async function playAudioBuffer(pcmBlob) {
    try {
      console.log('[VoicePilot][Audio] Received audio buffer, size:', pcmBlob.size, 'bytes');
      
      const arrayBuffer = await pcmBlob.arrayBuffer();
      const pcm16 = new Int16Array(arrayBuffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      if (!audioContextRef) {
        audioContextRef = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioContextRef;

      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      let startAt = audioCtx.currentTime;
      if (audioQueueTimeRef > audioCtx.currentTime) {
        startAt = audioQueueTimeRef;
      }
      source.start(startAt);
      audioQueueTimeRef = startAt + buffer.duration;
      
      console.log('[VoicePilot][Audio] Playing audio buffer, duration:', buffer.duration.toFixed(3), 'seconds');
    } catch (err) {
      console.error('[VoicePilot] playAudioBuffer() error decoding PCM16:', err);
    }
  }

  // Get page context
  function getPageContext() {
    try {
      if (typeof window !== 'undefined' && window.voicePilotGetPageContext) {
        return window.voicePilotGetPageContext();
      }
    } catch (error) {
      console.warn('[VoicePilot] Error getting page context:', error);
    }
    
    return `Page: ${document.title || 'Unknown'}, URL: ${window.location.pathname}`;
  }

  // Start page context monitoring
  function startPageContextMonitoring() {
    if (pageContextIntervalRef) {
      clearInterval(pageContextIntervalRef);
    }

    pageContextIntervalRef = setInterval(() => {
      if (status !== 'active' || !websocketRef || websocketRef.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        const newContext = getPageContext();
        currentPageContextRef = newContext;

        if (newContext !== lastSentPageContextRef) {
          console.log('[VoicePilot] Page context changed, updating AI:', newContext);
          
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

          websocketRef.send(JSON.stringify(contextUpdateMessage));
          lastSentPageContextRef = newContext;
          
          console.log('[VoicePilot] Sent page context update to AI');
        }
      } catch (error) {
        console.warn('[VoicePilot] Error monitoring page context:', error);
      }
    }, 2000);
  }

  function stopPageContextMonitoring() {
    if (pageContextIntervalRef) {
      clearInterval(pageContextIntervalRef);
      pageContextIntervalRef = null;
    }
  }

  // Check agent usage
  async function checkAgentOwnerUsage(agentId) {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/check-agent-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ 
            agentId,
            estimatedDuration: 5
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check usage');
      }

      const result = await response.json();
      agentOwnerIdRef = result.ownerId;
      return result.canUse;
    } catch (err) {
      console.error('[VoicePilot] Error checking agent owner usage:', err);
      return false;
    }
  }

  // Create conversation record
  async function createConversationRecord(agentId) {
    try {
      console.log(`[VoicePilot] Creating conversation record for agent ${agentId}`);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-conversation-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ agentId })
        }
      );

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

  // Start microphone streaming
  async function startMicStreaming() {
    try {
      console.log('[VoicePilot][Audio] Requesting microphone access...');
      
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      microphoneStream = micStream;
      
      console.log('[VoicePilot][Audio] Microphone access granted, setting up audio processing...');

      if (!audioContextRef) {
        audioContextRef = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioContextRef;

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

        if (websocketRef?.readyState === WebSocket.OPEN) {
          websocketRef.send(JSON.stringify(payload));
          if (Math.random() < 0.01) {
            console.log(`[VoicePilot][Audio] Sent PCM16 chunk (${pcm16.byteLength * 2} bytes) to relay`);
          }
        }
      };

      isMicrophoneActive = true;
      updateUI();
      console.log('[VoicePilot][Audio] Microphone streaming started successfully');
    } catch (err) {
      console.error('[VoicePilot] Mic streaming error:', err);
      setError('Failed to capture microphone.');
    }
  }

  // Start call
  async function startCall() {
    try {
      if (websocketRef) {
        const ws = websocketRef;
        
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.warn('[VoicePilot] startCall() called but WebSocket is already active or connecting.');
          return;
        } else if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
          console.log('[VoicePilot] Clearing stale WebSocket reference (state:', ws.readyState, ')');
          if (ws.readyState === WebSocket.CLOSING) {
            try {
              ws.close();
            } catch (error) {
              console.warn('[VoicePilot] Error closing stale WebSocket:', error);
            }
          }
          websocketRef = null;
        }
      }

      setError(null);
      duration = 0;
      usageRecordedRef = false;
      currentAgentIdRef = agentId;
      conversationIdRef = null;
      callEndedRef = false;
      
      committedTextRef = '';
      partialTextRef = '';
      updateTranscriptDisplay();
      
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Check agent owner's usage limits
      const canUse = await checkAgentOwnerUsage(agentId);
      if (!canUse) {
        throw new Error('You have exceeded your monthly minute limit. Please upgrade your plan to continue using the service.');
      }

      // Create conversation record
      const conversationId = await createConversationRecord(agentId);
      conversationIdRef = conversationId;

      // Start duration timer
      durationTimerRef = setInterval(() => {
        duration += 1;
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
          instructions: 'You are a helpful AI assistant.',
          documentationUrls: []
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start call');
      }

      const { relayUrl } = await response.json();
      console.log('[VoicePilot] Using relay URL:', relayUrl);

      const ws = new WebSocket(relayUrl);
      websocketRef = ws;

      ws.onopen = () => {
        console.log('[VoicePilot][WebSocket] onopen: connection established');
        setStatus('connecting');

        const pageContext = getPageContext();
        currentPageContextRef = pageContext;
        lastSentPageContextRef = pageContext;
        console.log('[VoicePilot] Initial page context:', pageContext);

        const enhancedSystemInstruction = `You are a helpful AI assistant. 

CURRENT PAGE CONTEXT: ${pageContext}

When responding, consider the user's current location and what they can see on the page. If they ask about something that doesn't match their current context, gently guide them or ask for clarification. When you mention specific UI elements, buttons, or parts of the interface in your responses, I will automatically highlight them for the user. Speak naturally about what you see and what actions the user might take.`;

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
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: {
              parts: [
                {
                  text: enhancedSystemInstruction,
                },
              ],
            },
          },
        };

        console.log('[VoicePilot][WebSocket] Sending setup:', setupMsg);
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
            console.log('[VoicePilot][Debug] incoming JSON frame:', parsed);

            if (parsed.setupComplete) {
              console.log('[VoicePilot][WebSocket] Received setupComplete ✅');
              setStatus('active');

              startPageContextMonitoring();

              if (ws.readyState === WebSocket.OPEN) {
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
                console.log('[VoicePilot] Sent initial text greeting: "Hello!"');
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
                  console.log('[VoicePilot] AI transcription fragment (partial):', text);
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
                      console.log('[VoicePilot][Debug] Decoded inlineData, scheduling audio playback');
                      playAudioBuffer(pcmBlob);
                    } catch (err) {
                      console.error('[VoicePilot] Error decoding inlineData audio:', err);
                    }
                  }
                }
                return;
              }

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
                
                if (window.voicePilotHighlight && partialText) {
                  window.voicePilotHighlight(partialText);
                }
                
                console.log('[VoicePilot] AI said (turn complete commit):', partialText);
              }
            }

            return;
          } catch (parseError) {
            console.error('[VoicePilot] JSON parse error:', parseError);
          }
        }

        console.log('[VoicePilot][Debug] incoming Blob is not JSON or not recognized → playing raw PCM');
        playAudioBuffer(blob);
      };

      ws.onerror = (err) => {
        console.error('[VoicePilot][WebSocket] onerror:', err);
        setError('WebSocket encountered an error.');
        setStatus('error');
      };

      ws.onclose = (ev) => {
        console.log(`[VoicePilot][WebSocket] onclose: code=${ev.code}, reason="${ev.reason}"`);
        setStatus('ended');
        websocketRef = null;
        stopPageContextMonitoring();
      };
    } catch (err) {
      console.error('[VoicePilot] Failed to start call:', err);
      setError(err.message ?? 'Failed to start call.');
      setStatus('error');
    }
  }

  // End call with transcript saving functionality
  function endCall(fromUnload = false) {
    if (callEndedRef) {
      return;
    }
    callEndedRef = true;
    window.removeEventListener('beforeunload', handleBeforeUnload);
    
    try {
      const finalDuration = duration;
      const finalTranscript = (committedTextRef + partialTextRef).trim();
      const agentId = currentAgentIdRef;
      const conversationId = conversationIdRef;

      console.log('[VoicePilot] Ending call - Duration:', finalDuration, 'seconds, Transcript length:', finalTranscript.length);

      // Clear any DOM highlights
      if (window.voicePilotClearHighlights) {
        window.voicePilotClearHighlights();
      }

      // Stop microphone stream
      if (microphoneStream) {
        console.log('[VoicePilot][Audio] Explicitly stopping microphone stream...');
        try {
          microphoneStream.getTracks().forEach((track) => {
            console.log('[VoicePilot][Audio] Stopping microphone track:', track.kind, track.readyState);
            track.stop();
            console.log('[VoicePilot][Audio] Microphone track stopped, new state:', track.readyState);
          });
          microphoneStream = null;
          isMicrophoneActive = false;
          console.log('[VoicePilot][Audio] Microphone stream fully stopped and cleared');
        } catch (err) {
          console.error('[VoicePilot][Audio] Error stopping microphone stream:', err);
        }
      }

      // Stop screen stream
      if (screenStream) {
        console.log('[VoicePilot][Screen] Explicitly stopping screen stream...');
        try {
          screenStream.getTracks().forEach((track) => {
            console.log('[VoicePilot][Screen] Stopping screen track:', track.kind, track.readyState);
            track.stop();
            console.log('[VoicePilot][Screen] Screen track stopped, new state:', track.readyState);
          });
          screenStream = null;
          isScreenSharing = false;
          console.log('[VoicePilot][Screen] Screen stream fully stopped and cleared');
        } catch (err) {
          console.error('[VoicePilot][Screen] Error stopping screen stream:', err);
        }
      }

      // Close audio context
      if (audioContextRef) {
        console.log('[VoicePilot][Audio] Explicitly closing audio context...');
        try {
          audioContextRef.close().then(() => {
            console.log('[VoicePilot][Audio] Audio context closed successfully');
          }).catch((err) => {
            console.error('[VoicePilot][Audio] Error closing audio context:', err);
          });
          audioContextRef = null;
          audioQueueTimeRef = 0;
          console.log('[VoicePilot][Audio] Audio context reference cleared');
        } catch (err) {
          console.error('[VoicePilot][Audio] Error closing audio context:', err);
        }
      }

      // Save transcript and conversation data
      if (agentId && finalTranscript) {
        console.log('[VoicePilot] Saving transcript for agent:', agentId);
        
        // Save transcript using Edge Function
        const saveTranscriptData = {
          agentId,
          content: finalTranscript
        };

        if (fromUnload) {
          // Use sendBeacon for page unload
          try {
            const blob = new Blob([JSON.stringify(saveTranscriptData)], { type: 'application/json' });
            navigator.sendBeacon(`${supabaseUrl}/functions/v1/save-transcript-record`, blob);
            console.log('[VoicePilot] Sent transcript via beacon');
          } catch (err) {
            console.error('[VoicePilot] Failed to send transcript via beacon:', err);
          }
        } else {
          // Use regular fetch
          fetch(`${supabaseUrl}/functions/v1/save-transcript-record`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify(saveTranscriptData)
          }).then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          }).then(result => {
            console.log('[VoicePilot] Transcript saved successfully:', result.transcriptId);
          }).catch(err => {
            console.error('[VoicePilot] Failed to save transcript:', err);
            if (!fromUnload) {
              alert(`Transcript wasn't saved: ${err.message ?? err}`);
            }
          });
        }

        // Save conversation messages if we have a conversation record
        if (conversationId) {
          const saveMessagesData = {
            conversationId,
            content: finalTranscript
          };

          if (!fromUnload) {
            fetch(`${supabaseUrl}/functions/v1/save-conversation-messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify(saveMessagesData)
            }).then(response => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              return response.json();
            }).then(result => {
              console.log('[VoicePilot] Conversation messages saved successfully:', result.messageId);
            }).catch(err => {
              console.error('[VoicePilot] Failed to save conversation messages:', err);
            });
          }
        }
      }

      // End conversation record
      if (conversationId && finalDuration > 0) {
        const endConversationData = {
          conversationId,
          duration: finalDuration,
          sentimentScore: null
        };

        if (!fromUnload) {
          fetch(`${supabaseUrl}/functions/v1/end-conversation-record`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify(endConversationData)
          }).then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          }).then(result => {
            console.log('[VoicePilot] Conversation record ended successfully:', result.conversationId);
          }).catch(err => {
            console.error('[VoicePilot] Failed to end conversation record:', err);
          });
        }
      }

      // Record usage for the agent owner
      if (agentId && finalDuration > 0 && !usageRecordedRef) {
        const minutes = Math.ceil(finalDuration / 60);
        const recordUsageData = {
          agentId,
          minutes
        };

        if (!fromUnload) {
          fetch(`${supabaseUrl}/functions/v1/record-agent-usage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify(recordUsageData)
          }).then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
          }).then(result => {
            console.log('[VoicePilot] Agent usage recorded successfully');
          }).catch(err => {
            console.error('[VoicePilot] Failed to record agent usage:', err);
          });
        }
        usageRecordedRef = true;
      }

      if (durationTimerRef) {
        clearInterval(durationTimerRef);
        durationTimerRef = null;
      }
      if (maxDurationTimerRef) {
        clearTimeout(maxDurationTimerRef);
        maxDurationTimerRef = null;
      }

      stopPageContextMonitoring();

      if (websocketRef) {
        websocketRef.close();
        websocketRef = null;
      }
      
      setStatus('ended');
      agentOwnerIdRef = null;
      currentAgentIdRef = null;
      conversationIdRef = null;
      
      committedTextRef = '';
      partialTextRef = '';
      
      console.log('[VoicePilot] Call fully ended and cleaned up - all streams stopped and resources cleaned up');
    } catch (err) {
      console.error('[VoicePilot] Error ending call:', err);
      setError('Error ending call.');
      setStatus('error');
    }
  }

  function handleBeforeUnload() {
    endCall(true);
  }

  // Toggle microphone
  function toggleMicrophone() {
    try {
      setError(null);
      if (isMicrophoneActive && microphoneStream) {
        console.log('[VoicePilot][Audio] Stopping microphone...');
        if (audioContextRef) {
          audioContextRef.close().catch(() => {});
          audioContextRef = null;
          audioQueueTimeRef = 0;
        }
        microphoneStream.getTracks().forEach((t) => t.stop());
        microphoneStream = null;
        isMicrophoneActive = false;
        updateUI();
        console.log('[VoicePilot][Audio] Microphone stopped');
      } else if (!isMicrophoneActive) {
        console.log('[VoicePilot][Audio] Starting microphone...');
        startMicStreaming().catch((err) => {
          console.error('[VoicePilot] toggleMicrophone start error:', err);
          setError('Failed to start microphone.');
        });
      }
    } catch (err) {
      console.error('[VoicePilot] toggleMicrophone error:', err);
      setError('Failed to toggle microphone.');
    }
  }

  // Toggle screen share
  async function toggleScreenShare() {
    try {
      setError(null);

      if (isScreenSharing && screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        screenStream = null;
        isScreenSharing = false;
        updateUI();
      } else {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStream = screen;
        screen.getVideoTracks()[0].addEventListener('ended', () => {
          isScreenSharing = false;
          screenStream = null;
          updateUI();
        });
        isScreenSharing = true;
        updateUI();
      }
    } catch (err) {
      console.error('[VoicePilot] Screen sharing error:', err);
      setError('Failed to toggle screen sharing.');
    }
  }

  // Set status
  function setStatus(newStatus) {
    status = newStatus;
    updateUI();
  }

  // Set error
  function setError(message) {
    errorMessage = message;
    if (message) {
      setStatus('error');
    }
    updateUI();
  }

  // Initialize widget
  async function init() {
    // Initialize Supabase
    await initSupabase();

    // Create and mount widget
    const widget = createWidget();
    document.body.appendChild(widget);

    // Add event listeners
    const fab = document.getElementById('voicepilot-fab');
    const closeBtn = document.getElementById('voicepilot-close');
    const startBtn = document.getElementById('voicepilot-start');
    const endBtn = document.getElementById('voicepilot-end');
    const micBtn = document.getElementById('voicepilot-mic');
    const screenBtn = document.getElementById('voicepilot-screen');
    const retryBtn = document.getElementById('voicepilot-retry');

    fab?.addEventListener('click', () => {
      isOpen = !isOpen;
      const panel = document.getElementById('voicepilot-panel');
      if (panel) {
        panel.style.display = isOpen ? 'block' : 'none';
      }
    });

    closeBtn?.addEventListener('click', () => {
      if (status === 'active') {
        endCall();
      } else {
        isOpen = false;
        const panel = document.getElementById('voicepilot-panel');
        if (panel) {
          panel.style.display = 'none';
        }
      }
    });

    startBtn?.addEventListener('click', startCall);
    endBtn?.addEventListener('click', () => endCall());
    micBtn?.addEventListener('click', toggleMicrophone);
    screenBtn?.addEventListener('click', toggleScreenShare);
    retryBtn?.addEventListener('click', startCall);

    console.log('[VoicePilot] Widget initialized successfully');
  }

  // Expose API
  window.voicepilot = {
    open: () => {
      isOpen = true;
      const panel = document.getElementById('voicepilot-panel');
      if (panel) {
        panel.style.display = 'block';
      }
    },
    close: () => {
      if (status === 'active') {
        endCall();
      } else {
        isOpen = false;
        const panel = document.getElementById('voicepilot-panel');
        if (panel) {
          panel.style.display = 'none';
        }
      }
    },
    startCall: startCall,
    endCall: () => endCall(),
    setPulse: (enabled) => {
      const fab = document.getElementById('voicepilot-fab');
      if (fab) {
        if (enabled) {
          fab.style.animation = 'pulse 2s infinite';
        } else {
          fab.style.animation = '';
        }
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Add highlight functionality
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

  window.voicePilotGetPageContext = () => {
    return `Page: ${document.title || 'Unknown'}, URL: ${window.location.pathname}`;
  };

  // Add CSS for highlights
  if (!document.getElementById('voicepilot-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'voicepilot-highlight-style';
    style.textContent = `.agent-highlight {\n  outline: 3px solid #f00;\n  box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.6);\n  transition: outline-color 0.2s;\n}`;
    document.head.appendChild(style);
  }
})();