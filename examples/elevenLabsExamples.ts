/**
 * ElevenLabs Integration Demo
 * 
 * This file contains practical examples of using the ElevenLabs
 * Text-to-Speech (TTS) features in your application. Voice cloning is a paid feature and is coming soon.
 */

import * as elevenLabs from '../services/elevenLabsService';

// ============================================================================
// EXAMPLE 1: Basic Text-to-Speech with Default Voice
// ============================================================================

export const basicTTSExample = async () => {
  console.log('🎙️ Example 1: Basic Text-to-Speech');
  
  const result = await elevenLabs.textToSpeech({
    text: "Hello! Welcome to VoiceMarketing.ai. Let me tell you about our amazing features.",
    // Using Rachel - a pre-made voice (no cloning required)
    voiceId: "21m00Tcm4TlvDq8ikWAM",
  });

  if (result.success && result.audioUrl) {
    console.log('✅ Speech generated successfully!');
    // Play the audio
    const audio = new Audio(result.audioUrl);
    await audio.play();
    return result.audioUrl;
  } else {
    console.error('❌ Failed:', result.error);
    return null;
  }
};

// ============================================================================
// EXAMPLE 2: Advanced TTS with Turbo Model and Custom Settings
// ============================================================================

export const advancedTTSExample = async (voiceId: string, text: string) => {
  console.log('🚀 Example 2: Advanced TTS with Turbo v2.5');
  
  const result = await elevenLabs.textToSpeech({
    text: text,
    voiceId: voiceId,
    modelId: elevenLabs.ELEVENLABS_MODELS.TURBO_V2_5, // Fast & balanced
    voiceSettings: {
      stability: 0.65,           // More consistent
      similarity_boost: 0.85,    // Very close to original
      style: 0.2,               // Slightly expressive
      use_speaker_boost: true,  // Enhanced similarity
    },
    optimize_streaming_latency: 2, // Balanced latency
  });

  if (result.success && result.audioUrl) {
    console.log('✅ Advanced TTS successful!');
    return result.audioUrl;
  } else {
    console.error('❌ Failed:', result.error);
    return null;
  }
};

// ============================================================================
// EXAMPLE 3: Ultra-Low Latency TTS (Real-time Applications)
// ============================================================================

export const realtimeTTSExample = async (voiceId: string, text: string) => {
  console.log('⚡ Example 3: Ultra-Low Latency TTS');
  
  const result = await elevenLabs.textToSpeech({
    text: text,
    voiceId: voiceId,
    modelId: elevenLabs.ELEVENLABS_MODELS.FLASH_V2_5, // Fastest model
    optimize_streaming_latency: 4, // Maximum optimization
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  });

  if (result.success && result.audioUrl) {
    console.log('✅ Real-time TTS successful!');
    return result.audioUrl;
  } else {
    console.error('❌ Failed:', result.error);
    return null;
  }
};

// ============================================================================
// EXAMPLE 4: Multilingual TTS (Non-English Languages)
// ============================================================================

export const multilingualTTSExample = async (voiceId: string) => {
  console.log('🌍 Example 4: Multilingual TTS');
  
  const languages = {
    spanish: "¡Hola! Bienvenido a nuestro servicio de marketing por voz.",
    french: "Bonjour! Bienvenue dans notre service de marketing vocal.",
    german: "Hallo! Willkommen bei unserem Voice-Marketing-Service.",
    italian: "Ciao! Benvenuto nel nostro servizio di marketing vocale.",
  };

  for (const [lang, text] of Object.entries(languages)) {
    console.log(`\n🗣️ Generating ${lang}...`);
    
    const result = await elevenLabs.textToSpeech({
      text: text,
      voiceId: voiceId,
      modelId: elevenLabs.ELEVENLABS_MODELS.MULTILINGUAL_V2, // Supports many languages
    });

    if (result.success && result.audioUrl) {
      console.log(`✅ ${lang} generated successfully!`);
      // Play audio or store it
    } else {
      console.error(`❌ ${lang} failed:`, result.error);
    }
  }
};

