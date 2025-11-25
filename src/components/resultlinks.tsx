// src/components/ResultLinks.tsx
import React from 'react';
import { LogEntry } from '../app/page';

interface ResultLinksProps {
  logs: LogEntry[];
  error: string | null;
}

export const ResultLinks: React.FC<ResultLinksProps> = ({ logs, error }) => {
  const lastWithVideo = [...logs].reverse().find((l) => l.movieUrl);
  const lastWithYoutube = [...logs].reverse().find((l) => l.youtubeLink);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-100">
        Utolsó eredmények
      </h2>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 text-xs px-3 py-2">
          <div className="font-semibold mb-1">Hiba történt</div>
          <div>{error}</div>
        </div>
      )}

      {!lastWithVideo && !lastWithYoutube && !error && (
        <p className="text-xs text-slate-400">
          Még nincs elérhető videó vagy YouTube link. Amint a folyamat lefut,
          itt megjelennek.
        </p>
      )}

      <div className="flex flex-col gap-2 text-xs">
        {lastWithYoutube && (
          <a
            href={lastWithYoutube.youtubeLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-between px-3 py-2 rounded-xl bg-red-500/10 text-red-200 border border-red-500/40 hover:bg-red-500/20 transition"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">▶</span>
              <span>YouTube videó megnyitása</span>
            </span>
            <span className="text-[10px] uppercase tracking-wide">
              open youtube
            </span>
          </a>
        )}

        {lastWithVideo && (
          <a
            href={lastWithVideo.movieUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-between px-3 py-2 rounded-xl bg-sky-500/10 text-sky-200 border border-sky-500/40 hover:bg-sky-500/20 transition"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">⬇</span>
              <span>Renderelt videó letöltése</span>
            </span>
            <span className="text-[10px] uppercase tracking-wide">
              download file
            </span>
          </a>
        )}
      </div>
    </div>
  );
};
