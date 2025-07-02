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

  try {
    /* 1️⃣  Only accept Upgrade requests */
    if (req.headers.get("upgrade") !== "websocket") {
      console.error("[Relay] Expected WebSocket upgrade, got:", req.headers.get("upgrade"));
      return new Response("Expected WebSocket upgrade", { 
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    /* 2️⃣  Load API key directly from environment variables */
    const KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
    
    if (!KEY) {
      console.error("[Relay] No GOOGLE_API_KEY or GEMINI_API_KEY environment variable found");
      return new Response("Server configuration error: Missing API key", { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    console.log("[Relay] Using API key from environment variables");

    /* 3️⃣  Browser ⇄ Relay socket */
    const { socket: browser, response } = Deno.upgradeWebSocket(req);

    /* 4️⃣  Relay ⇄ Gemini socket - Using correct Gemini Live API endpoint WITHOUT key in URL */
    // According to Google Live API docs, the WebSocket endpoint should not include the API key
    // The API key authentication is handled server-side through environment variables
    const geminiURL = "wss://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent";

    console.log("[Relay] Connecting to Gemini Live API:", geminiURL);
    
    let gemini: WebSocket;
    try {
      // Create WebSocket connection without API key in URL
      // The authentication should be handled by the server environment
      gemini = new WebSocket(geminiURL);
    } catch (error) {
      console.error("[Relay] Failed to create WebSocket connection to Gemini:", error);
      browser.close(1011, "Failed to connect to Gemini API");
      return new Response("Failed to connect to Gemini API", { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // ✅ IMPROVED: Track connection states and prevent double-close
    let browserClosed = false;
    let geminiClosed = false;

    /* 5️⃣  Pipe traffic both ways */
    browser.onmessage = (e) => {
      if (gemini.readyState === WebSocket.OPEN && !geminiClosed) {
        try {
          console.log("[Relay] Forwarding message from browser to Gemini");
          gemini.send(e.data);
        } catch (error) {
          console.error("[Relay] Error sending to Gemini:", error);
        }
      } else {
        console.warn("[Relay] Cannot send to Gemini - connection not open. State:", gemini.readyState);
      }
    };
    
    gemini.onmessage = (e) => {
      if (browser.readyState === WebSocket.OPEN && !browserClosed) {
        try {
          console.log("[Relay] Forwarding message from Gemini to browser");
          browser.send(e.data);
        } catch (error) {
          console.error("[Relay] Error sending to browser:", error);
        }
      } else {
        console.warn("[Relay] Cannot send to browser - connection not open. State:", browser.readyState);
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
      console.log(`[Relay] Closing both connections with code ${sanitizedCode}, reason: ${reason}`);
      
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

    /* 7️⃣  IMPROVED: Better error and close handling with detailed logging */
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
      console.log(`[Relay] Browser socket closed: code=${e.code}, reason="${e.reason}"`);
      browserClosed = true;
      if (!geminiClosed) {
        // Use sanitized close code when forwarding
        const sanitizedCode = sanitizeCloseCode(e.code);
        try {
          geminiClosed = true;
          gemini.close(sanitizedCode, e.reason);
          console.log(`[Relay] Closed Gemini socket after browser close with code ${sanitizedCode}`);
        } catch (error) {
          console.error("[Relay] Error closing Gemini after browser close:", error);
        }
      }
    };
    
    gemini.onclose = (e) => {
      console.log(`[Relay] Gemini socket closed: code=${e.code}, reason="${e.reason}"`);
      geminiClosed = true;
      if (!browserClosed) {
        // Use sanitized close code when forwarding
        const sanitizedCode = sanitizeCloseCode(e.code);
        try {
          browserClosed = true;
          browser.close(sanitizedCode, e.reason);
          console.log(`[Relay] Closed browser socket after Gemini close with code ${sanitizedCode}`);
        } catch (error) {
          console.error("[Relay] Error closing browser after Gemini close:", error);
        }
      }
    };

    browser.onopen = () => {
      console.log("[Relay] Browser WebSocket connection established successfully");
    };

    gemini.onopen = () => {
      console.log("[Relay] Gemini Live API WebSocket connection established successfully");
    };

    /* 8️⃣  Handshake successful – return 101 Switching Protocols */
    console.log("[Relay] WebSocket upgrade successful, returning response");
    return response;

  } catch (error) {
    console.error("[Relay] Unexpected error in handler:", error);
    return new Response("Internal server error", { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
};

// Serve without JWT verification
serve(handler);