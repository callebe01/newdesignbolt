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

export async function analyzeTranscripts(transcripts: any[]): Promise<AnalysisResult> {
  // Combine all transcript content
  const combinedContent = transcripts
    .map(t => t.content)
    .join('\n\n');

  // Call OpenAI API through our Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcripts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
      },
      body: JSON.stringify({ 
        text: combinedContent,
        transcriptionIds: transcripts.map(t => t.id)
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Analysis failed');
  }

  return response.json();
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