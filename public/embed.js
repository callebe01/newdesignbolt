(function() {
  'use strict';

  // Get script attributes
  const currentScript = document.currentScript;
  const agentId = currentScript?.getAttribute('data-agent');
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  const googleApiKey = currentScript?.getAttribute('data-google-api-key');

  if (!agentId) {
    console.error('VoicePilot: data-agent attribute is required');
    return;
  }

  // Set global API key if provided
  if (googleApiKey) {
    window.voicepilotGoogleApiKey = googleApiKey;
  }

  // ═══════════════════════════════════════════════
  // Enhanced DOM Highlighting System – STRICT BUTTONS/INPUTS ONLY
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
          outline: 3px solid #3b82f6 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.3),0 0 20px rgba(59,130,246,0.2) !important;
          border-radius: 8px !important;
          background-color: rgba(59,130,246,0.08) !important;
          transition: all 0.3s ease !important;
          z-index: 9999 !important;
        }
        .${this.highlightClass}::before {
          content: '';
          position: absolute;
          top: -6px; left: -6px; right: -6px; bottom: -6px;
          background: linear-gradient(45deg, rgba(59,130,246,0.15), rgba(147,51,234,0.15));
          border-radius: 12px;
          z-index: -1;
          animation: voicepilot-pulse 2s infinite;
          pointer-events: none;
        }
        @keyframes voicepilot-pulse {
          0%,100%{opacity:0.4;transform:scale(1);}
          50%{opacity:0.8;transform:scale(1.02);}
        }
        .${this.highlightClass}-badge {
          position: absolute;
          top: -12px; left: -8px;
          background: #3b82f6; color: white;
          font-size: 10px; font-weight:600;
          padding: 2px 6px; border-radius:4px;
          z-index:10000; pointer-events:none;
          animation: voicepilot-badge-appear 0.3s ease;
        }
        @keyframes voicepilot-badge-appear {
          0%{opacity:0;transform:translateY(-5px) scale(0.8);}
          100%{opacity:1;transform:translateY(0) scale(1);}
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

    highlightElement(searchText) {
      // 1) pull out anything in single or double quotes (highest priority)
      let phrase = searchText.trim();
      const qm = phrase.match(/['"]([^'"]+)['"]/);
      if (qm) {
        phrase = qm[1];      // e.g. "New Agent"
      }

      phrase = phrase.toLowerCase();
      if (!phrase) return false;

      // 2) grab _only_ buttons + clickable inputs
      const controls = Array.from(
        document.querySelectorAll(
          'button,' +
          'input[type="button"],' +
          'input[type="submit"],' +
          'input[type="reset"]'
        )
      ).filter(el => this.isElementVisible(el));

      // 3) score each by exact (2) → substring (1)
      const matches = controls
        .map(el => {
          const label = (el.getAttribute('aria-label')
                       || el.value
                       || el.textContent
                       || ''
                      ).trim();
          const lower = label.toLowerCase();
          let score = 0;
          if (lower === phrase)      score = 2;
          else if (lower.includes(phrase)) score = 1;
          return { el, label, score };
        })
        .filter(x => x.score > 0)
        .sort((a,b) => b.score - a.score);

      if (!matches.length) {
        console.log('[VoicePilot] No buttons/inputs matching:', phrase);
        return false;
      }

      // 4) highlight the top one
      this.clearHighlights();
      const best = matches[0].el;
      this.addHighlight(best, true);
      best.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.log('[VoicePilot] Highlighting control:', matches[0].label);
      return true;
    }

    addHighlight(el, isPrimary=false) {
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
        el.querySelectorAll(`.voicepilot-highlight-badge`)
          .forEach(b => b.remove());
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
  // SmartHighlighter (buffers AI‐speech → DOMHighlighter)
  // ═══════════════════════════════════════════════
  class SmartHighlighter {
    constructor() {
      this.textBuffer = '';
      this.bufferTimeout = null;
      this.lastHighlightTime = 0;
      this.cooldown = 2000;   // ms
      this.delay    = 1500;   // ms
    }
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
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
    }
  }

  const smartHighlighter = new SmartHighlighter();

  // Expose global highlight functions
  window.voicePilotHighlight = text => { smartHighlighter.addText(text); return true; };
  window.voicePilotClearHighlights = () => {
    domHighlighter.clearHighlights();
    smartHighlighter.clear();
  };

  // ═══════════════════════════════════════════════
  // VoicePilot Widget Implementation
  // ═══════════════════════════════════════════════
  function createWidget() {
    let isOpen = false;
    let isCallActive = false;
    let callDuration = 0;
    let callTimer = null;
    let transcript = '';
    let agent = null;
    let websocket = null;
    let microphoneStream = null;
    let audioContext = null;
    let audioQueueTime = 0;
    let greetingSent = false;

    // Create widget container
    const container = document.createElement('div');
    container.id = 'voicepilot-widget';
    container.style.cssText = `
      position: fixed;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Position the widget
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

    // Load agent data
    async function loadAgent() {
      try {
        const response = await fetch(`https://ljfidzppyflrrszkgusa.supabase.co/rest/v1/agents?id=eq.${agentId}&select=*`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZmlkenBweWZscnJzemtndXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNDI0NzEsImV4cCI6MjA0ODkxODQ3MX0.VJJbeuWLzOJIhEZKJOKOdmRJJmPBYJQIhEZKJOKOdmRJJmPBYJQIhEZKJOKOdmRJJmPBYJQ',
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data && data.length > 0) {
          agent = data[0];
        }
      } catch (error) {
        console.error('Failed to load agent:', error);
      }
    }

    // Audio playback
    async function playAudioBuffer(pcmBlob) {
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
        if (audioQueueTime > audioContext.currentTime) {
          startAt = audioQueueTime;
        }
        source.start(startAt);
        audioQueueTime = startAt + buffer.duration;
      } catch (err) {
        console.error('Audio playback error:', err);
      }
    }

    // Start microphone streaming
    async function startMicStreaming() {
      try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const sourceNode = audioContext.createMediaStreamSource(microphoneStream);
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
      } catch (err) {
        console.error('Microphone error:', err);
      }
    }

    // Start call
    async function startCall() {
      if (!agent) {
        console.error('Agent not loaded');
        return;
      }

      try {
        const apiKey = window.voicepilotGoogleApiKey || '';
        if (!apiKey) {
          throw new Error('Google API key not found');
        }

        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          console.log('WebSocket connected');
          isCallActive = true;
          greetingSent = false;
          callDuration = 0;
          transcript = '';
          
          // Start call timer
          callTimer = setInterval(() => {
            callDuration++;
            updateUI();
          }, 1000);

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
                parts: [{
                  text: agent.instructions || 'You are a helpful AI assistant.'
                }]
              }
            }
          };

          websocket.send(JSON.stringify(setupMsg));
          updateUI();
        };

        websocket.onmessage = async (ev) => {
          if (!(ev.data instanceof Blob)) return;

          let maybeText = null;
          try {
            maybeText = await ev.data.text();
          } catch {
            maybeText = null;
          }

          if (maybeText) {
            try {
              const parsed = JSON.parse(maybeText);

              if (parsed.setupComplete) {
                console.log('Setup complete');
                startMicStreaming();
                
                if (!greetingSent) {
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
                    transcript += text;
                    if (window.voicePilotHighlight) {
                      window.voicePilotHighlight(text);
                    }
                  }
                  if (finished) {
                    updateUI();
                  }
                }

                // Handle user speech transcription
                if (sc.inputTranscription?.text) {
                  const userText = sc.inputTranscription.text.trim();
                  if (userText) {
                    transcript += ' ' + userText;
                    updateUI();
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
                          type: 'audio/pcm;rate=24000'
                        });
                        playAudioBuffer(pcmBlob);
                      } catch (err) {
                        console.error('Audio decode error:', err);
                      }
                    }
                  }
                }
              }
              return;
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
            }
          }

          // Fallback for binary audio data
          playAudioBuffer(ev.data);
        };

        websocket.onerror = (err) => {
          console.error('WebSocket error:', err);
        };

        websocket.onclose = () => {
          console.log('WebSocket closed');
          endCall();
        };

      } catch (err) {
        console.error('Failed to start call:', err);
      }
    }

    // End call
    function endCall() {
      isCallActive = false;
      
      if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
      }

      if (websocket) {
        websocket.close();
        websocket = null;
      }

      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
      }

      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
        audioQueueTime = 0;
      }

      greetingSent = false;
      
      if (window.voicePilotClearHighlights) {
        window.voicePilotClearHighlights();
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

    // Render collapsed widget (floating button)
    function renderCollapsedWidget() {
      container.innerHTML = `
        <button id="voicepilot-toggle" style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border: none;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          ${isCallActive ? `
            <div style="
              position: absolute;
              top: -2px;
              right: -2px;
              width: 12px;
              height: 12px;
              background: #ef4444;
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
          ` : ''}
        </button>
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
          #voicepilot-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 25px rgba(59, 130, 246, 0.4);
          }
        </style>
      `;

      document.getElementById('voicepilot-toggle').onclick = () => {
        isOpen = true;
        updateUI();
      };
    }

    // Render expanded widget
    function renderExpandedWidget() {
      container.innerHTML = `
        <div style="
          width: 320px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 16px;
        ">
          <!-- Header -->
          <div style="
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            padding: 16px;
            position: relative;
          ">
            <button id="voicepilot-close" style="
              position: absolute;
              top: 12px;
              right: 12px;
              background: rgba(255, 255, 255, 0.2);
              border: none;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${agent?.name || 'AI Assistant'}</h3>
                <p style="margin: 0; font-size: 12px; opacity: 0.9;">
                  ${isCallActive ? `${formatTime(callDuration)} elapsed` : 'Ready to help'}
                </p>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 20px;">
            ${!isCallActive ? `
              <div style="text-align: center;">
                <div style="
                  width: 60px;
                  height: 60px;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 16px;
                ">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </div>
                <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">
                  Start a voice conversation with your AI assistant
                </p>
                <button id="voicepilot-start" style="
                  width: 100%;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  padding: 12px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s ease;
                ">
                  Start Voice Chat
                </button>
              </div>
            ` : `
              <div>
                <!-- Live indicator -->
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  margin-bottom: 16px;
                ">
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                  "></div>
                  <span style="font-size: 12px; font-weight: 600; color: #6b7280;">LIVE</span>
                </div>

                <!-- Transcript -->
                ${transcript ? `
                  <div style="
                    background: #f9fafb;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 16px;
                    max-height: 120px;
                    overflow-y: auto;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #374151;
                  ">
                    ${transcript}
                  </div>
                ` : ''}

                <!-- Controls -->
                <div style="display: flex; gap: 8px;">
                  <button id="voicepilot-mute" style="
                    flex: 1;
                    background: #f3f4f6;
                    border: none;
                    border-radius: 8px;
                    padding: 8px;
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
                  <button id="voicepilot-end" style="
                    flex: 1;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 8px;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                  ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    End Call
                  </button>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- Floating button when expanded -->
        <button id="voicepilot-toggle-expanded" style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border: none;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      `;

      // Event listeners
      document.getElementById('voicepilot-close').onclick = () => {
        isOpen = false;
        updateUI();
      };

      document.getElementById('voicepilot-toggle-expanded').onclick = () => {
        isOpen = false;
        updateUI();
      };

      if (!isCallActive) {
        document.getElementById('voicepilot-start').onclick = startCall;
      } else {
        document.getElementById('voicepilot-end').onclick = endCall;
      }
    }

    // Initialize
    loadAgent().then(() => {
      updateUI();
    });

    // Public API
    return {
      open: () => {
        isOpen = true;
        updateUI();
      },
      close: () => {
        isOpen = false;
        updateUI();
      },
      startCall: startCall,
      endCall: endCall,
      setPulse: (enabled) => {
        // Could add pulsing animation to the button
      }
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

})();