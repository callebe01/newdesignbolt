# newdesignbolt

A React + TypeScript project using Vite.

## Setup

1. Create a `.env` file in the project root. Add the following keys:

```
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_SUPABASE_URL=https://ljfidzppyflrrszkgusa.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

`VITE_GOOGLE_API_KEY` enables the Gemini Live integration used for calls with AI and supports screen sharing capabilities.
`VITE_OPENAI_API_KEY` is used for transcript analysis via OpenAI.
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` connect the app to your Supabase backend for persistence.

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

This will launch Vite in development mode.

## Transcript Analysis

When ending a call, the app saves the transcript and analyzes it. If the
transcript is empty, analysis is skipped and you'll see a message
"No transcript recorded—skipping analysis." The app then returns to the Agents
list.

