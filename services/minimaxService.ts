/**
 * Minimax Text-to-Speech Service
 * API Documentation: https://www.minimaxi.com/document/guides/speech-model/T2A
 * 
 * Features:
 * - High-quality TTS with Chinese and English voices
 * - Fast speech-01-turbo model
 * - Backend proxy for security
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

interface VoiceSettings {
  speed?: number;      // 0.5 to 2.0 (default: 1.0)
  vol?: number;        // 0.1 to 10.0 (default: 1.0)
  pitch?: number;      // -12 to 12 (default: 0)
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
 * Convert text to speech using Minimax
 */
export const textToSpeech = async (
  options: TextToSpeechOptions
): Promise<TextToSpeechResponse> => {
  try {
    const voiceId = options.voiceId || 'presenter_female';
    
    const response = await fetch(`${BACKEND_URL}/api/minimax/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: options.text,
        voiceId,
        voiceSettings: options.voiceSettings || {
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
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
    console.error('Minimax TTS error:', error);
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
  blobUrlToFile,
};

