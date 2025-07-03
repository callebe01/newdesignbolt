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
    const { conversationId, content } = await req.json();

    if (!conversationId) {
      throw new Error("Conversation ID is required");
    }

    if (!content || !content.trim()) {
      console.log(`[Save-Messages] No content provided for conversation ${conversationId}, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: "No content to save" }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    console.log(`[Save-Messages] Saving messages for conversation ${conversationId}, content length: ${content.trim().length}`);

    // Use service role key to bypass RLS and ensure the operation succeeds
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the conversation exists
    const { data: conversation, error: conversationError } = await supabase
      .from("agent_conversations")
      .select("id")
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation) {
      throw new Error("Conversation not found");
    }

    // Save the entire transcript as a single message
    // In the future, this could be enhanced to parse individual messages
    const { data, error } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        role: "user", // For now, save as user message since it's the full transcript
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error(`[Save-Messages] Database error:`, error);
      throw new Error(`Failed to save conversation messages: ${error.message}`);
    }

    console.log(`[Save-Messages] Successfully saved message ${data.id} for conversation ${conversationId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: data.id,
        conversationId: data.conversation_id,
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
    console.error("[Save-Messages] Error:", error);
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