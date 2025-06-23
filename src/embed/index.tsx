import React from 'react';
import { createRoot } from 'react-dom/client';
import { AgentWidget } from '../components/widget/AgentWidget';
import { LiveCallProvider } from '../context/LiveCallContext';
import { AgentProvider } from '../context/AgentContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export interface EmbedOptions {
  agent: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  googleApiKey?: string;
}

function mount(options: EmbedOptions) {
  const { agent, position = 'bottom-right', googleApiKey } = options;
  if (!agent) return null;

  if (googleApiKey) {
    (window as any).voicepilotGoogleApiKey = googleApiKey;
  }

  const container = document.createElement('div');
  container.id = 'voicepilot-widget';
  container.style.position = 'fixed';
  container.style.zIndex = '9999';
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

  let api: any = null;

  const root = createRoot(container);
  root.render(
    <ThemeProvider>
      <AuthProvider>
        <AgentProvider>
          <LiveCallProvider>
            <AgentWidget
              agentId={agent}
              initialOpen={false}
              exposeApi={(a) => {
                api = a;
              }}
            />
          </LiveCallProvider>
        </AgentProvider>
      </AuthProvider>
    </ThemeProvider>
  );

  return {
    open: () => api?.open(),
    close: () => api?.close(),
    startCall: () => api?.startCall(),
    endCall: () => api?.endCall(),
    setPulse: (enabled: boolean) => {
      if (enabled) {
        container.classList.add('animate-pulse');
      } else {
        container.classList.remove('animate-pulse');
      }
    }
  };
}

export { mount };

// Auto-mount when included directly via <script src="/embed.js">
if (typeof document !== 'undefined') {
  const cur = document.currentScript as HTMLScriptElement | null;
  if (cur && !(window as any).voicepilot) {
    const agent = cur.getAttribute('data-agent');
    const position = (cur.getAttribute('data-position') || undefined) as any;
    const key = cur.getAttribute('data-google-api-key') || undefined;
    if (agent) {
      (window as any).voicepilot = mount({
        agent,
        position,
        googleApiKey: key
      });
    }
  }
}
