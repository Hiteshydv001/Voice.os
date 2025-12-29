import React, { useCallback, useState, useRef, DragEvent, useEffect } from 'react';
import { Node, Edge, ReactFlowProvider, useReactFlow } from 'reactflow';
import { AgentCanvas } from './AgentCanvas';
import { NodePalette } from './NodePalette';
import { NodeConfigModal } from './NodeConfigModal';
import { APIKeysModal } from './APIKeysModal';
import { TestRunnerModal } from './TestRunnerModal';
import { AgentNodeType, NodeConfig, AgentFlow } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { saveAgentFlow, createNewFlow, loadUserFlows } from '../../services/agentFlowService';
import { agentTemplates } from './templates';
import { Layers, Plus, Loader2, Play, Download, Upload, Key, Trash2 } from 'lucide-react';

let nodeIdCounter = 1;

const AgentBuilderContent: React.FC = () => {
  const reactFlowInstance = useReactFlow();
  const { currentUser } = useAuth();
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'start-1',
      type: 'start',
      position: { x: 250, y: 50 },
      data: { config: {}, label: 'Start' },
    },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFlowName, setSaveFlowName] = useState('');
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('New Agent Flow');
  const [saving, setSaving] = useState(false);
  const [userFlows, setUserFlows] = useState<AgentFlow[]>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load user flows on mount
  useEffect(() => {
    if (currentUser) {
      loadUserFlows(currentUser.uid)
        .then(flows => setUserFlows(flows))
        .catch(err => console.error('Failed to load flows:', err));
    }
  }, [currentUser]);

  const getDefaultConfig = (type: AgentNodeType): NodeConfig => {
    switch (type) {
      case 'llm':
        return {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
        };
      case 'stt':
        return {
          model: 'nova-2',
          language: 'en-US',
        };
      case 'tts':
        return {
          voice: 'presenter_female',
          model: 'speech-02-turbo',
        };
      case 'start':
        return {
          inputType: 'text',
        };
      case 'end':
        return {
          outputType: 'text',
        };
      default:
        return { inputType: 'text' as const };
    }
  };

  const getNodeLabel = (type: AgentNodeType): string => {
    switch (type) {
      case 'llm':
        return 'LLM';
      case 'stt':
        return 'Speech-to-Text';
      case 'tts':
        return 'Text-to-Speech';
      case 'start':
        return 'Start';
      case 'end':
        return 'End';
      default:
        return type;
    }
  };

  const addNode = useCallback(
    (type: AgentNodeType, position?: { x: number; y: number }) => {
      const id = `${type}-${nodeIdCounter++}`;
      const newNode: Node = {
        id,
        type,
        position: position || {
          x: Math.random() * 300 + 200,
          y: Math.random() * 300 + 200,
        },
        data: {
          config: getDefaultConfig(type),
          label: getNodeLabel(type),
        },
      };
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    []
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as AgentNodeType;
      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(type, position);
    },
    [reactFlowInstance, addNode]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== 'start' && node.type !== 'end') {
        setSelectedNode(node);
        setShowConfigModal(true);
      }
    },
    []
  );

  const handleDeleteSelected = useCallback(() => {
    const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
    const selectedEdgeIds = edges.filter(e => e.selected).map(e => e.id);
    
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      alert('No nodes or connections selected. Click on a node or edge to select it, then click Delete.');
      return;
    }

    const confirmMessage = `Delete ${selectedNodeIds.length} node(s) and ${selectedEdgeIds.length} connection(s)?`;
    if (confirm(confirmMessage)) {
      // Delete selected nodes
      setNodes(prevNodes => prevNodes.filter(n => !n.selected));
      
      // Delete selected edges and edges connected to deleted nodes
      setEdges(prevEdges => 
        prevEdges.filter(e => 
          !e.selected && 
          !selectedNodeIds.includes(e.source) && 
          !selectedNodeIds.includes(e.target)
        )
      );
    }
  }, [nodes, edges, setNodes, setEdges]);

  const handleSaveConfig = useCallback(
    (nodeId: string, config: NodeConfig) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, config } }
            : node
        )
      );
    },
    [setNodes]
  );

  const handleSaveFlow = useCallback(async () => {
    if (!currentUser) {
      alert('Please login to save flows');
      return;
    }

    // Show dialog to ask for name
    setSaveFlowName(flowName);
    setShowSaveDialog(true);
  }, [currentUser, flowName]);

  const handleConfirmSave = useCallback(async () => {
    if (!currentUser) return;
    
    const name = saveFlowName.trim();
    if (!name) {
      alert('Please enter a flow name');
      return;
    }

    setSaving(true);
    setShowSaveDialog(false);
    
    try {
      const flow: AgentFlow = {
        id: currentFlowId || `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        description: '',
        userId: currentUser.uid,
        nodes: nodes as any,
        edges: edges as any,
        metadata: {
          version: '1.0',
          createdAt: currentFlowId ? userFlows.find(f => f.id === currentFlowId)?.metadata?.createdAt || new Date().toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [],
        },
      };

      console.log('Saving flow:', flow);
      await saveAgentFlow(currentUser.uid, flow);
      setCurrentFlowId(flow.id);
      setFlowName(name);
      
      // Reload flows
      const flows = await loadUserFlows(currentUser.uid);
      setUserFlows(flows);
      
      alert('Flow saved successfully!');
    } catch (error: any) {
      console.error('Save failed:', error);
      alert(`Failed to save flow: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [currentUser, currentFlowId, saveFlowName, nodes, edges, userFlows]);

  const handleLoadFlow = useCallback((flow: AgentFlow) => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setCurrentFlowId(flow.id);
    setFlowName(flow.name);
    alert(`Loaded flow: ${flow.name}`);
  }, [setNodes, setEdges]);

  const handleNewFlow = useCallback(() => {
    if (confirm('Create a new flow? Unsaved changes will be lost.')) {
      const newFlow = createNewFlow(currentUser?.uid || '', 'New Agent Flow');
      setNodes(newFlow.nodes);
      setEdges(newFlow.edges);
      setCurrentFlowId(null);
      setFlowName(newFlow.name);
    }
  }, [currentUser, setNodes, setEdges]);

  const handleLoadTemplate = useCallback((templateId: string) => {
    const template = agentTemplates.find(t => t.id === templateId);
    if (!template) return;

    if (confirm(`Load template: ${template.name}? Current work will be replaced.`)) {
      setNodes(template.flow.nodes);
      setEdges(template.flow.edges);
      setCurrentFlowId(null);
      setFlowName(template.name);
      setShowTemplates(false);
      alert(`Template "${template.name}" loaded successfully!`);
    }
  }, [setNodes, setEdges]);

  const handleTestFlow = useCallback(() => {
    setShowTestRunner(true);
  }, []);

  const handleExportFlow = useCallback(() => {
    const flow: AgentFlow = {
      id: currentFlowId || 'exported-flow',
      name: flowName,
      nodes: nodes as any,
      edges: edges as any,
      userId: currentUser?.uid || 'anonymous',
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const dataStr = JSON.stringify(flow, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `${flowName.replace(/\s+/g, '-').toLowerCase()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [currentFlowId, flowName, nodes, edges, currentUser]);

  const handleImportFlow = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as AgentFlow;
          setFlowName(imported.name);
          setNodes(imported.nodes);
          setEdges(imported.edges);
          setCurrentFlowId(null); // Treat as new flow
          alert(`Flow "${imported.name}" imported successfully!`);
        } catch (error) {
          alert('Failed to import flow. Invalid file format.');
        }
      };
      reader.readAsText(file);
      // Reset input
      event.target.value = '';
    },
    [setNodes, setEdges]
  );

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-white border-b-4 border-black p-4 flex items-center justify-between font-mono">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="px-3 py-2 border-2 border-black font-bold uppercase text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Flow Name"
          />
          <span className="text-xs text-stone-500">
            {nodes.length} nodes • {edges.length} connections
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewFlow}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-black hover:bg-stone-100 transition-colors uppercase"
          >
            <Plus size={16} />
            New
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-black hover:bg-stone-100 transition-colors uppercase"
          >
            <Layers size={16} />
            Templates
          </button>
          <button
            onClick={handleSaveFlow}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-orange-600 text-white border-2 border-black hover:bg-orange-700 transition-colors uppercase disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : '💾'}
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleTestFlow}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-green-600 text-white border-2 border-black hover:bg-green-700 transition-colors uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            <Play size={16} />
            Test
          </button>
          <button
            onClick={() => setShowAPIKeys(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 text-white border-2 border-black hover:bg-blue-700 transition-colors uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            <Key size={16} />
            API Keys
          </button>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-red-600 text-white border-2 border-black hover:bg-red-700 transition-colors uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            title="Delete selected nodes/edges (or press Delete key)"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            onClick={handleExportFlow}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-black hover:bg-stone-100 transition-colors uppercase"
          >
            <Download size={16} />
            Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 border-black hover:bg-stone-100 transition-colors uppercase cursor-pointer">
            <Upload size={16} />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportFlow}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex" ref={reactFlowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
        <div className="flex-1">
          <AgentCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
        </div>
        <NodePalette onAddNode={(type: AgentNodeType) => addNode(type)} />
      </div>

      {/* Config Modal */}
      {showConfigModal && selectedNode && (
        <NodeConfigModal
          nodeId={selectedNode.id}
          nodeType={selectedNode.type as AgentNodeType}
          currentConfig={selectedNode.data.config}
          onSave={handleSaveConfig}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedNode(null);
          }}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-black max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between p-4 border-b-4 border-black bg-stone-900">
              <h2 className="text-lg font-bold text-white uppercase font-mono">Agent Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-white hover:text-orange-400 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentTemplates.map(template => (
                  <div
                    key={template.id}
                    className="border-2 border-black p-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    onClick={() => handleLoadTemplate(template.id)}
                  >
                    <h3 className="font-bold text-lg uppercase mb-2 font-mono">{template.name}</h3>
                    <p className="text-sm text-stone-600 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-1 bg-black text-white uppercase font-mono">
                        {template.category}
                      </span>
                      <span className="text-xs text-stone-500">
                        {template.flow.nodes.length} nodes
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* User's Saved Flows */}
              {userFlows.length > 0 && (
                <>
                  <div className="border-t-4 border-black mt-6 pt-6">
                    <h3 className="font-bold text-lg uppercase mb-4 font-mono">Your Saved Flows</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userFlows.map(flow => (
                        <div
                          key={flow.id}
                          className="border-2 border-black p-4 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer bg-stone-50"
                          onClick={() => {
                            handleLoadFlow(flow);
                            setShowTemplates(false);
                          }}
                        >
                          <h3 className="font-bold text-lg uppercase mb-2 font-mono">{flow.name}</h3>
                          <p className="text-xs text-stone-500 mb-2">
                            Updated: {new Date(flow.metadata?.updatedAt || '').toLocaleDateString()}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-600">
                              {flow.nodes.length} nodes • {flow.edges.length} connections
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono">
            <h2 className="text-xl font-bold uppercase mb-4">Save Agent Flow</h2>
            <div className="mb-4">
              <label className="block text-sm font-bold uppercase mb-2">
                Flow Name
              </label>
              <input
                type="text"
                value={saveFlowName}
                onChange={(e) => setSaveFlowName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter flow name..."
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmSave();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmSave}
                disabled={saving || !saveFlowName.trim()}
                className="flex-1 py-2 px-4 bg-orange-600 text-white border-2 border-black font-bold uppercase hover:bg-orange-700 disabled:bg-stone-300 disabled:text-stone-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                disabled={saving}
                className="flex-1 py-2 px-4 bg-white border-2 border-black font-bold uppercase hover:bg-stone-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Runner Modal */}
      <TestRunnerModal
        isOpen={showTestRunner}
        onClose={() => setShowTestRunner(false)}
        nodes={nodes as any}
        edges={edges as any}
        flowName={flowName}
      />

      {/* API Keys Modal */}
      <APIKeysModal isOpen={showAPIKeys} onClose={() => setShowAPIKeys(false)} />
    </div>
  );
};

export const AgentBuilderPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <AgentBuilderContent />
    </ReactFlowProvider>
  );
};
