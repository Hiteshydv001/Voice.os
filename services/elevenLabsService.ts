/**
 * ElevenLabs Text-to-Speech Service
 * API Documentation: https://elevenlabs.io/docs
 * 
 * Features:
 * - Text-to-Speech with multiple models
 * - Voice management (list, get details, delete)
 * - Streaming support
 * 
 * Note: All API calls are proxied through backend for security
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

// Available TTS models
export const ELEVENLABS_MODELS = {
  TURBO_V2_5: 'eleven_turbo_v2_5',          // Fast & balanced
  FLASH_V2_5: 'eleven_flash_v2_5',          // Ultra-low latency
  MULTILINGUAL_V2: 'eleven_multilingual_v2', // Supports many languages
  MONOLINGUAL_V1: 'eleven_monolingual_v1',  // Original English model
} as const;

export type ElevenLabsModel = typeof ELEVENLABS_MODELS[keyof typeof ELEVENLABS_MODELS];

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
  modelId?: ElevenLabsModel;
  voiceSettings?: VoiceSettings;
  optimize_streaming_latency?: number; // 0-4, higher = lower latency
  output_format?: 'mp3_44100_128' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
}

interface TextToSpeechResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

interface VoicesResponse {
  success: boolean;
  voices?: Voice[];
  error?: string;
}

interface AddVoiceOptions {
  name: string;
  description?: string;
  files: File[];
  labels?: Record<string, string>;
}

interface AddVoiceResponse {
  success: boolean;
  voiceId?: string;
  error?: string;
}

/**
 * Convert text to speech using ElevenLabs
 * Supports multiple models: turbo (fast), flash (lowest latency), multilingual
 */
export const textToSpeech = async (
  options: TextToSpeechOptions
): Promise<TextToSpeechResponse> => {
  try {
    // Use default voice if none specified (Rachel - pre-made voice)
    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';
    
    const response = await fetch(`${BACKEND_URL}/api/elevenlabs/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: options.text,
        voiceId,
        modelId: options.modelId || ELEVENLABS_MODELS.TURBO_V2_5,
        voiceSettings: options.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend TTS error:', errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid API key or unauthorized access');
      } else if (response.status === 422) {
        throw new Error('Invalid voice ID or request parameters');
      } else {
        throw new Error(`API request failed: ${response.status}`);
      }
    }

    // Convert response to blob and create URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      success: true,
      audioUrl,
    };
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Hardcoded default voices (public ElevenLabs voices that work without API key)
const DEFAULT_VOICES: Voice[] = [
  {
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    category: 'premade',
    description: 'Calm, clear American female voice',
  },
  {
    voice_id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    category: 'premade',
    description: 'Confident American female voice',
  },
  {
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    category: 'premade',
    description: 'Soft American female voice',
  },
  {
    voice_id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    category: 'premade',
    description: 'Well-rounded American male voice',
  },
  {
    voice_id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    category: 'premade',
    description: 'Emotional American female voice',
  },
  {
    voice_id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    category: 'premade',
    description: 'Deep American male voice',
  },
];

/**
 * Get list of available voices
 * Falls back to default voices if API key is invalid or rate limited
 */
export const getVoices = async (): Promise<VoicesResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/elevenlabs/voices`);

    if (!response.ok) {
      // If API call fails (401, 429, etc), fall back to default voices
      console.warn(`Backend API error ${response.status}, using default voices`);
      return { success: true, voices: DEFAULT_VOICES };
    }

    const data = await response.json();
    return {
      success: true,
      voices: data.voices || DEFAULT_VOICES,
    };
  } catch (error) {
    console.warn('Backend API error, using default voices:', error);
    // Return default voices instead of failing
    return {
      success: true,
      voices: DEFAULT_VOICES,
    };
  }
};

/**
 * Add a new voice (voice cloning)
 * Note: This feature requires backend implementation for security
 */
export const addVoice = async (
  _options: AddVoiceOptions
): Promise<AddVoiceResponse> => {
  return { 
    success: false, 
    error: 'Voice cloning is not available. This feature requires a paid ElevenLabs subscription and backend implementation.' 
  };
};

/**
 * Delete a voice
 * Note: This feature requires backend implementation for security
 */
export const deleteVoice = async (_voiceId: string): Promise<{ success: boolean; error?: string }> => {
  return { 
    success: false, 
    error: 'Voice management requires backend implementation for security.' 
  };
};

/**
 * Get voice details
 * Note: This feature requires backend implementation for security
 */
export const getVoiceDetails = async (_voiceId: string) => {
  return { 
    success: false, 
    error: 'Voice details require backend implementation for security.' 
  };
};

/**
 * Text-to-Speech with streaming support
 * Note: This feature requires backend implementation for security
 */
export const textToSpeechStream = async (
  _options: TextToSpeechOptions
): Promise<ReadableStream<Uint8Array> | null> => {
  console.warn('Streaming TTS requires backend implementation');
  return null;
};

/**
 * Get user info and subscription details
 * Note: This feature requires backend implementation for security
 */
export const getUserInfo = async () => {
  return { 
    success: false, 
    error: 'User info requires backend implementation for security.' 
  };
};

/**
 * Helper function to convert Blob URL to File for voice cloning
 */
export const blobUrlToFile = async (blobUrl: string, filename: string): Promise<File> => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'audio/wav' });
};

export default {
  textToSpeech,
  textToSpeechStream,
  getVoices,
  addVoice,
  deleteVoice,
  getVoiceDetails,
  getUserInfo,
  blobUrlToFile,
  ELEVENLABS_MODELS,
};
