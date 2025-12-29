// API Key Management Service
// Users can either use platform keys (from env) or provide their own

export interface APIKeys {
  // Gemini
  geminiApiKey?: string;
  useOwnGemini: boolean;
  
  // Groq
  groqApiKey?: string;
  useOwnGroq: boolean;
  
  // Deepgram
  deepgramApiKey?: string;
  useOwnDeepgram: boolean;
  
  // Minimax
  minimaxApiKey?: string;
  useOwnMinimax: boolean;
}

const API_KEYS_STORAGE_KEY = 'voice-agent-api-keys';

// Platform API keys from environment variables
const PLATFORM_KEYS = {
  gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
  groq: import.meta.env.VITE_GROQ_API_KEY || '',
  deepgram: import.meta.env.VITE_DEEPGRAM_API_KEY || '',
  minimax: import.meta.env.VITE_MINIMAX_API_KEY || '',
};

export class APIKeyService {
  // Load user's API key preferences from localStorage
  static loadAPIKeys(): APIKeys {
    try {
      const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
    
    // Default: use platform keys
    return {
      useOwnGemini: false,
      useOwnGroq: false,
      useOwnDeepgram: false,
      useOwnMinimax: false,
    };
  }

  // Save user's API key preferences
  static saveAPIKeys(keys: APIKeys): void {
    try {
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
  }

  // Get the active Gemini API key (user's or platform's)
  static getGeminiKey(): string {
    const keys = this.loadAPIKeys();
    if (keys.useOwnGemini && keys.geminiApiKey) {
      return keys.geminiApiKey;
    }
    return PLATFORM_KEYS.gemini;
  }

  // Get the active Groq API key
  static getGroqKey(): string {
    const keys = this.loadAPIKeys();
    if (keys.useOwnGroq && keys.groqApiKey) {
      return keys.groqApiKey;
    }
    return PLATFORM_KEYS.groq;
  }

  // Get the active Deepgram API key
  static getDeepgramKey(): string {
    const keys = this.loadAPIKeys();
    if (keys.useOwnDeepgram && keys.deepgramApiKey) {
      return keys.deepgramApiKey;
    }
    return PLATFORM_KEYS.deepgram;
  }

  // Get the active Minimax API key
  static getMinimaxKey(): string {
    const keys = this.loadAPIKeys();
    if (keys.useOwnMinimax && keys.minimaxApiKey) {
      return keys.minimaxApiKey;
    }
    return PLATFORM_KEYS.minimax;
  }

  // Check if platform has keys configured
  static hasPlatformKeys(): { [key: string]: boolean } {
    return {
      gemini: !!PLATFORM_KEYS.gemini,
      groq: !!PLATFORM_KEYS.groq,
      deepgram: !!PLATFORM_KEYS.deepgram,
      minimax: !!PLATFORM_KEYS.minimax,
    };
  }

  // Clear all user API keys
  static clearUserKeys(): void {
    localStorage.removeItem(API_KEYS_STORAGE_KEY);
  }

  // Validate API key format (basic check)
  static validateKey(service: string, key: string): boolean {
    if (!key || key.trim().length === 0) {
      return false;
    }

    switch (service) {
      case 'gemini':
        return key.startsWith('AIzaSy') && key.length > 30;
      case 'groq':
        return key.startsWith('gsk_') && key.length > 50;
      case 'deepgram':
        return key.length > 30; // Deepgram keys are long alphanumeric
      case 'minimax':
        return key.length > 20; // Minimax keys vary
      default:
        return key.length > 10; // Basic length check
    }
  }
}
