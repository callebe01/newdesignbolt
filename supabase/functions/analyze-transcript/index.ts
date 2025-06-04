
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface AnalysisResult {
  summary: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  frictionQuotes: string[];
  recommendedActions: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();

    if (!transcript) {
      throw new Error("Transcript is required");
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `You are a UX research assistant summarizing an agent conversation. ` +
      `Return JSON with keys summary (string), sentimentBreakdown (object with positive, neutral, and negative percentages as numbers), ` +
      `frictionQuotes (array of the most notable user quotes demonstrating friction) and ` +
      `recommendedActions (array of short actionable items).`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: transcript }
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content) as AnalysisResult;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});