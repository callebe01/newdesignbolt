import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // 1️⃣ Check for WebSocket upgrade
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 400 });
  }

  // 2️⃣ Create WebSocket pair for browser ⇄ relay communication
  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  // 3️⃣ Get Google API key from environment
  const GEMINI_KEY = Deno.env.get("GOOGLE_API_KEY");
  if (!GEMINI_KEY) {
    console.error("GOOGLE_API_KEY not found in environment");
    return new Response("Server configuration error", { status: 500 });
  }

  // 4️⃣ Build Gemini WebSocket URL
  const geminiUrl = 
    `wss://generativelanguage.googleapis.com/ws/` +
    `google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_KEY}`;

  let geminiSocket: WebSocket | null = null;

  // 5️⃣ Handle client socket events
  clientSocket.onopen = () => {
    console.log("[Relay] Client connected, establishing Gemini connection...");
    
    // Connect to Gemini when client connects
    geminiSocket = new WebSocket(geminiUrl);
    
    // 6️⃣ Pipe Gemini messages to client
    geminiSocket.onmessage = (event) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(event.data);
      }
    };

    geminiSocket.onopen = () => {
      console.log("[Relay] Gemini connection established");
    };

    geminiSocket.onclose = (event) => {
      console.log(`[Relay] Gemini connection closed: ${event.code} ${event.reason}`);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(event.code, event.reason);
      }
    };

    geminiSocket.onerror = (error) => {
      console.error("[Relay] Gemini connection error:", error);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1011, "Gemini connection error");
      }
    };
  };

  // 7️⃣ Pipe client messages to Gemini
  clientSocket.onmessage = (event) => {
    if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.send(event.data);
    }
  };

  // 8️⃣ Handle client disconnect
  clientSocket.onclose = (event) => {
    console.log(`[Relay] Client disconnected: ${event.code} ${event.reason}`);
    if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.close(event.code, event.reason);
    }
  };

  clientSocket.onerror = (error) => {
    console.error("[Relay] Client connection error:", error);
    if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.close(1011, "Client connection error");
    }
  };

  return response;
});