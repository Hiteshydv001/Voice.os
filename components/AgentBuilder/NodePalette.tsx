import React from 'react';
import { Play, StopCircle, Brain, Mic, Volume2 } from 'lucide-react';
import { AgentNodeType } from '../../types';

interface NodePaletteProps {
  onAddNode: (type: AgentNodeType) => void;
}

const nodeItems: Array<{
  type: AgentNodeType;
  icon: React.ElementType;
  label: string;
  color: string;
  description: string;
}> = [
  {
    type: 'start',
    icon: Play,
    label: 'Start',
    color: 'bg-green-100 border-green-500',
    description: 'Entry point - Audio or Text input',
  },
  {
    type: 'stt',
    icon: Mic,
    label: 'Speech-to-Text',
    color: 'bg-blue-100 border-blue-500',
    description: 'Deepgram transcription',
  },
  {
    type: 'llm',
    icon: Brain,
    label: 'LLM',
    color: 'bg-purple-100 border-purple-500',
    description: 'Gemini or Groq models',
  },
  {
    type: 'tts',
    icon: Volume2,
    label: 'Text-to-Speech',
    color: 'bg-orange-100 border-orange-500',
    description: 'ElevenLabs voice synthesis',
  },
  {
    type: 'end',
    icon: StopCircle,
    label: 'End',
    color: 'bg-red-100 border-red-500',
    description: 'Output - Audio or Text result',
  },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const onDragStart = (event: React.DragEvent, nodeType: AgentNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-white border-l-4 border-black p-4 overflow-y-auto font-mono">
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase mb-1">Node Palette</h3>
        <p className="text-xs text-stone-500">Drag to canvas</p>
      </div>

      <div className="space-y-2">
        {nodeItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              onClick={() => onAddNode(item.type)}
              className={`${item.color} border-2 p-3 cursor-move hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={18} className="flex-shrink-0" />
                <span className="text-xs font-bold uppercase">{item.label}</span>
              </div>
              <p className="text-xs text-stone-600">{item.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t-2 border-black">
        <h4 className="text-xs font-bold uppercase mb-2">Quick Start</h4>
        <p className="text-xs text-stone-600">
          Build flow: Start → STT → LLM → TTS → End
        </p>
      </div>
    </div>
  );
}
