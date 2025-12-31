import { RawData, WebSocket } from "ws";
import functions from "./functionHandlers";

interface Session {
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  modelConn?: WebSocket;
  streamSid?: string;
  saved_config?: any;
  lastAssistantItem?: string;
  responseStartTimestamp?: number;
  latestMediaTimestamp?: number;
  openAIApiKey?: string;
  agentConfig?: {
    name: string;
    opening: string;
    goal?: string;
    tone?: string;
  };
  pendingCallConfigs?: Map<string, any>; // Reference to pending configs

  // Blocking/Buffering state for strict opening enforcement
  blockingMode?: boolean; // When true, buffer audio until validated
  blockingValidated?: boolean; // Whether we've seen a validated agent utterance
  bufferedAudio?: Map<string, string[]>; // item_id -> array of delta payloads
  blockingTimer?: NodeJS.Timeout | number;
}

let session: Session = {};

export function handleCallConnection(
  ws: WebSocket,
  openAIApiKey: string,
  pendingConfigs?: Map<string, any>
) {
  cleanupConnection(session.twilioConn);
  session.twilioConn = ws;
  session.openAIApiKey = openAIApiKey;
  session.pendingCallConfigs = pendingConfigs;

  ws.on("message", handleTwilioMessage);
  ws.on("error", ws.close);
  ws.on("close", () => {
    cleanupConnection(session.modelConn);
    cleanupConnection(session.twilioConn);
    session.twilioConn = undefined;
    session.modelConn = undefined;
    session.streamSid = undefined;
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
    session.latestMediaTimestamp = undefined;
    if (!session.frontendConn) session = {};
  });
}

export function handleFrontendConnection(ws: WebSocket) {
  cleanupConnection(session.frontendConn);
  session.frontendConn = ws;

  ws.on("message", handleFrontendMessage);
  ws.on("close", () => {
    cleanupConnection(session.frontendConn);
    session.frontendConn = undefined;
    if (!session.twilioConn && !session.modelConn) session = {};
  });
}

async function handleFunctionCall(item: { name: string; arguments: string }) {
  console.log("Handling function call:", item);
  const fnDef = functions.find((f) => f.schema.name === item.name);
  if (!fnDef) {
    throw new Error(`No handler found for function: ${item.name}`);
  }

  let args: unknown;
  try {
    args = JSON.parse(item.arguments);
  } catch {
    return JSON.stringify({
      error: "Invalid JSON arguments for function call.",
    });
  }

  try {
    console.log("Calling function:", fnDef.schema.name, args);
    const result = await fnDef.handler(args as any);
    return result;
  } catch (err: any) {
    console.error("Error running function:", err);
    return JSON.stringify({
      error: `Error running function ${item.name}: ${err.message}`,
    });
  }
}

function handleTwilioMessage(data: RawData) {
  const msg = parseMessage(data);
  if (!msg) return;

  switch (msg.event) {
    case "start":
      console.log('Twilio stream START event:', JSON.stringify(msg.start || msg, null, 2));
      session.streamSid = msg.start.streamSid;
      session.latestMediaTimestamp = 0;
      session.lastAssistantItem = undefined;
      session.responseStartTimestamp = undefined;

      // Extract callId from start parameters (if provided) and load pending agent config
      try {
        const params = msg.start?.parameters || msg.start?.custom_parameters || msg.start?.customParameters || [];
        let callId: string | undefined;

        if (Array.isArray(params)) {
          const p = params.find((x: any) => x.name === 'callId' || x.name === 'call_id');
          if (p) callId = p.value;
        } else if (params && typeof params === 'object') {
          // Twilio sometimes sends customParameters as an object: { callId: '...' }
          if ((params as any).callId) callId = (params as any).callId;
          else if ((params as any).call_id) callId = (params as any).call_id;
        } else if (msg.start?.callId) {
          callId = msg.start.callId;
        }

        if (!callId && session.pendingCallConfigs) {
          // Diagnostic: log the start params shape so we can validate unexpected payloads
          console.warn('No callId found in start params; start params:', JSON.stringify(msg.start || {}, null, 2));
        }

        if (callId && session.pendingCallConfigs) {
          const cfg = session.pendingCallConfigs.get(callId);
          if (cfg) {
            session.agentConfig = {
              name: cfg.name || cfg.agentName || cfg.agent?.name || 'Voice Rep',
              opening: cfg.opening || cfg.agentScript?.opening || '',
              goal: cfg.goal || cfg.agentScript?.goal,
              tone: cfg.tone || cfg.agentScript?.tone,
              userId: cfg.userId
            } as any;
            console.log('Loaded agent config for callId', callId, session.agentConfig);
          } else {
            console.warn('No pending call config found for callId', callId);
          }
        }
      } catch (err) {
        console.warn('Failed to extract callId from start params:', err);
      }

      tryConnectModel();
      break;
    case "media":
      session.latestMediaTimestamp = msg.media.timestamp;
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
          type: "input_audio_buffer.append",
          audio: msg.media.payload,
        });
      }
      break;
    case "close":
      closeAllConnections();
      break;
  }
}

