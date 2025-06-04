export interface AnalysisResult {
  statements: string[];
  preferences: string[];
  frictions: { content: string; severity: 'low' | 'medium' | 'high' }[];
  decisions: string[];
  hypothesis: string;
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
  } catch (err) {
    throw new Error('Failed to parse OpenAI response');
  }
}
