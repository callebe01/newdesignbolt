import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { text, transcriptionIds } = await req.json();

    if (!text?.trim()) {
      throw new Error("Text content is required");
    }

    if (!Array.isArray(transcriptionIds)) {
      throw new Error("transcriptionIds must be an array");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: `You are a conversation analyst specialized in UX research. Analyze the provided transcripts and return a JSON object with:
            - summary: Brief overview of the conversation
            - resolutionRate: Object containing { resolved: boolean, taskCompleted: boolean, description: string }
            - engagementScore: Number between 0-100 based on conversation length and user responses
            - userIntent: Object with { primary: string, secondary: string[] } categorizing the purpose (e.g., onboarding, troubleshooting)
            - workflowPatterns: Array of identified user workflows with any bottlenecks
            - repetitiveQuestions: Array of questions that suggest UX issues
            - featureRequests: Array of user suggestions or feature requests
            - sentimentScores: Object with positive/negative/neutral percentages
            - keyPoints: Array of main takeaways
            - recommendations: Array of actionable insights`
        }, {
          role: "user",
          content: text
        }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // Store the analysis result
    const { createClient } = await import("npm:@supabase/supabase-js@2.39.3");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: savedAnalysis, error: saveError } = await supabase
      .from("analysis_results")
      .insert({
        transcription_ids: transcriptionIds,
        summary: analysis.summary,
        resolution_rate: analysis.resolutionRate,
        engagement_score: analysis.engagementScore,
        user_intent: analysis.userIntent,
        workflow_patterns: analysis.workflowPatterns,
        repetitive_questions: analysis.repetitiveQuestions,
        feature_requests: analysis.featureRequests,
        sentiment_scores: analysis.sentimentScores,
        key_points: analysis.keyPoints,
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
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});