// src/app/api/render-next-video/route.ts
import { NextRequest } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

// --- Típusok ---

interface SheetRow {
  [key: string]: string;
}

interface Scene {
  voiceOverText: string;
  imagePrompt: string;
}

interface OpenAIScenesResponse {
  scenes: Scene[];
}

interface Json2VideoMovie {
  status: 'done' | 'error' | string;
  url?: string;
  message?: string;
}

// --- Helper: Sleep ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- OpenAI kliens ---

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Google auth (Sheets + YouTube) ---

const googleAuth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  undefined,
  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/youtube.upload',
  ]
);

const sheets = google.sheets({ version: 'v4', auth: googleAuth });

const youtubeOAuth2 = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

youtubeOAuth2.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
});

const youtube = google.youtube({
  version: 'v3',
  auth: youtubeOAuth2,
});

// --- Sheets helper: következő production sor ---

async function getNextProductionRow(): Promise<{
  row: SheetRow;
  header: string[];
}> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;

  if (!spreadsheetId || !sheetName) {
    throw new Error(
      'GOOGLE_SHEETS_SPREADSHEET_ID vagy GOOGLE_SHEETS_SHEET_NAME hiányzik.'
    );
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Nincs adat a táblában (vagy hiányzik a header).');
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  const statusIndex = header.indexOf('status');
  if (statusIndex === -1) {
    throw new Error('Nem található "status" oszlop.');
  }

  const rowIndex = dataRows.findIndex((r) => r[statusIndex] === 'production');
  if (rowIndex === -1) {
    throw new Error('Nincs "production" státuszú sor.');
  }

  const rowValues = dataRows[rowIndex];
  const row: SheetRow = {};
  header.forEach((colName, i) => {
    row[colName] = rowValues[i] ?? '';
  });

  return { row, header };
}

// --- Sheets helper: update id alapján (mint n8n) ---

async function updateRowById(partial: SheetRow): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;

  if (!spreadsheetId || !sheetName) {
    throw new Error(
      'GOOGLE_SHEETS_SPREADSHEET_ID vagy GOOGLE_SHEETS_SHEET_NAME hiányzik.'
    );
  }
  if (!partial.id) {
    throw new Error('updateRowById: hiányzik az "id" mező.');
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Nincs adat a táblában (vagy hiányzik a header).');
  }

  const header = rows[0];
  const idIndex = header.indexOf('id');
  if (idIndex === -1) throw new Error('Nincs "id" oszlop.');

  const targetRowIndex = rows.slice(1).findIndex((r) => r[idIndex] === partial.id);
  if (targetRowIndex === -1) {
    throw new Error(`Nem található sor id=${partial.id}`);
  }

  const sheetRowNumber = targetRowIndex + 2;
  const currentRow = rows[sheetRowNumber - 1];
  const newRow = [...currentRow];

  for (const [key, value] of Object.entries(partial)) {
    const idx = header.indexOf(key);
    if (idx !== -1) newRow[idx] = value;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${sheetRowNumber}:Z${sheetRowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [newRow],
    },
  });
}

// --- OpenAI: scenes generálása ---

async function generateScenes(topic: string, desc: string): Promise<Scene[]> {
  const systemPrompt = `
=Create a script of a social media video about the topic included below.

The video will be organized in scenes. Each scene has a voice over and an image.
The voice over text must be at least 20 words.
There should be not more than 4 scenes.
Your response must be in JSON format following this schema:
{
   "scenes": [{
      "voiceOverText": "",
      "imagePrompt": ""
    }]
}

The image prompt must be written in ENGLISH, being detailed and photo realistic. In the image prompt, you MUST AVOID describing any situation in the image that can be considered unappropriate (violence, disgusting, gore, sex, nudity, NSFW, etc) as it may be rejected by the AI service.
  `.trim();

  const userPrompt = `=Topic: "${topic}".\nDescription: "${desc}"`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Üres OpenAI válasz.');

  const parsed = JSON.parse(content) as OpenAIScenesResponse;
  if (!parsed.scenes) throw new Error('OpenAI válaszban nincs "scenes".');

  return parsed.scenes;
}

// --- json2video: job indítás + poll ---

