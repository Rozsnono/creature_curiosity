'use client';

import React, { useMemo, useState } from 'react';
import { FlowNode } from '../components/flownode';
import { NodeModal } from '../components/nodemodal';
import { LogPanel } from '../components/logpanel';
import { ResultLinks } from '../components/resultlinks';

export interface LogEntry {
  step: string;
  message: string;
  [key: string]: any;
}

export type NodeId =
  | 'sheet'
  | 'openai'
  | 'json2video'
  | 'render'
  | 'sheetUpdate'
  | 'download'
  | 'youtube'
  | 'done';

export type NodeStatus = 'idle' | 'queued' | 'active' | 'done' | 'error';

export const NODES: {
  id: NodeId;
  title: string;
  desc: string;
  icon: string;
}[] = [
  {
    id: 'sheet',
    title: 'Google Sheet',
    desc: 'Következő “production” sor lekérése a táblából.',
    icon: '📄',
  },
  {
    id: 'openai',
    title: 'OpenAI',
    desc: 'Social media scenes generálása a témából.',
    icon: '🤖',
  },
  {
    id: 'json2video',
    title: 'json2video',
    desc: 'Render job indítása a scenes alapján.',
    icon: '🎬',
  },
  {
    id: 'render',
    title: 'Renderelés',
    desc: 'Státusz pollolása, amíg elkészül a videó.',
    icon: '⚙️',
  },
  {
    id: 'sheetUpdate',
    title: 'Sheet update',
    desc: 'Státusz és final URL mentése a Google Sheet-be.',
    icon: '✏️',
  },
  {
    id: 'download',
    title: 'Letöltés',
    desc: 'A kész videófájl letöltése a json2video URL-ről.',
    icon: '⬇️',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    desc: 'Videó feltöltése a YouTube csatornára.',
    icon: '📺',
  },
  {
    id: 'done',
    title: 'Kész',
    desc: 'A teljes pipeline lefutott, videó publikálásra kész.',
    icon: '✅',
  },
];

const NODE_ORDER = NODES.map((n) => n.id);

export default function FlowPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);

  const lastStep = useMemo(() => {
    if (logs.length === 0) return null;
    return logs[logs.length - 1].step as NodeId;
  }, [logs]);

  const completedSteps = useMemo(() => {
    const set = new Set<NodeId>();
    logs.forEach((log) => {
      if (NODE_ORDER.includes(log.step as NodeId)) {
        set.add(log.step as NodeId);
      }
    });
    return set;
  }, [logs]);

  const progress = useMemo(() => {
    const idx = lastStep ? NODE_ORDER.indexOf(lastStep) : -1;
    if (idx === -1) return 0;
    const total = NODE_ORDER.length;
    return Math.round(((idx + 1) / total) * 100);
  }, [lastStep]);

  const getNodeStatus = (id: NodeId): NodeStatus => {
    if (error && lastStep === id) return 'error';
    if (completedSteps.has(id)) return 'done';
    if (running && lastStep === id) return 'active';

    const lastIndex = lastStep ? NODE_ORDER.indexOf(lastStep) : -1;
    const nodeIndex = NODE_ORDER.indexOf(id);

    if (!running) return 'idle';
    if (lastIndex === -1) return 'queued';
    if (nodeIndex > lastIndex) return 'queued';
    return 'idle';
  };

  const startProcess = () => {
    setLogs([]);
    setError(null);
    setRunning(true);

    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

    const es = new EventSource(`${baseUrl}/api/make`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LogEntry;
        setLogs((prev) => [...prev, data]);

        if (data.step === 'done' || data.step === 'error') {
          setRunning(false);
          if (data.step === 'error') {
            setError(data.message || 'Ismeretlen hiba történt.');
          }
          es.close();
        }
      } catch (e) {
        console.error('Bad SSE data', e);
      }
    };

    es.onerror = (err) => {
      console.error('SSE error', err);
      setLogs((prev) => [
        ...prev,
        { step: 'error', message: 'SSE hiba a kapcsolatban.' },
      ]);
      setError('SSE hiba a kapcsolatban.');
      setRunning(false);
      es.close();
    };
  };

  const currentNode = NODES.find((n) => n.id === lastStep);
  const currentLabel = currentNode
    ? currentNode.title
    : running
    ? 'Előkészítés...'
    : 'Várakozás';

  const selectedNode = selectedNodeId
    ? NODES.find((n) => n.id === selectedNodeId) || null
    : null;

  const selectedNodeLogs =
    selectedNodeId === null
      ? []
      : logs.filter((l) => l.step === selectedNodeId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 flex items-center justify-center">
      <div className="max-w-6xl w-full flex flex-col gap-6">
        {/* Top bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <span className="inline-flex h-9 w-9 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/40">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              Social Media Reels – Flow monitor
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              n8n-szerű pipeline, kör alakú node-okkal. Kattints egy node-ra a
              részletekért.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <button
              onClick={startProcess}
              disabled={running}
              className={`px-4 py-2 rounded-xl font-medium text-sm md:text-base transition shadow ${
                running
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 cursor-pointer'
              }`}
            >
              {running ? 'Folyamat fut...' : 'Render indítása'}
            </button>
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Aktuális node:{' '}
                <span className="font-semibold text-slate-50">
                  {currentLabel}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Haladás</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Kör node-ok “drótokkal” */}
        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-8 overflow-x-auto">
          <div className="min-w-[780px] flex items-center justify-between gap-4">
            {NODES.map((node, idx) => {
              const status = getNodeStatus(node.id);

              return (
                <React.Fragment key={node.id}>
                  <FlowNode
                    node={node}
                    status={status}
                    onClick={() => setSelectedNodeId(node.id)}
                  />
                  {idx < NODES.length - 1 && (
                    <div className="flex-1 h-[2px] bg-slate-800 relative">
                      <div
                        className={`absolute inset-y-0 left-0 h-[2px] ${
                          completedSteps.has(NODES[idx + 1].id) ||
                          lastStep === NODES[idx + 1].id
                            ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400'
                            : 'bg-slate-800'
                        }`}
                        style={{
                          width:
                            completedSteps.has(NODES[idx + 1].id) ||
                            lastStep === NODES[idx + 1].id
                              ? '100%'
                              : '40%',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Log + eredmények */}
        <section className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-4">
          <LogPanel
            logs={logs}
            onClear={() => {
              setLogs([]);
              setError(null);
            }}
          />
          <ResultLinks logs={logs} error={error} />
        </section>

        {/* Modal a node-hoz */}
        {selectedNode && (
          <NodeModal
            node={selectedNode}
            logs={selectedNodeLogs}
            status={getNodeStatus(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </main>
  );
}
