import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// 🔓 DISABLE JWT VERIFICATION - Allow unauthenticated calls from embedded widgets
export const config = { verify_jwt: false };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');

    if (!agentId) {
      throw new Error("agentId query parameter is required");
    }

    console.log(`[Get-Agent-Tools] Fetching tools for agent ${agentId}`);

    // Use service role key to bypass RLS and ensure the operation succeeds
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the agent exists and is active
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, status")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      throw new Error("Agent not found");
    }

    if (agent.status !== 'active') {
      throw new Error("Agent is not active");
    }

    // Fetch the agent's tools
    const { data: tools, error: toolsError } = await supabase
      .from("agent_tools")
      .select("name, endpoint, method, api_key")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true });

    if (toolsError) {
      console.error(`[Get-Agent-Tools] Database error:`, toolsError);
      throw new Error(`Failed to fetch agent tools: ${toolsError.message}`);
    }

    // Format tools for the widget
    const formattedTools = (tools || []).map(tool => ({
      name: tool.name,
      endpoint: tool.endpoint,
      method: tool.method,
      ...(tool.api_key && { apiKey: tool.api_key })
    }));

    console.log(`[Get-Agent-Tools] Found ${formattedTools.length} tools for agent ${agentId}`);

    return new Response(
      JSON.stringify({ 
        tools: formattedTools
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("[Get-Agent-Tools] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
});