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
      console.error("[Gemini Proxy] GOOGLE_API_KEY environment variable not set");
      return new Response("Server configuration error: GOOGLE_API_KEY not configured", {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log("[Gemini Proxy] API key found, setting up WebSocket proxy");

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

    // Upgrade the incoming request to WebSocket first
    const { socket: clientWs, response } = Deno.upgradeWebSocket(req);
    
    let googleWs: WebSocket | null = null;
    let connectionEstablished = false;

    // Set up client WebSocket handlers
    clientWs.onopen = () => {
      console.log("[Gemini Proxy] Client WebSocket connected, connecting to Google API");
      
      try {
        // Create WebSocket connection to Google API after client connects
        googleWs = new WebSocket(googleUrl.toString());
        
        googleWs.onopen = () => {
          console.log("[Gemini Proxy] Google API WebSocket connected successfully");
          connectionEstablished = true;
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
      } catch (error) {
        console.error("[Gemini Proxy] Error creating Google WebSocket:", error);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1011, "Failed to connect to Google API");
        }
      }
    };

    clientWs.onmessage = (event) => {
      if (googleWs && googleWs.readyState === WebSocket.OPEN) {
        console.log("[Gemini Proxy] Forwarding message from client to Google API");
        googleWs.send(event.data);
      } else {
        console.warn("[Gemini Proxy] Google WebSocket not ready, message dropped");
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1011, "Google API not connected");
        }
      }
    };

    clientWs.onclose = (event) => {
      console.log(`[Gemini Proxy] Client WebSocket closed: ${event.code} ${event.reason}`);
      if (googleWs && googleWs.readyState === WebSocket.OPEN) {
        googleWs.close();
      }
    };

    clientWs.onerror = (event) => {
      console.error("[Gemini Proxy] Client WebSocket error:", event);
      if (googleWs && googleWs.readyState === WebSocket.OPEN) {
        googleWs.close();
      }
    };

    return response;
  } catch (error) {
    console.error("[Gemini Proxy] Error setting up WebSocket proxy:", error);
    return new Response(`Failed to establish WebSocket connection: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});