const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Check if this is a WebSocket upgrade request
  const upgrade = req.headers.get("upgrade");
  if (upgrade !== "websocket") {
    return new Response("Expected WebSocket upgrade", {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_API_KEY environment variable not set");
      return new Response("Server configuration error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Extract query parameters from the original request
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Construct the Google API WebSocket URL with the API key
    const googleWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    // Add any additional query parameters from the original request
    const googleUrl = new URL(googleWsUrl);
    for (const [key, value] of searchParams.entries()) {
      if (key !== "key") { // Don't override our API key
        googleUrl.searchParams.set(key, value);
      }
    }

    console.log("[Gemini Proxy] Establishing WebSocket connection to Google API");

    // Create WebSocket connection to Google API
    const googleWs = new WebSocket(googleUrl.toString());
    
    // Upgrade the incoming request to WebSocket
    const { socket: clientWs, response } = Deno.upgradeWebSocket(req);

    // Set up message forwarding from client to Google API
    clientWs.onopen = () => {
      console.log("[Gemini Proxy] Client WebSocket connected");
    };

    clientWs.onmessage = (event) => {
      if (googleWs.readyState === WebSocket.OPEN) {
        console.log("[Gemini Proxy] Forwarding message from client to Google API");
        googleWs.send(event.data);
      } else {
        console.warn("[Gemini Proxy] Google WebSocket not ready, message dropped");
      }
    };

    clientWs.onclose = (event) => {
      console.log(`[Gemini Proxy] Client WebSocket closed: ${event.code} ${event.reason}`);
      if (googleWs.readyState === WebSocket.OPEN) {
        googleWs.close();
      }
    };

    clientWs.onerror = (event) => {
      console.error("[Gemini Proxy] Client WebSocket error:", event);
      if (googleWs.readyState === WebSocket.OPEN) {
        googleWs.close();
      }
    };

    // Set up message forwarding from Google API to client
    googleWs.onopen = () => {
      console.log("[Gemini Proxy] Google API WebSocket connected");
    };

    googleWs.onmessage = (event) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        console.log("[Gemini Proxy] Forwarding message from Google API to client");
        clientWs.send(event.data);
      } else {
        console.warn("[Gemini Proxy] Client WebSocket not ready, message dropped");
      }
    };

    googleWs.onclose = (event) => {
      console.log(`[Gemini Proxy] Google API WebSocket closed: ${event.code} ${event.reason}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(event.code, event.reason);
      }
    };

    googleWs.onerror = (event) => {
      console.error("[Gemini Proxy] Google API WebSocket error:", event);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, "Google API connection failed");
      }
    };

    return response;
  } catch (error) {
    console.error("[Gemini Proxy] Error setting up WebSocket proxy:", error);
    return new Response("Failed to establish WebSocket connection", {
      status: 500,
      headers: corsHeaders,
    });
  }
});