"use client";

import React, { useState, useMemo } from "react";
import { useWorkflowState } from "../hooks/useworkflowstate.hooks";
import { WorkflowCanvas } from "./workflow.canvas.component";
import { NodeDetailsModal } from "./nodedetails.modal.component";
import { NodeId } from "../models/workflow.model";
import Toast from "./toast.component";

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

  const [toastsTexts, setToastsTexts] = useState<{text:string,type:"success" | "error"}[]>([]);

  const deleteToastByIndex = (index: number) => {
    setToastsTexts((prev) => prev.filter((_, i) => i !== index));
  };

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

  const fullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  const copyLinkToClipboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setToastsTexts((prev) => [...prev, {text: "Link copied to clipboard!", type: "success"}]);
  }

  const screenShot = () => {
    setToastsTexts((prev) => [...prev, {text: "Screenshot functionality is not implemented yet.", type: "error"}]);
  }


  const downloadLogs = () => {
    const logsStr = JSON.stringify(allEvents, null, 2);
    const blob = new Blob([logsStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow_logs.json";
    a.click();
    URL.revokeObjectURL(url);
    setToastsTexts((prev) => [...prev, {text: "Logs downloaded!", type: "success"}]);
  };


  return (
    <div className="w-screen h-screen overflow-hidden bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 relative">

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-3 bg-linear-to-br from-slate-950/50 to-slate-900/50 rounded-2xl p-2 px-4 shadow-lg border border-slate-700">
        <button
          onClick={startWorkflow}
          disabled={running}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Start workflow"
        >
           {running ? "⏳" : "▶️"}
        </button>

        <button
          onClick={resetWorkflow}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Reset workflow"
        >
          🔄
        </button>

        <div className="bg-slate-700 w-[0.1px]"></div>

        <button
          onClick={() => triggerZoom("in")}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Zoom in"
        >
          ➕
        </button>

        <button
          onClick={() => triggerZoom("out")}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Zoom out"
        >
          ➖
        </button>

        <button
          onClick={() => triggerZoom("reset")}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Reset zoom"
        >
          📌
        </button>

        <div className="bg-slate-700 w-[0.1px]"></div>

        <button
          onClick={()=>{}}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Search"
        >
          🔍
        </button>

        <button
          onClick={fullScreen}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Fullscreen mode"
        >
          ⛶
        </button>

        <div className="bg-slate-700 w-[0.1px]"></div>

        <button
          onClick={()=>{}}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Start timer"
        >
          ⏱️
        </button>

        <div className="bg-slate-700 w-[0.1px]"></div>

        <button
          onClick={screenShot}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Take screenshot"
        >
          📷
        </button>

        <button
          onClick={downloadLogs}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Save workflow logs"
        >
          💾
        </button>
        <button
          onClick={copyLinkToClipboard}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Copy link to clipboard"
        >
          🔗
        </button>

        <div className="bg-slate-700 w-[0.1px]"></div>

        <button
          onClick={()=>{}}
          className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center shadow cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title="Keyboard shortcuts"
        >
          ⌨️
        </button>
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

      {/* TOASTS */}
      {
        toastsTexts.length > 0 &&
        toastsTexts.map((toastText, index) => (
          <Toast
            index={index}
            key={index}
            toast={toastText.text}
            type={toastText.type}
            onClose={()=>{deleteToastByIndex(index)}}
          />
        ))
      }
    </div>
  );
};
