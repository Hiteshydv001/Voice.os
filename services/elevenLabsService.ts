/**
 * ElevenLabs Text-to-Speech Service
 * API Documentation: https://elevenlabs.io/docs
 * 
 * Features:
 * - Text-to-Speech with multiple models
 * - Voice management (list, get details, delete)
 * - Streaming support
 * 
 * Note: Instant Voice Cloning is a paid feature and is currently unavailable in this student project.
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const BASE_URL = 'https://api.elevenlabs.io/v1';

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
  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key not found');
    return { success: false, error: 'API key not configured' };
  }

  try {
    // Use default voice if none specified (Rachel - pre-made voice)
    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';
    
    const payload: any = {
      text: options.text,
      model_id: options.modelId || ELEVENLABS_MODELS.TURBO_V2_5,
      voice_settings: options.voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    };

    // Add optional parameters if provided
    if (options.optimize_streaming_latency !== undefined) {
      payload.optimize_streaming_latency = options.optimize_streaming_latency;
    }
    if (options.output_format) {
      payload.output_format = options.output_format;
    }
    
    const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      
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

/**
 * Get list of available voices
 */
export const getVoices = async (): Promise<VoicesResponse> => {
  if (!ELEVENLABS_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(`${BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      voices: data.voices,
    };
  } catch (error) {
    console.error('ElevenLabs get voices error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Add a new voice (voice cloning)
 */
export const addVoice = async (
  options: AddVoiceOptions
): Promise<AddVoiceResponse> => {
  if (!ELEVENLABS_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }

  // Quick subscription check: avoid sending files if cloning not permitted
  try {
    const info = await getUserInfo();
    if (info.success) {
      const canClone = info.user?.subscription?.can_use_instant_voice_cloning;
      if (!canClone) {
        return { success: false, error: 'Your subscription does not permit instant voice cloning (feature coming soon in this project).' };
      }
    }
  } catch (e) {
    // If we can't retrieve user info, continue and let API provide the detailed error
    console.warn('Could not verify subscription for cloning, continuing to attempt addVoice');
  }

  try {
    const formData = new FormData();
    formData.append('name', options.name);
    
    if (options.description) {
      formData.append('description', options.description);
    }

    // Add audio files
    options.files.forEach((file, index) => {
      formData.append('files', file, `sample_${index}.${file.name.split('.').pop()}`);
    });

    // Add labels if provided
    if (options.labels) {
      formData.append('labels', JSON.stringify(options.labels));
    }

    const response = await fetch(`${BASE_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail?.message || `Failed to add voice: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      voiceId: data.voice_id,
    };
  } catch (error) {
    console.error('ElevenLabs add voice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete a voice
 */
export const deleteVoice = async (voiceId: string): Promise<{ success: boolean; error?: string }> => {
  if (!ELEVENLABS_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(`${BASE_URL}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete voice: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('ElevenLabs delete voice error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get voice details
 */
export const getVoiceDetails = async (voiceId: string) => {
  if (!ELEVENLABS_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(`${BASE_URL}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voice details: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      voice: data,
    };
  } catch (error) {
    console.error('ElevenLabs get voice details error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Text-to-Speech with streaming support
 * Useful for real-time applications where audio should start playing before full generation
 */
export const textToSpeechStream = async (
  options: TextToSpeechOptions
): Promise<ReadableStream<Uint8Array> | null> => {
  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key not found');
    return null;
  }

  try {
    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';
    
    const payload: any = {
      text: options.text,
      model_id: options.modelId || ELEVENLABS_MODELS.TURBO_V2_5,
      voice_settings: options.voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    };

    if (options.optimize_streaming_latency !== undefined) {
      payload.optimize_streaming_latency = options.optimize_streaming_latency;
    }

    const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('ElevenLabs streaming API error:', response.status);
      return null;
    }

    return response.body;
  } catch (error) {
    console.error('ElevenLabs streaming TTS error:', error);
    return null;
  }
};

/**
 * Get user info and subscription details
 */
export const getUserInfo = async () => {
  if (!ELEVENLABS_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(`${BASE_URL}/user`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      user: data,
    };
  } catch (error) {
    console.error('ElevenLabs get user info error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
