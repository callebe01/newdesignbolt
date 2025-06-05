import { supabase } from './supabase';

export interface Transcript {
  id: string;
  agentId: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AnalysisResult {
  id: string;
  transcriptionIds: string[];
  summary: string;
  sentimentScores: Record<string, number>;
  keyPoints: string[];
  recommendations: string[];
  createdAt: string;
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

export async function saveTranscript(agentId: string, content: string) {
  const { data, error } = await supabase
    .from('transcriptions')
    .insert([
      {
        agent_id: agentId,
        content: content,
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function analyzeTranscripts(
  transcriptionIds: string[], 
  accessToken: string
): Promise<AnalysisResult> {
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  console.log('Analyzing transcripts with token:', accessToken.substring(0, 10) + '...');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcripts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ 
        transcriptionIds,
        count: 5 // Analyze last 5 transcripts
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Analysis failed: ${error.error}`);
  }

  const result = await response.json();
  console.log('Analysis result:', result);
  return result;
}

export async function getAnalysisResults(transcriptionIds: string[]): Promise<AnalysisResult[]> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .contains('transcription_ids', transcriptionIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    transcriptionIds: row.transcription_ids,
    summary: row.summary,
    sentimentScores: row.sentiment_scores,
    keyPoints: row.key_points,
    recommendations: row.recommendations,
    createdAt: row.created_at
  }));
}