import { spawn } from 'child_process';

export interface TerminalResult {
  ok: boolean;
  terminal?: string;
  error?: string;
}

/**
 * Opens the platform's terminal/console with its working directory set to
 * `dirPath`. On Linux a list of common emulators is tried in order.
 */
export function openTerminalAt(dirPath: string): TerminalResult {
  try {
    if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Terminal', dirPath], { detached: true }).unref();
      return { ok: true, terminal: 'Terminal' };
    }

    if (process.platform === 'win32') {
      // `start` is a cmd builtin; cwd controls the directory the shell opens in.
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], {
        cwd: dirPath,
        detached: true,
      }).unref();
      return { ok: true, terminal: 'cmd' };
    }

    // Linux / other unix: try known terminal emulators.
    const candidates: Array<[string, string[]]> = [
      ['x-terminal-emulator', []],
      ['gnome-terminal', ['--working-directory', dirPath]],
      ['konsole', ['--workdir', dirPath]],
      ['xfce4-terminal', ['--working-directory', dirPath]],
      ['xterm', []],
    ];

    for (const [cmd, args] of candidates) {
      try {
        const child = spawn(cmd, args, { cwd: dirPath, detached: true });
        let failed = false;
        child.on('error', () => {
          failed = true;
        });
        child.unref();
        if (!failed) return { ok: true, terminal: cmd };
      } catch {
        // try the next candidate
      }
    }
    return { ok: false, error: 'No supported terminal emulator was found.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
