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

      // If the model finished producing an output item with text, sanitize names
      try {
        const agentName = session.agentConfig?.name || 'Unit';
        // Attempt to extract text if present
        const textContent = (item.content && Array.isArray(item.content) && item.content[0]?.text) ? item.content[0].text : null;
        if (textContent) {
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
        }
      } catch (err) {
        console.warn('Error sanitizing model output:', err);
      }

      break;
    }
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
