export interface Agent {
  id: string;
  name: string;
  tone: string;
  productDescription: string;
  goal: string;
  script: {
    opening: string;
    closing: string;
    objectionHandling: string;
  };
  voice?: {
    enabled: boolean;
    voiceUuid?: string;
    voiceName?: string;
    previewUrl?: string;
  };
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  city: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
  score?: number;
}

export interface CampaignCallResult {
  leadId: string;
  leadName: string;
  leadPhone: string;
  status: 'Success' | 'Failed' | 'Voicemail' | 'No Answer' | 'Busy';
  duration: number; // in seconds
  timestamp: string;
  notes?: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
}

export interface CallHistoryRecord {
  id: string;
  userId: string;
  callSid?: string; // Twilio Call SID
  agentId: string;
  agentName: string;
  leadId?: string;
  leadName?: string;
  leadPhone: string;
  callType: 'Campaign' | 'Manual';
  campaignId?: string;
  campaignName?: string;
  status: 'Completed' | 'Failed' | 'No Answer' | 'Busy' | 'Voicemail' | 'In Progress';
  duration: number; // in seconds
  timestamp: string;
  startTime: string;
  endTime?: string;
  recordingUrl?: string;
  transcript?: Array<{
    role: 'agent' | 'customer';
    text: string;
    timestamp: string;
  }>;
  script: {
    opening: string;
    closing: string;
    objectionHandling: string;
  };
  aiModel?: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  outcome?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  status: 'Draft' | 'Active' | 'Completed';
  leadsCount: number;
  callsMade: number;
  progress: number;
  callResults?: CampaignCallResult[]; // Detailed call results
  startedAt?: string;
  completedAt?: string;
}

export interface ActivityLog {
  id: number | string;
  phone?: string;
  status?: string;
  time?: string;
  agentName?: string;
  // User activity tracking fields
  action?: string;
  timestamp?: string;
  details?: string;
  userId?: string;
}

export interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
  timestamp: number;
}

// ============= Agent Builder Types (Simplified) =============

export type AgentNodeType = 
  | 'start'
  | 'end'
  | 'llm'      // Gemini or Groq
  | 'stt'      // Deepgram
  | 'tts';     // Minimax

export interface BaseNodeConfig {
  label?: string;
  description?: string;
}

// LLM: Gemini or Groq only
export interface LLMNodeConfig extends BaseNodeConfig {
  provider: 'gemini' | 'groq';
  model: string; // gemini-2.0-flash, llama3-70b-versatile, etc
  temperature: number;
  systemPrompt: string;
}

// STT: Deepgram only
export interface STTNodeConfig extends BaseNodeConfig {
  model: string; // nova-2, base, enhanced
  language?: string;
}

// TTS: Minimax only
export interface TTSNodeConfig extends BaseNodeConfig {
  voice: string; // presenter_female, presenter_male, etc
  model?: string; // speech-02-turbo, speech-01, etc
}

export interface StartNodeConfig extends BaseNodeConfig {
  inputType: 'audio' | 'text';
}

export interface EndNodeConfig extends BaseNodeConfig {
  outputType: 'audio' | 'text';
}

export type NodeConfig =
  | LLMNodeConfig
  | STTNodeConfig
  | TTSNodeConfig
  | StartNodeConfig
  | EndNodeConfig;

export interface AgentNode {
  id: string;
  type: AgentNodeType;
  position: { x: number; y: number };
  data: {
    config: NodeConfig;
    label: string;
  };
}

export interface AgentEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface AgentFlow {
  id: string;
  name: string;
  description?: string;
  userId: string;
  nodes: AgentNode[];
  edges: AgentEdge[];
  memory?: {
    type: 'vector' | 'key_value';
    db: string;
    namespace: string;
  };
  metadata?: {
    version: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
  };
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'voice' | 'text' | 'data' | 'support';
  thumbnail?: string;
  flow: Omit<AgentFlow, 'id' | 'userId'>;
}

// Execution / Runtime Types
export interface AgentExecutionContext {
  sessionId: string;
  flowId: string;
  currentNodeId: string;
  variables: Record<string, any>;
  memory: any[];
  startTime: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
}

export interface AgentExecutionEvent {
  id: string;
  sessionId: string;
  nodeId: string;
  type: 'node_enter' | 'node_exit' | 'tool_call' | 'llm_call' | 'error';
  timestamp: number;
  data: any;
  duration?: number;
}

export interface AgentTestRun {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed';
  events: AgentExecutionEvent[];
  transcript: Array<{ role: string; content: string; timestamp: number }>;
  metrics: {
    totalDuration: number;
    nodeExecutions: Record<string, number>;
    errors: number;
  };
}