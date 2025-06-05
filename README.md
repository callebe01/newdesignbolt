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

For Supabase Edge Functions such as `analyze-transcripts`, these values must also be available when deploying. Create a `supabase/.env` file containing `SUPABASE_URL` and `SUPABASE_ANON_KEY` and pass it when you deploy:

```bash
supabase functions deploy --env-file ./supabase/.env
```

If either variable is missing or incorrect the `analyze-transcripts` function will return an **Unauthorized** error.


2. Initialize the Supabase schema:

```bash
# Install the Supabase CLI if you don't have it
npm install -g supabase

# Apply migrations from supabase/migrations
supabase db push
```

This will create required tables such as `transcriptions` and `analysis_results`.

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

This will launch Vite in development mode.

## Manual Testing

To verify the `analyze-transcripts` function rejects unauthorized requests, run:

```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"transcriptionIds":[1]}' \
  "$VITE_SUPABASE_URL/functions/v1/analyze-transcripts"
```

The response should be `401 Unauthorized`.

Sending a request with an invalid token should also return `401`:

```bash
curl -i -X POST \
  -H "Authorization: Bearer invalid" \
  -H "Content-Type: application/json" \
  -d '{"transcriptionIds":[1]}' \
  "$VITE_SUPABASE_URL/functions/v1/analyze-transcripts"
```