function handleFrontendMessage(data: RawData) {
  const msg = parseMessage(data);
  if (!msg) return;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, msg);
  }

  if (msg.type === "session.update") {
    session.saved_config = msg.session;
  }
}

function tryConnectModel() {
  if (!session.twilioConn || !session.streamSid || !session.openAIApiKey)
    return;
  if (isOpen(session.modelConn)) return;

  session.modelConn = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
    {
      headers: {
        Authorization: `Bearer ${session.openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  session.modelConn.on("open", () => {
    const config = session.saved_config || {};

    // If agentConfig is set from the pending call, use that name/instructions; otherwise fall back to default
    const agentName = session.agentConfig?.name || 'Voice Rep';
    const openingInstruction = session.agentConfig?.opening || `Hello! This is ${agentName} from Voice Marketing AI. How are you doing today?`;

    jsonSend(session.modelConn, {
      type: "session.update",
      session: {
        ...config,
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        tools: functions.map((f) => f.schema),
        tool_choice: "auto",
        instructions: `You are ${agentName}. Use this exact name when introducing yourself and NEVER substitute it with generic phrases like "Voice Rep" or "Sales Representative".
Goal: Briefly explain the value of voice AI for marketing and sales, then try to schedule a 15-minute demo.
Behavior:
- Always use the exact agent opening line provided and include the agent's name exactly as given
- Keep responses short and conversational (1-2 sentences max)
- Ask if they'd like to schedule a demo
- If they agree (yes, ok, sure, sounds good, etc.), ask when works best for them
- When they provide a specific time, IMMEDIATELY call the schedule_demo tool
- After booking, confirm the appointment time
Important: Under NO circumstances should you produce text or audio in the voice of the customer or any third party. You must only speak as the agent (${agentName}). Do NOT simulate the customer's reply or generate audio that pretends to be the other party. If you need to reason about a customer's reply, do so internally or in non-audio text only.
Tone: Professional, friendly, and concise.`,
        ...config,
      },
    });

    console.log('Using opening instruction for model:', openingInstruction);

    // Commit the opening as an explicit assistant message first so the model's context contains the exact text
    jsonSend(session.modelConn, {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: openingInstruction }],
      },
    });

    // Primary opening: ask model to speak the prepared opening line
    jsonSend(session.modelConn, {
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions: openingInstruction,
      },
    });

    // Forceful clarification to ensure the model uses the agent's exact name and never substitutes a generic title
    const forceOpening = `Repeat the following opening line exactly, verbatim: "${openingInstruction.replace(/"/g, '\\"')}". Do NOT replace the agent's name with any generic phrase such as "Voice Rep", "Sales Representative", or similar. From now on, always use the agent's exact name (${agentName}) when introducing yourself.`;

    jsonSend(session.modelConn, {
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions: forceOpening,
      },
    });

    // Activate strict blocking mode until we validate the first agent utterance
    try {
      session.blockingMode = true;
      session.blockingValidated = false;
      session.bufferedAudio = new Map();

      const BLOCKING_TIMEOUT_MS = parseInt(process.env.AGENT_OPENING_BLOCK_MS || '3000', 10);
      if (session.blockingTimer) clearTimeout(session.blockingTimer as any);
      session.blockingTimer = setTimeout(() => {
        // Timeout: flush what we have to avoid indefinite silence and log for diagnostics
        console.warn('Blocking timeout reached without validation; flushing buffered audio as fallback');
        flushBufferedAudio(true);
      }, BLOCKING_TIMEOUT_MS) as any;
    } catch (err) {
      console.warn('Error initializing blocking mode:', err);
    }

    session.modelConn!.on("message", handleModelMessage);
    session.modelConn!.on("error", closeModel);
    session.modelConn!.on("close", closeModel);
  });
}

