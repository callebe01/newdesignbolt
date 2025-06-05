// Add to existing types
export interface AnalysisResult {
  id: string;
  transcriptionIds: string[];
  summary: string;
  resolutionRate: {
    resolved: boolean;
    taskCompleted: boolean;
    description: string;
  };
  engagementScore: number;
  userIntent: {
    primary: string;
    secondary: string[];
  };
  workflowPatterns: string[];
  repetitiveQuestions: string[];
  featureRequests: string[];
  sentimentScores: Record<string, number>;
  keyPoints: string[];
  recommendations: string[];
  createdAt: string;
}