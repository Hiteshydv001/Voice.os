// Agent Flow Executor
// Executes agent flows by running nodes in sequence with real API calls

import { AgentNode, AgentEdge, LLMNodeConfig, STTNodeConfig, TTSNodeConfig } from '../types';

export interface ExecutionResult {
  success: boolean;
  output: string | Blob;
  outputType: 'text' | 'audio';
  logs: string[];
  error?: string;
}

export class AgentExecutor {
  private logs: string[] = [];
  private context: Map<string, any> = new Map();

  // Execute the entire flow
  async executeFlow(
    nodes: AgentNode[],
    edges: AgentEdge[],
    input: string | Blob,
    inputType: 'text' | 'audio'
  ): Promise<ExecutionResult> {
    this.logs = [];
    this.context = new Map();
    
    try {
      this.log('🚀 Starting agent flow execution...');
      
      // Find start node
      const startNode = nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error('No start node found in flow');
      }

      // Store initial input
      this.context.set(startNode.id, { output: input, outputType: inputType });
      this.log(`✅ Start node: Input type = ${inputType}`);

      // Build execution order (topological sort)
      const executionOrder = this.getExecutionOrder(nodes, edges, startNode.id);
      this.log(`📋 Execution order: ${executionOrder.map(id => nodes.find(n => n.id === id)?.type).join(' → ')}`);

      // Execute nodes in order
      let currentOutput: any = input;
      let currentOutputType: 'text' | 'audio' = inputType;

      for (let i = 1; i < executionOrder.length; i++) {
        const nodeId = executionOrder[i];
        const node = nodes.find(n => n.id === nodeId);
        
        if (!node) continue;

        // Skip end node (just passes through)
        if (node.type === 'end') {
          this.log(`🏁 End node reached`);
          continue;
        }

        this.log(`\n⚙️ Executing ${node.type.toUpperCase()} node...`);

        // Execute the node
        const result = await this.executeNode(node, currentOutput, currentOutputType);
        currentOutput = result.output;
        currentOutputType = result.outputType;

        // Store result in context
        this.context.set(nodeId, result);
        
        this.log(`✅ ${node.type.toUpperCase()} completed`);
      }

      this.log('\n🎉 Flow execution completed successfully!');

      return {
        success: true,
        output: currentOutput,
        outputType: currentOutputType,
        logs: this.logs,
      };

    } catch (error: any) {
      this.log(`\n❌ Error: ${error.message}`);
      return {
        success: false,
        output: '',
        outputType: 'text',
        logs: this.logs,
        error: error.message,
      };
    }
  }

  // Execute a single node
  private async executeNode(
    node: AgentNode,
    input: any,
    inputType: 'text' | 'audio'
  ): Promise<{ output: any; outputType: 'text' | 'audio' }> {
    
    switch (node.type) {
      case 'stt':
        // STT requires audio input
        if (inputType !== 'audio' || !(input instanceof Blob)) {
          throw new Error(`STT node requires audio input, but received ${inputType} (${typeof input}). Connect STT to Start node with audio input.`);
        }
        return await this.executeSTT(node, input);
      
      case 'llm':
        // LLM requires text input
        if (inputType !== 'text' || typeof input !== 'string') {
          throw new Error(`LLM node requires text input, but received ${inputType} (${typeof input}). Connect LLM after STT or use text Start node.`);
        }
        return await this.executeLLM(node, input);
      
      case 'tts':
        // TTS requires text input
        if (inputType !== 'text' || typeof input !== 'string') {
          throw new Error(`TTS node requires text input, but received ${inputType} (${typeof input}). Connect TTS after LLM or use text Start node.`);
        }
        return await this.executeTTS(node, input);
      
      default:
        this.log(`⚠️ Unknown node type: ${node.type}`);
        return { output: input, outputType: inputType };
    }
  }

  // Execute STT (Speech-to-Text) node
  private async executeSTT(node: AgentNode, audioInput: Blob): Promise<{ output: string; outputType: 'text' }> {
    const config = node.data.config as STTNodeConfig;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

    this.log(`   🎤 Using Deepgram model: ${config.model}`);
    this.log(`   🌍 Language: ${config.language || 'en-US'}`);

    try {
      // Ensure input is a Blob or File
      if (!(audioInput instanceof Blob)) {
        this.log(`   ❌ Invalid input type: ${typeof audioInput}`);
        throw new Error(`Audio input must be a Blob or File object, received: ${typeof audioInput}`);
      }

      this.log(`   📦 Audio input: ${audioInput.size} bytes, type: ${audioInput.type}`);

      // Convert Blob/File to ArrayBuffer
      if (typeof audioInput.arrayBuffer !== 'function') {
        throw new Error('Audio input does not have arrayBuffer method. Browser may not support this feature.');
      }
      
      const arrayBuffer = await audioInput.arrayBuffer();
      
      // Call backend Deepgram proxy
      const response = await fetch(`${backendUrl}/api/deepgram/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: Array.from(new Uint8Array(arrayBuffer)),
          model: config.model,
          language: config.language || 'en-US',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Deepgram API request failed');
      }

      const result = await response.json();
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      
      this.log(`   📝 Transcript: "${transcript}"`);
      
      return { output: transcript, outputType: 'text' };

    } catch (error: any) {
      throw new Error(`STT failed: ${error.message}`);
    }
  }

  // Execute LLM node
  private async executeLLM(node: AgentNode, textInput: string): Promise<{ output: string; outputType: 'text' }> {
    const config = node.data.config as LLMNodeConfig;
    
    this.log(`   🤖 Provider: ${config.provider}`);
    this.log(`   📦 Model: ${config.model}`);
    this.log(`   🌡️ Temperature: ${config.temperature}`);
    this.log(`   💬 Input: "${textInput.substring(0, 100)}${textInput.length > 100 ? '...' : ''}"`);

    if (config.provider === 'gemini') {
      return await this.executeGemini(config, textInput);
    } else if (config.provider === 'groq') {
      return await this.executeGroq(config, textInput);
    } else {
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  // Execute Gemini API
  private async executeGemini(config: LLMNodeConfig, input: string): Promise<{ output: string; outputType: 'text' }> {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

    try {
      const response = await fetch(`${backendUrl}/api/gemini/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input,
          model: config.model,
          temperature: config.temperature,
          systemPrompt: config.systemPrompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gemini API request failed');
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      this.log(`   💬 Response: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      
      return { output: text, outputType: 'text' };

    } catch (error: any) {
      throw new Error(`Gemini LLM failed: ${error.message}`);
    }
  }

  // Execute Groq API
  private async executeGroq(config: LLMNodeConfig, input: string): Promise<{ output: string; outputType: 'text' }> {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

    try {
      const messages: any[] = [];
      
      if (config.systemPrompt) {
        messages.push({ role: 'system', content: config.systemPrompt });
      }
      
      messages.push({ role: 'user', content: input });

      const response = await fetch(`${backendUrl}/api/groq/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: config.model,
          temperature: config.temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Groq API request failed');
      }

      const result = await response.json();
      const text = result.choices?.[0]?.message?.content || '';
      
      this.log(`   💬 Response: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      
      return { output: text, outputType: 'text' };

    } catch (error: any) {
      throw new Error(`Groq LLM failed: ${error.message}`);
    }
  }

  // Execute TTS (Text-to-Speech) node
  private async executeTTS(node: AgentNode, textInput: string): Promise<{ output: Blob; outputType: 'audio' }> {
    const config = node.data.config as TTSNodeConfig;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081';

    this.log(`   🔊 Voice: ${config.voice}`);
    this.log(`   📦 Model: ${config.model || 'speech-02-turbo'}`);
    this.log(`   📝 Text length: ${textInput.length} characters`);

    try {
      const response = await fetch(`${backendUrl}/api/minimax/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textInput,
          voice_id: config.voice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'TTS request failed');
      }

      const audioBlob = await response.blob();
      this.log(`   ✅ Generated audio: ${(audioBlob.size / 1024).toFixed(2)} KB`);
      
      return { output: audioBlob, outputType: 'audio' };

    } catch (error: any) {
      throw new Error(`TTS failed: ${error.message}`);
    }
  }

  // Get execution order using topological sort
  private getExecutionOrder(_nodes: AgentNode[], edges: AgentEdge[], startNodeId: string): string[] {
    const order: string[] = [startNodeId];
    const visited = new Set<string>([startNodeId]);
    
    let currentId = startNodeId;
    
    while (true) {
      // Find next node
      const nextEdge = edges.find(e => e.source === currentId && !visited.has(e.target));
      
      if (!nextEdge) break;
      
      order.push(nextEdge.target);
      visited.add(nextEdge.target);
      currentId = nextEdge.target;
    }
    
    return order;
  }

  // Add log message
  private log(message: string): void {
    console.log(message);
    this.logs.push(message);
  }
}
