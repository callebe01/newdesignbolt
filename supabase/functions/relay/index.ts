//--------------------------------------------------------------
//  relay – Voice Pilot WebSocket proxy  (Supabase Edge Function)
//--------------------------------------------------------------

// 🔓  PUBLIC FUNCTION  –  disables Supabase’s JWT check
export const config = { verify_jwt: false };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((req) => {
  /* 1️⃣  Only accept Upgrade requests */
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 400 });
  }

  /* 2️⃣  Browser ⇄ Relay socket */
  const { socket: browser, response } = Deno.upgradeWebSocket(req);

  /* 3️⃣  Load API key (GOOGLE_API_KEY preferred, fallback GEMINI_API_KEY) */
  const KEY = Deno.env.get("GOOGLE_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
  if (!KEY) {
    console.error("[Relay] No GOOGLE_API_KEY or GEMINI_API_KEY set");
    browser.close(1011, "Server mis-config");
    return new Response("Server mis-config", { status: 500 });
  }

  /* 4️⃣  Relay ⇄ Gemini socket */
  const geminiURL =
    "wss://generativelanguage.googleapis.com/ws/" +
    "google.ai.generativelanguage.v1beta.GenerativeService." +
    "BidiGenerateContent?key=" +
    encodeURIComponent(KEY);

  const gemini = new WebSocket(geminiURL);

  /* 5️⃣  Pipe traffic both ways */
  browser.onmessage = (e) => gemini.readyState === 1 && gemini.send(e.data);
  gemini.onmessage  = (e) => browser.readyState === 1 && browser.send(e.data);

  /* 6️⃣  Symmetric close / error handling */
  const closeBoth = (code = 1000, reason = "") => {
    try { if (browser.readyState < 2) browser.close(code, reason); } catch {}
    try { if (gemini.readyState  < 2) gemini.close(code, reason);  } catch {}
  };
  browser.onerror = () => closeBoth(1011, "Browser error");
  gemini.onerror  = () => closeBoth(1011, "Gemini error");
  browser.onclose = (e) => closeBoth(e.code, e.reason);
  gemini.onclose  = (e) => closeBoth(e.code, e.reason);

  /* 7️⃣  Handshake successful – return 101 Switching Protocols */
  return response;
});
