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
import functions, { scheduledDemos } from "./functionHandlers";

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
  // Allow the custom ngrok header used by client-side helpers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
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

app.get("/public-url", (_req, res) => {
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
    
    // Get CallSid from Twilio request
    const twilioCallSid = req.query.CallSid as string;
    const callId = req.query.callId as string || (twilioCallSid ? callSidToCallId.get(twilioCallSid) : undefined);
    
    console.log(`📞 TwiML request received (GET). Twilio CallSid: ${twilioCallSid}, Our callId: ${callId}`);
    
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    wsUrl.pathname = `/call`;
    
    if (callId) {
      console.log(`🔗 Building WebSocket URL for callId: ${callId}`);
    }

    // Build TwiML with Stream parameters - pass callId via custom parameter
    if (callId) {
      // Try to include a short TTS opening with the agent name or opening line so the callee hears the correct introduction immediately
      const cfg = pendingCallConfigs.get(callId);
      const openingSay = (cfg && (cfg.opening || cfg.name)) ? `${cfg.opening || `Hello, this is ${cfg.name}`}` : 'Connected';

      const twimlWithParams = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${openingSay}</Say>
  <Connect>
    <Stream url="${wsUrl.toString()}">
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Connect>
  <Say>Disconnected</Say>
</Response>`;

      res.type("text/xml").send(twimlWithParams);
    } else {
      const twimlWithParams = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
      res.type("text/xml").send(twimlWithParams);
    }
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
    
    // Get CallSid from Twilio request
    const twilioCallSid = req.query.CallSid as string || req.body?.CallSid;
    const callId = req.query.callId as string || (twilioCallSid ? callSidToCallId.get(twilioCallSid) : undefined);
    
    console.log(`📞 TwiML request received (POST). Twilio CallSid: ${twilioCallSid}, Our callId: ${callId}`);
    
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    wsUrl.pathname = `/call`;

    if (callId) {
      console.log(`🔗 Building WebSocket URL for callId: ${callId}`);
    }

    // Build TwiML with Stream parameters - pass callId via custom parameter
    if (callId) {
      const cfg = pendingCallConfigs.get(callId);
      const openingSay = (cfg && (cfg.opening || cfg.name)) ? `${cfg.opening || `Hello, this is ${cfg.name}`}` : 'Connected';

      const twimlWithParams = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${openingSay}</Say>
  <Connect>
    <Stream url="${wsUrl.toString()}">
      <Parameter name="callId" value="${callId}" />
    </Stream>
  </Connect>
  <Say>Disconnected</Say>
</Response>`;
      res.type("text/xml").send(twimlWithParams);
    } else {
      const twimlWithParams = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
      res.type("text/xml").send(twimlWithParams);
    }
  } catch (error) {
    console.error("Error generating TwiML:", error);
    res.status(500).send("Error generating TwiML");
  }
});

