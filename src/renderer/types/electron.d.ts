interface ScheduleTask {
  id: string;
  roomName: string;
  message: string;
  cron: string;
  enabled: boolean;
  lastRun?: string;
  lastStatus?: 'success' | 'failed';
  histories?: TaskHistory[];
}

interface TaskHistory {
  executionTime: string;
  status: 'success' | 'failed';
  error?: string;
}

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
    }>;
    onScheduleError: (callback: (error: any) => void) => void;
    onTaskStatusUpdate: (callback: (update: TaskStatusUpdate) => void) => void;
    saveWhitelist: (data: { contacts: string[]; rooms: string[] }) => Promise<{ success: boolean; error?: string }>;
    importWhitelist: (data: any) => Promise<{ success: boolean; error?: string }>;
    exportWhitelist: () => Promise<{ success: boolean; data?: any; error?: string }>;
    saveAitiwoKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  }
} 