declare module 'electron' {
  import type { BrowserWindow as BW } from 'electron/main';
  import type { App as AppT } from 'electron/main';
  import type { IpcMain as IpcMainT } from 'electron/main';
  import type { WebContents as WebContentsT } from 'electron/main';
  import type { IpcRenderer as IpcRendererT } from 'electron/renderer';
  import type { ContextBridge as ContextBridgeT } from 'electron/renderer';

  // 导出接口
  export interface ElectronAPI {
    BrowserWindow: typeof BW;
    app: AppT;
    ipcMain: IpcMainT;
    webContents: WebContentsT;
    ipcRenderer: IpcRendererT;
    contextBridge: ContextBridgeT;
  }

  // 导出模块
  const api: ElectronAPI;
  export default api;
} 