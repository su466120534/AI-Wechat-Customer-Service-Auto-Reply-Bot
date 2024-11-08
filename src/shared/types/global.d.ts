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
    };
    toggleTask: (taskId: string, enabled: boolean) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
  }

  interface ScheduleTask {
    id: string;
    roomName: string;
    message: string;
    cron: string;
    enabled: boolean;
  }

  interface Config {
    aitiwoKey: string;
    contactWhitelist: string[];
    roomWhitelist: string[];
    schedules: ScheduleTask[];
    botStatus: {
      isLoggedIn: boolean;
      lastLoginTime?: string;
      userName?: string;
    };
  }
}

export {} 