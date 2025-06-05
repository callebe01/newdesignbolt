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

export async function saveTranscript(agentId: string, content: string, metadata: Record<string, unknown> = {}) {
  if (!content.trim()) return;

  try {
    const { data, error } = await supabase
      .from('transcriptions')
      .insert({
        agent_id: agentId,
        content,
        metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to save transcription:', err);
    throw err;
  }
}

export async function getAgentTranscripts(agentId: string): Promise<Transcript[]> {
  try {
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch transcriptions:', err);
    throw err;
  }
}

export async function analyzeTranscripts(
  transcriptionIds: string[],
  accessToken: string
): Promise<AnalysisResult> {
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcripts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcriptionIds })
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze transcripts (${response.status})`);
  }

  return response.json();
}

export async function getAnalysisResults(transcriptionIds: string[]): Promise<AnalysisResult[]> {
  try {
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
  } catch (err) {
    console.error('Failed to fetch analysis results:', err);
    throw err;
  }
}