// ============================================================================
// EXAMPLE 5: Clone a Voice from Audio File
// ============================================================================

export const cloneVoiceExample = async (_audioFile: File, _voiceName: string) => {
  console.log('🎭 Example 5: Voice Cloning');
  console.warn('Voice cloning is a paid feature and is currently unavailable in this student project.');
  console.warn('Use pre-made ElevenLabs voices for TTS (see examples for pre-made voice usage).');
  // Return null to indicate cloning is not performed in this environment
  return null;
};

// ============================================================================
// EXAMPLE 6: List All Available Voices
// ============================================================================

export const listVoicesExample = async () => {
  console.log('📋 Example 6: List Available Voices');
  
  const result = await elevenLabs.getVoices();

  if (result.success && result.voices) {
    console.log(`✅ Found ${result.voices.length} voices:`);
    
    result.voices.forEach((voice: any, index: number) => {
      console.log(`\n${index + 1}. ${voice.name}`);
      console.log(`   ID: ${voice.voice_id}`);
      console.log(`   Category: ${voice.category}`);
      if (voice.description) {
        console.log(`   Description: ${voice.description}`);
      }
    });

    return result.voices;
  } else {
    console.error('❌ Failed to fetch voices:', result.error);
    return [];
  }
};

// ============================================================================
// EXAMPLE 7: Get Voice Details
// ============================================================================

export const getVoiceDetailsExample = async (voiceId: string) => {
  console.log('🔍 Example 7: Get Voice Details');
  
  const result = await elevenLabs.getVoiceDetails(voiceId);

  if (result.success && result.voice) {
    console.log('✅ Voice details retrieved:');
    console.log('Name:', result.voice.name);
    console.log('Category:', result.voice.category);
    console.log('Settings:', result.voice.settings);
    return result.voice;
  } else {
    console.error('❌ Failed:', result.error);
    return null;
  }
};

// ============================================================================
// EXAMPLE 8: Check User Quota and Subscription
// ============================================================================

export const checkQuotaExample = async () => {
  console.log('📊 Example 8: Check User Quota');
  
  const result = await elevenLabs.getUserInfo();

  if (result.success && result.user) {
    const subscription = result.user.subscription;
    console.log('✅ User Info:');
    console.log('Character Count:', subscription.character_count);
    console.log('Character Limit:', subscription.character_limit);
    console.log('Characters Remaining:', subscription.character_limit - subscription.character_count);
    console.log('Can Use Instant Voice Cloning:', subscription.can_use_instant_voice_cloning);
    
    // Calculate percentage used
    const percentUsed = (subscription.character_count / subscription.character_limit) * 100;
    console.log(`Usage: ${percentUsed.toFixed(1)}%`);
    
    if (percentUsed > 90) {
      console.warn('⚠️ Warning: Approaching character limit!');
    }

    return result.user;
  } else {
    console.error('❌ Failed:', result.error);
    return null;
  }
};

// ============================================================================
// EXAMPLE 9: Streaming TTS (Real-time Audio Generation)
// ============================================================================

export const streamingTTSExample = async (voiceId: string, text: string) => {
  console.log('🌊 Example 9: Streaming TTS');
  
  const stream = await elevenLabs.textToSpeechStream({
    text: text,
    voiceId: voiceId,
    modelId: elevenLabs.ELEVENLABS_MODELS.FLASH_V2_5,
    optimize_streaming_latency: 4,
  });

  if (stream) {
    console.log('✅ Streaming started...');
    
    // Read the stream
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream complete!');
          break;
        }
        
        chunks.push(value);
        console.log(`Received chunk: ${value.length} bytes`);
      }
      
      // Create audio from chunks
      const audioBlob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('✅ Audio ready to play!');
      return audioUrl;
      
    } catch (error) {
      console.error('❌ Streaming error:', error);
      return null;
    }
  } else {
    console.error('❌ Failed to start stream');
    return null;
  }
};

