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

  /* 2️⃣  Extract API key from URL query parameters */
  const url = new URL(req.url);
  const KEY = url.searchParams.get("apikey");
  
  if (!KEY) {
    console.error("[Relay] No API key provided in query parameters");
    return new Response("Missing API key in query parameters", { 
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }

  console.log("[Relay] Using API key from query parameters");

  /* 3️⃣  Browser ⇄ Relay socket */
  const { socket: browser, response } = Deno.upgradeWebSocket(req);

  /* 4️⃣  Relay ⇄ Gemini socket */
  const geminiURL =
    "wss://generativelanguage.googleapis.com/ws/" +
    "google.ai.generativelanguage.v1beta.GenerativeService." +
    "BidiGenerateContent?key=" +
    encodeURIComponent(KEY);

  console.log("[Relay] Dialling Gemini:", geminiURL);
  const gemini = new WebSocket(geminiURL);

  // ✅ IMPROVED: Track connection states and prevent double-close
  let browserClosed = false;
  let geminiClosed = false;

  /* 5️⃣  Pipe traffic both ways */
  browser.onmessage = (e) => {
    if (gemini.readyState === WebSocket.OPEN && !geminiClosed) {
      try {
        gemini.send(e.data);
      } catch (error) {
        console.error("[Relay] Error sending to Gemini:", error);
      }
    }
  };
  
  gemini.onmessage = (e) => {
    if (browser.readyState === WebSocket.OPEN && !browserClosed) {
      try {
        browser.send(e.data);
      } catch (error) {
        console.error("[Relay] Error sending to browser:", error);
      }
    }
  };

  /* 6️⃣  IMPROVED: Sanitize close codes and prevent double-close */
  const sanitizeCloseCode = (code: number): number => {
    // Ensure close code is in valid range (1000-4999)
    if (code < 1000 || code > 4999) {
      console.warn(`[Relay] Invalid close code ${code}, using 1000 instead`);
      return 1000; // Normal closure
    }
    
    // Map some common invalid codes to valid ones
    if (code === 1005 || code === 1006) {
      return 1000; // No status received / Abnormal closure -> Normal closure
    }
    
    return code;
  };

  const closeBoth = (code = 1000, reason = "") => {
    const sanitizedCode = sanitizeCloseCode(code);
    
    // Close browser socket if not already closed
    if (!browserClosed && browser.readyState < WebSocket.CLOSING) {
      try {
        browserClosed = true;
        browser.close(sanitizedCode, reason);
        console.log(`[Relay] Browser socket closed with code ${sanitizedCode}`);
      } catch (error) {
        console.error("[Relay] Error closing browser socket:", error);
      }
    }
    
    // Close Gemini socket if not already closed
    if (!geminiClosed && gemini.readyState < WebSocket.CLOSING) {
      try {
        geminiClosed = true;
        gemini.close(sanitizedCode, reason);
        console.log(`[Relay] Gemini socket closed with code ${sanitizedCode}`);
      } catch (error) {
        console.error("[Relay] Error closing Gemini socket:", error);
      }
    }
  };

  /* 7️⃣  IMPROVED: Better error and close handling */
  browser.onerror = (error) => {
    console.error("[Relay] Browser socket error:", error);
    if (!browserClosed) {
      closeBoth(1011, "Browser error");
    }
  };
  
  gemini.onerror = (error) => {
    console.error("[Relay] Gemini socket error:", error);
    if (!geminiClosed) {
      closeBoth(1011, "Gemini error");
    }
  };
  
  browser.onclose = (e) => {
    console.log(`[Relay] Browser socket closed: ${e.code} ${e.reason}`);
    browserClosed = true;
    if (!geminiClosed) {
      // Use sanitized close code when forwarding
      const sanitizedCode = sanitizeCloseCode(e.code);
      try {
        geminiClosed = true;
        gemini.close(sanitizedCode, e.reason);
      } catch (error) {
        console.error("[Relay] Error closing Gemini after browser close:", error);
      }
    }
  };
  
  gemini.onclose = (e) => {
    console.log(`[Relay] Gemini socket closed: ${e.code} ${e.reason}`);
    geminiClosed = true;
    if (!browserClosed) {
      // Use sanitized close code when forwarding
      const sanitizedCode = sanitizeCloseCode(e.code);
      try {
        browserClosed = true;
        browser.close(sanitizedCode, e.reason);
      } catch (error) {
        console.error("[Relay] Error closing browser after Gemini close:", error);
      }
    }
  };

  browser.onopen = () => {
    console.log("[Relay] Browser WebSocket connection established");
  };

  gemini.onopen = () => {
    console.log("[Relay] Gemini WS connection established");
  };

  /* 8️⃣  Handshake successful – return 101 Switching Protocols */
  return response;
};

// Serve without JWT verification
serve(handler);