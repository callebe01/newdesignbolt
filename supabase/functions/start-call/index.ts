import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

export const config = { verify_jwt: false };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { agentId, instructions, documentationUrls } = await req.json();

    // Optional: Reuse existing usage check logic for authenticated agent owners
    if (agentId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Get the agent and its owner
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("user_id, status")
        .eq("id", agentId)
        .single();

      if (agentError || !agent) {
        throw new Error("Agent not found");
      }

      if (agent.status !== 'active') {
        throw new Error("Agent is not active");
      }

      // Check if the agent owner can perform the action
      const { data: canUse, error: checkError } = await supabase.rpc(
        "can_user_perform_action",
        {
          user_uuid: agent.user_id,
          action_type: "start_call",
          duration_minutes: 5 // Estimate 5 minutes for the check
        }
      );

      if (checkError) {
        console.error("Error checking user permissions:", checkError);
        throw new Error("Failed to check usage permissions");
      }

      if (!canUse) {
        throw new Error("Usage limit exceeded. Please upgrade your plan to continue.");
      }

      // Fetch agent tools for this agent
      const { data: tools, error: toolsError } = await supabase
        .from('agent_tools')
        .select('name, description, parameters')
        .eq('agent_id', agentId);

      if (toolsError) {
        console.error("Error fetching agent tools:", toolsError);
      }

      // Create tool declarations for Gemini Live API
      const toolDeclarations = (tools || []).map(t => ({
        functionDeclarations: [{
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }]
      }));

      console.log(`[Start-Call] Found ${tools?.length || 0} tools for agent ${agentId}`);

      // Store tools info in a way that can be accessed by the relay
      // For now, we'll pass this through the WebSocket setup
      if (tools && tools.length > 0) {
        console.log("[Start-Call] Agent has custom tools:", tools.map(t => t.name));
      }
    }

    // Verify that the API key is configured on the server
    const apiKey = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("API key not configured on server");
    }

    // Build the relay URL without passing the API key as a query parameter
    // The relay function will access the API key directly from environment variables
    const url = new URL(req.url);
    
    // Check x-forwarded-proto header to determine if the original request was HTTPS
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const isSecure = forwardedProto === 'https' || url.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss:' : 'ws:';
    
    // Remove the API key from the relay URL since it will be accessed from environment variables
    const relayUrl = `${wsProtocol}//${url.host}/functions/v1/relay`;

    console.log("[Start-Call] Returning relay URL:", relayUrl);

    return new Response(
      JSON.stringify({ relayUrl }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Start call error:", error);
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