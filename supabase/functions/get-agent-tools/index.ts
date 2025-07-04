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
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { 
        status: 405, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId');

    if (!agentId) {
      throw new Error("Agent ID is required");
    }

    console.log(`[Get-Agent-Tools] Fetching tools for agent ${agentId}`);

    // Initialize Supabase client inside try block to catch any initialization errors
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      apiKey: tool.api_key
    }));

    console.log(`[Get-Agent-Tools] Successfully fetched ${formattedTools.length} tools for agent ${agentId}`);

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
    
    // Ensure we always return a valid JSON response
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
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