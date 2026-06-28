# MDReader

A desktop **Markdown (`.md`) and Mermaid (`.mmd`) reader, viewer and editor**, built
with **Electron + Vite + React**. Browse folders of documents, render diagrams,
jump between cross-referenced files, lay them out across panes and windows, edit
with a live preview, and keep a local history of every change.

> UI design references were drawn from polished document and code tools on
> [Mobbin](https://mobbin.com) — Craft, Obvious, Base44 and Google AI Studio —
> for the file explorer, breadcrumb, tabbed split panes and save-status footer.

## Features

| # | Requirement | How it works |
|---|-------------|--------------|
| 1 | **Add folders of `.md` / `.mmd`** | _Add Folder_ scans a directory recursively (skipping `node_modules`, `.git`, build dirs) and shows a file tree. Filter files with the search box; rescan or remove each root. |
| 2 | **Full Mermaid support** | Standalone `.mmd` files render as a diagram; ` ```mermaid ` fenced blocks inside `.md` render inline. Powered by Mermaid v11. |
| 3 | **Open referenced files on click** | Links to other local files are resolved relative to the current file and opened in the active pane. External links open in your browser. |
| 4 | **Multiple windows + split layout** | _New Window_ opens an independent OS window; _Split_ adds side-by-side panes, each with its own tabs and view mode. |
| 5 | **Open console at file location** | The _Console_ button (or right-click a file in the tree) opens your OS terminal in that file's folder. _Reveal_ opens the file manager. |
| 6 | **History of changes** | Every save stores a timestamped snapshot. The _History_ panel lists versions, diffs a version against the current content, and restores it into the editor. |
| 7 | **Edit + visualize** | A CodeMirror 6 editor with **Preview / Split / Editor** modes. Edits preview live; **Ctrl/Cmd+S** saves and snapshots. A footer shows unsaved-change status with Save / Revert. |

## Tech stack

- **Electron** — desktop shell, windows, native menu, filesystem & shell access (main process).
- **Vite + React + TypeScript** — renderer UI (bundled by **electron-vite**).
- **CodeMirror 6** (`@uiw/react-codemirror`) — the editor.
- **Mermaid v11** — diagram rendering.
- **react-markdown** + **remark-gfm** + **rehype-raw** — Markdown rendering (GFM tables, task lists, raw HTML).
- **Zustand** — renderer state.

## Project structure

```
src/
  main/        Electron main process
    index.ts     app lifecycle + window creation
    ipc.ts       IPC handlers (dialogs, fs, history, terminal, windows)
    menu.ts      native menu → forwards actions to the renderer
    fsScan.ts    recursive .md/.mmd folder scan
    history.ts   per-file snapshot storage (userData/history)
    terminal.ts  cross-platform "open terminal here"
  preload/
    index.ts     contextBridge → window.electronAPI
  renderer/      React app
    App.tsx, components/*, lib/{types,electron,store,diff}.ts, styles.css
samples/         example .md / .mmd files (with cross-links & diagrams)
```

## Getting started

Requires **Node.js 18+**.

```bash
npm install      # if Electron's binary is blocked, see the note below
npm run dev      # launch the app with hot reload
```

### Build & package

```bash
npm run build    # compile main + preload + renderer into out/
npm run start    # run the production build
npm run dist     # package an installer with electron-builder (AppImage/dmg/nsis)
```

### Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Add folder | `Ctrl/Cmd+O` |
| Open file | `Ctrl/Cmd+Shift+O` |
| Save | `Ctrl/Cmd+S` |
| Toggle editor mode | `Ctrl/Cmd+E` |
| Split right | `Ctrl/Cmd+\` |
| Toggle history | `Ctrl/Cmd+H` |
| Toggle sidebar | `Ctrl/Cmd+B` |
| New window | `Ctrl/Cmd+Shift+N` |

## Try it

Open the `samples/` folder in the app: `welcome.md` links to a `.mmd` diagram,
a file in a subfolder, and a page of inline Mermaid diagrams — exercising
folder scanning, rendering, and click-to-open navigation.

## Notes & trade-offs

- **Independent windows:** each OS window has its own state (open folders/tabs
  are not synced across windows) — the simplest correct model.
- **Security:** the renderer runs with `contextIsolation` on and `nodeIntegration`
  off; only the explicit `electronAPI` methods are exposed. `rehype-raw` allows
  raw HTML in markdown for local, trusted files — add `rehype-sanitize` in
  `MarkdownView.tsx` if you intend to open untrusted documents.
- **Installing Electron behind a restrictive proxy:** if `npm install` fails while
  downloading the Electron binary, install dependencies with
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install` and provide the binary separately,
  or run the install on a network that allows the GitHub release download.
