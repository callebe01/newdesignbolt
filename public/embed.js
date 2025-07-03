(function() {
  'use strict';

  // Configuration
  const script = document.currentScript;
  const agentId = script?.getAttribute('data-agent');
  const position = script?.getAttribute('data-position') || 'bottom-right';
  const googleApiKey = script?.getAttribute('data-google-api-key');
  const supabaseUrl = script?.getAttribute('data-supabase-url');
  const supabaseAnonKey = script?.getAttribute('data-supabase-anon-key');

  if (!agentId) {
    console.error('VoicePilot: data-agent attribute is required');
    return;
  }

  // State management
  let isExpanded = false;
  let isCallActive = false;
  let websocket = null;
  let mediaRecorder = null;
  let audioContext = null;
  let audioQueue = [];
  let audioQueueTime = 0;
  let transcript = '';

  // Widget creation
  function createWidget() {
    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'voicepilot-widget';
    
    // Position mapping
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };
    
    const pos = positions[position] || positions['bottom-right'];
    
    // Apply styles
    Object.assign(widget.style, {
      position: 'fixed',
      zIndex: '10000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      ...pos
    });
    
    // Widget HTML
    widget.innerHTML = `
      <div id="voicepilot-container" style="
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 30px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.8);
        padding: 8px;
        display: flex;
        align-items: center;
        transition: all 0.3s ease;
        cursor: pointer;
      ">
        <button id="mic-button" style="
          width: 44px;
          height: 44px;
          border-radius: 22px;
          background: linear-gradient(145deg, #f0f0f0, #e6e6e6);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.1), -2px -2px 5px rgba(255,255,255,0.7);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#666">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <line x1="12" x2="12" y1="19" y2="23"/>
            <line x1="8" x2="16" y1="23" y2="23"/>
          </svg>
        </button>
        
        <div id="call-action" style="
          background: #000;
          color: white;
          border: none;
          border-radius: 20px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          margin-left: 8px;
          cursor: pointer;
          display: none;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
          END CALL
        </div>
        
        <div id="voicepilot-header" style="
          display: none;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
          width: 100%;
        ">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">
            Voice Assistant
          </h3>
          <button id="voicepilot-close" style="
            background: #f5f5f5;
            border: none;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            color: #666;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">×</button>
        </div>
        
        <div id="voicepilot-status" style="
          display: none;
          text-align: center;
          margin-bottom: 15px;
        ">
          <div id="voicepilot-status-indicator" style="
            width: 50px;
            height: 50px;
            border-radius: 25px;
            background: #f8f8f8;
            margin: 0 auto 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #eee;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#666">
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
              <line x1="12" x2="12" y1="19" y2="23"/>
              <line x1="8" x2="16" y1="23" y2="23"/>
            </svg>
          </div>
          <div id="voicepilot-status-text" style="
            font-size: 12px;
            color: #666;
            font-weight: 500;
          ">Ready to help</div>
        </div>
        
        <div id="voicepilot-controls" style="
          display: none;
          gap: 8px;
          justify-content: center;
        ">
          <button id="voicepilot-start" style="
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
          ">Start Call</button>
          <button id="voicepilot-end" style="
            background: #FF3B30;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: none;
          ">End Call</button>
        </div>
        
        <div id="voicepilot-transcript" style="
          margin-top: 12px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 11px;
          max-height: 100px;
          overflow-y: auto;
          display: none;
          color: #333;
          border: 1px solid #eee;
        "></div>
      </div>
    `;

    // Add styles for states
    const style = document.createElement('style');
    style.textContent = `
      #voicepilot-container.expanded {
        width: 280px !important;
        flex-direction: column !important;
        padding: 16px !important;
        border-radius: 16px !important;
        cursor: default !important;
      }
      
      #voicepilot-container.expanded #mic-button,
      #voicepilot-container.expanded #call-action {
        display: none !important;
      }
      
      #voicepilot-container.expanded #voicepilot-header,
      #voicepilot-container.expanded #voicepilot-status,
      #voicepilot-container.expanded #voicepilot-controls {
        display: flex !important;
      }
      
      #mic-button.recording {
        background: linear-gradient(145deg, #ff4444, #cc0000) !important;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.2), -1px -1px 3px rgba(255,255,255,0.1) !important;
      }
      
      #mic-button.recording svg {
        fill: white !important;
      }
      
      #voicepilot-status-indicator.listening {
        background: #e8f5e8 !important;
        border-color: #4CAF50 !important;
        animation: pulse 2s infinite;
      }
      
      #voicepilot-status-indicator.listening svg {
        fill: #4CAF50 !important;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      #mic-button:hover {
        transform: translateY(-1px);
        box-shadow: 2px 4px 8px rgba(0,0,0,0.15), -2px -2px 5px rgba(255,255,255,0.7);
      }
      
      #call-action:hover {
        background: #333 !important;
      }
      
      #voicepilot-start:hover {
        background: #0056CC !important;
      }
      
      #voicepilot-end:hover {
        background: #D70015 !important;
      }
      
      #voicepilot-close:hover {
        background: #eee !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Supabase client setup
  function createSupabaseClient() {
    const url = supabaseUrl || 'https://ljfidzppyflrrszkgusa.supabase.co';
    const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZmlkenBweWZscnJzemtndXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNjE1NzQsImV4cCI6MjA0ODkzNzU3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
    
    return {
      url,
      key,
      from: (table) => ({
        select: (columns = '*') => ({
          eq: (column, value) => ({
            single: () => fetch(`${url}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
              headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
              }
            }).then(r => r.json()).then(data => ({ data: data[0] || null, error: null }))
          })
        })
      })
    };
  }

  // Audio utilities
  function playAudioBuffer(pcmBlob) {
    return new Promise((resolve) => {
      pcmBlob.arrayBuffer().then(arrayBuffer => {
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

        source.onended = resolve;
      });
    });
  }

  // WebSocket connection
  async function connectWebSocket() {
    try {
      const supabase = createSupabaseClient();
      const response = await fetch(`${supabase.url}/functions/v1/start-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.key}`,
        },
        body: JSON.stringify({ 
          agentId,
          instructions: 'You are a helpful AI assistant.',
          documentationUrls: []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start call');
      }

      const { relayUrl } = await response.json();
      websocket = new WebSocket(relayUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        updateStatus('connecting');
        
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
            systemInstruction: {
              parts: [{ text: 'You are a helpful AI assistant.' }]
            }
          }
        };

        websocket.send(JSON.stringify(setupMsg));
      };

      websocket.onmessage = async (event) => {
        let blob;
        if (event.data instanceof Blob) {
          blob = event.data;
        } else if (event.data instanceof ArrayBuffer) {
          blob = new Blob([event.data]);
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
              updateStatus('active');
              startMicStreaming();
              
              const greeting = {
                clientContent: {
                  turns: [{
                    role: 'user',
                    parts: [{ text: 'Hello!' }]
                  }],
                  turnComplete: true
                }
              };
              websocket.send(JSON.stringify(greeting));
            }
            return;
          } catch {
            // Not JSON, continue to audio processing
          }
        }

        // Process as audio
        playAudioBuffer(blob);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('error');
      };

      websocket.onclose = () => {
        console.log('WebSocket closed');
        updateStatus('ended');
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      updateStatus('error');
    }
  }

  // Microphone streaming
  async function startMicStreaming() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const sourceNode = audioContext.createMediaStreamSource(stream);
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
              mime_type: 'audio/pcm;rate=16000'
            }
          }
        };

        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify(payload));
        }
      };

    } catch (error) {
      console.error('Microphone error:', error);
      updateStatus('error');
    }
  }

  // UI updates
  function updateStatus(status) {
    const container = document.getElementById('voicepilot-container');
    const micButton = document.getElementById('mic-button');
    const callAction = document.getElementById('call-action');
    const statusIndicator = document.getElementById('voicepilot-status-indicator');
    const statusText = document.getElementById('voicepilot-status-text');
    const startButton = document.getElementById('voicepilot-start');
    const endButton = document.getElementById('voicepilot-end');

    switch (status) {
      case 'connecting':
        if (statusText) statusText.textContent = 'Connecting...';
        break;
      case 'active':
        isCallActive = true;
        if (micButton) micButton.classList.add('recording');
        if (callAction) callAction.style.display = 'flex';
        if (statusIndicator) statusIndicator.classList.add('listening');
        if (statusText) statusText.textContent = 'Listening...';
        if (startButton) startButton.style.display = 'none';
        if (endButton) endButton.style.display = 'block';
        break;
      case 'ended':
      case 'error':
        isCallActive = false;
        if (micButton) micButton.classList.remove('recording');
        if (callAction) callAction.style.display = 'none';
        if (statusIndicator) statusIndicator.classList.remove('listening');
        if (statusText) statusText.textContent = status === 'error' ? 'Error occurred' : 'Call ended';
        if (startButton) startButton.style.display = 'block';
        if (endButton) endButton.style.display = 'none';
        if (container) container.classList.remove('expanded');
        isExpanded = false;
        break;
    }
  }

  function toggleWidget() {
    const container = document.getElementById('voicepilot-container');
    if (!container) return;

    if (!isCallActive) {
      isExpanded = !isExpanded;
      if (isExpanded) {
        container.classList.add('expanded');
      } else {
        container.classList.remove('expanded');
      }
    }
  }

  function endCall() {
    if (websocket) {
      websocket.close();
      websocket = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    updateStatus('ended');
  }

  // Event handlers
  function setupEventHandlers() {
    const container = document.getElementById('voicepilot-container');
    const micButton = document.getElementById('mic-button');
    const callAction = document.getElementById('call-action');
    const closeButton = document.getElementById('voicepilot-close');
    const startButton = document.getElementById('voicepilot-start');
    const endButton = document.getElementById('voicepilot-end');

    if (container) {
      container.addEventListener('click', (e) => {
        if (e.target === container || e.target === micButton) {
          if (!isCallActive) {
            toggleWidget();
          }
        }
      });
    }

    if (callAction) {
      callAction.addEventListener('click', (e) => {
        e.stopPropagation();
        endCall();
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWidget();
      });
    }

    if (startButton) {
      startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        connectWebSocket();
      });
    }

    if (endButton) {
      endButton.addEventListener('click', (e) => {
        e.stopPropagation();
        endCall();
      });
    }
  }

  // Initialize
  function init() {
    createWidget();
    document.body.appendChild(document.getElementById('voicepilot-widget'));
    setupEventHandlers();
  }

  // Public API
  window.voicepilot = {
    open: () => {
      if (!isExpanded && !isCallActive) {
        toggleWidget();
      }
    },
    close: () => {
      if (isExpanded && !isCallActive) {
        toggleWidget();
      }
    },
    startCall: () => {
      if (!isCallActive) {
        connectWebSocket();
      }
    },
    endCall: () => {
      if (isCallActive) {
        endCall();
      }
    },
    setPulse: (enabled) => {
      const container = document.getElementById('voicepilot-container');
      if (container) {
        if (enabled) {
          container.style.animation = 'pulse 2s infinite';
        } else {
          container.style.animation = '';
        }
      }
    }
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();