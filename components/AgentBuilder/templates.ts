import { AgentTemplate } from '../../types';

export const agentTemplates: AgentTemplate[] = [
  {
    id: 'voice-assistant',
    name: 'Voice Assistant',
    description: 'Complete voice AI: Audio → Deepgram → Gemini → ElevenLabs',
    category: 'voice',
    flow: {
      name: 'Voice Assistant',
      description: 'Talk to AI with voice input and output',
      nodes: [
        {
          id: '1',
          type: 'start',
          position: { x: 100, y: 200 },
          data: {
            label: 'Audio Input',
            config: {
              inputType: 'audio',
            },
          },
        },
        {
          id: '2',
          type: 'stt',
          position: { x: 300, y: 200 },
          data: {
            label: 'Deepgram STT',
            config: {
              model: 'nova-2',
              language: 'en-US',
            },
          },
        },
        {
          id: '3',
          type: 'llm',
          position: { x: 500, y: 200 },
          data: {
            label: 'Gemini 2.0',
            config: {
              provider: 'gemini',
              model: 'gemini-2.0-flash',
              temperature: 0.7,
              systemPrompt: 'You are a friendly voice assistant. Keep responses concise and helpful.',
            },
          },
        },
        {
          id: '4',
          type: 'tts',
          position: { x: 700, y: 200 },
          data: {
            label: 'ElevenLabs TTS',
            config: {
              voice: '21m00Tcm4TlvDq8ikWAM', // Rachel
              model: 'eleven_turbo_v2',
            },
          },
        },
        {
          id: '5',
          type: 'end',
          position: { x: 900, y: 200 },
          data: {
            label: 'Audio Output',
            config: {
              outputType: 'audio',
            },
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' },
      ],
    },
  },
  {
    id: 'text-chatbot',
    name: 'Text Chatbot',
    description: 'Simple text-based AI using Groq',
    category: 'text',
    flow: {
      name: 'Text Chatbot',
      description: 'Fast text conversation with Groq Llama',
      nodes: [
        {
          id: '1',
          type: 'start',
          position: { x: 200, y: 200 },
          data: {
            label: 'Text Input',
            config: {
              inputType: 'text',
            },
          },
        },
        {
          id: '2',
          type: 'llm',
          position: { x: 450, y: 200 },
          data: {
            label: 'Groq Llama 3',
            config: {
              provider: 'groq',
              model: 'llama-3.3-70b-versatile',
              temperature: 0.8,
              systemPrompt: 'You are a helpful assistant that provides clear, accurate answers.',
            },
          },
        },
        {
          id: '3',
          type: 'end',
          position: { x: 700, y: 200 },
          data: {
            label: 'Text Output',
            config: {
              outputType: 'text',
            },
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
      ],
    },
  },
  {
    id: 'text-to-speech',
    name: 'Text to Speech',
    description: 'Convert text to natural voice with ElevenLabs',
    category: 'voice',
    flow: {
      name: 'Text to Speech',
      description: 'High-quality text-to-speech conversion',
      nodes: [
        {
          id: '1',
          type: 'start',
          position: { x: 250, y: 200 },
          data: {
            label: 'Text Input',
            config: {
              inputType: 'text',
            },
          },
        },
        {
          id: '2',
          type: 'tts',
          position: { x: 500, y: 200 },
          data: {
            label: 'ElevenLabs',
            config: {
              voice: 'adam',
              model: 'eleven_multilingual_v2',
            },
          },
        },
        {
          id: '3',
          type: 'end',
          position: { x: 750, y: 200 },
          data: {
            label: 'Audio Output',
            config: {
              outputType: 'audio',
            },
          },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
      ],
    },
  },
];