// ============================================================================
// EXAMPLE 10: Complete Workflow - Clone, Test, and Use
// ============================================================================

export const completeWorkflowExample = async (audioFile: File, testText: string) => {
  console.log('🔄 Example 10: Complete Workflow\n');
  
  // Step 1: Clone the voice
  console.log('Step 1: Cloning voice...');
  const cloneResult = await elevenLabs.addVoice({
    name: `Sales Agent Voice ${Date.now()}`,
    description: "Voice for automated sales calls",
    files: [audioFile],
    labels: {
      use_case: "sales",
      quality: "high",
    },
  });

  if (!cloneResult.success || !cloneResult.voiceId) {
    console.error('❌ Voice cloning failed:', cloneResult.error);
    return null;
  }

  const voiceId = cloneResult.voiceId;
  console.log('✅ Voice cloned! ID:', voiceId);

  // Step 2: Test the voice
  console.log('\nStep 2: Testing voice...');
  const testResult = await elevenLabs.textToSpeech({
    text: testText,
    voiceId: voiceId,
    modelId: elevenLabs.ELEVENLABS_MODELS.TURBO_V2_5,
  });

  if (!testResult.success || !testResult.audioUrl) {
    console.error('❌ Test failed:', testResult.error);
    // Clean up - delete the voice
    await elevenLabs.deleteVoice(voiceId);
    return null;
  }

  console.log('✅ Test successful! Playing audio...');
  const audio = new Audio(testResult.audioUrl);
  await audio.play();

  // Step 3: Get voice details
  console.log('\nStep 3: Fetching voice details...');
  const detailsResult = await elevenLabs.getVoiceDetails(voiceId);
  
  if (detailsResult.success) {
    console.log('✅ Voice details:', detailsResult.voice);
  }

  // Step 4: Check quota
  console.log('\nStep 4: Checking quota...');
  const quotaResult = await elevenLabs.getUserInfo();
  
  if (quotaResult.success) {
    console.log('✅ Characters remaining:', 
      quotaResult.user.subscription.character_limit - 
      quotaResult.user.subscription.character_count
    );
  }

  console.log('\n✅ Complete workflow finished successfully!');
  
  return {
    voiceId: voiceId,
    testAudioUrl: testResult.audioUrl,
    voiceDetails: detailsResult.voice,
    userInfo: quotaResult.user,
  };
};

// ============================================================================
// USAGE TIPS
// ============================================================================

/**
 * 💡 Tips for Best Results:
 * 
 * 1. AUDIO QUALITY
 *    - Use clean audio (minimal background noise)
 *    - 30-60 seconds of audio is ideal
 *    - Single speaker only
 *    - Clear, well-articulated speech
 * 
 * 2. MODEL SELECTION
 *    - TURBO_V2_5: Best for most use cases (balanced)
 *    - FLASH_V2_5: Best for real-time/low-latency
 *    - MULTILINGUAL_V2: Best for non-English
 *    - MONOLINGUAL_V1: Original English model
 * 
 * 3. VOICE SETTINGS
 *    - Stability (0-1): Higher = more consistent
 *    - Similarity (0-1): Higher = closer to original
 *    - Style (0-1): Higher = more expressive
 *    - Speaker Boost: Enable for cloned voices
 * 
 * 4. PERFORMANCE
 *    - Cache generated audio when possible
 *    - Use streaming for long texts
 *    - Monitor your API quota
 *    - Batch similar requests when possible
 * 
 * 5. ERROR HANDLING
 *    - Always check result.success
 *    - Handle quota exceeded errors gracefully
 *    - Provide fallback voices
 *    - Log errors for debugging
 */

export default {
  basicTTSExample,
  advancedTTSExample,
  realtimeTTSExample,
  multilingualTTSExample,
  cloneVoiceExample,
  listVoicesExample,
  getVoiceDetailsExample,
  checkQuotaExample,
  streamingTTSExample,
  completeWorkflowExample,
};
