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

export async function saveTranscript(agentId: string, content: string, fromUnload = false) {
  if (!content?.trim()) {
    console.warn('Empty transcript content, skipping save');
    return null;
  }

  try {
    // Use direct fetch to Supabase REST API to bypass RLS session requirements
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/transcriptions`;
    const body = JSON.stringify({
      agent_id: agentId,
      content: content.trim(),
      metadata: {
        saved_at: new Date().toISOString(),
        length: content.trim().length,
        anonymous: true
      }
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    };

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body
    };

    // Add keepalive for unload scenarios
    if (fromUnload) {
      fetchOptions.keepalive = true;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Transcript saved successfully:', data[0]?.id);
    return data[0];
  } catch (err: any) {
    const message = err?.message || JSON.stringify(err);
    console.error('Failed to save transcript:', message);
    throw new Error(`Save transcript failed: ${message}`);
  }
}

export async function saveTranscriptBeacon(agentId: string, content: string) {
  // Use the same function with fromUnload flag
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
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcripts`,
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
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch analysis results:', err);
    return [];
  }
}