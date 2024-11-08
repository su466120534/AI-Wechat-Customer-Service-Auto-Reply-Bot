import { LogItem } from '../shared/types/logger'
import { ScheduleTask } from '../shared/types/config'

declare module 'electron' {
  interface IpcMain {
    handle(channel: string, listener: (event: any, ...args: any[]) => Promise<any>): void;
  }

  interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  }

  interface WebContents {
    send(channel: string, ...args: any[]): void;
  }
} 