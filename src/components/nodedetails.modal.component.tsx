// src/components/workflow/NodeDetailsModal.tsx
'use client';

import React from 'react';
import {
  NODES,
  NodeId,
  NodeLogEntry,
} from '../models/workflow.model';

interface NodeDetailsModalProps {
  nodeId: NodeId | null;
  logsByNode: Record<NodeId, NodeLogEntry[]>;
  onClose: () => void;
}

export const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({
  nodeId,
  logsByNode,
  onClose,
}) => {
  if (!nodeId) return null;

  const node = NODES.find((n) => n.id === nodeId);
  if (!node) return null;

  const logs = logsByNode[nodeId] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="max-w-2xl w-full mx-4 border border-slate-700 rounded-2xl shadow-2xl shadow-white/10 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-900/40 flex items-center justify-center text-2xl">
              {node.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-50">
                {node.title}
              </div>
              <div className="text-[11px] text-slate-400">
                {node.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-sm px-2 py-1 rounded-lg hover:bg-slate-800"
          >
            ✕ Bezárás
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 border-b border-slate-800 bg-slate-900/50">
          <p className="text-xs text-slate-300">{node.desc}</p>
        </div>

        <div className="flex-1 px-4 py-3 overflow-auto w-full bg-slate-950/30">

          <div className='flex w-full items-center relative justify-center mb-4 text-xs font-semibold text-slate-400'>
            <div style={{ background: "linear-gradient(90deg,#00000000 5%, #ffffff50 20%, #00000000 40%, #00000000 60%, #ffffff50 80%, #00000000 95%)" }} className='w-full absolute h-[1px] z-10 rounded-lg'></div>
            ACTIVITY LOGS
          </div>

          {logs.length === 0 && (
            <div className="text-[11px] text-slate-500 mb-2 flex items-center gap-2 flex-col py-8">
              <span className='text-5xl pb-4'>📋</span>
              <span className='text-lg font-semibold text-slate-400'>
                Még több részletet láthatsz az API hívásokról itt
              </span>
              <span className=''>
                amint elindítod a workflow-t és ez a lépés végrehajtásra kerül.
              </span>
            </div>
          )}

          {logs.length > 0 && (
            <div className="space-y-3">
              {logs.map((entry, idx) => {
                const e = entry.event;
                const dir = e.direction || '';
                const directionLabel =
                  dir === 'request'
                    ? 'Küldött kérés'
                    : dir === 'response'
                      ? 'Kapott válasz'
                      : 'Esemény';

                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400">
                        {entry.timestamp}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {directionLabel}
                      </span>
                    </div>
                    {e.message && (
                      <div className="text-[11px] text-slate-100 mb-1">
                        {e.message}
                      </div>
                    )}
                    <pre className="text-[10px] text-slate-300 bg-slate-950/80 rounded-md p-2 overflow-x-auto">
                      {JSON.stringify(e, null, 2)}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between bg-slate-900/50">
          <span>ESC: kilépés</span>
          <span>Node: {node.id}</span>
        </div>
      </div>
    </div>
  );
};
