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
      z-index: 9999;
      pointer-events: none;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .fab {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--vc-primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      pointer-events: auto;
      color: white;
    }

    .fab:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .fab.pulse {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .panel {
      position: fixed;
      background: var(--vc-background);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      width: 350px;
      max-height: 500px;
      transform: translateY(100%);
      transition: transform 0.3s ease;
      pointer-events: auto;
      border: 1px solid var(--vc-border);
      overflow: hidden;
    }

    .panel.open {
      transform: translateY(0);
    }

    .panel-header {
      padding: 16px;
      border-bottom: 1px solid var(--vc-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .panel-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--vc-text);
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      color: var(--vc-muted);
    }

    .close-btn:hover {
      background: var(--vc-border);
    }

    .panel-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--vc-muted);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vc-muted);
    }

    .status-dot.live {
      background: var(--vc-success);
      animation: pulse 2s infinite;
    }

    .call-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .primary-btn {
      background: var(--vc-primary);
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .primary-btn:hover:not(:disabled) {
      background: #1D4ED8;
    }

    .primary-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .danger-btn {
      background: var(--vc-error);
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .danger-btn:hover {
      background: #B91C1C;
    }

    .timer {
      font-family: monospace;
      font-size: 18px;
      font-weight: 600;
      color: var(--vc-text);
      text-align: center;
      padding: 8px;
      background: var(--vc-border);
      border-radius: 6px;
    }

    .screen-share-control {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border: 1px solid var(--vc-border);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .screen-share-control:hover {
      background: var(--vc-border);
    }

    .checkbox {
      width: 16px;
      height: 16px;
      border: 2px solid var(--vc-primary);
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
    }

    .checkbox.checked {
      background: var(--vc-primary);
    }

    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal {
      background: var(--vc-background);
      border-radius: 8px;
      padding: 20px;
      max-width: 300px;
      text-align: center;
    }

    .modal h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--vc-text);
      margin-bottom: 12px;
    }

    .modal p {
      font-size: 14px;
      color: var(--vc-muted);
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .modal-buttons {
      display: flex;
      gap: 8px;
    }

    .secondary-btn {
      background: var(--vc-border);
      color: var(--vc-text);
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      flex: 1;
    }

    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--vc-text);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .toast.show {
      opacity: 1;
    }

    @media (max-width: 480px) {
      .panel {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        max-height: none;
      }
    }
  `;

  // SVG Icons
  const ICONS = {
    headset: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 11v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4a9 9 0 0 1 18 0h-1a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3"/>
      <path d="M19 14v2a2 2 0 0 1-2 2h-1"/>
    </svg>`,
    
    mic: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
      <line x1="8" x2="16" y1="22" y2="22"/>
    </svg>`,
    
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
    
    monitor: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect width="20" height="14" x="2" y="3" rx="2"/>
      <line x1="8" x2="16" y1="21" y2="21"/>
      <line x1="12" x2="12" y1="17" y2="21"/>
    </svg>`,
    
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <polyline points="20,6 9,17 4,12"/>
    </svg>`
  };

  // Widget Panel Module (inline)
  const WidgetPanelModule = {
    create(container, agentId, api) {
      let state = {
        callState: 'idle', // idle, live, ended
        isScreenSharing: false,
        startTime: null,
        timer: null,
        websocket: null
      };

      const panel = document.createElement('div');
      panel.className = 'panel';
      
      panel.innerHTML = `
        <div class="panel-header">
          <div class="panel-title">AI Assistant</div>
          <button class="close-btn" aria-label="Close panel">${ICONS.close}</button>
        </div>
        <div class="panel-content">
          <div class="status-indicator">
            <div class="status-dot"></div>
            <span class="status-text">Ready to help</span>
          </div>
          <div class="call-controls">
            <button class="primary-btn start-call-btn" aria-label="Start call">
              Start Call
            </button>
            <div class="live-controls" style="display: none;">
              <div class="timer">00:00</div>
              <div class="screen-share-control">
                <div class="checkbox">
                  <span class="check-icon" style="display: none;">${ICONS.check}</span>
                </div>
                <span>Share Screen</span>
                ${ICONS.monitor}
              </div>
              <button class="danger-btn end-call-btn" aria-label="End call">
                End Call
              </button>
            </div>
          </div>
        </div>
      `;

      // Event handlers
      const closeBtn = panel.querySelector('.close-btn');
      const startCallBtn = panel.querySelector('.start-call-btn');
      const endCallBtn = panel.querySelector('.end-call-btn');
      const screenShareControl = panel.querySelector('.screen-share-control');
      const statusDot = panel.querySelector('.status-dot');
      const statusText = panel.querySelector('.status-text');
      const timerEl = panel.querySelector('.timer');
      const liveControls = panel.querySelector('.live-controls');
      const checkbox = panel.querySelector('.checkbox');
      const checkIcon = panel.querySelector('.check-icon');

      closeBtn.addEventListener('click', () => api.close());

      startCallBtn.addEventListener('click', async () => {
        try {
          await startCall();
        } catch (error) {
          console.error('Failed to start call:', error);
          showToast('Failed to start call');
        }
      });

      endCallBtn.addEventListener('click', () => {
        endCall();
      });

      screenShareControl.addEventListener('click', async () => {
        if (!state.isScreenSharing) {
          const hasConsent = await checkScreenShareConsent();
          if (!hasConsent) return;
        }
        toggleScreenShare();
      });

      async function startCall() {
        if (state.callState !== 'idle') return;

        startCallBtn.disabled = true;
        startCallBtn.textContent = 'Connecting...';

        try {
          // Fetch stream endpoint
          const response = await fetch(`/agent/${agentId}/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) throw new Error('Failed to get stream URL');
          
          const { wsUrl } = await response.json();
          
          // Connect WebSocket
          state.websocket = new WebSocket(wsUrl);
          
          state.websocket.onopen = () => {
            state.callState = 'live';
            state.startTime = Date.now();
            updateUI();
            startTimer();
          };
          
          state.websocket.onclose = () => {
            if (state.callState === 'live') {
              endCall();
            }
          };
          
          state.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            endCall();
            showToast('Connection error');
          };

        } catch (error) {
          startCallBtn.disabled = false;
          startCallBtn.textContent = 'Start Call';
          throw error;
        }
      }

      function endCall() {
        if (state.callState !== 'live') return;

        state.callState = 'ended';
        
        if (state.websocket) {
          state.websocket.close();
          state.websocket = null;
        }
        
        if (state.timer) {
          clearInterval(state.timer);
          state.timer = null;
        }

        if (state.isScreenSharing) {
          // Stop screen sharing
          state.isScreenSharing = false;
        }

        updateUI();
        showToast('Call ended');
        
        // Auto-minimize after 2 seconds
        setTimeout(() => {
          api.close();
          // Reset state for next call
          state.callState = 'idle';
          state.startTime = null;
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
        const isLive = state.callState === 'live';

        startCallBtn.style.display = isIdle ? 'block' : 'none';
        liveControls.style.display = isLive ? 'block' : 'none';
        
        startCallBtn.disabled = !isIdle;
        startCallBtn.textContent = 'Start Call';

        if (isLive) {
          statusDot.classList.add('live');
          statusText.textContent = 'Live call in progress';
        } else {
          statusDot.classList.remove('live');
          statusText.textContent = 'Ready to help';
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

          cancelBtn.addEventListener('click', () => {
            panel.removeChild(modal);
            resolve(false);
          });

          continueBtn.addEventListener('click', () => {
            localStorage.setItem(consentKey, JSON.stringify({ timestamp: Date.now() }));
            panel.removeChild(modal);
            resolve(true);
          });

          panel.appendChild(modal);
        });
      }

      async function toggleScreenShare() {
        if (state.callState !== 'live') return;

        try {
          if (!state.isScreenSharing) {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { mediaSource: 'screen' }
            });
            
            state.isScreenSharing = true;
            
            // Handle stream end
            stream.getVideoTracks()[0].addEventListener('ended', () => {
              state.isScreenSharing = false;
              updateUI();
            });
            
          } else {
            state.isScreenSharing = false;
          }
          
          updateUI();
        } catch (error) {
          console.error('Screen share error:', error);
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
          setTimeout(() => container.removeChild(toast), 300);
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
    constructor(agentId, position = 'bottom-right') {
      this.agentId = agentId;
      this.position = position;
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
      this.fab.className = 'fab';
      this.fab.setAttribute('aria-label', 'Open AI Assistant');
      this.fab.innerHTML = ICONS.headset;
      
      this.fab.addEventListener('click', () => this.toggle());
      
      shadow.appendChild(this.fab);
      
      // Position the widget
      this.positionWidget();
      
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

    positionWidget() {
      const [vertical, horizontal] = this.position.split('-');
      
      this.container.style[vertical] = '20px';
      this.container.style[horizontal] = '20px';
      
      if (this.panel) {
        const panelEl = this.panel.element;
        panelEl.style[vertical] = '80px';
        panelEl.style[horizontal] = '0px';
      }
    }

    async toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        await this.open();
      }
    }

    async open() {
      if (this.isOpen) return;
      
      // Lazy load panel if not created
      if (!this.panel) {
        const shadow = this.container.shadowRoot;
        this.panel = WidgetPanelModule.create(shadow, this.agentId, {
          close: () => this.close(),
          startCall: () => this.panel?.startCall(),
          endCall: () => this.panel?.endCall()
        });
        
        this.positionWidget();
      }
      
      this.isOpen = true;
      this.panel.open();
    }

    close() {
      if (!this.isOpen) return;
      
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

    if (!agentId) {
      console.error('VoicePilot: data-agent attribute is required');
      return;
    }

    // Create widget instance
    const widget = new VoicePilotWidget(agentId, position);

    // Expose global API
    window.voicepilot = {
      open: () => widget.open(),
      close: () => widget.close(),
      startCall: () => widget.startCall(),
      endCall: () => widget.endCall(),
      setPulse: (enabled) => widget.setPulse(enabled)
    };
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();