export interface Config {
  aitiwoKey: string;
  contactWhitelist: string[];
  roomWhitelist: string[];
  schedules: ScheduleTask[];
}

export interface ScheduleTask {
  id: string;
  roomNames: string[];
  message: string;
  cron: string;
  enabled: boolean;
  lastRun?: string;
  lastStatus?: 'success' | 'failed';
  histories?: TaskHistory[];
}

export interface TaskHistory {
  executionTime: string;
  status: 'success' | 'failed';
  error?: string;
} 