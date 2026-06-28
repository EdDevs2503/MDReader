import type { ElectronAPI } from './types';

/**
 * Returns the Electron bridge when running inside the desktop app, or `null`
 * in a plain browser context.
 */
export function getElectron(): ElectronAPI | null {
  if (typeof window === 'undefined') return null;
  return window.electronAPI ?? null;
}

export function isElectron(): boolean {
  return getElectron() !== null;
}

export function baseName(p: string): string {
  return p.split(/[\\/]/).pop() || p;
}
