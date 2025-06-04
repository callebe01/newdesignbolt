import { supabase } from './supabase';
import { generateAgentReport, AgentReport } from './openai';

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
): Promise<void> {
  if (!transcript.trim()) return;
  try {
    const report = await generateAgentReport(transcript);
    await saveAgentReport(agentId, report);
  } catch (err) {
    console.error('Failed to generate agent report:', err);
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
