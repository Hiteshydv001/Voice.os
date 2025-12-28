/**
 * Resemble AI Voice Cloning Service
 * API Documentation: https://docs.resemble.ai/
 */

const RESEMBLE_API_KEY = import.meta.env.VITE_RESEMBLE_API_KEY || '';
const SYNTHESIS_ENDPOINT = 'https://f.cluster.resemble.ai/synthesize';
const STREAMING_ENDPOINT = 'https://f.cluster.resemble.ai/stream';

/**
 * Convert base64 string to Blob
 */
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

interface SynthesizeOptions {
  text: string;
  voiceUuid?: string;
  sampleRate?: number;
  precision?: 'PCM_16' | 'PCM_24' | 'PCM_32';
  outputFormat?: 'wav' | 'mp3';
  raw?: boolean;
}

interface SynthesizeResponse {
  success: boolean;
  item?: {
    id: string;
    audio_src: string;
    duration: number;
  };
  error?: string;
}

interface StreamOptions {
  text: string;
  voiceUuid?: string;
  sampleRate?: number;
}

/**
 * Synthesize text to speech using Resemble AI
 * @param options - Synthesis configuration
 * @returns Audio URL or base64 audio data
 */
export const synthesizeVoice = async (
  options: SynthesizeOptions
): Promise<SynthesizeResponse> => {
  if (!RESEMBLE_API_KEY) {
    console.error('Resemble AI API key not found');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(SYNTHESIS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': RESEMBLE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: options.text,
        voice_uuid: options.voiceUuid,
        sample_rate: options.sampleRate || 22050,
        precision: options.precision || 'PCM_16',
        output_format: options.outputFormat || 'wav',
        raw: options.raw || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resemble API error response:', errorText);
      throw new Error(`Unauthorized: invalid token or not permitted to use the voice or not permitted to save to the project`);
    }

    const data = await response.json();
    
    // Check if response contains audio_content (base64) or item
    if (data.audio_content) {
      // Convert base64 to blob URL
      const audioBlob = base64ToBlob(data.audio_content, 'audio/wav');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return {
        success: true,
        item: {
          id: Date.now().toString(),
          audio_src: audioUrl,
          duration: data.duration || 0,
        },
      };
    }
    
    return {
      success: true,
      item: data.item,
    };
  } catch (error) {
    console.error('Resemble AI synthesis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Stream voice synthesis for real-time playback
 * @param options - Streaming configuration
 * @returns ReadableStream for audio chunks
 */
export const streamVoice = async (
  options: StreamOptions
): Promise<ReadableStream | null> => {
  if (!RESEMBLE_API_KEY) {
    console.error('Resemble AI API key not found');
    return null;
  }

  try {
    const response = await fetch(STREAMING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEMBLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: options.text,
        voice_uuid: options.voiceUuid,
        sample_rate: options.sampleRate || 44100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`);
    }

    return response.body;
  } catch (error) {
    console.error('Resemble AI streaming error:', error);
    return null;
  }
};

/**
 * Generate voice preview for agent script
 * @param text - Script text to synthesize
 * @param voiceUuid - Optional voice ID
 */
export const generateVoicePreview = async (
  text: string,
  voiceUuid?: string
): Promise<string | null> => {
  const result = await synthesizeVoice({
    text,
    voiceUuid,
    outputFormat: 'mp3',
  });

  if (result.success && result.item) {
    return result.item.audio_src;
  }

  return null;
};

/**
 * Play voice audio in browser
 * @param audioUrl - URL or base64 audio data
 */
export const playVoiceAudio = (audioUrl: string): HTMLAudioElement | null => {
  try {
    const audio = new Audio(audioUrl);
    audio.play();
    return audio;
  } catch (error) {
    console.error('Error playing audio:', error);
    return null;
  }
};

/**
 * List available voices (if API provides this endpoint)
 * Note: Update this based on actual Resemble AI API documentation
 */
export const listVoices = async (): Promise<any[]> => {
  if (!RESEMBLE_API_KEY) {
    console.error('Resemble AI API key not found');
    return [];
  }

  try {
    // Replace with actual voices endpoint when available
    const response = await fetch('https://f.cluster.resemble.ai/voices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEMBLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching voices:', error);
    return [];
  }
};

export default {
  synthesizeVoice,
  streamVoice,
  generateVoicePreview,
  playVoiceAudio,
  listVoices,
};
