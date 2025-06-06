import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, estimatedDuration = 5 } = await req.json();

    if (!agentId) {
      throw new Error("Agent ID is required");
    }

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
        duration_minutes: estimatedDuration
      }
    );

    if (checkError) {
      console.error("Error checking user permissions:", checkError);
      throw new Error("Failed to check usage permissions");
    }

    return new Response(
      JSON.stringify({
        canUse: canUse,
        ownerId: agent.user_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check agent usage error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});