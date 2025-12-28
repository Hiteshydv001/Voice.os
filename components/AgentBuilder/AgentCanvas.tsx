import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import custom nodes
import { LLMNode, STTNode, TTSNode, StartNode, EndNode } from './nodes';

const nodeTypes = {
  llm: LLMNode,
  stt: STTNode,
  tts: TTSNode,
  start: StartNode,
  end: EndNode,
};

interface AgentCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
}

export const AgentCanvas: React.FC<AgentCanvasProps> = ({ 
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeDoubleClick
}) => {
  // Suppress ResizeObserver warnings (known React Flow issue)
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message && e.message.includes('ResizeObserver loop')) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Use React Flow's internal state management with callbacks
  const [internalNodes, setInternalNodes, onNodesChangeInternal] = useNodesState(nodes);
  const [internalEdges, setInternalEdges, onEdgesChangeInternal] = useEdgesState(edges);

  // Sync only when parent state actually changes (use ref to prevent loops)
  const prevNodesRef = React.useRef<Node[]>();
  const prevEdgesRef = React.useRef<Edge[]>();

  React.useEffect(() => {
    if (prevNodesRef.current !== nodes && JSON.stringify(prevNodesRef.current) !== JSON.stringify(nodes)) {
      setInternalNodes(nodes);
      prevNodesRef.current = nodes;
    }
  }, [nodes, setInternalNodes]);

  React.useEffect(() => {
    if (prevEdgesRef.current !== edges && JSON.stringify(prevEdgesRef.current) !== JSON.stringify(edges)) {
      setInternalEdges(edges);
      prevEdgesRef.current = edges;
    }
  }, [edges, setInternalEdges]);

  // Debounce parent updates to prevent feedback loops
  const notifyParentNodesRef = React.useRef<NodeJS.Timeout>();
  const notifyParentEdgesRef = React.useRef<NodeJS.Timeout>();

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeInternal(changes);
      
      // Debounce parent notification
      if (notifyParentNodesRef.current) {
        clearTimeout(notifyParentNodesRef.current);
      }
      notifyParentNodesRef.current = setTimeout(() => {
        setInternalNodes((currentNodes) => {
          onNodesChange(currentNodes);
          return currentNodes;
        });
      }, 50);
    },
    [onNodesChangeInternal, onNodesChange, setInternalNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeInternal(changes);
      
      // Debounce parent notification
      if (notifyParentEdgesRef.current) {
        clearTimeout(notifyParentEdgesRef.current);
      }
      notifyParentEdgesRef.current = setTimeout(() => {
        setInternalEdges((currentEdges) => {
          onEdgesChange(currentEdges);
          return currentEdges;
        });
      }, 50);
    },
    [onEdgesChangeInternal, onEdgesChange, setInternalEdges]
  );

  const handleConnect = useCallback(
    (params: Connection | Edge) => {
      setInternalEdges((eds) => {
        const newEdges = addEdge(params, eds);
        onEdgesChange(newEdges);
        return newEdges;
      });
    },
    [setInternalEdges, onEdgesChange]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeDoubleClick?.(event, node);
  }, [onNodeDoubleClick]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={internalNodes}
        edges={internalEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'llm': return '#9333ea';
              case 'tool': return '#ea580c';
              case 'memory': return '#2563eb';
              case 'stt': return '#0d9488';
              case 'tts': return '#db2777';
              default: return '#6b7280';
            }
          }}
          className="bg-white border border-gray-200"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-2 m-2">
          <div className="text-xs text-gray-600">
            <div>Nodes: {nodes.length}</div>
            <div>Connections: {edges.length}</div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
