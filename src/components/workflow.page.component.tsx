"use client";

import React, { useState, useMemo } from "react";
import { useWorkflowState } from "../hooks/useworkflowstate.hooks";
import { WorkflowCanvas } from "./workflow.canvas.component";
import { NodeDetailsModal } from "./nodedetails.modal.component";
import { NodeId } from "../models/workflow.model";

export const WorkflowPage: React.FC = () => {
  const {
    running,
    error,
    logsByNode,
    lastStep,
    progress,
    currentLabel,
    getNodeStatus,
    startWorkflow,
    resetWorkflow,
    allEvents,
  } = useWorkflowState();

  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);

  const completedSteps = useMemo(() => {
    const done = new Set<NodeId>();
    allEvents.forEach((e) => {
      if (getNodeStatus(e.step as NodeId) === "done") {
        done.add(e.step as NodeId);
      }
    });
    return done;
  }, [allEvents, getNodeStatus]);

  // Zoom vezérlés (a canvas kezeli, ezért csak eventeket küldünk)
  const [zoomSignal, setZoomSignal] = useState<"in" | "out" | "reset" | null>(
    null
  );

  const triggerZoom = (type: "in" | "out" | "reset") => {
    setZoomSignal(type);
    setTimeout(() => setZoomSignal(null), 50);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 relative">

      {/* 🔥 LEBEGŐ NAVBAR – kis ikonok */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        <button
          onClick={startWorkflow}
          disabled={running}
          className="h-24 w-24 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow text-3xl"
          title="Start workflow"
        >
          ▶️
        </button>

        <button
          onClick={resetWorkflow}
          className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center"
          title="Reset workflow"
        >
          🔄
        </button>

        <button
          onClick={() => triggerZoom("in")}
          className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center"
          title="Zoom in"
        >
          ➕
        </button>

        <button
          onClick={() => triggerZoom("out")}
          className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center"
          title="Zoom out"
        >
          ➖
        </button>

        <button
          onClick={() => triggerZoom("reset")}
          className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center"
          title="Reset view"
        >
          🎯
        </button>

        <div className="mt-4 p-2 text-[10px] text-slate-400 text-center">
          <div>{currentLabel}</div>
          <div className="text-emerald-400">{progress}%</div>
          {error && (
            <div className="text-red-400 text-[9px] mt-1">{error}</div>
          )}
        </div>
      </div>

      {/* Teljes képernyős CANVAS */}
      <WorkflowCanvas
        getNodeStatus={getNodeStatus}
        lastStep={lastStep}
        completedSteps={completedSteps}
        onSelectNode={(id) => setSelectedNode(id)}
        zoomSignal={zoomSignal}
      />

      {/* Részletező MODAL */}
      <NodeDetailsModal
        nodeId={selectedNode}
        logsByNode={logsByNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
};
