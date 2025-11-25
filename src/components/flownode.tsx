import React from 'react';
import type { NodeId, NodeStatus } from '../app/page';

interface FlowNodeProps {
  node: {
    id: NodeId;
    title: string;
    icon: string;
  };
  status: NodeStatus;
  onClick: () => void;
}

export const FlowNode: React.FC<FlowNodeProps> = ({ node, status, onClick }) => {
  const colorClasses =
    status === 'done'
      ? 'border-emerald-400 bg-emerald-500/10'
      : status === 'active'
      ? 'border-cyan-400 bg-cyan-500/10'
      : status === 'error'
      ? 'border-red-400 bg-red-500/10'
      : status === 'queued'
      ? 'border-slate-600 bg-slate-800/80'
      : 'border-slate-700 bg-slate-900';

  const dotColor =
    status === 'done'
      ? 'bg-emerald-400'
      : status === 'active'
      ? 'bg-cyan-400'
      : status === 'error'
      ? 'bg-red-400'
      : status === 'queued'
      ? 'bg-slate-400'
      : 'bg-slate-600';

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center h-24 w-24 rounded-full cursor-pointer border ${colorClasses} shadow transition hover:scale-105 hover:border-emerald-400/70`}
      title={node.title}
    >
      {/* státusz pont */}
      <span
        className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${dotColor} ${
          status === 'active' ? 'animate-pulse' : ''
        }`}
      />

      <span className="text-2xl">{node.icon}</span>
      <span className="mt-1 text-[11px] font-medium text-center px-2 leading-tight">
        {node.title}
      </span>
    </button>
  );
};
