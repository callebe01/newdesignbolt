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

  // DOM Highlighting System
  class DOMHighlighter {
    constructor() {
      this.highlightedElements = new Set();
      this.highlightClass = 'voicepilot-highlight';
      this.highlightStyle = null;
      this.injectStyles();
    }

    injectStyles() {
      if (this.highlightStyle) {
        this.highlightStyle.remove();
      }

      this.highlightStyle = document.createElement('style');
      this.highlightStyle.id = 'voicepilot-highlight-styles';
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
          animation: voicepilot-pulse 2s infinite;
        }
        
        @keyframes voicepilot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.02); }
        }
        
        .${this.highlightClass}-text {
          background: linear-gradient(120deg, #3b82f6, #8b5cf6) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          font-weight: 600 !important;
        }
      `;
      document.head.appendChild(this.highlightStyle);
    }

    extractSearchTerms(text) {
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

    calculateMatchConfidence(element, searchTerms) {
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

    isElementVisible(element) {
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

    searchElements(searchText) {
      const matches = [];
      const searchTerms = this.extractSearchTerms(searchText);
      
      if (searchTerms.length === 0) return matches;

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
      
      elements.forEach((element) => {
        if (!this.isElementVisible(element)) return;
        
        const confidence = this.calculateMatchConfidence(element, searchTerms);
        
        if (confidence > 0.3) {
          matches.push({
            element: element,
            text: this.getElementText(element),
            confidence: confidence
          });
        }
      });

      return matches.sort((a, b) => b.confidence - a.confidence);
    }

    getElementText(element) {
      return (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent?.trim() ||
        element.getAttribute('data-testid') ||
        element.className ||
        'Element'
      ).substring(0, 50);
    }

    highlightElement(searchText) {
      const matches = this.searchElements(searchText);
      
      if (matches.length === 0) return false;

      this.clearHighlights();

      const bestMatch = matches[0];
      const threshold = Math.max(0.7, bestMatch.confidence - 0.2);
      
      const elementsToHighlight = matches
        .filter(match => match.confidence >= threshold)
        .slice(0, 3)
        .map(match => match.element);

      elementsToHighlight.forEach(element => {
        this.addHighlight(element);
      });

      this.scrollToElement(bestMatch.element);

      setTimeout(() => {
        this.clearHighlights();
      }, 5000);

      return true;
    }

    addHighlight(element) {
      element.classList.add(this.highlightClass);
      this.highlightedElements.add(element);

      if (element.children.length === 0 && element.textContent?.trim()) {
        element.classList.add(`${this.highlightClass}-text`);
      }
    }

    scrollToElement(element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }

    clearHighlights() {
      this.highlightedElements.forEach(element => {
        element.classList.remove(this.highlightClass, `${this.highlightClass}-text`);
      });
      this.highlightedElements.clear();
    }

    destroy() {
      this.clearHighlights();
      if (this.highlightStyle) {
        this.highlightStyle.remove();
        this.highlightStyle = null;
      }
    }
  }

  // Initialize DOM highlighter
  const domHighlighter = new DOMHighlighter();

  // Expose global functions
  window.voicePilotHighlight = (text) => domHighlighter.highlightElement(text);
  window.voicePilotClearHighlights = () => domHighlighter.clearHighlights();

  // Legacy function for backward compatibility
  window.highlightTextMatch = window.voicePilotHighlight;

  // Widget creation and management
  function createWidget() {
    // Remove existing widget if present
    const existingWidget = document.getElementById('voicepilot-widget');
    if (existingWidget) {
      existingWidget.remove();
    }

    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'voicepilot-widget';
    widget.style.cssText = `
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Set position
    const spacing = '24px';
    switch (position) {
      case 'bottom-left':
        widget.style.bottom = spacing;
        widget.style.left = spacing;
        break;
      case 'top-right':
        widget.style.top = spacing;
        widget.style.right = spacing;
        break;
      case 'top-left':
        widget.style.top = spacing;
        widget.style.left = spacing;
        break;
      default:
        widget.style.bottom = spacing;
        widget.style.right = spacing;
        break;
    }

    // Widget state
    let isExpanded = false;
    let isCallActive = false;
    let callDuration = 0;
    let callTimer = null;
    let websocket = null;
    let microphoneStream = null;
    let audioContext = null;
    let audioQueueTime = 0;
    let transcript = '';

    // Create widget HTML
    function updateWidget() {
      widget.innerHTML = `
        <div id="voicepilot-expanded" style="
          display: ${isExpanded ? 'block' : 'none'};
          width: 320px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          margin-bottom: 16px;
          overflow: hidden;
        ">
          <div style="
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            padding: 16px;
            color: white;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between;">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 14px;">AI Assistant</div>
                  <div style="font-size: 12px; opacity: 0.9;">
                    ${isCallActive ? `${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')} elapsed` : 'Ready to help'}
                  </div>
                </div>
              </div>
              <button onclick="window.voicepilot.close()" style="
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div style="padding: 16px;">
            ${!isCallActive ? `
              <div style="text-align: center;">
                <div style="
                  width: 64px;
                  height: 64px;
                  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 16px;
                ">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                  Start a voice conversation with your AI assistant
                </p>
                <button onclick="window.voicepilot.startCall()" style="
                  width: 100%;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  color: white;
                  border: none;
                  padding: 12px 16px;
                  border-radius: 12px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Start Voice Chat
                </button>
              </div>
            ` : `
              <div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px;">
                  <div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 2s infinite;"></div>
                  <span style="font-size: 12px; font-weight: 600; color: #6b7280;">LIVE</span>
                </div>
                
                ${transcript ? `
                  <div style="
                    background: #f9fafb;
                    border-radius: 8px;
                    padding: 12px;
                    max-height: 128px;
                    overflow-y: auto;
                    margin-bottom: 16px;
                  ">
                    <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin: 0;">
                      ${transcript}
                    </p>
                  </div>
                ` : ''}
                
                <button onclick="window.voicepilot.endCall()" style="
                  width: 100%;
                  background: #ef4444;
                  color: white;
                  border: none;
                  padding: 8px 12px;
                  border-radius: 8px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  End Call
                </button>
              </div>
            `}
          </div>
        </div>
        
        <button onclick="window.voicepilot.${isExpanded ? 'close' : 'open'}()" style="
          background: black;
          color: white;
          border: none;
          border-radius: 50px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          overflow: hidden;
          transition: all 0.3s ease;
          ${isCallActive && !isExpanded ? 'animation: pulse 2s infinite;' : ''}
        ">
          <div style="
            width: 56px;
            height: 56px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            position: relative;
          ">
            ${isCallActive ? '<div style="position: absolute; inset: 0; background: rgba(239, 68, 68, 0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>' : ''}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          
          ${!isCallActive && !isExpanded ? `
            <div style="padding: 0 16px; white-space: nowrap;">
              <span style="font-weight: 600; font-size: 14px;">VOICE CHAT</span>
            </div>
          ` : ''}
          
          ${isCallActive && !isExpanded ? `
            <div style="padding: 0 16px; white-space: nowrap;">
              <span style="font-weight: 600; font-size: 12px; color: #fca5a5;">
                ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ` : ''}
        </button>
        
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        </style>
      `;
    }

    // Audio playback functionality
    async function playAudioBuffer(pcmBlob) {
      try {
        const arrayBuffer = await pcmBlob.arrayBuffer();
        const pcm16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(pcm16.length);
        
        // Convert PCM16 to Float32
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

        // Queue audio to play smoothly
        let startAt = audioContext.currentTime;
        if (audioQueueTime > audioContext.currentTime) {
          startAt = audioQueueTime;
        }
        source.start(startAt);
        audioQueueTime = startAt + buffer.duration;

        console.log('[VoicePilot] Playing audio buffer, duration:', buffer.duration);
      } catch (error) {
        console.error('[VoicePilot] Audio playback error:', error);
      }
    }

    // Voice call functionality
    async function startCall() {
      try {
        const apiKey = window.voicepilotGoogleApiKey;
        if (!apiKey) {
          throw new Error('Google API key not configured');
        }

        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          console.log('[VoicePilot] WebSocket connected');
          
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
              tools: [{
                function_declarations: [{
                  name: 'highlight_element',
                  description: 'Highlight a UI element on the page when mentioning it in conversation.',
                  parameters: {
                    type: 'object',
                    properties: {
                      text: {
                        type: 'string',
                        description: 'The text or description of the element to highlight'
                      }
                    },
                    required: ['text']
                  }
                }]
              }],
              outputAudioTranscription: {},
              inputAudioTranscription: {},
              systemInstruction: {
                parts: [{
                  text: 'You are a helpful AI assistant. When you mention specific UI elements, buttons, or parts of the interface, use the highlight_element tool to help users see what you\'re referring to. For example, if you say "click the New Post button", call highlight_element with "New Post button" as the text parameter.'
                }]
              }
            }
          };

          websocket.send(JSON.stringify(setupMsg));
        };

        websocket.onmessage = async (event) => {
          if (!(event.data instanceof Blob)) return;

          try {
            const text = await event.data.text();
            const parsed = JSON.parse(text);

            if (parsed.setupComplete) {
              console.log('[VoicePilot] Setup complete');
              isCallActive = true;
              startCallTimer();
              startMicrophone();
              updateWidget();
              
              // Send greeting
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

            if (parsed.serverContent) {
              if (parsed.serverContent.outputTranscription?.text) {
                transcript += parsed.serverContent.outputTranscription.text;
                updateWidget();
              }

              if (parsed.serverContent.inputTranscription?.text) {
                transcript += parsed.serverContent.inputTranscription.text;
                updateWidget();
              }

              const modelTurn = parsed.serverContent.modelTurn;
              if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                  if (part.text) {
                    transcript += part.text;
                    updateWidget();
                  }

                  // Handle function calls - CRITICAL FIX
                  if (part.functionCall?.name === 'highlight_element' && part.functionCall.args?.text) {
                    console.log('[VoicePilot] Highlighting element:', part.functionCall.args.text);
                    const highlighted = window.voicePilotHighlight(part.functionCall.args.text);
                    
                    // Send function response back to the model - ASYNC to prevent blocking
                    setTimeout(() => {
                      if (websocket && websocket.readyState === WebSocket.OPEN) {
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
                          websocket.send(JSON.stringify(functionResponse));
                          console.log('[VoicePilot] Sent function response:', highlighted);
                        } catch (sendError) {
                          console.error('[VoicePilot] Error sending function response:', sendError);
                        }
                      }
                    }, 100); // Small delay to prevent race conditions
                  }

                  if (part.inlineData?.data) {
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
                      await playAudioBuffer(pcmBlob);
                    } catch (err) {
                      console.error('[VoicePilot] Error decoding audio:', err);
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Handle binary audio data directly
            console.log('[VoicePilot] Received binary audio data');
            await playAudioBuffer(event.data);
          }
        };

        websocket.onerror = (error) => {
          console.error('[VoicePilot] WebSocket error:', error);
          endCall();
        };

        websocket.onclose = () => {
          console.log('[VoicePilot] WebSocket closed');
          endCall();
        };

      } catch (error) {
        console.error('[VoicePilot] Failed to start call:', error);
        alert('Failed to start voice chat: ' + error.message);
      }
    }

    async function startMicrophone() {
      try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const source = audioContext.createMediaStreamSource(microphoneStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        processor.onaudioprocess = (event) => {
          if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
          
          const inputData = event.inputBuffer.getChannelData(0);
          const inRate = audioContext.sampleRate;
          const outRate = 16000;
          const ratio = inRate / outRate;
          const outLength = Math.floor(inputData.length / ratio);

          const pcm16 = new Int16Array(outLength);
          for (let i = 0; i < outLength; i++) {
            const idx = Math.floor(i * ratio);
            let sample = inputData[idx];
            sample = Math.max(-1, Math.min(1, sample));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }
          
          const u8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < u8.byteLength; i++) {
            binary += String.fromCharCode(u8[i]);
          }
          const base64Audio = btoa(binary);
          
          websocket.send(JSON.stringify({
            realtime_input: {
              audio: {
                data: base64Audio,
                mime_type: 'audio/pcm;rate=16000'
              }
            }
          }));
        };
      } catch (error) {
        console.error('[VoicePilot] Microphone error:', error);
      }
    }

    function startCallTimer() {
      callDuration = 0;
      callTimer = setInterval(() => {
        callDuration++;
        updateWidget();
      }, 1000);
    }

    function endCall() {
      isCallActive = false;
      transcript = '';
      audioQueueTime = 0;
      
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
        audioContext.close();
        audioContext = null;
      }
      
      domHighlighter.clearHighlights();
      updateWidget();
    }

    // Initialize widget
    updateWidget();
    document.body.appendChild(widget);

    // Return API
    return {
      open: () => {
        isExpanded = true;
        updateWidget();
      },
      close: () => {
        isExpanded = false;
        updateWidget();
      },
      startCall: startCall,
      endCall: endCall,
      setPulse: (enabled) => {
        // Pulse functionality if needed
      }
    };
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.voicepilot = createWidget();
    });
  } else {
    window.voicepilot = createWidget();
  }

})();