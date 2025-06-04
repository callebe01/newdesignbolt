// src/pages/sessions/LiveSession.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SessionControls } from '../../components/session/SessionControls';
import { SessionInsightsPanel } from '../../components/session/SessionInsightsPanel';
import { AIAgentStatus } from '../../components/session/AIAgentStatus';
import { useSession } from '../../context/SessionContext';
import { useLiveCall } from '../../context/LiveCallContext';
import { useProjects } from '../../context/ProjectContext';
import { Session } from '../../types';

// Temporary agent instruction; in the future this may come from agent configuration
const agentSystemInstruction =
  'You are roleplaying a real person testing a new interface while talking to a designer.';

export const LiveSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { endSession } = useSession();
  const { status, startCall, errorMessage } = useLiveCall();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ◀︎ This ref ensures we only ever call startCall() one time
  const didStartRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    // 1) Find the session object by ID across all projects
    let foundSession: Session | null = null;
    for (const project of projects) {
      const sess = project.sessions.find((s) => s.id === sessionId);
      if (sess) {
        foundSession = sess;
        break;
      }
    }
    setSession(foundSession);
    setLoading(false);

    // 2) If the session is active AND we have never called startCall(), do it now:
    if (
      foundSession &&
      foundSession.status === 'active' &&
      !didStartRef.current
    ) {
      didStartRef.current = true;
      startCall(agentSystemInstruction).catch((err) =>
        console.error('startCall() error:', err)
      );
    }
  }, [sessionId, projects, startCall]); // No “status” here

  const handleEndSession = async () => {
    await endSession();
    navigate(`/projects/${session?.projectId}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse-subtle text-lg">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>Session not found</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const project = projects.find((p) => p.id === session.projectId);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
          LIVE SESSION
        </div>
        <h1 className="text-2xl font-bold mt-2">
          {session.name} {project ? `• ${project.name}` : ''}
        </h1>
      </div>

      {/* Main grid: Insights on left, Controls on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Real-time Insights */}
        <div className="lg:col-span-2">
          <SessionInsightsPanel liveSession={true} />
        </div>

        {/* Right: Controls */}
        <div className="space-y-6">
          <div>
            <SessionControls onEndSession={handleEndSession} />

            {errorMessage && (
              <div className="mt-6 bg-destructive/10 text-destructive p-4 rounded-md">
                <p className="font-medium">Error</p>
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              Status: <span className="font-semibold">{status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agent Status Footer */}
      <div className="mt-8">
        <AIAgentStatus isActive={status === 'active'} />
      </div>
    </div>
  );
};
