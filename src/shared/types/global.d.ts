import { Config, ScheduleTask, TaskHistory } from './config';
import { LogItem } from '../utils/logger'

declare global {
  interface Window {
    electronAPI: {
      saveAitiwoKey: (key: string) => Promise<{ success: boolean; error?: string }>;
      saveWhitelist: (data: { contacts: string[]; rooms: string[] }) => Promise<{ success: boolean; error?: string }>;
      getConfig: () => Promise<Config>;
      startBot: () => Promise<{ success: boolean; message?: string; qrcode?: string; error?: string }>;
      onQrcodeGenerated: (callback: (qrcode: string) => void) => void;
      addScheduleTask: (task: ScheduleTask) => Promise<{ success: boolean; error?: string }>;
      getScheduleTasks: () => Promise<ScheduleTask[]>;
      toggleScheduleTask: (taskId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      deleteScheduleTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
      onNewLog: (callback: (log: LogItem) => void) => void;
      exportWhitelist: () => Promise<{
        success: boolean;
        error?: string;
        data?: {
          contacts: string[];
          rooms: string[];
        };
      }>;
      importWhitelist: (data: {
        contacts: string[];
        rooms: string[];
      }) => Promise<{
        success: boolean;
        error?: string;
      }>;
      onBotEvent: (callback: (event: string, data: any) => void) => void;
      stopBot: () => Promise<{ success: boolean; message?: string; error?: string }>;
      onScheduleError: (callback: (error: any) => void) => void;
      onTaskStatusUpdate: (callback: (update: {
        taskId: string;
        status: 'running' | 'success' | 'failed';
        message?: string;
        progress?: number;
      }) => void) => void;
      saveConfig: (config: Config) => Promise<void>;
      saveBotName: (name: string) => Promise<void>;
      savePrefix: (prefix: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      testDirectSend: (roomName: string, message: string) => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;
      exportLogs: (content: string) => Promise<{ success: boolean; error?: string }>;
      on(channel: 'whitelist-updated', callback: () => void): void;
      updateScheduleTask: (task: ScheduleTask) => Promise<{ 
        success: boolean; 
        error?: string 
      }>;
      on(channel: 'task-status-update', callback: () => void): void;
      on(channel: 'refresh-tasks', callback: () => void): void;
    };
    toggleTask: (taskId: string, enabled: boolean) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
  }
}

export {} 