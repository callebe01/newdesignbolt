//--------------------------------------------------------------
//  relay – Voice Pilot WebSocket proxy  (Supabase Edge Function)
//--------------------------------------------------------------

// 🔓  PUBLIC FUNCTION  –  disables Supabase's JWT check
// Using multiple methods to ensure JWT verification is disabled
export const config = { 
  verify_jwt: false,
  cors: true,
  auth: false
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Additional JWT bypass - handle requests without authentication
const handler = (req: Request) => {
  // Add CORS headers for preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  /* 1️⃣  Only accept Upgrade requests */
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { 
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }

  /* 2️⃣  Browser ⇄ Relay socket */
  const { socket: browser, response } = Deno.upgradeWebSocket(req);

  /* 3️⃣  Load API key (GOOGLE_API_KEY preferred, fallback GEMINI_API_KEY) */
  const KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!KEY) {
    console.error("[Relay] No GOOGLE_API_KEY or GEMINI_API_KEY set");
    browser.close(1011, "Server mis-config");
    return new Response("Server mis-config", { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }

  /* 4️⃣  Relay ⇄ Gemini socket */
  const geminiURL =
    "wss://generativelanguage.googleapis.com/ws/" +
    "google.ai.generativelanguage.v1beta.GenerativeService." +
    "BidiGenerateContent?key=" +
    encodeURIComponent(KEY);

  const gemini = new WebSocket(geminiURL);

  /* 5️⃣  Pipe traffic both ways */
  browser.onmessage = (e) => {
    if (gemini.readyState === 1) {
      try {
        gemini.send(e.data);
      } catch (error) {
        console.error("[Relay] Error sending to Gemini:", error);
      }
    }
  };
  
  gemini.onmessage = (e) => {
    if (browser.readyState === 1) {
      try {
        browser.send(e.data);
      } catch (error) {
        console.error("[Relay] Error sending to browser:", error);
      }
    }
  };

  /* 6️⃣  Symmetric close / error handling */
  const closeBoth = (code = 1000, reason = "") => {
    try { 
      if (browser.readyState < 2) {
        browser.close(code, reason); 
      }
    } catch (error) {
      console.error("[Relay] Error closing browser socket:", error);
    }
    try { 
      if (gemini.readyState < 2) {
        gemini.close(code, reason);  
      }
    } catch (error) {
      console.error("[Relay] Error closing Gemini socket:", error);
    }
  };

  browser.onerror = (error) => {
    console.error("[Relay] Browser socket error:", error);
    closeBoth(1011, "Browser error");
  };
  
  gemini.onerror = (error) => {
    console.error("[Relay] Gemini socket error:", error);
    closeBoth(1011, "Gemini error");
  };
  
  browser.onclose = (e) => {
    console.log("[Relay] Browser socket closed:", e.code, e.reason);
    closeBoth(e.code, e.reason);
  };
  
  gemini.onclose = (e) => {
    console.log("[Relay] Gemini socket closed:", e.code, e.reason);
  };

  browser.onopen = () => {
    console.log("[Relay] Browser WebSocket connection established");
  };

  gemini.onopen = () => {
    console.log("[Relay] Gemini WebSocket connection established");
  };

  /* 7️⃣  Handshake successful – return 101 Switching Protocols */
  return response;
};

// Serve without JWT verification
serve(handler);