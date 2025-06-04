export interface AnalysisResult {
  statements: string[];
  preferences: string[];
  frictions: { content: string; severity: 'low' | 'medium' | 'high' }[];
  decisions: string[];
  hypothesis: string;
}

export interface AgentReport {
  summary: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  frictionQuotes: string[];
  recommendedActions: string[];
}

export async function analyzeTranscript(text: string): Promise<AnalysisResult> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcript`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to analyze transcript');
  }

  return response.json();
}

export async function generateAgentReport(text: string): Promise<AgentReport> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate report');
  }

  return response.json();
}