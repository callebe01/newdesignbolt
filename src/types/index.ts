export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  sessions: Session[];
}

export interface Session {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: 'scheduled' | 'active' | 'completed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  insights: SessionInsights;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionInsights {
  statements: UserStatement[];
  preferences: UserPreference[];
  frictions: UserFriction[];
  decisions: UserDecision[];
  hypothesis?: string;
}

export interface UserStatement {
  id: string;
  content: string;
  timestamp: Date;
}

export interface UserPreference {
  id: string;
  content: string;
  timestamp: Date;
}

export interface UserFriction {
  id: string;
  content: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface UserDecision {
  id: string;
  content: string;
  timestamp: Date;
}

export interface AnalysisResult {
  id: string;
  transcriptionIds: string[];
  summary: string;
  sentimentScores: Record<string, number>;
  keyPoints: string[];
  recommendations: string[];
  userIntent: Record<string, number>;
  workflowPatterns: string[];
  featureRequests: string[];
  resolutionRate: {
    resolved: number;
    unresolved: number;
  };
  engagementScore: number;
  repetitiveQuestions: string[];
  createdAt: string;
}

export type LiveCallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

export interface Agent {
  id: string;
  name: string;
  instructions: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}