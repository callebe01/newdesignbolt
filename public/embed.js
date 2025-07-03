(function() {
  'use strict';

  // Get configuration from script tag
  const currentScript = document.currentScript || document.querySelector('script[data-agent]');
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

  // Widget state
  let isCallActive = false;
  let widget = null;

  // Create widget
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'voicepilot-widget';
    container.style.cssText = `
      position: fixed;
      ${getPositionStyles(position)}
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    container.innerHTML = `
      <div style="
        background: #f3f4f6;
        border-radius: 24px;
        padding: 12px 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
      " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        <span id="widget-text" style="
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        ">Talk to me</span>
      </div>
    `;

    document.body.appendChild(container);
    return container;
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

  function updateWidgetState(callActive) {
    isCallActive = callActive;
    const textElement = widget?.querySelector('#widget-text');
    if (textElement) {
      textElement.textContent = callActive ? 'End call' : 'Talk to me';
    }
  }

  function handleWidgetClick() {
    if (isCallActive) {
      // End call logic here
      updateWidgetState(false);
      console.log('Ending call...');
    } else {
      // Start call logic here
      updateWidgetState(true);
      console.log('Starting call...');
    }
  }

  // Initialize widget
  widget = createWidget();
  widget.addEventListener('click', handleWidgetClick);

  // Expose API
  window.voicepilot = {
    open: () => {
      if (widget) widget.style.display = 'block';
    },
    close: () => {
      if (widget) widget.style.display = 'none';
    },
    startCall: () => {
      updateWidgetState(true);
    },
    endCall: () => {
      updateWidgetState(false);
    },
    setPulse: (enabled) => {
      if (widget) {
        widget.style.animation = enabled ? 'pulse 2s infinite' : 'none';
      }
    }
  };

  // Add CSS for pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);

})();