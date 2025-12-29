import express, { Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import http from "http";
import { readFileSync } from "fs";
import { join } from "path";
import cors from "cors";
import { Twilio } from "twilio";
import {
  handleCallConnection,
  handleFrontendConnection,
} from "./sessionManager";
import functions from "./functionHandlers";

dotenv.config();

const PORT = parseInt(process.env.PORT || "8081", 10);
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "";

console.log("🔑 Environment variables loaded:");
console.log("   OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ Set" : "❌ Missing");
console.log("   GEMINI_API_KEY:", GEMINI_API_KEY ? "✅ Set" : "❌ Missing");
console.log("   MINIMAX_API_KEY:", MINIMAX_API_KEY ? "✅ Set" : "❌ Missing");
console.log("   GROQ_API_KEY:", GROQ_API_KEY ? "✅ Set" : "❌ Missing");
console.log("   DEEPGRAM_API_KEY:", DEEPGRAM_API_KEY ? "✅ Set" : "❌ Missing");
console.log("   TWILIO_ACCOUNT_SID:", TWILIO_ACCOUNT_SID ? "✅ Set" : "❌ Missing");

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://voice-os-frontend.web.app',
    'https://voice-os-frontend.firebaseapp.com',
    /\.onrender\.com$/,
    /\.netlify\.app$/,
    /\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
const server = http.createServer(app);

// WebSocket Server with CORS
const wss = new WebSocketServer({ 
  server,
  verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
    const origin = info.origin || info.req.headers.origin;
    if (!origin) return true; // Allow requests without origin (like Twilio)
    
    // Check if origin matches any allowed origin
    const allowed = corsOptions.origin.some((allowedOrigin) => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    return allowed;
  }
});

app.use(express.urlencoded({ extended: false }));

// In production (dist), twiml.xml is in the same folder as server.js
// In development (src), it's also in the same folder
const twimlPath = join(__dirname, "twiml.xml");
const twimlTemplate = readFileSync(twimlPath, "utf-8");

app.get("/public-url", (req, res) => {
  res.json({ publicUrl: PUBLIC_URL });
});

// TwiML endpoint - Twilio calls this with GET request (not POST)
app.get("/twiml", (req, res) => {
  try {
    if (!PUBLIC_URL) {
      console.error("PUBLIC_URL is not set");
      res.status(500).send("PUBLIC_URL environment variable is not configured");
      return;
    }
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    wsUrl.pathname = `/call`;
    
    // Get callId from query params if present
    const callId = req.query.callId as string;
    console.log(`📞 TwiML request received. CallId: ${callId}`);
    if (callId) {
      wsUrl.searchParams.set('callId', callId);
      console.log(`🔗 WebSocket URL with callId:`, wsUrl.toString());
    } else {
      console.warn(`⚠️ No callId in TwiML request query params`);
    }

    const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
    res.type("text/xml").send(twimlContent);
  } catch (error) {
    console.error("Error generating TwiML:", error);
    res.status(500).send("Error generating TwiML");
  }
});

// Also support POST for backwards compatibility
app.post("/twiml", (req, res) => {
  try {
    if (!PUBLIC_URL) {
      console.error("PUBLIC_URL is not set");
      res.status(500).send("PUBLIC_URL environment variable is not configured");
      return;
    }
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    wsUrl.pathname = `/call`;
    
    // Get callId from query params if present
    const callId = req.query.callId as string;
    console.log(`📞 TwiML request received (POST). CallId: ${callId}`);
    if (callId) {
      wsUrl.searchParams.set('callId', callId);
      console.log(`🔗 WebSocket URL with callId:`, wsUrl.toString());
    } else {
      console.warn(`⚠️ No callId in TwiML request query params`);
    }

    const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
    res.type("text/xml").send(twimlContent);
  } catch (error) {
    console.error("Error generating TwiML:", error);
    res.status(500).send("Error generating TwiML");
  }
});

// Legacy route for backward compatibility
app.post("/voice/openai/incoming", (req, res) => {
  try {
    if (!PUBLIC_URL) {
      console.error("PUBLIC_URL is not set");
      res.status(500).send("PUBLIC_URL environment variable is not configured");
      return;
    }
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    wsUrl.pathname = `/voice/openai/stream`;

    const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
    res.type("text/xml").send(twimlContent);
  } catch (error) {
    console.error("Error generating TwiML:", error);
    res.status(500).send("Error generating TwiML");
  }
});

// New endpoint to list available tools (schemas)
app.get("/tools", (req, res) => {
  res.json(functions.map((f) => f.schema));
});

app.get("/api/twilio", (req, res) => {
  res.json({
    credentialsSet: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
  });
});

app.get("/api/twilio/numbers", async (req: Request, res: Response) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    res.status(500).json({ error: "Twilio credentials not configured" });
    return;
  }
  try {
    const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    const numbers = incomingPhoneNumbers.map((n) => ({
      sid: n.sid,
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
    }));
    res.json({ numbers });
  } catch (error: any) {
    console.error("Error fetching numbers:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/twilio/call", async (req: Request, res: Response) => {
  const { to, from, agentName, agentScript } = req.body;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    res.status(500).json({ error: "Twilio credentials not configured" });
    return;
  }
  if (!to || !from) {
    res.status(400).json({ error: "Missing 'to' or 'from' phone number" });
    return;
  }
  
  try {
    const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Generate unique call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store agent configuration for this call
    if (agentName && agentScript) {
      const config = {
        name: agentName,
        opening: agentScript.opening,
        goal: agentScript.goal || "assist the customer",
        tone: agentScript.tone || "Professional and friendly"
      };
      pendingCallConfigs.set(callId, config);
      console.log(`📦 Stored agent config for callId ${callId}:`, config);
      
      // Clean up after 5 minutes if not used
      setTimeout(() => {
        pendingCallConfigs.delete(callId);
        console.log(`🗑️ Cleaned up config for callId ${callId}`);
      }, 5 * 60 * 1000);
    } else {
      console.warn(`⚠️ No agent config provided for call to ${to}`);
    }
    
    const call = await client.calls.create({
      url: `${PUBLIC_URL}/twiml?callId=${callId}`,
      to,
      from,
      record: true, // Enable call recording
      recordingStatusCallback: `${PUBLIC_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackEvent: ['completed'],
    });
    console.log(`📞 Call initiated with SID: ${call.sid}, recording enabled`);
    res.json({ success: true, callSid: call.sid, callId });
  } catch (error: any) {
    console.error("Error initiating call:", error);
    res.status(500).json({ error: error.message });
  }
});

// Recording callback endpoint - called by Twilio when recording is ready
app.post("/api/twilio/recording-callback", async (req: Request, res: Response) => {
  const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } = req.body;
  console.log(`🎙️ Recording completed for call ${CallSid}:`);
  console.log(`   Recording SID: ${RecordingSid}`);
  console.log(`   Recording URL: ${RecordingUrl}`);
  console.log(`   Duration: ${RecordingDuration}s`);
  
  // Store this in a map so frontend can retrieve it
  // In production, you'd update the database here
  res.sendStatus(200);
});

// Get recording audio file - proxy through backend to avoid auth issues
app.get("/api/twilio/recording/:callSid", async (req: Request, res: Response) => {
  const { callSid } = req.params;
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    res.status(500).json({ error: "Twilio credentials not configured" });
    return;
  }
  
  try {
    const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const recordings = await client.recordings.list({ callSid, limit: 1 });
    
    if (recordings.length === 0) {
      res.status(404).json({ error: "No recording found for this call" });
      return;
    }
    
    const recording = recordings[0];
    const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    
    // Fetch the audio file from Twilio with authentication
    const authString = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const audioResponse = await fetch(recordingUrl, {
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });
    
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch recording from Twilio');
    }
    
    // Stream the audio back to client
    const audioBuffer = await audioResponse.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Disposition', `attachment; filename="recording_${callSid}.mp3"`);
    res.send(Buffer.from(audioBuffer));
  } catch (error: any) {
    console.error("Error fetching recording:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Deepgram STT Proxy =============
app.post("/api/deepgram/transcribe", async (req: Request, res: Response) => {
  console.log("🔍 Deepgram endpoint hit - API key status:", DEEPGRAM_API_KEY ? "✅ Present" : "❌ Missing");
  
  if (!DEEPGRAM_API_KEY) {
    console.error("❌ DEEPGRAM_API_KEY environment variable not set");
    res.status(500).json({ error: "Deepgram API key not configured" });
    return;
  }

  const { model, language } = req.body;
  
  try {
    const response = await fetch(
      `https://api.deepgram.com/v1/listen?model=${model || 'nova-2'}&language=${language || 'en-US'}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/wav",
        },
        body: req.body.audio, // binary audio data
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Deepgram API error:", errorText);
      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Deepgram transcription error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Gemini API Proxy =============
app.post("/api/gemini/generate", async (req: Request, res: Response) => {
  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: "Gemini API key not configured" });
    return;
  }
  
  const { prompt, model, temperature, systemPrompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  try {
    const finalModel = model || 'gemini-flash-latest';
    const finalTemp = temperature !== undefined ? temperature : 0.7;
    const textContent = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: textContent }] }],
          generationConfig: {
            temperature: finalTemp,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API error: ${response.status} - Model: ${finalModel}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Groq API Proxy =============
app.post("/api/groq/chat", async (req: Request, res: Response) => {
  console.log("🔍 Groq endpoint hit - API key status:", GROQ_API_KEY ? "✅ Present" : "❌ Missing");
  
  if (!GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY environment variable not set");
    res.status(500).json({ error: "Groq API key not configured" });
    return;
  }
  
  const { messages, model, temperature } = req.body;
  if (!messages) {
    res.status(400).json({ error: "Missing messages" });
    return;
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages,
          temperature: temperature !== undefined ? temperature : 0.7,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Groq API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Minimax TTS API Proxy =============
// Minimax TTS Voices (Official MiniMax voice IDs from docs)
const MINIMAX_VOICES = [
  { voice_id: 'English_Graceful_Lady', name: 'Graceful Lady', language: 'en-US', gender: 'FEMALE', category: 'english', description: 'Graceful female voice' },
  { voice_id: 'English_Insightful_Speaker', name: 'Insightful Speaker', language: 'en-US', gender: 'MALE', category: 'english', description: 'Insightful male voice' },
  { voice_id: 'English_radiant_girl', name: 'Radiant Girl', language: 'en-US', gender: 'FEMALE', category: 'english', description: 'Radiant young female voice' },
  { voice_id: 'English_Persuasive_Man', name: 'Persuasive Man', language: 'en-US', gender: 'MALE', category: 'english', description: 'Persuasive male voice' },
  { voice_id: 'moss_audio_6dc281eb-713c-11f0-a447-9613c873494c', name: 'Moss Voice 1', language: 'en-US', gender: 'MALE', category: 'english', description: 'Professional voice' },
  { voice_id: 'moss_audio_570551b1-735c-11f0-b236-0adeeecad052', name: 'Moss Voice 2', language: 'en-US', gender: 'FEMALE', category: 'english', description: 'Clear female voice' },
  { voice_id: 'moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8', name: 'Moss Voice 3', language: 'en-US', gender: 'MALE', category: 'english', description: 'Deep male voice' },
  { voice_id: 'English_Lucky_Robot', name: 'Lucky Robot', language: 'en-US', gender: 'MALE', category: 'english', description: 'Robotic voice' },
];

// Minimax TTS endpoint
app.post("/api/minimax/tts", async (req: Request, res: Response) => {
  if (!MINIMAX_API_KEY) {
    res.status(503).json({ 
      error: "Text-to-speech service unavailable: Minimax API key not configured" 
    });
    return;
  }

  const { text, voiceId } = req.body;
  if (!text || !voiceId) {
    res.status(400).json({ error: "Missing text or voiceId" });
    return;
  }

  try {
    // MiniMax TTS API - International endpoint (for users outside China)
    const response = await fetch(
      "https://api.minimaxi.chat/v1/t2a_v2",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MINIMAX_API_KEY}`, // Bearer prefix is MANDATORY
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "speech-02-turbo", // Official MiniMax model
          text,
          voice_setting: {
            voice_id: voiceId
          },
          audio_setting: {
            audio_format: "wav",
            sample_rate: 24000
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Minimax TTS API error: ${response.status} - ${errorText}`);
      res.status(503).json({ 
        error: `Text-to-speech service unavailable: Minimax API returned ${response.status}` 
      });
      return;
    }

    // MiniMax returns JSON with HEX encoded audio at data.audio (per official docs)
    const data = await response.json();
    
    // Log for debugging
    console.log("Minimax API response structure:", JSON.stringify(data, null, 2));
    
    // Extract HEX audio from official response format: data.audio
    if (data.data && data.data.audio) {
      // Decode from HEX, not base64 (default output_format is 'hex')
      const audioBuffer = Buffer.from(data.data.audio, 'hex');
      res.setHeader("Content-Type", "audio/wav");
      res.send(audioBuffer);
    } else {
      console.error("Minimax response missing audio data. Full response:", JSON.stringify(data));
      res.status(503).json({ 
        error: 'No audio data in Minimax response',
        debug: data 
      });
    }
  } catch (error: any) {
    console.error("Minimax TTS error:", error);
    res.status(503).json({ 
      error: "Text-to-speech service unavailable: " + error.message 
    });
  }
});

// Backward compatibility: Keep old elevenlabs endpoint pointing to minimax
app.post("/api/elevenlabs/tts", async (req: Request, res: Response) => {
  if (!MINIMAX_API_KEY) {
    res.status(503).json({ 
      error: "Text-to-speech service unavailable: Minimax API key not configured" 
    });
    return;
  }

  const { text, voiceId } = req.body;
  if (!text || !voiceId) {
    res.status(400).json({ error: "Missing text or voiceId" });
    return;
  }

  try {
    // MiniMax TTS API - International endpoint (for users outside China)
    const response = await fetch(
      "https://api.minimaxi.chat/v1/t2a_v2",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MINIMAX_API_KEY}`, // Bearer prefix is MANDATORY
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "speech-02-turbo", // Official MiniMax model
          text,
          voice_setting: {
            voice_id: voiceId
          },
          audio_setting: {
            audio_format: "wav",
            sample_rate: 24000
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Minimax TTS API error: ${response.status} - ${errorText}`);
      res.status(503).json({ 
        error: `Text-to-speech service unavailable: Minimax API returned ${response.status}` 
      });
      return;
    }

    // MiniMax returns JSON with HEX encoded audio at data.audio (per official docs)
    const data = await response.json();
    
    // Log for debugging
    console.log("Minimax API response structure:", JSON.stringify(data, null, 2));
    
    // Extract HEX audio from official response format: data.audio
    if (data.data && data.data.audio) {
      // Decode from HEX, not base64 (default output_format is 'hex')
      const audioBuffer = Buffer.from(data.data.audio, 'hex');
      res.setHeader("Content-Type", "audio/wav");
      res.send(audioBuffer);
    } else {
      console.error("Minimax response missing audio data. Full response:", JSON.stringify(data));
      res.status(503).json({ 
        error: 'No audio data in Minimax response',
        debug: data 
      });
    }
  } catch (error: any) {
    console.error("Minimax TTS error:", error);
    res.status(503).json({ 
      error: "Text-to-speech service unavailable: " + error.message 
    });
  }
});

// ============= WebSocket Connection Handler =============
let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

// Store for pending call configurations
const pendingCallConfigs = new Map<string, any>();

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const fullUrl = req.url || "/";
  console.log(`🔌 WebSocket connection request URL: ${fullUrl}`);
  
  const pathname = new URL(fullUrl, `http://${req.headers.host}`).pathname;
  
  if (pathname === "/call" || fullUrl.startsWith("/call")) {
    if (currentCall) currentCall.close();
    currentCall = ws;
    
    // Parse callId from query params (e.g., /call?callId=xyz)
    let callId: string | null = null;
    try {
      const url = new URL(fullUrl, `http://${req.headers.host}`);
      callId = url.searchParams.get('callId');
    } catch (e) {
      // Fallback: parse manually if URL parsing fails
      const match = fullUrl.match(/[?&]callId=([^&]+)/);
      if (match) callId = match[1];
    }
    
    console.log(`🔌 WebSocket connected. CallId: ${callId}`);
    
    const agentConfig = callId ? pendingCallConfigs.get(callId) : undefined;
    
    if (agentConfig) {
      console.log(`✅ Retrieved agent config for callId ${callId}:`, JSON.stringify(agentConfig));
      // Clean up after retrieving
      if (callId) pendingCallConfigs.delete(callId);
    } else {
      console.warn(`⚠️ No agent config found for callId ${callId}. Using defaults.`);
    }
    
    handleCallConnection(currentCall, OPENAI_API_KEY, agentConfig);
  } else if (pathname === "/logs") {
    if (currentLogs) currentLogs.close();
    currentLogs = ws;
    handleFrontendConnection(currentLogs);
  } else {
    ws.close();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
