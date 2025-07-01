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
    // Close browser connection immediately with proper error code
    browser.onopen = () => {
      browser.close(1011, "Server configuration error: Missing API key");
    };
    return response;
  }

  /* 4️⃣  Relay ⇄ Gemini socket */
  const geminiURL =
    "wss://generativelanguage.googleapis.com/ws/" +
    "google.ai.generativelanguage.v1beta.GenerativeService." +
    "BidiGenerateContent?key=" +
    encodeURIComponent(KEY);

  let gemini: WebSocket | null = null;
  let geminiConnected = false;
  let browserConnected = false;

  /* 5️⃣  Handle browser connection */
  browser.onopen = () => {
    console.log("[Relay] Browser WebSocket connection established");
    browserConnected = true;
    
    // Now try to connect to Gemini
    try {
      gemini = new WebSocket(geminiURL);
      
      gemini.onopen = () => {
        console.log("[Relay] Gemini WebSocket connection established");
        geminiConnected = true;
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
      
      gemini.onerror = (error) => {
        console.error("[Relay] Gemini socket error:", error);
        if (browser.readyState === 1) {
          browser.close(1011, "Failed to connect to AI service");
        }
      };
      
      gemini.onclose = (e) => {
        console.log("[Relay] Gemini socket closed:", e.code, e.reason);
        geminiConnected = false;
        if (browser.readyState === 1) {
          browser.close(e.code, e.reason || "AI service disconnected");
        }
      };
      
    } catch (error) {
      console.error("[Relay] Failed to create Gemini WebSocket:", error);
      if (browser.readyState === 1) {
        browser.close(1011, "Failed to initialize AI connection");
      }
    }
  };

  /* 6️⃣  Handle browser messages */
  browser.onmessage = (e) => {
    if (gemini && gemini.readyState === 1) {
      try {
        gemini.send(e.data);
      } catch (error) {
        console.error("[Relay] Error sending to Gemini:", error);
        if (browser.readyState === 1) {
          browser.close(1011, "Failed to send message to AI service");
        }
      }
    } else {
      console.warn("[Relay] Received message but Gemini not connected");
    }
  };

  /* 7️⃣  Handle browser errors and close */
  browser.onerror = (error) => {
    console.error("[Relay] Browser socket error:", error);
    browserConnected = false;
    if (gemini && gemini.readyState < 2) {
      try {
        gemini.close(1011, "Browser error");
      } catch (e) {
        console.error("[Relay] Error closing Gemini socket:", e);
      }
    }
  };
  
  browser.onclose = (e) => {
    console.log("[Relay] Browser socket closed:", e.code, e.reason);
    browserConnected = false;
    if (gemini && gemini.readyState < 2) {
      try {
        // Use sanitized close code for Gemini
        let geminiCloseCode = e.code;
        if (geminiCloseCode !== 1000 && (geminiCloseCode < 3000 || geminiCloseCode > 4999)) {
          geminiCloseCode = 1011;
        }
        gemini.close(geminiCloseCode, e.reason);
      } catch (error) {
        console.error("[Relay] Error closing Gemini socket:", error);
      }
    }
  };

  /* 8️⃣  Handshake successful – return 101 Switching Protocols */
  return response;
};

// Serve without JWT verification
serve(handler);