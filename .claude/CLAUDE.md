# MDReader — project rules for Claude

MDReader is an Electron + Vite + React desktop reader/viewer/editor for
Markdown (`.md`) and Mermaid (`.mmd`) files.

## Repository map

- `src/main/` — Electron main process (windows, IPC, fs scan, history, terminal).
- `src/preload/` — `contextBridge` API surface (`window.electronAPI`).
- `src/renderer/` — React UI.
  - `components/` — UI components (the **visual surface**).
  - `styles.css` — global styles (the **visual surface**).
  - `lib/` — store (zustand), types, helpers.
- `docs/` — the **GitHub Pages landing page** (`index.html` + `styles.css`).
- `README.md` — the canonical feature documentation.

## 🔴 Rule: keep the docs in sync with visual features

Whenever you add or change a **visual feature** — anything under
`src/renderer/components/` or `src/renderer/styles.css` that a user can see or
interact with (new button, panel, view mode, layout behaviour, etc.) — you
**must** update, in the same change:

1. **`README.md`** — the feature table and, if relevant, the keyboard-shortcut
   table.
2. **`docs/index.html`** — the GitHub Pages landing page (feature cards / copy /
   mockup) so the public page reflects the app.

This is enforced by the `pre-commit` hook in `.claude/hooks/pre-commit`
(wired through `core.hooksPath`, set automatically by the `npm install`
"prepare" script). A commit that stages visual changes without touching
`README.md` or `docs/` will be rejected. Only bypass it with
`git commit --no-verify` for genuinely non-visual edits (e.g. a pure refactor
or bug fix with no user-visible change).

## Conventions

- TypeScript everywhere; keep the preload API and `src/renderer/lib/types.ts`
  (`ElectronAPI`) in sync.
- Run `npm run typecheck` and `npm run build` before committing.
- Match the existing code style (comment density, naming, dark-theme palette in
  `styles.css` / `docs/styles.css`).
