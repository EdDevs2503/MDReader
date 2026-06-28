<div align="center">

# MDReader

**A desktop Markdown (`.md`) and Mermaid (`.mmd`) reader, viewer & editor**

Browse folders of documents, render diagrams, pan & zoom huge graphs, jump
between cross-referenced files, lay them out across panes and windows, edit with
a live preview, and keep a local history of every change.

[![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

**[🌐 Project website](https://eddevs2503.github.io/MDReader/)** · [Features](#-features) · [Install](#-getting-started) · [Shortcuts](#-keyboard-shortcuts)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📁 **Add folders** | Recursively scan a directory (skipping `node_modules`, `.git`, build dirs) and browse `.md` / `.mmd` files in a filterable tree. Rescan or remove each root. |
| 🧜 **Full Mermaid** | Standalone `.mmd` files render as diagrams; ` ```mermaid ` fenced blocks inside `.md` render inline. Powered by Mermaid v11. |
| 🔍 **Pan & zoom** | `.mmd` files open in a pan & zoom viewport — scroll to zoom toward the cursor, drag to pan, plus *fit*, *100%* and *fullscreen*. Zoom resizes the SVG (vector) so **text stays crisp**. Inline blocks get an **Expand** button. |
| 🔗 **Linked files** | Links to other local files resolve relative to the current file and open in the active pane on click. External links open in your browser. |
| 🪟 **Split & windows** | Independent OS windows **plus** in-app split panes. **Drag a tab** to reorder it, move it to another pane, or drop it on a pane's left/right edge to split the layout (VS Code-style). |
| 🖥️ **Open console** | The *Console* button (or right-click a file in the tree) opens your OS terminal in that file's folder. *Reveal* opens the file manager. |
| 🕑 **Change history** | Every save stores a timestamped snapshot. The *History* panel lists versions, diffs a version against the current content, and restores it. |
| ✍️ **Edit + preview** | A CodeMirror 6 editor with **Preview / Split / Editor** modes. Edits preview live; `Ctrl/Cmd+S` saves and snapshots. A footer shows unsaved-change status with Save / Revert. |
| ➕ **New files** | **New File** (button or `Ctrl/Cmd+N`) creates a `.md`/`.mmd` from a template, refreshes the tree and opens it. |

> Want to see it at a glance? Visit the **[project website](https://eddevs2503.github.io/MDReader/)**.

## 🧱 Tech stack

- **Electron** — desktop shell, windows, native menu, filesystem & shell access (main process).
- **Vite + React + TypeScript** — renderer UI, bundled by **electron-vite**.
- **CodeMirror 6** (`@uiw/react-codemirror`) — the editor.
- **Mermaid v11** — diagram rendering.
- **react-markdown** + **remark-gfm** + **rehype-raw** — Markdown (GFM tables, task lists, raw HTML).
- **Zustand** — renderer state.

## 📂 Project structure

```
src/
  main/          Electron main process
    index.ts       app lifecycle + window creation
    ipc.ts         IPC handlers (dialogs, fs, history, terminal, windows, new file)
    menu.ts        native menu → forwards actions to the renderer
    fsScan.ts      recursive .md/.mmd folder scan
    history.ts     per-file snapshot storage (userData/history)
    terminal.ts    cross-platform "open terminal here"
  preload/
    index.ts       contextBridge → window.electronAPI
  renderer/        React app
    App.tsx
    components/    Sidebar, FileTree, PaneGrid, Pane, Tabs, MarkdownView,
                   Mermaid, PanZoom, Editor, HistoryPanel
    lib/           store (zustand), types, electron bridge, diff, dragState
    styles.css
docs/            GitHub Pages landing page (index.html + styles.css)
samples/         example .md / .mmd files (cross-links & diagrams)
.claude/         project rules for Claude + the docs-sync pre-commit hook
.github/         Pages deploy workflow
```

## 🚀 Getting started

Requires **Node.js 18+** (20+ recommended).

```bash
git clone https://github.com/EdDevs2503/MDReader.git
cd MDReader
npm install      # also wires the pre-commit hook (see Contributing)
npm run dev      # launch the app with hot reload
```

### Build & package

```bash
npm run build      # compile main + preload + renderer into out/
npm run start      # run the production build
npm run dist       # package an installer for your current OS → release/
npm run dist:linux # AppImage   (build on Linux)
npm run dist:win   # NSIS .exe  (build on Windows, or Linux/macOS with wine)
npm run dist:mac   # .dmg       (build on macOS only)
```

`electron-builder` writes installers to `release/`. Each OS builds its own
target (Linux → AppImage, Windows → NSIS, macOS → dmg); macOS `.dmg` can only
be produced on a Mac.

## 📦 Releases (GitHub)

Releases are automated by [`.github/workflows/release.yml`](.github/workflows/release.yml):
pushing a version tag builds installers on Linux, macOS **and** Windows in
parallel and publishes them to a GitHub Release.

```bash
# 1. bump the version in package.json (e.g. 0.1.0 → 0.2.0), commit it
# 2. tag and push — this triggers the Release workflow
git tag v0.2.0
git push origin v0.2.0
```

The workflow uses the built-in `GITHUB_TOKEN` (no secrets to configure) and
`electron-builder --publish always` to attach the artifacts. To cut a release
entirely from your machine instead, run `npm run release` locally with a
`GH_TOKEN` env var set to a personal access token.

> Keep `package.json`'s `version` in sync with the tag you push.

## ⌨️ Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| New file | `Ctrl/Cmd+N` |
| Add folder | `Ctrl/Cmd+O` |
| Open file | `Ctrl/Cmd+Shift+O` |
| Save | `Ctrl/Cmd+S` |
| Toggle editor mode | `Ctrl/Cmd+E` |
| Split right | `Ctrl/Cmd+\` |
| Toggle history | `Ctrl/Cmd+H` |
| Toggle sidebar | `Ctrl/Cmd+B` |
| New window | `Ctrl/Cmd+Shift+N` |

## 🧜 Working with large diagrams

Open a `.mmd` file and use the viewport controls (bottom-right):

- **Scroll** to zoom toward the cursor, **drag** to pan.
- **⤢ Fit** encloses the whole diagram, **100%** resets, **⛶** goes fullscreen.
- Inside a `.md`, hover a Mermaid block and click **⛶ Expand** to open it in the
  same pan/zoom viewer.

## 🪟 Arranging panes (VS Code-style)

- **Drag a tab** onto another pane's **center** to move it there.
- **Drop on the left/right edge** of a pane to split the layout into a new pane
  on that side (a highlight shows the drop zone).
- Empty panes are removed automatically. Use **New Window** for a fully
  separate OS window.

## 🧪 Try it

Open the `samples/` folder in the app: `welcome.md` links to a `.mmd` diagram, a
file in a subfolder, and a page of inline Mermaid diagrams — exercising folder
scanning, rendering, pan/zoom and click-to-open navigation.

## 🌐 Project website (GitHub Pages)

The landing page lives in [`docs/`](./docs) (a self-contained static site) and
is deployed automatically by the
[`Deploy GitHub Pages`](.github/workflows/pages.yml) workflow on every push to
`master` that changes `docs/`.

**One-time setup:** repo **Settings → Pages → Build and deployment → Source:
“GitHub Actions”**. (The workflow's `configure-pages` step uses
`enablement: true`, so the first run also flips this automatically.) Once set,
pushes publish to `https://eddevs2503.github.io/MDReader/`.

## 🤝 Contributing

`npm install` runs a `prepare` script that points Git at the repo's hook
directory (`git config core.hooksPath .claude/hooks`).

A **pre-commit hook** keeps the docs honest: if a commit stages a **visual
change** (anything under `src/renderer/components/` or `src/renderer/styles.css`)
without also updating **`README.md`** or **`docs/`**, the commit is rejected.
Bypass it for genuinely non-visual edits with `git commit --no-verify`.
See [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) for the full rule.

## 📝 Notes & trade-offs

- **Independent windows:** each OS window has its own state (open folders/tabs
  are not synced across windows) — the simplest correct model.
- **Security:** the renderer runs with `contextIsolation` on and `nodeIntegration`
  off; only the explicit `electronAPI` methods are exposed. `rehype-raw` allows
  raw HTML in markdown for local, trusted files — add `rehype-sanitize` in
  `MarkdownView.tsx` if you intend to open untrusted documents.
- **Installing Electron behind a restrictive proxy:** if `npm install` fails while
  downloading the Electron binary, install with
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install` and provide the binary separately,
  or run the install on a network that allows the GitHub release download.

## License

[MIT](https://opensource.org/licenses/MIT) © EdDevs2503
