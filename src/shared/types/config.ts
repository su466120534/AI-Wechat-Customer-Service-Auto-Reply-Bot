export interface Config {
  aitiwoKey: string;
  contactWhitelist: string[];
  roomWhitelist: string[];
  botName: string;
  autoReplyPrefix: string;
  schedules: ScheduleTask[];
  botStatus: {
    isLoggedIn: boolean;
    lastLoginTime?: string;
    userName?: string;
  };
}

export interface ScheduleTask {
  id: string;
  roomNames: string[];
  message: string;
  cron: string;
  enabled: boolean;
  isOneTime: boolean;
  createdAt: string;
  repeatType: 'daily' | 'weekly' | 'monthly' | 'once';
  status: 'pending' | 'completed' | 'failed';
  lastRun?: string;
  lastStatus?: 'success' | 'failed';
  error?: string;
  archived?: boolean;
  executionHistory: {
    timestamp: string;
    status: 'success' | 'failed';
    error?: string;
  }[];
}

export interface TaskHistory {
  taskId: string;
  executionTime: string;
  status: 'success' | 'failed';
  error?: string;
}