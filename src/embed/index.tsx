import React from 'react';
import { createRoot } from 'react-dom/client';
import { AgentWidget } from '../components/widget/AgentWidget';
import { LiveCallProvider } from '../context/LiveCallContext';
import { AgentProvider } from '../context/AgentProvider';
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

  const container = document.getElementById('voicepilot-widget-root') || document.createElement('div');
  if (!container.id) {
    container.id = 'voicepilot-widget-root';
    document.body.appendChild(container);
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

// Auto-mount when included directly via <script src="/embed-widget.js">
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