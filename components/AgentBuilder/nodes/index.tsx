import { Play, StopCircle, Brain, Mic, Volume2 } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function StartNode({ data }: any) {
  return <BaseNode data={data} icon={<Play size={18} />} color="bg-green-100" hasInput={false} />;
}

export function EndNode({ data }: any) {
  return <BaseNode data={data} icon={<StopCircle size={18} />} color="bg-red-100" hasOutput={false} />;
}

export function LLMNode({ data }: any) {
  return <BaseNode data={data} icon={<Brain size={18} />} color="bg-purple-100" />;
}

export function STTNode({ data }: any) {
  return <BaseNode data={data} icon={<Mic size={18} />} color="bg-blue-100" />;
}

export function TTSNode({ data }: any) {
  return <BaseNode data={data} icon={<Volume2 size={18} />} color="bg-orange-100" />;
}
