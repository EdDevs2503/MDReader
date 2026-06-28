import {
  ipcMain,
  dialog,
  shell,
  BrowserWindow,
  type IpcMainInvokeEvent,
} from 'electron';
import { readFile, writeFile, stat } from 'fs/promises';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'path';
import { scanDirectory, isMarkdownFile } from './fsScan';
import { readHistory, appendHistory } from './history';
import { openTerminalAt } from './terminal';

type CreateWindow = () => BrowserWindow;

export function registerIpc(createWindow: CreateWindow): void {
  ipcMain.handle('dialog:openFolder', async (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showOpenDialog(win!, {
      title: 'Add folder',
      properties: ['openDirectory', 'multiSelections'],
    });
    if (result.canceled) return [];
    const trees = await Promise.all(result.filePaths.map((p) => scanDirectory(p)));
    return trees.filter(Boolean);
  });

  ipcMain.handle('dialog:openFiles', async (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showOpenDialog(win!, {
      title: 'Open file',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown & Mermaid', extensions: ['md', 'markdown', 'mmd'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  // Create a new markdown/mermaid file via a save dialog and seed it with a
  // small template based on the chosen extension.
  ipcMain.handle('dialog:newFile', async (event: IpcMainInvokeEvent, defaultDir?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showSaveDialog(win!, {
      title: 'New file',
      defaultPath: defaultDir ? join(defaultDir, 'untitled.md') : 'untitled.md',
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Mermaid', extensions: ['mmd'] },
      ],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };

    const filePath = result.filePath;
    const ext = extname(filePath).toLowerCase();
    try {
      // Only seed a template when creating a brand-new, empty file.
      let exists = false;
      try {
        await stat(filePath);
        exists = true;
      } catch {
        exists = false;
      }
      if (!exists) {
        const name = basename(filePath, ext);
        const template =
          ext === '.mmd'
            ? 'flowchart TD\n    A[Start] --> B[End]\n'
            : `# ${name}\n\n`;
        await writeFile(filePath, template, 'utf8');
      }
      return { ok: true, path: filePath };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('fs:rescan', async (_e, dirPath: string) => {
    return scanDirectory(dirPath);
  });

  ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf8');
      const st = await stat(filePath);
      return {
        ok: true,
        content,
        path: filePath,
        name: basename(filePath),
        ext: extname(filePath).toLowerCase(),
        mtimeMs: st.mtimeMs,
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('fs:writeFile', async (_e, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf8');
      await appendHistory(filePath, content);
      const st = await stat(filePath);
      return { ok: true, mtimeMs: st.mtimeMs };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Resolve a markdown link (relative or absolute) against the source file's
  // directory and report whether the target exists.
  ipcMain.handle('fs:resolveLink', async (_e, fromFile: string, href: string) => {
    try {
      let target = href;
      const fragIdx = target.search(/[#?]/);
      if (fragIdx >= 0) target = target.slice(0, fragIdx);
      target = decodeURI(target);
      if (!target) return { ok: false };

      const baseDir = dirname(fromFile);
      const resolved = isAbsolute(target) ? target : resolve(baseDir, target);

      let exists = false;
      let isFile = false;
      try {
        const st = await stat(resolved);
        exists = true;
        isFile = st.isFile();
      } catch {
        exists = false;
      }
      return {
        ok: true,
        path: resolved,
        exists,
        isFile,
        isMarkdown: isMarkdownFile(resolved),
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('history:get', async (_e, filePath: string) => {
    return readHistory(filePath);
  });

  ipcMain.handle('history:snapshot', async (_e, filePath: string, content: string) => {
    return appendHistory(filePath, content);
  });

  ipcMain.handle('shell:openTerminal', async (_e, target: string) => {
    let dir = target;
    try {
      const st = await stat(target);
      if (st.isFile()) dir = dirname(target);
    } catch {
      dir = dirname(target);
    }
    return openTerminalAt(dir);
  });

  ipcMain.handle('shell:showInFolder', async (_e, filePath: string) => {
    shell.showItemInFolder(filePath);
    return { ok: true };
  });

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle('window:new', async () => {
    createWindow();
    return { ok: true };
  });
}
