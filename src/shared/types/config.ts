export interface Config {
  aitiwoKey: string;
  contactWhitelist: string[];
  roomWhitelist: string[];
  schedules: ScheduleTask[];
}

export interface ScheduleTask {
  id: string;
  roomName: string;
  message: string;
  cron: string;
  enabled: boolean;
} 