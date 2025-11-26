// src/hooks/useWorkflowState.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NODES,
  NODE_ORDER,
  NodeId,
  NodeLogEntry,
  NodeStatus,
  RawEvent,
} from '../models/workflow.model';
import { createWorkflowEventSource } from '../services/workflowevents.service';

type LogsByNode = Record<NodeId, NodeLogEntry[]>;

export function useWorkflowState() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logsByNode, setLogsByNode] = useState<LogsByNode>(() =>
    NODES.reduce(
      (acc, n) => ({ ...acc, [n.id]: [] }),
      {} as Record<NodeId, NodeLogEntry[]>
    )
  );
  const [allEvents, setAllEvents] = useState<RawEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const lastStep: NodeId | null = useMemo(() => {
    const last = [...allEvents].reverse().find((e) =>
      NODE_ORDER.includes(e.step as NodeId)
    );
    return last ? (last.step as NodeId) : null;
  }, [allEvents]);

  const completedSteps = useMemo<Set<NodeId>>(() => {
    const set = new Set<NodeId>();
    allEvents.forEach((e) => {
      if (NODE_ORDER.includes(e.step as NodeId)) {
        set.add(e.step as NodeId);
      }
    });
    return set;
  }, [allEvents]);

  const progress = useMemo(() => {
    const idx = lastStep ? NODE_ORDER.indexOf(lastStep) : -1;
    if (idx === -1) return 0;
    return Math.round(((idx + 1) / NODE_ORDER.length) * 100);
  }, [lastStep]);

  const getNodeStatus = useCallback(
    (id: NodeId): NodeStatus => {
      if (error && lastStep === id) return 'error';
      if (completedSteps.has(id)) return 'done';
      if (running && lastStep === id) return 'active';

      const lastIndex = lastStep ? NODE_ORDER.indexOf(lastStep) : -1;
      const nodeIndex = NODE_ORDER.indexOf(id);

      if (!running) return 'idle';
      if (lastIndex === -1) return 'queued';
      if (nodeIndex > lastIndex) return 'queued';
      return 'idle';
    },
    [completedSteps, error, lastStep, running]
  );

  const currentLabel = useMemo(() => {
    if (lastStep) {
      const node = NODES.find((n) => n.id === lastStep);
      return node?.title ?? lastStep;
    }
    return running ? 'Előkészítés...' : 'Várakozás';
  }, [lastStep, running]);

  const resetWorkflow = useCallback(() => {
    setError(null);
    setAllEvents([]);
    setLogsByNode(
      NODES.reduce(
        (acc, n) => ({ ...acc, [n.id]: [] }),
        {} as Record<NodeId, NodeLogEntry[]>
      )
    );
  }, []);

  const startWorkflow = useCallback(() => {
    // előző SSE bezárása, ha van
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    resetWorkflow();
    setRunning(true);

    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

    const es = createWorkflowEventSource(
      baseUrl,
      (data) => {
        setAllEvents((prev) => [...prev, data]);

        if (NODE_ORDER.includes(data.step as NodeId)) {
          const nodeId = data.step as NodeId;
          const timestamp = new Date().toLocaleTimeString();

          setLogsByNode((prev) => ({
            ...prev,
            [nodeId]: [
              ...prev[nodeId],
              { timestamp, event: data },
            ],
          }));
        }
      },
      (msg) => {
        setError(msg);
        setRunning(false);
      },
      () => {
        setRunning(false);
      }
    );

    eventSourceRef.current = es;
  }, [resetWorkflow]);

  // unmount-kor SSE bezárása
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    running,
    error,
    logsByNode,
    allEvents,
    lastStep,
    progress,
    currentLabel,
    getNodeStatus,
    startWorkflow,
    resetWorkflow,
  };
}
