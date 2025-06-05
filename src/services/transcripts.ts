import { supabase } from './supabase';

export interface AnalysisResult {
  id: string;
  transcription_ids: string[];
  summary: string;
  sentiment_scores: {
    positive: number;
    neutral: number;
    negative: number;
  };
  key_points: string[];
  recommendations: string[];
  created_at: string;
}

export async function getTranscripts(agentId: string) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function analyzeTranscripts(transcriptionIds: string[]): Promise<AnalysisResult> {
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error('No active session');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcripts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use the access token from the current session
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ transcriptionIds }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Analysis failed:\n\n${error.error}`);
  }

  return response.json();
}