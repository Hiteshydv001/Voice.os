/**
 * ElevenLabs Text-to-Speech Service
 * API Documentation: https://elevenlabs.io/docs
 * 
 * Features:
 * - Text-to-Speech with multiple models
 * - Hardcoded public voices (no API call for voice list)
 * - Backend proxy for security
 * 
 * Note: All API calls are proxied through backend for security
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

// Available TTS models
export const ELEVENLABS_MODELS = {
  TURBO_V2_5: 'eleven_turbo_v2_5',
  MONOLINGUAL_V1: 'eleven_monolingual_v1',
  MULTILINGUAL_V2: 'eleven_multilingual_v2',
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
}

interface VoicesResponse {
  success: boolean;
  voices?: Voice[];
  error?: string;
}

/**
 * Convert text to speech using ElevenLabs
 */
export const textToSpeech = async (
  options: TextToSpeechOptions
): Promise<TextToSpeechResponse> => {
  try {
    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';
    
    const response = await fetch(`${BACKEND_URL}/api/elevenlabs/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: options.text,
        voiceId,
        modelId: options.modelId || ELEVENLABS_MODELS.MONOLINGUAL_V1,
        voiceSettings: options.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend TTS error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

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


/**
 * Get list of available voices from backend
 */
export const getVoices = async (): Promise<VoicesResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/elevenlabs/voices`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      voices: data.voices || [],
    };
  } catch (error) {
    console.error('Failed to load voices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Helper function to convert Blob URL to File
 */
export const blobUrlToFile = async (blobUrl: string, filename: string): Promise<File> => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'audio/wav' });
};

export default {
  textToSpeech,
  getVoices,
  blobUrlToFile,
  ELEVENLABS_MODELS,
};

