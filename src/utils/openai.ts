import OpenAI from 'openai';
import { SessionInsights, UserFriction } from '../types';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey,
  // in browser environment this flag is required
  dangerouslyAllowBrowser: true,
});

export const analyzeTranscriptWithOpenAI = async (
  transcript: string
): Promise<Partial<SessionInsights>> => {
  const prompt = `Analyze the following usability testing transcript and summarize key insights as JSON with the following structure:\n` +
    `{ "hypothesis": string, "statements": string[], "preferences": string[], "frictions": {"content": string, "severity": "low"|"medium"|"high"}[], "decisions": string[] }.` +
    `\nTranscript:\n"""\n${transcript}\n"""`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a UX researcher extracting insights.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(content) as Partial<SessionInsights>;
  } catch {
    console.error('[openai] Failed to parse response:', content);
    return {};
  }
};
