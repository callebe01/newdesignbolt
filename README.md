# newdesignbolt

A React + TypeScript project using Vite.

## Setup

1. Create a `.env` file in the project root. Add the following keys:

```
VITE_OPENAI_API_KEY=your-openai-api-key
VITE_SUPABASE_URL=https://ljfidzppyflrrszkgusa.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

`VITE_OPENAI_API_KEY` is used for transcript analysis via OpenAI.
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` connect the app to your Supabase backend for persistence.

2. Create a `supabase/.env` file with the following format for deploying Edge Functions:

```
SUPABASE_URL=https://ljfidzppyflrrszkgusa.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-google-api-key
```

The `GOOGLE_API_KEY` is required for the `gemini-proxy` Edge Function to communicate with Google's Gemini Live API.

Pass this file when deploying Edge Functions:

```bash
supabase functions deploy analyze-transcripts --env-file ./supabase/.env
supabase functions deploy gemini-proxy --env-file ./supabase/.env
```

`SUPABASE_SERVICE_ROLE_KEY` is required so functions can write results back to Supabase. If this variable is omitted, analysis output will not be saved.

If either variable is missing or incorrect, functions will return a **401 Unauthorized** error.

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

## Troubleshooting

If you end a call and see an alert that the transcript wasn't saved, check that
your Supabase credentials are correct and that your network connection is
stable. The application surfaces the detailed error from Supabase to help you
identify the issue.

## Object Detection

This project can highlight detected objects on your screen share using Gemini Live. Enable screen sharing and click **Show Boxes** in the session controls. Each captured frame is sent to Gemini Live for object detection and red bounding boxes appear over the shared video. Toggle **Hide Boxes** to disable the overlay.

### DOM element highlights

When the agent's response mentions text that matches a visible label on the page,
the corresponding element is briefly outlined. You can optionally tag elements
with `data-agent-id` attributes to make matching more reliable.

## Embedding the Widget

You can embed the VoicePilot widget on any website. Include the script from the
`public` directory and configure it with data attributes:

```html
<script
  src="/embed.js"
  data-agent="YOUR_AGENT_ID"
  data-position="bottom-right"
  async
></script>
```

The script automatically mounts the widget and exposes a `window.voicepilot`
object with `open()`, `close()`, `startCall()`, `endCall()`, and `setPulse()`
methods so you can control it programmatically.

**Note**: The Google API key is now handled securely on the server-side through the `gemini-proxy` Edge Function. You no longer need to provide a `data-google-api-key` attribute when embedding the widget.