/**
 * Tiny module-level holder for the tab currently being dragged. The HTML5
 * drag dataTransfer is only readable on `drop`, but we need the payload during
 * `dragover` (to draw drop highlights), so we stash it here too.
 */
export interface TabDrag {
  path: string;
  fromPaneId: string;
}

export const tabDrag: { current: TabDrag | null } = { current: null };
