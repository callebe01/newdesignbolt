(function() {
  'use strict';

  // CSS styles as a string (will be injected into Shadow DOM)
  const WIDGET_STYLES = `
    :host {
      --vc-primary: #2563EB;
      --vc-error: #DC2626;
      --vc-background: #FFFFFF;
      --vc-text: #1F2937;
      --vc-border: #E5E7EB;
      --vc-muted: #6B7280;
      --vc-success: #059669;
      
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: fixed;
      z-index: 2147483647; /* Maximum z-index value */
      pointer-events: none;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .fab {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--vc-primary) 0%, #1D4ED8 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 32px rgba(37, 99, 235, 0.4);
      transition: all 0.3s ease;
      pointer-events: auto;
      color: white;
      position: fixed;
      z-index: 2147483647;
    }

    .fab:hover {
      transform: scale(1.1);
      box-shadow: 0 16px 40px rgba(37, 99, 235, 0.5);
    }

    .fab.pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.05);
      }
    }

    .panel {
      position: fixed;
      background: var(--vc-background);
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
      width: 400px;
      max-height: 650px;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
      border: 2px solid var(--vc-border);
      overflow: hidden;
      z-index: 2147483646;
    }

    .panel.open {
      transform: translateY(0);
    }

    .panel-header {
      padding: 24px;
      border-bottom: 1px solid var(--vc-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, var(--vc-primary) 0%, #1D4ED8 100%);
      color: white;
    }

    .panel-title {
      font-size: 20px;
      font-weight: 700;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      cursor: pointer;
      padding: 12px;
      border-radius: 12px;
      color: white;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .close-btn svg {
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
    }

    .panel-content {
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-height: 550px;
      overflow-y: auto;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 15px;
      color: var(--vc-muted);
      padding: 16px;
      background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
      border-radius: 16px;
      border: 1px solid var(--vc-border);
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--vc-muted);
      flex-shrink: 0;
    }

    .status-dot.live {
      background: var(--vc-success);
      animation: pulse 2s infinite;
      box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.2);
    }

    .call-controls {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .primary-btn {
      background: linear-gradient(135deg, var(--vc-primary) 0%, #1D4ED8 100%);
      color: white;
      border: none;
      padding: 20px 24px;
      border-radius: 16px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .primary-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(37, 99, 235, 0.4);
    }

    .primary-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .primary-btn svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: none;
    }

    .danger-btn {
      background: linear-gradient(135deg, var(--vc-error) 0%, #B91C1C 100%);
      color: white;
      border: none;
      padding: 20px 24px;
      border-radius: 16px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 8px 24px rgba(220, 38, 38, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .danger-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(220, 38, 38, 0.4);
    }

    .danger-btn svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: none;
    }

    .timer {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 28px;
      font-weight: 800;
      color: var(--vc-text);
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%);
      border-radius: 16px;
      border: 2px solid var(--vc-border);
      letter-spacing: 2px;
    }

    .screen-share-control {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      border: 2px solid var(--vc-border);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      background: var(--vc-background);
    }

    .screen-share-control:hover {
      border-color: var(--vc-primary);
      background: rgba(37, 99, 235, 0.03);
      transform: translateY(-1px);
    }

    .screen-share-control svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
    }

    .checkbox {
      width: 24px;
      height: 24px;
      border: 3px solid var(--vc-primary);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .checkbox.checked {
      background: var(--vc-primary);
      border-color: var(--vc-primary);
    }

    .checkbox svg {
      width: 14px;
      height: 14px;
      stroke: white;
      fill: none;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 2147483647;
      backdrop-filter: blur(4px);
    }

    .modal {
      background: var(--vc-background);
      border-radius: 20px;
      padding: 32px;
      max-width: 360px;
      text-align: center;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
      border: 1px solid var(--vc-border);
    }

    .modal h3 {
      font-size: 20px;
      font-weight: 700;
      color: var(--vc-text);
      margin-bottom: 16px;
    }

    .modal p {
      font-size: 15px;
      color: var(--vc-muted);
      margin-bottom: 24px;
      line-height: 1.6;
    }

    .modal-buttons {
      display: flex;
      gap: 16px;
    }

    .secondary-btn {
      background: var(--vc-border);
      color: var(--vc-text);
      border: none;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      flex: 1;
      transition: all 0.2s ease;
    }

    .secondary-btn:hover {
      background: #D1D5DB;
      transform: translateY(-1px);
    }

    .toast {
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--vc-text);
      color: white;
      padding: 20px 28px;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }

    .toast.show {
      opacity: 1;
    }

    .transcript-area {
      max-height: 180px;
      overflow-y: auto;
      padding: 20px;
      background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.6;
      color: var(--vc-text);
      white-space: pre-wrap;
      border: 1px solid var(--vc-border);
    }

    .transcript-area:empty::before {
      content: "💬 Conversation will appear here...";
      color: var(--vc-muted);
      font-style: italic;
    }

    /* Position classes */
    .position-bottom-right {
      bottom: 32px;
      right: 32px;
    }

    .position-bottom-left {
      bottom: 32px;
      left: 32px;
    }

    .position-top-right {
      top: 32px;
      right: 32px;
    }

    .position-top-left {
      top: 32px;
      left: 32px;
    }

    .panel.position-bottom-right {
      bottom: 120px;
      right: 32px;
    }

    .panel.position-bottom-left {
      bottom: 120px;
      left: 32px;
    }

    .panel.position-top-right {
      top: 120px;
      right: 32px;
    }

    .panel.position-top-left {
      top: 120px;
      left: 32px;
    }

    @media (max-width: 480px) {
      .panel {
        width: calc(100vw - 24px);
        height: calc(100vh - 140px);
        border-radius: 20px;
        max-height: none;
        left: 12px !important;
        right: 12px !important;
        bottom: 120px !important;
        top: auto !important;
      }

      .fab {
        width: 64px;
        height: 64px;
        bottom: 24px !important;
        right: 24px !important;
      }
    }
  `;

  // SVG Icons as functions that return DOM elements
  const ICONS = {
    headset: () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '32');
      svg.setAttribute('height', '32');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M3 11v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4a9 9 0 0 1 18 0h-1a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3');
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M19 14v2a2 2 0 0 1-2 2h-1');
      
      svg.appendChild(path1);
      svg.appendChild(path2);
      return svg;
    },
    
    mic: () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z');
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M19 10v2a7 7 0 0 1-14 0v-2');
      
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', '12');
      line1.setAttribute('x2', '12');
      line1.setAttribute('y1', '19');
      line1.setAttribute('y2', '22');
      
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', '8');
      line2.setAttribute('x2', '16');
      line2.setAttribute('y1', '22');
      line2.setAttribute('y2', '22');
      
      svg.appendChild(path1);
      svg.appendChild(path2);
      svg.appendChild(line1);
      svg.appendChild(line2);
      return svg;
    },
    
    close: () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '24');
      svg.setAttribute('height', '24');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2.5');
      
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', '18');
      line1.setAttribute('y1', '6');
      line1.setAttribute('x2', '6');
      line1.setAttribute('y2', '18');
      
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', '6');
      line2.setAttribute('y1', '6');
      line2.setAttribute('x2', '18');
      line2.setAttribute('y2', '18');
      
      svg.appendChild(line1);
      svg.appendChild(line2);
      return svg;
    },
    
    monitor: () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '18');
      svg.setAttribute('height', '18');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '20');
      rect.setAttribute('height', '14');
      rect.setAttribute('x', '2');
      rect.setAttribute('y', '3');
      rect.setAttribute('rx', '2');
      
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', '8');
      line1.setAttribute('x2', '16');
      line1.setAttribute('y1', '21');
      line1.setAttribute('y2', '21');
      
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', '12');
      line2.setAttribute('x2', '12');
      line2.setAttribute('y1', '17');
      line2.setAttribute('y2', '21');
      
      svg.appendChild(rect);
      svg.appendChild(line1);
      svg.appendChild(line2);
      return svg;
    },
    
    check: () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '3');
      
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '20,6 9,17 4,12');
      
      svg.appendChild(polyline);
      return svg;
    },

    phone: () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z');
      
      svg.appendChild(path);
      return svg;
    }
  };

  // Widget Panel Module (inline)
  const WidgetPanelModule = {
    create(container, agentId, position, api, googleApiKey) {
      let state = {
        callState: 'idle', // idle, connecting, live, ended
        isScreenSharing: false,
        isMicrophoneActive: false,
        startTime: null,
        timer: null,
        websocket: null,
        transcript: '',
        audioContext: null,
        audioQueue: 0,
        microphoneStream: null,
        screenStream: null,
        greetingSent: false
      };

      const panel = document.createElement('div');
      panel.className = `panel position-${position}`;
      
      // Create panel structure
      const panelHeader = document.createElement('div');
      panelHeader.className = 'panel-header';
      
      const panelTitle = document.createElement('div');
      panelTitle.className = 'panel-title';
      panelTitle.textContent = '🤖 AI Assistant';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.setAttribute('aria-label', 'Close panel');
      closeBtn.appendChild(ICONS.close());
      
      panelHeader.appendChild(panelTitle);
      panelHeader.appendChild(closeBtn);
      
      const panelContent = document.createElement('div');
      panelContent.className = 'panel-content';
      
      // Status indicator
      const statusIndicator = document.createElement('div');
      statusIndicator.className = 'status-indicator';
      
      const statusDot = document.createElement('div');
      statusDot.className = 'status-dot';
      
      const statusText = document.createElement('span');
      statusText.className = 'status-text';
      statusText.textContent = 'Ready to help you with the platform';
      
      statusIndicator.appendChild(statusDot);
      statusIndicator.appendChild(statusText);
      
      // Transcript area
      const transcriptArea = document.createElement('div');
      transcriptArea.className = 'transcript-area';
      transcriptArea.style.display = 'none';
      
      // Call controls
      const callControls = document.createElement('div');
      callControls.className = 'call-controls';
      
      const startCallBtn = document.createElement('button');
      startCallBtn.className = 'primary-btn start-call-btn';
      startCallBtn.setAttribute('aria-label', 'Start call');
      startCallBtn.appendChild(ICONS.mic());
      const startCallText = document.createElement('span');
      startCallText.textContent = 'Start Voice Chat';
      startCallBtn.appendChild(startCallText);
      
      // Live controls
      const liveControls = document.createElement('div');
      liveControls.className = 'live-controls';
      liveControls.style.display = 'none';
      
      const timerEl = document.createElement('div');
      timerEl.className = 'timer';
      timerEl.textContent = '00:00';
      
      // Screen share control
      const screenShareControl = document.createElement('div');
      screenShareControl.className = 'screen-share-control';
      
      const checkbox = document.createElement('div');
      checkbox.className = 'checkbox';
      
      const checkIcon = document.createElement('span');
      checkIcon.className = 'check-icon';
      checkIcon.style.display = 'none';
      checkIcon.appendChild(ICONS.check());
      checkbox.appendChild(checkIcon);
      
      const shareText = document.createElement('span');
      shareText.textContent = 'Share Screen';
      
      screenShareControl.appendChild(checkbox);
      screenShareControl.appendChild(shareText);
      screenShareControl.appendChild(ICONS.monitor());
      
      const endCallBtn = document.createElement('button');
      endCallBtn.className = 'danger-btn end-call-btn';
      endCallBtn.setAttribute('aria-label', 'End call');
      endCallBtn.appendChild(ICONS.phone());
      const endCallText = document.createElement('span');
      endCallText.textContent = 'End Call';
      endCallBtn.appendChild(endCallText);
      
      liveControls.appendChild(timerEl);
      liveControls.appendChild(screenShareControl);
      liveControls.appendChild(endCallBtn);
      
      callControls.appendChild(startCallBtn);
      callControls.appendChild(liveControls);
      
      panelContent.appendChild(statusIndicator);
      panelContent.appendChild(transcriptArea);
      panelContent.appendChild(callControls);
      
      panel.appendChild(panelHeader);
      panel.appendChild(panelContent);

      // Fix close button event handler
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Widget] Close button clicked');
        api.close();
      });

      startCallBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await startCall();
        } catch (error) {
          console.error('Failed to start call:', error);
          showToast('Failed to start call: ' + error.message);
        }
      });

      endCallBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        endCall();
      });

      screenShareControl.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!state.isScreenSharing) {
          const hasConsent = await checkScreenShareConsent();
          if (!hasConsent) return;
        }
        toggleScreenShare();
      });

      async function startCall() {
        if (state.callState !== 'idle') return;

        state.callState = 'connecting';
        startCallBtn.disabled = true;
        startCallText.textContent = 'Connecting...';
        updateUI();

        try {
          // Use the API key passed from the React app
          const apiKey = googleApiKey;
          
          if (!apiKey || apiKey.includes('JJJJJJ')) {
            throw new Error('Google API key not configured');
          }

          const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
          
          state.websocket = new WebSocket(wsUrl);
          state.greetingSent = false;
          
          state.websocket.onopen = () => {
            console.log('[Widget] WebSocket connected');
            
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
                outputAudioTranscription: {},
                inputAudioTranscription: {},
                systemInstruction: {
                  parts: [{
                    text: 'You are a helpful AI assistant for a design testing platform called "Design Insights". Help users understand how to use the platform, create agents, run tests, and analyze results. Be concise and practical in your responses. The platform allows users to create AI agents that can conduct user research sessions and provide insights.'
                  }]
                }
              }
            };
            
            state.websocket.send(JSON.stringify(setupMsg));
          };
          
          state.websocket.onmessage = async (ev) => {
            await handleWebSocketMessage(ev);
          };
          
          state.websocket.onclose = () => {
            console.log('[Widget] WebSocket closed');
            if (state.callState === 'live') {
              endCall();
            }
          };
          
          state.websocket.onerror = (error) => {
            console.error('[Widget] WebSocket error:', error);
            endCall();
            showToast('Connection error');
          };

        } catch (error) {
          state.callState = 'idle';
          startCallBtn.disabled = false;
          startCallText.textContent = 'Start Voice Chat';
          updateUI();
          throw error;
        }
      }

      async function handleWebSocketMessage(ev) {
        if (!(ev.data instanceof Blob)) {
          return;
        }

        let maybeText = null;
        try {
          maybeText = await ev.data.text();
        } catch {
          maybeText = null;
        }

        if (maybeText) {
          try {
            const parsed = JSON.parse(maybeText);
            console.log('[Widget] Received JSON:', parsed);

            if (parsed.setupComplete) {
              console.log('[Widget] Setup complete');
              state.callState = 'live';
              state.startTime = Date.now();
              updateUI();
              startTimer();
              startMicStreaming();

              // Send initial greeting
              if (!state.greetingSent) {
                const greeting = {
                  clientContent: {
                    turns: [{
                      role: 'user',
                      parts: [{ text: 'Hello! I need help using this design testing platform.' }]
                    }],
                    turnComplete: true
                  }
                };
                state.websocket.send(JSON.stringify(greeting));
                state.greetingSent = true;
              }
              return;
            }

            if (parsed.serverContent) {
              // Handle transcription
              if (parsed.serverContent.outputTranscription?.text) {
                state.transcript += parsed.serverContent.outputTranscription.text;
                updateTranscript();
              }
              if (parsed.serverContent.inputTranscription?.text) {
                state.transcript += parsed.serverContent.inputTranscription.text;
                updateTranscript();
              }

              // Handle audio response
              const modelTurn = parsed.serverContent.modelTurn;
              if (modelTurn && Array.isArray(modelTurn.parts)) {
                for (const part of modelTurn.parts) {
                  if (typeof part.text === 'string') {
                    console.log('[Widget] AI says:', part.text);
                    state.transcript += part.text;
                    updateTranscript();
                  }
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
                      console.error('[Widget] Error decoding audio:', err);
                    }
                  }
                }
              }
            }
            return;
          } catch {
            // JSON parse failed, continue to audio handling
          }
        }

        // Handle raw audio
        console.log('[Widget] Playing raw audio buffer');
        playAudioBuffer(ev.data);
      }

      async function playAudioBuffer(pcmBlob) {
        try {
          const arrayBuffer = await pcmBlob.arrayBuffer();
          const pcm16 = new Int16Array(arrayBuffer);
          const float32 = new Float32Array(pcm16.length);
          for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / 32768;
          }

          if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
          const audioCtx = state.audioContext;

          const buffer = audioCtx.createBuffer(1, float32.length, 24000);
          buffer.copyToChannel(float32, 0, 0);

          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);

          let startAt = audioCtx.currentTime;
          if (state.audioQueue > audioCtx.currentTime) {
            startAt = state.audioQueue;
          }
          source.start(startAt);
          state.audioQueue = startAt + buffer.duration;
        } catch (err) {
          console.error('[Widget] Audio playback error:', err);
        }
      }

      async function startMicStreaming() {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          state.microphoneStream = micStream;
          state.isMicrophoneActive = true;

          if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          }
          const audioCtx = state.audioContext;

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
                  mime_type: 'audio/pcm;rate=16000'
                }
              }
            };

            if (state.websocket?.readyState === WebSocket.OPEN) {
              state.websocket.send(JSON.stringify(payload));
            }
          };

          updateUI();
        } catch (err) {
          console.error('[Widget] Microphone error:', err);
          showToast('Microphone access denied');
        }
      }

      function endCall() {
        if (state.callState === 'idle') return;

        state.callState = 'ended';
        
        if (state.websocket) {
          state.websocket.close();
          state.websocket = null;
        }
        
        if (state.timer) {
          clearInterval(state.timer);
          state.timer = null;
        }

        if (state.microphoneStream) {
          state.microphoneStream.getTracks().forEach(track => track.stop());
          state.microphoneStream = null;
          state.isMicrophoneActive = false;
        }

        if (state.screenStream) {
          state.screenStream.getTracks().forEach(track => track.stop());
          state.screenStream = null;
          state.isScreenSharing = false;
        }

        if (state.audioContext) {
          state.audioContext.close().catch(() => {});
          state.audioContext = null;
          state.audioQueue = 0;
        }

        updateUI();
        showToast('Call ended');
        
        // Auto-minimize after 2 seconds
        setTimeout(() => {
          api.close();
          // Reset state for next call
          state.callState = 'idle';
          state.startTime = null;
          state.transcript = '';
          state.greetingSent = false;
          updateUI();
        }, 2000);
      }

      function startTimer() {
        state.timer = setInterval(() => {
          if (state.startTime) {
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }
        }, 1000);
      }

      function updateUI() {
        const isIdle = state.callState === 'idle';
        const isConnecting = state.callState === 'connecting';
        const isLive = state.callState === 'live';

        startCallBtn.style.display = (isIdle || isConnecting) ? 'block' : 'none';
        liveControls.style.display = isLive ? 'block' : 'none';
        transcriptArea.style.display = (isLive && state.transcript) ? 'block' : 'none';
        
        startCallBtn.disabled = !isIdle;
        if (isConnecting) {
          startCallText.textContent = 'Connecting...';
        } else {
          startCallText.textContent = 'Start Voice Chat';
        }

        if (isLive) {
          statusDot.classList.add('live');
          statusText.textContent = '🟢 Live call in progress';
        } else if (isConnecting) {
          statusDot.classList.add('live');
          statusText.textContent = '🔄 Connecting to AI...';
        } else {
          statusDot.classList.remove('live');
          statusText.textContent = 'Ready to help you with the platform';
        }

        // Update screen share UI
        if (state.isScreenSharing) {
          checkbox.classList.add('checked');
          checkIcon.style.display = 'block';
        } else {
          checkbox.classList.remove('checked');
          checkIcon.style.display = 'none';
        }
      }

      function updateTranscript() {
        if (state.transcript) {
          transcriptArea.textContent = state.transcript;
          transcriptArea.scrollTop = transcriptArea.scrollHeight;
          transcriptArea.style.display = 'block';
        }
      }

      async function checkScreenShareConsent() {
        const consentKey = `voicepilot_screen_consent_${agentId}`;
        const consent = localStorage.getItem(consentKey);
        
        if (consent) {
          const { timestamp } = JSON.parse(consent);
          const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000; // 24 hours
          if (isValid) return true;
        }

        return new Promise((resolve) => {
          const modal = document.createElement('div');
          modal.className = 'modal-overlay';
          modal.innerHTML = `
            <div class="modal">
              <h3>Screen Sharing Permission</h3>
              <p>Your screen image will be sent to our AI model for real-time help. No human can view this content.</p>
              <div class="modal-buttons">
                <button class="secondary-btn cancel-btn">Cancel</button>
                <button class="primary-btn continue-btn">Continue</button>
              </div>
            </div>
          `;

          const cancelBtn = modal.querySelector('.cancel-btn');
          const continueBtn = modal.querySelector('.continue-btn');

          cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.removeChild(modal);
            resolve(false);
          });

          continueBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            localStorage.setItem(consentKey, JSON.stringify({ timestamp: Date.now() }));
            container.removeChild(modal);
            resolve(true);
          });

          container.appendChild(modal);
        });
      }

      async function toggleScreenShare() {
        if (state.callState !== 'live') return;

        try {
          if (!state.isScreenSharing) {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { mediaSource: 'screen' }
            });
            
            state.screenStream = stream;
            state.isScreenSharing = true;
            
            // Handle stream end
            stream.getVideoTracks()[0].addEventListener('ended', () => {
              state.isScreenSharing = false;
              state.screenStream = null;
              updateUI();
            });
            
          } else {
            if (state.screenStream) {
              state.screenStream.getTracks().forEach(track => track.stop());
              state.screenStream = null;
            }
            state.isScreenSharing = false;
          }
          
          updateUI();
        } catch (error) {
          console.error('[Widget] Screen share error:', error);
          showToast('Screen sharing not available');
        }
      }

      function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            if (container.contains(toast)) {
              container.removeChild(toast);
            }
          }, 300);
        }, 2000);
      }

      container.appendChild(panel);
      
      return {
        element: panel,
        open() {
          panel.classList.add('open');
        },
        close() {
          panel.classList.remove('open');
        },
        startCall() {
          if (state.callState === 'idle') {
            startCall();
          }
        },
        endCall() {
          if (state.callState === 'live') {
            endCall();
          }
        }
      };
    }
  };

  // Main Widget Class
  class VoicePilotWidget {
    constructor(agentId, position = 'bottom-right', googleApiKey) {
      this.agentId = agentId;
      this.position = position;
      this.googleApiKey = googleApiKey;
      this.isOpen = false;
      this.panel = null;
      
      this.init();
    }

    init() {
      // Create shadow DOM container
      this.container = document.createElement('div');
      this.container.id = 'voicepilot-widget';
      
      const shadow = this.container.attachShadow({ mode: 'open' });
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = WIDGET_STYLES;
      shadow.appendChild(style);

      // Create FAB
      this.fab = document.createElement('button');
      this.fab.className = `fab position-${this.position}`;
      this.fab.setAttribute('aria-label', 'Open AI Assistant');
      this.fab.appendChild(ICONS.headset());
      
      this.fab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Widget] FAB clicked');
        this.toggle();
      });
      
      shadow.appendChild(this.fab);
      
      // Add to page
      document.body.appendChild(this.container);
      
      // Handle outside clicks and ESC key
      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.container.contains(e.target)) {
          this.close();
        }
      });
      
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    async toggle() {
      console.log('[Widget] Toggle called, isOpen:', this.isOpen);
      if (this.isOpen) {
        this.close();
      } else {
        await this.open();
      }
    }

    async open() {
      if (this.isOpen) return;
      
      console.log('[Widget] Opening panel');
      
      // Lazy load panel if not created
      if (!this.panel) {
        const shadow = this.container.shadowRoot;
        this.panel = WidgetPanelModule.create(shadow, this.agentId, this.position, {
          close: () => {
            console.log('[Widget] API close called');
            this.close();
          },
          startCall: () => this.panel?.startCall(),
          endCall: () => this.panel?.endCall()
        }, this.googleApiKey);
      }
      
      this.isOpen = true;
      this.panel.open();
    }

    close() {
      if (!this.isOpen) return;
      
      console.log('[Widget] Closing panel');
      this.isOpen = false;
      if (this.panel) {
        this.panel.close();
      }
    }

    startCall() {
      if (this.panel) {
        this.panel.startCall();
      }
    }

    endCall() {
      if (this.panel) {
        this.panel.endCall();
      }
    }

    setPulse(enabled) {
      if (enabled) {
        this.fab.classList.add('pulse');
      } else {
        this.fab.classList.remove('pulse');
      }
    }
  }

  // Auto-initialization
  function init() {
    const script = document.currentScript || 
      document.querySelector('script[src*="embed.js"]');
    
    if (!script) {
      console.error('VoicePilot: Could not find embed script tag');
      return;
    }

    const agentId = script.getAttribute('data-agent');
    const position = script.getAttribute('data-position') || 'bottom-right';
    const googleApiKey = script.getAttribute('data-google-api-key');

    if (!agentId) {
      console.error('VoicePilot: data-agent attribute is required');
      return;
    }

    console.log('[Widget] Initializing with agent:', agentId, 'position:', position);

    // Create widget instance
    const widget = new VoicePilotWidget(agentId, position, googleApiKey);

    // Expose global API
    window.voicepilot = {
      open: () => {
        console.log('[Widget] Global API open called');
        widget.open();
      },
      close: () => {
        console.log('[Widget] Global API close called');
        widget.close();
      },
      startCall: () => widget.startCall(),
      endCall: () => widget.endCall(),
      setPulse: (enabled) => widget.setPulse(enabled)
    };

    console.log('[Widget] Initialization complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();