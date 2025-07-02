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
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

function mount(options: EmbedOptions) {
  const { agent, position = 'bottom-right', supabaseUrl, supabaseAnonKey } = options;
  if (!agent) return null;

  // Set global Supabase configuration if provided
  if (supabaseUrl) {
    (window as any).voicepilotSupabaseUrl = supabaseUrl;
  }
  if (supabaseAnonKey) {
    (window as any).voicepilotSupabaseKey = supabaseAnonKey;
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

  if (!document.getElementById('voicepilot-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'voicepilot-highlight-style';
    style.textContent = `.agent-highlight {\n  outline: 3px solid #f00;\n  box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.6);\n  transition: outline-color 0.2s;\n}`;
    document.head.appendChild(style);
  }

  if (typeof (window as any).highlightTextMatch === 'undefined') {
    (window as any).highlightTextMatch = (message: string) => {
      if (!message) return;
      const lower = message.toLowerCase();
      const candidates = Array.from(
        document.querySelectorAll('[data-agent-id],button,a,[role="button"],input')
      );
      for (const el of candidates) {
        const label = (
          el.getAttribute('data-agent-id') ||
          el.getAttribute('aria-label') ||
          (el as HTMLElement).innerText ||
          ''
        ).trim();
        if (label && label.length > 2 && lower.includes(label.toLowerCase())) {
          el.classList.add('agent-highlight');
          setTimeout(() => el.classList.remove('agent-highlight'), 3000);
          break;
        }
      }
    };
  }

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
    const supabaseUrl = cur.getAttribute('data-supabase-url') || undefined;
    const supabaseAnonKey = cur.getAttribute('data-supabase-anon-key') || undefined;
    if (agent) {
      (window as any).voicepilot = mount({
        agent,
        position,
        supabaseUrl,
        supabaseAnonKey
      });
    }
  }
}