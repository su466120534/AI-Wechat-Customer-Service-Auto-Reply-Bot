import { Config, ScheduleTask, TaskHistory } from '../../shared/types/config';

interface TaskStatusUpdate {
  taskId: string;
  status: 'running' | 'success' | 'failed';
  message?: string;
  progress?: number;
}

interface Window {
  electronAPI: {
    startBot: () => Promise<{ success: boolean; message?: string; error?: string }>;
    stopBot: () => Promise<{ success: boolean; message?: string; error?: string }>;
    onQrcodeGenerated: (callback: (qrcode: string) => void) => void;
    onBotEvent: (callback: (event: string, data: any) => void) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => void;
    getScheduleTasks: () => Promise<ScheduleTask[]>;
    addScheduleTask: (task: ScheduleTask) => Promise<{ success: boolean; error?: string }>;
    toggleScheduleTask: (taskId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
    deleteScheduleTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
    getConfig: () => Promise<{
      roomWhitelist: string[];
      contactWhitelist: string[];
      aitiwoKey?: string;
      schedules: ScheduleTask[];
      botName: string;
      autoReplyPrefix: string;
    }>;
    onScheduleError: (callback: (error: any) => void) => void;
    onTaskStatusUpdate: (callback: (update: TaskStatusUpdate) => void) => void;
    saveWhitelist: (data: { contacts: string[]; rooms: string[] }) => Promise<{ success: boolean; error?: string }>;
    saveAitiwoKey: (key: string) => Promise<{ success: boolean; error?: string }>;
    openExternal: (url: string) => Promise<void>;
    saveConfig: (config: Config) => Promise<void>;
    saveBotName: (name: string) => Promise<void>;
    savePrefix: (prefix: string) => Promise<void>;
  }
} 