import { LogItem } from '../utils/logger'

declare global {
  interface Window {
    electronAPI: {
      saveAitiwoKey: (key: string) => Promise<{ success: boolean; error?: string }>;
      saveWhitelist: (contacts: string[], rooms: string[]) => Promise<{ success: boolean; error?: string }>;
      getConfig: () => Promise<any>;
      startBot: () => Promise<{ success: boolean; error?: string }>;
      onQrcodeGenerated: (callback: (qrcode: string) => void) => void;
      addScheduleTask: (task: ScheduleTask) => Promise<{ success: boolean; error?: string }>;
      getScheduleTasks: () => Promise<ScheduleTask[]>;
      toggleScheduleTask: (taskId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      deleteScheduleTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
      onNewLog: (callback: (log: LogItem) => void) => void;
    };
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
  }
}

export {} 