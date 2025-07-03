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
    const { agentId, content } = await req.json();

    if (!agentId) {
      throw new Error("Agent ID is required");
    }

    if (!content || !content.trim()) {
      throw new Error("Transcript content is required");
    }

    console.log(`[Save-Transcript] Saving transcript for agent ${agentId}, content length: ${content.trim().length}`);

    // Use service role key to bypass RLS and ensure the operation succeeds
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the agent exists
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      throw new Error("Agent not found");
    }

    // Save the transcript
    const { data, error } = await supabase
      .from("transcriptions")
      .insert({
        agent_id: agentId,
        content: content.trim(),
        metadata: {
          saved_at: new Date().toISOString(),
          length: content.trim().length,
          source: "edge_function"
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`[Save-Transcript] Database error:`, error);
      throw new Error(`Failed to save transcript: ${error.message}`);
    }

    console.log(`[Save-Transcript] Successfully saved transcript ${data.id} for agent ${agentId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcriptId: data.id,
        agentId: data.agent_id,
        contentLength: data.content.length 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("[Save-Transcript] Error:", error);
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