// src/components/ChatWindow.tsx

import React from 'react';
import { useLiveCall } from "../context/LiveCallContext";

export const ChatWindow: React.FC = () => {
  const { chatMessages } = useLiveCall();

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '8px',
        maxHeight: '300px',
        overflowY: 'auto',
        backgroundColor: '#fafafa',
      }}
    >
      {chatMessages.map((msg, idx) => (
        <div
          key={idx}
          style={{
            margin: '4px 0',
            textAlign: msg.role === 'user' ? 'right' : 'left',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '16px',
              backgroundColor: msg.role === 'user' ? '#007aff' : '#e5e5ea',
              color: msg.role === 'user' ? 'white' : 'black',
              maxWidth: '70%',
              wordWrap: 'break-word',
            }}
          >
            {msg.text}
          </span>
        </div>
      ))}
    </div>
  );
};
