import { supabase } from './supabase';

export async function runToolCall(agentId: string, name: string, args: any) {
  try {
    console.log('[ToolCall] Running tool:', name, 'with args:', args);

    // Fetch the tool configuration including API key
    const { data: tools, error } = await supabase
      .from('agent_tools')
      .select('*')
      .eq('agent_id', agentId);

    if (error) {
      console.error('[ToolCall] Error fetching tools:', error);
      throw new Error('Failed to fetch tool configuration');
    }

    const tool = tools?.find(t => t.name === name);
    if (!tool) {
      console.error('[ToolCall] Tool not found:', name);
      throw new Error(`Tool '${name}' not found`);
    }

    console.log('[ToolCall] Found tool configuration:', {
      name: tool.name,
      endpoint: tool.endpoint,
      method: tool.method,
      hasApiKey: !!tool.api_key
    });

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'VoicePilot-Agent/1.0'
    };

    // Add Authorization header if API key is provided
    if (tool.api_key) {
      headers['Authorization'] = `Bearer ${tool.api_key}`;
      console.log('[ToolCall] Added Authorization header with Bearer token');
    }

    // Make the API call
    const response = await fetch(tool.endpoint, {
      method: tool.method,
      headers,
      body: tool.method !== 'GET' ? JSON.stringify(args) : undefined
    });

    if (!response.ok) {
      console.error('[ToolCall] API call failed:', response.status, response.statusText);
      
      // Provide more specific error messages for common auth issues
      if (response.status === 401) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}. Check if the API key is valid.`);
      } else if (response.status === 403) {
        throw new Error(`Access forbidden: ${response.status} ${response.statusText}. Check API key permissions.`);
      } else {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
    }

    const result = await response.json();
    console.log('[ToolCall] Tool call successful:', result);
    
    return result;
  } catch (error) {
    console.error('[ToolCall] Tool call error:', error);
    throw error;
  }
}