import React from 'react';
import { Bot } from 'lucide-react';

interface AIAgentStatusProps {
  isActive?: boolean;
}

export const AIAgentStatus: React.FC<AIAgentStatusProps> = ({ isActive = true }) => {
  return (
    <div className="rounded-full bg-white shadow-lg p-4 flex flex-col items-center fixed bottom-8 right-8 transform translate-y-0 transition-all duration-300">
      <div className="relative">
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isActive ? 'bg-success' : 'bg-muted'}`}></div>
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
          <Bot className="h-8 w-8 text-accent" />
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-semibold">AI AGENT</p>
        <p className="text-xs text-muted-foreground">
          {isActive ? 'Active listening' : 'Connecting...'}
        </p>
      </div>
    </div>
  );
};