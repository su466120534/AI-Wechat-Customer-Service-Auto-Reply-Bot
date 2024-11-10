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
  completedAt?: string;
  completed?: boolean;
  lastRun?: string;
  lastStatus?: 'success' | 'failed';
  histories?: TaskHistory[];
  error?: string;
}

export interface TaskHistory {
  taskId: string;
  executionTime: string;
  status: 'success' | 'failed';
  error?: string;
}