function handleModelMessage(data: RawData) {
  const event = parseMessage(data);
  if (!event) return;

  jsonSend(session.frontendConn, event);

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      handleTruncation();
      break;

    case "response.audio.delta":
      if (session.twilioConn && session.streamSid) {
        if (session.responseStartTimestamp === undefined) {
          session.responseStartTimestamp = session.latestMediaTimestamp || 0;
        }
        if (event.item_id) session.lastAssistantItem = event.item_id;

        // If blocking mode is active and we have not validated the opening, buffer the audio instead of forwarding
        if (session.blockingMode && !session.blockingValidated) {
          try {
            const key = event.item_id || 'unknown';
            if (!session.bufferedAudio) session.bufferedAudio = new Map();
            const arr = session.bufferedAudio.get(key) || [];
            arr.push(event.delta || '');
            session.bufferedAudio.set(key, arr);
            console.log(`Buffered audio delta for item ${key} (bytes=${event.delta ? event.delta.length : 0}). Total chunks: ${arr.length}`);
          } catch (err) {
            console.warn('Failed to buffer audio delta:', err);
          }
        } else {
          console.log('Forwarding audio delta to Twilio (item_id=' + event.item_id + ', bytes=' + (event.delta ? event.delta.length : 0) + ')');

          jsonSend(session.twilioConn, {
            event: "media",
            streamSid: session.streamSid,
            media: { payload: event.delta },
          });

          jsonSend(session.twilioConn, {
            event: "mark",
            streamSid: session.streamSid,
          });
        }
      }
      break;

    case "response.output_item.done": {
      const { item } = event;

      // If the model made a function call, process the function result as before
      if (item.type === "function_call") {
        handleFunctionCall(item)
          .then((output) => {
            if (session.modelConn) {
              jsonSend(session.modelConn, {
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: item.call_id,
                  output: JSON.stringify(output),
                },
              });
              jsonSend(session.modelConn, { type: "response.create" });
            }
          })
          .catch((err) => {
            console.error("Error handling function call:", err);
          });
        break;
      }

      // If the model finished producing an output item with text, sanitize names and detect disallowed customer-role replies
      try {
        const agentName = session.agentConfig?.name || 'Unit';
        // Attempt to extract text if present
        const textContent = (item.content && Array.isArray(item.content) && item.content[0]?.text) ? item.content[0].text : null;
        if (textContent) {
          // Log for diagnostics so we can see what the model produced
          console.log(`Model output (item_id=${item.item_id || 'unknown'}):`, textContent);

          const sanitized = textContent
            .replace(/\bJames\b/gi, agentName)
            .replace(/\b(Voice Rep|Voice Representative|Sales Rep|Sales Representative|Senior Sales Rep|Voice\.OS Rep|Voice OS Rep)\b/gi, agentName)
            .replace(/((?:Hello|Hi|Hey),?\s+(?:this\s+is|I'm|I am)\s+)[A-Za-z0-9_()\-\s]+/gi, `$1${agentName}`);

          if (sanitized && sanitized !== textContent) {
            console.log('Sanitized model output to enforce agent name:', agentName);
            // Trigger a new short response with sanitized text to ensure audio matches
            if (session.modelConn) {
              jsonSend(session.modelConn, {
                type: "response.create",
                response: {
                  modalities: ["text", "audio"],
                  instructions: sanitized,
                },
              });
            }
          }

          // Validation heuristic for agent utterances
          const lower = textContent.toLowerCase();
          const containsAgentName = new RegExp(`\b${escapeRegExp(agentName.toLowerCase())}\b`).test(lower);
          const openingMatches = session.agentConfig?.opening ? lower.includes(session.agentConfig.opening.toLowerCase().slice(0, 20)) : false;
          const customerIndicators = /(interested|schedule|demo|how about next week|sounds good|i'm interested|i am interested|would love to)/i;

          const isLikelyAgent = containsAgentName || openingMatches;
          const isLikelyCustomer = customerIndicators.test(lower);

          if (session.blockingMode && !session.blockingValidated) {
            // If it's a valid agent utterance, flush the buffered audio and lift blocking
            if (isLikelyAgent && !isLikelyCustomer) {
              console.log('Validated agent utterance detected; flushing buffered audio and lifting blocking');
              session.blockingValidated = true;
              if (session.blockingTimer) { clearTimeout(session.blockingTimer as any); session.blockingTimer = undefined; }
              flushBufferedAudio(false, item.item_id);
            } else if (isLikelyCustomer) {
              // Detected customer speech during blocking; discard buffers and instruct model
              console.warn('Detected customer-role content during blocking; discarding buffered audio and instructing model');
              discardBufferedAudio(item.item_id);

              if (session.modelConn) {
                jsonSend(session.modelConn, {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "assistant",
                    content: [{ type: "output_text", text: `Do NOT simulate or speak as the customer. You must only speak as the agent ${agentName}. Stop generating any customer-role text or audio.` }],
                  },
                });

                jsonSend(session.modelConn, {
                  type: "response.create",
                  response: {
                    modalities: ["text"],
                    instructions: `Stop generating speech as the customer. From now on, only produce agent responses as ${agentName}.`,
                  },
                });
              }
            } else {
              // Neither clearly agent nor customer; we'll keep waiting (or timeout will fire)
              console.log('Received ambiguous output during blocking; waiting for clearer output or timeout');
            }
          } else {
            // Non-blocking sanitization/heuristics (existing behavior)
            if (isLikelyCustomer) {
              console.warn('Detected likely customer-role output from model; issuing corrective instruction and preventing further customer-role speech');

              if (session.modelConn) {
                // Add an explicit assistant message committing the role rule
                jsonSend(session.modelConn, {
                  type: "conversation.item.create",
                  item: {
                    type: "message",
                    role: "assistant",
                    content: [{ type: "output_text", text: `Do NOT simulate or speak as the customer. You must only speak as the agent ${agentName}. Stop generating any customer-role text or audio.` }],
                  },
                });

                // Also send a response.create to explicitly tell the model to stop producing that behavior
                jsonSend(session.modelConn, {
                  type: "response.create",
                  response: {
                    modalities: ["text"],
                    instructions: `Stop generating speech as the customer. From now on, only produce agent responses as ${agentName}.`,
                  },
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error sanitizing model output:', err);
      }

      break;
    }
  }
}

function flushBufferedAudio(force: boolean, itemId?: string) {
  if (!session.twilioConn || !session.streamSid || !session.bufferedAudio) return;

  try {
    if (itemId) {
      const arr = session.bufferedAudio.get(itemId) || [];
      console.log(`Flushing ${arr.length} buffered chunks for item ${itemId} (force=${force})`);
      for (const chunk of arr) {
        jsonSend(session.twilioConn, {
          event: "media",
          streamSid: session.streamSid,
          media: { payload: chunk },
        });
      }
      // mark after the sequence
      jsonSend(session.twilioConn, { event: "mark", streamSid: session.streamSid });
      session.bufferedAudio.delete(itemId);
    } else {
      // flush all
      for (const [key, arr] of session.bufferedAudio.entries()) {
        console.log(`Flushing ${arr.length} buffered chunks for item ${key} (force=${force})`);
        for (const chunk of arr) {
          jsonSend(session.twilioConn, {
            event: "media",
            streamSid: session.streamSid,
            media: { payload: chunk },
          });
        }
        jsonSend(session.twilioConn, { event: "mark", streamSid: session.streamSid });
        session.bufferedAudio.delete(key);
      }
    }

    if (force) {
      // lift blocking to avoid further silence
      session.blockingValidated = true;
      session.blockingMode = false;
      if (session.blockingTimer) { clearTimeout(session.blockingTimer as any); session.blockingTimer = undefined; }
    }
  } catch (err) {
    console.warn('Error flushing buffered audio:', err);
  }
}

function discardBufferedAudio(itemId?: string) {
  if (!session.bufferedAudio) return;
  try {
    if (itemId) {
      console.log(`Discarding buffered audio for item ${itemId}`);
      session.bufferedAudio.delete(itemId);
    } else {
      console.log('Discarding all buffered audio');
      session.bufferedAudio.clear();
    }
  } catch (err) {
    console.warn('Error discarding buffered audio:', err);
  }
}

function handleTruncation() {
  if (
    !session.lastAssistantItem ||
    session.responseStartTimestamp === undefined
  )
    return;

  const elapsedMs =
    (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
  const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, {
      type: "conversation.item.truncate",
      item_id: session.lastAssistantItem,
      content_index: 0,
      audio_end_ms,
    });
  }

  if (session.twilioConn && session.streamSid) {
    jsonSend(session.twilioConn, {
      event: "clear",
      streamSid: session.streamSid,
    });
  }

  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
}

function closeModel() {
  if (session.blockingTimer) { clearTimeout(session.blockingTimer as any); session.blockingTimer = undefined; }
  cleanupConnection(session.modelConn);
  session.modelConn = undefined;
  if (!session.twilioConn && !session.frontendConn) session = {};
}

function closeAllConnections() {
  if (session.twilioConn) {
    session.twilioConn.close();
    session.twilioConn = undefined;
  }
  if (session.modelConn) {
    session.modelConn.close();
    session.modelConn = undefined;
  }
  if (session.frontendConn) {
    session.frontendConn.close();
    session.frontendConn = undefined;
  }
  session.streamSid = undefined;
  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
  session.latestMediaTimestamp = undefined;
  session.saved_config = undefined;
}

function cleanupConnection(ws?: WebSocket) {
  if (isOpen(ws)) ws.close();
}

// Escape a string for use in a RegExp
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMessage(data: RawData): any {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function jsonSend(ws: WebSocket | undefined, obj: unknown) {
  if (!isOpen(ws)) return;
  ws.send(JSON.stringify(obj));
}

function isOpen(ws?: WebSocket): ws is WebSocket {
  return !!ws && ws.readyState === WebSocket.OPEN;
}
