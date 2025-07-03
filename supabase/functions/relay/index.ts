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
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

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
    let currentAgentId: string | null = null;

    // Initialize Supabase client for tool calls
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Tool call utility function
    async function runToolCall(agentId: string, name: string, args: any) {
      try {
        console.log('[Relay][ToolCall] Running tool:', name, 'with args:', args);

        // Fetch the tool configuration
        const { data: tools, error } = await supabase
          .from('agent_tools')
          .select('*')
          .eq('agent_id', agentId);

        if (error) {
          console.error('[Relay][ToolCall] Error fetching tools:', error);
          throw new Error('Failed to fetch tool configuration');
        }

        const tool = tools?.find(t => t.name === name);
        if (!tool) {
          console.error('[Relay][ToolCall] Tool not found:', name);
          throw new Error(`Tool '${name}' not found`);
        }

        console.log('[Relay][ToolCall] Found tool configuration:', {
          name: tool.name,
          endpoint: tool.endpoint,
          method: tool.method
        });

        // Make the API call
        const response = await fetch(tool.endpoint, {
          method: tool.method,
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'VoicePilot-Agent/1.0'
          },
          body: tool.method !== 'GET' ? JSON.stringify(args) : undefined
        });

        if (!response.ok) {
          console.error('[Relay][ToolCall] API call failed:', response.status, response.statusText);
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[Relay][ToolCall] Tool call successful:', result);
        
        return result;
      } catch (error) {
        console.error('[Relay][ToolCall] Tool call error:', error);
        throw error;
      }
    }

    /* 6️⃣  Pipe traffic both ways with message buffering and tool call handling */
    browser.onmessage = async (e) => {
      if (gemini.readyState === WebSocket.OPEN && !geminiClosed) {
        try {
          // Parse message to extract agent ID from setup if available
          let messageData;
          try {
            messageData = JSON.parse(e.data);
            if (messageData.setup?.systemInstruction?.parts?.[0]?.text) {
              // Try to extract agent ID from system instruction or other setup data
              // For now, we'll need to pass this through the setup message
              console.log("[Relay] Setup message received");
            }
          } catch (parseError) {
            // Not JSON, just forward as-is
          }

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
    
    gemini.onmessage = async (e) => {
      if (browser.readyState === WebSocket.OPEN && !browserClosed) {
        try {
          // Check for tool calls in the message
          let messageData;
          try {
            messageData = JSON.parse(e.data);
            
            // Handle tool calls from Gemini Live API
            if (messageData.toolCall && currentAgentId) {
              console.log("[Relay] Tool call detected:", messageData.toolCall);
              
              for (const fc of messageData.toolCall.functionCalls) {
                try {
                  const result = await runToolCall(currentAgentId, fc.name, fc.args);
                  const responseMsg = {
                    functionResponses: [{
                      id: fc.id,
                      name: fc.name,
                      response: result
                    }]
                  };
                  
                  // Send function response back to Gemini
                  if (gemini.readyState === WebSocket.OPEN && !geminiClosed) {
                    gemini.send(JSON.stringify(responseMsg));
                    console.log("[Relay] Sent function response to Gemini");
                  }
                } catch (toolError) {
                  console.error("[Relay] Tool execution error:", toolError);
                  
                  // Send error response back to Gemini
                  const errorResponse = {
                    functionResponses: [{
                      id: fc.id,
                      name: fc.name,
                      response: { error: toolError.message }
                    }]
                  };
                  
                  if (gemini.readyState === WebSocket.OPEN && !geminiClosed) {
                    gemini.send(JSON.stringify(errorResponse));
                  }
                }
              }
              return; // Don't forward tool call messages to browser
            }
          } catch (parseError) {
            // Not JSON or no tool calls, continue with normal forwarding
          }

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

    gemini.onopen = async () => {
      console.log("[Relay] Gemini Live API WebSocket connection established successfully");
      
      // ✅ NEW: Send all buffered messages now that Gemini is ready
      if (messageQueue.length > 0) {
        console.log(`[Relay] Sending ${messageQueue.length} buffered messages to Gemini`);
        for (const message of messageQueue) {
          try {
            // Extract agent ID from setup message if available
            try {
              const messageData = JSON.parse(message);
              if (messageData.setup && messageData.agentId) {
                currentAgentId = messageData.agentId;
                console.log("[Relay] Agent ID extracted:", currentAgentId);
                
                // Fetch and add tools to the setup
                const { data: tools, error: toolsError } = await supabase
                  .from('agent_tools')
                  .select('name, description, parameters')
                  .eq('agent_id', currentAgentId);

                if (!toolsError && tools && tools.length > 0) {
                  console.log(`[Relay] Adding ${tools.length} tools to setup`);
                  
                  const toolDeclarations = tools.map(t => ({
                    functionDeclarations: [{
                      name: t.name,
                      description: t.description,
                      parameters: t.parameters
                    }]
                  }));

                  // Add tools to existing setup
                  if (!messageData.setup.tools) {
                    messageData.setup.tools = [];
                  }
                  messageData.setup.tools.unshift(...toolDeclarations);
                  
                  // Remove agentId from the message before sending to Gemini
                  delete messageData.agentId;
                  
                  // Send modified setup
                  gemini.send(JSON.stringify(messageData));
                  console.log("[Relay] Sent enhanced setup with tools to Gemini");
                  continue;
                }
              }
            } catch (parseError) {
              // Not JSON or no agent ID, send as-is
            }

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