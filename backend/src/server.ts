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
// ELEVENLABS_API_KEY removed - now using Google Cloud TTS via GEMINI_API_KEY

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
  const { to, from } = req.body;
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
    const call = await client.calls.create({
      url: `${PUBLIC_URL}/twiml`,
      to,
      from,
    });
    res.json({ success: true, callSid: call.sid });
  } catch (error: any) {
    console.error("Error initiating call:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Gemini API Proxy =============
app.post("/api/gemini/generate", async (req: Request, res: Response) => {
  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: "Gemini API key not configured" });
    return;
  }
  
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Google Cloud Text-to-Speech API Proxy =============
// Google Cloud TTS Voices (Free Tier: 1M characters/month Standard, 4M WaveNet)
const GOOGLE_TTS_VOICES = [
  // English (US) - Neural2 voices (high quality, free tier)
  { voice_id: 'en-US-Neural2-A', name: 'Emily', language: 'en-US', gender: 'FEMALE', category: 'premium', description: 'Natural American female voice' },
  { voice_id: 'en-US-Neural2-C', name: 'James', language: 'en-US', gender: 'MALE', category: 'premium', description: 'Professional American male voice' },
  { voice_id: 'en-US-Neural2-D', name: 'Michael', language: 'en-US', gender: 'MALE', category: 'premium', description: 'Authoritative American male voice' },
  { voice_id: 'en-US-Neural2-E', name: 'Jessica', language: 'en-US', gender: 'FEMALE', category: 'premium', description: 'Friendly American female voice' },
  { voice_id: 'en-US-Neural2-F', name: 'Sarah', language: 'en-US', gender: 'FEMALE', category: 'premium', description: 'Warm American female voice' },
  
  // English (US) - Standard voices (always free)
  { voice_id: 'en-US-Standard-A', name: 'Rachel', language: 'en-US', gender: 'MALE', category: 'standard', description: 'Clear American male voice' },
  { voice_id: 'en-US-Standard-B', name: 'David', language: 'en-US', gender: 'MALE', category: 'standard', description: 'Strong American male voice' },
  { voice_id: 'en-US-Standard-C', name: 'Laura', language: 'en-US', gender: 'FEMALE', category: 'standard', description: 'Confident American female voice' },
  { voice_id: 'en-US-Standard-D', name: 'John', language: 'en-US', gender: 'MALE', category: 'standard', description: 'Reliable American male voice' },
  { voice_id: 'en-US-Standard-E', name: 'Emma', language: 'en-US', gender: 'FEMALE', category: 'standard', description: 'Professional American female voice' },
  
  // English (UK)
  { voice_id: 'en-GB-Neural2-A', name: 'Oliver', language: 'en-GB', gender: 'FEMALE', category: 'premium', description: 'British female voice' },
  { voice_id: 'en-GB-Neural2-B', name: 'William', language: 'en-GB', gender: 'MALE', category: 'premium', description: 'British male voice' },
  { voice_id: 'en-GB-Standard-A', name: 'Charlotte', language: 'en-GB', gender: 'FEMALE', category: 'standard', description: 'Standard British female voice' },
  { voice_id: 'en-GB-Standard-B', name: 'Harry', language: 'en-GB', gender: 'MALE', category: 'standard', description: 'Standard British male voice' },
  
  // English (Australia)
  { voice_id: 'en-AU-Neural2-A', name: 'Sophie', language: 'en-AU', gender: 'FEMALE', category: 'premium', description: 'Australian female voice' },
  { voice_id: 'en-AU-Neural2-B', name: 'Jack', language: 'en-AU', gender: 'MALE', category: 'premium', description: 'Australian male voice' },
  
  // English (India)
  { voice_id: 'en-IN-Neural2-A', name: 'Priya', language: 'en-IN', gender: 'FEMALE', category: 'premium', description: 'Indian English female voice' },
  { voice_id: 'en-IN-Neural2-B', name: 'Arjun', language: 'en-IN', gender: 'MALE', category: 'premium', description: 'Indian English male voice' },
  
  // Spanish (Spain)
  { voice_id: 'es-ES-Neural2-A', name: 'Isabella', language: 'es-ES', gender: 'FEMALE', category: 'premium', description: 'Spanish female voice' },
  { voice_id: 'es-ES-Neural2-B', name: 'Diego', language: 'es-ES', gender: 'MALE', category: 'premium', description: 'Spanish male voice' },
  
  // Spanish (US)
  { voice_id: 'es-US-Neural2-A', name: 'Maria', language: 'es-US', gender: 'FEMALE', category: 'premium', description: 'US Spanish female voice' },
  { voice_id: 'es-US-Neural2-B', name: 'Carlos', language: 'es-US', gender: 'MALE', category: 'premium', description: 'US Spanish male voice' },
  
  // French
  { voice_id: 'fr-FR-Neural2-A', name: 'Camille', language: 'fr-FR', gender: 'FEMALE', category: 'premium', description: 'French female voice' },
  { voice_id: 'fr-FR-Neural2-B', name: 'Antoine', language: 'fr-FR', gender: 'MALE', category: 'premium', description: 'French male voice' },
  
  // German
  { voice_id: 'de-DE-Neural2-A', name: 'Anna', language: 'de-DE', gender: 'FEMALE', category: 'premium', description: 'German female voice' },
  { voice_id: 'de-DE-Neural2-B', name: 'Felix', language: 'de-DE', gender: 'MALE', category: 'premium', description: 'German male voice' },
  
  // Italian
  { voice_id: 'it-IT-Neural2-A', name: 'Giulia', language: 'it-IT', gender: 'FEMALE', category: 'premium', description: 'Italian female voice' },
  { voice_id: 'it-IT-Neural2-C', name: 'Marco', language: 'it-IT', gender: 'MALE', category: 'premium', description: 'Italian male voice' },
  
  // Japanese
  { voice_id: 'ja-JP-Neural2-B', name: 'Yuki', language: 'ja-JP', gender: 'FEMALE', category: 'premium', description: 'Japanese female voice' },
  { voice_id: 'ja-JP-Neural2-C', name: 'Takeshi', language: 'ja-JP', gender: 'MALE', category: 'premium', description: 'Japanese male voice' },
  
  // Korean
  { voice_id: 'ko-KR-Neural2-A', name: 'Ji-woo', language: 'ko-KR', gender: 'FEMALE', category: 'premium', description: 'Korean female voice' },
  { voice_id: 'ko-KR-Neural2-C', name: 'Min-jun', language: 'ko-KR', gender: 'MALE', category: 'premium', description: 'Korean male voice' },
  
  // Portuguese (Brazil)
  { voice_id: 'pt-BR-Neural2-A', name: 'Ana', language: 'pt-BR', gender: 'FEMALE', category: 'premium', description: 'Brazilian Portuguese female voice' },
  { voice_id: 'pt-BR-Neural2-B', name: 'Lucas', language: 'pt-BR', gender: 'MALE', category: 'premium', description: 'Brazilian Portuguese male voice' },
  
  // Hindi
  { voice_id: 'hi-IN-Neural2-A', name: 'Ananya', language: 'hi-IN', gender: 'FEMALE', category: 'premium', description: 'Hindi female voice' },
  { voice_id: 'hi-IN-Neural2-C', name: 'Rohan', language: 'hi-IN', gender: 'MALE', category: 'premium', description: 'Hindi male voice' },
];

app.get("/api/elevenlabs/voices", async (req: Request, res: Response) => {
  // Return Google TTS voices in ElevenLabs-compatible format
  res.json({ voices: GOOGLE_TTS_VOICES });
});

app.post("/api/elevenlabs/tts", async (req: Request, res: Response) => {
  if (!GEMINI_API_KEY) {
    res.status(503).json({ 
      error: "Text-to-speech service unavailable: Google Cloud API key not configured" 
    });
    return;
  }

  const { text, voiceId } = req.body;
  if (!text || !voiceId) {
    res.status(400).json({ error: "Missing text or voiceId" });
    return;
  }

  try {
    // Parse voice info from voiceId (format: en-US-Neural2-A)
    const voiceInfo = GOOGLE_TTS_VOICES.find(v => v.voice_id === voiceId);
    const languageCode = voiceInfo?.language || 'en-US';
    const voiceName = voiceId;
    
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google TTS API error: ${response.status} - ${errorText}`);
      
      let errorMessage = `Text-to-speech service unavailable: Google Cloud API returned ${response.status}`;
      
      if (response.status === 403) {
        errorMessage = `Google Cloud Text-to-Speech API is not enabled. Please enable it at: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com`;
      } else if (response.status === 400) {
        errorMessage = `Invalid voice configuration. Voice ID: ${voiceId}`;
      }
      
      res.status(503).json({ error: errorMessage });
      return;
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      res.status(503).json({ error: 'No audio content returned from Google TTS' });
      return;
    }

    // Convert base64 to buffer and send as MP3
    const audioBuffer = Buffer.from(data.audioContent, 'base64');
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
    
  } catch (error: any) {
    console.warn("Google TTS error:", error);
    res.status(503).json({ 
      error: "Text-to-speech service unavailable: " + error.message 
    });
  }
});

let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/call" || pathname === "/voice/openai/stream") {
    if (currentCall) currentCall.close();
    currentCall = ws;
    handleCallConnection(currentCall, OPENAI_API_KEY);
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
