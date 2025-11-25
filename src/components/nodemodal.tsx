import React from 'react';
import { LogEntry, NodeStatus } from '../app/page';

interface NodeModalProps {
  node: {
    title: string;
    desc: string;
    icon: string;
  };
  logs: LogEntry[];
  status: NodeStatus;
  onClose: () => void;
}

export const NodeModal: React.FC<NodeModalProps> = ({
  node,
  logs,
  status,
  onClose,
}) => {
  const statusLabel =
    status === 'done'
      ? 'Kész'
      : status === 'active'
      ? 'Folyamatban'
      : status === 'queued'
      ? 'Várakozik'
      : status === 'error'
      ? 'Hiba'
      : 'Tétlen';

  const statusColor =
    status === 'done'
      ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/40'
      : status === 'active'
      ? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/40'
      : status === 'error'
      ? 'bg-red-500/10 text-red-200 border-red-500/40'
      : 'bg-slate-800 text-slate-200 border-slate-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md w-full bg-slate-950 border border-slate-700 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-2xl">
              {node.icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-50">
                {node.title}
              </h2>
              <span
                className={`inline-flex mt-1 px-2 py-0.5 text-[10px] rounded-full border ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-sm"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-300 mb-4">{node.desc}</p>

        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-xs font-semibold text-slate-200 mb-2">
            Ehhez a node-hoz tartozó logok
          </h3>
          <div className="max-h-40 overflow-auto space-y-2 text-xs">
            {logs.length === 0 && (
              <p className="text-slate-500 text-[11px]">
                Még nincs log ehhez a lépéshez.
              </p>
            )}
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-slate-900/80 border border-slate-800 px-2 py-1.5"
              >
                <div className="text-slate-100 text-[11px]">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-100 text-xs hover:bg-slate-700"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
