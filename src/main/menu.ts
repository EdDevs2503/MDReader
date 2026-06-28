import { app, Menu, BrowserWindow, type MenuItemConstructorOptions } from 'electron';

export type MenuAction =
  | 'new-file'
  | 'add-folder'
  | 'open-file'
  | 'save'
  | 'toggle-editor'
  | 'split-pane'
  | 'toggle-history'
  | 'toggle-sidebar';

interface MenuDeps {
  onNewWindow: () => void;
}

function broadcast(action: MenuAction): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('menu:action', action);
}

/**
 * Builds the native application menu. Items that act on document state forward
 * a `menu:action` message to the focused renderer.
 */
export function buildMenu({ onNewWindow }: MenuDeps): Menu {
  const isMac = process.platform === 'darwin';
  const send = (action: MenuAction) => () => broadcast(action);

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          } as MenuItemConstructorOptions,
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New File…', accelerator: 'CmdOrCtrl+N', click: send('new-file') },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => onNewWindow(),
        },
        { type: 'separator' },
        { label: 'Add Folder…', accelerator: 'CmdOrCtrl+O', click: send('add-folder') },
        {
          label: 'Open File…',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: send('open-file'),
        },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Editor', accelerator: 'CmdOrCtrl+E', click: send('toggle-editor') },
        { label: 'Split Right', accelerator: 'CmdOrCtrl+\\', click: send('split-pane') },
        { label: 'Toggle History', accelerator: 'CmdOrCtrl+H', click: send('toggle-history') },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: send('toggle-sidebar') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? ([{ type: 'separator' }, { role: 'front' }] as MenuItemConstructorOptions[])
          : ([{ role: 'close' }] as MenuItemConstructorOptions[])),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  return menu;
}
