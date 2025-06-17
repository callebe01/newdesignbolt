# newdesignbolt

A React + TypeScript project using Vite.

This project is tested with **Node.js 18**. Using a different Node version may
lead to unexpected issues during deployment.

## Setup

0. Ensure you are running **Node.js 18**.

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

2. Create a `supabase/.env` file with the following format for deploying Edge Functions such as `analyze-transcripts`:

```
SUPABASE_URL=https://ljfidzppyflrrszkgusa.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Pass this file when deploying:

```bash
supabase functions deploy analyze-transcripts --env-file ./supabase/.env
```

`SUPABASE_SERVICE_ROLE_KEY` is required so the function can write results back to Supabase. If this variable is omitted, analysis output will not be saved.

If either variable is missing or incorrect, `analyze-transcripts` will return a **401 Unauthorized** error.

3. Initialize the Supabase schema:

```bash
# Install the Supabase CLI if you don't have it
npm install -g supabase

# Apply migrations from supabase/migrations
supabase db push
```

This will create required tables such as `transcriptions` and `analysis_results`.

4. Install dependencies:

```bash
npm install
```

5. Start the development server:

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

## Troubleshooting

If you end a call and see an alert that the transcript wasn't saved, check that
your Supabase credentials are correct and that your network connection is
stable. The application surfaces the detailed error from Supabase to help you
identify the issue.

