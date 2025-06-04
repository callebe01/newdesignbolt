# newdesignbolt

A React + TypeScript project using Vite.

## Setup

1. Create a `.env` file in the project root. Add the following keys:

```
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_OPENAI_API_KEY=your-openai-api-key
```

`VITE_GOOGLE_API_KEY` enables the Gemini Live integration used for calls with AI and supports screen sharing capabilities.
`VITE_OPENAI_API_KEY` is used for transcript analysis via OpenAI.

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

This will launch Vite in development mode.

