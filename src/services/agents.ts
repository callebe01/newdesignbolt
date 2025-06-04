import { Agent } from '../types';

const AGENTS: Agent[] = [
  {
    id: 'acme',
    name: 'Acme Corp',
    systemInstruction: 'You are the virtual research agent for Acme Corp.',
  },
  {
    id: 'globex',
    name: 'Globex Industries',
    systemInstruction: 'You represent Globex Industries during user calls.',
  },
];

export async function getAgentById(id: string): Promise<Agent | null> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return AGENTS.find((a) => a.id === id) || null;
}
