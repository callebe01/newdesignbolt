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
          content: `You are a conversation analyst. Analyze the provided transcripts and return a JSON object with:
            - summary (brief overview)
            - sentimentScores (object with positive/negative/neutral as percentages 0-100)
            - keyPoints (array of main takeaways)
            - recommendations (array of actionable insights)
            - userIntent (object categorizing user intents like onboarding, troubleshooting, feature discovery)
            - workflowPatterns (array of identified workflow patterns and bottlenecks)
            - uxIssues (array of UX issues mentioned)
            - featureRequests (array of feature requests or suggestions)
            - conversationOutcomes (object with detailed outcome analysis):
              - satisfiedUsers (number of users who seemed satisfied)
              - usersWithQuestions (number of users who still had questions)
              - totalUsers (total number of users analyzed)
              - outcomeDescription (string describing overall outcomes)
            - commonExitPoints (object with exit point analysis):
              - primaryExitPoint (string describing the most common exit point)
              - exitPatterns (array of common exit patterns)
              - dropOffReasons (array of reasons users typically drop off)
            - resolutionRate (object with resolved and unresolved percentages 0-100)
            - engagementScore (number from 0-100 indicating user engagement level)
            - repetitiveQuestions (array of questions that came up multiple times)
            
            Focus on extracting actionable insights and patterns. For conversation outcomes, analyze the tone and completion of each conversation to determine satisfaction levels.`
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

    // Validate analysis structure
    if (
      typeof analysis.sentimentScores !== 'object' || 
      !Array.isArray(analysis.keyPoints) || 
      !Array.isArray(analysis.recommendations) ||
      typeof analysis.userIntent !== 'object' ||
      !Array.isArray(analysis.workflowPatterns) ||
      !Array.isArray(analysis.featureRequests) ||
      typeof analysis.resolutionRate !== 'object' ||
      typeof analysis.engagementScore !== 'number' ||
      typeof analysis.conversationOutcomes !== 'object' ||
      typeof analysis.commonExitPoints !== 'object'
    ) {
      throw new Error("Invalid analysis format");
    }

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
        sentiment_scores: analysis.sentimentScores,
        key_points: analysis.keyPoints,
        recommendations: analysis.recommendations,
        user_intent: analysis.userIntent,
        workflow_patterns: analysis.workflowPatterns,
        feature_requests: analysis.featureRequests,
        resolution_rate: analysis.resolutionRate,
        engagement_score: analysis.engagementScore,
        repetitive_questions: analysis.repetitiveQuestions || [],
        conversation_outcomes: analysis.conversationOutcomes,
        common_exit_points: analysis.commonExitPoints
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