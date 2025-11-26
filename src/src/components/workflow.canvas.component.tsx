// src/components/workflow/WorkflowCanvas.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRID_SIZE,
  NODES,
  CONNECTIONS,
  NodeId,
  NodeStatus,
  CELL_W,
  CELL_H,
  OFFSET_X, // akár el is hagyhatod, de nem zavar
} from "../models/workflow.model";

interface Pos {
  x: number; // content koordináta
  y: number;
}

interface WorkflowCanvasProps {
  getNodeStatus: (id: NodeId) => NodeStatus;
  lastStep: NodeId | null;
  completedSteps: Set<NodeId>;
  onSelectNode: (nodeId: NodeId) => void;
  zoomSignal: "in" | "out" | "reset" | null;
}

const computeNodeDims = () => {
  const dims: Record<NodeId, { w: number; h: number }> = {} as any;
  for (const node of NODES) {
    const span = node.colSpan ?? 1;
    const size = CELL_W * span * 0.7;
    dims[node.id] = { w: size, h: size };
  }
  return dims;
};

const NODE_DIMS = computeNodeDims();

type Side = "left" | "right" | "top" | "bottom";

// 🔒 clamp – node ne lógjon ki a piros keretből
function clampNodePosition(
  x: number,
  y: number,
  nodeId: NodeId
): { x: number; y: number } {
  const dim = NODE_DIMS[nodeId];
  const halfW = dim.w / 2;
  const halfH = dim.h / 2;

  const margin = 40;

  const minX = halfW + margin;
  const maxX = CANVAS_WIDTH - halfW - margin;
  const minY = halfH + margin;
  const maxY = CANVAS_HEIGHT - halfH - margin;

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

// ✅ KEZDŐ POZÍCIÓK – A CSEMPÉK KÖZÉPRE IGAZÍTVA A CANVASON
function computeInitialPositions(): Record<NodeId, Pos> {
  // 1) nyers grid pozíciók
  const temp: { id: NodeId; baseX: number; baseY: number }[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of NODES) {
    const baseX = node.gridX * CELL_W;
    const baseY = node.gridY * CELL_H;

    temp.push({ id: node.id, baseX, baseY });

    if (baseX < minX) minX = baseX;
    if (baseX > maxX) maxX = baseX;
    if (baseY < minY) minY = baseY;
    if (baseY > maxY) maxY = baseY;
  }

  // 2) layout közepe
  const layoutCenterX = (minX + maxX) / 2;
  const layoutCenterY = (minY + maxY) / 2;

  // 3) canvas közepe
  const canvasCenterX = CANVAS_WIDTH / 2;
  const canvasCenterY = CANVAS_HEIGHT / 2;

  // 4) minden node-ot úgy tesszük le, hogy a layout közepe essen a canvas közepére
  const result: Record<NodeId, Pos> = {} as any;
  for (const item of temp) {
    const rawX = item.baseX - layoutCenterX + canvasCenterX;
    const rawY = item.baseY - layoutCenterY + canvasCenterY;

    result[item.id] = clampNodePosition(rawX, rawY, item.id);
  }

  return result;
}

interface ConnectionRenderData {
  from: NodeId;
  to: NodeId;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  cp1X: number;
  cp1Y: number;
  cp2X: number;
  cp2Y: number;
  fromSide: Side;
  toSide: Side;
  isActive: boolean;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  getNodeStatus,
  lastStep,
  completedSteps,
  onSelectNode,
  zoomSignal,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 💡 itt használjuk a középre igazított kezdőpozíciókat
  const [positions, setPositions] = useState<Record<NodeId, Pos>>(
    () => computeInitialPositions()
  );

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const [dragging, setDragging] = useState<{
    nodeId: NodeId;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [panning, setPanning] = useState<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [spacePressed, setSpacePressed] = useState(false);

  // Zoom jel a navbarból ( + / - / reset )
  useEffect(() => {
    if (!zoomSignal) return;

    if (zoomSignal === "in") {
      setScale((s) => Math.min(2.5, s * 1.2));
    } else if (zoomSignal === "out") {
      setScale((s) => Math.max(0.4, s * 0.8));
    } else if (zoomSignal === "reset") {
      setScale(1);
      setTranslate({ x: -CANVAS_WIDTH / 2 + 1000, y: -CANVAS_HEIGHT / 2 + 500 });
    }
  }, [zoomSignal]);

  // billentyűk: ESC + Space (Space opcionális)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDragging(null);
        setPanning(null);
      }
      if (e.code === "Space") {
        setSpacePressed(true);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
        setPanning(null);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Drag node – global move/up
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const contentX = (screenX - translate.x) / scale;
      const contentY = (screenY - translate.y) / scale;

      let newX = contentX - dragging.offsetX;
      let newY = contentY - dragging.offsetY;

      const clamped = clampNodePosition(newX, newY, dragging.nodeId);

      setPositions((prev) => ({
        ...prev,
        [dragging.nodeId]: clamped,
      }));
    };

    const handleUp = () => {
      setPositions((prev) => {
        const current = prev[dragging.nodeId];
        if (!current) return prev;

        const snappedX = Math.round(current.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(current.y / GRID_SIZE) * GRID_SIZE;

        const clamped = clampNodePosition(
          snappedX,
          snappedY,
          dragging.nodeId
        );

        return {
          ...prev,
          [dragging.nodeId]: clamped,
        };
      });
      setDragging(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, scale, translate.x, translate.y]);

  // Pan – global move/up
  useEffect(() => {
    if (!panning) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - panning.startX;
      const dy = e.clientY - panning.startY;
      setTranslate({
        x: panning.origX + dx,
        y: panning.origY + dy,
      });
    };

    const handleUp = () => {
      setPanning(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [panning]);

  const getBounds = (
    pos: Pos,
    dim: { w: number; h: number }
  ): { left: number; right: number; top: number; bottom: number } => ({
    left: pos.x - dim.w / 2,
    right: pos.x + dim.w / 2,
    top: pos.y - dim.h / 2,
    bottom: pos.y + dim.h / 2,
  });

  const getBaseConnectionData = (
    from: NodeId,
    to: NodeId
  ): ConnectionRenderData | null => {
    const fromPos = positions[from];
    const toPos = positions[to];
    if (!fromPos || !toPos) return null;

    const fromDim = NODE_DIMS[from];
    const toDim = NODE_DIMS[to];

    const fb = getBounds(fromPos, fromDim);
    const tb = getBounds(toPos, toDim);
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;

    const horizontal = Math.abs(dx) >= Math.abs(dy);

    let startX = fromPos.x;
    let startY = fromPos.y;
    let endX = toPos.x;
    let endY = toPos.y;
    let fromSide: Side;
    let toSide: Side;

    if (horizontal) {
      if (dx >= 0) {
        startX = fb.right;
        startY = fromPos.y;
        endX = tb.left;
        endY = toPos.y;
        fromSide = "right";
        toSide = "left";
      } else {
        startX = fb.left;
        startY = fromPos.y;
        endX = tb.right;
        endY = toPos.y;
        fromSide = "left";
        toSide = "right";
      }
    } else {
      if (dy >= 0) {
        startX = fromPos.x;
        startY = fb.bottom;
        endX = toPos.x;
        endY = tb.top;
        fromSide = "bottom";
        toSide = "top";
      } else {
        startX = fromPos.x;
        startY = fb.top;
        endX = toPos.x;
        endY = tb.bottom;
        fromSide = "top";
        toSide = "bottom";
      }
    }

    const offset = 40;

    let cp1X = startX;
    let cp1Y = startY;
    let cp2X = endX;
    let cp2Y = endY;

    if (horizontal) {
      const dir = dx >= 0 ? 1 : -1;
      cp1X = startX + dir * offset;
      cp1Y = startY;
      cp2X = endX - dir * offset;
      cp2Y = endY;
    } else {
      const dir = dy >= 0 ? 1 : -1;
      cp1X = startX;
      cp1Y = startY + dir * offset;
      cp2X = endX;
      cp2Y = endY - dir * offset;
    }

    const isActive =
      lastStep === to || completedSteps.has(to);

    return {
      from,
      to,
      startX,
      startY,
      endX,
      endY,
      cp1X,
      cp1Y,
      cp2X,
      cp2Y,
      fromSide,
      toSide,
      isActive,
    };
  };

  const computeConnectionRenderList = (): ConnectionRenderData[] => {
    const base: ConnectionRenderData[] = [];

    for (const c of CONNECTIONS) {
      const data = getBaseConnectionData(c.from, c.to);
      if (data) base.push(data);
    }

    const spacing = 8;

    // group by from + fromSide
    const fromGroups = new Map<string, ConnectionRenderData[]>();
    for (const conn of base) {
      const key = `${conn.from}-${conn.fromSide}`;
      if (!fromGroups.has(key)) fromGroups.set(key, []);
      fromGroups.get(key)!.push(conn);
    }

    // group by to + toSide
    const toGroups = new Map<string, ConnectionRenderData[]>();
    for (const conn of base) {
      const key = `${conn.to}-${conn.toSide}`;
      if (!toGroups.has(key)) toGroups.set(key, []);
      toGroups.get(key)!.push(conn);
    }

    // from-side offsetek
    for (const group of fromGroups.values()) {
      const n = group.length;
      if (n <= 1) continue;
      group.forEach((conn, idx) => {
        const offsetIndex = idx - (n - 1) / 2;
        const delta = offsetIndex * spacing;

        if (conn.fromSide === "left" || conn.fromSide === "right") {
          conn.startY += delta;
          conn.cp1Y += delta;
        } else {
          conn.startX += delta;
          conn.cp1X += delta;
        }
      });
    }

    // to-side offsetek
    for (const group of toGroups.values()) {
      const n = group.length;
      if (n <= 1) continue;
      group.forEach((conn, idx) => {
        const offsetIndex = idx - (n - 1) / 2;
        const delta = offsetIndex * spacing;

        if (conn.toSide === "left" || conn.toSide === "right") {
          conn.endY += delta;
          conn.cp2Y += delta;
        } else {
          conn.endX += delta;
          conn.cp2X += delta;
        }
      });
    }

    return base;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomIntensity = 0.1;
    const wheelDelta = -e.deltaY;
    const zoomFactor = wheelDelta > 0 ? 1 + zoomIntensity : 1 - zoomIntensity;

    const newScale = Math.min(2.5, Math.max(0.4, scale * zoomFactor));

    const contentX = (screenX - translate.x) / scale;
    const contentY = (screenY - translate.y) / scale;

    const newTranslateX = screenX - newScale * contentX;
    const newTranslateY = screenY - newScale * contentY;

    setScale(newScale);
    setTranslate({ x: newTranslateX, y: newTranslateY });
  };

  const handleBackgroundMouseDown = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-node='true']")) return;

    setPanning({
      startX: e.clientX,
      startY: e.clientY,
      origX: translate.x,
      origY: translate.y,
    });
    e.preventDefault();
  };

  const connectionRenderList = computeConnectionRenderList();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-900"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(148,163,184,0.18) 1px, transparent 1px)",
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
      onWheel={handleWheel}
      onMouseDown={handleBackgroundMouseDown}
    >
      {/* Tartalom – nagy vászon */}
      <div
        className="absolute top-0 left-0"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Canvas keret + drótok */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        >
          {/* 🔴 Halvány piros keret */}
          <rect
            x={0.5}
            y={0.5}
            width={CANVAS_WIDTH - 1}
            height={CANVAS_HEIGHT - 1}
            fill="none"
            stroke="rgba(248,113,113,0.3)"
            strokeWidth={1}
          />

          {/* Drótok – spacing-gel */}
          {connectionRenderList.map((conn, idx) => (
            <path
              key={idx}
              d={`
                M ${conn.startX} ${conn.startY}
                C ${conn.cp1X} ${conn.cp1Y},
                  ${conn.cp2X} ${conn.cp2Y},
                  ${conn.endX} ${conn.endY}
              `}
              fill="none"
              stroke={conn.isActive ? "#22d3ee" : "#94a3b8"}
              strokeWidth={conn.isActive ? 3 : 2}
              strokeDasharray={conn.isActive ? "0" : "6 4"}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Node csempék */}
        {NODES.map((node) => {
          const status = getNodeStatus(node.id);
          const pos = positions[node.id];
          const dim = NODE_DIMS[node.id];

          const borderColor =
            status === "done"
              ? "border-emerald-400"
              : status === "active"
              ? "border-cyan-400"
              : status === "error"
              ? "border-red-400"
              : status === "queued"
              ? "border-slate-500"
              : "border-slate-700";

          const bgColor =
            status === "done"
              ? "bg-emerald-500/10"
              : status === "active"
              ? "bg-cyan-500/10"
              : status === "error"
              ? "bg-red-500/10"
              : "bg-slate-900/90";

          const dotColor =
            status === "done"
              ? "bg-emerald-400"
              : status === "active"
              ? "bg-cyan-400"
              : status === "error"
              ? "bg-red-400"
              : status === "queued"
              ? "bg-slate-400"
              : "bg-slate-600";

          const statusLabel =
            status === "done"
              ? "Kész"
              : status === "active"
              ? "Folyamatban"
              : status === "error"
              ? "Hiba"
              : status === "queued"
              ? "Várakozik"
              : "Tétlen";

          const centerX = pos.x;
          const centerY = pos.y;

          const handleNodeMouseDown = (
            e: React.MouseEvent<HTMLDivElement, MouseEvent>
          ) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-info-btn='true']")) return;

            e.preventDefault();
            e.stopPropagation();

            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;

            const contentX = (screenX - translate.x) / scale;
            const contentY = (screenY - translate.y) / scale;

            const offsetX = contentX - centerX;
            const offsetY = contentY - centerY;

            setDragging({
              nodeId: node.id,
              offsetX,
              offsetY,
            });
          };

          const handleInfoClick = (
            e: React.MouseEvent<HTMLButtonElement, MouseEvent>
          ) => {
            e.stopPropagation();
            onSelectNode(node.id);
          };

          return (
            <div
              key={node.id}
              data-node="true"
              onMouseDown={handleNodeMouseDown}
              className={`absolute flex flex-col items-center justify-center rounded-2xl border ${borderColor} ${bgColor} shadow cursor-move transition transform hover:scale-105 active:scale-95`}
              style={{
                left: centerX - dim.w / 2,
                top: centerY - dim.h / 2,
                width: dim.w,
                height: dim.h,
              }}
              title={node.title}
            >
              <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-slate-300">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${dotColor} ${
                    status === "active" ? "animate-pulse" : ""
                  }`}
                />
              </div>

              <button
                type="button"
                data-info-btn="true"
                onClick={handleInfoClick}
                className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-slate-800 text-[11px] text-slate-200 flex items-center justify-center border border-slate-600 hover:bg-slate-700 hover:border-emerald-500/60 hover:text-emerald-200"
                title="Részletek / log megnyitása"
              >
                i
              </button>

              <div className="text-2xl">{node.icon}</div>
              <div className="mt-1 text-[11px] font-medium text-center px-2 leading-tight">
                {node.title}
              </div>
              <div className="mt-1 text-[9px] text-slate-500">
                {statusLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
