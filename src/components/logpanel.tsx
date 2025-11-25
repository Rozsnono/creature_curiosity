// src/components/LogPanel.tsx
import React from 'react';
import { LogEntry } from '../app/page';

interface LogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClear }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Részletes log</h2>
        <p className="text-xs text-slate-400">
          Backend események időrendben.
        </p>
      </div>
      <button
        onClick={onClear}
        className="text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
      >
        Log törlése
      </button>
    </div>

    <div className="h-64 rounded-xl bg-slate-950/70 border border-slate-900 overflow-auto p-3 text-xs space-y-2">
      {logs.length === 0 && (
        <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center">
          Még nincs log. Indítsd el a folyamatot fent.
        </div>
      )}

      {logs.map((log, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 rounded-lg bg-slate-900/80 border border-slate-800 px-2 py-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {log.step}
            </span>
            <span className="text-[10px] text-slate-500">#{i + 1}</span>
          </div>
          <div className="text-slate-100 text-[11px]">{log.message}</div>
        </div>
      ))}
    </div>
  </div>
);
