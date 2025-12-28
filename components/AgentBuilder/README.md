# Visual Agent Flow Builder

A drag-and-drop visual agent builder for creating complex AI agent workflows without code.

## Features

### ✅ Implemented

1. **Visual Canvas**
   - React Flow-based drag-and-drop interface
   - Zoom, pan, and minimap navigation
   - Real-time connection validation
   - Import/Export flows as JSON

2. **Node Types**
   - **Core Nodes**
     - LLM Agent: Configure AI models (OpenAI, Anthropic, Google, Azure)
     - Tool: REST API, GraphQL, SQL, Webhook connectors
     - Memory: Session and long-term vector memory
   
   - **Audio Nodes**
     - Audio Input: WebRTC, microphone, telephony, file
     - Audio Output: WebRTC, speaker, telephony, file
     - STT (Speech-to-Text): Deepgram, Whisper, Google, Azure
     - TTS (Text-to-Speech): ElevenLabs, Deepgram, OpenAI, Google, Azure
   
   - **Control Nodes**
     - Conditional: Branch based on conditions
     - Loop: Repeat operations
     - Error Handler: Retry logic and error handling
     - Timer: Add delays or scheduling
     - Orchestrator: Parallel/sequential execution
   
   - **Flow Nodes**
     - Start: Entry point
     - End: Exit point

3. **Configuration**
   - Node-specific configuration modals
   - Provider selection (LLM, STT, TTS providers)
   - Model parameter tuning (temperature, tokens, etc.)
   - Tool endpoint configuration
   - Memory namespace management

4. **Templates**
   - Voice Assistant: Complete STT → LLM → TTS flow
   - Customer Support: Context-aware support with KB lookup
   - Data Retriever: Multi-source data aggregation

5. **Storage**
   - Firebase integration for saving/loading flows
   - JSON export/import for portability
   - Per-user flow management

## How to Use

### Creating an Agent Flow

1. **Navigate to Flow Builder**
   - Click "FLOW BUILDER" in the sidebar

2. **Add Nodes**
   - Drag nodes from the right palette onto the canvas
   - OR click nodes in the palette to add them
   - Double-click any node (except Start/End) to configure

3. **Connect Nodes**
   - Drag from the output handle (bottom) of one node
   - To the input handle (top) of another node
   - Connections represent data flow

4. **Configure Nodes**
   - Double-click a node to open configuration
   - Set provider, model, prompts, endpoints, etc.
   - Click "Save Configuration"

5. **Save Your Flow**
   - Click "Save" button in the toolbar
   - Flow is saved to Firebase under your account
   - Can be loaded later or exported as JSON

### Using Templates

Quick-start templates are available for common use cases:

- **Voice Assistant**: Real-time voice conversations
- **Customer Support**: Context-aware support agent
- **Data Retriever**: Multi-source data fetching

## Node Configuration Guide

### LLM Node
- **Provider**: OpenAI, Anthropic, Google, Azure
- **Model**: gpt-4, claude-3-opus, gemini-pro, etc.
- **Temperature**: 0.0 (deterministic) to 2.0 (creative)
- **System Prompt**: Instructions for the AI
- **Tools**: External functions the LLM can call
- **Streaming**: Real-time response streaming

### STT Node (Speech-to-Text)
- **Provider**: Deepgram (recommended), Whisper, Google, Azure
- **Model**: nova-2, flux (Deepgram), whisper-1 (OpenAI)
- **Streaming**: Enable for real-time transcription
- **Language**: en-US, es-ES, etc.
- **Punctuate**: Auto-add punctuation

### TTS Node (Text-to-Speech)
- **Provider**: ElevenLabs (highest quality), Deepgram, OpenAI
- **Voice ID**: Select from provider's voice library
- **Stability**: Voice consistency (ElevenLabs)
- **Similarity Boost**: Voice clone fidelity (ElevenLabs)
- **Streaming**: Enable for low-latency playback

### Tool Node
- **Type**: REST, GraphQL, SQL, Webhook, Browser
- **Method**: GET, POST, PUT, DELETE
- **Endpoint**: API URL
- **Headers**: Authorization, Content-Type, etc.
- **Body**: Request payload (for POST/PUT)

### Memory Node
- **Type**: Session (short-term) or Long-term (vector DB)
- **Provider**: Milvus, Weaviate, Pinecone, Local
- **Namespace**: Isolate different agent memories
- **Embedding Model**: For long-term memory search

## Architecture

### Frontend
- **React + TypeScript**: Type-safe component development
- **React Flow**: Canvas and node graph management
- **Tailwind CSS**: Styling
- **Zustand**: State management (via React Flow)

