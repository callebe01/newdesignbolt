export interface AnalysisResult {
  statements: string[];
  preferences: string[];
  frictions: { content: string; severity: 'low' | 'medium' | 'high' }[];
  decisions: string[];
  hypothesis: string;
}

export interface AgentReport {
  summary: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  frictionQuotes: string[];
  recommendedActions: string[];
}

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

async function callOpenAI(messages: { role: string; content: string }[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0,
      // Ensure the response is valid JSON
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI request failed: ${text}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || '';
}

export async function analyzeTranscript(text: string): Promise<AnalysisResult> {
  const prompt = `You are a UX research assistant. Analyze the following user testing transcript and output JSON with keys statements (array of strings), preferences (array of strings), frictions (array of {content, severity}), decisions (array of strings) and hypothesis (string). Use severity levels low, medium or high.`;
  const content = `${prompt}\n\nTRANSCRIPT:\n${text}`;
  const raw = await callOpenAI([{ role: 'user', content }]);
  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    throw new Error('Failed to parse OpenAI response');
  }
}

export async function generateAgentReport(text: string): Promise<AgentReport> {
  const prompt = `You are a UX research assistant summarizing an agent conversation. ` +
    `Return JSON with keys summary (string), sentimentBreakdown (object with positive, neutral, and negative percentages as numbers), ` +
    `frictionQuotes (array of the most notable user quotes demonstrating friction) and ` +
    `recommendedActions (array of short actionable items).`;
  const content = `${prompt}\n\nTRANSCRIPT:\n${text}`;
  const raw = await callOpenAI([{ role: 'user', content }]);
  try {
    return JSON.parse(raw) as AgentReport;
  } catch {
    throw new Error('Failed to parse OpenAI response');
  }
}
