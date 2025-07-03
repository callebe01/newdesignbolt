import { supabase } from './supabase';
import { AnalysisResult } from '../types';

const env: any =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

export interface Transcript {
  id: string;
  agent_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getTranscripts(agentId: string) {
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Transcript[];
}

export async function saveTranscript(agentId: string, content: string, fromUnload = false) {
  if (!content?.trim()) {
    console.warn('Empty transcript content, skipping save');
    return null;
  }

  try {
    console.log('Saving transcript for agent:', agentId);
    console.log('Content length:', content.trim().length);

    // Get the current session to access the access token
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    // Use the Edge Function to save the transcript
    const response = await fetch(
      `${env.VITE_SUPABASE_URL}/functions/v1/save-transcript-record`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          agentId,
          content: content.trim()
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save transcript');
    }

    const result = await response.json();
    console.log('Transcript saved successfully:', result.transcriptId);
    return result;
  } catch (err: any) {
    const message = err?.message || JSON.stringify(err);
    console.error('Failed to save transcript:', message);
    console.error('Full error object:', err);
    throw new Error(`Save transcript failed: ${message}`);
  }
}

export async function saveTranscriptBeacon(agentId: string, content: string) {
  // Use the same Edge Function approach for beacon saves
  return saveTranscript(agentId, content, true);
}

export async function analyzeTranscripts(transcripts: any[]): Promise<AnalysisResult> {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required');
  }

  if (!transcripts || transcripts.length === 0) {
    throw new Error('No transcripts provided for analysis');
  }

  // Call OpenAI API through our Edge Function
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/analyze-transcripts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        transcriptionIds: transcripts.map(t => t.id),
        text: transcripts.map(t => t.content).join('\n\n---\n\n')
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Analysis failed');
  }

  const result = await response.json();
  
  // Return the saved analysis result directly from the edge function
  return {
    id: result.id,
    transcriptionIds: result.transcription_ids,
    summary: result.summary,
    sentimentScores: result.sentiment_scores || {},
    keyPoints: result.key_points || [],
    recommendations: result.recommendations || [],
    userIntent: result.user_intent || {},
    workflowPatterns: result.workflow_patterns || [],
    featureRequests: result.feature_requests || [],
    resolutionRate: result.resolution_rate || { resolved: 0, unresolved: 0 },
    engagementScore: result.engagement_score || 0,
    repetitiveQuestions: result.repetitive_questions || [],
    conversationOutcomes: result.conversation_outcomes,
    commonExitPoints: result.common_exit_points,
    createdAt: result.created_at
  };
}

export async function getAnalysisResults(transcriptionIds: string[]): Promise<AnalysisResult[]> {
  if (!transcriptionIds || transcriptionIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .overlaps('transcription_ids', transcriptionIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching analysis results:', error);
      throw error;
    }

    return (data || []).map(row => ({
      id: row.id,
      transcriptionIds: row.transcription_ids || [],
      summary: row.summary || '',
      sentimentScores: row.sentiment_scores || {},
      keyPoints: row.key_points || [],
      recommendations: row.recommendations || [],
      userIntent: row.user_intent || {},
      workflowPatterns: row.workflow_patterns || [],
      featureRequests: row.feature_requests || [],
      resolutionRate: row.resolution_rate || { resolved: 0, unresolved: 0 },
      engagementScore: row.engagement_score || 0,
      repetitiveQuestions: row.repetitive_questions || [],
      conversationOutcomes: row.conversation_outcomes,
      commonExitPoints: row.common_exit_points,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch analysis results:', err);
    return [];
  }
}