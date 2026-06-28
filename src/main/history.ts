import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash, randomUUID } from 'crypto';

export interface HistoryVersion {
  id: string;
  timestamp: string;
  size: number;
  content: string;
}

export interface FileHistory {
  filePath: string;
  versions: HistoryVersion[];
}

const MAX_VERSIONS = 100;

function historyDir(): string {
  return join(app.getPath('userData'), 'history');
}

function historyFileFor(filePath: string): string {
  const hash = createHash('sha1').update(filePath).digest('hex');
  return join(historyDir(), `${hash}.json`);
}

export async function readHistory(filePath: string): Promise<FileHistory> {
  try {
    const raw = await readFile(historyFileFor(filePath), 'utf8');
    const data = JSON.parse(raw) as FileHistory;
    return Array.isArray(data.versions) ? data : { filePath, versions: [] };
  } catch {
    return { filePath, versions: [] };
  }
}

/**
 * Appends a snapshot of `content` for `filePath`. Identical consecutive
 * snapshots are skipped, and history is capped at MAX_VERSIONS entries.
 */
export async function appendHistory(
  filePath: string,
  content: string
): Promise<FileHistory> {
  await mkdir(historyDir(), { recursive: true });
  const history = await readHistory(filePath);
  const last = history.versions[history.versions.length - 1];
  if (last && last.content === content) return history;

  history.filePath = filePath;
  history.versions.push({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    size: Buffer.byteLength(content, 'utf8'),
    content,
  });

  if (history.versions.length > MAX_VERSIONS) {
    history.versions = history.versions.slice(-MAX_VERSIONS);
  }

  await writeFile(historyFileFor(filePath), JSON.stringify(history), 'utf8');
  return history;
}
