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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      throw new Error("Unauthorized");
    }

    const { transcriptionIds, count = 5 } = await req.json();

    // Fetch transcriptions
    const { data: transcriptions, error: transcriptError } = await supabase
      .from("transcriptions")
      .select("content")
      .in("id", transcriptionIds)
      .limit(count)
      .order("created_at", { ascending: false });

    if (transcriptError) throw transcriptError;

    // Analyze with OpenAI
    const combinedText = transcriptions.map(t => t.content).join("\n\n");
    
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: "Analyze these conversation transcripts and provide: summary, sentiment scores, key points, and recommendations."
        }, {
          role: "user",
          content: combinedText
        }],
        response_format: { type: "json_object" }
      })
    });

    if (!openAIResponse.ok) {
      throw new Error("OpenAI API error");
    }

    const analysis = await openAIResponse.json();

    // Store analysis results
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("analysis_results")
      .insert({
        transcription_ids: transcriptionIds,
        summary: analysis.summary,
        sentiment_scores: analysis.sentiment,
        key_points: analysis.key_points,
        recommendations: analysis.recommendations
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify(savedAnalysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});