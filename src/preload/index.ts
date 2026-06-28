import { contextBridge, ipcRenderer } from 'electron';

/**
 * The full, explicit API surface exposed to the renderer. Keep this in sync
 * with `src/renderer/lib/types.ts` (the `ElectronAPI` interface).
 */
const api = {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  openFilesDialog: () => ipcRenderer.invoke('dialog:openFiles'),
  newFileDialog: (defaultDir?: string) => ipcRenderer.invoke('dialog:newFile', defaultDir),
  rescanFolder: (dirPath: string) => ipcRenderer.invoke('fs:rescan', dirPath),

  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  resolveLink: (fromFile: string, href: string) =>
    ipcRenderer.invoke('fs:resolveLink', fromFile, href),

  getHistory: (filePath: string) => ipcRenderer.invoke('history:get', filePath),
  snapshot: (filePath: string, content: string) =>
    ipcRenderer.invoke('history:snapshot', filePath, content),

  openTerminal: (target: string) => ipcRenderer.invoke('shell:openTerminal', target),
  showInFolder: (filePath: string) => ipcRenderer.invoke('shell:showInFolder', filePath),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  newWindow: () => ipcRenderer.invoke('window:new'),

  onMenuAction: (callback: (action: string) => void) => {
    const listener = (_e: unknown, action: string) => callback(action);
    ipcRenderer.on('menu:action', listener);
    return () => ipcRenderer.removeListener('menu:action', listener);
  },

  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type PreloadApi = typeof api;
