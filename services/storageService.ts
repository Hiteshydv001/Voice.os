import { Agent, Lead, Campaign, ActivityLog } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Helper functions for blob/base64 conversion
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/wav;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export interface VoiceProfile {
  id: string;
  name: string;
  voiceUuid?: string;
  elevenLabsVoiceId?: string;
  audioUrl?: string;
  audioBase64?: string;
  createdAt: string;
  status: 'ready' | 'processing' | 'failed';
  type: 'uploaded' | 'recorded' | 'cloned';
  provider?: 'elevenlabs' | 'resemble';
}

export interface SavedAudioFile {
  id: string;
  name: string;
  type: 'recording' | 'tts';
  audioUrl?: string;
  audioBase64?: string;
  mimeType: string;
  duration?: number;
  createdAt: string;
  metadata?: {
    text?: string;
    voiceId?: string;
    voiceName?: string;
    model?: string;
    recordingTime?: number;
  };
}

const getUserKey = (key: string, userId: string) => `vm_${userId}_${key}`;

// Helper to sync with Firestore
const syncToFirestore = async (userId: string, key: string, data: any) => {
  if (!userId) return;
  try {
    const docRef = doc(db, 'users', userId, 'data', key);
    await setDoc(docRef, { data, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.warn(`Failed to sync ${key} to Firestore:`, error);
  }
};

const loadFromFirestore = async <T>(userId: string, key: string): Promise<T | null> => {
  if (!userId) return null;
  try {
    const docRef = doc(db, 'users', userId, 'data', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().data as T;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to load ${key} from Firestore:`, error);
    return null;
  }
};

export const storage = {
  getAgents: async (userId: string): Promise<Agent[]> => {
    if (!userId) {
      console.error('getAgents: No userId provided');
      return [];
    }
    try {
      const key = getUserKey('agents', userId);
      console.log('Loading agents with key:', key);
      
      // Try Firestore first
      const firestoreData = await loadFromFirestore<Agent[]>(userId, 'agents');
      if (firestoreData) {
        console.log(`Loaded ${firestoreData.length} agents from Firestore`);
        localStorage.setItem(key, JSON.stringify(firestoreData));
        return firestoreData;
      }
      
      // Fallback to localStorage
      const localData = localStorage.getItem(key);
      const agents = JSON.parse(localData || '[]');
      console.log(`Loaded ${agents.length} agents from localStorage`);
      return agents;
    } catch (error) {
      console.error('Error loading agents:', error);
      return [];
    }
  },
  saveAgents: async (userId: string, agents: Agent[]) => {
    if (!userId) {
      console.error('saveAgents: No userId provided');
      return;
    }
    const key = getUserKey('agents', userId);
    console.log(`Saving ${agents.length} agents to localStorage with key:`, key);
    localStorage.setItem(key, JSON.stringify(agents));
    console.log('Saved to localStorage, syncing to Firestore...');
    await syncToFirestore(userId, 'agents', agents);
    console.log('Sync to Firestore complete');
  },
  
  getLeads: async (userId: string): Promise<Lead[]> => {
    if (!userId) return [];
    try {
      const firestoreData = await loadFromFirestore<Lead[]>(userId, 'leads');
      if (firestoreData) {
        localStorage.setItem(getUserKey('leads', userId), JSON.stringify(firestoreData));
        return firestoreData;
      }
      return JSON.parse(localStorage.getItem(getUserKey('leads', userId)) || '[]');
    } catch { return []; }
  },
  saveLeads: async (userId: string, leads: Lead[]) => {
    if (!userId) return;
    localStorage.setItem(getUserKey('leads', userId), JSON.stringify(leads));
    await syncToFirestore(userId, 'leads', leads);
  },
  
  getCampaigns: async (userId: string): Promise<Campaign[]> => {
    if (!userId) return [];
    try {
      const firestoreData = await loadFromFirestore<Campaign[]>(userId, 'campaigns');
      if (firestoreData) {
        localStorage.setItem(getUserKey('campaigns', userId), JSON.stringify(firestoreData));
        return firestoreData;
      }
      return JSON.parse(localStorage.getItem(getUserKey('campaigns', userId)) || '[]');
    } catch { return []; }
  },
  saveCampaigns: async (userId: string, campaigns: Campaign[]) => {
    if (!userId) return;
    localStorage.setItem(getUserKey('campaigns', userId), JSON.stringify(campaigns));
    await syncToFirestore(userId, 'campaigns', campaigns);
  },

  getLogs: async (userId: string): Promise<ActivityLog[]> => {
    if (!userId) return [];
    try {
      const firestoreData = await loadFromFirestore<ActivityLog[]>(userId, 'logs');
      if (firestoreData) {
        localStorage.setItem(getUserKey('logs', userId), JSON.stringify(firestoreData));
        return firestoreData;
      }
      return JSON.parse(localStorage.getItem(getUserKey('logs', userId)) || '[]');
    } catch { return []; }
  },
  saveLogs: async (userId: string, logs: ActivityLog[]) => {
    if (!userId) return;
    localStorage.setItem(getUserKey('logs', userId), JSON.stringify(logs));
    await syncToFirestore(userId, 'logs', logs);
  },

  // Voice Profiles Storage
  getVoiceProfiles: async (userId: string): Promise<VoiceProfile[]> => {
    if (!userId) return [];
    try {
      const firestoreData = await loadFromFirestore<VoiceProfile[]>(userId, 'voiceProfiles');
      if (firestoreData && firestoreData.length > 0) {
        // Restore blob URLs from base64
        const restoredVoices = firestoreData.map(voice => {
          if (voice.audioBase64 && !voice.audioUrl) {
            try {
              const blob = base64ToBlob(voice.audioBase64, 'audio/wav');
              voice.audioUrl = URL.createObjectURL(blob);
            } catch (error) {
              console.warn('Failed to restore audio blob:', error);
            }
          }
          return voice;
        });
        localStorage.setItem(getUserKey('voiceProfiles', userId), JSON.stringify(restoredVoices));
        return restoredVoices;
      }
      // Fallback to localStorage
      const localData = localStorage.getItem(getUserKey('voiceProfiles', userId));
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      console.error('Error loading voice profiles:', error);
      return [];
    }
  },
  saveVoiceProfiles: async (userId: string, voices: VoiceProfile[]) => {
    if (!userId) return;
    
    try {
      // Convert blob URLs to base64 for Firestore storage
      const voicesForFirestore = await Promise.all(voices.map(async (voice) => {
        const voiceCopy = { ...voice };
        
        if (voice.audioUrl && voice.audioUrl.startsWith('blob:') && !voice.audioBase64) {
          try {
            const response = await fetch(voice.audioUrl);
            const blob = await response.blob();
            const base64 = await blobToBase64(blob);
            voiceCopy.audioBase64 = base64;
          } catch (error) {
            console.warn('Failed to convert blob to base64:', error);
          }
        }
        
        return voiceCopy;
      }));
      
      localStorage.setItem(getUserKey('voiceProfiles', userId), JSON.stringify(voices));
      await syncToFirestore(userId, 'voiceProfiles', voicesForFirestore);
    } catch (error) {
      console.error('Error saving voice profiles:', error);
    }
  },

  // Saved Audio Files (Recordings & TTS)
  getSavedAudio: async (userId: string): Promise<SavedAudioFile[]> => {
    if (!userId) return [];
    try {
      const firestoreData = await loadFromFirestore<SavedAudioFile[]>(userId, 'savedAudio');
      if (firestoreData && firestoreData.length > 0) {
        const restoredAudio = firestoreData.map(audio => {
          if (audio.audioBase64 && !audio.audioUrl) {
            try {
              const blob = base64ToBlob(audio.audioBase64, audio.mimeType || 'audio/wav');
              audio.audioUrl = URL.createObjectURL(blob);
            } catch (error) {
              console.warn('Failed to restore audio blob:', error);
            }
          }
          return audio;
        });
        localStorage.setItem(getUserKey('savedAudio', userId), JSON.stringify(restoredAudio));
        return restoredAudio;
      }
      const localData = localStorage.getItem(getUserKey('savedAudio', userId));
      return localData ? JSON.parse(localData) : [];
    } catch (error) {
      console.error('Error loading saved audio:', error);
      return [];
    }
  },

  saveSavedAudio: async (userId: string, audioFiles: SavedAudioFile[]) => {
    if (!userId) return;
    
    try {
      const audioForFirestore = await Promise.all(audioFiles.map(async (audio) => {
        const audioCopy = { ...audio };
        
        if (audio.audioUrl && audio.audioUrl.startsWith('blob:') && !audio.audioBase64) {
          try {
            const response = await fetch(audio.audioUrl);
            const blob = await response.blob();
            const base64 = await blobToBase64(blob);
            audioCopy.audioBase64 = base64;
          } catch (error) {
            console.warn('Failed to convert audio blob to base64:', error);
          }
        }
        
        return audioCopy;
      }));
      
      localStorage.setItem(getUserKey('savedAudio', userId), JSON.stringify(audioFiles));
      await syncToFirestore(userId, 'savedAudio', audioForFirestore);
    } catch (error) {
      console.error('Error saving audio files:', error);
    }
  },
};