// Legacy route for backward compatibility
app.post("/voice/openai/incoming", (_req, res) => {
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
app.get("/tools", (_req, res) => {
  res.json(functions.map((f) => f.schema));
});

app.get("/api/twilio", (_req, res) => {
  res.json({
    credentialsSet: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
  });
});

app.get("/api/twilio/numbers", async (_req: Request, res: Response) => {
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
      const config: any = {
        name: agentName,
        opening: agentScript.opening,
        goal: agentScript.goal || "assist the customer",
        tone: agentScript.tone || "Professional and friendly",
      };
      if (req.body.userId) config.userId = req.body.userId;

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
    
    // Map the Twilio CallSid to our callId for later retrieval
    callSidToCallId.set(call.sid, callId);
    console.log(`🔗 Mapped CallSid ${call.sid} to callId ${callId}`);
    
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
  
  // Map to internal callId and any stored agent config
  const mappedCallId = callSidToCallId.get(CallSid);
  const config = mappedCallId ? pendingCallConfigs.get(mappedCallId) : undefined;

  const notification = {
    type: 'call.recording',
    callSid: CallSid,
    callId: mappedCallId,
    recordingUrl: RecordingUrl,
    recordingSid: RecordingSid,
    duration: RecordingDuration,
    agentConfig: config || null
  };

  // Persist call record server-side as a fallback when no client is connected
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const userId = (config && config.userId) || 'unknown';
    const filePath = path.join(dataDir, `call_history_${userId}.json`);
    let existing = [];
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        existing = JSON.parse(raw || '[]');
      }
    } catch (err) {
      console.warn('Failed to read existing call history file:', err);
    }

    const callRecord = {
      id: `srv_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
      userId,
      callSid: CallSid,
      callId: mappedCallId,
      agentName: config?.name || 'Unknown',
      leadPhone: null,
      callType: 'Manual',
      campaignId: null,
      campaignName: null,
      status: 'Completed',
      duration: Number(RecordingDuration) || 0,
      timestamp: new Date().toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      script: { opening: config?.opening || '' },
      aiModel: 'realtime',
      sentiment: 'Neutral',
      outcome: 'Call recorded',
      notes: `Recording saved: ${RecordingSid}`,
      recordingUrl: RecordingUrl,
      recordingSid: RecordingSid
    };

    existing.unshift(callRecord);
    try {
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
      console.log('Saved call record to server data file:', filePath);
    } catch (err) {
      console.warn('Failed to write call history file:', err);
    }
  } catch (err) {
    console.warn('Error persisting call record to server:', err);
  }

  // Notify connected frontend logs client if available
  try {
    if (currentLogs && currentLogs.readyState === WebSocket.OPEN) {
      currentLogs.send(JSON.stringify(notification));
      console.log('Sent call.recording notification to connected logs client for callSid', CallSid);
    } else {
      console.log('No logs websocket connected to send call.recording notification');
    }
  } catch (err) {
    console.warn('Failed to send call recording notification over logs websocket:', err);
  }

  res.sendStatus(200);
});

// Get recording audio file - proxy through backend to avoid auth issues
import type { RequestHandler } from 'express';

const getRecordingHandler: RequestHandler = async (req, res) => {
  // Also support returning metadata from server-side stored call history if available
  const { callSid } = req.params as { callSid: string };
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const files: string[] = fs.readdirSync(dataDir).filter((f: string) => f.startsWith('call_history_'));
      for (const f of files) {
        try {
          const raw = fs.readFileSync(path.join(dataDir, f), 'utf-8');
          const arr = JSON.parse(raw || '[]');
          const found = arr.find((c: any) => c.callSid === callSid);
          if (found) {
            // Return metadata as JSON
            res.json({ found, source: 'server-file' });
            return;
          }
        } catch (err) {}
      }
    }
  } catch (err) {
    // ignore
  }
  
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
};

app.get("/api/twilio/recording/:callSid", getRecordingHandler);

// Demos API
app.get('/api/demos', (_req, res) => {
  res.json({ demos: scheduledDemos });
});

// Server-side call history endpoint (returns persisted server records)
const getServerCallHistory: RequestHandler = (req, res) => {
  try {
    const { userId } = req.params as { userId: string };
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, `call_history_${userId}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const arr = JSON.parse(raw || '[]');
      res.json({ records: arr });
      return;
    }
    res.json({ records: [] });
    return;
  } catch (err) {
    console.error('Error reading server call history:', err);
    res.status(500).json({ error: 'Failed to read server call history' });
    return;
  }
};

app.get('/api/call_history/:userId', getServerCallHistory);

const updateDemo: express.RequestHandler = (req, res) => {
  const id = req.params.id as string;
  const demo = scheduledDemos.find(d => d.id === id);
  if (!demo) { res.status(404).json({ error: 'Demo not found' }); return; }
  const { status } = req.body;
  if (status) {
    demo.status = status;
    // When a demo is marked completed, record the time it was called
    if (status === 'completed') {
      demo.called_at = new Date().toISOString();      console.log(`Demo ${id} marked completed. Called to: ${demo.phone || 'Unknown'}`);    } else if (status === 'cancelled') {
      // Clear called_at when cancelled
      demo.called_at = undefined;
    }
  }
  res.json({ success: true });
};

const deleteDemoHandler: express.RequestHandler = (req, res) => {
  const id = req.params.id as string;
  const idx = scheduledDemos.findIndex(d => d.id === id);
  if (idx === -1) { res.status(404).json({ error: 'Demo not found' }); return; }
  scheduledDemos.splice(idx, 1);
  res.json({ success: true });
};

app.put('/api/demos/:id', updateDemo);
app.delete('/api/demos/:id', deleteDemoHandler);

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
const callSidToCallId = new Map<string, string>(); // Map Twilio CallSid to our callId

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const fullUrl = req.url || "/";
  console.log(`🔌 WebSocket connection request URL: ${fullUrl}`);
  
  const pathname = new URL(fullUrl, `http://${req.headers.host}`).pathname;
  
  if (pathname === "/call" || fullUrl.startsWith("/call")) {
    if (currentCall) currentCall.close();
    currentCall = ws;
    
    console.log(`🔌 WebSocket connected. Waiting for Stream start event with callId...`);
    
    // Pass pendingCallConfigs map to session manager so it can retrieve config from start event
    handleCallConnection(currentCall, OPENAI_API_KEY, pendingCallConfigs);
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
