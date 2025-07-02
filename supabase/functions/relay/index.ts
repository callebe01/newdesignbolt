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

    /* 2️⃣  Load API key from environment variables */
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

    console.log("[Relay] Using API key from environment variables (length:", KEY.length, ")");

    /* 3️⃣  Browser ⇄ Relay socket */
    const { socket: browser, response } = Deno.upgradeWebSocket(req);

    /* 4️⃣  Message queue to buffer messages until Gemini connection is ready */
    const messageQueue: any[] = [];

    /* 5️⃣  Relay ⇄ Gemini socket - Include API key in URL as required by Google Live API */
    const geminiURL = 
      "wss://generativelanguage.googleapis.com/ws/" +
      "google.ai.generativelanguage.v1beta.GenerativeService." +
      "BidiGenerateContent?key=" +
      encodeURIComponent(KEY);

    console.log("[Relay] Connecting to Gemini Live API:", geminiURL.replace(KEY, "***"));
    
    let gemini: WebSocket;
    try {
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

    /* 6️⃣  Pipe traffic both ways with message buffering */
    browser.onmessage = (e) => {
      if (gemini.readyState === WebSocket.OPEN && !geminiClosed) {
        try {
          console.log("[Relay] Forwarding message from browser to Gemini");
          gemini.send(e.data);
        } catch (error) {
          console.error("[Relay] Error sending to Gemini:", error);
        }
      } else {
        // Buffer the message until Gemini connection is ready
        console.log("[Relay] Buffering message - Gemini not ready. State:", gemini.readyState);
        messageQueue.push(e.data);
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

    /* 7️⃣  IMPROVED: Sanitize close codes and prevent double-close */
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

    /* 8️⃣  IMPROVED: Better error and close handling with detailed logging */
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
      
      // ✅ NEW: Send all buffered messages now that Gemini is ready
      if (messageQueue.length > 0) {
        console.log(`[Relay] Sending ${messageQueue.length} buffered messages to Gemini`);
        for (const message of messageQueue) {
          try {
            gemini.send(message);
            console.log("[Relay] Sent buffered message to Gemini");
          } catch (error) {
            console.error("[Relay] Error sending buffered message to Gemini:", error);
          }
        }
        // Clear the queue after sending all messages
        messageQueue.length = 0;
        console.log("[Relay] Message queue cleared");
      }
    };

    /* 9️⃣  Handshake successful – return 101 Switching Protocols */
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