import React, { createContext, useContext, useState } from 'react';
import { Session, SessionInsights, UserStatement, UserPreference, UserFriction, UserDecision } from '../types';
import { useProjects } from './ProjectContext';

interface SessionContextType {
  currentSession: Session | null;
  sessionActive: boolean;
  sessionDuration: number;
  insights: SessionInsights;
  startSession: (projectId: string, name: string, description?: string) => Promise<Session>;
  endSession: () => Promise<void>;
  updateSessionInsights: (insights: Partial<SessionInsights>) => void;
  addUserStatement: (content: string) => void;
  addUserPreference: (content: string) => void;
  addUserFriction: (content: string, severity: 'low' | 'medium' | 'high') => void;
  addUserDecision: (content: string) => void;
  setHypothesis: (hypothesis: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { updateProject, projects } = useProjects();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [insights, setInsights] = useState<SessionInsights>({
    statements: [],
    preferences: [],
    frictions: [],
    decisions: [],
  });
  const [timerInterval, setTimerInterval] = useState<number | null>(null);

  const startSession = async (projectId: string, name: string, description?: string): Promise<Session> => {
    // Find the project
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Create a new session
    const newSession: Session = {
      id: Date.now().toString(),
      projectId,
      name,
      description,
      status: 'active',
      startTime: new Date(),
      insights: {
        statements: [],
        preferences: [],
        frictions: [],
        decisions: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update the project with the new session
    const updatedSessions = [...project.sessions, newSession];
    await updateProject(projectId, { sessions: updatedSessions });

    // Set the current session
    setCurrentSession(newSession);
    setSessionActive(true);
    setInsights(newSession.insights);
    setSessionDuration(0);

    // Start the timer
    const interval = window.setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval as unknown as number);

    return newSession;
  };

  const endSession = async (): Promise<void> => {
    if (!currentSession) return;

    // Clear the timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    // Update session status
    const updatedSession: Session = {
      ...currentSession,
      status: 'completed',
      endTime: new Date(),
      duration: sessionDuration,
      insights,
      updatedAt: new Date(),
    };

    // Find the project
    const project = projects.find(p => p.id === currentSession.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Update the project's sessions
    const updatedSessions = project.sessions.map(session => 
      session.id === currentSession.id ? updatedSession : session
    );
    await updateProject(project.id, { sessions: updatedSessions });

    // Reset state
    setCurrentSession(null);
    setSessionActive(false);
    setSessionDuration(0);
    setInsights({
      statements: [],
      preferences: [],
      frictions: [],
      decisions: [],
    });
  };

  const updateSessionInsights = (newInsights: Partial<SessionInsights>) => {
    setInsights(prev => ({ ...prev, ...newInsights }));
  };

  const addUserStatement = (content: string) => {
    const newStatement: UserStatement = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
    };
    setInsights(prev => ({
      ...prev,
      statements: [...prev.statements, newStatement],
    }));
  };

  const addUserPreference = (content: string) => {
    const newPreference: UserPreference = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
    };
    setInsights(prev => ({
      ...prev,
      preferences: [...prev.preferences, newPreference],
    }));
  };

  const addUserFriction = (content: string, severity: 'low' | 'medium' | 'high') => {
    const newFriction: UserFriction = {
      id: Date.now().toString(),
      content,
      severity,
      timestamp: new Date(),
    };
    setInsights(prev => ({
      ...prev,
      frictions: [...prev.frictions, newFriction],
    }));
  };

  const addUserDecision = (content: string) => {
    const newDecision: UserDecision = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
    };
    setInsights(prev => ({
      ...prev,
      decisions: [...prev.decisions, newDecision],
    }));
  };

  const setHypothesis = (hypothesis: string) => {
    setInsights(prev => ({
      ...prev,
      hypothesis,
    }));
  };

  return (
    <SessionContext.Provider
      value={{
        currentSession,
        sessionActive,
        sessionDuration,
        insights,
        startSession,
        endSession,
        updateSessionInsights,
        addUserStatement,
        addUserPreference,
        addUserFriction,
        addUserDecision,
        setHypothesis,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
};