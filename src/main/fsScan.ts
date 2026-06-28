import { readdir } from 'fs/promises';
import { join, extname, basename } from 'path';

export const MD_EXTENSIONS = ['.md', '.markdown', '.mmd'];

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.next',
  '.cache',
  'dist',
  'out',
  'release',
  'build',
]);

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

export function isMarkdownFile(name: string): boolean {
  return MD_EXTENSIONS.includes(extname(name).toLowerCase());
}

/**
 * Recursively scans a directory for markdown / mermaid files. Folders with no
 * matching descendants are pruned so the tree only shows relevant content.
 */
export async function scanDirectory(
  dirPath: string,
  depth = 0
): Promise<FolderNode | null> {
  if (depth > 24) return null; // guard against pathological symlink loops

  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return null;
  }

  // Folders first, then files, each alphabetical (case-insensitive).
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const children: TreeNode[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith('.')) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;

    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const sub = await scanDirectory(full, depth + 1);
      if (sub && sub.children.length > 0) children.push(sub);
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      children.push({
        type: 'file',
        name: entry.name,
        path: full,
        ext: extname(entry.name).toLowerCase(),
      });
    }
  }

  return {
    type: 'folder',
    name: basename(dirPath) || dirPath,
    path: dirPath,
    children,
  };
}
