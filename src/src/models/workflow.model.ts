// src/models/workflow.ts

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

export interface RawEvent {
  step: string;
  message?: string;
  direction?: 'request' | 'response' | string;
  [key: string]: any;
}

export interface NodeLogEntry {
  timestamp: string;
  event: RawEvent;
}

export interface NodeDef {
  id: NodeId;
  title: string;
  icon: string;
  desc: string;
  gridX: number;
  gridY: number;
  colSpan?: number;
  rowSpan?: number;
}

export interface Connection {
  from: NodeId;
  to: NodeId;
}

// Kiinduló layout + colSpan-ek
export const NODES: NodeDef[] = [
  {
    id: 'sheet',
    title: 'Google Sheet',
    icon: '📄',
    desc: 'Következő “production” sor lekérése a táblából.',
    gridX: 0,
    gridY: 0,
    colSpan: 1,
  },
  {
    id: 'openai',
    title: 'OpenAI',
    icon: '🤖',
    desc: 'Scenes generálása a social media videóhoz.',
    gridX: 2,
    gridY: 0,
    colSpan: 1,
  },
  {
    id: 'json2video',
    title: 'json2video',
    icon: '🎬',
    desc: 'Render job indítása a scenes alapján.',
    gridX: 4,
    gridY: 0,
    colSpan: 1,
  },
  {
    id: 'render',
    title: 'Renderelés',
    icon: '⚙️',
    desc: 'Státusz pollolása, amíg elkészül a videó.',
    gridX: 6,
    gridY: 0,
    colSpan: 1,
  },
  {
    id: 'sheetUpdate',
    title: 'Sheet update',
    icon: '✏️',
    desc: 'Státusz és final URL mentése a Google Sheet-be.',
    gridX: 2,
    gridY: 1,
    colSpan: 1,
  },
  {
    id: 'download',
    title: 'Letöltés',
    icon: '⬇️',
    desc: 'A kész videófájl letöltése a json2video URL-ről.',
    gridX: 4,
    gridY: 1,
    colSpan: 1,
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: '📺',
    desc: 'Videó feltöltése a YouTube csatornára.',
    gridX: 6,
    gridY: 1,
    colSpan: 1,
  },
  {
    id: 'done',
    title: 'Kész',
    icon: '✅',
    desc: 'A teljes pipeline lefutott, videó publikálásra kész.',
    gridX: 8,
    gridY: 0,
    colSpan: 2,
  },
];

export const NODE_ORDER: NodeId[] = NODES.map((n) => n.id);

export const CONNECTIONS: Connection[] = [
  { from: 'sheet', to: 'openai' },
  { from: 'openai', to: 'json2video' },
  { from: 'json2video', to: 'render' },
  { from: 'render', to: 'sheetUpdate' },
  { from: 'sheetUpdate', to: 'download' },
  { from: 'download', to: 'youtube' },
  { from: 'youtube', to: 'done' },
];

// Layout konstansok – több helyen használjuk
export const CELL_W = 180;
export const CELL_H = 150;
export const OFFSET_X = 100;
export const OFFSET_Y = 80;

// Vizuális pont-grid méret
export const GRID_SIZE = 10;

// Nagy vászon mérete (scroll + pan + zoom)
export const CANVAS_WIDTH = 8000;
export const CANVAS_HEIGHT = 8000;