### Backend (Planned)
- **API Layer**: FastAPI (Python) or NestJS (Node.js)
- **Orchestration**: Kafka/Redis Streams for event-driven flows
- **Worker Runtime**: Containerized execution (Docker/K8s)
- **Vector DB**: Milvus/Weaviate for long-term memory
- **Storage**: PostgreSQL for metadata, S3 for assets

### Flow Execution (Planned)
1. User triggers agent flow
2. Event published to message bus (Kafka/Redis)
3. Orchestrator routes to appropriate workers
4. Workers execute nodes sequentially/parallel
5. LLM calls, tool invocations, memory operations
6. Results streamed back to user
7. Full execution trace logged for replay/debug

## Data Structure

### Agent Flow JSON
```json
{
  "id": "flow_123",
  "name": "My Voice Agent",
  "userId": "user_456",
  "nodes": [
    {
      "id": "llm-1",
      "type": "llm",
      "position": { "x": 250, "y": 150 },
      "data": {
        "config": {
          "provider": "openai",
          "model": "gpt-4",
          "temperature": 0.7,
          "systemPrompt": "You are helpful...",
          "tools": []
        },
        "label": "LLM Agent"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start-1",
      "target": "llm-1"
    }
  ],
  "memory": {
    "type": "vector",
    "db": "milvus",
    "namespace": "agent_123"
  },
  "metadata": {
    "version": "1.0",
    "createdAt": "2025-12-12T...",
    "updatedAt": "2025-12-12T...",
    "tags": ["voice", "assistant"]
  }
}
```

## Integration: ElevenLabs & Deepgram

### ElevenLabs (TTS)
- **Use Case**: High-quality, natural voice synthesis
- **Best For**: Customer-facing voice agents
- **Features**: Voice cloning, emotion control, streaming
- **Configuration**: Voice ID, stability, similarity boost

### Deepgram (STT)
- **Use Case**: Real-time speech recognition
- **Models**: 
  - **Flux**: Fastest, lowest latency
  - **Nova-2**: Best accuracy
- **Features**: Streaming, punctuation, language detection
- **Configuration**: Model selection, language, streaming mode

### Example Voice Agent Flow
```
Audio Input (WebRTC)
  ↓
Speech-to-Text (Deepgram Flux)
  ↓
LLM Agent (GPT-4)
  ↓
Text-to-Speech (ElevenLabs)
  ↓
Audio Output (WebRTC)
```

## Roadmap

### Phase 1: MVP (✅ Completed)
- [x] Visual canvas with drag-and-drop
- [x] Core node types (LLM, Tool, Memory)
- [x] Audio nodes (STT, TTS, Audio I/O)
- [x] Control flow nodes
- [x] Configuration modals
- [x] Templates
- [x] Firebase integration
- [x] Import/Export

### Phase 2: Runtime (In Progress)
- [ ] Backend API for flow execution
- [ ] Event-driven orchestration (Kafka/Redis)
- [ ] Worker runtime for node execution
- [ ] Real-time audio streaming (WebRTC)
- [ ] Session management

### Phase 3: Observability
- [ ] Execution trace viewer
- [ ] Step-by-step debugger
- [ ] Metrics dashboard (latency, costs, errors)
- [ ] Transcript viewer
- [ ] Test harness

### Phase 4: Advanced Features
- [ ] Subflow support (reusable components)
- [ ] Version control for flows
- [ ] Collaboration (multi-user editing)
- [ ] Marketplace (publish/share flows)
- [ ] Cost estimation
- [ ] Auto-optimization

## File Structure

```
components/AgentBuilder/
├── AgentBuilderPage.tsx    # Main container
├── AgentCanvas.tsx          # React Flow canvas
├── NodePalette.tsx          # Draggable node list
├── NodeConfigModal.tsx      # Configuration UI
├── templates.ts             # Pre-built flows
├── nodes/
│   ├── BaseNode.tsx         # Shared node UI
│   ├── LLMNode.tsx
│   ├── ToolNode.tsx
│   ├── MemoryNode.tsx
│   ├── AudioNodes.tsx
│   ├── ControlNodes.tsx
│   └── StartEndNodes.tsx
services/
├── agentFlowService.ts      # Firebase CRUD operations
```

## Contributing

To add a new node type:

1. Add type to `types.ts`:
   ```typescript
   export type AgentNodeType = ... | 'my_node';
   export interface MyNodeConfig extends BaseNodeConfig {
     myParam: string;
   }
   ```

2. Create node component in `components/AgentBuilder/nodes/`:
   ```typescript
   export const MyNode: React.FC<NodeProps> = ({ data, selected }) => {
     const config = data.config as MyNodeConfig;
     return <BaseNode icon={...} title="..." color="..." selected={selected}>
       {/* Node content */}
     </BaseNode>;
   };
   ```

3. Add to `nodeTypes` in `AgentCanvas.tsx`
4. Add configuration form in `NodeConfigModal.tsx`
5. Add to palette in `NodePalette.tsx`

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
