/**
 * Google Cloud Text-to-Speech Service (formerly ElevenLabs)
 * Switched to Google TTS for reliable free tier access
 * 
 * Free Tier: 1 million characters/month (Standard voices)
 * API: https://cloud.google.com/text-to-speech/docs
 * 
 * Features:
 * - 40+ languages supported
 * - Natural sounding voices (Neural2 & Standard)
 * - Multiple voice options per language
 * - Better free tier than ElevenLabs
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

interface VoiceSettings {
  speakingRate?: number;    // 0.25 to 4.0 (default: 1.0)
  pitch?: number;           // -20.0 to 20.0 (default: 0.0)
  volumeGainDb?: number;    // -96.0 to 16.0 (default: 0.0)
}

interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
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
  language: string;
  gender: string;
  category: string;
  description?: string;
}

interface VoicesResponse {
  success: boolean;
  voices?: Voice[];
  error?: string;
}

/**
 * Convert text to speech using Google Cloud TTS
 */
export const textToSpeech = async (
  options: TextToSpeechOptions
): Promise<TextToSpeechResponse> => {
  try {
    // Use default voice if none specified (Emily - Neural2 voice)
    const voiceId = options.voiceId || 'en-US-Neural2-A';
    
    const response = await fetch(`${BACKEND_URL}/api/elevenlabs/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: options.text,
        voiceId,
        voiceSettings: options.voiceSettings || {
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0,
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
    console.error('Google TTS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};


/**
 * Get list of available voices from Google Cloud TTS
 * No API key required - voices are hardcoded in backend
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
};

