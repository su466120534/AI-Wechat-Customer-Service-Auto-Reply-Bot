export interface ScheduleTask {
  id: string;
  roomName: string;
  message: string;
  cron: string;
  enabled: boolean;
}

export interface Config {
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