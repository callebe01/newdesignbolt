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

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { conversationId, duration, sentimentScore } = await req.json();

    if (!conversationId) {
      throw new Error("Conversation ID is required");
    }

    if (typeof duration !== 'number' || duration < 0) {
      throw new Error("Valid duration is required");
    }

    console.log(`[End-Conversation] Processing conversation ${conversationId} with duration ${duration}s`);

    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update the conversation record
    const { data, error } = await supabase
      .from("agent_conversations")
      .update({
        status: "completed",
        end_time: new Date().toISOString(),
        duration: duration,
        sentiment_score: sentimentScore || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .select()
      .single();

    if (error) {
      console.error(`[End-Conversation] Database error:`, error);
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    if (!data) {
      throw new Error("Conversation not found or could not be updated");
    }

    console.log(`[End-Conversation] Successfully updated conversation ${conversationId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId: data.id,
        status: data.status,
        duration: data.duration 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("[End-Conversation] Error:", error);
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