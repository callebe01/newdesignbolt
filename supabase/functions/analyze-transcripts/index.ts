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
    // Verify authentication and initialize Supabase client with the user token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { transcriptionIds, count = 5 } = await req.json();

    if (!Array.isArray(transcriptionIds) || transcriptionIds.length === 0) {
      throw new Error("transcriptionIds must be a non-empty array");
    }

    // Fetch transcriptions
    const { data: transcriptions, error: transcriptError } = await supabase
      .from("transcriptions")
      .select("content")
      .in("id", transcriptionIds)
      .limit(count)
      .order("created_at", { ascending: false });

    if (transcriptError) throw transcriptError;
    if (!transcriptions?.length) {
      throw new Error("No transcripts found for those IDs");
    }

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
          content: "You are a UX research assistant. Analyze these transcripts and return a JSON object with the following structure: { summary: string, sentiment: { positive: number, neutral: number, negative: number }, key_points: string[], recommendations: string[] }. Include the word 'json' in your analysis to ensure proper formatting."
        }, {
          role: "user",
          content: `Please analyze these transcripts and provide a json response:\n\n${combinedText}`
        }],
        response_format: { type: "json_object" }
      })
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const openAIData = await openAIResponse.json();
    const result = JSON.parse(openAIData.choices[0].message.content);

    // Store analysis results
    const { data: savedAnalysis, error: saveError } = await supabase
      .from("analysis_results")
      .insert({
        transcription_ids: transcriptionIds,
        summary: result.summary,
        sentiment_scores: result.sentiment,
        key_points: result.key_points,
        recommendations: result.recommendations
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify(savedAnalysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analyze transcripts error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});