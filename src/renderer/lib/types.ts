export interface FileNode {
  type: 'file';
  name: string;
  path: string;
  ext: string;
}

export interface FolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

export interface ReadFileResult {
  ok: boolean;
  content?: string;
  path?: string;
  name?: string;
  ext?: string;
  mtimeMs?: number;
  error?: string;
}

export interface WriteResult {
  ok: boolean;
  mtimeMs?: number;
  error?: string;
}

export interface ResolveLinkResult {
  ok: boolean;
  path?: string;
  exists?: boolean;
  isFile?: boolean;
  isMarkdown?: boolean;
  error?: string;
}

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

export interface TerminalResult {
  ok: boolean;
  terminal?: string;
  error?: string;
}

export type MenuAction =
  | 'add-folder'
  | 'open-file'
  | 'save'
  | 'toggle-editor'
  | 'split-pane'
  | 'toggle-history'
  | 'toggle-sidebar';

export interface ElectronAPI {
  openFolderDialog: () => Promise<FolderNode[]>;
  openFilesDialog: () => Promise<string[]>;
  rescanFolder: (dirPath: string) => Promise<FolderNode | null>;
  readFile: (filePath: string) => Promise<ReadFileResult>;
  writeFile: (filePath: string, content: string) => Promise<WriteResult>;
  resolveLink: (fromFile: string, href: string) => Promise<ResolveLinkResult>;
  getHistory: (filePath: string) => Promise<FileHistory>;
  snapshot: (filePath: string, content: string) => Promise<FileHistory>;
  openTerminal: (target: string) => Promise<TerminalResult>;
  showInFolder: (filePath: string) => Promise<{ ok: boolean }>;
  openExternal: (url: string) => Promise<{ ok: boolean }>;
  newWindow: () => Promise<{ ok: boolean }>;
  onMenuAction: (callback: (action: MenuAction) => void) => () => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
