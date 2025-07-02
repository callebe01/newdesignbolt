import React, { useEffect } from 'react';

interface EmbeddedWidgetProps {
  agentId: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const EmbeddedWidget: React.FC<EmbeddedWidgetProps> = ({ 
  agentId, 
  position = 'bottom-right'
}) => {
  useEffect(() => {
    // Create script element
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.setAttribute('data-agent', agentId);
    script.setAttribute('data-position', position);
    script.async = true;

    // Add to document
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove the widget
      const widget = document.getElementById('voicepilot-widget');
      if (widget) {
        widget.remove();
      }
      
      // Remove the script
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      // Clean up global API
      if (window.voicepilot) {
        delete window.voicepilot;
      }
    };
  }, [agentId, position]);

  return null; // This component doesn't render anything visible
};

// Extend window interface for TypeScript
declare global {
  interface Window {
    voicepilot?: {
      open: () => void;
      close: () => void;
      startCall: () => void;
      endCall: () => void;
      setPulse: (enabled: boolean) => void;
    };
  }
}