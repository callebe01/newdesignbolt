import { supabase } from './supabase';
import { AnalysisResult } from '../types';

export interface Transcript {
  id: string;
  agentId: string;
  content: string;
  metadata: Record<string, unknown>;
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
  if (!content?.trim()) {
    console.warn('Empty transcript content, skipping save');
    return null;
  }

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
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required');
  }

  // Call OpenAI API through our Edge Function
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcripts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        transcriptionIds: transcripts.map(t => t.id),
        text: transcripts.map(t => t.content).join('\n\n')
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Analysis failed');
  }

  const result = await response.json();
  
  // Store the analysis result
  const { data: savedAnalysis, error: saveError } = await supabase
    .from('analysis_results')
    .insert({
      transcription_ids: transcripts.map(t => t.id),
      summary: result.summary,
      sentiment_scores: result.sentiment_scores,
      key_points: result.key_points,
      recommendations: result.recommendations,
      user_intent: result.user_intent,
      workflow_patterns: result.workflow_patterns,
      feature_requests: result.feature_requests,
      resolution_rate: result.resolution_rate,
      engagement_score: result.engagement_score,
      repetitive_questions: result.repetitive_questions || []
    })
    .select()
    .single();

  if (saveError) throw saveError;
  return savedAnalysis;
}

export async function getAnalysisResults(transcriptionIds: string[]): Promise<AnalysisResult[]> {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .overlaps('transcription_ids', transcriptionIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    transcriptionIds: row.transcription_ids,
    summary: row.summary,
    sentimentScores: row.sentiment_scores,
    keyPoints: row.key_points,
    recommendations: row.recommendations,
    userIntent: row.user_intent,
    workflowPatterns: row.workflow_patterns,
    featureRequests: row.feature_requests,
    resolutionRate: row.resolution_rate,
    engagementScore: row.engagement_score,
    repetitiveQuestions: row.repetitive_questions,
    createdAt: row.created_at
  }));
}