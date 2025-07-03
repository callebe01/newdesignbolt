import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// 🔓 DISABLE JWT VERIFICATION - Allow unauthenticated calls from embedded widgets
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
    const { agentId } = await req.json();

    if (!agentId) {
      throw new Error("Agent ID is required");
    }

    console.log(`[Create-Conversation] Creating conversation record for agent ${agentId}`);

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

    // Create the conversation record
    const { data, error } = await supabase
      .from("agent_conversations")
      .insert({
        agent_id: agentId,
        status: "active",
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`[Create-Conversation] Database error:`, error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    console.log(`[Create-Conversation] Successfully created conversation ${data.id} for agent ${agentId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId: data.id,
        agentId: data.agent_id,
        startTime: data.start_time 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("[Create-Conversation] Error:", error);
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