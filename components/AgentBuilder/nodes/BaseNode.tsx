import React from 'react';
import { Handle, Position } from 'reactflow';

interface BaseNodeProps {
  data: {
    label: string;
    config?: any;
  };
  icon: React.ReactNode;
  color: string;
  hasInput?: boolean;
  hasOutput?: boolean;
}

export function BaseNode({ data, icon, color, hasInput = true, hasOutput = true }: BaseNodeProps) {
  return (
    <div className={`${color} border-2 border-black px-4 py-3 min-w-[150px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono`}>
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-black border-2 border-white"
        />
      )}
      
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-xs font-bold uppercase">{data.label}</div>
          {data.config?.model && (
            <div className="text-xs text-stone-600">{data.config.model}</div>
          )}
          {data.config?.voice && (
            <div className="text-xs text-stone-600">{data.config.voice}</div>
          )}
          {data.config?.provider && (
            <div className="text-xs text-stone-600">{data.config.provider}</div>
          )}
        </div>
      </div>

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-black border-2 border-white"
        />
      )}
    </div>
  );
}