async function submitJson2VideoJob(row: SheetRow, scenes: Scene[]): Promise<string> {
  const apiKey = process.env.JSON2VIDEO_API_KEY;
  const templateId = process.env.JSON2VIDEO_TEMPLATE_ID;
  if (!apiKey || !templateId) {
    throw new Error('JSON2VIDEO_API_KEY vagy JSON2VIDEO_TEMPLATE_ID hiányzik.');
  }

  const body = {
    template: templateId,
    variables: {
      voice: row.voiceID,
      voiceModel: row.voiceModel,
      imageModel: row.imageModel,
      subtitlesModel: row.subtitleModel,
      scenes,
      fontFamily: row.subtitleFont,
      musicURL: row.musicUrl,
      musicVolume: '0.05',
    },
  };

  const res = await axios.post('https://api.json2video.com/v2/movies', body, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  const project = (res.data as any).project as string | undefined;
  if (!project) throw new Error('json2video válaszban nincs "project".');
  return project;
}

async function pollJson2VideoStatus(project: string): Promise<{ url: string }> {
  const apiKey = process.env.JSON2VIDEO_API_KEY;
  if (!apiKey) throw new Error('JSON2VIDEO_API_KEY hiányzik.');

  while (true) {
    const res = await axios.get('https://api.json2video.com/v2/movies', {
      headers: { 'x-api-key': apiKey },
      params: { project },
    });

    const movie: Json2VideoMovie | undefined = (res.data as any).movie;
    if (!movie) throw new Error('Nincs "movie" a status válaszban.');

    if (movie.status === 'done') {
      if (!movie.url) throw new Error('done, de nincs url.');
      return { url: movie.url };
    }

    if (movie.status === 'error') {
      throw new Error(movie.message || 'json2video error');
    }

    await sleep(15000);
  }
}

// --- Videó letöltés temp fájlba ---

async function downloadVideo(url: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);

  const res = await axios.get<NodeJS.ReadableStream>(url, {
    responseType: 'stream',
  });

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(tempPath);
    res.data.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return tempPath;
}

// --- YouTube feltöltés ---

async function uploadToYouTube(params: {
  filePath: string;
  title: string;
  description: string;
  tags?: string;
  privacyStatus?: string;
}) {
  const { filePath, title, description, tags, privacyStatus } = params;
  const fileSize = fs.statSync(filePath).size;

  const tagArray = tags
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const res = await youtube.videos.insert(
    {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: tagArray,
          defaultLanguage: 'hu',
        },
        status: {
          privacyStatus: privacyStatus || 'private',
          selfDeclaredMadeForKids: true,
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    },
    {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    } as any
  );

  return res.data;
}

// --- SSE endpoint ---

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        const chunk = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        send({ step: 'start', message: 'Folyamat indult' });

        // 1) Következő production sor
        send({ step: 'sheet', message: 'Google Sheet sor lekérése...' });
        const { row } = await getNextProductionRow();
        send({ step: 'sheet', message: `Sor betöltve, id=${row.id}` });

        // 2) OpenAI scenes
        send({ step: 'openai', message: 'OpenAI scenes generálása...' });
        const scenes = await generateScenes(row.topic, row.desc);
        send({ step: 'openai', message: `Scenes generálva (${scenes.length} db)` });

        // 3) json2video job
        send({ step: 'json2video', message: 'json2video job indítása...' });
        const project = await submitJson2VideoJob(row, scenes);
        send({ step: 'json2video', message: `Job indítva, project=${project}` });

        // 4) státusz poll
        send({ step: 'render', message: 'Renderelés folyamatban (pollolás)...' });
        const { url: movieUrl } = await pollJson2VideoStatus(project);
        send({ step: 'render', message: 'Render kész, URL megvan.', movieUrl });

        // 5) Sheet update (success)
        send({ step: 'sheetUpdate', message: 'Sheet frissítése (done)...' });
        await updateRowById({
          id: row.id,
          status: 'done',
          errorLog: '=',
          publishingStatus: 'ongoing',
          finalUrl: movieUrl,
        });

        // 6) Letöltés
        send({ step: 'download', message: 'Videó letöltése...' });
        const videoPath = await downloadVideo(movieUrl);
        send({ step: 'download', message: 'Videó letöltve.' });

        // 7) YouTube upload
        send({ step: 'youtube', message: 'YouTube feltöltés indul...' });
        const yt = await uploadToYouTube({
          filePath: videoPath,
          title: row.youtubeTitle,
          description: row.youtubeDesc,
          tags: row.youtubeTags,
          privacyStatus: row.youtubeStatus,
        });
        const videoId = yt.id as string | undefined;
        const youtubeLink = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : undefined;

        send({
          step: 'youtube',
          message: 'YouTube feltöltés kész.',
          youtubeVideoId: videoId,
          youtubeLink,
        });

        // Temp fájl törlése
        fs.unlink(videoPath, () => {});

        send({
          step: 'done',
          message: 'Minden kész.',
          movieUrl,
          youtubeVideoId: videoId,
          youtubeLink,
        });

        // SSE lezárása
        controller.close();
      } catch (err: any) {
        send({
          step: 'error',
          message: err?.message || 'Ismeretlen hiba.',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
