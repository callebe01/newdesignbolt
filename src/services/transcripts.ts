import { supabase } from './supabase';

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
