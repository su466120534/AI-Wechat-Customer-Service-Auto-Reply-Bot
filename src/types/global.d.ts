import { LogItem } from '../shared/types/logger'
import { ScheduleTask } from '../shared/types/config'

declare global {
  interface Window {
    electronAPI: {
      saveAitiwoKey: (key: string) => Promise<{ success: boolean; error?: string }>;
      saveWhitelist: (contacts: string[], rooms: string[]) => Promise<{ success: boolean; error?: string }>;
      getConfig: () => Promise<any>;
      startBot: () => Promise<{
        success: boolean;
        message?: string;
        qrcode?: string;
        error?: string;
      }>;
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
      onBotEvent: (callback: (event: string, data: {
        userName?: string;
        text?: string;
        message?: string;
      }) => void) => void;
    };
    toggleTask: (taskId: string, enabled: boolean) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
  }
} 