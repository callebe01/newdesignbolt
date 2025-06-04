import React, { createContext, useContext, useState } from 'react';
import { Session, SessionInsights, UserStatement, UserPreference, UserFriction, UserDecision } from '../types';
import { useProjects } from './ProjectContext';
import { supabase } from '../services/supabase';

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
  const { currentProject: _currentProject } = useProjects();
  void _currentProject;
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
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          project_id: projectId,
          name,
          description,
          status: 'active',
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: Session = {
        id: data.id,
        projectId: data.project_id,
        name: data.name,
        description: data.description,
        status: data.status,
        startTime: new Date(data.start_time),
        insights: {
          statements: [],
          preferences: [],
          frictions: [],
          decisions: [],
        },
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setCurrentSession(newSession);
      setSessionActive(true);
      setInsights(newSession.insights);
      setSessionDuration(0);

      const interval = window.setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval as unknown as number);

      return newSession;
    } catch (err) {
      console.error('Failed to start session:', err);
      throw new Error('Failed to start session');
    }
  };

  const endSession = async (): Promise<void> => {
    if (!currentSession) return;

    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          duration: sessionDuration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      // Save insights
      for (const statement of insights.statements) {
        await supabase.from('session_insights').insert({
          session_id: currentSession.id,
          type: 'statement',
          content: statement.content,
          timestamp: statement.timestamp.toISOString(),
        });
      }

      for (const preference of insights.preferences) {
        await supabase.from('session_insights').insert({
          session_id: currentSession.id,
          type: 'preference',
          content: preference.content,
          timestamp: preference.timestamp.toISOString(),
        });
      }

      for (const friction of insights.frictions) {
        await supabase.from('session_insights').insert({
          session_id: currentSession.id,
          type: 'friction',
          content: friction.content,
          severity: friction.severity,
          timestamp: friction.timestamp.toISOString(),
        });
      }

      for (const decision of insights.decisions) {
        await supabase.from('session_insights').insert({
          session_id: currentSession.id,
          type: 'decision',
          content: decision.content,
          timestamp: decision.timestamp.toISOString(),
        });
      }

      setCurrentSession(null);
      setSessionActive(false);
      setSessionDuration(0);
      setInsights({
        statements: [],
        preferences: [],
        frictions: [],
        decisions: [],
      });
    } catch (err) {
      console.error('Failed to end session:', err);
      throw new Error('Failed to end session');
    }
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