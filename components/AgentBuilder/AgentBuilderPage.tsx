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
import { Layers, Plus, Loader2, Play, Download, Upload, Key, Trash2, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { useCustomAlert } from '../ui/custom-alert';

let nodeIdCounter = 1;

const AgentBuilderContent: React.FC = () => {
  const reactFlowInstance = useReactFlow();
  const { currentUser } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<{ templateId: string; templateName: string } | null>(null);
  const [showNewFlowDialog, setShowNewFlowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogData, setDeleteDialogData] = useState<{ nodeCount: number; edgeCount: number; selectedNodeIds: string[]; selectedEdgeIds: string[] } | null>(null);
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
          voice: '21m00Tcm4TlvDq8ikWAM', // Rachel
          model: 'eleven_monolingual_v1',
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
      showAlert('No nodes or connections selected. Click on a node or edge to select it, then click Delete.', { type: 'warning' });
      return;
    }

    setDeleteDialogData({
      nodeCount: selectedNodeIds.length,
      edgeCount: selectedEdgeIds.length,
      selectedNodeIds,
      selectedEdgeIds
    });
    setShowDeleteDialog(true);
  }, [nodes, edges, showAlert]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteDialogData) return;

    const { selectedNodeIds } = deleteDialogData;

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

    setShowDeleteDialog(false);
    setDeleteDialogData(null);
  }, [deleteDialogData, setNodes, setEdges]);

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
      showAlert('Please login to save flows', { type: 'warning' });
      return;
    }

    // Show dialog to ask for name
    setSaveFlowName(flowName);
    setShowSaveDialog(true);
  }, [currentUser, flowName, showAlert]);

  const handleConfirmSave = useCallback(async () => {
    if (!currentUser) return;
    
    const name = saveFlowName.trim();
    if (!name) {
      showAlert('Please enter a flow name', { type: 'warning' });
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
      
      showAlert('Flow saved successfully!', { type: 'success' });
    } catch (error: any) {
      console.error('Save failed:', error);
      showAlert(`Failed to save flow: ${error.message || 'Unknown error'}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [currentUser, currentFlowId, saveFlowName, nodes, edges, userFlows, showAlert]);

  const handleLoadFlow = useCallback((flow: AgentFlow) => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setCurrentFlowId(flow.id);
    setFlowName(flow.name);
    showAlert(`Loaded flow: ${flow.name}`, { type: 'success' });
  }, [setNodes, setEdges, showAlert]);

  const handleNewFlow = useCallback(() => {
    setShowNewFlowDialog(true);
  }, []);

  const handleConfirmNewFlow = useCallback(() => {
    const newFlow = createNewFlow(currentUser?.uid || '', 'New Agent Flow');
    setNodes(newFlow.nodes);
    setEdges(newFlow.edges);
    setCurrentFlowId(null);
    setFlowName(newFlow.name);
    setShowNewFlowDialog(false);
  }, [currentUser, setNodes, setEdges]);

  const handleLoadTemplate = useCallback((templateId: string) => {
    const template = agentTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Show custom confirmation dialog
    setConfirmDialogData({ templateId, templateName: template.name });
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmLoadTemplate = useCallback(() => {
    if (!confirmDialogData) return;
    
    const template = agentTemplates.find(t => t.id === confirmDialogData.templateId);
    if (!template) return;

    setNodes(template.flow.nodes);
    setEdges(template.flow.edges);
    setCurrentFlowId(null);
    setFlowName(template.name);
    setShowTemplates(false);
    setShowConfirmDialog(false);
    setConfirmDialogData(null);
    showAlert(`Template "${template.name}" loaded successfully!`, { type: 'success' });
  }, [confirmDialogData, setNodes, setEdges, showAlert]);

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
          showAlert(`Flow "${imported.name}" imported successfully!`, { type: 'success' });
        } catch (error) {
          showAlert('Failed to import flow. Invalid file format.', { type: 'error' });
        }
      };
      reader.readAsText(file);
      // Reset input
      event.target.value = '';
    },
    [setNodes, setEdges, showAlert]
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 font-mono">
          <div className="bg-white border-4 border-black max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-[#0c0c0c]">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Agent Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-white hover:text-orange-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[calc(80vh-80px)] bg-stone-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {agentTemplates.map(template => (
                  <div
                    key={template.id}
                    className="group bg-white border-2 border-black p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0 active:shadow-none relative"
                    onClick={() => handleLoadTemplate(template.id)}
                  >
                    <h3 className="font-black text-lg uppercase mb-4 tracking-wide">{template.name}</h3>
                    <p className="text-stone-600 text-sm mb-8 leading-relaxed min-h-[40px]">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs font-bold px-3 py-1.5 bg-black text-white uppercase tracking-wider">
                        {template.category}
                      </span>
                      <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                        {template.flow.nodes.length} nodes
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* User's Saved Flows */}
              {userFlows.length > 0 && (
                <>
                  <div className="border-t-4 border-black mt-8 pt-8">
                    <h3 className="font-black text-xl uppercase mb-6 tracking-wider">Your Saved Flows</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {userFlows.map(flow => (
                        <div
                          key={flow.id}
                          className="group bg-white border-2 border-black p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                          onClick={() => {
                            handleLoadFlow(flow);
                            setShowTemplates(false);
                          }}
                        >
                          <h3 className="font-black text-lg uppercase mb-2 tracking-wide">{flow.name}</h3>
                          <p className="text-xs text-stone-500 mb-6 font-bold uppercase tracking-wider">
                            Updated: {new Date(flow.metadata?.updatedAt || '').toLocaleDateString()}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold px-3 py-1.5 bg-stone-200 text-stone-600 uppercase tracking-wider group-hover:bg-black group-hover:text-white transition-colors">
                              Saved Flow
                            </span>
                            <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                              {flow.nodes.length} nodes
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

      {/* New Flow Confirmation Dialog */}
      {showNewFlowDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] font-mono">
          <div className="relative bg-white border-4 border-black max-w-md w-full mx-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] antialiased">
            <div className="flex items-center px-6 py-4 border-b-4 border-black bg-[#FFEBB0]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-black" strokeWidth={3} />
                <h3 className="text-xl font-bold uppercase tracking-wide text-black">
                  Create New Flow
                </h3>
              </div>
            </div>
            
            <div className="p-10 text-center">
              <p className="text-black text-lg font-bold uppercase tracking-wide leading-relaxed">
                Creating a new flow will clear your current work.
              </p>
              <p className="text-black text-sm font-bold uppercase tracking-wide mt-2 opacity-60">
                Unsaved changes will be lost.
              </p>
            </div>
            
            <div className="px-8 pb-8 pt-0 flex flex-col gap-3">
              <button
                onClick={handleConfirmNewFlow}
                className="w-full py-4 bg-black text-white text-lg font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-none transform active:translate-y-1"
              >
                Create New Flow
              </button>
              <button
                onClick={() => setShowNewFlowDialog(false)}
                className="w-full py-4 bg-white text-black border-4 border-black text-lg font-bold uppercase tracking-widest hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deleteDialogData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] font-mono">
          <div className="relative bg-white border-4 border-black max-w-md w-full mx-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] antialiased">
            <div className="flex items-center px-6 py-4 border-b-4 border-black bg-[#FFB0B0]">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-black" strokeWidth={3} />
                <h3 className="text-xl font-bold uppercase tracking-wide text-black">
                  Delete Selected
                </h3>
              </div>
            </div>
            
            <div className="p-10 text-center">
              <p className="text-black text-lg font-bold uppercase tracking-wide leading-relaxed">
                Delete <span className="text-red-600">{deleteDialogData.nodeCount} node(s)</span> and <span className="text-red-600">{deleteDialogData.edgeCount} connection(s)</span>?
              </p>
              <p className="text-black text-sm font-bold uppercase tracking-wide mt-2 opacity-60">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="px-8 pb-8 pt-0 flex flex-col gap-3">
              <button
                onClick={handleConfirmDelete}
                className="w-full py-4 bg-black text-white text-lg font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-none transform active:translate-y-1"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteDialogData(null);
                }}
                className="w-full py-4 bg-white text-black border-4 border-black text-lg font-bold uppercase tracking-widest hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Load Template Dialog */}
      {showConfirmDialog && confirmDialogData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] font-mono">
          <div className="relative bg-white border-4 border-black max-w-md w-full mx-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] antialiased">
            <div className="flex items-center px-6 py-4 border-b-4 border-black bg-[#FFEBB0]">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-black" strokeWidth={3} />
                <h3 className="text-xl font-bold uppercase tracking-wide text-black">
                  Load Template
                </h3>
              </div>
            </div>
            
            <div className="p-10 text-center">
              <p className="text-black text-lg font-bold uppercase tracking-wide leading-relaxed">
                Loading "<span className="text-orange-600">{confirmDialogData.templateName}</span>" will replace your current work.
              </p>
              <p className="text-black text-sm font-bold uppercase tracking-wide mt-2 opacity-60">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="px-8 pb-8 pt-0 flex flex-col gap-3">
              <button
                onClick={handleConfirmLoadTemplate}
                className="w-full py-4 bg-black text-white text-lg font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-none transform active:translate-y-1"
              >
                Load Template
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmDialogData(null);
                }}
                className="w-full py-4 bg-white text-black border-4 border-black text-lg font-bold uppercase tracking-widest hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Modal */}
      <APIKeysModal isOpen={showAPIKeys} onClose={() => setShowAPIKeys(false)} />
      
      {/* Custom Alert */}
      <AlertComponent />
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
