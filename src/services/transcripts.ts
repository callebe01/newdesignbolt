import { supabase } from './supabase';
import { AgentReport } from './openai';

export interface Transcript {
  id: string;
  agentId: string;
  content: string;
  createdAt: string;
}

export async function saveTranscript(agentId: string, content: string) {
  if (!content.trim()) return;
  try {
    await supabase.from('transcripts').insert({
      agent_id: agentId,
      content,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save transcript:', err);
  }
}

export async function saveAgentReport(agentId: string, report: AgentReport) {
  try {
    await supabase.from('agent_reports').insert({
      agent_id: agentId,
      report,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to save agent report:', err);
  }
}

export async function generateAndSaveReport(
  agentId: string,
  transcript: string
): Promise<Error | boolean> {
  if (!transcript.trim()) return false;
  
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-transcript`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const report = await response.json();
    await saveAgentReport(agentId, report);
    return true;
  } catch (err) {
    console.error('Failed to generate agent report:', err);
    return err instanceof Error ? err : new Error(String(err));
  }
}

export async function getAgentReports(agentId: string): Promise<AgentReport[]> {
  try {
    const { data, error } = await supabase
      .from('agent_reports')
      .select('report')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: Record<string, unknown>) => row.report as AgentReport);
  } catch (err) {
    console.error('Failed to fetch agent reports:', err);
    return [];
  }
}

export async function getAgentTranscripts(agentId: string): Promise<Transcript[]> {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      content: row.content,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch transcripts:', err);
    return [];
  }
}